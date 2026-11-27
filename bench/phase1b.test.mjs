// Phase 1b instrument: fixtures, check map, verifier, waves, connector and bridge on real Pi sessions with Pi's
// faux provider. No network and no model calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fauxAssistantMessage, fauxToolCall, registerFauxProvider } from '@earendil-works/pi-ai/compat';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { assignment, currentWave } from '../packages/connector-pi/coordination.js';
import { calibrationSeeds, checkMap, design, inputHashes, opportunityTotals, prepareCase, sampleSeeds, team } from './phase1b/case.mjs';
import { verifyAttempt } from './phase1b/verify.mjs';
import { drainInbox } from './phase1b/bridge.js';
import { baseTools, fieldTools, piDriver } from './phase1b/driver.mjs';
import { arms, plan, runAttempt } from './phase1b/runner.mjs';
import { runFacts } from './phase1b/facts.mjs';
import { accepted, calibrationGate, costPerAccept, h1b01, h1b02, h1b03, longTask, opportunityGate, signTestP } from './phase1b/gates.mjs';
import manifest from './phase1b/manifest.json' with { type: 'json' };

const allSeeds = [...sampleSeeds, ...calibrationSeeds];
const solutionDir = join(import.meta.dirname, 'phase1b', 'fixtures', 'solution');
const solution = (seed, place) => readFileSync(join(solutionDir, place), 'utf8').replace('__MERGED__', design(seed).mergedShop);
const memoFor = (oracle) => {
  const totals = [...oracle.balances.values()].reduce((s, r) => s.map((v, i) => v + r[i]), [0, 0, 0, 0]);
  return `Totais anuais: bruto ${totals[0]}, créditos ${totals[1]}, recebido ${totals[2]}, diferença ${totals[3]}. Exceções: ${oracle.exceptions.size}.\n`;
};
const temp = (t, prefix) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('every seed offers at least two disputes and two directed conflicts, and the map is the frozen one', (t) => {
  const gate = opportunityGate();
  assert.equal(gate.pass, true);
  for (const seed of allSeeds) {
    const map = checkMap(seed);
    assert.equal(new Set(map.map((c) => c.id)).size, map.length, 'one ID per place');
    assert.equal(new Set(map.map((c) => c.place)).size, map.length);
    for (const c of map.filter((x) => x.class === 'directed')) assert.ok(!c.owners.includes(c.requirement.holder) && c.owners.length === 1);
    for (const c of map.filter((x) => x.class === 'dispute')) assert.equal(c.owners.length, 2);
    assert.deepEqual(manifest.seeds[seed].map, map);
    assert.deepEqual(manifest.seeds[seed].totals, gate.totals[seed]);
    assert.deepEqual(inputHashes(seed, temp(t, 'p1b-hash-')), manifest.seeds[seed].inputs, 'inputs are byte-identical to the frozen hashes');
  }
});

test('an independent solution from the raw exports passes every check; each discrepancy fails only its own check', (t) => {
  for (const seed of allSeeds) {
    const dir = temp(t, 'p1b-verify-');
    const oracle = prepareCase(seed, dir);
    const empty = verifyAttempt(dir, oracle);
    assert.equal(empty.failing.length, 6);
    assert.ok(empty.failing.every((c) => c.symptom.kind === 'missing'));
    for (const f of readdirSync(solutionDir)) writeFileSync(join(dir, f), solution(seed, f));
    writeFileSync(join(dir, 'close.md'), memoFor(oracle));
    const full = verifyAttempt(dir, oracle);
    assert.deepEqual(full.failing, []);
    assert.deepEqual(full.acceptance, { balances: true, exceptions: true, memoTotals: true });
    assert.equal(full.composed, true);
    // Without the requirement from another role's notes, the directed check fails, and only that check.
    const d = design(seed);
    const naive = {
      'shop-merge': ['orders.mjs', (s) => s.replace("r.shop === 'S10' ? merged : r.shop", 'r.shop'), 'orders'],
      'test-credits': ['refunds.mjs', (s) => s.replace("if (credit.startsWith('X')) continue;", ''), 'refunds'],
      'internal-transfers': ['payouts.mjs', (s) => s.replace("if (deposit.startsWith('T')) continue;", ''), 'payouts'],
    };
    for (const [quirk, [place, edit, id]] of Object.entries(naive)) {
      writeFileSync(join(dir, place), edit(solution(seed, place)));
      const v = verifyAttempt(dir, oracle);
      if (d.directed.includes(quirk)) {
        assert.deepEqual(v.failing.map((c) => c.id), [id], `seed ${seed} ${quirk}`);
        assert.equal(v.failing[0].symptom.kind, 'diverge');
        assert.match(v.failing[0].revision, /^[0-9a-f]{12}$/);
        assert.equal(v.acceptance.balances && v.acceptance.exceptions, false);
      } else assert.deepEqual(v.failing, [], `seed ${seed} without ${quirk}`);
      writeFileSync(join(dir, place), solution(seed, place));
    }
  }
});

