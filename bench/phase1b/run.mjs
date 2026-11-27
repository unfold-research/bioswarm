// Phase 1b CLI. Offline: plan | map | manifest. Live (real model, on the study host): facts | calibrate <0..2> |
// run <0..17>, only with PHASE1B_LIVE=1 and every gate of results/phase1b/PREREG.md met. This file never starts a
// collection by itself; the live modes refuse to run until their approval files exist.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { blindMemo } from '../blind.mjs';
import { requireOpenAIJudge } from '../openai-review.mjs';
import { team } from './case.mjs';
import { selectCase } from './cases.mjs';
import { piDriver, subscriptionModel } from './driver.mjs';
import { runFacts } from './facts.mjs';
import { requireDispatch } from './attempts.mjs';
import { runReadGate } from './integrity.mjs';
import { writeReceipt } from './receipts.mjs';
import { bootstrapHttp } from './http.mjs';
import { readdirSync } from 'node:fs';
import { calibrationGate, longRunHold, opportunityGate, studyBrake } from './gates.mjs';
import { manifest } from './manifest.mjs';
import { arms, cleanup, plan, runAttempt } from './runner.mjs';

const repo = resolve(import.meta.dirname, '..', '..');
const [cmd, index] = process.argv.slice(2);
// PHASE1B_CASE selects the case (v1 by default, frozen); v2 needs its own approval before any live mode.
const kase = selectCase();
if (cmd === 'plan') {
  console.table(plan(kase));
  process.exit(0);
}
if (cmd === 'map') {
  const gate = opportunityGate(kase);
  console.table(Object.entries(gate.totals).map(([seed, t]) => ({ seed, ...t })));
  console.log(gate.pass ? 'Opportunity gate: pass' : 'Opportunity gate: FAIL');
  process.exit(gate.pass ? 0 : 1);
}
if (cmd === 'manifest') {
  const frozen = JSON.parse(readFileSync(kase.manifestPath, 'utf8'));
  const same = JSON.stringify(frozen) === JSON.stringify(manifest(kase));
  console.log(same ? 'Inputs and check map match the frozen manifest' : 'MISMATCH with the frozen manifest');
  process.exit(same ? 0 : 1);
}
const live = { brake: kase.version === 'v2r', integrity: true, facts: true, calibrate: kase.calibrationSeeds.length > 0 && /^[0-2]$/.test(index ?? ''), run: /^\d+$/.test(index ?? '') && plan(kase)[Number(index)] };
if (!live[cmd]) throw Error('Expected plan, map, manifest, integrity, facts, calibrate <0..2> or run <0..17>');
if (process.env.PHASE1B_LIVE !== '1') throw Error('Live mode needs PHASE1B_LIVE=1 on the study host');

