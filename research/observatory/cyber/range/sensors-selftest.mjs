// M2 sensor selftest on an empty range (no red chain, no green driver, not an episode; README "Containment tests"):
//   node sensors-selftest.mjs <id>
// Builds the range, runs the sensors from inside every pod's containers, and checks each case the prereg's cue rules
// need: baseline keys of every host (service + maintenance unioned), harness exclusion by token only, an ssh session
// across segments (process and connection cues on both ends), a short connection across segments (router conntrack),
// a short connection inside one segment (100 ms poll), a uid-0 process from the group-writable maintenance script, a
// host that is down shows no cues and comes back, and the step time over 30 steps. JSON report on stdout.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { up, down, HOSTS } from './range.mjs';
import { preflight, SUBNET, SEGMENTS } from './net.mjs';
import { Sensors, freeze, cues, pkey, ckey, EXCLUDE_SHA256 } from './sensors.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dx = (args, opts = {}) => spawnSync('docker', args, { encoding: 'utf8', ...opts });
const reach = (svc, ip, port) => dx(['exec', svc, 'timeout', '3', 'bash', '-c', `echo > /dev/tcp/${ip}/${port}`]).status === 0;
const routerIps = SEGMENTS.map((s) => SUBNET[s].replace(/\.0\/24$/, '.254'));
const has = (o, k) => o.procs.map(pkey).includes(k);
const conn = (o, k) => o.conns.map(ckey).includes(k);

