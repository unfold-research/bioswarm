// R0 process and socket sensors (M2; tasks/R0-PILOT-PREREG.md, "What is suspicious"). They read from INSIDE each pod's
// containers, never from the holder (gVisor moves the pod's network stack into the service container; README "The
// holder namespace is empty once gVisor starts"):
//   - service container (uid 1000, gVisor): processes, and sockets from /proc/net/{tcp,tcp6,udp,udp6};
//   - maintenance container (uid 0, gVisor, no network): processes;
//   - router (runc): processes, and its conntrack table for the flows it forwards.
// A host is its whole pod: the process cue unions the service and maintenance containers (they share the network
// namespace, not the pid namespace).
//
// Each gVisor container gets ONE long-lived exec stream (bash, builtins only between steps) for the whole episode:
// "P" dumps processes, "S" returns every socket seen since the last "S". Between commands the stream polls the socket
// tables every 100 ms, because gVisor drops a socket from /proc/net/tcp as soon as it closes (no TIME_WAIT; tested on
// benchhost 2026-11-22), so a once-per-step snapshot would miss connections opened and closed inside one step. The router's
// conntrack keeps closed flows for at least 10 s (CLOSE) and up to 120 s (TIME_WAIT, SYN_SENT), so every flow that
// crosses segments within a 2 s step is in its table at the next read.
//
// Known gap (reported): a connection between two hosts of the SAME segment that opens and closes in under ~100 ms, or
// a connect to a closed port on the same segment, does not cross the router and may be missed.
//
// Commands are read only once a line is waiting (`read -t 0`, then a blocking `read`); the 100 ms wait is a `read -t` on
// a private pipe. The stream used to wait with `read -t 0.1` on stdin itself: when that timeout fired while bash was
// reading a command (one byte per syscall from a pipe, slow under gVisor), the part read was dropped and the command
// never got a reply, so the step hit the 1.5 s timeout on that host (found 2026-11-22 with stream-probe.mjs: each lost
// reply came with a partial "P" at the timeout; a command split by a 250 ms pause was never answered).
//
// Keys (prereg, "Allow-list key"): process = (executable path, parent executable path, user); connection = (source
// host, destination host, destination port, protocol). Harness processes are excluded by the fixed list EXCLUDE_EXES
// (hashed) and only when they carry the episode's harness token in their environment, so a red shell with the same
// executable is never excluded.
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

export const EXCLUDE_EXES = ['/usr/bin/bash', '/bin/bash', '/usr/bin/stat', '/usr/bin/dash', '/bin/sh', '/bin/busybox', '/usr/sbin/conntrack', '/usr/bin/docker-init'];
export const EXCLUDE_SHA256 = sha(EXCLUDE_EXES);
export const NO_PARENT = '-'; // pid 1 and exec'd processes: the parent is outside the container
const USERS = { 0: 'root', 1000: 'svc' };
const STEP_TIMEOUT_MS = Number(process.env.R0_SENSOR_TIMEOUT_MS || 1500);

