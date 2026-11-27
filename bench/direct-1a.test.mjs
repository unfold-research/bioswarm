// Deterministic checks of the Phase 1a direct-host runner. No model call, no network, no Control.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { claim, enqueue, initializeQueue, queueCounts, waiting } from './bridge-queue.mjs';
import {
  connectorBlobs, connectorRevision, gitBlob, inbox, measureTurns, piArgs, runTeam, sampleGate, sessionFiles,
  smokeVerdict, verifyConnector,
} from './direct-1a-core.mjs';
import installBridge from './pi-bridge/index.js';

const repo = resolve(import.meta.dirname, '..');
const fake = join(import.meta.dirname, 'fixtures', 'fake-pi.mjs');

function trio(root) {
  const queue = join(root, 'queue.sqlite');
  initializeQueue(queue);
  const ids = ['agent-a', 'agent-b', 'agent-c'], names = { 'agent-a': 'Lia', 'agent-b': 'Davi', 'agent-c': 'Otto' };
  for (const id of ids) {
    mkdirSync(join(root, 'agents', id), { recursive: true });
    mkdirSync(join(root, 'sessions', id), { recursive: true });
    writeFileSync(join(root, 'agents', id, '.phase1-bridge'), JSON.stringify({ queue, team: ids.map((x) => ({ id: x, name: names[x] })) }));
  }
  return { queue, ids, names };
}
const launch = (root, t, script, extra = {}) =>
  runTeam({
    command: [process.execPath, fake], agents: t.ids, names: t.names, queue: t.queue,
    stages: [[{ agent: t.ids[0], prompt: 'start' }]], deadlineMs: 30000, pollMs: 20,
    cwdFor: (id) => join(root, 'agents', id),
    envFor: () => ({ PATH: process.env.PATH, FAKE_SCRIPT: JSON.stringify(script) }),
    argsFor: (id, prompt) => piArgs({ sessionDir: join(root, 'sessions', id), sessionId: id + '-s', extensions: [], system: 's', prompt }),
    ...extra,
  });

