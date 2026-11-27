// Egress canary and positive control (TM-002 E1 revision). A short-lived probe container shares a range host's network
// namespace (with NET_RAW only) and tries every target below; every probe must be blocked. Any success, or a positive
// control that is NOT detected, writes STOP (net.mjs) and stops the programme until the Research Leader decides.
//   node canary.mjs probe <container>     probe from that container's network namespace
//   node canary.mjs control               positive control: a deliberately open network must be detected
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { docker, stop, LABEL, STATE } from './net.mjs';

export const TOOL = process.env.R0_TOOL_IMAGE || 'r0-nettool:m1';
const PORTS = [22, 80, 443];
// UDP: a DNS query to port 53 (answered by any resolver) and a canary payload to UDP_PORT, where a listener on benchhost's
// host network (udpListener) echoes back. Both are sent and read with bash /dev/udp from inside the host.
export const UDP_PORT = 40053;
const DNS_Q = '\\x12\\x34\\x01\\x00\\x00\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x02\\x00\\x01'; // query for the root NS
const LISTENER = 'r0-canary-udp';

// Targets: a public address (TCP 443 and ICMP), benchhost's LAN addresses, every Docker gateway on benchhost, and one address on
// every other Docker network (a container on it, else its gateway).
export function targets(ownNetworks = []) {
  const t = [{ what: 'public', ip: '1.1.1.1', tcp: [443], icmp: true }];
  for (const ip of spawnSync('hostname', ['-I'], { encoding: 'utf8' }).stdout.trim().split(/\s+/).filter((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x)))
    t.push({ what: 'benchhost', ip, tcp: PORTS, icmp: true });
  for (const id of docker(['network', 'ls', '-q']).split('\n').filter(Boolean)) {
    const n = JSON.parse(docker(['network', 'inspect', id]))[0];
    if (ownNetworks.includes(n.Name) || ['host', 'none'].includes(n.Name)) continue;
    for (const c of n.IPAM?.Config || []) if (c.Gateway && /^\d/.test(c.Gateway)) t.push({ what: `gateway ${n.Name}`, ip: c.Gateway, tcp: PORTS, icmp: true });
    // one member per network; never a control container, and on the UDP listener network always the listener
    const members = Object.values(n.Containers || {}).filter((c) => !String(c.Name).startsWith('r0-control'));
    const member = (members.find((c) => c.Name === LISTENER) || members[0])?.IPv4Address?.split('/')[0];
    if (member) t.push({ what: `member of ${n.Name}`, ip: member, tcp: PORTS, icmp: true });
  }
  return t;
}

// One probe run; returns the targets that were reached (empty = contained).
export function probe(container, ownNetworks = []) {
  const ts = targets(ownNetworks);
  // every check runs at once (each at most 2 s), so a probe takes seconds however many networks benchhost has
  const script = ts.flatMap((t) => [...t.tcp.map((p) => `(nc -z -w 2 ${t.ip} ${p} && echo "OPEN tcp ${t.ip}:${p}") &`), ...(t.icmp ? [`(ping -c 1 -W 2 ${t.ip} >/dev/null 2>&1 && echo "OPEN icmp ${t.ip}") &`] : [])]).join('\n') + '\nwait; true';
  const r = spawnSync('docker', ['run', '--rm', '--label', `${LABEL}=probe`, '--network', `container:${container}`, '--cap-drop', 'ALL', '--cap-add', 'NET_RAW',
    '--security-opt', 'no-new-privileges', TOOL, 'sh', '-c', script], { encoding: 'utf8', timeout: 10 * 60e3 });
  if (r.status !== 0) throw Error(`canary probe did not run on ${container}: ${(r.stderr || '').slice(-200)}`);
  const open = r.stdout.split('\n').filter((l) => l.startsWith('OPEN'));
  return { container, targets: ts.length, open, at: new Date().toISOString() };
}

