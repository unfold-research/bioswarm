// Phase 1b-r instrument (B against C, connector 0.3, case v2 with new seeds): case, plan, brake, telemetry and the
// coordination receipt. Offline, Pi faux provider only; no model call, no live data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assignment, currentWave } from '../packages/connector-pi/coordination.js';
import { cases, selectCase } from './phase1b/cases.mjs';
import { opportunityGate, studyBrake } from './phase1b/gates.mjs';
import { manifest } from './phase1b/manifest.mjs';
import { arms, plan, runAttempt } from './phase1b/runner.mjs';
import { agentWave, checkWave, classSummary, coordinationOk } from './phase1b/telemetry.mjs';
import { fakeControl, health, scriptedDriver, temp } from './phase1b/testkit.mjs';
import { localDriver } from './phase1b/localdriver.mjs';
import { runScopedFacts } from './phase1b/scoped-facts.mjs';
import { memoFigures } from './phase1b/v2/verify.mjs';
import frozen from './phase1b-r/manifest.json' with { type: 'json' };

const r = cases.v2r;

test('1b-r: new seeds disjoint from every earlier set, B/C order balanced, map 5+5, frozen manifest, no calibration', () => {
  assert.equal(selectCase('v2r'), r);
  const earlier = [...cases.v1.sampleSeeds, ...cases.v1.calibrationSeeds, ...cases.v2.sampleSeeds, ...cases.v2.calibrationSeeds];
  assert.ok(r.sampleSeeds.every((s) => !earlier.includes(s)));
  assert.deepEqual(plan(r).map((p) => p.seed + p.arm), ['5011B', '5011C', '5023C', '5023B', '5039B', '5039C', '5051C', '5051B']);
  assert.deepEqual(plan(r).map((p) => p.index), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(plan(cases.v2).length, 18, 'the 1b plan is unchanged');
  assert.deepEqual(r.calibrationSeeds, []);
  assert.equal(opportunityGate(r).pass, true);
  assert.deepEqual(manifest(r), frozen);
  assert.equal(frozen.protocol, 'results/phase1b-r/PREREG.md');
});

test('1b-r study brake: every component counts, unknown cost closes it, and the balance is what the attempt may spend', () => {
  const tokens = (usd) => ({ input: usd * 1e6 / 2, output: 0, cacheRead: 0, cacheWrite: 0 }); // US$ 2 per million uncached
  const run = (usd, extra = {}) => ({ dispatched: true, incident: null, weightedUsd: usd, ...extra });
  const empty = studyBrake({}, r);
  // The judge of the eight memos is reserved ahead (8 × US$ 0,025); integrity and facts are local (US$ 0).
  assert.deepEqual([empty.spent, empty.judgeReserveUsd, empty.balance, empty.allowed, empty.unknown], [0, 0.2, 7.3, true, []]);
  assert.equal(studyBrake({ runs: [run(3), run(3)] }, r).allowed, true, '6 + 0,2 + 1,05 ≤ 7,50');
  assert.equal(studyBrake({ runs: [run(3), run(3), run(0.3)] }, r).allowed, false, '6,3 + 0,2 + 1,05 > 7,50');
  // Components kept apart: workers, incidents, probes (also of a refused attempt), facts and judge.
  const all = studyBrake({
    runs: [run(1, { preflightCall: { tokens: tokens(0.25) }, preflightWeightedUsd: 0.25 }), run(0.5, { incident: 'provider_429' }), { dispatched: false, incident: 'provider_429', preflightCall: { tokens: tokens(0.25) } }],
    facts: [{ turns: [{ tokens: tokens(0.5) }] }, { connector: 'scoped-v1', driver: 'local' }],
    judge: [{ tokens: tokens(0.5) }],
  }, r);
  assert.deepEqual(all.components, { workers: 1, incidents: 0.5, probes: 0.5, facts: 0.5, judge: 0.5 });
  assert.deepEqual([all.spent, all.allowed], [3, true]);
  assert.ok(Math.abs(all.judgeReserveUsd - 0.175) < 1e-12, 'one memo judged, seven reserved');
  assert.ok(Math.abs(all.balance - 4.325) < 1e-12);
  // Unknown is never zero: a dispatched attempt without a finite cost, a probe without tokens, a judge receipt
  // without usage, or a dispatch with no receipt yet each close the brake.
  for (const spend of [{ runs: [run(Number.NaN)] }, { runs: [{ dispatched: false, preflightCall: { tokens: {} } }] }, { judge: [{ tokens: { input: null, output: 1, cacheRead: 0, cacheWrite: 0 } }] }, { pending: 1 },
    // Review of 09f91ec: a finite weightedUsd does not hide responses whose token counts were missing.
    { runs: [{ dispatched: true, weightedUsd: 0.2, studyCap: { unknownResponses: 1 } }] }, { runs: [run(0.2, { errors: { unknownUsage: 1 } })] },
    { runs: [{ dispatched: false, preflightCall: { tokens: tokens(0.01), unknownUsage: 1 } }] }]) {
    const b = studyBrake(spend, r);
    assert.equal(b.allowed, false, JSON.stringify(spend));
    assert.equal(b.unknown.length, 1);
  }
});

// Telemetry on synthetic turns (labelled example data, not results).
const at = (ms) => new Date(1_000_000 + ms).toISOString();
const call = (tool, check, accepted, ran, t0, t1 = t0 + 10) => ({ tool, path: check, accepted, ran, t0: 1_000_000 + t0, t1: 1_000_000 + t1 });
const placeOf = (p) => p; // the synthetic paths are already check IDs

test('agent telemetry: connector refusals apart from tool errors and other blocks, no negative gaps, no double count', () => {
  const turn = { startedAt: at(100), completedAt: at(900), toolCalls: [call('read', null, true, true, 110), call('write', 'orders', false, false, 200), call('write', 'tiers', true, true, 300), call('edit', 'fees', false, false, 500), call('read', null, true, true, 520), call('edit', 'memo', false, true, 600), call('write', 'notes', false, false, 700)] };
  const decisions = [
    { at: 1_000_205, tool: 'write', outcome: 'refused', rule: 'wait_for_trace', check: 'orders' },
    { at: 1_000_302, tool: 'write', outcome: 'allowed', rule: null, check: 'tiers' },
    { at: 1_000_503, tool: 'edit', outcome: 'yielded', rule: 'yielded_place', check: 'fees' },
    { at: 1_000_601, tool: 'edit', outcome: 'allowed', rule: null, check: 'memo' },
  ];
  const a = agentWave({ turn, waveStart: 1_000_000, waveEnd: 1_000_000 + 1500, placeOf, decisions });
  assert.deepEqual([a.startOffsetMs, a.endOffsetMs, a.busyMs, a.idleMs], [100, 900, 800, 700]);
  assert.equal(a.refusedWrites, 2, 'only the blocks with a connector decision');
  assert.deepEqual(a.refusedByRule, { wait_for_trace: 1, yielded_place: 1 });
  assert.equal(a.toolErrors, 1, 'the edit that ran and failed after an allowed decision is a tool error, not a refusal');
  assert.equal(a.blockedWrites, 1, 'a block with no decision (sandbox, budget, ceiling) is apart');
  assert.equal(a.writesAfterRefusal, 1, 'the accepted write on another place, counted once for two refusals');
  assert.deepEqual(a.msRefusalToNextAccepted, [90, 10]);
  assert.equal(a.endedAfterRefusal, false);
  assert.deepEqual(a.accepted, { read: 2, write: 1 });
  // Parallel calls of one response: the accepted call that started before the refusal ended is not "after" it.
  const p = agentWave({ turn: { startedAt: at(0), completedAt: at(100), toolCalls: [call('write', 'orders', false, false, 10, 40), call('write', 'tiers', true, true, 12, 30), call('read', null, true, true, 60)] }, waveStart: 1_000_000, waveEnd: 1_000_100, placeOf, decisions: [{ at: 1_000_011, tool: 'write', outcome: 'refused', rule: 'wait_for_trace', check: 'orders' }] });
  assert.deepEqual(p.msRefusalToNextAccepted, [20]);
  assert.equal(p.writesAfterRefusal, 0);
  assert.ok(p.msRefusalToNextAccepted.every((g) => g === null || g >= 0));
  // B: no connector decisions; a block is not a refusal, and the turn did not end on one.
  const b = agentWave({ turn: { startedAt: at(0), completedAt: at(50), toolCalls: [call('write', 'orders', false, false, 10)] }, waveStart: 1_000_000, waveEnd: 1_000_050, placeOf });
  assert.deepEqual([b.refusedWrites, b.blockedWrites, b.endedAfterRefusal], [0, 1, false]);
  assert.deepEqual(b.refusedByRule, {});
  // A turn that ends on a connector refusal is marked.
  const e = agentWave({ turn: { startedAt: at(0), completedAt: at(50), toolCalls: [call('write', 'orders', false, false, 10)] }, waveStart: 1_000_000, waveEnd: 1_000_050, placeOf, decisions: [{ at: 1_000_015, tool: 'write', outcome: 'refused', rule: 'wait_for_trace', check: 'orders' }] });
  assert.deepEqual([e.refusedWrites, e.endedAfterRefusal, e.msRefusalToNextAccepted], [1, true, [null]]);
  // Review of 09f91ec: two simultaneous blocked writes, a and b, only b refused by the connector; a later write on a
  // is a write after the refusal. The decision is matched by its check, not by tool name and instant alone.
  const ab = agentWave({ turn: { startedAt: at(0), completedAt: at(200), toolCalls: [call('write', 'a', false, false, 10, 30), call('write', 'b', false, false, 11, 31), call('write', 'a', true, true, 100)] }, waveStart: 1_000_000, waveEnd: 1_000_200, placeOf, decisions: [{ at: 1_000_012, tool: 'write', outcome: 'refused', rule: 'wait_for_trace', check: 'b' }] });
  assert.deepEqual([ab.refusedWrites, ab.blockedWrites, ab.writesAfterRefusal, ab.ambiguousRefusals], [1, 1, 1, 0]);
  // Two blocked calls on the same check in the same instant: ambiguous, kept as such, no refusal chosen.
  const amb = agentWave({ turn: { startedAt: at(0), completedAt: at(200), toolCalls: [call('write', 'a', false, false, 10, 30), call('write', 'a', false, false, 11, 31)] }, waveStart: 1_000_000, waveEnd: 1_000_200, placeOf, decisions: [{ at: 1_000_012, tool: 'write', outcome: 'refused', rule: 'wait_for_trace', check: 'a' }] });
  assert.deepEqual([amb.refusedWrites, amb.ambiguousRefusals, amb.blockedWrites], [0, 1, 0]);
});

test('barrier: share of the most loaded agent and idle seconds of the other two until the wave ends, with arm means', async () => {
  const { barrierWave, barrierSummary } = await import('./phase1b/telemetry.mjs');
  const w = barrierWave([{ agent: 'lia', startedAt: at(0), completedAt: at(6000) }, { agent: 'rui', startedAt: at(0), completedAt: at(2000) }, { agent: 'teo', startedAt: at(1000), completedAt: at(3000) }], 1_000_000 + 6000);
  assert.equal(w.loadShare, 0.6);
  assert.deepEqual(w.idleToBarrierSeconds, { rui: 4, teo: 3 });
  assert.deepEqual(barrierSummary([{ barrier: w }, { barrier: { loadShare: 0.4, idleToBarrierSeconds: { lia: 1, rui: 0 } } }]), { waves: 2, meanLoadShare: 0.5, meanIdleOthersSeconds: 2 });
});

test('check telemetry and class summary: decisions, traces, yields and accepted writes per check, resolved after', () => {
  const map = [{ id: 'orders', class: 'directed' }, { id: 'tiers', class: 'dispute' }, { id: 'memo', class: 'own' }];
  const checks = checkWave({
    map,
    published: [{ id: 'orders' }, { id: 'tiers' }],
    decisions: [{ check: 'orders', outcome: 'refused', rule: 'wait_for_trace', agent: 'lia' }, { check: 'orders', outcome: 'allowed', agent: 'lia' }, { check: 'tiers', outcome: 'yielded', rule: 'yielded_place', agent: 'rui' }, { check: 'tiers', outcome: 'allowed', agent: 'teo' }],
    marks: [{ kind: 'requirement', check: 'orders' }, { kind: 'yielded', check: 'tiers' }, { kind: 'finding', place: '/x' }],
    calls: [{ tool: 'write', accepted: true, ran: true, check: 'orders' }, { tool: 'edit', accepted: false, ran: false, check: 'tiers' }, { tool: 'write', accepted: true, ran: true, check: 'tiers' }],
    markCheck: (m) => m.check ?? null,
    passedAfter: new Set(['orders', 'memo']),
  });
  assert.deepEqual(checks.map((c) => [c.check, c.class, c.failing, c.traces, c.yields, c.acceptedWrites, c.passedAfter]), [['orders', 'directed', true, 1, 0, 1, true], ['tiers', 'dispute', true, 0, 1, 1, false], ['memo', 'own', false, 0, 0, 0, true]]);
  assert.deepEqual(checks[0].decisions, { refused: 1, allowed: 1 });
  assert.deepEqual(checks[0].refusedByRule, { wait_for_trace: 1 });
  const s = classSummary([{ checks }]);
  assert.deepEqual(s.directed, { checkWaves: 1, failing: 1, refused: 1, yielded: 0, traces: 1, acceptedWrites: 1, resolved: 1 });
  assert.deepEqual(s.dispute.yielded, 1);
  assert.equal(s.own.failing, 0);
});

test('coordination receipt for C: header and the map class on every check and every decision; anything else fails', () => {
  const classOf = new Map([['orders', 'directed'], ['tiers', 'dispute']]);
  const wave = { coordination: 'scoped-v1', checks: [{ id: 'orders', class: 'directed' }, { id: 'tiers', class: 'dispute' }] };
  assert.equal(coordinationOk({ wave, header: 'scoped-v1', classOf, decisions: [{ check: 'orders', class: 'directed' }, { check: null, class: null }] }), true);
  assert.equal(coordinationOk({ wave: { ...wave, coordination: undefined }, header: 'scoped-v1', classOf, decisions: [] }), false, 'a 0.2 connector drops the header');
  assert.equal(coordinationOk({ wave: { ...wave, checks: [{ id: 'orders', class: 'own' }] }, header: 'scoped-v1', classOf, decisions: [] }), false);
  assert.equal(coordinationOk({ wave, header: 'scoped-v1', classOf, decisions: [{ check: 'tiers', class: 'directed' }] }), false);
  assert.equal(coordinationOk({ wave: null, header: 'scoped-v1', classOf, decisions: [] }), false);
});

// A competent scripted team, as in the v2 tests.
const solutionDir = join(import.meta.dirname, 'phase1b', 'v2', 'fixtures', 'solution');
const solution = (seed, place) => readFileSync(join(solutionDir, place), 'utf8').replace('__DESIGN__', JSON.stringify(r.design(seed)));
const memo = (o) => `Totais: ${Object.values(memoFigures(o)).join(' ')}.\n`;
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

test('1b-r B: a full attempt records per-wave telemetry by agent and by check, with no path or text', async (t) => {
  const seed = 5011;
  const o = r.prepareCase(seed, temp(t, 'p1b-r-oracle-'));
  const control = fakeControl();
  const driver = await scriptedDriver(t, control, competent(seed, o));
  const root = temp(t, 'p1b-r-root-');
  const { record, attemptDir } = await runAttempt({ kase: r, seed, arm: 'B', root, driver, health: health(), control });
  assert.equal(record.case, 'v2r');
  assert.equal(record.end, 'complete');
  assert.equal(record.comparable, true);
  assert.equal(record.waveTelemetry.length, record.waves);
  const [w1] = record.waveTelemetry;
  assert.deepEqual(Object.keys(w1.agents).sort(), ['lia', 'rui', 'teo']);
  assert.equal(w1.checks.length, 12);
  assert.ok(w1.checks.every((c) => ['own', 'directed', 'dispute'].includes(c.class)));
  assert.ok(w1.checks.reduce((n, c) => n + c.acceptedWrites, 0) >= 10, 'accepted writes are attributed to their checks');
  assert.ok(Object.values(w1.agents).every((a) => a.busyMs >= 0 && a.idleMs >= 0 && a.refusedWrites === 0));
  assert.ok(record.classSummary.directed.checkWaves >= 5 && record.classSummary.dispute.checkWaves >= 5);
  assert.deepEqual(record.coordination, { header: 'scoped-v1', held: true });
  assert.ok(record.waveTelemetry.every((w) => w.barrier.loadShare >= 1 / 3 && w.barrier.loadShare <= 1 && Object.keys(w.barrier.idleToBarrierSeconds).length === 2));
  assert.equal(record.barrier.waves, record.waves);
  assert.equal(typeof record.preflightWeightedUsd, 'number');
  const text = JSON.stringify(record);
  for (const leak of [attemptDir, root, '.mjs', 'Requisito', 'Totais']) assert.ok(!text.includes(leak), leak);
});

test('1b-r C on connector 0.3: the wave header and classes hold, decisions per class are recorded, the attempt is comparable', async (t) => {
  const seed = 5023;
  const o = r.prepareCase(seed, temp(t, 'p1b-r-oracle-c-'));
  const control = fakeControl();
  const driver = await scriptedDriver(t, control, competent(seed, o));
  const root = temp(t, 'p1b-r-c-');
  const { record, attemptDir } = await runAttempt({ kase: r, seed, arm: 'C', root, driver, health: health(), control });
  assert.deepEqual([record.dispatched, record.end, record.incident, record.comparable], [true, 'complete', null, true]);
  assert.deepEqual(record.coordination, { header: 'scoped-v1', held: true });
  const checks = record.waveTelemetry.flatMap((w) => w.checks);
  assert.ok(checks.some((c) => c.class === 'own' && (c.decisions.allowed ?? 0) > 0));
  assert.ok(checks.some((c) => c.class === 'dispute' && (c.decisions.allowed ?? 0) > 0));
  assert.ok(checks.some((c) => c.class === 'directed' && c.traces > 0), 'directed checks are written after an addressed trace');
  assert.ok(record.waveTelemetry.every((w) => Object.values(w.agents).every((a) => a.toolErrors === 0 && a.msRefusalToNextAccepted.every((g) => g === null || g >= 0))));
  assert.equal(record.studyCap, undefined, 'no ceiling unless the CLI passes the study balance');
  const text = JSON.stringify(record);
  for (const leak of [attemptDir, root, '.mjs', 'Requisito', 'Totais']) assert.ok(!text.includes(leak), leak);
});

test('1b-r C with a simulated 0.2 publisher (no header, no class): the attempt stops as policy_mismatch', async (t) => {
  const seed = 5023;
  const o = r.prepareCase(seed, temp(t, 'p1b-r-oracle-02-'));
  const control = fakeControl();
  const driver = await scriptedDriver(t, control, competent(seed, o));
  const { publishWave } = await import('../packages/connector-pi/coordination.js');
  const legacy = (dir, { coordination, checks, ...spec }) => publishWave(dir, { ...spec, checks: checks.map(({ class: _, ...c }) => c) });
  const { record } = await runAttempt({ kase: r, seed, arm: 'C', root: temp(t, 'p1b-r-02-'), driver, health: health(), control, publish: legacy });
  assert.deepEqual([record.dispatched, record.end, record.incident, record.comparable, record.waves], [true, 'incident', 'policy_mismatch', false, 1]);
  assert.deepEqual(record.coordination, { header: 'scoped-v1', held: false });
});

test('1b-r study ceiling inside an attempt: new spending stops at the balance and the in-flight excess is recorded', async (t) => {
  const seed = 5011;
  const o = r.prepareCase(seed, temp(t, 'p1b-r-oracle-cap-'));
  const control = fakeControl();
  const driver = await scriptedDriver(t, control, competent(seed, o));
  // A balance below one response of the faux provider: the first responses land, then every tool call is blocked.
  const { record } = await runAttempt({ kase: r, seed, arm: 'B', root: temp(t, 'p1b-r-cap-'), driver, health: health(), control, studyBalanceUsd: 1e-9 });
  assert.equal(record.end, 'study-brake');
  assert.equal(record.waves, 1, 'no wave starts after the ceiling');
  assert.ok(record.studyCap.blockedToolCalls > 0 && record.studyCap.stopped);
  assert.ok(record.studyCap.weightedUsd > 0 && record.studyCap.overspendUsd === record.studyCap.weightedUsd - record.studyCap.capUsd);
  assert.equal(record.studyCap.unknownResponses, 0);
  // With no balance left, no worker starts at all.
  const none = await runAttempt({ kase: r, seed, arm: 'B', root: temp(t, 'p1b-r-cap0-'), driver, health: health(), control, studyBalanceUsd: 0 });
  assert.deepEqual([none.record.dispatched, none.record.end, none.record.comparable], [false, 'study-brake', false]);
});

test('1b-r scoped facts on the local provider and the installed connector: s1, s2 and s3 hold, with no path or text', async (t) => {
  const control = fakeControl();
  const driver = await localDriver({ connectorEnv: { BIOSWARM_API_URL: 'http://control.test', BIOSWARM_API_KEY: 'k' }, fetchImpl: control.fetchImpl });
  t.after(() => driver.dispose());
  const root = temp(t, 'p1b-r-facts-');
  const out = await runScopedFacts({ root, driver, control });
  assert.deepEqual(out.facts, { s1: true, s2: true, s3: true }, JSON.stringify(out.detail));
  assert.equal(out.pass, true);
  assert.deepEqual(out.detail.s1.decisions.map((d) => [d.class, d.outcome, d.rule]), [['directed', 'refused', 'wait_for_trace'], ['own', 'allowed', null]]);
  assert.deepEqual(out.detail.s3.observations.map((o) => [o.loneWaves, o.fallback]), [[1, false], [2, false], [3, true]]);
  assert.deepEqual(readdirSync(root), [], 'the scratch runs are removed');
  const text = JSON.stringify(out);
  for (const leak of [root, 'S1-', 'Requisito']) assert.ok(!text.includes(leak), leak);
  // The facts can fail: a connector that lets the owner write a directed file without a trace breaks s1 (and s3).
  const loose = fakeControl({ fetch: { waitForTrace: false } });
  const looseDriver = await localDriver({ connectorEnv: { BIOSWARM_API_URL: 'http://control.test', BIOSWARM_API_KEY: 'k' }, fetchImpl: loose.fetchImpl });
  t.after(() => looseDriver.dispose());
  const bad = await runScopedFacts({ root, driver: looseDriver, control: loose });
  assert.deepEqual([bad.pass, bad.facts.s1, bad.facts.s3], [false, false, false]);
  // Not on a real model: the facts refuse any driver but the local one.
  await assert.rejects(runScopedFacts({ root, driver: { local: false }, control }), /local deterministic provider/);
});
