// Phase 1b case v2 (results/phase1b/CASO-V2.md): fixtures, map, verifier, gates and a full attempt on Pi's faux
// provider. No network, no model call, no live data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { assignment, currentWave } from '../packages/connector-pi/coordination.js';
import { cases, selectCase } from './phase1b/cases.mjs';
import { calibrationGate, mediumSampleDuration, opportunityGate } from './phase1b/gates.mjs';
import { manifest } from './phase1b/manifest.mjs';
import { arms, plan, runAttempt } from './phase1b/runner.mjs';
import { fakeControl, health, scriptedDriver, temp } from './phase1b/testkit.mjs';
import { memo, solution } from './fixtures/v2-reference.mjs';
import frozen from './phase1b/v2/manifest.json' with { type: 'json' };

const v2 = cases.v2;
const seeds = [...v2.sampleSeeds, ...v2.calibrationSeeds];

test('v2 is selected only on request; seeds are disjoint from v1; the map gives at least 5 directed and 5 disputes', () => {
  assert.equal(selectCase('v1').version, 'v1');
  assert.equal(selectCase('v2').version, 'v2');
  assert.throws(() => selectCase('v3'));
  const v1seeds = [...cases.v1.sampleSeeds, ...cases.v1.calibrationSeeds];
  assert.ok(seeds.every((s) => !v1seeds.includes(s)));
  assert.deepEqual(plan(v2).map((p) => p.seed + p.arm).slice(0, 6), ['3109A', '3109B', '3109C', '3163B', '3163C', '3163A']);
  const gate = opportunityGate(v2);
  assert.equal(gate.pass, true);
  for (const seed of seeds) {
    const map = v2.checkMap(seed);
    assert.equal(map.length, 12);
    assert.ok(gate.totals[seed].directed >= 5 && gate.totals[seed].dispute === 5, String(seed));
    for (const c of map.filter((x) => x.class === 'directed')) assert.ok(c.owners.length === 1 && c.requirement.holder && !c.owners.includes(c.requirement.holder));
  }
  assert.deepEqual(manifest(v2), frozen, 'inputs, map and totals match the frozen v2 manifest');
});

test('v2: the requirement of an active directed conflict sits only in the holder\'s notes', (t) => {
  const phrases = { 'mkb-cutoff': ['repasses.notes.md', '03:00 UTC'], 'return-new-sku': ['vendas.notes.md', 'SKU novo, mesmo quando'], 'acq-chargeback': ['creditos.notes.md', 'linha CB'], 'mkb-threshold': ['repasses.notes.md', 'limite da faixa mensal do MKB'], 'acq2-anticipation': ['vendas.notes.md', 'acordo comercial com a ACQ2'], 'bank-resend': ['creditos.notes.md', 'reenvia'] };
  for (const seed of seeds) {
    const dir = temp(t, 'p1b-v2-notes-');
    v2.prepareCase(seed, dir);
    const files = Object.fromEntries(v2.inputFiles.filter((f) => f.endsWith('.md')).map((f) => [f, readFileSync(join(dir, f), 'utf8')]));
    for (const [quirk, [holderFile, phrase]] of Object.entries(phrases)) {
      const where = Object.keys(files).filter((f) => files[f].includes(phrase));
      if (v2.design(seed).directed.includes(quirk)) assert.deepEqual(where, [holderFile], `seed ${seed} ${quirk}`);
      else assert.ok(!where.includes(holderFile) || quirk === 'bank-resend', `seed ${seed} ${quirk} inactive`);
    }
  }
});

