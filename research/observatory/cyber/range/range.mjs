// One R0 range: the synthetic company of tasks/R0-PILOT-PREREG.md ("Setting"), 7 hosts on 3 internal segments.
// Six service hosts are pods (hosts.mjs: holder + uid-0 maintenance + uid-1000 service, gVisor); `router` is one runc
// container on all three segments, with forwarding on, and is the only path between segments (blue's Block/Allow
// apply there). No red content here, and no episode: `selftest` builds an empty range and runs the M1 checks.
//   node range.mjs up <id> <authorized_keys file>   start the range
//   node range.mjs down <id>                        teardown + leftover check
//   node range.mjs selftest <id>                    M1: build, reachability via router, router block, canary on
//                                                   every host, positive control, teardown; JSON report on stdout
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { docker, up as netUp, down as netDown, preflight, check, netName, SUBNET, SEGMENTS, LABEL } from './net.mjs';
import { up as podUp } from './hosts.mjs';
import { canary, control, controlExec, icmpCheck, TOOL } from './canary.mjs';

const SLICE = process.env.R0_SLICE || 'r0-range.slice';
const ip = (seg, n) => SUBNET[seg].replace(/\.0\/24$/, `.${n}`);
const ROUTER_N = 254;
const NGINX = `nginx -g 'daemon off; error_log stderr;'`;
const PG = 'test -s /home/svc/pgdata/PG_VERSION || /usr/lib/postgresql/15/bin/initdb -D /home/svc/pgdata -A trust >/dev/null; ' +
  "/usr/lib/postgresql/15/bin/postgres -D /home/svc/pgdata -c listen_addresses='*' -c unix_socket_directories=/tmp -p 5432";

// The company: host -> segment, address, image, service command, service port (besides sshd 2222).
export const HOSTS = [
  { host: 'ws1', segment: 'user', n: 11, image: 'r0-base:m1' },
  { host: 'ws2', segment: 'user', n: 12, image: 'r0-base:m1' },
  { host: 'ws3', segment: 'user', n: 13, image: 'r0-base:m1' },
  { host: 'web', segment: 'dmz', n: 10, image: 'r0-web:m1', service: NGINX, port: 8080 },
  { host: 'files', segment: 'dmz', n: 20, image: 'r0-files:m1' },
  { host: 'db', segment: 'internal', n: 10, image: 'r0-db:m1', service: PG, port: 5432 },
].map((h) => ({ ...h, ip: ip(h.segment, h.n) }));
// Declared TCP service ports per host: sshd on 2222 in every pod (images/base/sshd_config; files serves SFTP on it),
// plus the host's service port. The sensors use them to key a flow client -> server:service-port (sensors.mjs).
export const SSHD_PORT = 2222;
export const SERVICE_PORTS = Object.fromEntries(HOSTS.map((h) => [h.host, [SSHD_PORT, ...(h.port ? [h.port] : [])]]));

const routesFor = (seg) => SEGMENTS.filter((s) => s !== seg).map((s) => ({ cidr: SUBNET[s], via: ip(seg, ROUTER_N) }));
const routerName = (id) => `r0-${id}-router`;

function routerUp(id) {
  const name = routerName(id), [first, ...rest] = SEGMENTS;
  docker(['run', '-d', '--label', `${LABEL}=${id}`, '--label', 'unfold.host=router', '--name', name, '--runtime=runc',
    '--cap-drop', 'ALL', '--cap-add', 'NET_ADMIN', '--security-opt', 'no-new-privileges', '--sysctl', 'net.ipv4.ip_forward=1',
    '--cpus', '0.25', '--memory', '256m', '--pids-limit', '256', `--cgroup-parent=${SLICE}`,
    '--network', netName(id, first), '--ip', ip(first, ROUTER_N), 'r0-router:m1', 'sleep', 'infinity']);
  for (const s of rest) docker(['network', 'connect', '--ip', ip(s, ROUTER_N), netName(id, s), name]);
  return name;
}

export function up(id, authorizedKey) {
  netUp(id); // preflight (leftovers, STOP) + three internal isolated segments + check
  const router = routerUp(id);
  const pods = HOSTS.map((h) => ({ ...h, ...podUp({ range: id, host: h.host, image: h.image, segment: h.segment, ip: h.ip, service: h.service, routes: routesFor(h.segment), authorizedKey }) }));
  return { router, pods };
}

export const down = (id) => netDown(id);

// TCP connect from inside a host's service container (gVisor holds the host's network stack; see canary.probeExec)
function reach(svc, target, port) {
  return spawnSync('docker', ['exec', svc, 'timeout', '3', 'bash', '-c', `echo > /dev/tcp/${target}/${port}`], { encoding: 'utf8' }).status === 0;
}
const waitReach = (holder, target, port, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (reach(holder, target, port)) return true; spawnSync('sleep', ['2']); } return false; };

