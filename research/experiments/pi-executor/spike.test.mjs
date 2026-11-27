// The app's own task manager, event record and field board, driven by Pi on a fake provider. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fauxAssistantMessage, fauxText, fauxToolCall, registerFauxProvider } from '@earendil-works/pi-ai/compat';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { createPiExecutor, fieldExtension } from './pi-executor.mjs';

// The app is read from a checkout beside this repository, at its current main. Nothing in it is changed.
const APP = process.env.UNFOLD_APP || resolve(import.meta.dirname, '../../../unfold');
const require = createRequire(import.meta.url);
const { TaskManager, migrateState } = require(join(APP, 'tasks.cjs'));
const { createField } = require(join(APP, 'field.cjs'));
const { summarize } = require(join(APP, 'event-log.cjs'));

async function fixture(t, { extensions = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pi-spike-')), work = join(dir, 'work');require('node:fs').mkdirSync(work);
  const faux = registerFauxProvider(), model = faux.getModel();
  const modelRuntime = await ModelRuntime.create({ authPath: join(dir, 'auth.json'), modelsPath: join(dir, 'models.json') });
  await modelRuntime.setRuntimeApiKey(model.provider, 'faux-key');
  modelRuntime.registerProvider(model.provider, { baseUrl: model.baseUrl, api: model.api, models: [{ id: model.id, name: model.name, api: model.api, reasoning: model.reasoning, input: model.input, cost: model.cost, contextWindow: model.contextWindow, maxTokens: model.maxTokens, baseUrl: model.baseUrl }] });
  const state = migrateState(null, work), records = [], field = createField();let manager;
  const executor = createPiExecutor({ notify: message => manager.handle(message), modelRuntime, model, agentDir: dir, extensions });
  manager = new TaskManager({ state, rpc: (method, params) => executor.rpc(method, params), connect: async () => {}, save: async () => {}, emit: () => {}, transcribe: async () => '',
    record: event => { const stamped = { at: Date.now(), ...event };records.push(stamped);field.record(stamped); }, fieldView: active => field.view(state, active) });
  const principal = manager.get();principal.principal = true;
  const task = manager.get((await manager.create()).task.id);Object.assign(task, { agentId: 'a', agentName: 'Demo', projectId: 'p', projectName: 'Demo' });
  const settled = async () => { for (let i = 0; i < 400 && manager.isBusy(task.id); i++) await new Promise(r => setTimeout(r, 10));assert.equal(manager.isBusy(task.id), false, 'the turn ended'); };
  t.after(() => { executor.dispose();faux.unregister();rmSync(dir, { recursive: true, force: true }); });
  return { manager, task, principal, state, records, field, faux, work, settled };
}

test('one turn through Pi: the task ends, the conversation has the answer, the record and the board fill', async t => {
  const { manager, task, principal, state, records, field, faux, work, settled } = await fixture(t);
  faux.setResponses([
    fauxAssistantMessage([fauxText('Vou criar o arquivo.'), fauxToolCall('write', { path: 'src/a.txt', content: 'linha 1\nlinha 2\n' })], { stopReason: 'toolUse' }),
    fauxAssistantMessage([fauxToolCall('bash', { command: 'ls src && exit 3' })], { stopReason: 'toolUse' }),
    fauxAssistantMessage('Pronto.'),
  ]);
  await manager.send(task.id, 'Crie src/a.txt e liste a pasta.');await settled();
  assert.equal(task.status, 'done');
  assert.equal(task.messages.at(-1).role, 'assistant');assert.match(task.messages.at(-1).text, /Vou criar o arquivo\.\n\nPronto\./);
  assert.equal(readFileSync(join(work, 'src/a.txt'), 'utf8'), 'linha 1\nlinha 2\n');
  assert.deepEqual(records.map(r => r.kind), ['turn-start', 'item', 'item', 'turn-end']);
  assert.deepEqual(records[1].changes, [{ path: 'src/a.txt', kind: 'add', added: 2, removed: 0 }]);
  assert.equal(records[2].type, 'commandExecution');assert.equal(records[2].exitCode, 3);
  assert.equal(records[3].status, 'done');assert.ok(records[3].tokens.totalTokens > 0);
  const summary = summarize(records)[0];
  assert.deepEqual([summary.turns, summary.done, summary.commands, summary.commandsFailed, summary.filesChanged, summary.linesAdded], [1, 1, 1, 1, 1, 2]);
  await manager.select(principal.id);
  assert.deepEqual(field.view(state, principal).sections[0].items.map(item => [item.title, item.status || null]), [['Crie src/a.txt e liste a pasta.', 'Demo'], ['a.txt', 'Novo +2']]);
});

test('a second request in the same task continues the same Pi session', async t => {
  const { manager, task, records, faux, settled } = await fixture(t);
  let seen = 0;
  faux.setResponses([fauxAssistantMessage('Primeira.'), context => { seen = context.messages.filter(message => message.role === 'user').length;return fauxAssistantMessage('Segunda.'); }]);
  await manager.send(task.id, 'Um');await settled();await manager.send(task.id, 'Dois');await settled();
  assert.equal(seen, 2, 'the second request saw the first one');
  assert.deepEqual(records.filter(r => r.kind === 'turn-start').map(r => [r.sequence, r.previousStatus]), [[1, null], [2, 'done']]);
  const [first, second] = records.filter(r => r.kind === 'turn-end').map(r => r.tokens.totalTokens);
  assert.ok(first > 0 && second > 0, 'each turn reports its own tokens');
});

test('stopping a turn interrupts Pi and the task says so', async t => {
  const { manager, task, records, faux, settled } = await fixture(t);
  faux.setResponses([fauxAssistantMessage([fauxToolCall('bash', { command: 'sleep 20' })], { stopReason: 'toolUse' }), fauxAssistantMessage('Não deveria chegar aqui.')]);
  await manager.send(task.id, 'Espere');
  for (let i = 0; i < 200 && !records.some(r => r.kind === 'turn-start'); i++) await new Promise(r => setTimeout(r, 10));
  await new Promise(r => setTimeout(r, 150));await manager.stop(task.id);await settled();
  assert.equal(task.status, 'interrupted');
  assert.deepEqual(records.filter(r => ['stop', 'turn-end'].includes(r.kind)).map(r => [r.kind, r.status || null]), [['stop', null], ['turn-end', 'interrupted']]);
});

test('a model error ends the turn as an error with its message', async t => {
  const { manager, task, faux, settled } = await fixture(t);
  faux.setResponses([fauxAssistantMessage('', { stopReason: 'error', errorMessage: 'provider is down' })]);
  await manager.send(task.id, 'Qualquer coisa');await settled();
  assert.equal(task.status, 'error');assert.match(task.error, /provider is down/);
});

test('swarm rules live in a Pi extension: a mark is left on the work, and a taken file is refused before the write runs', async t => {
  const field = { marks: [{ kind: 'taken', place: 'src/b.txt', by: 'other', text: 'refactoring' }], self: 'me' };
  const { manager, task, records, faux, work, settled } = await fixture(t, { extensions: [fieldExtension(field)] });
  let refusal = '';
  faux.setResponses([
    fauxAssistantMessage([fauxToolCall('write', { path: 'src/b.txt', content: 'x\n' })], { stopReason: 'toolUse' }),
    context => { refusal = JSON.stringify(context.messages.at(-1));return fauxAssistantMessage([fauxToolCall('leave_mark', { kind: 'question', place: 'src/b.txt', text: 'Posso mexer aqui depois?' })], { stopReason: 'toolUse' }); },
    fauxAssistantMessage('Deixei uma marca.'),
  ]);
  await manager.send(task.id, 'Altere src/b.txt');await settled();
  assert.equal(task.status, 'done');
  assert.equal(require('node:fs').existsSync(join(work, 'src/b.txt')), false, 'the write never ran');
  assert.match(refusal, /taken by another agent/);
  assert.deepEqual(field.marks.at(-1) && [field.marks.at(-1).kind, field.marks.at(-1).place], ['question', 'src/b.txt']);
  assert.deepEqual(records.filter(r => r.kind === 'item').map(r => [r.type, r.status, r.tool || null]), [['fileChange', 'failed', null], ['dynamicToolCall', 'completed', 'leave_mark']]);
});

test('a rule on the outcome holds whatever tool is used: a taken file changed from the shell is put back and the agent is told', async t => {
  const field = { marks: [{ kind: 'taken', place: 'src/b.txt', by: 'other', text: 'refactoring' }], self: 'me', guard: 'effect', tried: [] };
  const { manager, task, faux, work, settled } = await fixture(t, { extensions: [fieldExtension(field)] });
  require('node:fs').mkdirSync(join(work, 'src'));require('node:fs').writeFileSync(join(work, 'src/b.txt'), 'original\n');
  let told = '';
  faux.setResponses([
    fauxAssistantMessage([fauxToolCall('bash', { command: "printf 'changed\\n' > src/b.txt && printf 'free\\n' > src/c.txt" })], { stopReason: 'toolUse' }),
    context => { told = JSON.stringify(context.messages.at(-1));return fauxAssistantMessage('Entendi.'); },
  ]);
  await manager.send(task.id, 'Altere src/b.txt pelo shell');await settled();
  assert.equal(readFileSync(join(work, 'src/b.txt'), 'utf8'), 'original\n', 'the taken file is back');
  assert.equal(readFileSync(join(work, 'src/c.txt'), 'utf8'), 'free\n', 'the free file keeps its change');
  assert.match(told, /src\/b\.txt is taken by another agent, so the change to it was undone/);
  assert.equal(field.undone, 1);
});
