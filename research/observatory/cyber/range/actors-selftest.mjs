// R0 actors smoke selftest (M2; NOT an episode and NOT study data; range/README.md "Containment tests ... are not
// episodes"). On a throwaway range (a prefix of its own, default r0act) it shows, under no blue interference (arm
// sleep):
//   - green runs: scripted HTTP and SFTP actions from the workstations succeed and are logged by cause;
//   - red reaches each stage: discovery -> lateral -> escalation -> persistence -> impact, with stage 3 overwriting the
//     group-writable uid-0 maintenance script so the target's uid-0 loop runs red's content as root (stage 4);
//   - the mediator undoes stage 3/4: Remove restores the baseline script and kills red's root process; a full Restore
//     recreates the host from the clean snapshot. Both leave the maintenance script back at the frozen baseline.
// Results are printed, not kept as data. Usage: node actors-selftest.mjs [id]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { up, down } from './range.mjs';
import { preflight, SUBNET, SEGMENTS } from './net.mjs';
import { Green } from './green/green.mjs';
import { Red } from './red/red.mjs';
import { Mediator, BASELINE_SHA, sha } from './mediator.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dx = (a, o = {}) => spawnSync('docker', a, { encoding: 'utf8', ...o });
const reach = (svc, ip, port) => dx(['exec', svc, 'timeout', '3', 'bash', '-c', `echo > /dev/tcp/${ip}/${port}`]).status === 0;
const tickSha = (med, host) => sha(med.tick(host));

