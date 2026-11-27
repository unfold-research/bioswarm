// Unit tests of the R0 sensor parsing, keys, exclusion, frozen lists and cues (no Docker): node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { hexAddr, parseProcs, parseSockets, parseConntrack, freeze, cues, EXCLUDE_EXES, EXCLUDE_SHA256, sha } from './sensors.mjs';

test('hex addresses from /proc/net (v4, v4-mapped v6)', () => {
  assert.deepEqual(hexAddr('0A025A0A:08AE'), { ip: '10.90.2.10', port: 2222 });
  assert.deepEqual(hexAddr('0000000000000000FFFF00000B015A0A:AA71'), { ip: '10.90.1.11', port: 43633 });
});

test('process keys: parent resolved in the same container; harness excluded only with the token (and its descendants)', () => {
  const lines = ['P 1 0 1000 0 /usr/bin/dash', 'P 2 1 1000 0 /usr/sbin/sshd', 'P 31 2 1000 0 /usr/sbin/sshd', 'P 34 31 1000 0 /usr/bin/bash',
    'P 40 0 1000 1 /usr/bin/bash', 'P 41 0 1000 0 /usr/bin/bash', 'P 42 40 1000 1 /usr/bin/sleep', 'P 50 0 0 0 /usr/bin/dash'];
  const k = parseProcs(lines).map((p) => `${p.exe}|${p.parent}|${p.user}`);
  assert.ok(k.includes('/usr/sbin/sshd|/usr/bin/dash|svc'));
  assert.ok(k.includes('/usr/bin/bash|/usr/sbin/sshd|svc'), 'red shell under sshd is seen');
  assert.ok(k.includes('/usr/bin/bash|-|svc'), 'untagged exec bash is seen');
  assert.equal(k.filter((x) => x === '/usr/bin/bash|-|svc').length, 1, 'tagged harness bash is excluded');
  assert.ok(!k.includes('/usr/bin/sleep|/usr/bin/bash|svc'), 'a descendant of a token process is left out (Cyber Research, 2026-11-23; was: still seen)');
  assert.ok(k.includes('/usr/bin/dash|-|root'));
  assert.equal(parseProcs(['P 9 0 0 0 ']).length, 0, 'a line with no exe is dropped');
});

test('sockets: inbound vs outbound by listening port, loopback is the host itself', () => {
  const ip = { '10.90.2.10': 'web', '10.90.1.11': 'ws1', '10.90.3.10': 'db' };
  const lines = ['L tcp 00000000:08AE', 'L tcp 00000000:1F90', 'C tcp 0A025A0A:08AE 0B015A0A:AA71', 'C tcp 0A025A0A:C350 0A035A0A:1538', 'C tcp 0100007F:1F90 0100007F:9C40'];
  const c = parseSockets(lines, 'web', ip).map((x) => `${x.src}|${x.dst}|${x.port}|${x.proto}`);
  assert.deepEqual(c, ['ws1|web|2222|tcp', 'web|db|5432|tcp', 'web|web|8080|tcp']);
});

test('router conntrack lines -> flows in the original direction', () => {
  const ip = { '10.90.1.12': 'ws2', '10.90.3.10': 'db' };
  const f = parseConntrack(['tcp      6 9 CLOSE src=10.90.1.12 dst=10.90.3.10 sport=40000 dport=5432 src=10.90.3.10 dst=10.90.1.12 sport=5432 dport=40000 mark=0 use=1', 'conntrack v1.4.8: 1 flow entries'], ip);
  assert.deepEqual(f, [{ src: 'ws2', dst: 'db', port: 5432, proto: 'tcp' }]);
});