// Host adapter (bench/direct-host-health.mjs): Mac 20/10 GB rule, or BIOSWARM_STUDY_HOST=benchhost with the BenchHost
// preflight (root 70/75%, 04–08 UTC window, launcher receipt, cgroup limits). Checked before any model call.
const healthFile = join(repo, 'bench', 'direct-host-health.mjs');
if (!existsSync(healthFile)) throw Error('bench/direct-host-health.mjs is required (host amendment of 25/11)');
const health = await import(healthFile);
const resultsRoot = process.env.PHASE1B_RESULTS;
if (!resultsRoot || resolve(resultsRoot).startsWith(repo)) throw Error('Set PHASE1B_RESULTS to a private folder outside the repository');
// v1 keeps its folder untouched; v2 has its own receipts, activations, runs and blind batch under <results>/v2.
const results = kase.version === 'v1' ? resultsRoot : join(resultsRoot, kase.version);
mkdirSync(results, { recursive: true, mode: 0o700 });
const work = process.env.PHASE1B_WORK || join(results, 'work');
mkdirSync(work, { recursive: true, mode: 0o700 });
const revision = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (execFileSync('git', ['-C', repo, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim()) throw Error('Run only from a clean, committed checkout');
health.requireStartSpace(work);
// Judge gate (main aa2d533): the calibration receipt stays at the results root, where the judge run writes it.
if (['v2', 'v2r'].includes(kase.version) && ['calibrate', 'run'].includes(cmd)) {
  requireOpenAIJudge(JSON.parse(readFileSync(join(resultsRoot, 'openai-judge-calibration.json'), 'utf8')));
}
const json = (name) => JSON.parse(readFileSync(join(results, name), 'utf8'));
const has = (name) => existsSync(join(results, name));
// 1b-r spending, every component (studyBrake): runs.jsonl, facts receipts and the judge's receipts under <results>/judge
// (the only judge output folder for v2r). A dispatch file without its receipt is a call whose cost is still unknown.
const studySpend = () => {
  const list = (dir, re) => (existsSync(join(results, dir)) ? readdirSync(join(results, dir)).filter((f) => re.test(f)) : []);
  const runs = has('runs.jsonl') ? readFileSync(join(results, 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const facts = list('facts-runs', /^\d{4}\.json$/).map((f) => json(join('facts-runs', f)));
  const judge = list('judge', /\.receipt\.json$/).map((f) => json(join('judge', f)));
  const dispatches = list('judge', /\.dispatch\.json$/).filter((f) => !existsSync(join(results, 'judge', f.replace('.dispatch.json', '.receipt.json'))));
  return { runs, facts, judge, pending: dispatches.length + (has('active-attempt.json') ? 1 : 0) };
};
if (kase.version === 'v2r' && cmd === 'brake') {
  // Offline: the components, the unknowns and the balance, before an attempt or the judge. No model call.
  console.log(JSON.stringify(studyBrake(studySpend(), kase), null, 2));
  process.exit(0);
}
if (kase.version !== 'v1') {
  // No v2/v2r activation or sample before the Research review of this revision and the leadership decision.
  const name = 'case-' + kase.version + '-approval.json';
  const ok = has(name) && json(name);
  if (!ok || ok.approved !== true || ok.reviewer !== 'Research Leader' || ok.revision !== revision) throw Error('Case ' + kase.version + ' needs ' + name + ' (Research Leader, this revision) in ' + results);
}

// Control on BenchHost, reached privately. The runner assigns; the connector fetches what it was assigned.
const controlUrl = process.env.CONTROL_URL;
const controlKey = process.env.CONTROL_KEY_FILE && readFileSync(process.env.CONTROL_KEY_FILE, 'utf8').trim();
const connectorKey = process.env.BIOSWARM_API_KEY_FILE && readFileSync(process.env.BIOSWARM_API_KEY_FILE, 'utf8').trim();
if (!controlUrl || !controlKey || !connectorKey) throw Error('Set CONTROL_URL, CONTROL_KEY_FILE and BIOSWARM_API_KEY_FILE');
const controlCall = async (method, path, body) => {
  const res = await fetch(new URL(path, controlUrl), { method, headers: { authorization: 'Bearer ' + controlKey, 'content-type': 'application/json' }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw Error('Control ' + method + ' failed: ' + res.status);
  return res.json();
};
// policy.mjs checks every returned and read-back policy against the arm; this client only transports.
const control = {
  assign: (agent, strategy, overrides) => controlCall('PUT', '/v1/policy', { agent, strategy, ...(overrides ? { overrides } : {}) }),
  get: (agent) => controlCall('GET', '/v1/policy?agent=' + encodeURIComponent(agent)),
};
const piDir = join(homedir(), '.pi', 'agent');
const pendingFile = join(results, 'active-attempt.json');
if (existsSync(pendingFile)) throw Error('An earlier attempt needs reconciliation before another starts');
const suspendedFile = join(results, 'suspended.json');
if (existsSync(suspendedFile)) throw Error('Sample suspended (' + json('suspended.json').reason + '): investigate and record the resolution before any live mode');

if (cmd === 'integrity') {
  // Read gate (amendment of 26/11), before the subscription model is even loaded: the local deterministic provider
  // drives the same tool stack; real secrets are checked by the sandbox decision only and never opened.
  const blindKey = join(results, 'blind-key.jsonl');
  if (!existsSync(blindKey)) writeFileSync(blindKey, '', { mode: 0o600 });
  const solutionDir = kase.solutionDir;
  const realPaths = {
    answerKey: [...readdirSync(solutionDir).map((f) => join(solutionDir, f)), kase.manifestPath],
    blindKey: [blindKey],
    credentials: [join(piDir, 'auth.json'), process.env.CONTROL_KEY_FILE, process.env.BIOSWARM_API_KEY_FILE].filter(Boolean),
  };
  const { localDriver } = await import('./localdriver.mjs');
  const local = await localDriver({ connectorEnv: { BIOSWARM_API_URL: controlUrl, BIOSWARM_API_KEY: connectorKey } });
  writeFileSync(pendingFile, JSON.stringify({ cmd, revision }), { flag: 'wx' });
  const out = await runReadGate({ root: work, driver: local, control, realPaths });
  local.dispose();
  writeFileSync(join(results, 'integrity.json'), JSON.stringify({ revision, ...out }, null, 2));
  rmSync(pendingFile);
  console.log(JSON.stringify(out));
  process.exit(out.pass ? 0 : 1);
}
if (cmd === 'facts' && kase.version === 'v2r') {
  // 1b-r facts (scoped-facts.mjs): local deterministic provider, the installed connector 0.3 and the Control's C policy,
  // on technical files only. No model call and no cost; mandatory, numbered receipt, as for the 1b facts.
  if (!has('integrity.json') || json('integrity.json').pass !== true || json('integrity.json').revision !== revision) throw Error('The read integrity gate must pass on this revision first (integrity)');
  const { localDriver } = await import('./localdriver.mjs');
  const { runScopedFacts } = await import('./scoped-facts.mjs');
  const local = await localDriver({ connectorEnv: { BIOSWARM_API_URL: controlUrl, BIOSWARM_API_KEY: connectorKey } });
  writeFileSync(pendingFile, JSON.stringify({ cmd, revision }), { flag: 'wx' });
  const out = await runScopedFacts({ root: work, driver: local, control });
  local.dispose();
  const receipt = { at: new Date().toISOString(), revision, ...out };
  const file = writeReceipt(join(results, 'facts-runs'), receipt);
  writeFileSync(join(results, 'facts.json'), JSON.stringify({ ...receipt, receipt: file.split('/').at(-1) }, null, 2));
  rmSync(pendingFile);
  console.log(JSON.stringify({ pass: out.pass, facts: out.facts, policyReceived: out.policyReceived, receipt: file.split('/').at(-1) }));
  process.exit(out.pass ? 0 : 1);
}
// Once, after the local integrity branch and before the first remote SDK call: Pi's own HTTP dispatcher.
await bootstrapHttp();
const { runtime, model } = await subscriptionModel({ authPath: join(piDir, 'auth.json'), modelsPath: join(piDir, 'models.json') });
const driver = piDriver({ runtimeFor: () => runtime, modelFor: () => model, thinkingLevel: 'medium', expectModel: model.id, connectorEnv: { BIOSWARM_API_URL: controlUrl, BIOSWARM_API_KEY: connectorKey }, countEvent: health.countProviderEvent });

if (!opportunityGate(kase).pass) throw Error('Opportunity gate failed: amend the case before any activation');

if (!has('integrity.json') || json('integrity.json').pass !== true || json('integrity.json').revision !== revision) throw Error('The read integrity gate must pass on this revision first (integrity)');

if (cmd === 'facts') {
  writeFileSync(pendingFile, JSON.stringify({ cmd, revision }), { flag: 'wx' });
  const out = await runFacts({ root: work, driver, control, kase });
  const receipt = { at: new Date().toISOString(), revision, model: model.id, ...out, dir: undefined };
  // Every run keeps its own numbered, read-only receipt; facts.json only points the gate at the latest one.
  // A facts.json from before numbered receipts (first BenchHost run) is kept as its own receipt, never overwritten.
  if (has('facts.json') && !json('facts.json').receipt) writeReceipt(join(results, 'facts-runs'), { legacy: true, ...json('facts.json') });
  const file = writeReceipt(join(results, 'facts-runs'), receipt);
  writeFileSync(join(results, 'facts.json'), JSON.stringify({ ...receipt, receipt: file.split('/').at(-1) }, null, 2));
  rmSync(out.dir, { recursive: true, force: true });
  rmSync(pendingFile);
  console.log(JSON.stringify({ pass: out.pass, facts: out.facts, aborted: out.aborted, policyReceived: out.policyReceived, receipt: file.split('/').at(-1) }));
  process.exit(out.pass ? 0 : 1);
}

if (!has('facts.json') || json('facts.json').pass !== true || json('facts.json').revision !== revision) throw Error('The four facts must pass on this revision first (facts)');
if (kase.version === 'v2r' && json('facts.json').connector !== 'scoped-v1') throw Error('1b-r needs the scoped facts of connector 0.3 on this revision (facts)');
let studyBalanceUsd = null;
const { seed, arm } = cmd === 'calibrate' ? { seed: kase.calibrationSeeds[Number(index)], arm: 'A' } : plan(kase)[Number(index)];
if (cmd === 'run') {
  const approval = has('research-approval.json') && json('research-approval.json');
  if (!approval || approval.revision !== revision || approval.approved !== true || approval.reviewer !== 'Research Leader' || approval.blindReviewerConfirmed !== true)
    throw Error('Research approval of this revision and a calibrated blind reviewer are required');
  if (!existsSync(join(repo, 'results', 'phase1', 'JUDGE-CALIBRATION.json'))) throw Error('The adjudicator calibration record is required');
  const mediumTask = kase.version === 'v2';
  if (mediumTask && approval.scope !== 'medium-v2') throw Error('Explicit approval for the medium v2 sample is required');
  const frozen = mediumTask ? JSON.parse(readFileSync(join(repo, 'results/phase1b/CALIBRATION-V2.json'), 'utf8')) : null;
  if (mediumTask) {
    const evidenceRevision = json('case-v2-approval.json').evidenceRevision;
    if (evidenceRevision !== frozen.revision || !/^[a-f0-9]{40}$/.test(evidenceRevision)) throw Error('The approved calibration evidence revision must match the frozen v2 receipts');
    // The amendment changes the dispatch gate and analysis, never the workers, task, verifier or judge.
    const instrument = ['bench', 'packages', 'package.json', 'package-lock.json',
      ':(exclude)bench/*.test.mjs', ':(exclude)bench/fixtures/v2-reference.mjs',
      ':(exclude)bench/phase1b/run.mjs', ':(exclude)bench/phase1b/gates.mjs'];
    execFileSync('git', ['-C', repo, 'diff', '--quiet', evidenceRevision, revision, '--', ...instrument]);
  }
  if (kase.version === 'v2r') {
    // 1b-r: B against C, no A arm and no calibration. Explicit scope, and the study-level brake before each attempt.
    if (approval.scope !== 'b-vs-c-0.3') throw Error('Explicit approval for the 1b-r sample (scope b-vs-c-0.3) is required');
    const done = has('runs.jsonl') ? readFileSync(join(results, 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    const brake = studyBrake(studySpend(), kase);
    if (!brake.allowed) throw Error('Study brake: US$ ' + brake.spent.toFixed(4) + ' spent' + (brake.unknown.length ? ', unknown cost (' + brake.unknown.join('; ') + ')' : '') + '; another attempt could pass US$ ' + kase.studyBrakeUsd);
    studyBalanceUsd = brake.balance;
    requireDispatch(done, Number(index));
  }
  const activations = kase.version === 'v2r' ? [] : kase.calibrationSeeds.map((seed) => {
    const bytes = readFileSync(join(results, 'activation-' + seed + '.json'));
    const record = JSON.parse(bytes);
    if (record.seed !== seed || record.revision !== (frozen?.revision ?? revision)) throw Error('Wrong A calibration seed or revision');
    if (mediumTask) {
      const digest = createHash('sha256').update(bytes).digest('hex');
      if (record.case !== 'v2' || digest !== frozen.activations.find((r) => r.seed === seed)?.sha256) throw Error('A calibration differs from its frozen v2 receipt');
    }
    return record;
  });
  if (kase.version !== 'v2r') {
    const gate = calibrationGate(activations, kase, { mediumTask, timeoutAck: longRunHold(activations, kase, has('timeout-ack.json') ? json('timeout-ack.json') : null, revision).length === 0 });
    if (!gate.pass) throw Error('Calibration gate failed: ' + gate.reasons.join('; '));
    const done = has('runs.jsonl') ? readFileSync(join(results, 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    requireDispatch(done, Number(index));
  }
}

// Worker modules run as the separate tool user on the study host (BenchHost launcher); required there.
const tool = process.env.BIOSWARM_TOOL || null;
if (process.env.BIOSWARM_STUDY_HOST === 'benchhost' && tool !== '/usr/local/bin/svc-tool') throw Error('On BenchHost, set BIOSWARM_TOOL=/usr/local/bin/svc-tool');
const identity = async () => ({ oauth: runtime.isUsingOAuth('openai'), subscription: runtime.isUsingSubscription('openai') });
// Pause after any attempt above 75 min (v2): nothing else starts until the Research Leader releases that run.
const previous = [...kase.calibrationSeeds.map((s) => (has('activation-' + s + '.json') ? json('activation-' + s + '.json') : null)), ...(has('runs.jsonl') ? readFileSync(join(results, 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])];
const held = longRunHold(previous, kase, has('timeout-ack.json') ? json('timeout-ack.json') : null, revision);
if (held.length) throw Error('Paused: ' + held.length + ' attempt(s) above 75 min await an explicit release by the Research Leader (timeout-ack.json, runs: ' + held.join(', ') + ')');
writeFileSync(pendingFile, JSON.stringify({ cmd, index, seed, arm, revision }), { flag: 'wx' });
const { record, attemptDir, taskDir } = await runAttempt({ kase, seed, arm, root: work, driver, health, control, identity, tool, countEvent: health.countProviderEvent, studyBalanceUsd });
const full = { ...record, index: cmd === 'run' ? Number(index) : null, revision, host: { ...record.host, name: 'Pi direct (SDK sessions) on ' + health.hostName, bridge: 'send_message queue, next wave' } };
if (record.incident === 'policy_mismatch') {
  // Assignment or receipt of the policy failed in B/C: the whole sample stops here, with a receipt for investigation.
  writeFileSync(suspendedFile, JSON.stringify({ at: new Date().toISOString(), reason: 'policy_mismatch', cmd, index: full.index, seed, arm, run: record.run, revision, dispatched: record.dispatched }, null, 2), { mode: 0o600 });
}
if (taskDir) {
  const evidence = join(results, 'private', record.run);
  mkdirSync(evidence, { recursive: true, mode: 0o700 });
  for (const f of ['balances.csv', 'exceptions.csv', 'close.md']) {
    const file = join(taskDir, f);
    if (existsSync(file) && lstatSync(file).isFile()) copyFileSync(file, join(evidence, f));
  }
  // Only a comparable attempt with a memo enters the blind batch; incidents never reach the verifier's verdict or the judge.
  const memo = join(taskDir, 'close.md');
  if (cmd === 'run' && record.comparable && existsSync(memo) && lstatSync(memo).isFile()) {
    // Blind packet: <uuid>.md masked and <uuid>.json with the five reference figures; the key stays private.
    const blindId = randomUUID(),
      blind = join(results, 'blind');
    mkdirSync(blind, { recursive: true, mode: 0o700 });
    const redacted = blindMemo(readFileSync(memo, 'utf8'), team);
    writeFileSync(join(blind, blindId + '.md'), redacted.text);
    const scratch = join(work, 'oracle-' + blindId);
    const oracle = kase.prepareCase(seed, scratch);
    rmSync(scratch, { recursive: true, force: true });
    writeFileSync(join(blind, blindId + '.json'), JSON.stringify(kase.memoFigures(oracle))); // the same five figures in every case
    writeFileSync(join(evidence, 'redactions.json'), JSON.stringify({ blindId, removals: redacted.removals }));
    appendFileSync(join(results, 'blind-key.jsonl'), JSON.stringify({ blindId, run: record.run }) + '\n', { mode: 0o600 });
  }
}
// Every record is kept, incidents included, with the cost and time already spent.
if (cmd === 'calibrate') writeFileSync(join(results, 'activation-' + seed + '.json'), JSON.stringify(full, null, 2));
else appendFileSync(join(results, 'runs.jsonl'), JSON.stringify(full) + '\n');
cleanup(attemptDir);
rmSync(pendingFile);
console.log(JSON.stringify({ run: record.run, seed, arm, dispatched: record.dispatched, end: record.end ?? null, incident: record.incident, waves: record.waves ?? 0, comparable: record.comparable, deterministicAccepted: record.deterministicAccepted ?? null, review: record.review ?? null }));
if (record.incident) console.error('Incident: ' + record.incident + (record.incident === 'policy_mismatch' ? ' — sample suspended; investigate before any further index (' + suspendedFile + ')' : ''));
if (!record.comparable) process.exitCode = 1;