test('the revision follows the discrepancy: same failure, same revision; changed failure, new revision', (t) => {
  const seed = 2011,
    dir = temp(t, 'p1b-rev-');
  const oracle = prepareCase(seed, dir);
  for (const f of readdirSync(solutionDir)) writeFileSync(join(dir, f), solution(seed, f));
  const broken = (n) => solution(seed, 'exceptions.mjs').replace('return lines.join', `lines.splice(1, ${n});\n  return lines.join`);
  writeFileSync(join(dir, 'exceptions.mjs'), broken(3));
  const a = verifyAttempt(dir, oracle).failing.find((c) => c.id === 'exceptions');
  const b = verifyAttempt(dir, oracle).failing.find((c) => c.id === 'exceptions');
  writeFileSync(join(dir, 'exceptions.mjs'), broken(4));
  const c = verifyAttempt(dir, oracle).failing.find((c) => c.id === 'exceptions');
  assert.equal(a.revision, b.revision);
  assert.notEqual(a.revision, c.revision);
  assert.deepEqual(a.symptom, { kind: 'diverge', divergent: 3, expected: oracle.exceptions.size });
  writeFileSync(join(dir, 'orders.mjs'), "import { writeFileSync } from 'node:fs';\nexport default () => { writeFileSync('escape.txt', 'x'); };\n");
  assert.equal(verifyAttempt(dir, oracle).failing.find((c) => c.id === 'orders').symptom.kind, 'error', 'modules cannot write');
  assert.throws(() => readFileSync(join(dir, 'escape.txt')));
});

test('plan: six seeds, the preregistered arm sequences, eighteen attempts', () => {
  const p = plan();
  assert.equal(p.length, 18);
  assert.deepEqual(sampleSeeds.map((s) => p.filter((x) => x.seed === s).map((x) => x.arm).join('')), ['ABC', 'BCA', 'CAB', 'ACB', 'CBA', 'BAC']);
  assert.deepEqual(arms.B.rules, { waitForTrace: false, tieBreak: null });
  assert.equal(arms.C.strategy, 'stigwait-tiebreak');
  assert.equal(arms.B.strategy, 'stigmergy');
});

test('the bridge delivers a queue once, atomically', (t) => {
  const inbox = temp(t, 'p1b-inbox-');
  writeFileSync(join(inbox, 'rui.jsonl'), JSON.stringify({ from: 'lia', message: 'a' }) + '\n');
  assert.deepEqual(drainInbox(inbox, 'rui'), [{ from: 'lia', message: 'a' }]);
  assert.deepEqual(drainInbox(inbox, 'rui'), []);
});

// Control stand-in: the two strategies as bioswarm-control a7c81f4 src/strategies.js defines them.
const strategies = {
  stigmergy: { runBudgetUsd: 3, messagesPerRun: 1, messageChars: 400, messagesPerSession: 4, gate: null },
  'stigwait-tiebreak': { runBudgetUsd: 3, messagesPerRun: 1, messageChars: 400, messagesPerSession: 4, gate: null, waitForTrace: true, tieBreak: 'hash' },
};
// tamper simulates a Control that answers differently from what the arm requires (on PUT, GET or both).
function fakeControl(tamper = {}) {
  const assigned = {};
  const policy = (agent, on) => {
    const a = assigned[agent];
    const rules = { ...strategies[a.strategy], ...(a.overrides ?? {}), ...(tamper[on] ?? {}) };
    return { protocol: 'bioswarm.v1', id: a.strategy + '@test', ttlSeconds: 300, rules };
  };
  return {
    assign: async (agent, strategy, overrides) => ((assigned[agent] = { strategy, overrides }), policy(agent, 'put')),
    get: async (agent) => policy(agent, 'get'),
    fetchImpl: async (url) => ({ ok: true, json: async () => policy(new URL(url).searchParams.get('agent'), 'fetch') }),
  };
}
const health = (bytes = () => 50e9) => ({
  pauseBytes: 10e9,
  availableBytes: bytes,
  hostSnapshot: () => ({ at: new Date().toISOString(), availableBytes: bytes(), loadAverage: [0, 0, 0], providerProcesses: 0 }),
  requireStartSpace: () => ({ at: new Date().toISOString(), availableBytes: 50e9, loadAverage: [0, 0, 0], providerProcesses: 0 }),
});

