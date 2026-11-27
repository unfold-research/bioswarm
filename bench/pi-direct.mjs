// Technical activation with three real Pi processes on the operator's existing OpenAI OAuth sign-in.
// No OpenBot, private customer data or paid API fallback. Only numeric and boolean evidence leaves the fixture.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { publishWave, assignment } from '../packages/connector-pi/coordination.js';

const repo = resolve(import.meta.dirname, '..');
const cli = join(repo, 'node_modules', '.bin', 'pi');
const plugin = join(repo, 'packages', 'connector-pi', 'index.js');
const model = 'gpt-6.1-sol';
const env = { HOME: homedir(), PATH: process.env.PATH, LANG: 'C.UTF-8', PI_OFFLINE: '1' };
const auth = spawnSync(
  cli,
  ['auth', 'check', '--provider', 'openai', '--model', model, '--json', '--no-refresh'],
  { env, encoding: 'utf8' },
);
if (auth.status !== 0 || JSON.parse(auth.stdout).authType !== 'oauth')
  throw Error('Pi OpenAI OAuth must be ready');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'bioswarm-direct-')));
const team = ['lead', 'ops', 'audit'],
  task = join(root, 'task'),
  field = join(root, 'field');
const rules = { waitForTrace: true, tieBreak: 'hash' };
const sum = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  modelResponses: 0,
  estimatedUsd: 0,
  requests: 0,
};
const start = Date.now();
const rows = (path) => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
function prompt(agent, text) {
  const result = spawnSync(
    cli,
    [
      '--provider',
      'openai',
      '--model',
      model,
      '--thinking',
      'low',
      '--mode',
      'json',
      '--no-session',
      '--no-mcp',
      '--no-skills',
      '--no-extensions',
      '-e',
      plugin,
      '--tools',
      'write,read,leave_mark,read_marks,coordination_status',
      '-p',
      text,
    ],
    { cwd: join(root, agent), env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw Error('Pi request did not complete (exit ' + result.status + ', signal ' + result.signal + ')');
  const events = result.stdout.split('\n').filter(Boolean).map(JSON.parse);
  const messages = events
    .filter((e) => e.type === 'message_end' && e.message?.role === 'assistant')
    .map((e) => e.message);
  assert.ok(
    messages.length && messages.every((m) => m.stopReason !== 'error' && m.model === model),
    'Missing or failed model response',
  );
  for (const m of messages) {
    assert.ok(m.usage && Number.isFinite(m.usage.cost?.total));
    for (const key of ['input', 'output', 'cacheRead', 'cacheWrite']) sum[key] += m.usage[key] ?? 0;
    sum.estimatedUsd += m.usage.cost.total;
    sum.modelResponses++;
  }
  sum.requests++;
}
function arm(dir, run, id, place) {
  const waves = join(root, dir),
    file = join(task, place);
  writeFileSync(file, 'OPEN');
  for (const a of team)
    writeFileSync(join(root, a, '.bioswarm'), JSON.stringify({ field, waveDir: waves, ...rules }));
  function next(n) {
    assert.equal(readFileSync(file, 'utf8'), 'OPEN', 'Runner publishes only an observed unresolved check');
    const wave = publishWave(waves, {
      run,
      wave: n,
      root: task,
      team,
      fallbackAfter: 3,
      checks: [{ id, place, revision: 'open', owners: team.slice(0, 2) }],
    });
    return assignment(wave, wave.checks[0], rules);
  }
  return { next, file };
}
const attempt = (file) =>
  'Use the write tool exactly once on ' +
  file +
  ' with content SETTLED. If refused, leave the file alone. Return a short answer.';
const relay = (file, to) =>
  'Use leave_mark with kind requirement, place ' +
  file +
  ', to ' +
  to +
  ', and text "Set the status to SETTLED". Finish.';
try {
  mkdirSync(task);
  for (const a of team) mkdirSync(join(root, a));
  const trial = arm('first', 'direct1', 'invoice', 'invoice.txt');
  const { agent: winner } = trial.next(1),
    loser = team.slice(0, 2).find((a) => a !== winner);
  prompt(winner, attempt(trial.file));
  assert.equal(readFileSync(trial.file, 'utf8'), 'OPEN');
  prompt(loser, attempt(trial.file) + ' Then ' + relay(trial.file, winner));
  assert.equal(readFileSync(trial.file, 'utf8'), 'OPEN');
  const marks = rows(join(field, 'field.jsonl'));
  assert.ok(marks.some((m) => m.kind === 'yielded' && m.by === loser));
  assert.ok(marks.some((m) => m.kind === 'requirement' && m.by === loser && m.to === winner));
  prompt(winner, attempt(trial.file));
  assert.equal(readFileSync(trial.file, 'utf8').trim(), 'SETTLED');
  const stuck = arm('second', 'direct2', 'remaining', 'remaining.txt');
  for (const wave of [1, 2]) {
    const actor = stuck.next(wave);
    assert.equal(actor.fallback, false);
    prompt(actor.agent, attempt(stuck.file));
    assert.equal(readFileSync(stuck.file, 'utf8'), 'OPEN');
  }
  const rescuer = stuck.next(3);
  assert.equal(rescuer.agent, 'audit');
  assert.equal(rescuer.fallback, true);
  prompt('ops', relay(stuck.file, rescuer.agent));
  prompt(rescuer.agent, attempt(stuck.file));
  assert.equal(readFileSync(stuck.file, 'utf8').trim(), 'SETTLED');
  const logs = team.flatMap((a) => rows(join(root, a, '.bioswarm-events.jsonl')));
  assert.ok(logs.some((e) => e.rule === 'wait_for_trace'));
  assert.ok(logs.some((e) => e.rule === 'stalled_check_reassigned'));
  console.log(
    JSON.stringify({
      host: 'Pi direct',
      model,
      agents: team.length,
      ...sum,
      wallSeconds: (Date.now() - start) / 1000,
      waitVerified: true,
      hashYieldVerified: true,
      outsiderRecoveryVerified: true,
    }),
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