export async function selftest(id = 'r0act') {
  const out = { range: id, at: new Date().toISOString(), steps: [] };
  const step = (name, ok, extra = {}) => { out.steps.push({ name, ok, ...extra }); if (!ok) throw Error(`actors selftest step failed: ${name} ${JSON.stringify(extra).slice(0, 500)}`); };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-key-'));
  // rule 4 (no episode above a 1-minute load of 2): this is a selftest, not an episode. If the load is above 2 it runs
  // anyway as a recorded test exception, never as data.
  const load0 = os.loadavg()[0];
  out.load1AtStart = load0;
  out.loadException = load0 > 2 ? `test exception: smoke selftest (not an episode, not data) started at 1-minute load ${load0.toFixed(2)} > 2` : null;
  try {
    spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', path.join(dir, 'k')]);
    const keyPath = path.join(dir, 'k');
    step('preflight', preflight(id) === true);
    const { router, pods } = up(id, fs.readFileSync(keyPath + '.pub', 'utf8').trim());
    const P = Object.fromEntries(pods.map((p) => [p.host, p]));
    const t0 = Date.now(); while (!reach(P.ws1.service, P.web.ip, 2222) && Date.now() - t0 < 60000) await sleep(2000);
    step('range up', reach(P.ws1.service, P.web.ip, 8080) && reach(P.ws2.service, P.files.ip, 2222), { hosts: pods.length });

    const tok = 'r0smoke';
    const green = new Green({ pods, keyPath, token: tok, seed: 76001, steps: 40 });
    const red = new Red({ pods, keyPath, seed: 76001 });
    const med = new Mediator({ range: id, pods, router, token: tok });
    green.placeKey(fs); red.placeKey(fs);

    // green runs: several scheduled steps; assert some succeed and causes are recorded
    for (let i = 0; i < 12; i++) green.step(i, { web: false, files: false, db: false });
    step('green runs (http + sftp succeed, logged by cause)', green.tally.ok > 0, { ok: green.tally.ok, fail: green.tally.fail, byKind: green.tally.byKind, byCause: green.tally.byCause });

    // red reaches each stage under no blue; give the maintenance loop (3 s) time to run red's content after escalation
    const target = red.pl.target; const seen = new Set();
    for (let i = 0; i < 60 && red.furthest !== 'impact'; i++) { red.step(i, { footholdOk: true }); seen.add(red.stage); await sleep(1500); }
    step('red reached every stage up to impact', red.furthest === 'impact' && ['discovery', 'lateral', 'escalation', 'persistence', 'impact'].every((s) => seen.has(s)),
      { furthest: red.furthest, seen: [...seen], target, impact: red.pl.impact, firstImpactStep: red.firstImpactStep });

    // stage 3/4 state: the maintenance script differs from the frozen baseline and the uid-0 loop ran red's content
    await sleep(4000);
    const changed = tickSha(med, target) !== BASELINE_SHA;
    const redMarker = dx(['exec', P[target].service, 'sh', '-c', 'cat /pod/maint/.red 2>/dev/null']).stdout.trim();
    step('stage 3/4: script overwritten and uid-0 loop ran red content as root', changed && /^r0-red root 0/.test(redMarker), { changed, redMarker });

    // Remove undoes stage 3/4: baseline script restored, red marker gone
    const rm = med.remove(target);
    await sleep(4000);
    step('mediator Remove undoes stage 3/4 (script restored, root process killed)',
      tickSha(med, target) === BASELINE_SHA && dx(['exec', P[target].service, 'sh', '-c', 'cat /pod/maint/.red 2>/dev/null']).stdout.trim() === '',
      { removeMs: rm.ms, scriptWasChanged: rm.scriptWasChanged });

    // re-escalate, then a full Restore undoes stage 3/4 and the host comes back
    red.stage = 'lateral'; red.held.add(target); red.waited = 99; red.step(100, { footholdOk: true }); // force escalation again
    await sleep(4000);
    const changed2 = tickSha(med, target) !== BASELINE_SHA;
    const rs = med.restore(target);
    const upAgain = reach(med.P[target].service, '127.0.0.1', 2222);
    step('mediator Restore recreates the host and undoes stage 3/4', changed2 && upAgain && sha(med.tick(target)) === BASELINE_SHA && med.changed(target) === false,
      { reEscalated: changed2, restoreMs: rs.ms, upAgain });

    // optional: the full episode runner through the sensor interface, only if sensors.mjs is present on this branch
    if (fs.existsSync(new URL('./sensors.mjs', import.meta.url))) {
      const { runEpisode } = await import('./episode.mjs');
      const { freeze, Sensors } = await import('./sensors.mjs');
      const routerIps = SEGMENTS.map((s) => SUBNET[s].replace(/\.0\/24$/, '.254'));
      const S = new Sensors({ hosts: pods, router: { name: router, ips: routerIps }, token: tok });
      const base = []; for (let i = 0; i < 4; i++) { base.push(await S.step()); await sleep(1500); } S.close();
      const frozen = freeze(base);
      const le = os.loadavg()[0] > 2 ? `test exception: smoke selftest leg at 1-minute load ${os.loadavg()[0].toFixed(2)} > 2` : null;
      const { rec, stepLog } = await runEpisode({ range: id, seed: 76002, arm: 'sleep', pods, router, routerIps, frozen, cooldownSteps: 0, steps: 8, stepMs: 2000, keyPath, token: 'r0smoke2', loadException: le });
      step('episode runner + sensor wiring (sleep arm, 8 steps)', rec.steps === 8 && rec.red && rec.green && stepLog.every((s) => typeof s.load1 === 'number' && typeof s.sensorLate === 'boolean'),
        { redFurthest: rec.red.furthest, green: rec.green, overruns: rec.overruns, sensorLate: rec.sensorLate, valid: rec.valid, load1: rec.load1, loadException: rec.loadException,
          hostStates: stepLog.map((s) => Object.values(s.hosts).filter((x) => x !== 'up').length), streamTimeouts: Object.values(rec.streamStats || {}).reduce((n, x) => n + (x.timeouts || 0), 0) });
      // rule 4 holds for real episodes: without an exception, the runner refuses to start above the limit
      if (os.loadavg()[0] > 2) step('runner refuses to start above load 2 without an exception', await runEpisode({ range: id, seed: 1, arm: 'sleep', pods, router, routerIps, frozen, steps: 1, stepMs: 2000, keyPath, token: 'x' }).then(() => false, (e) => !!e.load));
    } else {
      out.steps.push({ name: 'episode runner + sensor wiring', ok: true, skipped: 'sensors.mjs not on this branch (lands with the sensors work in the single R0 PR)' });
    }
  } catch (e) { out.error = String(e.message || e); } finally {
    try { out.steps.push({ name: 'teardown', ok: true, ...down(id) }); } catch (e) { out.steps.push({ name: 'teardown', ok: false, error: String(e.message || e) }); }
    try { out.steps.push({ name: 'no leftovers', ok: preflight(id) === true }); } catch (e) { out.steps.push({ name: 'no leftovers', ok: false, error: String(e.message || e) }); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
  out.ok = !out.error && out.steps.every((s) => s.ok);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selftest(process.argv[2] || 'r0act').then((r) => { console.log(JSON.stringify(r, null, 1)); process.exit(r.ok ? 0 : 1); }, (e) => { console.error(String(e.message || e)); process.exit(1); });
}