// Scripted Pi agents on the faux provider. Each turn performs the tool calls its script returns, one per response.
async function scriptedDriver(t, control, script, { expectModel } = {}) {
  const pending = {},
    prompts = [];
  const runtimes = {},
    models = {};
  for (const agent of team) {
    const faux = registerFauxProvider({ provider: 'faux-' + agent, models: [{ id: 'faux-1', reasoning: true }] }); // reasoning, so 'medium' applies
    t.after(() => faux.unregister());
    const model = faux.getModel();
    const dir = temp(t, 'p1b-rt-');
    const runtime = await ModelRuntime.create({ authPath: join(dir, 'auth.json'), modelsPath: join(dir, 'models.json') });
    await runtime.setRuntimeApiKey(model.provider, 'faux-key');
    runtime.registerProvider(model.provider, { baseUrl: model.baseUrl, api: model.api, models: [{ id: model.id, name: model.name, api: model.api, reasoning: model.reasoning, input: model.input, cost: model.cost, contextWindow: model.contextWindow, maxTokens: model.maxTokens, baseUrl: model.baseUrl }] });
    const step = (context) => {
      if (context.messages.at(-1)?.role === 'user') pending[agent].started = true;
      const next = pending[agent].calls.shift();
      if (next?.tool === '__provider_error') return fauxAssistantMessage([], { stopReason: 'error', errorMessage: 'HTTP 503 upstream connect error' });
      return next ? fauxAssistantMessage([fauxToolCall(next.tool, next.args)], { stopReason: 'toolUse' }) : fauxAssistantMessage('Feito.');
    };
    faux.setResponses(Array.from({ length: 4000 }, () => step));
    runtimes[agent] = runtime;
    models[agent] = model;
  }
  const base = piDriver({ runtimeFor: (a) => runtimes[a], modelFor: (a) => models[a], expectModel, connectorEnv: { BIOSWARM_API_URL: 'http://control.test', BIOSWARM_API_KEY: 'k' }, fetchImpl: control.fetchImpl });
  return {
    prompts,
    configuredEffort: base.configuredEffort,
    open: async (args) => {
      const inner = await base.open(args);
      return {
        ...inner,
        turn: (text, o) => {
          prompts.push({ agent: args.agent, arm: args.arm, text });
          pending[args.agent] = { calls: o.calls ?? script(args.agent, text, args.arm), started: false };
          return inner.turn(text, o);
        },
      };
    },
  };
}

// A competent scripted team. Under C the assigned writer tries first and the others address a trace to it at the end
// of their turn, so first attempts meet the wait-for-trace refusal. The memo is written from wave 2 on.
const competent = (seed, oracle) => (agent, text, arm) => {
  const failing = [...text.matchAll(/check (\S+) · arquivo (\S+) · elegíveis: ([^·]+) ·/g)].map((m) => ({ id: m[1], path: m[2], owners: m[3].trim().split(', ') }));
  const wave = Number(/Onda (\d+)\./.exec(text)[1]);
  const calls = [];
  for (const c of failing) {
    if (c.id === 'memo' && wave < 2) continue;
    const content = c.id === 'memo' ? memoFor(oracle) : solution(seed, c.path.split('/').at(-1));
    if (arm !== 'C') {
      if (c.owners[0] === agent) calls.push({ tool: 'write', args: { path: c.path, content } });
      continue;
    }
    const published = currentWave(join(dirname(dirname(c.path)), 'waves'));
    const writer = assignment(published, published.checks.find((x) => x.id === c.id), arms.C.rules).agent;
    if (writer === agent) calls.unshift({ tool: 'write', args: { path: c.path, content } });
    else calls.push({ tool: 'leave_mark', args: { kind: 'requirement', place: c.path, to: writer, text: 'Requisito do check.' } });
  }
  if (agent === 'rui' && wave === 1) calls.push({ tool: 'send_message', args: { to: 'lia', message: 'Mensagem privada de teste.' } });
  return calls;
};

for (const arm of ['A', 'B', 'C']) {
  test(`arm ${arm}: a full attempt completes through waves, with count-only telemetry and the received policy`, async (t) => {
    const seed = 2027;
    const oracle = prepareCase(seed, temp(t, 'p1b-oracle-'));
    const control = fakeControl();
    const driver = await scriptedDriver(t, control, competent(seed, oracle));
    const root = temp(t, 'p1b-root-');
    const { record, attemptDir } = await runAttempt({ seed, arm, root, driver, health: health(), control, verifyTimeoutMs: 30000 });
    assert.equal(record.end, 'complete');
    assert.equal(record.deterministicAccepted, true);
    assert.equal(record.comparable, true);
    assert.equal(record.policyReceived, true);
    assert.equal(record.participants, 3);
    assert.equal(record.manipulation.messages.rui.accepted, 1);
    assert.ok(record.waves >= 2 && record.waves <= 12);
    assert.ok(record.observedWallSeconds > 0 && record.observedWallSeconds <= record.totalSeconds);
    assert.equal(record.budget.agents, 3);
    if (arm === 'C') {
      assert.ok(record.manipulation.addressedRequirements > 0);
      assert.ok(record.manipulation.rulesFired.wait_for_trace >= 1, 'first attempts wait for a trace');
    }
    if (arm === 'A') assert.deepEqual(record.manipulation.rulesFired, {});
    const text = JSON.stringify(record);
    for (const secret of [attemptDir, root, 'Mensagem privada', 'Requisito do check', 'Totais anuais', '.mjs', '.csv', '.md']) assert.ok(!text.includes(secret), 'telemetry must not hold ' + secret);
    const firstWave = driver.prompts.filter((p) => /Onda 1\./.test(p.text));
    assert.equal(firstWave.length, 3);
    assert.ok(driver.prompts.some((p) => p.agent === 'lia' && /de rui: Mensagem privada de teste\./.test(p.text)), 'delivered at the next wave');
  });
}