test('frozen lists are sorted and hashed; cues flag only keys outside them; a down host shows none', () => {
  const obs = (procs, conns, up = true) => ({ hosts: { web: { up, procs, conns } } });
  const p = (exe, parent = '-', user = 'svc') => ({ exe, parent, user });
  const fr = freeze([obs([p('/usr/sbin/nginx')], [{ src: 'ws1', dst: 'web', port: 8080, proto: 'tcp' }]), obs([p('/usr/sbin/sshd')], [])]);
  assert.deepEqual(fr.lists.web.procs, ['/usr/sbin/nginx|-|svc', '/usr/sbin/sshd|-|svc']);
  assert.equal(fr.sha256, sha(fr.lists));
  assert.equal(fr.excludeSha256, EXCLUDE_SHA256);
  assert.equal(freeze([obs([p('/usr/sbin/sshd')], []), obs([p('/usr/sbin/nginx')], [{ src: 'ws1', dst: 'web', port: 8080, proto: 'tcp' }])]).sha256, fr.sha256, 'order-independent');
  const c = cues(obs([p('/usr/sbin/nginx'), p('/usr/bin/bash', '/usr/sbin/sshd')], [{ src: 'ws1', dst: 'web', port: 2222, proto: 'tcp' }]), fr).web;
  assert.deepEqual(c, { suspiciousProcess: true, suspiciousConnection: true, procs: ['/usr/bin/bash|/usr/sbin/sshd|svc'], conns: ['ws1|web|2222|tcp'] });
  assert.deepEqual(cues(obs([p('/usr/bin/bash')], [], false), fr).web, { suspiciousProcess: false, suspiciousConnection: false, procs: [], conns: [] });
});

test('exclusion list is fixed (hash changes only with the list)', () => {
  assert.equal(EXCLUDE_SHA256, sha(EXCLUDE_EXES));
});

// ---- canonical flow keys and the refreeze (Cyber Research, 2026-11-23, pre-data deviation) ----
import { canonicalFlow, refreeze, ckey } from './sensors.mjs';
import { SERVICE_PORTS } from './range.mjs';
const IPS = { '10.90.1.11': 'ws1', '10.90.1.12': 'ws2', '10.90.1.13': 'ws3', '10.90.2.10': 'web', '10.90.2.20': 'files', '10.90.3.10': 'db' };
const keys = (a) => a.map(ckey);

test('service ports come from the range spec: sshd 2222 everywhere, plus web 8080 and db 5432', () => {
  assert.deepEqual(SERVICE_PORTS, { ws1: [2222], ws2: [2222], ws3: [2222], web: [2222, 8080], files: [2222], db: [2222, 5432] });
});

test('inverted conntrack line (caught mid-stream) -> canonical client -> server:service-port key', () => {
  const inv = 'tcp      6 431999 ESTABLISHED src=10.90.2.20 dst=10.90.1.11 sport=2222 dport=21794 src=10.90.1.11 dst=10.90.2.20 sport=21794 dport=2222 [ASSURED] mark=0 use=1';
  const invWeb = 'tcp      6 119 TIME_WAIT src=10.90.2.10 dst=10.90.1.13 sport=8080 dport=25841 src=10.90.1.13 dst=10.90.2.10 sport=25841 dport=8080 mark=0 use=1';
  const fwd = 'tcp      6 9 CLOSE src=10.90.1.12 dst=10.90.3.10 sport=40000 dport=5432 src=10.90.3.10 dst=10.90.1.12 sport=5432 dport=40000 mark=0 use=1';
  assert.deepEqual(keys(parseConntrack([inv, invWeb, fwd], IPS, SERVICE_PORTS)), ['ws1|files|2222|tcp', 'ws3|web|8080|tcp', 'ws2|db|5432|tcp']);
  assert.deepEqual(keys(parseConntrack([inv], IPS)), ['files|ws1|21794|tcp'], 'without service ports: the old key');
});