test('v2 calibration gate: 4+4 observed opportunities (map 5+5), A cost median at most 50% of the brake, long runs reported', () => {
  const cal = (seed, extra = {}) => ({ case: 'v2', seed, arm: 'A', comparable: true, participants: 3, observedWallSeconds: 2400, totalSeconds: 2600, hostEstimatedUsd: 3, observedOpportunities: { dispute: 4, directed: 5 }, ...extra });
  const ok = [cal(4019), cal(4051), cal(4073)];
  assert.equal(calibrationGate(ok).pass, true);
  assert.equal(calibrationGate([cal(4019), cal(4051, { observedOpportunities: { dispute: 3, directed: 5 } }), cal(4073)]).pass, false);
  const costly = calibrationGate([cal(4019, { hostEstimatedUsd: 4.6 }), cal(4051, { hostEstimatedUsd: 4.7 }), cal(4073)]);
  assert.equal(costly.pass, false);
  assert.match(costly.reasons.join(), /exceeds 50% of the US\$ 9 brake/);
  const long = [cal(4019, { totalSeconds: 76 * 60 }), cal(4051), cal(4073)];
  assert.equal(calibrationGate(long).pass, false);
  assert.equal(calibrationGate(long, v2, { timeoutAck: true }).pass, true);
  assert.equal(calibrationGate([cal(2011, { case: undefined, observedOpportunities: { dispute: 2, directed: 2 } }), cal(2027, { case: undefined, observedOpportunities: { dispute: 2, directed: 2 } }), cal(2039, { case: undefined, observedOpportunities: { dispute: 2, directed: 2 } })]).pass, true, 'v1 records keep the v1 gate');
});

// Competent scripted team for v2, as in the v1 test: C traces to the assigned writer; the memo from wave 2 on.
const competent = (seed, o) => (agent, text, arm) => {
  const failing = [...text.matchAll(/check (\S+) · arquivo (\S+) · elegíveis: ([^·]+) ·/g)].map((m) => ({ id: m[1], path: m[2], owners: m[3].trim().split(', ') }));
  const wave = Number(/Onda (\d+)\./.exec(text)[1]);
  const calls = [];
  for (const c of failing) {
    if (c.id === 'memo' && wave < 2) continue;
    const content = c.id === 'memo' ? memo(o) : solution(seed, c.path.split('/').at(-1));
    if (arm !== 'C') {
      if (c.owners[0] === agent) calls.push({ tool: 'write', args: { path: c.path, content } });
      continue;
    }
    const published = currentWave(join(dirname(dirname(c.path)), 'waves'));
    const writer = assignment(published, published.checks.find((x) => x.id === c.id), arms.C.rules).agent;
    if (writer === agent) calls.unshift({ tool: 'write', args: { path: c.path, content } });
    else calls.push({ tool: 'leave_mark', args: { kind: 'requirement', place: c.path, to: writer, text: 'Requisito do check.' } });
  }
  return calls;
};
for (const arm of ['A', 'C']) {
  test(`v2 arm ${arm}: a full attempt completes through waves with the v2 case and count-only telemetry`, async (t) => {
    const seed = 4019;
    const o = v2.prepareCase(seed, temp(t, 'p1b-v2-oracle-'));
    const control = fakeControl();
    const driver = await scriptedDriver(t, control, competent(seed, o));
    const { record } = await runAttempt({ kase: v2, seed, arm, root: temp(t, 'p1b-v2-root-'), driver, health: health(), control });
    assert.equal(record.case, 'v2');
    assert.equal(record.end, 'complete');
    assert.equal(record.deterministicAccepted, true);
    assert.equal(record.comparable, true);
    assert.equal(record.participants, 3);
    assert.deepEqual(record.observedOpportunities, v2.opportunityTotals(seed));
    assert.ok(record.inputReadProxy.reads === 0 && record.inputReadProxy.chars === 0, 'the scripted team reads nothing');
    if (arm === 'C') assert.ok(record.manipulation.rulesFired.wait_for_trace >= 1);
    const first = driver.prompts.find((p) => /Onda 1\./.test(p.text)).text;
    assert.match(first, /missing \(lotes sem depósito, missing_payout\), over/);
  });
}