test('the three arms see identical observations and requests on the same seed', async (t) => {
  const seed = 1103,
    seen = {};
  for (const arm of ['A', 'B', 'C']) {
    const control = fakeControl();
    const driver = await scriptedDriver(t, control, () => []);
    const { record, attemptDir } = await runAttempt({ seed, arm, root: temp(t, 'p1b-same-'), driver, health: health(), control });
    assert.equal(record.end, 'idle');
    assert.equal(record.waves, 6);
    assert.equal(record.idleStop, true);
    assert.equal(record.deterministicAccepted, false);
    seen[arm] = driver.prompts.map((p) => p.agent + '|' + p.text.replaceAll(attemptDir, '<attempt>'));
  }
  assert.deepEqual(seen.A, seen.B);
  assert.deepEqual(seen.B, seen.C);
  assert.deepEqual(baseTools, ['read', 'ls', 'grep', 'find', 'edit', 'write', 'send_message']);
  assert.deepEqual(fieldTools, ['leave_mark', 'read_marks', 'coordination_status']);
});

test('C sends overrides fallbackAfter 3, verifies PUT and GET for all three agents, and refuses any divergence', async (t) => {
  const ok = fakeControl();
  const { assignTeam } = await import('./phase1b/policy.mjs');
  const verified = await assignTeam(ok, 'C', team);
  assert.equal(verified.rules.fallbackAfter, 3);
  assert.equal(verified.rules.waitForTrace, true);
  assert.equal(verified.rules.tieBreak, 'hash');
  assert.equal((await assignTeam(fakeControl(), 'B', team)).rules.fallbackAfter, undefined);
  for (const [tamper, why] of [
    [{ put: { fallbackAfter: 2 } }, /fallbackAfter/],
    [{ get: { fallbackAfter: 2 } }, /fallbackAfter/],
    [{ put: { tieBreak: null } }, /tieBreak/],
    [{ get: { waitForTrace: false } }, /waitForTrace/],
  ]) {
    const control = fakeControl(tamper);
    const driver = await scriptedDriver(t, control, () => []);
    const root = temp(t, 'p1b-diverge-');
    const { record } = await runAttempt({ seed: 2011, arm: 'C', root, driver, health: health(), control });
    assert.deepEqual([record.dispatched, record.incident, record.comparable], [false, 'policy_mismatch', false]);
    assert.match(record.reason, why);
    assert.deepEqual(readdirSync(root), [], 'a refused attempt leaves nothing behind');
  }
  // B receiving C-only keys is a divergence too.
  await assert.rejects(assignTeam(fakeControl({ put: { fallbackAfter: 3 } }), 'B', team), /fallbackAfter/);
});

test('six waves without an accepted effective action stop the attempt equally; refusals do not count, yield marks do', async (t) => {
  // C: lia keeps trying the memo without a trace. Every attempt is refused, so nothing counts.
  const control = fakeControl();
  const lonely = await scriptedDriver(t, control, (agent, text) => (agent === 'lia' ? [...text.matchAll(/check memo · arquivo (\S+)/g)].map((m) => ({ tool: 'write', args: { path: m[1], content: 'x' } })) : []));
  const refused = (await runAttempt({ seed: 2011, arm: 'C', root: temp(t, 'p1b-idle-'), driver: lonely, health: health(), control })).record;
  assert.equal(refused.end, 'idle');
  assert.equal(refused.waves, 6);
  assert.equal(refused.participants, 0);
  assert.equal(refused.review, 'missing', 'no memo when the attempt closed');
  assert.equal(refused.incident, null);
  assert.equal(refused.comparable, true, 'an idle stop is an acceptance failure, not an incident');
  assert.ok(refused.toolCalls.lia.attempted.write >= 6);
  assert.equal(refused.toolCalls.lia.accepted.write ?? 0, 0);
  assert.ok(refused.weightedUsd >= 0 && refused.tokens.cacheRead + refused.tokens.input > 0, 'cost and tokens kept');
  // C: the non-assigned owner of a dispute tries to write; the connector writes its yield mark, which counts.
  const map = checkMap(2011);
  const dispute = map.find((c) => c.class === 'dispute');
  const yielding = await scriptedDriver(t, control, (agent, text) => {
    const m = new RegExp('check ' + dispute.id + ' · arquivo (\\S+)').exec(text);
    if (!m || !dispute.owners.includes(agent)) return [];
    const w = currentWave(join(dirname(dirname(m[1])), 'waves'));
    return assignment(w, w.checks.find((x) => x.id === dispute.id), arms.C.rules).agent === agent ? [] : [{ tool: 'write', args: { path: m[1], content: 'x' } }];
  });
  // With an idle limit of 2 and a cap of 8 waves, only counted yield marks can carry the attempt to the cap.
  const y = (await runAttempt({ seed: 2011, arm: 'C', root: temp(t, 'p1b-yield-'), driver: yielding, health: health(), control, idleWavesLimit: 2, limits: { attemptMs: 10 * 60 * 1000, perTurnUsd: 3, teamUsd: 9, fallbackAfter: 3, diskSampleMs: 5000, maxWaves: 8 } })).record;
  assert.equal(y.end, 'wave-cap', 'yield marks keep the attempt active');
  assert.equal(y.waves, 8);
  assert.equal(y.participants, 2);
  assert.ok(team.reduce((s, a) => s + y.toolCalls[a].yieldMarks, 0) >= y.waves);
  assert.deepEqual(y.observedOpportunities, opportunityTotals(2011), 'every published failing ID counts once per class');
});

