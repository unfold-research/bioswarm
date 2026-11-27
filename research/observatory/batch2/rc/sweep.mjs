// Sweep: runs every size of every study spec given, all at the same time (method rule 9), then for each size the
// registered analysis (analyze-rc), the strict hold-out, and the generic verdicts (verdict.mjs). Each run keeps its own
// cap; the shared ledger is locked across processes. Specs: observatory/batch2/rc/sweeps/<ID>.json.
// Pilot (LI42, spec.pilot {seed, cap, rounds, stopIfNoArmSolves}): before any study wave, one case on the pilot seed with
// both arms and its own start wave, in results/<id>-pilot under its own cap and ledger entries (<id>-pilot-wave-*), then
// the registered stop rules (provider-openai.mjs pilotGate: projected cost, refused parameter or transport, floor). A
// stop writes results/<id>-pilot/pilot-gate.json, says why on stderr and exits 3 (final: no study, no retry). Otherwise
// the transport the pilot used (batch, or flex if batch failed there) is written to results/<id>-k<k>/transport-plan.json
// before the study's first wave; the runner refuses to start without it and never switches.
// Pilot cost accounting (pilot-accounting.mjs, decision B): rule (a) projects from the applied waves only; the cap total
// counts everything; the margin (the projection with the incidents above the study cap, the gate's not) is settled by
// spec.pilot.marginDecision when present (proceed if (B) is at most its threshold, else exit 3), else exit 3 before the
// study starts ("margin: ..."); see pilot-accounting.mjs marginOutcome.
// Exit codes: 3 pilot stop (or the margin stop), 4 a study run hit its cap (incomplete: no verdicts), 5 the model refused a parameter or the
// transport failed or would switch mid-study, or a batch ended cancelled/expired with no result (halted for the Research
// Leader, no pilot gate written); any other failure exits 1 and a rerun resumes.
// Usage: node observatory/batch2/rc/sweep.mjs sweeps/LI16.json [sweeps/LI17.json ...]   (resumable: a finished run is skipped)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, '../../..');
const node = (args, out) => new Promise((resolve) => { const p = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', out ? fs.openSync(out, 'w') : 'inherit', 'inherit'] }); p.on('exit', resolve); });
const log = (o) => console.log(JSON.stringify({ at: new Date().toISOString(), ...o }));
const specs = process.argv.slice(2).map((f) => ({ file: path.resolve(HERE, f.replace(/^observatory\/batch2\/rc\//, '')), ...JSON.parse(fs.readFileSync(path.resolve(HERE, f.replace(/^observatory\/batch2\/rc\//, '')), 'utf8')) }));
const openai = (s) => s.base?.provider === 'openai-litellm';
if (specs.some((s) => !openai(s)) && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY_FILE) { console.error('set ANTHROPIC_API_KEY_FILE (a 0600 file) before a sweep'); process.exit(2); }
if (specs.some(openai) && !process.env.RC_OPENAI_FAKE && !fs.existsSync(process.env.LITELLM_API_KEY_FILE || '<secrets directory>litellm-api-key')) { console.error('set LITELLM_API_KEY_FILE (a 0600 file) before an openai-litellm sweep'); process.exit(2); }
const shapeOf = (z) => ({ local: 2, directed: z.directed || z.k, symmetric: z.symmetric || Math.round(z.k * 3 / 4), tests: z.tests || 8, shown: 3 });
const runs = specs.flatMap((s) => s.sizes.map((z) => {
  const out = `${s.id.toLowerCase()}-k${z.k}`, cfgFile = path.join(HERE, 'sweeps', `${out}.json`);
  const cfg = { out, k: z.k, cases: z.cases, seed0: z.seed0, shape: shapeOf(z), studyCapUsd: z.cap, arms: s.arms, ...(s.mechanisms ? { mechanisms: s.mechanisms } : {}), ...s.base, ...(z.extra || {}), ...(s.pilot && openai(s) ? { requireTransportPlan: true } : {}) };
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 1) + '\n');
  return { spec: s, z, out, cfgFile };
}));
const P = specs.some(openai) ? await import('./provider-openai.mjs') : null;
const PA = await import('./pilot-accounting.mjs');
const readj = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let finalExit = 0;
// the pilot of a spec, then its stop rules; returns the gate (pass) or exits 3 (stop)
async function pilot(s) {
  const z = s.sizes[0], out = `${s.id.toLowerCase()}-pilot`, dir = path.join(ROOT, 'results', out), cfgFile = path.join(HERE, 'sweeps', `${out}.json`), gateFile = path.join(dir, 'pilot-gate.json');
  fs.mkdirSync(dir, { recursive: true });
  let gate = readj(gateFile);
  if (!gate) {
    const cfg = { out, k: z.k, cases: 1, seed0: s.pilot.seed, shape: shapeOf(z), studyCapUsd: s.pilot.cap, arms: s.arms, ...(s.mechanisms ? { mechanisms: s.mechanisms } : {}), ...s.base, ...(z.extra || {}), rounds: s.pilot.rounds ?? s.base.rounds, pilot: true, transport: 'batch', transportFallback: 'flex' };
    fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 1) + '\n');
    let code = 0;
    if (!fs.existsSync(path.join(dir, 'summary.json'))) { log({ start: out, pilot: true }); code = await node([path.join(HERE, 'run-rc3.mjs'), cfgFile], path.join(dir, 'run.log')); log({ ran: out, code }); }
    if (![0, 3, 5, 6].includes(code)) { console.error(`${s.id}: the pilot run failed (exit ${code}); a rerun resumes it`); process.exit(1); }
    // a batch that ended cancelled or expired with no result: nothing was resent and no stop rule fired; the pilot halts
    // for the Research Leader without a gate (exit 5, final for the bench), so their decision can resume it
    const tfail = code === 6 ? readj(path.join(dir, 'transport-failure.json'))?.transportFailed : null;
    if (tfail?.leader) { console.error(`${s.id}: PILOT HALTED for the Research Leader, no gate written: ${tfail.error}`); process.exit(5); }
    const j = readj(path.join(dir, 'batches.json'), {}), st = readj(path.join(dir, 'state.json'), { arms: {} }), entries = Object.entries(j);
    // decision B (pilot-accounting.mjs): rule (a) projects from the applied waves only; the cap total counts everything
    const costs = PA.pilotCosts(j), proj = PA.projections({ costs, cases: z.cases, studyCapUsd: z.cap });
    const key = `k${z.k}s${s.pilot.seed}`, tf = readj(path.join(dir, 'transport.json'));
    gate = P.pilotGate({ pilotCostUsd: costs.projectionUsd, startWaveUsd: costs.startWaveUsd, cases: z.cases, studyCapUsd: z.cap,
      refusals: readj(path.join(dir, 'refusals.json'))?.refusals || [], transportFailed: code === 6 ? readj(path.join(dir, 'transport-failure.json'))?.transportFailed || { exit: 6 } : null,
      solved: Object.fromEntries(s.arms.map((a) => [a, !!st.arms[a]?.[key]?.solved])), stopIfNoArmSolves: s.pilot.stopIfNoArmSolves !== false, capStopped: code === 3,
      models: st.models || {}, transport: tf ? { mode: tf.mode, history: tf.history } : null });
    gate.pilotExit = code; gate.pilotDir = `results/${out}`; gate.spec = path.relative(ROOT, s.file);
    gate.costAccounting = { ...PA.COST_ACCOUNTING, ...proj, marginStop: proj.marginStop && gate.pass }; // marginStop: the margin condition on a passing gate
    if (gate.costAccounting.marginStop) gate.marginNote = proj.marginNote;
    fs.writeFileSync(gateFile, JSON.stringify(gate, null, 1) + '\n');
    log({ pilotGate: s.id, pass: gate.pass, stops: gate.stops, projectedUsd: gate.rules.a_projectedCost.projectedUsd, projectionB: proj.B.projectedUsd, projectionA: proj.A.projectedUsd, capTotalUsd: proj.capTotalUsd, marginStop: gate.costAccounting.marginStop, solved: gate.rules.c_floor.solved, transport: gate.transport?.mode });
  }
  if (!gate.pass) {
    const why = { a_projectedCost: `(a) projected study cost US$ ${gate.rules.a_projectedCost.projectedUsd} above the study cap US$ ${gate.rules.a_projectedCost.studyCapUsd}`, b_refusal: `(b) the model refused ${gate.rules.b_refusal.refusals.map((x) => x.param).filter((x, i, a) => a.indexOf(x) === i).join(', ') || 'the transport (batch and flex both failed)'}`, c_floor: '(c) neither arm solved the pilot case within its rounds', pilotCap: 'the pilot hit its own cap (incomplete pilot)' };
    console.error(`${s.id}: PILOT STOP, no study: ${gate.stops.map((x) => why[x]).join('; ')}. Record: results/${s.id.toLowerCase()}-pilot/pilot-gate.json. A study needs the Research Leader's review / a new owner decision.`);
    process.exit(3);
  }
  // decision B margin (pilot-accounting.mjs marginOutcome): with the Research Leader's decision in the spec
  // (pilot.marginDecision), (B) at most its threshold proceeds and (B) above it stops; without it, (A) above the study cap
  // while (B) is not stops. A stop is final (exit 3) before the study's first wave. The decision and the outcome are
  // recorded in pilot-gate.json and in each study size's run-provenance.json.
  if (gate.costAccounting) {
    const m = PA.marginOutcome(gate.costAccounting, s.pilot.marginDecision);
    if (m.decision && JSON.stringify(gate.marginDecision?.outcome) !== JSON.stringify(m.outcome)) {
      gate.marginDecision = { ...m.decision, outcome: m.outcome, appliedAt: new Date().toISOString(), source: `${path.relative(ROOT, s.file)} pilot.marginDecision` };
      fs.writeFileSync(gateFile, JSON.stringify(gate, null, 1) + '\n');
      for (const z2 of s.sizes) {
        const pf = path.join(ROOT, 'results', `${s.id.toLowerCase()}-k${z2.k}`, 'run-provenance.json'), prov = readj(pf, { study: s.id, phases: [] });
        prov.marginDecision = gate.marginDecision; prov.writtenAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(pf), { recursive: true }); fs.writeFileSync(pf, JSON.stringify(prov, null, 1) + '\n');
      }
    }
    log({ margin: s.id, action: m.action, reason: m.reason });
    if (m.action === 'stop') {
      console.error(`${s.id}: ${m.line}. Projection (A) with incidents US$ ${gate.costAccounting.A.projectedUsd}, (B) used by the gate US$ ${gate.costAccounting.B.projectedUsd}, study cap US$ ${gate.costAccounting.studyCapUsd}. Record: results/${s.id.toLowerCase()}-pilot/pilot-gate.json.`);
      process.exit(3);
    }
  }
  return gate;
}
for (const s of specs.filter((x) => x.pilot && openai(x))) {
  const gate = await pilot(s);
  // the study's transport, fixed before its first wave: batch if the pilot ran on batch to the end, else flex
  for (const r of runs.filter((x) => x.spec === s)) {
    const mode = gate.transport?.mode || 'batch';
    try { const plan = P.writePlan(path.join(ROOT, 'results', r.out, 'transport-plan.json'), { transport: mode, reason: mode === 'batch' ? 'the pilot ran on batch to the end' : `batch failed in the pilot: ${gate.transport?.history?.at(-1)?.reason || 'see the pilot'}`, pilot: { gate: `results/${s.id.toLowerCase()}-pilot/pilot-gate.json`, history: gate.transport?.history || null } }); log({ transportPlan: r.out, transport: plan.transport, decidedAt: plan.decidedAt }); }
    catch (e) { console.error(`${s.id}: ${e.message}`); process.exit(5); }
  }
}
await Promise.all(runs.map(async (r) => {
  const dir = path.join(ROOT, 'results', r.out); fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(path.join(dir, 'summary.json'))) { log({ start: r.out }); const code = await node([path.join(HERE, 'run-rc3.mjs'), r.cfgFile], path.join(dir, 'run.log')); log({ ran: r.out, code }); if (code !== 0) { r.failed = true;
    if (code === 3) { finalExit = Math.max(finalExit, 4); console.error(`${r.out}: the study cap check stopped a wave; the run is incomplete (no verdicts, no cases cut); a resume with a higher cap needs the owner`); }
    if (code === 5 || code === 6) { finalExit = 5; const tf = code === 6 ? readj(path.join(dir, 'transport-failure.json'))?.transportFailed : null; console.error(`${r.out}: ${code === 5 ? 'the model refused a parameter' : tf?.leader ? `halted for the Research Leader: ${tf.error}` : 'the transport failed or would switch mid-run'} (see ${r.out}/refusals.json or transport-failure.json); the run stops`); }
    return; } }
  await node([path.join(HERE, 'analyze-rc.mjs'), `results/${r.out}`], path.join(dir, 'analysis.json'));
  await node([path.join(HERE, 'holdout.mjs'), `results/${r.out}`, r.cfgFile, '--strict'], path.join(dir, 'holdout.json'));
  log({ analysed: r.out });
}));
for (const s of specs) { if (runs.some((r) => r.spec === s && r.failed)) { log({ verdicts: s.id, skipped: 'a run failed' }); continue; } await node([path.join(HERE, 'verdict.mjs'), s.file], path.join(ROOT, 'results', s.id.toLowerCase() + '-verdicts.log')); log({ verdicts: s.id }); }
if (finalExit) process.exit(finalExit);
