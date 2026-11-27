// CY2 driver (tasks/CY2-PREREG.md), run by the research bench as a 'script' study: node drive.mjs <spec>, from the
// repository root. Order: pilot gate (paid) -> free code arms -> paid LLM waves. Every paid wave is reserved in the
// shared ledger (UNFOLD_LEDGER) before it starts, stays under the bench's per-batch cap and the study's own cap, and is
// reconciled with the measured spend after. The runner container has no route out except the egress proxy, which lets
// through api.anthropic.com:443 only; the code arms and the replays run with no network at all.
// Resumable: an episode with a record is never run again; a wave that crashed keeps its reservation counted.
// Exit codes: 0 done, 1 retry (some episodes failed), 3 pilot gate failed (final), 4 study cap reached (final).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: node observatory/cyber/cy2/drive.mjs <spec.json>'); process.exit(2); }
const WT = process.cwd(), spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const OUT = path.join(WT, spec.out), EPIS = path.join(OUT, 'episodes'), PILOT = path.join(OUT, spec.pilot.dir || 'pilot'), PILOT_WAVE = `${spec.study.toLowerCase()}-${spec.pilot.name || 'pilot'}`, TMP = path.join(WT, '.bench', spec.study.toLowerCase()); // job lists and cost files, never committed
const KEY = process.env.ANTHROPIC_API_KEY_FILE || '<secrets directory>anthropic-api-key';
const ID = spec.study.toLowerCase(), PREFIX = `${ID}-`, IMAGE = spec.image, RUNNER = 'observatory/cyber/cy2/cy2.py';
const NET = `bench-${ID}-egress-net`, PROXY = `bench-${ID}-egress`;
const { reserveBatch, markSubmitted, reconcileBatch, readBudget } = await import(path.join(WT, 'observatory/lab007-economy-explore/budget.mjs'));

fs.mkdirSync(EPIS, { recursive: true }); fs.mkdirSync(PILOT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const runLog = path.join(OUT, 'run.log');
const log = (o) => { const l = JSON.stringify({ at: new Date().toISOString(), ...o }); console.log(l); fs.appendFileSync(runLog, l + '\n'); };
const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1) + '\n'); fs.renameSync(f + '.tmp', f); };
const sh = (cmd, args, ok = false) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); if (r.status !== 0 && !ok) throw Error(`${cmd} ${args.slice(0, 3).join(' ')}: ${(r.stderr || '').slice(-300)}`); return (r.stdout || '').trim(); };
const run = (args) => new Promise((resolve) => { const p = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const fwd = (s) => s.on('data', (d) => { for (const l of String(d).split('\n').filter(Boolean)) { console.log(l); fs.appendFileSync(runLog, l + '\n'); } });
  fwd(p.stdout); fwd(p.stderr); p.on('exit', (c) => resolve(c)); });
const name = (j) => `${j.arm}-${j.red}-s${j.seed}`;
const usd = (x) => Math.round(x * 1e6) / 1e6;
const uid = `${process.getuid()}:${process.getgid()}`;
const base = (net, extra = []) => ['run', '--rm', `--network=${net}`, '--user', uid, '-v', `${WT}:/work`, '-w', '/work', '-e', 'MPLCONFIGDIR=/tmp', '--memory=6g', ...extra, IMAGE];

// ---------- jobs ----------
const seeds = []; for (let s = spec.seeds[0]; s <= spec.seeds[1]; s++) seeds.push(s);
const all = []; for (const seed of seeds) for (const red of spec.reds) for (const arm of spec.arms) all.push({ arm, red, seed });
const free = all.filter((j) => !spec.paidArms.includes(j.arm)), paid = all.filter((j) => spec.paidArms.includes(j.arm));
const pilot = spec.pilot.arms.flatMap((arm) => spec.pilot.seeds.map((seed) => ({ arm, red: spec.pilot.red, seed })));
const missing = (jobs, dir) => jobs.filter((j) => !fs.existsSync(path.join(dir, name(j) + '.json')));