test('read gate on the local provider: real paths by decision only, canaries refused in three forms, nothing leaks', async (t) => {
  const control = fakeControl();
  const { localDriver } = await import('./phase1b/localdriver.mjs');
  const { runReadGate } = await import('./phase1b/integrity.mjs');
  const local = await localDriver({ connectorEnv: { BIOSWARM_API_URL: 'http://control.test', BIOSWARM_API_KEY: 'k' }, fetchImpl: control.fetchImpl });
  t.after(() => local.dispose());
  // "Real" protected files stand in with fictitious content, and are made unreadable: the decision must not need a read.
  const secrets = temp(t, 'p1b-secrets-');
  for (const f of ['blind-key.jsonl', 'auth.json', 'control_key']) writeFileSync(join(secrets, f), 'SEGREDO-FICTICIO', { mode: 0o000 });
  const realPaths = { answerKey: readdirSync(solutionDir).map((f) => join(solutionDir, f)), blindKey: [join(secrets, 'blind-key.jsonl')], credentials: [join(secrets, 'auth.json'), join(secrets, 'control_key')] };
  const out = await runReadGate({ root: temp(t, 'p1b-gate-'), driver: local, control, realPaths });
  assert.equal(out.pass, true);
  for (const arm of ['A', 'B', 'C']) assert.deepEqual(out.arms[arm], { realDecision: { answerKey: true, blindKey: true, credentials: true }, canary: { answerKey: { refused: true }, blindKey: { refused: true }, credentials: { refused: true } }, noLeak: true, taskRead: true, pass: true });
  const receipt = JSON.stringify(out);
  for (const leak of [secrets, 'SEGREDO', 'CANARIO', solutionDir]) assert.ok(!receipt.includes(leak), 'receipt must not hold ' + leak);
  // Fail-open: a broken sandbox that allows everything. The gate fails, and still nothing could reach a model:
  // the gate refuses any driver that is not the local one.
  const broken = await runReadGate({ root: temp(t, 'p1b-open-'), driver: local, control, realPaths, rootsFor: () => ['/'] });
  assert.equal(broken.pass, false);
  for (const arm of ['A', 'B', 'C']) {
    assert.deepEqual(broken.arms[arm].realDecision, { answerKey: false, blindKey: false, credentials: false });
    assert.equal(broken.arms[arm].noLeak, false, 'the canary text was readable locally, so the gate fails');
  }
  assert.ok(!JSON.stringify(broken).includes('CANARIO'), 'even then the receipt holds booleans only');
  const remote = await scriptedDriver(t, control, () => []);
  await assert.rejects(runReadGate({ root: temp(t, 'p1b-remote-'), driver: remote, control, realPaths }), /local deterministic provider/);
  // The shared resolver: symlinks and relative paths resolve before the decision.
  const { realTarget, sandboxAllows } = await import('./phase1b/driver.mjs');
  const { symlinkSync } = await import('node:fs');
  const box = temp(t, 'p1b-link-');
  symlinkSync(join(secrets, 'auth.json'), join(box, 'innocent.md'));
  assert.equal(realTarget(box, 'innocent.md'), realpathSync(join(secrets, 'auth.json')));
  assert.equal(sandboxAllows(box, [box], 'innocent.md').allowed, false);
  assert.equal(sandboxAllows(box, [box], '../' + secrets.split('/').at(-1) + '/auth.json').allowed, false);
  assert.equal(sandboxAllows(box, [box], 'novo/arquivo.mjs').allowed, true);
});

// A stand-in for svc-tool: logs each call, then runs the command; 'separate' simulates another UID and a denied network.
function fakeTool(t, { separate = true } = {}) {
  const dir = temp(t, 'p1b-tool-');
  const log = join(dir, 'calls.log'),
    tool = join(dir, 'svc-tool');
  writeFileSync(tool, `#!/bin/sh\n[ "$1" = "--" ] && shift\necho "$1" >> ${log}\n` + (separate ? `[ "$1" = "/usr/bin/id" ] && { echo 4242; exit 0; }\n[ "$1" = "/bin/cat" ] && { echo FAKE-CGROUP; exit 0; }\ncase "$*" in *net*connect*) exit 7;; esac\n` : `[ "$1" = "/bin/cat" ] && { echo FAKE-CGROUP; exit 0; }\n`) + 'exec "$@"\n', { mode: 0o755 });
  return { tool, calls: () => readFileSync(log, 'utf8').trim().split('\n') };
}

