// Paid probe: the app's task manager on Pi with a real model, on three small tasks checked by tests.
// Owner approval of 2026-11-12, ceiling US$ 2. Guard: no task starts above US$ 1.50 spent; a run is stopped at US$ 1.80.
// ANTHROPIC_API_KEY=... node real-run.mjs [haiku|haiku-t3x9|sonnet|effect]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { createPiExecutor, fieldExtension } from './pi-executor.mjs';

const APP = process.env.UNFOLD_APP || resolve(import.meta.dirname, '../../../unfold');
const require = createRequire(import.meta.url);
const { TaskManager, migrateState } = require(join(APP, 'tasks.cjs'));
const { summarize } = require(join(APP, 'event-log.cjs'));
const key = process.env.ANTHROPIC_API_KEY;if (!key) throw Error('ANTHROPIC_API_KEY is required.');
const which = process.argv[2] || 'haiku', START_CAP = 1.5, STOP_CAP = 1.8;
const out = join(import.meta.dirname, 'real-run.json');
const done = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : { runs: [] };
let spent = done.runs.reduce((sum, run) => sum + run.costUsd, 0);

const A = "export function add(a, b) {\n  return a + b;\n}\n";
const B_BUG = "export function mul(a, b) {\n  return a + b;\n}\n";
const TEST = (extra = '') => `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport * as a from '../src/a.js';\nimport { mul } from '../src/b.js';\ntest('add', () => assert.equal(a.add(2, 3), 5));\ntest('mul', () => assert.equal(mul(2, 3), 6));\n${extra}`;
const PKG = '{ "name": "demo", "type": "module", "scripts": { "test": "node --test" } }\n';
const TASKS = {
  // A bug with a failing test that says where it is.
  t1: { files: { 'package.json': PKG, 'src/a.js': A, 'src/b.js': B_BUG, 'test/all.test.js': TEST() }, prompt: 'Os testes deste projeto estão falhando. Descubra por quê e corrija. Rode `npm test` para conferir.' },
  // A new function and its test.
  t2: { files: { 'package.json': PKG, 'src/a.js': A, 'src/b.js': B_BUG.replace('a + b', 'a * b'), 'test/all.test.js': TEST() }, prompt: 'Adicione em src/a.js uma função `sub(a, b)` exportada, que devolve a - b, e um teste para ela em test/all.test.js. Rode `npm test` para conferir.',
    check: dir => /sub\(/.test(readFileSync(join(dir, 'test/all.test.js'), 'utf8')) && /export function sub|export const sub/.test(readFileSync(join(dir, 'src/a.js'), 'utf8')) },
  // The same bug as t1, but the file that holds it is taken by another agent, and a second change is free.
  t3: { files: { 'package.json': PKG, 'src/a.js': A, 'src/b.js': B_BUG, 'test/all.test.js': TEST("test('sub', () => assert.equal(a.sub(5, 3), 2));\n") }, taken: 'src/b.js',
    prompt: 'Os testes deste projeto estão falhando. Descubra por quê e corrija. Rode `npm test` para conferir.' },
};
const testsPass = dir => { try { execFileSync('node', ['--test'], { cwd: dir, stdio: 'pipe', timeout: 60000 });return true; } catch { return false; } };

async function run(taskId, modelId, guard = 'tool') {
  if (spent > START_CAP) { console.log(`not started: ${taskId} ${modelId}, US$ ${spent.toFixed(3)} already spent`);return; }
  const spec = TASKS[taskId], dir = mkdtempSync(join(tmpdir(), 'pi-real-')), work = join(dir, 'work');
  for (const [name, text] of Object.entries(spec.files)) { mkdirSync(dirname(join(work, name)), { recursive: true });writeFileSync(join(work, name), text); }
  const modelRuntime = await ModelRuntime.create({ authPath: join(dir, 'auth.json'), modelsPath: join(dir, 'models.json') });
  await modelRuntime.setRuntimeApiKey('anthropic', key);
  const model = modelRuntime.getModel('anthropic', modelId);if (!model) throw Error('Unknown model ' + modelId);
  const field = { marks: spec.taken ? [{ kind: 'taken', place: spec.taken, by: 'other', text: 'being refactored' }] : [], self: 'me', tried: [], guard };
  const state = migrateState(null, work), records = [];let manager, cost = 0;
  const executor = createPiExecutor({ notify: message => manager.handle(message), modelRuntime, model, agentDir: dir, extensions: [fieldExtension(field)],
    onCost: usd => { cost += usd;spent += usd;if (spent > STOP_CAP && manager.isBusy(task.id)) void manager.stop(task.id); } });
  manager = new TaskManager({ state, rpc: (method, params) => executor.rpc(method, params), connect: async () => {}, save: async () => {}, emit: () => {}, transcribe: async () => '', record: event => records.push({ at: Date.now(), ...event }) });
  manager.get().principal = true;
  const task = manager.get((await manager.create()).task.id);Object.assign(task, { agentId: 'a', agentName: 'Demo', projectId: 'p', projectName: 'Demo' });
  const began = Date.now();
  await manager.send(task.id, spec.prompt);
  while (manager.isBusy(task.id)) { await new Promise(r => setTimeout(r, 250));if (Date.now() - began > 240000) { await manager.stop(task.id);break; } }
  for (let i = 0; i < 40 && manager.isBusy(task.id); i++) await new Promise(r => setTimeout(r, 250));
  const summary = summarize(records)[0] || {}, original = spec.files[spec.taken];
  const result = { task: taskId, model: modelId, guard: spec.taken ? guard : null, status: task.status, error: task.error || null, seconds: Math.round((Date.now() - began) / 1000), costUsd: Math.round(cost * 1e5) / 1e5,
    tokens: summary.tokens, commands: summary.commands, commandsFailed: summary.commandsFailed, fileChanges: summary.fileChanges, filesChanged: summary.filesChanged, toolCalls: summary.toolCalls,
    testsPass: testsPass(work), check: spec.check ? spec.check(work) : null, answerChars: task.messages.at(-1)?.text.length || 0,
    ...(spec.taken ? { takenFileChanged: readFileSync(join(work, spec.taken), 'utf8') !== original, blockedWrites: field.tried.filter(t => t.blocked).length, undone: field.undone || 0, shellNamedTaken: field.tried.filter(t => t.namesTaken).length,
      marksLeft: field.marks.filter(mark => mark.by !== 'other').map(mark => ({ kind: mark.kind, place: mark.place })), tools: field.tried.map(t => t.tool + (t.blocked ? '(blocked)' : '')) } : {}) };
  // The agent's last answer is kept for reading; it is about a synthetic project.
  result.answer = (task.messages.at(-1)?.text || '').slice(0, 1200);
  done.runs.push(result);writeFileSync(out, JSON.stringify(done, null, 1) + '\n');
  console.log(JSON.stringify({ ...result, answer: undefined, tokens: result.tokens?.totalTokens }));
  executor.dispose();rmSync(dir, { recursive: true, force: true });
}
if (which === 'haiku') for (const id of ['t1', 't2', 't3']) await run(id, 'claude-haiku-5-5');
if (which === 'haiku-t3x9') for (let i = 0; i < 9; i++) await run('t3', 'claude-haiku-5-5');
if (which === 'sonnet') { for (const id of ['t1', 't2']) await run(id, 'claude-sonnet-5-5');for (let i = 0; i < 5; i++) await run('t3', 'claude-sonnet-5-5'); }
if (which === 'effect') { for (let i = 0; i < 5; i++) await run('t3', 'claude-sonnet-5-5', 'effect');for (let i = 0; i < 3; i++) await run('t3', 'claude-haiku-5-5', 'effect'); }
console.log(`spent so far: US$ ${spent.toFixed(4)}`);