export function sha(x) { return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'); }

// The in-container sensor (bash 5, builtins only except one `stat` per process dump; the environment is read only for
// processes whose executable is on the exclusion list). $1 = 1 to poll sockets.
export const STREAM = String.raw`
T="$R0_HARNESS"; NET="$1"; declare -A SEEN
poll() { local f l
  for f in tcp tcp6 udp udp6; do [ -r /proc/net/$f ] || continue
    { read -r l; while read -r l; do set -- $l
        if [ "$3" = 00000000:0000 ] || [ "$3" = 00000000000000000000000000000000:0000 ]; then SEEN["L $f $2"]=1; continue; fi
        [ "$4" = 0A ] && continue; SEEN["C $f $2 $3"]=1
      done; } < /proc/net/$f
  done; }
procs() { local l p n st pp u k v r h c kv e; local -A E
  while read -r l; do p=$\{l#E /proc/}; n=$\{p%%/*}; e=$\{l##* -> \'}; E[$n]=$\{e%\'}; done < <(stat -c 'E %n %N' /proc/[0-9]*/exe 2>/dev/null)
  for n in "$\{!E[@]}"; do e=$\{E[$n]}; p=/proc/$n
    read -r st < $p/stat 2>/dev/null || continue; st=$\{st##*) }; set -- $st; pp=$2
    u=; while read -r k v r; do [ "$k" = Uid: ] && { u=$v; break; }; done < $p/status
    h=0; c=0; case " $R0_EXCLUDE " in *" $e "*) c=1;; esac; case $pp in 0|1) c=1;; *) [ -n "$\{E[$pp]+x}" ] || c=1;; esac
    # a checked process with no token found is looked at again: if it has exited meanwhile (gone or a zombie; an exiting
    # process can show an empty environ) it is skipped, never keyed without its token
    if [ $c = 1 ]; then
      { while IFS= read -r -d '' kv; do [ "$kv" = "R0_HARNESS=$T" ] && { h=1; break; }; done < $p/environ; } 2>/dev/null
      if [ $h = 0 ]; then read -r st < $p/stat 2>/dev/null || continue; st=$\{st##*) }; case $st in Z*|X*|x*) continue;; esac; fi
    fi
    echo "P $n $pp $u $h $e"
  done; }
exec {SL}<> <(:) # a pipe nobody writes to: read -t on it is a builtin 100 ms sleep
[ "$NET" = 1 ] && poll
while :; do
  if read -t 0; then read -r cmd || exit 0
    case $cmd in P) procs; echo END;; S) for k in "$\{!SEEN[@]}"; do echo "$k"; done; echo END; SEEN=(); [ "$NET" = 1 ] && poll;; Q) exit 0;; esac
  else read -r -t 0.1 -u $SL _; fi
  [ "$NET" = 1 ] && poll
done`.replace(/\$\\\{/g, '${');

// The router's stream (busybox ash on runc): "R" returns its conntrack table, "===", then its processes.
export const ROUTER_STREAM = String.raw`
while read -r cmd; do case $cmd in
  R) conntrack -L 2>/dev/null; echo ===
     for p in /proc/[0-9]*; do n=$\{p#/proc/}; e=$(readlink $p/exe) || continue; s=$(cat $p/stat 2>/dev/null) || continue; s=$\{s##*') '}; set -- $s
       u=$(awk '/^Uid/{print $2}' $p/status 2>/dev/null); h=0
       c=0; case " $R0_EXCLUDE " in *" $e "*) c=1;; esac; case $2 in 0|1) c=1;; esac
       if [ $c = 1 ]; then if tr '\0' '\n' < $p/environ 2>/dev/null | grep -qx "R0_HARNESS=$R0_HARNESS"; then h=1; else s=$(cat $p/stat 2>/dev/null) || continue; case $\{s##*') '} in Z*|X*|x*) continue;; esac; fi; fi
       echo "P $n $2 $u $h $e"; done; echo END;;
  Q) exit 0;; esac; done`.replace(/\$\\\{/g, '${');

// ---- parsing (pure; unit-tested in sensors.test.mjs) ----
export function hexAddr(h) {
  const [a, p] = h.split(':'), port = parseInt(p, 16);
  if (a.length === 8) return { ip: [6, 4, 2, 0].map((i) => parseInt(a.slice(i, i + 2), 16)).join('.'), port };
  // IPv6 in /proc: four little-endian 32-bit words; a v4-mapped address ends in ffff + the v4 word
  const w = [0, 8, 16, 24].map((i) => a.slice(i, i + 8));
  if (w[0] === '00000000' && w[1] === '00000000' && w[2].toUpperCase() === 'FFFF0000') return hexAddr(`${w[3]}:${p}`);
  return { ip: w.map((x) => [6, 4, 2, 0].map((i) => x.slice(i, i + 2)).join('')).join(':').toLowerCase(), port };
}

// processes of one container -> keys. lines: "P <pid> <ppid> <uid> <harness 0|1> <exe>"; stats (optional) counts the
// error lines dropped. Cyber Research, 2026-11-23 (pre-data deviation):
//   - an error line of the reader never becomes a key: a process whose executable link the sensor cannot read prints
//     the raw stat text ("E /proc/1006/exe '/proc/1006/exe") instead of a path. Measured under gVisor on benchhost: these
//     are LIVE non-dumpable sshd session children (exe and environ unreadable to svc), not only exited processes. Such
//     a process is dropped and counted (stats.unreadable); a child of it gets the parent UNREADABLE_PARENT ('?').
//   - every process carrying the harness token, and every descendant of one, is left out (not only the executables of
//     EXCLUDE_EXES). The stream reads the token for the listed executables and for every root it can find (an exec'd
//     process, ppid 0; a child of pid 1; an orphan): docker exec sets R0_HARNESS on the root and every descendant
//     inherits it (measured under gVisor: bash, timeout, sftp, ssh and their children), and `bash -c 'timeout ...'`
//     execs timeout in place, so the root is not always a listed executable. A red process never descends from a
//     token root (red's exec carries no token; its shells hang under sshd), and the sshd sessions serving green on a
//     server are not harness processes either: they stay.
export const UNREADABLE_PARENT = '?';
const readable = (exe) => typeof exe === 'string' && exe.startsWith('/');
export function parseProcs(lines, stats = null) {
  const P = new Map();
  for (const l of lines) { const m = /^P (\d+) (\d+) (\d+) ([01]) (.+)$/.exec(l); if (m) P.set(m[1], { pid: m[1], ppid: m[2], uid: Number(m[3]), harness: m[4] === '1', exe: m[5] }); }
  const memo = new Map();
  const inHarness = (p) => { // the process or an ancestor in this container carries the token (bounded walk, no cycles)
    const seen = []; let q = p, r = false;
    for (let k = 0; q && k < 64; k++) {
      if (memo.has(q.pid)) { r = memo.get(q.pid); break; }
      seen.push(q.pid); if (q.harness) { r = true; break; }
      if (q.ppid === '0' || q.ppid === q.pid) break;
      q = P.get(q.ppid);
    }
    for (const id of seen) memo.set(id, r);
    return r;
  };
  const out = [];
  for (const p of P.values()) {
    if (!readable(p.exe)) { if (stats) stats.unreadable = (stats.unreadable || 0) + 1; continue; }
    if (inHarness(p)) continue;
    const par = p.ppid === '0' ? null : P.get(p.ppid);
    out.push({ exe: p.exe, parent: !par ? NO_PARENT : readable(par.exe) ? par.exe : UNREADABLE_PARENT, user: USERS[p.uid] ?? String(p.uid) });
  }
  return out;
}

// Canonical flow (Cyber Research, 2026-11-23, pre-data deviation): a flow is keyed client -> server:service-port
// whenever one side uses a declared TCP service port of its host (svc: { host: [ports] }, range.mjs SERVICE_PORTS).
// A flow caught mid-stream (conntrack) or a socket mis-sided by the listen test can come out inverted, the server
// pointing at the client's ephemeral port ("files|ws1|21794"); it is folded back to "ws1|files|2222". If neither side
// uses a service port the key stays as given, so an unknown target stays suspicious. Pure.
//   f: { src, dst, sport?, dport, proto }. Returns { src, dst, port, proto }, or null when the flow cannot be put in
//   canonical form: its dport is no service port of dst and its sport is unknown (a recorded key without sport).
export function canonicalFlow({ src, dst, sport, dport, proto }, svc = {}) {
  const isSvc = (h, p) => proto === 'tcp' && p != null && (svc[h] || []).includes(Number(p));
  if (isSvc(dst, dport)) return { src, dst, port: Number(dport), proto };
  if (sport == null) return null;
  if (isSvc(src, sport)) return { src: dst, dst: src, port: Number(sport), proto };
  return { src, dst, port: Number(dport), proto };
}

// sockets of one host's service container -> connection keys. ipHost maps an IP to its range host name; svc gives the
// declared service ports (canonicalFlow; with none given the keys are as before).
export function parseSockets(lines, self, ipHost, svc = {}) {
  const listen = { tcp: new Set(), udp: new Set() }, conns = [];
  const proto = (f) => (f.startsWith('tcp') ? 'tcp' : 'udp'), name = (ip) => (ip.startsWith('127.') || ip === '::1' ? self : ipHost[ip] || ip);
  for (const l of lines) { const [k, f, loc] = l.split(' '); if (k === 'L') listen[proto(f)].add(hexAddr(loc).port); }
  for (const l of lines) {
    const [k, f, loc, rem] = l.split(' '); if (k !== 'C') continue;
    const a = hexAddr(loc), b = hexAddr(rem), pr = proto(f), local = name(a.ip), peer = name(b.ip);
    // inbound if the local port is one this host listens on, otherwise outbound; then the canonical direction
    const f0 = listen[pr].has(a.port) ? { src: peer, sport: b.port, dst: local, dport: a.port, proto: pr } : { src: local, sport: a.port, dst: peer, dport: b.port, proto: pr };
    conns.push(canonicalFlow(f0, svc));
  }
  return conns;
}

// router conntrack -L lines -> flow keys: original direction src:sport -> dst:dport, then the canonical direction
export function parseConntrack(lines, ipHost, svc = {}) {
  const out = [];
  for (const l of lines) {
    const pr = /^(tcp|udp)\b/.exec(l)?.[1]; if (!pr) continue;
    const src = /\bsrc=(\S+)/.exec(l)?.[1], dst = /\bdst=(\S+)/.exec(l)?.[1], sport = /\bsport=(\d+)/.exec(l)?.[1], dport = /\bdport=(\d+)/.exec(l)?.[1];
    if (!src || !dst || !dport) continue;
    const f = { src: ipHost[src] || src, dst: ipHost[dst] || dst, sport: sport == null ? undefined : Number(sport), dport: Number(dport), proto: pr };
    out.push(canonicalFlow(f, svc) || { src: f.src, dst: f.dst, port: f.dport, proto: pr }); // no sport (never seen): as is
  }
  return out;
}

export const pkey = (p) => `${p.exe}|${p.parent}|${p.user}`;
export const ckey = (c) => `${c.src}|${c.dst}|${c.port}|${c.proto}`;
const uniq = (a) => [...new Set(a)].sort();

// ---- frozen lists and cues ----
// freeze: every key seen on a host in the baseline observations joins that host's lists; sorted, hashed.
export function freeze(observations) {
  const lists = {};
  for (const obs of observations) for (const [h, o] of Object.entries(obs.hosts)) {
    const L = (lists[h] ||= { procs: [], flows: [] });
    L.procs.push(...o.procs.map(pkey)); L.flows.push(...o.conns.map(ckey));
  }
  for (const L of Object.values(lists)) { L.procs = uniq(L.procs); L.flows = uniq(L.flows); }
  const sorted = Object.fromEntries(Object.keys(lists).sort().map((h) => [h, lists[h]]));
  return { lists: sorted, sha256: sha(sorted), exclude: EXCLUDE_EXES, excludeSha256: EXCLUDE_SHA256 };
}

// Refreeze (Cyber Research, 2026-11-23, pre-data deviation): the RECORDED baseline observations, their connection keys
// put through canonicalFlow and then frozen with freeze() as before. A recorded key carries no source port, so a key
// whose port is not a declared service port of its destination cannot be canonicalised and drops out of the lists.
// Process keys are unchanged. Deterministic: same observations and ports, same lists and hash. Pure.
export function refreeze(observations, svc) {
  const dropped = {};
  const canon = (observations || []).map((obs) => ({ hosts: Object.fromEntries(Object.entries(obs.hosts || {}).map(([h, o]) => {
    const conns = [];
    for (const c of o.conns || []) {
      const k = canonicalFlow({ src: c.src, dst: c.dst, sport: c.sport, dport: c.port, proto: c.proto }, svc);
      if (k) conns.push(k); else (dropped[h] ||= new Set()).add(ckey(c));
    }
    return [h, { ...o, procs: o.procs || [], conns }];
  })) }));
  const frozen = freeze(canon);
  const droppedByHost = Object.fromEntries(Object.keys({ ...frozen.lists, ...dropped }).sort().map((h) => [h, dropped[h] ? dropped[h].size : 0]));
  return { frozen, droppedByHost, droppedKeys: Object.fromEntries(Object.keys(dropped).sort().map((h) => [h, uniq([...dropped[h]])])) };
}

// cues on one step: per host, the process and connection keys outside its frozen lists. A host that is down shows none.
export function cues(obs, frozen) {
  const out = {};
  for (const [h, o] of Object.entries(obs.hosts)) {
    const L = frozen.lists[h] || { procs: [], flows: [] };
    const procs = o.up ? uniq(o.procs.map(pkey)).filter((k) => !L.procs.includes(k)) : [];
    const conns = o.up ? uniq(o.conns.map(ckey)).filter((k) => !L.flows.includes(k)) : [];
    out[h] = { suspiciousProcess: procs.length > 0, suspiciousConnection: conns.length > 0, procs, conns };
  }
  return out;
}

// ---- live streams ----
// A reply later than STEP_TIMEOUT_MS fails that ask (the step goes on without it), but the stream is kept: the late reply
// is consumed when it comes, and a late "S" reply's sockets are carried into the next "S", so a slow step under load
// neither loses the sockets seen nor costs a new exec. A stream is restarted only when it ended (container stopped or
// recreated) or a reply is over HUNG_MS late. stats: timeouts, late replies (ms), restarts.
const HUNG_MS = 10000;
class Stream {
  constructor(container, token, argv) { this.container = container; this.token = token; this.argv = argv; this.stats = { timeouts: 0, late: [], restarts: -1 }; this.start(); }
  start() {
    this.buf = ''; this.waiters = []; this.carry = []; this.dead = false; this.stats.restarts++;
    const p = this.p = spawn('docker', ['exec', '-i', '-e', `R0_HARNESS=${this.token}`, '-e', `R0_EXCLUDE=${EXCLUDE_EXES.join(' ')}`, this.container, ...this.argv], { stdio: ['pipe', 'pipe', 'ignore'] });
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d) => { if (p === this.p) { this.buf += d; this.flush(); } });
    p.on('exit', () => { if (p !== this.p) return; this.dead = true; this.waiters.splice(0).forEach((w) => w.reject(Error('stream ended'))); });
    p.stdin.on('error', () => {});
  }
  flush() {
    let i;
    while (this.waiters.length && (i = this.buf.indexOf('\nEND\n')) >= 0 || (this.waiters.length && this.buf.startsWith('END\n'))) {
      const cut = this.buf.startsWith('END\n') ? 0 : i + 1, lines = this.buf.slice(0, cut).split('\n').filter(Boolean);
      this.buf = this.buf.slice(cut + 4);
      const w = this.waiters.shift();
      if (!w.timedOut) { w.resolve(w.cmd === 'S' ? this.carry.splice(0).concat(lines) : lines); continue; }
      this.stats.late.push(Date.now() - w.t0);
      if (w.cmd === 'S') this.carry.push(...lines);
    }
  }
  ask(cmd) {
    const w0 = this.waiters[0];
    if (!this.dead && w0?.timedOut && Date.now() - w0.t0 > HUNG_MS) this.stop();
    if (this.dead) this.start();
    return new Promise((resolve, reject) => {
      const w = { cmd, t0: Date.now(), timedOut: false };
      const t = setTimeout(() => { w.timedOut = true; this.stats.timeouts++; reject(Error('timeout')); }, STEP_TIMEOUT_MS);
      w.resolve = (x) => { clearTimeout(t); resolve(x); }; w.reject = (e) => { clearTimeout(t); if (!w.timedOut) reject(e); };
      this.waiters.push(w);
      this.p.stdin.write(cmd + '\n');
    });
  }
  stop() {
    const p = this.p; try { p.stdin.end('Q\n'); } catch {} setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, 500).unref();
    this.dead = true; this.waiters.splice(0).forEach((w) => w.reject(Error('stream stopped')));
  }
}