test('worker modules run through the isolation tool with the receipt; a failed receipt refuses before dispatch', async (t) => {
  const { isolationReceipt } = await import('./phase1b/isolation.mjs');
  const good = fakeTool(t);
  assert.deepEqual(isolationReceipt(good.tool, { ownCgroup: () => 'FAKE-CGROUP\n' }), { separateUser: true, sameCgroup: true, networkDenied: true, pass: true });
  const same = fakeTool(t, { separate: false });
  assert.equal(isolationReceipt(same.tool, { ownCgroup: () => 'FAKE-CGROUP' }).separateUser, false);
  // The verifier through the tool: same results, and every module call went through it.
  const seed = 2027,
    dir = temp(t, 'p1b-tool-task-');
  const oracle = prepareCase(seed, dir);
  for (const f of readdirSync(solutionDir)) writeFileSync(join(dir, f), solution(seed, f));
  writeFileSync(join(dir, 'close.md'), memoFor(oracle));
  const before = good.calls().length;
  const v = verifyAttempt(dir, oracle, { tool: good.tool });
  assert.deepEqual(v.failing, []);
  assert.ok(v.composed);
  assert.deepEqual(good.calls().slice(before), Array(7).fill(process.execPath), 'three sources, two references, two compositions');
  assert.equal((await import('node:fs')).statSync(join(dir, 'orders.mjs')).mode & 0o777, 0o640);
  // Runner: on a real host the receipt reads /proc; here it cannot, so the attempt is refused as host_preflight.
  const control = fakeControl();
  const driver = await scriptedDriver(t, control, () => []);
  const root = temp(t, 'p1b-tool-root-');
  const { record } = await runAttempt({ seed, arm: 'A', root, driver, health: health(), control, tool: same.tool });
  assert.deepEqual([record.dispatched, record.incident], [false, 'host_preflight']);
  assert.equal(record.isolation.pass, false);
  assert.deepEqual(readdirSync(root), []);
});

test('identity and policy gate: account, model, effort and received policy stop the attempt before the verifier', async (t) => {
  const seed = 2039;
  const lazy = () => [];
  // Account: the subscription sign-in disappears after the first wave.
  let calls = 0;
  const control = fakeControl();
  const d1 = await scriptedDriver(t, control, lazy);
  const acc = (await runAttempt({ seed, arm: 'A', root: temp(t, 'p1b-acc-'), driver: d1, health: health(), control, identity: async () => ({ oauth: true, subscription: ++calls < 2 }) })).record;
  assert.deepEqual([acc.dispatched, acc.end, acc.incident, acc.comparable, acc.waves], [true, 'incident', 'wrong_account', false, 1]);
  assert.equal(acc.verifications.length, 1, 'the verifier did not run after the incident');
  assert.ok(Object.values(acc.tokens).reduce((a, b) => a + b, 0) > 0 && acc.modelResponses === 3, 'cost and tokens already spent are kept');
  const refusedAccount = (await runAttempt({ seed, arm: 'A', root: temp(t, 'p1b-acc0-'), driver: d1, health: health(), control, identity: async () => ({ oauth: false, subscription: false }) })).record;
  assert.deepEqual([refusedAccount.dispatched, refusedAccount.incident], [false, 'wrong_account']);
  // Model: the session answers with another model id than the one required.
  const d2 = await scriptedDriver(t, control, lazy, { expectModel: 'gpt-6.1-sol' });
  const model = (await runAttempt({ seed, arm: 'B', root: temp(t, 'p1b-model-'), driver: d2, health: health(), control })).record;
  assert.deepEqual([model.end, model.incident, model.waves], ['incident', 'wrong_model', 1]);
  // Effort: the session applies another level than the configured one.
  const d3 = await scriptedDriver(t, control, lazy);
  const lowered = { ...d3, open: async (args) => ({ ...(await d3.open(args)), effort: () => 'low' }) };
  const effort = (await runAttempt({ seed, arm: 'C', root: temp(t, 'p1b-effort-'), driver: lowered, health: health(), control })).record;
  assert.deepEqual([effort.dispatched, effort.incident], [false, 'wrong_effort']);
  // Policy: the connector receives fallbackAfter 2 although the runner verified 3.
  const drift = fakeControl({ fetch: { fallbackAfter: 2 } });
  const d4 = await scriptedDriver(t, drift, lazy);
  const pol = (await runAttempt({ seed, arm: 'C', root: temp(t, 'p1b-pol-'), driver: d4, health: health(), control: drift })).record;
  assert.deepEqual([pol.dispatched, pol.end, pol.incident, pol.comparable], [true, 'incident', 'policy_mismatch', false]);
  assert.deepEqual(pol.effort, { configured: 'medium', effective: 'medium', returnedByProvider: null });
});