test('pre-flight probe: one minimal call, numbers only, apart from the attempt; a 429 or failure refuses before workers', async (t) => {
  const { registerFauxProvider, fauxAssistantMessage } = await import('@earendil-works/pi-ai/compat');
  const { ModelRuntime } = await import('@earendil-works/pi-coding-agent');
  const { piDriver } = await import('./phase1b/driver.mjs');
  const faux = registerFauxProvider({ provider: 'faux-probe', models: [{ id: 'probe-1', reasoning: true }] });
  t.after(() => faux.unregister());
  const model = faux.getModel();
  const dir = temp(t, 'p1b-probe-');
  const runtime = await ModelRuntime.create({ authPath: join(dir, 'a.json'), modelsPath: join(dir, 'm.json') });
  await runtime.setRuntimeApiKey(model.provider, 'k');
  runtime.registerProvider(model.provider, { baseUrl: model.baseUrl, api: model.api, models: [{ id: model.id, name: model.name, api: model.api, reasoning: model.reasoning, input: model.input, cost: model.cost, contextWindow: model.contextWindow, maxTokens: model.maxTokens, baseUrl: model.baseUrl }] });
  faux.setResponses([fauxAssistantMessage('ok'), fauxAssistantMessage([], { stopReason: 'error', errorMessage: 'HTTP 429 rate limited' })]);
  const driver = piDriver({ runtimeFor: () => runtime, modelFor: () => model, expectModel: model.id });
  const ok = await driver.probe();
  assert.deepEqual([ok.responses, ok.errors, ok.http429, ok.wrongModel], [1, 0, 0, 0]);
  assert.ok(Object.values(ok.tokens).reduce((a, b) => a + b, 0) > 0 && typeof ok.at === 'string');
  const limited = await driver.probe();
  assert.ok(limited.errors >= 1 && limited.http429 === 1 && limited.errorCodes.includes(429), 'Pi may retry after the 429; the 429 is counted once');
  assert.ok(!JSON.stringify(limited).includes('rate limited'), 'no provider text');
  // In the runner: the probe runs after the host controls; a 429 refuses the attempt before any worker exists.
  const control = fakeControl();
  const base = await scriptedDriver(t, control, () => []);
  const root = temp(t, 'p1b-probe-root-');
  const quota = (await runAttempt({ kase: v2, seed: 4019, arm: 'B', root, driver: { ...base, probe: async () => limited }, health: health(), control })).record;
  assert.deepEqual([quota.dispatched, quota.incident, quota.comparable], [false, 'provider_429', false]);
  assert.deepEqual(quota.preflightCall, limited);
  assert.deepEqual(readdirSync(root), []);
  const fine = (await runAttempt({ kase: v2, seed: 4019, arm: 'A', root: temp(t, 'p1b-probe-ok-'), driver: { ...base, probe: async () => ok }, health: health(), control, idleWavesLimit: 1 })).record;
  assert.equal(fine.preflightCall, ok);
  assert.notEqual(fine.tokens.input + fine.tokens.cacheRead + fine.tokens.cacheWrite, 0);
  assert.equal(fine.incident, null, 'the probe tokens are not part of the attempt and raise no incident');
});

test('v2 sample rule: map 5+5 and the same seed\'s A at 4+4 decide inclusion; B and C never exclude', async () => {
  const { sampleOpportunityGate } = await import('./phase1b/gates.mjs');
  const rec = (seed, arm, d, s) => ({ case: 'v2', seed, arm, comparable: true, run: arm + seed, observedOpportunities: { directed: d, dispute: s } });
  const all = v2.sampleSeeds.flatMap((s) => [rec(s, 'A', 5, 5), rec(s, 'B', 1, 0), rec(s, 'C', 0, 0)]);
  assert.deepEqual(sampleOpportunityGate(all), { pass: true, excluded: [] }, 'few opportunities in B or C exclude nothing');
  const short = all.map((r) => (r.seed === v2.sampleSeeds[0] && r.arm === 'A' ? rec(r.seed, 'A', 3, 5) : r));
  assert.deepEqual(sampleOpportunityGate(short), { pass: false, excluded: [v2.sampleSeeds[0]] });
});

