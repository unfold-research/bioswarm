// GN1 driver (tasks/GN1-MEMORY-PREREG.md), run by the research bench as a 'script' study: node drive-gn1.mjs <spec>,
// from the repository root. Order, each step resumable and recorded under spec.out:
//   1. stage 0 (free, no model): gn1-oracle.mjs on case 1 of the related sequences -> stage0.json. Notebook share below
//      the gate: GN1 stops before any spend (exit 3), to be published as "premise not met by this family generator".
//      Library share alone below the gate: the library arm is dropped, which must be recorded before the pilot.
//   2. pilot (paid): one related sequence, cases 1 and 2, every arm -> pilot/ (excluded from analysis).
//   3. cost rule: the study's projection WITHOUT the pilot, from the pilot's measured cost per case run and per note
//      round; the sample is the first step of spec.costRule.steps (full, 2 controls, 5 related, the prereg's order) whose
//      projection is at most thresholdUsd (7.4) and at most studyCapUsd minus the pilot's actual spend (the cap of 8
//      includes the pilot; no extra margin, Genome Research 2026-11-23). Written with a timestamp to plan.json (results/gn1, published by the bench) before any study
//      wave; the study backend refuses to send a wave without it. The prereg also asks for the choice on its page.
//   4. study waves (paid) -> study/ (state, batches) and runs/ (one record per case run; the bench counts these).
// A decision computed here (library dropped, sample) that is not yet recorded in spec.plan stops the driver (exit 3) so
// nothing is spent on an unrecorded choice; after the commit that records it on the prereg page and in spec.plan, the
// study is queued again and resumes. Every paid part of a wave (gn1-batch.mjs: min(partMaxUsd, cap - committed)
// reserved, down to one request) is reserved in the shared ledger (UNFOLD_LEDGER) before its POST and reconciled after;
// it goes out only if committed (pilot included, unreconciled parts at full reservation) + its FULL reservation <=
// spec.studyCapUsd. When not even one request the plan needs fits, with nothing in flight, the driver stops (exit 4):
// the numbers go to <out>/cap-stop.json and stderr.
// Exit codes (bench FINAL_EXITS): 0 done, 1 retry, 3 gate or unrecorded decision (final), 4 study cap reached (final).
import fs from 'node:fs';
import path from 'node:path';
import { stage0, stage0Gate } from './gn1-oracle.mjs';
import { runGN1, configHash, sequencesOf, runConfig, recordName } from './run-gn1.mjs';
import { batchBackend, chooseSample, capStopReport, PART_MAX_USD } from './gn1-batch.mjs';
import { bytesCounter, apiCounter } from './notes.mjs';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: node observatory/batch2/rc/drive-gn1.mjs <spec.json>'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')), OUT = path.resolve(spec.out);
fs.mkdirSync(OUT, { recursive: true });
const log = (o) => { const l = JSON.stringify({ at: new Date().toISOString(), ...o }); console.log(l); fs.appendFileSync(path.join(OUT, 'run.log'), l + '\n'); };
const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1) + '\n'); fs.renameSync(f + '.tmp', f); };
const stop = (code, o) => { log(o); process.exit(code); };
// GN1_FAKE=1 (dry runs only, never set by the bench): the stub model of gn1-fake.mjs, no network, no ledger, token counts
// bytes / 3; GN1_FAKE_USD prices each stub request so the cost rule has numbers to work on.
const FAKE = process.env.GN1_FAKE === '1';
if (FAKE) process.env.RC_COUNT_STUB = 'YES';
const fake = FAKE ? await import('./gn1-fake.mjs') : null, fakeUsd = Number(process.env.GN1_FAKE_USD || 0);
const offline = process.env.RC_COUNT_STUB === 'YES';
const counter = offline ? bytesCounter : apiCounter((await import('../../../library/cards/batch-api.mjs')).countTokens, spec.model);

// ---------- 1. stage 0 ----------
let s0 = readJson(path.join(OUT, 'stage0.json'));
if (!s0) { s0 = await stage0({ seeds: spec.sequences.related, k: spec.k, shape: spec.shape, f: spec.f, max: spec.notesTokens, count: counter }); writeJson(path.join(OUT, 'stage0.json'), s0); }
const gate = stage0Gate(s0, spec.stage0.gate), dropLibrary = s0.library.share < spec.stage0.libraryGate;
log({ stage0: { notebook: +s0.notebook.share.toFixed(4), library: +s0.library.share.toFixed(4), counter: s0.counter, stop: gate.stop, dropLibrary } });
if (gate.stop) { writeJson(path.join(OUT, 'gate.json'), { stop: true, reason: 'stage 0: notebook share below the gate; GN1 stops before any spend; publish as "premise not met by this family generator"; f is not raised', ...gate }); stop(3, { gate: 'stage 0 failed' }); }
if (dropLibrary && spec.plan?.libraryDropped !== true) { writeJson(path.join(OUT, 'gate.json'), { stop: false, record: 'library arm dropped (stage 0 library share below the gate): record it on the prereg page and set plan.libraryDropped = true before the pilot', ...gate }); stop(3, { gate: 'record the library drop before the pilot' }); }
if (!dropLibrary && spec.plan?.libraryDropped === true) stop(3, { gate: 'plan.libraryDropped is true but stage 0 did not drop the library arm' });
const arms = dropLibrary ? spec.arms.filter((a) => a !== 'library') : spec.arms, cfg = runConfig(spec, arms);