test('disk below the pause floor stops the attempt as an incident', async (t) => {
  const control = fakeControl();
  const driver = await scriptedDriver(t, control, () => [{ tool: 'read', args: { path: 'x' } }]);
  let calls = 0;
  const { record } = await runAttempt({ seed: 2039, arm: 'A', root: temp(t, 'p1b-disk-'), driver, health: health(() => (++calls > 1 ? 5e9 : 50e9)), control, idleWavesLimit: 1000, limits: { attemptMs: 60000, perTurnUsd: 3, teamUsd: 9, fallbackAfter: 3, diskSampleMs: 5 } });
  assert.equal(record.end, 'disk');
  assert.equal(record.comparable, false);
  assert.equal(record.incident, 'host_disk');
  assert.equal(record.host.minAvailableBytes, 5e9);
});

test('the four integrity facts hold on the received C policy and the 1b check representation', async (t) => {
  const control = fakeControl();
  const driver = await scriptedDriver(t, control, () => []);
  const result = await runFacts({ root: temp(t, 'p1b-facts-'), driver, control, seed: 2011 });
  assert.deepEqual(result.facts, { i: true, ii: true, iii: true, iv: true });
  assert.equal(result.policyReceived, true);
  assert.equal(result.pass, true);
  assert.deepEqual(result.observations.map((o) => [o.wave, o.loneWaves, o.fallback, o.outsider]), [[2, 1, false, false], [3, 2, false, false], [4, 3, true, true]]);
  assert.deepEqual(result.firstOwnerChange, { wave: 4, observation: 3, outsider: true, addressedTrace: true });
  assert.equal(result.fallbackAfter, 3);
  assert.ok(result.rulesFired.wait_for_trace >= 1 && result.rulesFired.message_ceiling === 1 && result.rulesFired.stalled_check_reassigned === 1);
  // A numeric summary per turn, with no prompt, path, argument or provider text.
  assert.equal(result.aborted, null);
  assert.equal(result.turns.length, 12);
  for (const s of result.turns) {
    assert.deepEqual(Object.keys(s), ['n', 'agent', 'step', 'durationMs', 'responses', 'tokens', 'hostUsd', 'providerErrors', 'errorCodes', 'stopReasons', 'http429', 'retries', 'toolsExpected', 'toolsAttempted', 'toolsAccepted', 'refusals', 'readDenials', 'timedOut', 'failed', 'wrongModel']);
    assert.equal(s.toolsAttempted, s.toolsExpected);
    assert.ok(s.responses >= 1 && s.providerErrors === 0 && !s.failed && !s.timedOut);
  }
  assert.ok(result.turns.some((s) => s.refusals > 0) && result.turns.some((s) => s.step === 'ceiling' && s.toolsAccepted < s.toolsAttempted));
  const text = JSON.stringify(result.turns);
  for (const leak of ['Use a ferramenta', 'FACT-', '/', 'Requisito']) assert.ok(!text.includes(leak), leak);
});

test('facts fail fast when the transport fails before any mechanism was observed', async (t) => {
  const control = fakeControl();
  const base = await scriptedDriver(t, control, () => []);
  // Every model response of the run is a provider error (the BenchHost symptom: connection errors, no tokens, no tools).
  const driver = { ...base, open: async (args) => { const h = await base.open(args); return { ...h, turn: (text, o) => h.turn(text, { ...o, calls: Array(8).fill({ tool: '__provider_error' }) }) }; } };
  const result = await runFacts({ root: temp(t, 'p1b-facts-fail-'), driver, control, seed: 2011 });
  assert.deepEqual(result.aborted, { reason: 'transport', atTurn: 1 });
  assert.equal(result.pass, false);
  assert.equal(result.turns.length, 1, 'no further turn after the transport failure');
  const [s] = result.turns;
  assert.ok(s.providerErrors >= 1 && s.toolsAttempted === 0);
  assert.ok(s.errorCodes.includes(503), 'the HTTP status is kept as a number');
  assert.ok(!JSON.stringify(result.turns).includes('upstream'), 'no provider text');
  assert.deepEqual(result.marks, {});
  assert.deepEqual(result.rulesFired, {});
});