test('socket line -> canonical key: a client socket mis-sided by a transient listen entry folds back', () => {
  // ws1's sftp client socket 21794 -> files:2222; a stray "L" for 21794 made the listen test call it inbound
  const lines = ['L tcp 0B015A0A:5522', 'C tcp 0B015A0A:5522 14025A0A:08AE', 'C tcp 0B015A0A:9C40 0A025A0A:1F90'];
  assert.deepEqual(keys(parseSockets(lines, 'ws1', IPS)), ['files|ws1|21794|tcp', 'ws1|web|8080|tcp'], 'the old keys');
  assert.deepEqual(keys(parseSockets(lines, 'ws1', IPS, SERVICE_PORTS)), ['ws1|files|2222|tcp', 'ws1|web|8080|tcp']);
  // server side (web) sees ws1 come in on 8080: unchanged
  assert.deepEqual(keys(parseSockets(['L tcp 00000000:1F90', 'C tcp 0A025A0A:1F90 0B015A0A:9C40'], 'web', IPS, SERVICE_PORTS)), ['ws1|web|8080|tcp']);
});

test('no service port on either side -> the key stays as it is (an unknown target stays suspicious)', () => {
  const ct = 'tcp      6 9 CLOSE src=10.90.1.12 dst=10.90.3.10 sport=40000 dport=6666 src=10.90.3.10 dst=10.90.1.12 sport=6666 dport=40000 mark=0 use=1';
  const udp = 'udp      17 29 src=10.90.2.20 dst=10.90.1.11 sport=2222 dport=5000 src=10.90.1.11 dst=10.90.2.20 sport=5000 dport=2222 mark=0 use=1';
  assert.deepEqual(keys(parseConntrack([ct, udp], IPS, SERVICE_PORTS)), ['ws2|db|6666|tcp', 'files|ws1|5000|udp'], 'tcp unknown port, and udp (service ports are tcp)');
  assert.deepEqual(keys(parseSockets(['C tcp 0A025A0A:C350 0B015A0A:115C'], 'web', IPS, SERVICE_PORTS)), ['web|ws1|4444|tcp']);
  assert.deepEqual(canonicalFlow({ src: 'ws1', dst: 'db', sport: 50000, dport: 6666, proto: 'tcp' }, SERVICE_PORTS), { src: 'ws1', dst: 'db', port: 6666, proto: 'tcp' });
  assert.deepEqual(canonicalFlow({ src: 'ws1', dst: '10.9.9.9', sport: 50000, dport: 2222, proto: 'tcp' }, SERVICE_PORTS), { src: 'ws1', dst: '10.9.9.9', port: 2222, proto: 'tcp' }, 'an unknown host has no service port');
  assert.equal(canonicalFlow({ src: 'files', dst: 'ws1', dport: 21794, proto: 'tcp' }, SERVICE_PORTS), null, 'no sport and no service port: cannot be canonicalised');
});

const P = (exe, parent = '-', user = 'svc') => ({ exe, parent, user });
const C = (src, dst, port, proto = 'tcp') => ({ src, dst, port, proto });
const REC = [
  { hosts: { ws1: { up: true, procs: [P('/usr/sbin/sshd', '/usr/bin/dash')], conns: [C('ws1', 'files', 2222), C('files', 'ws1', 21794)] }, files: { up: true, procs: [P('/usr/sbin/sshd')], conns: [C('ws1', 'files', 2222)] } } },
  { hosts: { ws1: { up: true, procs: [P('/usr/bin/dash')], conns: [C('web', 'ws1', 33300), C('ws1', 'web', 8080), C('files', 'ws1', 21794)] }, web: { up: true, procs: [P('/usr/sbin/nginx')], conns: [C('ws1', 'web', 8080)] } } },
];

test('refreeze is deterministic: recorded keys with no sport drop out, counted per host; procs unchanged', () => {
  const a = refreeze(REC, SERVICE_PORTS), b = refreeze([...REC].reverse(), SERVICE_PORTS), c = refreeze(JSON.parse(JSON.stringify(REC)), SERVICE_PORTS);
  assert.equal(a.frozen.sha256, b.frozen.sha256); assert.equal(a.frozen.sha256, c.frozen.sha256);
  assert.deepEqual(a.frozen.lists.ws1.flows, ['ws1|files|2222|tcp', 'ws1|web|8080|tcp']);
  assert.deepEqual(a.droppedByHost, { files: 0, web: 0, ws1: 2 }); assert.deepEqual(a.droppedKeys, { ws1: ['files|ws1|21794|tcp', 'web|ws1|33300|tcp'] });
  assert.deepEqual(a.frozen.lists.ws1.procs, freeze(REC).lists.ws1.procs, 'process keys as in v1');
  assert.equal(a.frozen.sha256, sha(a.frozen.lists)); assert.notEqual(a.frozen.sha256, freeze(REC).sha256);
});