export function selftest(id) {
  const out = { range: id, at: new Date().toISOString(), steps: [] }, step = (name, ok, extra = {}) => { out.steps.push({ name, ok, ...extra }); if (!ok) throw Error(`selftest step failed: ${name} ${JSON.stringify(extra)}`); };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-key-'));
  try {
    spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', path.join(dir, 'k')]);
    const key = fs.readFileSync(path.join(dir, 'k.pub'), 'utf8').trim();
    step('preflight', preflight(id) === true);
    const t0 = Date.now(), { router, pods } = up(id, key);
    step('up', true, { seconds: Math.round((Date.now() - t0) / 1000), containers: docker(['ps', '-q', '--filter', `label=${LABEL}=${id}`]).split('\n').filter(Boolean).length });
    step('segments internal and isolated', check(id) === true);
    // second containment layer (systemd/r0-range-firewall.sh): range subnets cannot leave the range or reach benchhost
    const fw = spawnSync('sudo', ['-n', '/usr/local/sbin/r0-range-firewall', 'check'], { encoding: 'utf8' });
    step('second layer: DOCKER-USER and INPUT drop rules present', fw.status === 0, { out: (fw.stdout + fw.stderr).trim().slice(0, 200) });
    const P = Object.fromEntries(pods.map((p) => [p.host, p]));
    // runtimes: service and maintenance containers on gVisor, holders and router on runc
    const rt = (c) => docker(['inspect', '-f', '{{.HostConfig.Runtime}}', c]);
    step('runtimes', pods.every((p) => rt(p.service) === 'runsc' && rt(p.maint) === 'runsc' && rt(p.holder) === 'runc') && rt(router) === 'runc');
    // every container in the slice with its caps
    const caps = docker(['ps', '-q', '--filter', `label=${LABEL}=${id}`]).split('\n').filter(Boolean).map((c) => JSON.parse(docker(['inspect', c]))[0].HostConfig)
      .every((h) => h.CgroupParent === SLICE && h.NanoCpus === 25e7 && h.Memory === 256 * 1024 * 1024 && h.PidsLimit === 256);
    step('slice and caps', caps);
    // service reachability across segments, through the router
    const pairs = [['ws1', 'web', 2222], ['ws1', 'web', 8080], ['ws2', 'files', 2222], ['web', 'db', 5432], ['web', 'db', 2222], ['db', 'ws3', 2222]];
    const r = pairs.map(([a, b, port]) => ({ from: a, to: b, port, ok: waitReach(P[a].service, P[b].ip, port) }));
    step('reachability via router', r.every((x) => x.ok), { pairs: r });
    // a FORWARD drop on the router cuts the segments apart (what blue's Block relies on), and removing it restores them
    docker(['exec', router, 'iptables', '-I', 'FORWARD', '1', '-j', 'DROP']);
    const blocked = !reach(P.ws1.service, P.web.ip, 8080);
    docker(['exec', router, 'iptables', '-D', 'FORWARD', '1']);
    step('router block and allow', blocked && waitReach(P.ws1.service, P.web.ip, 8080, 20000));
    // the uid-0 maintenance loop is alive on every pod (heartbeat written by the baseline script)
    const beat = pods.every((p) => /^maint \d+/.test(docker(['exec', p.maint, 'cat', '/pod/maint/state'], { ok: true })));
    step('maintenance loop', beat);
    // egress canary from every host's namespace and from the router; then the positive control
    const own = SEGMENTS.map((s) => netName(id, s));
    const c = canary([...pods.map((p) => ({ name: p.service, exec: true })), { name: router }], own);
    // once gVisor took the interface a holder namespace has no address: checked, so a holder probe is never taken for a test
    const holderLo = pods.every((p) => !/inet 10\./.test(spawnSync('docker', ['run', '--rm', '--label', `${LABEL}=probe`, '--network', `container:${p.holder}`, '--cap-drop', 'ALL', TOOL, 'ip', '-4', '-o', 'addr'], { encoding: 'utf8' }).stdout));
    step('holder namespaces carry no address (gVisor owns the stack)', holderLo);
    step('canary', true, { probes: c.length, modes: c.map((x) => x.mode || 'netns'), targets: c[0].targets, udpPorts: [53, 40053], udpListenerTarget: c[0].targets > 0, reached: c.reduce((n, x) => n + x.open.length, 0) });
    step('positive control', true, control());
    step('positive control, exec probe (TCP, UDP 53 and canary port, ICMP)', true, controlExec());
    // ICMP sockets in the gVisor hosts, as the service user and as uid 0 (no caps): a raw socket must be refused. gVisor
    // does allow the unprivileged ping socket, so the exec canary probes ICMP through it (checked: mode includes icmp)
    const icmp = pods.map((p) => icmpCheck(p.service));
    step('ICMP in gVisor hosts: no raw socket; ping socket covered by the canary', icmp.every((x) => !x.raw) && (!icmp.some((x) => x.pingSocket) || c.filter((x) => x.mode).every((x) => x.mode.includes('icmp'))),
      { hosts: icmp.map((x) => ({ host: x.container, raw: x.raw, pingSocket: x.pingSocket, tries: x.tries.map((t) => ({ user: t.user, out: t.out })) })) });
  } finally {
    try { const d = down(id); out.steps.push({ name: 'teardown', ok: true, ...d }); } catch (e) { out.steps.push({ name: 'teardown', ok: false, error: String(e.message || e) }); }
    try { out.steps.push({ name: 'no leftovers', ok: preflight(id) === true }); } catch (e) { out.steps.push({ name: 'no leftovers', ok: false, error: String(e.message || e) }); }
    docker(['ps', '-aq', '--filter', `label=${LABEL}=probe`], { ok: true }).split('\n').filter(Boolean).forEach((c) => docker(['rm', '-f', c], { ok: true }));
    fs.rmSync(dir, { recursive: true, force: true });
  }
  out.ok = out.steps.every((s) => s.ok);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, id, keyFile] = process.argv.slice(2);
  try {
    if (cmd === 'up' && id && keyFile) console.log(JSON.stringify(up(id, fs.readFileSync(keyFile, 'utf8').trim())));
    else if (cmd === 'down' && id) console.log(JSON.stringify(down(id)));
    else if (cmd === 'selftest' && id) { const r = selftest(id); console.log(JSON.stringify(r, null, 1)); process.exit(r.ok ? 0 : 1); }
    else { console.error('usage: node range.mjs up <id> <authorized_keys> | down <id> | selftest <id>'); process.exit(2); }
  } catch (e) { console.error(String(e.message || e)); process.exit(1); }
}