// Probe from inside a gVisor host. runsc moves the interface and its address into its own network stack, so the holder's
// namespace keeps only lo and a probe that joins it (probe above) reaches nothing whatever the containment: it would
// pass vacuously. A gVisor host is therefore probed from inside its service container over TCP and UDP (bash /dev/tcp
// and /dev/udp), and over ICMP through the unprivileged ping socket that gVisor allows (icmpsock helper; no raw socket).
export function probeExec(container, ownNetworks = []) {
  const ts = targets(ownNetworks);
  const udp = (ip, port, payload) => `(timeout 3 bash -c 'exec 3<>/dev/udp/${ip}/${port}; printf "${payload}" >&3; head -c 1 <&3 | grep -q .' 2>/dev/null && echo "OPEN udp ${ip}:${port}") &`;
  const script = ts.flatMap((t) => [
    ...t.tcp.map((p) => `(timeout 2 bash -c 'echo > /dev/tcp/${t.ip}/${p}' 2>/dev/null && echo "OPEN tcp ${t.ip}:${p}") &`),
    udp(t.ip, 53, DNS_Q), udp(t.ip, UDP_PORT, 'r0-canary'),
  ]).join('\n') + '\nwait; true';
  const r = spawnSync('docker', ['exec', container, 'bash', '-c', script], { encoding: 'utf8', timeout: 10 * 60e3 });
  if (r.status !== 0) throw Error(`canary exec probe did not run on ${container}: ${(r.stderr || '').slice(-200)}`);
  // ICMP: gVisor gives no raw socket but does give the unprivileged ping socket, so the host can send ICMP echo; probe it
  // with the static helper (piped in, removed after)
  const icmp = withHelper(container, () => spawnSync('docker', ['exec', container, '/tmp/.r0i/icmpsock', 'ping', ...ts.filter((t) => t.icmp).map((t) => t.ip)], { encoding: 'utf8', timeout: 60e3 }));
  if (icmp.status !== 0) throw Error(`canary icmp probe did not run on ${container}: ${(icmp.stderr || '').slice(-200)}`);
  const open = (r.stdout + icmp.stdout).split('\n').filter((l) => l.startsWith('OPEN'));
  return { container, mode: 'exec-tcp-udp-icmp', targets: ts.length, open, at: new Date().toISOString() };
}