test('cues on the v2 lists: canonical green flows are inside, an inverted raw key or an unknown target is a cue', () => {
  const v2 = refreeze(REC, SERVICE_PORTS).frozen;
  const obs = (conns) => ({ hosts: { ws1: { up: true, procs: [P('/usr/bin/dash')], conns } } });
  const live = parseConntrack(['tcp      6 431999 ESTABLISHED src=10.90.2.20 dst=10.90.1.11 sport=2222 dport=21794 src=10.90.1.11 dst=10.90.2.20 sport=21794 dport=2222 mark=0 use=1'], IPS, SERVICE_PORTS);
  assert.deepEqual(cues(obs(live), v2).ws1, { suspiciousProcess: false, suspiciousConnection: false, procs: [], conns: [] });
  assert.deepEqual(cues(obs([C('files', 'ws1', 21794)]), v2).ws1.conns, ['files|ws1|21794|tcp'], 'no longer in the lists');
  assert.equal(cues(obs([C('ws1', 'db', 6666)]), v2).ws1.suspiciousConnection, true);
  assert.equal(cues(obs([C('ws1', 'db', 2222)]), v2).ws1.suspiciousConnection, true, 'lateral ssh to db is not in ws1 list');
});

// ---- process keys: reader error lines and harness descendants (Cyber Research, 2026-11-23, pre-data deviation) ----
import { UNREADABLE_PARENT, procErrorsOf, STREAM, ROUTER_STREAM } from './sensors.mjs';
const pk = (lines, st) => parseProcs(lines, st).map((p) => `${p.exe}|${p.parent}|${p.user}`);

test('a reader error line ("E /proc/N/exe ...") never becomes a key: dropped and counted; its child gets parent ?', () => {
  // files during green SFTP (measured under gVisor): sshd listener, a session, and its non-dumpable child (exe unreadable)
  const lines = ['P 1 0 1000 0 /usr/bin/dash', 'P 8 1 1000 0 /usr/sbin/sshd', 'P 17 8 1000 0 /usr/sbin/sshd',
    "P 18 17 1000 0 E /proc/18/exe '/proc/18/exe", "P 1006 17 1000 0 E /proc/1006/exe '/proc/1006/exe", 'P 30 18 1000 0 /usr/bin/bash'];
  const st = { unreadable: 0 }, k = pk(lines, st);
  assert.equal(st.unreadable, 2); assert.ok(!k.some((x) => x.startsWith('E ') || x.includes('/proc/')), JSON.stringify(k));
  assert.ok(k.includes('/usr/sbin/sshd|/usr/sbin/sshd|svc'), 'the sshd sessions serving green are kept (not harness)');
  assert.ok(k.includes('/usr/sbin/sshd|/usr/bin/dash|svc'));
  assert.ok(k.includes(`/usr/bin/bash|${UNREADABLE_PARENT}|svc`), 'a shell under an unreadable sshd child is still seen, with a stable parent');
  assert.deepEqual(pk(lines), k, 'stats are optional');
});

