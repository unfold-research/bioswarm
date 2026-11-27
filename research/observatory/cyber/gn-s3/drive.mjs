// GN-S3 driver (tasks/GN-S3-PREREG.md), run by the research bench as a 'script' study: node drive.mjs <spec>, from the
// repository root. Code-only arms on CAGE Challenge 4; no model calls, no ledger, no egress (every container is
// --network none). Stage 0 is a gate (prereg "Stage 0"); then every arm x red x seed episode runs in the cage4 image.
// Exit: 0 done, 1 retry (some episodes failed), 3 stage-0 gate failed (final; the owner/Cyber must look).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: node observatory/cyber/gn-s3/drive.mjs <spec.json>'); process.exit(2); }
const WT = process.cwd(), spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const OUT = path.join(WT, spec.out), EPIS = path.join(OUT, 'episodes'), TMP = path.join(WT, '.bench', spec.study.toLowerCase());
const IMAGE = spec.image, RUNNER = 'observatory/cyber/gn-s3/gn_s3.py';
fs.mkdirSync(EPIS, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const runLog = path.join(OUT, 'run.log');
const log = (o) => { const l = JSON.stringify({ at: new Date().toISOString(), ...o }); console.log(l); fs.appendFileSync(runLog, l + '\n'); };
const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1) + '\n'); fs.renameSync(f + '.tmp', f); };
const uid = `${process.getuid()}:${process.getgid()}`;
const base = (extra = []) => ['run', '--rm', '--network', 'none', '--user', uid, '-e', 'MPLCONFIGDIR=/tmp', '-v', `${WT}:/work`, '-w', '/work', '--memory=6g', ...extra, IMAGE];
const dockerOut = (args) => { const r = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 << 20 }); if (r.status !== 0) throw Error(`docker: ${(r.stderr || '').slice(-200)}`); return r.stdout.trim(); };
const run = (args) => new Promise((resolve) => { const p = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const fwd = (s) => s.on('data', (d) => { for (const l of String(d).split('\n').filter(Boolean)) { console.log(l); fs.appendFileSync(runLog, l + '\n'); } });
  fwd(p.stdout); fwd(p.stderr); p.on('exit', (c) => resolve(c)); });
const py = (argv) => dockerOut(base().concat(['python', RUNNER, ...argv]));
const name = (j) => `${j.arm}-${j.red}-s${j.seed}`;

// ---------- stage 0 (gate) ----------
function stage0() {
  const g = { at: new Date().toISOString(), checks: {} };
  // 1. code-cd10 reproduces CY2's action hash on seed 74001 under both reds
  const cy2Hash = {};
  for (const red of spec.reds) {
    const cy2 = readJson(path.join(WT, `results/cy2/episodes/code-cd10-${red}-s74001.json`));
    if (!cy2?.actions_sha256) throw Object.assign(Error(`CY2 reference code-cd10-${red}-s74001 not found on main`), { final: true });
    const got = JSON.parse(py(['episode', 'code-cd10', red, '74001', path.relative(WT, TMP)]));
    cy2Hash[red] = { cy2: cy2.actions_sha256, gn: got.actions_sha256, match: cy2.actions_sha256 === got.actions_sha256 };
  }
  g.checks.cd10ReproducesCY2 = Object.values(cy2Hash).every((x) => x.match); g.cd10Hash = cy2Hash;
  // 2. every agent acts only on hosts in its own zone
  const zones = JSON.parse(py(['zones', '77101']));
  const crossZone = [];
  for (const [agent, z] of Object.entries(zones)) for (const h of z.hosts) { const sub = h.replace(/_server_host_\d+$|_user_host_\d+$|_router$/, ''); if (!z.subnets.includes(sub)) crossZone.push({ agent, host: h }); }
  g.checks.ownZoneOnly = crossZone.length === 0; g.zones = zones; g.crossZone = crossZone;
  // 3. does Analyse ever change a host's view? If never, DEF-07 has no channel in CC4
  const sent = JSON.parse(py(['episode', 'code-sentinel', spec.reds[0], '77101', path.relative(WT, TMP)]));
  g.sentinelSteps = sent.sentinel_steps; g.analyseChangedView = sent.analyse_changed_view;
  g.def07Channel = sent.analyse_changed_view > 0;
  // 4. replay: code-cd10 on 74001 gives the same hash twice
  const replay = JSON.parse(py(['episode', 'code-cd10', spec.reds[0], '74001', path.relative(WT, TMP)]));
  g.checks.replayStable = replay.actions_sha256 === cy2Hash[spec.reds[0]].gn;
  g.pass = g.checks.cd10ReproducesCY2 && g.checks.ownZoneOnly && g.checks.replayStable;
  writeJson(path.join(OUT, 'stage0.json'), g);
  log({ stage0: g.pass, checks: g.checks, def07Channel: g.def07Channel, analyseChangedView: g.analyseChangedView });
  return g;
}

// ---------- episodes ----------
const seeds = []; for (let s = spec.seeds[0]; s <= spec.seeds[1]; s++) seeds.push(s);
const missing = (arms) => { const out = []; for (const seed of seeds) for (const red of spec.reds) for (const arm of arms) if (!fs.existsSync(path.join(EPIS, name({ arm, red, seed }) + '.json'))) out.push({ arm, red, seed }); return out; };

let exit = 0;
if (!fs.existsSync(path.join(WT, spec.prereg))) { console.error('no preregistration ' + spec.prereg); process.exit(2); }
if (!dockerOut(['images', '-q', IMAGE])) { console.error('image missing: ' + IMAGE); process.exit(1); }
try {
  const g = readJson(path.join(OUT, 'stage0.json'))?.pass ? readJson(path.join(OUT, 'stage0.json')) : stage0();
  if (!g.pass) { log({ stop: 'stage 0 gate failed', stage0: path.relative(WT, path.join(OUT, 'stage0.json')) }); process.exit(3); }
  // DEF-07 arms run only if Analyse has a channel; otherwise they are recorded "no channel" and left out
  const arms = g.def07Channel ? spec.arms : spec.arms.filter((a) => a !== 'code-sentinel' && a !== 'code-cd10-qa');
  if (!g.def07Channel) log({ def07: 'no channel in CC4 (Analyse never changed the view); code-sentinel and code-cd10-qa are not run' });
  const left = missing(arms);
  if (left.length) {
    const jf = path.join(TMP, 'jobs.json'); writeJson(jf, left);
    const code = await run(base().concat(['python', RUNNER, 'jobs', path.relative(WT, jf), path.relative(WT, EPIS), '--workers', String(spec.workers || 3)]));
    log({ ran: left.length, exit: code, left: missing(arms).length });
  }
  if (missing(arms).length) exit = 1;
  log({ end: exit, arms, episodes: seeds.length * spec.reds.length * arms.length, present: seeds.length * spec.reds.length * arms.length - missing(arms).length });
} catch (e) { if (e.final) { log({ stop: String(e.message).slice(0, 200) }); process.exit(3); } log({ error: String(e.message || e).slice(0, 300) }); exit = 1; }
process.exit(exit);