// ---------- egress: internal network + allowlist proxy ----------
function egressUp() {
  if (!sh('docker', ['network', 'ls', '-q', '-f', `name=^${NET}$`])) sh('docker', ['network', 'create', '--internal', NET]);
  if (sh('docker', ['ps', '-q', '-f', `name=^${PROXY}$`])) return;
  sh('docker', ['rm', '-f', PROXY], true);
  sh('docker', ['run', '-d', '--rm', '--name', PROXY, '--network', 'bridge', '--user', '65534:65534', '-v', `${path.join(WT, 'observatory/cyber/cy2/proxy.py')}:/proxy.py:ro`, IMAGE, 'python', '/proxy.py', '3128']);
  sh('docker', ['network', 'connect', NET, PROXY]);
  log({ egress: 'up', network: NET, proxy: PROXY, allow: 'api.anthropic.com:443' });
}
function egressDown() { sh('docker', ['rm', '-f', PROXY], true); sh('docker', ['network', 'rm', NET], true); }
// the runner may reach the API through the proxy and nothing else: checked before any paid wave
async function egressCheck() {
  const probe = `import urllib.request,sys
def get(u, proxy):
  h = urllib.request.ProxyHandler({'https': 'http://${PROXY}:3128'} if proxy else {})
  try: urllib.request.build_opener(h).open(u, timeout=10); return 'open'
  except urllib.error.HTTPError as e: return 'http%d' % e.code
  except Exception as e: return 'blocked'
r = {'anthropic_via_proxy': get('https://api.anthropic.com/v1/models', True), 'other_via_proxy': get('https://example.com/', True), 'direct': get('https://api.anthropic.com/v1/models', False)}
print(r); sys.exit(0 if r['anthropic_via_proxy'].startswith('http4') and r['other_via_proxy'] == 'blocked' and r['direct'] == 'blocked' else 1)`;
  const r = spawnSync('docker', ['run', '--rm', `--network=${NET}`, '--dns', '127.0.0.1', IMAGE, 'python', '-c', probe], { encoding: 'utf8' });
  log({ egressCheck: (r.stdout || '').trim(), ok: r.status === 0 });
  if (r.status !== 0) throw Error('egress check failed: ' + (r.stdout || r.stderr).trim());
}

// the exact request shape, thinking setting included, on the free token-counting endpoint, before any paid call
function requestCheck() {
  const r = spawnSync('docker', base(NET, ['--dns', '127.0.0.1', '-e', `HTTPS_PROXY=http://${PROXY}:3128`, '-e', 'ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic-api-key',
    '-v', `${KEY}:/run/secrets/anthropic-api-key:ro`]).concat(['python', RUNNER, 'check']), { encoding: 'utf8' });
  const out = (r.stdout || '').trim().split('\n').at(-1); log({ requestCheck: out, ok: r.status === 0 });
  if (r.status !== 0) throw Error('the API rejected the request shape (free check): ' + (out || (r.stderr || '').slice(-200)));
}

// ---------- ledger ----------
const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function studyCommitted() {
  const b = await readBudget();
  const mine = Object.entries(b.commitments).filter(([k]) => k.startsWith(PREFIX));
  return { total: b.committedUsd, cap: b.capUsd, study: mine.reduce((n, [, e]) => n + Number(e.committedUsd || 0), 0), entries: Object.fromEntries(mine) };
}
// a wave that crashed: settle it from its cost file when the runner left one, else keep the reservation counted
async function settleCrashed() {
  const { entries } = await studyCommitted();
  for (const [k, e] of Object.entries(entries)) {
    if (e.status !== 'submitted') continue;
    const c = readJson(path.join(TMP, `${k}.cost.json`));
    if (c?.final) { await reconcileBatch({ name: k, batchId: e.providerBatchId, resultCount: e.requestCount, actualUsd: usd(c.spentUsd), allResultsPriced: true }); log({ wave: k, reconciled: usd(c.spentUsd), after: 'crash' }); }
    else log({ wave: k, kept: e.reserveUsd, note: 'crashed without a final cost file; the reservation stays counted' });
  }
}
// One paid wave: reserve, run in the egress container, reconcile with the measured spend.
async function paidWave(wave, jobs, perEpisode, dir) {
  const reserve = usd(jobs.length * perEpisode);
  if (reserve > spec.batchCapUsd + 1e-9) throw Error(`wave ${wave} would reserve ${reserve} > per-batch cap ${spec.batchCapUsd}`);
  const { study } = await studyCommitted();
  if (study + reserve > spec.capUsd + 1e-9) return { capStop: true, study, reserve };
  const manifest = hash(jobs);
  await reserveBatch({ name: wave, manifestHash: manifest, reserveUsd: reserve, requestCount: jobs.length });
  await markSubmitted({ name: wave, batchId: `local:${wave}` });
  log({ wave, episodes: jobs.length, reserveUsd: reserve, studyCommittedUsd: usd(study + reserve), capUsd: spec.capUsd });
  const jf = path.join(TMP, `${wave}.json`), cf = path.join(TMP, `${wave}.cost.json`);
  writeJson(jf, jobs); fs.rmSync(cf, { force: true });
  const rel = (f) => path.relative(WT, f);
  const code = await run(base(NET, ['--name', `bench-${wave}`, '--dns', '127.0.0.1', '-e', `HTTPS_PROXY=http://${PROXY}:3128`, '-e', 'ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic-api-key',
    '-v', `${KEY}:/run/secrets/anthropic-api-key:ro`]).concat(['python', RUNNER, 'jobs', rel(jf), rel(dir), '--workers', String(spec.workers), '--cap-usd', String(reserve), '--cost-file', rel(cf)]));
  const c = readJson(cf);
  if (!c?.final) { log({ wave, exit: code, note: 'no final cost file: reservation stays counted' }); return { failed: jobs.length }; }
  await reconcileBatch({ name: wave, batchId: `local:${wave}`, resultCount: jobs.length, actualUsd: usd(c.spentUsd), allResultsPriced: true });
  const waves = readJson(path.join(OUT, 'waves.json'), []); waves.push({ wave, episodes: jobs.length, reserveUsd: reserve, spentUsd: usd(c.spentUsd), failed: c.failed, at: new Date().toISOString() });
  writeJson(path.join(OUT, 'waves.json'), waves);
  log({ wave, done: true, spentUsd: usd(c.spentUsd), failed: c.failed, exit: code });
  return { failed: c.failed, spent: c.spentUsd };
}
const nextWave = async (label) => { const { entries } = await studyCommitted(); let i = 1; while (entries[`${PREFIX}${label}-${String(i).padStart(2, '0')}`]) i++; return `${PREFIX}${label}-${String(i).padStart(2, '0')}`; };