// ---------- 2. pilot ----------
const PILOT = path.join(OUT, 'pilot'), pilotSeqs = sequencesOf(spec, 'pilot');
const partMaxUsd = spec.partMaxUsd ?? PART_MAX_USD;
const pilotBackend = FAKE ? fake.fakeBackend({ cfg, usdPerRequest: fakeUsd, outDir: PILOT }) : batchBackend({ cfg, outDir: PILOT, name: 'gn1-pilot', hash: configHash(cfg, pilotSeqs), partMaxUsd, log });
fs.mkdirSync(PILOT, { recursive: true });
const p = await runGN1({ cfg, sequences: pilotSeqs, outDir: PILOT, recordsDir: path.join(PILOT, 'runs'), backend: pilotBackend, counter, log });
if (p.stopped && pilotBackend.capStopped) stop(4, { pilot: 'cap stop', ...capStopReport({ out: OUT, part: 'pilot', capStop: pilotBackend.capStop, sequences: pilotSeqs, arms, recordsDir: path.join(PILOT, 'runs'), recordName }) });
if (p.stopped) stop(1, { pilot: 'stopped' });
const pilotSpentUsd = pilotBackend.spent();

// ---------- 3. cost rule ----------
let plan = readJson(path.join(OUT, 'plan.json'));
if (!plan) {
  const st = p.state, caseRuns = Object.values(st.units), noteRounds = Object.values(st.notes);
  const perCaseRunUsd = caseRuns.reduce((n, u) => n + u.history.reduce((m, h) => m + h.usd, 0), 0) / caseRuns.length;
  const perNoteRoundUsd = noteRounds.length ? noteRounds.reduce((n, x) => n + x.usage.usd, 0) / noteRounds.length : 0;
  const { steps, pick, headroomUsd } = chooseSample({ spec, arms, pilotSpentUsd, perCaseRunUsd, perNoteRoundUsd, partMaxUsd });
  plan = { at: new Date().toISOString(), rule: 'first step (prereg order) whose study projection without the pilot is <= thresholdUsd and <= studyCapUsd - pilot actual spend (no extra margin)', partMaxUsd, recordedBeforeFirstWave: true,
    pilotSpentUsd, perCaseRunUsd, perNoteRoundUsd, arms, libraryDropped: dropLibrary, steps, thresholdUsd: spec.costRule.thresholdUsd, studyCapUsd: spec.studyCapUsd, headroomUsd,
    sample: pick ? pick.sample : null, guardUnits: pick ? 2 * spec.costRule.steps.find((x) => x.sample === pick.sample).control.length : null };
  writeJson(path.join(OUT, 'plan.json'), plan);
}
log({ plan: { sample: plan.sample, steps: plan.steps, recorded: spec.plan?.sample ?? null } });
if (!plan.sample) stop(3, { gate: `with the pilot's costs no registered sample projects at most US$ ${spec.costRule.thresholdUsd} and at most the cap left after the pilot (US$ ${plan.headroomUsd}); the study does not start` });
if (spec.plan?.sample !== plan.sample) stop(3, { gate: spec.plan?.sample ? `plan.sample "${spec.plan.sample}" differs from the cost rule's "${plan.sample}"` : `record sample "${plan.sample}" on the prereg page and in plan.sample before the first study wave` });

// ---------- 4. study ----------
const STUDY = path.join(OUT, 'study'), RUNS = path.resolve(spec.episodes), seqs = sequencesOf(spec, 'study', plan.sample);
fs.mkdirSync(STUDY, { recursive: true }); fs.mkdirSync(RUNS, { recursive: true });
// case runs the cost rule or the stage-0 library drop removed get a placeholder record, so the bench's count completes
const all = sequencesOf(spec, 'study', 'full'), kept = new Set(seqs.map((S) => `${S.type}${S.seed}`));
for (const S of all) for (let c = 1; c <= S.cases; c++) for (const arm of c === 1 ? ['shared'] : spec.arms) {
  const why = !kept.has(`${S.type}${S.seed}`) ? `cost rule (sample ${plan.sample})` : arm === 'library' && dropLibrary ? 'stage 0 dropped the library arm' : null;
  if (why && !fs.existsSync(path.join(RUNS, recordName(arm, c, S.seed)))) writeJson(path.join(RUNS, recordName(arm, c, S.seed)), { study: 'GN1', seq: S.seed, type: S.type, case: c, arm, dropped: true, reason: why });
}
const record = path.join(OUT, 'plan.json');
const backend = FAKE ? fake.fakeBackend({ cfg, usdPerRequest: fakeUsd, priorSpentUsd: pilotSpentUsd, record, outDir: STUDY }) : batchBackend({ cfg, outDir: STUDY, name: 'gn1', hash: configHash(cfg, seqs), priorSpentUsd: pilotSpentUsd, record, partMaxUsd, log });
const r = await runGN1({ cfg, sequences: seqs, outDir: STUDY, recordsDir: RUNS, backend, counter, log });
if (r.stopped && backend.capStopped) stop(4, { study: 'cap stop', ...capStopReport({ out: OUT, part: 'study', capStop: backend.capStop, sequences: seqs, arms, recordsDir: RUNS, recordName }) });
if (r.stopped) stop(1, { study: 'stopped' });
log({ study: 'done', spentUsd: +(pilotSpentUsd + backend.spent()).toFixed(4), records: fs.readdirSync(RUNS).filter((f) => f.endsWith('.json')).length });