// UDP echo listener on its own (non-internal) Docker network, outside every range: targets() lists it as "member of
// r0-canaryudp", so every probe sends the canary payload to it, and a range host must never get the echo back.
// (benchhost's ufw drops UDP from Docker bridges to the host, so a listener on the host network could not be reached even
// from an open network and its probe would pass vacuously.) No caps, user nobody; removed after the probes.
export const UDP_NET = 'r0-canaryudp';
export function udpListener(on = true) {
  docker(['rm', '-f', LISTENER], { ok: true }); docker(['network', 'rm', UDP_NET], { ok: true });
  if (!on) return null;
  docker(['network', 'create', '--label', `${LABEL}=probe`, UDP_NET]);
  docker(['run', '-d', '--name', LISTENER, '--label', `${LABEL}=probe`, '--network', UDP_NET, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--user', '65534:65534', TOOL, 'socat', `UDP4-RECVFROM:${UDP_PORT},fork`, 'SYSTEM:echo r0-canary-echo']);
  spawnSync('sleep', ['1']);
  return JSON.parse(docker(['inspect', LISTENER]))[0].NetworkSettings.Networks[UDP_NET].IPAddress;
}

// Can this container open an ICMP socket (raw, or an unprivileged ping socket allowed by ping_group_range)? A static
// helper (images/icmpsock.c, built by images/build.sh) is piped in through stdin (gVisor keeps its own rootfs overlay,
// so docker cp is not seen), run as the container's user and as uid 0 (no caps), and removed. It calls socket() for
// SOCK_RAW and SOCK_DGRAM with IPPROTO_ICMP and reports the errno of each.
export const ICMPSOCK = process.env.R0_ICMPSOCK || new URL('./images/icmpsock', import.meta.url).pathname;
// Build plumbing (Cyber Research OK, 2026-11-23): the binary is a gitignored build artefact, so a fresh study worktree
// lacks it. When it is missing it is compiled here exactly as images/build.sh does. Fail-closed: if the build fails or
// the binary is still absent, this throws a final error and no canary (hence no episode) runs. Every on-the-spot build
// is logged with the binary's sha256 in <R0_STATE>/icmpsock-builds.jsonl; the day's positive control (controlExec, which
// requires ICMP detection) is the check that validates a new binary. What the canary probes does not change.
let lastIcmpsock = null;
export function ensureIcmpsock({ file = ICMPSOCK, cc = process.env.R0_CC || 'gcc', log = path.join(STATE, 'icmpsock-builds.jsonl') } = {}) {
  const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  let builtAt = null;
  if (!fs.existsSync(file)) {
    const src = path.join(path.dirname(file), 'icmpsock.c');
    const r = spawnSync(cc, ['-static', '-O2', '-o', file, src], { encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(file)) throw Object.assign(Error(`icmpsock is missing and could not be built (${cc} exit ${r.status}: ${String(r.stderr || r.error || '').slice(-200)}); the canary never runs without its ICMP probe`), { final: true });
    builtAt = new Date().toISOString();
    const entry = { at: builtAt, path: file, sha256: sha(file), sourceSha256: sha(src), cc };
    fs.mkdirSync(path.dirname(log), { recursive: true }); fs.appendFileSync(log, JSON.stringify(entry) + '\n');
  }
  if (!lastIcmpsock || lastIcmpsock.path !== file || builtAt) lastIcmpsock = { path: file, sha256: sha(file), builtOnTheSpot: !!builtAt || !!lastIcmpsock?.builtOnTheSpot, builtAt: builtAt || lastIcmpsock?.builtAt || null };
  return lastIcmpsock;
}
export const icmpsockInfo = () => lastIcmpsock;
function withHelper(container, fn) {
  ensureIcmpsock();
  const put = spawnSync('docker', ['exec', '-i', '-u', '0', container, 'sh', '-c', 'mkdir -p /tmp/.r0i && cat > /tmp/.r0i/icmpsock && chmod 755 /tmp/.r0i/icmpsock'], { input: fs.readFileSync(ICMPSOCK) });
  if (put.status !== 0) throw Error(`cannot place icmpsock in ${container}`);
  try { return fn(); } finally { spawnSync('docker', ['exec', '-u', '0', container, 'rm', '-rf', '/tmp/.r0i']); }
}
export function icmpCheck(container) {
  return withHelper(container, () => {
    const as = (user) => { const r = spawnSync('docker', ['exec', '-u', user, container, '/tmp/.r0i/icmpsock'], { encoding: 'utf8' });
      if (![0, 1].includes(r.status)) throw Error(`icmpsock did not run in ${container}: ${(r.stderr || '').slice(-200)}`);
      const out = r.stdout.trim().split('\n'); return { user, raw: out.includes('raw ok'), ping: out.includes('ping ok'), out }; };
    const tries = [as('1000'), as('0')];
    return { container, tries, raw: tries.some((t) => t.raw), pingSocket: tries.some((t) => t.ping) };
  });
}

// Canary on a list of containers ({name, exec: true} for gVisor hosts); any success stops the programme.
export function canary(containers, ownNetworks) {
  udpListener(true);
  try { return canaryRun(containers, ownNetworks); } finally { udpListener(false); }
}
function canaryRun(containers, ownNetworks) {
  const results = containers.map((c) => (typeof c === 'object' ? (c.exec ? probeExec(c.name, ownNetworks) : probe(c.name, ownNetworks)) : probe(c, ownNetworks))), leaks = results.filter((r) => r.open.length);
  if (leaks.length) { stop({ kind: 'canary success', leaks }); throw Error(`CONTAINMENT FAILURE: ${JSON.stringify(leaks)}`); }
  return results;
}

// Positive control: a probe on a deliberately open (non-internal) network must see at least one target. If it sees none,
// the canary cannot be trusted: STOP.
export function control() {
  const net = `r0-control-${process.pid}`;
  docker(['network', 'create', '--label', `${LABEL}=control`, net]);
  try {
    docker(['run', '-d', '--name', net, '--label', `${LABEL}=control`, '--network', net, '--cap-drop', 'ALL', '--user', '65534:65534', TOOL, 'sleep', '600']);
    const r = probe(net, [net]);
    if (!r.open.length) { stop({ kind: 'positive control not detected', result: r }); throw Error('POSITIVE CONTROL FAILED: the canary did not detect an open network'); }
    return { detected: r.open.length, sample: r.open.slice(0, 3), at: r.at };
  } finally { docker(['rm', '-f', net], { ok: true }); docker(['network', 'rm', net], { ok: true }); }
}

// Positive control of the exec probe: a Debian host container (the range base image) on a deliberately open network
// must reach something over TCP, over UDP (a public resolver on 53, the host listener on UDP_PORT) and over ICMP. If
// any protocol sees nothing, the exec canary cannot be trusted: STOP.
export function controlExec() {
  const net = `r0-controlx-${process.pid}`;
  docker(['network', 'create', '--label', `${LABEL}=control`, net]);
  const listener = udpListener(true);
  try {
    docker(['run', '-d', '--name', net, '--label', `${LABEL}=control`, '--network', net, '--cap-drop', 'ALL', '--user', '1000:1000', 'r0-base:m1', 'sleep', '600']);
    docker(['network', 'connect', UDP_NET, net]); // the control shares the listener's network: the canary port must answer
    const r = probeExec(net, [net]), by = (k) => r.open.filter((l) => l.startsWith(`OPEN ${k}`));
    const tcp = by('tcp'), udp = by('udp'), icmp = by('icmp');
    const canaryPort = udp.some((l) => l === `OPEN udp ${listener}:${UDP_PORT}`), dns = udp.some((l) => / \S+:53$/.test(l));
    if (!tcp.length || !dns || !canaryPort || !icmp.length) { stop({ kind: 'exec positive control not detected', result: r }); throw Error(`EXEC POSITIVE CONTROL FAILED: tcp ${tcp.length}, udp dns ${dns}, udp canary port ${canaryPort}, icmp ${icmp.length}`); }
    return { tcp: tcp.length, udp: udp.length, udpDns: dns, udpCanaryPort: canaryPort, icmp: icmp.length, sample: [...udp.slice(0, 3), ...icmp.slice(0, 2)], at: r.at };
  } finally { docker(['rm', '-f', net], { ok: true }); udpListener(false); docker(['network', 'rm', net], { ok: true }); } // control first: it is attached to the listener network
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, c] = process.argv.slice(2);
  try { console.log(JSON.stringify(cmd === 'control' ? control() : cmd === 'probe' && c ? probe(c) : (() => { throw Error('usage: node canary.mjs control | probe <container>'); })(), null, 1)); }
  catch (e) { console.error(String(e.message || e)); process.exit(1); }
}