// ---------- pilot gate ----------
async function pilotGate() {
  const gf = path.join(PILOT, 'gate.json'), done = readJson(gf);
  if (done) return done;
  const left = missing(pilot, PILOT);
  if (left.length) {
    // one reservation for the pilot; a pilot that failed partway is a failed gate, not a retry
    const { entries } = await studyCommitted();
    if (entries[PILOT_WAVE]) log({ pilot: 'already ran once; missing episodes count as not completed' });
    else {
      const r = await paidWave(PILOT_WAVE, left, spec.pilot.maxUsdPerEpisode, PILOT);
      if (r.capStop) { const g = { pass: false, reason: 'study cap reached before the pilot', pilot: PILOT_WAVE }; writeJson(gf, g); return g; }
    }
  }
  const recs = pilot.map((j) => readJson(path.join(PILOT, name(j) + '.json'))), complete = recs.every(Boolean);
  const replays = [];
  for (const j of pilot) {
    if (!fs.existsSync(path.join(PILOT, name(j) + '.json'))) { replays.push({ job: name(j), replayed: false, error: 'no record' }); continue; }
    const r = spawnSync('docker', base('none').concat(['python', RUNNER, 'replay', path.relative(WT, PILOT), j.arm, j.red, String(j.seed)]), { encoding: 'utf8' });
    let o = null; try { o = JSON.parse((r.stdout || '').trim().split('\n').at(-1)); } catch {}
    replays.push(o || { job: name(j), replayed: false, error: (r.stderr || '').slice(-200) });
  }
  const got = recs.filter(Boolean), calls = got.reduce((n, r) => n + r.calls, 0), invalid = got.reduce((n, r) => n + r.invalid, 0);
  const wave = (readJson(path.join(OUT, 'waves.json'), []).find((w) => w.wave === PILOT_WAVE)) || {};
  const perEp = got.map((r) => r.usd), maxEp = Math.max(0, ...perEp), meanEp = got.length ? (wave.spentUsd ?? perEp.reduce((a, b) => a + b, 0)) / got.length : null;
  const validShare = calls ? (calls - invalid) / calls : 0;
  // amendment (tasks/CY2-PREREG.md, 2026-11-20): the study starts only if 1.25 x the pilot's mean cost x the paid
  // episodes fits in the study cap minus what the pilot spent
  // every pilot run so far counts against the study cap (pilot 1 failed on the instrument and stays in the ledger)
  const pilotSpent = (await studyCommitted()).study, projected = meanEp == null ? null : 1.25 * meanEp * paid.length;
  const checks = { costPerEpisode: maxEp <= spec.pilot.maxUsdPerEpisode && (meanEp ?? 1) <= spec.pilot.maxUsdPerEpisode, validReplies: validShare >= spec.pilot.minValid,
    complete, replay: replays.length === pilot.length && replays.every((r) => r.replayed), budgetFits: projected != null && projected <= spec.capUsd - pilotSpent + 1e-9 };
  const blocks = {}, stops = {};
  for (const j of pilot) { try { for (const l of fs.readFileSync(path.join(PILOT, 'calls', name(j) + '.jsonl'), 'utf8').split('\n').filter(Boolean)) { const c = JSON.parse(l);
    for (const t of c.blocks || []) blocks[t] = (blocks[t] || 0) + 1; stops[c.stop] = (stops[c.stop] || 0) + 1; } } catch {} }
  const g = { pass: Object.values(checks).every(Boolean), pilot: PILOT_WAVE, checks, blockTypes: blocks, stopReasons: stops, studySpentBeforeStudyUsd: usd(pilotSpent), episodes: pilot.length, completed: got.length, maxUsdPerEpisode: usd(maxEp), meanUsdPerEpisode: meanEp == null ? null : usd(meanEp),
    spentUsd: wave.spentUsd ?? null, projectedStudyUsd: projected == null ? null : usd(projected), budgetLeftUsd: usd(spec.capUsd - pilotSpent), calls, invalid, validShare: +validShare.toFixed(4), limits: { maxUsdPerEpisode: spec.pilot.maxUsdPerEpisode, minValid: spec.pilot.minValid },
    perEpisode: got.map((r) => ({ job: name(r), usd: r.usd, calls: r.calls, invalid: r.invalid, reward: r.reward, cueSteps: r.cue_steps, tokens: r.tokens })), replays, at: new Date().toISOString(),
    note: 'Pilot episodes are never used as data (tasks/CY2-PREREG.md).' };
  writeJson(gf, g); log({ pilotGate: g.pass, checks, maxUsdPerEpisode: g.maxUsdPerEpisode, validShare: g.validShare });
  return g;
}