test('frozen connector is pinned to the 0.1 blobs at 2d1dd01', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'conn-'));
  try {
    for (const file of Object.keys(connectorBlobs)) {
      const r = spawnSync('git', ['-C', repo, 'show', connectorRevision + ':packages/connector-pi/' + file]);
      if (r.status !== 0) return t.skip('git history unavailable');
      writeFileSync(join(dir, file), r.stdout);
      assert.equal(gitBlob(r.stdout), connectorBlobs[file]);
    }
    assert.deepEqual(verifyConnector(dir), { version: '0.1.0', revision: connectorRevision });
    writeFileSync(join(dir, 'policy.js'), readFileSync(join(dir, 'policy.js'), 'utf8') + '\n');
    assert.throws(() => verifyConnector(dir), /frozen 0.1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('bridge queues accepted messages durably and counts refusals without text', async () => {
  const root = mkdtempSync(join(tmpdir(), 'bridge-'));
  try {
    const t = trio(root);
    let tool;
    installBridge({ registerTool: (x) => (tool = x) }, join(root, 'agents', 'agent-a'));
    assert.equal(tool.name, 'send_message');
    assert.match(tool.description, /Davi, Otto/);
    await tool.execute('1', { to: 'davi', message: 'primeiro' });
    await tool.execute('2', { to: 'agent-b', message: 'segundo' });
    await assert.rejects(tool.execute('3', { to: 'Lia', message: 'eu' }), /Not sent/);
    await assert.rejects(tool.execute('4', { to: 'Zé', message: 'x' }), /Not sent/);
    await assert.rejects(tool.execute('5', { to: 'Otto', message: '  ' }), /Not sent/);
    assert.deepEqual(waiting(t.queue), ['agent-b']);
    const counts = queueCounts(t.queue);
    assert.deepEqual(counts.accepted, { 'agent-a': 2 });
    assert.deepEqual(counts.refused.map((r) => r.reason).sort(), ['empty', 'self', 'unknown_recipient']);
    assert.doesNotMatch(JSON.stringify(counts), /primeiro|segundo/);
    const got = claim(t.queue, 'agent-b', 't9');
    assert.deepEqual(got.map((m) => m.body), ['primeiro', 'segundo']);
    assert.deepEqual(claim(t.queue, 'agent-b', 't10'), []);
    assert.equal(queueCounts(t.queue).undelivered, 0);
    assert.match(inbox(got, t.names), /^Mensagem de Lia \(send_message\):\nprimeiro\n\nMensagem de Lia/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('trio runs concurrently on persistent sessions until nothing waits', async () => {
  const root = mkdtempSync(join(tmpdir(), 'trio-'));
  try {
    const t = trio(root);
    const run = await launch(root, t, {
      'Lia#1': { sleep: 50, send: [['Davi', 'a'], ['Otto', 'b']] },
      'Davi#1': { sleep: 600, send: [['Lia', 'feito']] },
      'Otto#1': { sleep: 600, retry: 2 },
      'Lia#2': { expect: 'Mensagem de Davi (send_message):\nfeito' },
    });
    assert.equal(run.timedOut, false);
    assert.equal(run.diskPaused, false);
    const m = measureTurns(run.turns, run.start, t.ids);
    assert.deepEqual(m.turnsByRole, [2, 1, 1]);
    assert.equal(m.failedTurns, 0);
    assert.equal(m.contributors, 3);
    assert.ok(run.maxWorkers >= 2, 'Davi and Otto worked at the same time');
    assert.ok(m.observedWallSeconds < m.agentSeconds, 'concurrent work counted once');
    assert.deepEqual(m.tokens, { uncachedInput: 400, cachedInput: 200, cacheCreation: 20, output: 80 });
    assert.deepEqual(m.provider, { http429: 0, retries: 2 });
    assert.deepEqual(m.models, ['gpt-6.1-sol']);
    assert.equal(m.estimatedUsd.toFixed(3), '0.004');
    for (const id of t.ids) assert.equal(sessionFiles(join(root, 'sessions', id)), 1);
    const lia = readFileSync(join(root, 'sessions', 'agent-a', 'agent-a-s.jsonl'), 'utf8').trim().split('\n');
    assert.equal(lia.length, 2, 'second turn resumed the same session');
    assert.equal(queueCounts(t.queue).undelivered, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('opening stages wait for the previous stage, as the smoke needs', async () => {
  const root = mkdtempSync(join(tmpdir(), 'stage-'));
  try {
    const t = trio(root);
    const run = await launch(root, t, { 'Davi#1': { sleep: 300 } }, {
      stages: [[{ agent: t.ids[1], prompt: 'x' }], [{ agent: t.ids[2], prompt: 'y' }, { agent: t.ids[0], prompt: 'z' }]],
    });
    const [first, ...rest] = run.turns;
    assert.equal(first.agent, 'agent-b');
    assert.ok(rest.every((r) => r.startedMs >= first.endedMs));
    assert.equal(run.maxWorkers, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('deadline and disk floor stop the trio and are reported', async () => {
  const root = mkdtempSync(join(tmpdir(), 'stop-'));
  try {
    const t = trio(root);
    const late = await launch(root, t, { 'Lia#1': { sleep: 60000 } }, { deadlineMs: 500 });
    assert.equal(late.timedOut, true);
    assert.equal(late.turns[0].signal, 'SIGTERM');
    const disk = await launch(root, t, {}, { diskDir: root, diskEveryMs: 0, floorBytes: Infinity });
    assert.equal(disk.diskPaused, true);
    assert.equal(disk.turns.length, 0, 'nothing starts below the floor');
    assert.ok(disk.minAvailableBytes > 0);
    const errorRoot = join(root, 'error-case');
    mkdirSync(errorRoot);
    const failed = await launch(errorRoot, trio(errorRoot), { 'Lia#1': { error: true } });
    assert.equal(measureTurns(failed.turns, failed.start, t.ids).failedTurns, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Pi arguments pin model, effort, persistent session and explicit extensions only', () => {
  const a = piArgs({ sessionDir: '/s', sessionId: 'u', extensions: ['/b.js', '/c.js'], system: 'sys', prompt: 'p' });
  const at = (f) => a[a.indexOf(f) + 1];
  assert.equal(at('--model'), 'gpt-6.1-sol');
  assert.equal(at('--provider'), 'openai');
  assert.equal(at('--thinking'), 'medium');
  assert.equal(at('--session-id'), 'u');
  assert.equal(at('--session-dir'), '/s');
  for (const f of ['--no-extensions', '--no-mcp', '--no-skills', '--no-context-files']) assert.ok(a.includes(f));
  assert.ok(!a.includes('--no-session'));
  assert.deepEqual(a.filter((x, i) => a[i - 1] === '-e'), ['/b.js', '/c.js']);
});

const ids = ['agent-l', 'agent-o', 'agent-a'];
const goodEvents = () => [
  [
    { type: 'policy', kind: 'remote' }, { type: 'mark' }, { type: 'tool', tool: 'send_message' }, { type: 'message_sent' },
    { type: 'tool', tool: 'send_message' }, { type: 'rule', rule: 'message_ceiling' }, { type: 'mark' },
    { type: 'read_marks', count: 4 }, { type: 'tool', tool: 'write' },
  ],
  [{ type: 'mark' }, { type: 'read_marks', count: 1 }],
  [{ type: 'mark' }, { type: 'read_marks', count: 3 }],
];
const marks = [{ by: 'agent-o' }, { by: 'agent-o' }, { by: 'agent-a' }, { by: 'agent-l' }, { by: 'agent-l' }];
const smokeInput = (over = {}) => ({ events: goodEvents(), marks, ids, remote: [true, true, true], accepted: 1, proofOk: true, comparable: true, ...over });

test('smoke verdict requires identity, shared field, bridge name and progress after the ceiling', () => {
  const ok = smokeVerdict(smokeInput());
  assert.deepEqual(ok, { pass: true, identity: true, writers: 3, crossRead: true, bridge: ['send_message'], continued: true });
  assert.equal(smokeVerdict(smokeInput({ remote: [true, false, true] })).pass, false);
  assert.equal(smokeVerdict(smokeInput({ proofOk: false })).continued, false);
  assert.equal(smokeVerdict(smokeInput({ accepted: 0 })).pass, false);
  assert.equal(smokeVerdict(smokeInput({ marks: marks.slice(0, 3).concat({ by: 'agent-o' }) })).pass, false);
  const noRefusal = goodEvents();
  noRefusal[0].splice(5, 1);
  assert.equal(smokeVerdict(smokeInput({ events: noRefusal })).continued, false);
  const renamed = goodEvents().map((es) => es.map((e) => (e.tool === 'send_message' ? { ...e, tool: 'message_peer' } : e)));
  assert.deepEqual(smokeVerdict(smokeInput({ events: renamed })).bridge, []);
});

test('sample gate needs smoke, three long A activations, 64/64 reviewer and approval of this runner', () => {
  const treatment = { runnerRevision: 'abc', host: 'pi-direct' };
  const act = (s) => ({ comparable: true, treatment, metrics: { observedWallSeconds: s } });
  const input = {
    treatment,
    smoke: { pass: true, treatment },
    activations: [act(2100), act(1700), act(1900)],
    calibration: JSON.parse(readFileSync(join(repo, 'results', 'phase1', 'JUDGE-CALIBRATION.json'), 'utf8')),
    approval: { approved: true, reviewer: 'Research Leader', blindReviewerConfirmed: true, revision: 'abc' },
  };
  assert.deepEqual(sampleGate(input), { ready: true, problems: [], medianSeconds: 1900 });
  assert.deepEqual(sampleGate({ ...input, activations: [act(2100), act(1700), act(1750)] }).problems, ['baseline_short']);
  const seven = { ...input.calibration, correctItems: 63, passed: false };
  assert.deepEqual(sampleGate({ ...input, calibration: seven }).problems, ['reviewer_calibration']);
  assert.deepEqual(sampleGate({ ...input, approval: { ...input.approval, revision: 'old' } }).problems, ['approval']);
  const other = { ...act(2000), treatment: { runnerRevision: 'abc', host: 'openbot' } };
  assert.deepEqual(sampleGate({ ...input, activations: [other, act(1900), act(1900)] }).problems, ['activations']);
  assert.deepEqual(sampleGate({ ...input, smoke: null }).problems, ['smoke']);
});