// Sensors for one range. hosts: [{host, ip, service, maint}] (range.mjs up()); router: {name, ips:[...]};
// servicePorts: { host: [ports] } (range.mjs SERVICE_PORTS) for the canonical flow keys.
export class Sensors {
  constructor({ hosts, router, token = crypto.randomBytes(12).toString('hex'), servicePorts = {} }) {
    this.token = token; this.hosts = hosts; this.router = router; this.svc = servicePorts;
    this.ipHost = Object.fromEntries([...hosts.map((h) => [h.ip, h.host]), ...(router?.ips || []).map((ip) => [ip, 'router'])]);
    this.streams = {};
    for (const h of hosts) this.streams[h.host] = { svc: new Stream(h.service, token, ['bash', '-c', STREAM, 'r0sense', '1']), maint: new Stream(h.maint, token, ['bash', '-c', STREAM, 'r0sense', '0']) };
    if (router) this.routerStream = new Stream(router.name, token, ['sh', '-c', ROUTER_STREAM]);
  }
  // a host whose service container does not answer (stopped or being recreated by a Restore) is down: no cues. Its
  // stream is restarted at the next step.
  async hostObs(h) {
    const s = this.streams[h.host];
    const [svc, mp] = await Promise.all([Promise.all([s.svc.ask('P'), s.svc.ask('S')]).catch((e) => e), s.maint.ask('P').catch((e) => e)]);
    if (svc instanceof Error) return { up: false, procs: [], conns: [], error: String(svc.message || svc) };
    const st = { unreadable: 0 };
    const o = { up: true, procs: [...parseProcs(svc[0], st), ...(mp instanceof Error ? [] : parseProcs(mp, st))], conns: parseSockets(svc[1], h.host, this.ipHost, this.svc), procErrors: st.unreadable };
    if (mp instanceof Error) o.maintError = String(mp.message || mp); // maintenance processes missing from this step
    return o;
  }
  async routerObs() {
    if (!this.router) return null;
    try {
      const lines = await this.routerStream.ask('R'), i = lines.indexOf('===');
      const st = { unreadable: 0 };
      return { up: true, procs: parseProcs(lines.slice(i + 1), st), flows: parseConntrack(lines.slice(0, i), this.ipHost, this.svc), procErrors: st.unreadable };
    } catch (e) { return { up: false, procs: [], flows: [], error: String(e.message || e) }; }
  }
  // one step: every host's observation; router flows are added to both endpoint hosts (the socket exists on both)
  async step() {
    const t0 = Date.now();
    const timing = {}, timed = (k, p) => { const t = Date.now(); return p.then((x) => { timing[k] = Date.now() - t; return x; }); };
    const [obs, ro] = await Promise.all([Promise.all(this.hosts.map((h) => timed(h.host, this.hostObs(h)))), timed('router', this.routerObs())]);
    const hosts = Object.fromEntries(this.hosts.map((h, i) => [h.host, obs[i]]));
    if (ro) {
      for (const f of ro.flows) for (const end of [f.src, f.dst]) if (hosts[end]?.up) hosts[end].conns.push(f);
      hosts.router = { up: ro.up, procs: ro.procs, conns: ro.flows.filter((f) => f.src === 'router' || f.dst === 'router'), error: ro.error, procErrors: ro.procErrors || 0 };
    }
    for (const o of Object.values(hosts)) o.conns = dedupe(o.conns, ckey);
    return { at: new Date().toISOString(), ms: Date.now() - t0, timing, hosts, procErrors: procErrorsOf(hosts) };
  }
  stats() { const o = {}; for (const [h, s] of Object.entries(this.streams)) { o[`${h}.svc`] = s.svc.stats; o[`${h}.maint`] = s.maint.stats; } if (this.routerStream) o.router = this.routerStream.stats; return o; }
  close() { for (const s of Object.values(this.streams)) { s.svc.stop(); s.maint.stop(); } this.routerStream?.stop(); }
}
// error lines of the process reader dropped in one step: total and per host (only hosts with some). Pure.
export function procErrorsOf(hosts) {
  const byHost = {}; let total = 0;
  for (const [h, o] of Object.entries(hosts || {})) if (o?.procErrors) { byHost[h] = o.procErrors; total += o.procErrors; }
  return { total, byHost };
}
const dedupe = (a, k) => [...new Map(a.map((x) => [k(x), x])).values()];