export async function selftest(id) {
  const out = { range: id, at: new Date().toISOString(), excludeSha256: EXCLUDE_SHA256, steps: [] };
  const step = (name, ok, extra = {}) => { out.steps.push({ name, ok, ...extra }); if (!ok) throw Error(`sensor selftest step failed: ${name} ${JSON.stringify(extra).slice(0, 600)}`); };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-key-')), held = [];
  let S;
  try {
    spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', path.join(dir, 'k')]);
    step('preflight', preflight(id) === true);
    const { router, pods } = up(id, fs.readFileSync(path.join(dir, 'k.pub'), 'utf8').trim());
    const P = Object.fromEntries(pods.map((p) => [p.host, p]));
    // readiness is probed from ws3, which no later case uses as a source: the router's conntrack keeps a closed flow up
    // to 120 s, so a ws1 -> web probe here would be in the baseline lists and hide the ssh case's connection cue
    const t0 = Date.now(); while (!reach(P.ws3.service, P.web.ip, 2222) && Date.now() - t0 < 60000) await sleep(2000);
    step('range up', reach(P.ws3.service, P.web.ip, 2222), { hosts: pods.length });
    // the private key for the ssh cases sits only in ws1 and ws2 (the assumed-breach workstations of these checks)
    for (const h of ['ws1', 'ws2']) dx(['exec', '-i', P[h].service, 'sh', '-c', 'cat > /tmp/k && chmod 600 /tmp/k'], { input: fs.readFileSync(path.join(dir, 'k')) });

    S = new Sensors({ hosts: pods, router: { name: router, ips: routerIps } });
    for (let i = 0; i < 3; i++) { await S.step(); await sleep(2000); } // warm-up
    const base = []; for (let i = 0; i < 5; i++) { base.push(await S.step()); await sleep(2000); }
    const frozen = freeze(base);
    const H = base.at(-1).hosts;
    step('every host up and observed', Object.values(H).every((o) => o.up) && Object.keys(H).length === pods.length + 1, { hosts: Object.fromEntries(Object.entries(H).map(([h, o]) => [h, { up: o.up, error: o.error, procs: o.procs.length }])) });
    // on the frozen lists (the union of the baseline steps): the maintenance loop's sleep does not run at every instant
    const fl = (h, k) => frozen.lists[h].procs.includes(k);
    step('baseline keys: service and maintenance unioned per host', fl('web', '/usr/sbin/sshd|/usr/bin/dash|svc') && fl('web', '/usr/sbin/nginx|/usr/sbin/nginx|svc')
      && fl('web', '/usr/bin/sleep|/usr/bin/dash|root') && fl('db', '/usr/lib/postgresql/15/bin/postgres|/usr/bin/dash|svc') && pods.every((p) => fl(p.host, '/usr/bin/dash|-|root'))
      && base.every((b) => pods.every((p) => b.hosts[p.host].up && !b.hosts[p.host].maintError)),
    { web: frozen.lists.web.procs, db: frozen.lists.db.procs.length, listsSha256: frozen.sha256, timing: base.at(-1).timing,
      baseTiming: base.map((b) => b.timing), baseErrors: base.map((b) => Object.entries(b.hosts).filter(([, o]) => o.error || o.maintError).map(([h, o]) => `${h}: ${o.error || ''} ${o.maintError || ''}`)) });
    step('sensor\'s own processes excluded', Object.values(H).every((o) => !o.procs.some((p) => /bash|\/stat$|conntrack/.test(p.exe))));

    // harness exclusion: a tagged bash is excluded, an untagged bash (like a red foothold by exec) is seen
    const hold = (c, env) => { const p = spawn('docker', ['exec', '-i', ...env, c, 'bash', '-c', 'read x'], { stdio: ['pipe', 'ignore', 'ignore'] }); held.push(p); return p; };
    const tagged = hold(P.ws3.service, ['-e', `R0_HARNESS=${S.token}`]), untagged = hold(P.ws2.service, []);
    await sleep(2500); const ex = await S.step();
    step('harness exclusion by token only', !has(ex.hosts.ws3, '/usr/bin/bash|-|svc') && has(ex.hosts.ws2, '/usr/bin/bash|-|svc'));
    tagged.stdin.end(); untagged.stdin.end();

    // ssh session ws1 -> web (across segments): new process keys on web, the connection on web, on ws1 and at the router
    const ssh = (from, ip, cmd) => spawn('docker', ['exec', from, 'ssh', '-i', '/tmp/k', '-p', '2222', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null', '-o', 'BatchMode=yes', `svc@${ip}`, cmd], { stdio: 'ignore' });
    held.push(ssh(P.ws1.service, P.web.ip, 'sleep 12'));
    await sleep(4000); const se = await S.step(), cs = cues(se, frozen);
    step('ssh session across segments: process and connection cues', cs.web.suspiciousProcess && has(se.hosts.web, '/usr/bin/dash|/usr/sbin/sshd|svc') && cs.web.conns.includes('ws1|web|2222|tcp') && cs.ws1.conns.includes('ws1|web|2222|tcp') && cs.ws1.suspiciousProcess,
      { web: cs.web, ws1: cs.ws1, inBaseline: frozen.lists.web.flows.includes('ws1|web|2222|tcp'), seenWeb: se.hosts.web.conns.map(ckey), seenWs1: se.hosts.ws1.conns.map(ckey) });

    // a connection across segments opened and closed at once: in the router's conntrack at the next step
    await sleep(9000); await S.step();
    dx(['exec', P.ws2.service, 'bash', '-c', `exec 3<>/dev/tcp/${P.db.ip}/5432; exec 3>&-`]);
    await sleep(1500); const sc = await S.step(), cc = cues(sc, frozen);
    step('short connection across segments (router conntrack)', cc.db.conns.includes('ws2|db|5432|tcp') && cc.ws2.conns.includes('ws2|db|5432|tcp'), { db: cc.db.conns, ws2: cc.ws2.conns });

    // inside one segment (no router): a 300 ms connection is caught by the 100 ms poll; shorter ones are measured only
    dx(['exec', P.ws1.service, 'bash', '-c', `exec 3<>/dev/tcp/${P.ws3.ip}/2222; sleep 0.3; exec 3>&-`]);
    await sleep(1000); const ss = cues(await S.step(), frozen);
    step('300 ms connection inside one segment (100 ms poll)', ss.ws1.conns.includes('ws1|ws3|2222|tcp') && ss.ws3.conns.includes('ws1|ws3|2222|tcp'), { ws1: ss.ws1.conns, ws3: ss.ws3.conns });
    let quick = 0; const tries = 10;
    for (let i = 0; i < tries; i++) { dx(['exec', P.ws2.service, 'bash', '-c', `exec 3<>/dev/tcp/${P.ws3.ip}/2222; exec 3>&-`]); await sleep(300); const q = cues(await S.step(), frozen); if (q.ws3.conns.includes('ws2|ws3|2222|tcp') || q.ws2.conns.includes('ws2|ws3|2222|tcp')) quick++; }
    step('immediate connect-and-close inside one segment (measured, not asserted)', true, { detected: quick, of: tries });

    // the uid-0 maintenance loop runs an overwritten group-writable script: a root process on that host. Inert content
    // (a timed tail), written as svc from the service container; the baseline script is put back after.
    const orig = dx(['exec', P.files.service, 'cat', '/pod/maint/tick.sh']).stdout;
    dx(['exec', '-i', P.files.service, 'sh', '-c', 'cat > /pod/maint/tick.sh'], { input: '#!/bin/sh\ntimeout 8 tail -f /dev/null\n' });
    await sleep(5000); const mu = await S.step(), mc = cues(mu, frozen);
    dx(['exec', '-i', P.files.service, 'sh', '-c', 'cat > /pod/maint/tick.sh'], { input: orig });
    step('uid-0 process from the maintenance script', has(mu.hosts.files, '/usr/bin/tail|/usr/bin/timeout|root') && mc.files.suspiciousProcess, { files: mc.files.procs });
    step('baseline maintenance script restored', dx(['exec', P.files.service, 'cat', '/pod/maint/tick.sh']).stdout === orig);

    // a host that is down shows no cues; it is observed again once back
    dx(['stop', '-t', '1', P.web.service]); const dn = await S.step();
    step('host down: no cues', dn.hosts.web.up === false && !cues(dn, frozen).web.suspiciousProcess && !cues(dn, frozen).web.suspiciousConnection);
    dx(['start', P.web.service]); await sleep(4000); await S.step(); const bk = await S.step();
    step('host back: observed again', bk.hosts.web.up === true && has(bk.hosts.web, '/usr/sbin/nginx|/usr/sbin/nginx|svc'), { error: bk.hosts.web.error });

    // step time over 30 steps at the 2 s cadence (the overrun limit is 2.2 s)
    const ms = [], slow = []; for (let i = 0; i < 30; i++) { const t = Date.now(); const o = await S.step(); ms.push(o.ms); if (o.ms > 1000) slow.push({ i, ms: o.ms, timing: o.timing, errors: Object.fromEntries(Object.entries(o.hosts).filter(([, x]) => x.error || x.maintError).map(([h, x]) => [h, x.error || `maintenance: ${x.maintError}`])) }); await sleep(Math.max(0, 2000 - (Date.now() - t))); }
    ms.sort((a, b) => a - b);
    step('sensor step time (30 steps)', ms[Math.floor(ms.length * 0.95)] < 1000, { p50: ms[15], p95: ms[Math.floor(ms.length * 0.95)], max: ms.at(-1), slow, streams: S.stats() });
  } catch (e) { out.error = String(e.message || e); } finally {
    held.forEach((p) => { try { p.kill('SIGKILL'); } catch {} });
    S?.close();
    try { out.steps.push({ name: 'teardown', ok: true, ...down(id) }); } catch (e) { out.steps.push({ name: 'teardown', ok: false, error: String(e.message || e) }); }
    try { out.steps.push({ name: 'no leftovers', ok: preflight(id) === true }); } catch (e) { out.steps.push({ name: 'no leftovers', ok: false, error: String(e.message || e) }); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
  out.ok = !out.error && out.steps.every((s) => s.ok);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2];
  if (!id) { console.error('usage: node sensors-selftest.mjs <range id>'); process.exit(2); }
  selftest(id).then((r) => { console.log(JSON.stringify(r, null, 1)); process.exit(r.ok && !r.error ? 0 : 1); }, (e) => { console.error(String(e.message || e)); process.exit(1); });
}