// ---------- main ----------
if (!fs.existsSync(path.join(WT, spec.prereg))) { console.error('no preregistration ' + spec.prereg); process.exit(2); }
if (!fs.existsSync(KEY)) { console.error('API key file missing: ' + KEY); process.exit(1); }
if (!sh('docker', ['images', '-q', IMAGE])) { console.error('image missing: ' + IMAGE); process.exit(1); }
log({ start: spec.study, episodes: all.length, paid: paid.length, free: free.length, leftPaid: missing(paid, EPIS).length, leftFree: missing(free, EPIS).length });
let exit = 0;
try {
  egressUp(); await egressCheck(); requestCheck(); await settleCrashed();
  const g = await pilotGate();
  if (!g.pass) { log({ stop: 'pilot gate failed: the study does not run', gate: path.relative(WT, path.join(PILOT, 'gate.json')) }); exit = 3; }
  else {
    const f = missing(free, EPIS);
    if (f.length) {
      const jf = path.join(TMP, 'free.json'); writeJson(jf, f);
      const code = await run(base('none').concat(['python', RUNNER, 'jobs', path.relative(WT, jf), path.relative(WT, EPIS), '--workers', String(spec.workers)]));
      log({ free: f.length, exit: code, left: missing(free, EPIS).length });
    }
    // per-episode reservation: the plan's figure, or the pilot's worst episode with a quarter of margin if higher
    const perEpisode = Math.max(spec.planUsdPerEpisode, Math.ceil(g.maxUsdPerEpisode * 1.25 * 100) / 100);
    // amendment: a wave carries whole seeds (both paid arms of a seed and red together), so a cap stop never leaves a
    // half pair; units are taken in seed order
    const size = Math.min(spec.waveMax, Math.floor(spec.batchCapUsd / perEpisode));
    const units = () => { const m = new Map(); for (const j of missing(paid, EPIS)) { const k = `${j.seed}|${j.red}`; if (!m.has(k)) m.set(k, []); m.get(k).push(j); } return [...m.values()]; };
    const take = (us, budget) => { const out = []; for (const u of us) { if (out.length + u.length > budget) break; out.push(...u); } return out; };
    for (let stalls = 0; ;) {
      const us = units(); if (!us.length) break;
      const wave = await nextWave('wave'), jobs = take(us, size);
      const r = await paidWave(wave, jobs, perEpisode, EPIS);
      if (r.capStop) {
        const fit = take(us, Math.floor((spec.capUsd - r.study) / perEpisode + 1e-9));
        if (fit.length >= 1 && fit.length < jobs.length) { const r2 = await paidWave(wave, fit, perEpisode, EPIS); if (!r2.capStop) continue; }
        log({ stop: `study cap US$ ${spec.capUsd} reached`, committedUsd: usd(r.study), left: missing(paid, EPIS).length }); exit = 4; break;
      }
      if (r.failed >= jobs.length) { if (++stalls >= 2) { exit = 1; break; } } else stalls = 0;
    }
    if (!exit && (missing(paid, EPIS).length || missing(free, EPIS).length)) exit = 1;
  }
} catch (e) { log({ error: String(e.message || e).slice(0, 500) }); exit = 1; }
finally { egressDown(); const { study } = await studyCommitted().catch(() => ({})); log({ end: exit, studyCommittedUsd: study == null ? null : usd(study), leftPaid: missing(paid, EPIS).length, leftFree: missing(free, EPIS).length }); }
process.exit(exit);