test('receipts are numbered, read-only and never overwritten; the HTTP bootstrap runs once and keeps proxy settings', async (t) => {
  const { writeReceipt } = await import('./phase1b/receipts.mjs');
  const { statSync } = await import('node:fs');
  const dir = join(temp(t, 'p1b-receipts-'), 'facts-runs');
  const a = writeReceipt(dir, { pass: false, marks: {} });
  const b = writeReceipt(dir, { pass: false, marks: {} });
  assert.deepEqual([a, b].map((f) => f.split('/').at(-1)), ['0001.json', '0002.json']);
  assert.equal(statSync(a).mode & 0o777, 0o400);
  if (process.getuid() !== 0) assert.throws(() => writeFileSync(a, 'x'), /EACCES|EPERM/); // root (CI) ignores the mode
  assert.throws(() => writeFileSync(a, 'x', { flag: 'wx' }), /EEXIST/, 'receipts are created exclusively');
  assert.deepEqual(JSON.parse(readFileSync(a, 'utf8')), { pass: false, marks: {} });
  // In a child process, so the test process keeps its own fetch.
  const { spawnSync } = await import('node:child_process');
  const http = join(import.meta.dirname, 'phase1b', 'http.mjs');
  const probe = `const m = await import(${JSON.stringify('file://' + http)}); const first = await m.bootstrapHttp(); const second = await m.bootstrapHttp(); const { createRequire } = await import('node:module'); const undici = createRequire(${JSON.stringify(http)})(createRequire(${JSON.stringify(http)}).resolve('undici', { paths: [${JSON.stringify(dirname(dirname(fileURLToPath(import.meta.resolve('@earendil-works/pi-coding-agent')))))}] })); const d = undici.getGlobalDispatcher(); console.log(JSON.stringify({ first, second, dispatcher: d instanceof undici.EnvHttpProxyAgent ? 'EnvHttpProxyAgent' : d?.constructor?.name, proxy: process.env.HTTPS_PROXY, noProxy: process.env.NO_PROXY }));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { encoding: 'utf8', env: { PATH: process.env.PATH, HTTPS_PROXY: 'http://127.0.0.1:18443', NO_PROXY: '172.26.0.2' } });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { first: true, second: false, dispatcher: 'EnvHttpProxyAgent', proxy: 'http://127.0.0.1:18443', noProxy: '172.26.0.2' });
});

// Decisions on synthetic records (labelled example data, not results).
const rec = (seed, arm, weightedUsd, wall, review = 'accepted', acc = true) => ({ seed, arm, weightedUsd, observedWallSeconds: wall, review, deterministicAccepted: acc, acceptance: { balances: acc, exceptions: acc, memoTotals: acc }, comparable: true, end: 'complete' });
test('pre-specified decisions, cost per accept and calibration gate', () => {
  const pairsOf = (b, c, extra = {}) => sampleSeeds.flatMap((s, i) => [rec(s, 'B', b[i], extra.bw?.[i] ?? 3000), rec(s, 'C', c[i], extra.cw?.[i] ?? 2000)]);
  assert.equal(h1b01(pairsOf([5, 5, 5, 5, 5, 5], [4, 4, 4, 4, 4, 6])), 'sustentada');
  assert.equal(h1b01(pairsOf([4, 4, 4, 4, 5, 5], [5, 5, 5, 5, 4, 4])), 'refutada');
  assert.equal(h1b01(pairsOf([5, 5, 5, 4, 4, 4], [4, 4, 4, 5, 5, 5])), 'inconclusiva');
  const pending = pairsOf([5, 5, 5, 5, 5, 5], [4, 4, 4, 4, 4, 4]);
  pending[3].review = 'indeterminate';
  assert.equal(h1b01(pending), 'inconclusiva');
  assert.equal(h1b01(pairsOf([5, 5, 5, 5, 5, 5], [4, 4, 4, 4, 4, 4]).slice(1)), 'inconclusiva');
  assert.equal(costPerAccept([rec(1, 'B', 3, 1), rec(2, 'B', 5, 1, 'rejected')]), 8);
  assert.equal(costPerAccept([rec(1, 'B', 3, 1, 'rejected')]), null);
  assert.equal(accepted(rec(1, 'B', 1, 1, 'pending')), null);
  assert.equal(h1b02(pairsOf([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1], { bw: [10, 10, 10, 10, 10, 1], cw: [5, 5, 5, 5, 5, 9] })), 'sustentada');
  assert.equal(h1b02(pairsOf([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1], { bw: [5, 5, 5, 5, 10, 10], cw: [5, 6, 7, 8, 1, 1] })), 'refutada');
  const q = (cRev) => sampleSeeds.flatMap((s, i) => [rec(s, 'B', 1, 1, 'rejected', true), rec(s, 'C', 1, 1, cRev[i], true)]);
  assert.equal(h1b03(q(['accepted', 'accepted', 'accepted', 'accepted', 'rejected', 'rejected'])), 'sustentada');
  assert.equal(h1b03(q(['rejected', 'rejected', 'rejected', 'rejected', 'accepted', 'accepted'])), 'sem separação');
  assert.equal(signTestP(5, 6), 0.21875);
  assert.equal(signTestP(6, 6), 0.03125);
  const cal = (seed, wall, extra = {}) => ({ seed, arm: 'A', comparable: true, participants: 3, observedWallSeconds: wall, observedOpportunities: { dispute: 2, directed: 2 }, ...extra });
  assert.equal(calibrationGate([cal(2011, 1700), cal(2027, 1900), cal(2039, 2500)]).pass, true);
  assert.equal(calibrationGate([cal(2011, 1700), cal(2027, 1799), cal(2039, 2500)]).pass, false);
  assert.equal(calibrationGate([cal(2011, 1900), cal(2027, 1900, { participants: 2 }), cal(2039, 2500)]).pass, false);
  assert.equal(calibrationGate([cal(2011, 1900), cal(2027, 1900, { observedOpportunities: { dispute: 2, directed: 1 } }), cal(2039, 2500)]).pass, false);
  assert.equal(longTask(sampleSeeds.map((s) => cal(s, 1800))), true);
});