test('an SFTP action in flight during the read -> 0 green keys on the workstation (process table measured under gVisor)', () => {
  // green: bash -c "timeout 10 sftp ..." -> bash execs timeout (the root, ppid 0, token read: h=1); sftp, ssh and the
  // ssh ProxyCommand/`!cmd` children inherit the token but are not read (h=0): excluded as descendants. Plus the http
  // shape (timeout root -> sleep), and the sensor's own stream (bash, listed, token).
  const lines = ['P 1 0 1000 0 /usr/bin/dash', 'P 2 1 1000 0 /usr/bin/sleep', 'P 8 1 1000 0 /usr/sbin/sshd',
    'P 9 0 1000 1 /usr/bin/bash', 'P 10 9 1000 0 /usr/bin/timeout', 'P 12 10 1000 0 /usr/bin/sftp', 'P 14 12 1000 0 /usr/bin/ssh', 'P 19 12 1000 0 /usr/bin/dash', 'P 20 19 1000 0 /usr/bin/sleep',
    'P 11 0 1000 1 /usr/bin/timeout', 'P 13 11 1000 0 /usr/bin/bash',
    'P 40 0 1000 1 /usr/bin/bash', 'P 41 40 1000 0 /usr/bin/stat'];
  const k = pk(lines);
  assert.deepEqual(k.sort(), ['/usr/bin/dash|-|svc', '/usr/bin/sleep|/usr/bin/dash|svc', '/usr/sbin/sshd|/usr/bin/dash|svc'].sort(), 'only the host\'s own processes');
  assert.ok(!k.some((x) => /timeout|sftp|ssh\||\/usr\/bin\/ssh/.test(x)));
});

test('token exclusion: any token root and all its descendants; an orphan with the token; never a process without the token', () => {
  const lines = ['P 1 0 1000 0 /usr/bin/dash',
    'P 50 1 1000 1 /usr/bin/ssh',                                   // orphan reparented to pid 1, token read by the stream
    'P 60 0 1000 0 /usr/bin/bash', 'P 61 60 1000 0 /usr/bin/nc',    // an exec root WITHOUT the token (as red's exec): kept
    'P 70 99 1000 1 /usr/bin/timeout', 'P 71 70 1000 0 /usr/bin/sftp', // parent gone, token read: excluded with its child
    'P 80 1 1000 0 /usr/sbin/sshd', 'P 81 80 1000 0 /usr/bin/bash', 'P 82 81 1000 0 /tmp/x']; // red's shell under sshd: kept
  const k = pk(lines);
  assert.ok(!k.some((x) => x.startsWith('/usr/bin/ssh|') || x.startsWith('/usr/bin/timeout|') || x.startsWith('/usr/bin/sftp|')));
  for (const want of ['/usr/bin/bash|-|svc', '/usr/bin/nc|/usr/bin/bash|svc', '/usr/bin/bash|/usr/sbin/sshd|svc', '/tmp/x|/usr/bin/bash|svc']) assert.ok(k.includes(want), want);
  assert.deepEqual(pk(['P 5 5 0 0 /bin/a']), ['/bin/a|/bin/a|root'], 'a self-parent loop terminates');
});

test('the streams read the token for listed executables, exec roots (ppid 0), children of pid 1 and orphans', () => {
  assert.match(STREAM, /case \$pp in 0\|1\) c=1;; \*\) \[ -n "\$\{E\[\$pp\]\+x\}" \] \|\| c=1;; esac/);
  assert.ok(STREAM.includes(`{ while IFS= read -r -d '' kv; do [ "$kv" = "R0_HARNESS=$T" ] && { h=1; break; }; done < $p/environ; } 2>/dev/null`));
  assert.ok(STREAM.includes('if [ $h = 0 ]; then read -r st < $p/stat 2>/dev/null || continue; st=${st##*) }; case $st in Z*|X*|x*) continue;; esac; fi'), 'no token found: gone or zombie -> skipped');
  assert.ok(ROUTER_STREAM.includes("else s=$(cat $p/stat 2>/dev/null) || continue; case ${s##*') '} in Z*|X*|x*) continue;; esac; fi"));
  assert.match(ROUTER_STREAM, /case \$2 in 0\|1\) c=1;; esac/);
});

test('procErrorsOf: per-step total and per host', () => {
  assert.deepEqual(procErrorsOf({ files: { procErrors: 3 }, ws1: { procErrors: 0 }, router: { procErrors: 1 }, db: {} }), { total: 4, byHost: { files: 3, router: 1 } });
});