test('v2 pause: an attempt above 75 min holds every further attempt until the Research Leader releases that run', async () => {
  const { longRunHold } = await import('./phase1b/gates.mjs');
  const records = [{ run: 'r1', totalSeconds: 60 * 60 }, { run: 'r2', totalSeconds: 76 * 60 }, null];
  assert.deepEqual(longRunHold(records, v2), ['r2']);
  assert.deepEqual(longRunHold(records, v2, { reviewer: 'Research Leader', revision: 'abc', runs: ['r2'] }, 'abc'), []);
  assert.deepEqual(longRunHold(records, v2, { reviewer: 'Research Leader', revision: 'old', runs: ['r2'] }, 'abc'), ['r2'], 'a release is tied to the revision');
  assert.deepEqual(longRunHold(records, v2, { reviewer: 'someone', revision: 'abc', runs: ['r2'] }, 'abc'), ['r2']);
  assert.deepEqual(longRunHold(records, cases.v1), [], 'v1 has no such pause');
});

test('the study code never runs a partial verification: `only` is for tests alone', () => {
  // A partial check skips the composed chain and leaves acceptance undefined; a real attempt must never do that.
  const dir = join(import.meta.dirname, 'phase1b');
  const files = [...readdirSync(dir).filter((f) => f.endsWith('.mjs')), ...readdirSync(join(dir, 'v2')).filter((f) => f.endsWith('.mjs')).map((f) => 'v2/' + f)];
  const code = (f) => readFileSync(join(dir, f), 'utf8').replace(/\/\/.*$/gm, ''); // comments may say "only:"
  const callers = files.filter((f) => f !== 'v2/verify.mjs' && /\bonly\b\s*[:},]/.test(code(f)));
  assert.deepEqual(callers, [], 'no study module passes `only` to verifyAttempt');
  assert.match(readFileSync(join(dir, 'runner.mjs'), 'utf8'), /kase\.verifyAttempt\(taskDir, oracle, \{ timeoutMs: verifyTimeoutMs, tool \}\)/);
  // And at run time: outside Node's test runner a partial check throws before touching anything.
  const probe = `import { verifyAttempt } from ${JSON.stringify('file://' + join(dir, 'v2', 'verify.mjs'))}; try { verifyAttempt('/nonexistent', { seed: 4019 }, { only: ['orders'] }); console.log('ran'); } catch (e) { console.log(e.message); }`;
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { encoding: 'utf8', env });
  assert.equal(r.stdout.trim(), 'verifyAttempt({ only }) is reserved for tests');
});

// The open release removes cost fields from results/ (spending is not published), so this historical check can only
// run against the private record.
const calibrationV2 = JSON.parse(readFileSync(new URL('../results/phase1b/CALIBRATION-V2.json', import.meta.url)));
const costRedacted = !calibrationV2.activations.every((a) => 'weightedUsd' in a);
test('medium v2 keeps the historical calibration and flags only the six-seed A median', { skip: costRedacted && 'cost fields are redacted in the open release' }, () => {
  const { activations } = calibrationV2;
  assert.equal(calibrationGate(activations, v2).pass, false);
  assert.equal(calibrationGate(activations, v2, { mediumTask: true }).pass, true);
  assert.equal(calibrationGate(activations.slice(1), v2, { mediumTask: true }).pass, false);
  const arms = v2.sampleSeeds.flatMap((seed) => ['A', 'B', 'C'].map((arm) => ({
    seed, arm, case: 'v2', comparable: true, observedWallSeconds: arm === 'A' ? 180 : 1,
  })));
  assert.equal(mediumSampleDuration(arms).belowFloor, false);
  assert.equal(mediumSampleDuration(arms.slice(1)).belowFloor, null);
  assert.equal(mediumSampleDuration(arms.map((r) => ({ ...r, observedWallSeconds: 179.999 }))).belowFloor, true);
});
