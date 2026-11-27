// Spike: a Pi agent session behind the four provider calls the Unfold app's task manager makes.
// The app speaks the Codex app-server protocol: it calls thread/start, thread/resume, turn/start and turn/interrupt,
// and reads notifications (item/started, item/agentMessage/delta, item/completed, thread/tokenUsage/updated,
// turn/completed). This file answers those calls with Pi and translates Pi's events into those notifications,
// so the task manager, its event record and its field board run unchanged.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { Type } from 'typebox';
import { createAgentSession, DefaultResourceLoader, SessionManager } from '@earendil-works/pi-coding-agent';

const lines = text => (typeof text === 'string' && text.length ? text.replace(/\n$/, '').split('\n') : []);
const asDiff = (removed, added) => [...removed.map(line => '-' + line), ...added.map(line => '+' + line)].join('\n');

// What a finished Pi tool call looks like as an item of the app's protocol.
function toItem(event, call) {
  const args = call.args || {}, at = path => (isAbsolute(path) ? path : resolve(call.cwd, path));
  const status = event.isError ? 'failed' : 'completed';
  if (event.toolName === 'bash') {
    const out = event.result?.structuredContent || {};
    return { type: 'commandExecution', status, exitCode: Number.isFinite(out.exit_code) ? out.exit_code : event.isError ? 1 : 0, durationMs: event.durationMs ?? null, aggregatedOutput: typeof out.output === 'string' ? out.output : '', commandActions: [] };
  }
  if (event.toolName === 'read') return { type: 'commandExecution', status, exitCode: event.isError ? 1 : 0, durationMs: event.durationMs ?? null, aggregatedOutput: '', commandActions: [{ type: 'read', path: at(args.path || '') }] };
  if (event.toolName === 'write') return { type: 'fileChange', status, changes: event.isError ? [] : [{ path: at(args.path), kind: { type: call.existed ? 'update' : 'add' }, diff: asDiff([], lines(args.content)) }] };
  if (event.toolName === 'edit') return { type: 'fileChange', status, changes: event.isError ? [] : [{ path: at(args.path), kind: { type: 'update' }, diff: (args.edits || []).map(edit => asDiff(lines(edit.oldText), lines(edit.newText))).join('\n') }] };
  return { type: 'dynamicToolCall', status, tool: event.toolName, success: !event.isError, durationMs: event.durationMs ?? null };
}
const started = name => ({ bash: 'commandExecution', read: 'commandExecution', write: 'fileChange', edit: 'fileChange' })[name] || 'dynamicToolCall';

/**
 * @param notify      receives each notification, as the app's runtime would from the Codex process
 * @param modelRuntime, model   where the model comes from (a fake provider in the tests)
 * @param agentDir    Pi's own directory for settings; a temporary one in the tests
 * @param extensions  inline Pi extensions: the place for swarm rules (tools, checks before a tool runs)
 * @param onCost      called with the cost in US$ of each model request, as Pi prices it
 */
export function createPiExecutor({ notify, modelRuntime, model, agentDir, extensions = [], onCost = () => {} }) {
  const threads = new Map();
  async function open(threadId, params) {
    const cwd = params.cwd || process.cwd();
    const resourceLoader = new DefaultResourceLoader({ cwd, agentDir, extensionFactories: extensions, noSkills: true, noPromptTemplates: true, noThemes: true,
      appendSystemPromptOverride: base => (params.developerInstructions ? [...base, params.developerInstructions] : base) });
    await resourceLoader.reload();
    const { session } = await createAgentSession({ cwd, agentDir, modelRuntime, model, resourceLoader, sessionManager: SessionManager.inMemory() });
    const thread = { id: threadId, session, cwd, turnId: null, total: { inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, totalTokens: 0 }, calls: new Map(), failed: null };
    const send = (method, extra) => notify({ method, params: { threadId, turnId: thread.turnId, ...extra } });
    session.subscribe(event => {
      if (!thread.turnId) return;
      if (event.type === 'message_start' && event.message?.role === 'assistant') send('item/started', { item: { type: 'agentMessage' } });
      else if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') send('item/agentMessage/delta', { delta: event.assistantMessageEvent.delta });
      else if (event.type === 'tool_execution_start') {
        const path = event.args?.path;
        thread.calls.set(event.toolCallId, { args: event.args, cwd, existed: typeof path === 'string' && existsSync(isAbsolute(path) ? path : join(cwd, path)) });
        send('item/started', { item: { type: started(event.toolName) } });
      } else if (event.type === 'tool_execution_end') {
        const call = thread.calls.get(event.toolCallId) || { args: {}, cwd };thread.calls.delete(event.toolCallId);
        send('item/completed', { item: toItem(event, call) });
      } else if (event.type === 'turn_end') {
        const usage = event.message?.usage;
        if (usage) {
          thread.total.inputTokens += usage.input || 0;thread.total.cachedInputTokens += usage.cacheRead || 0;thread.total.cacheWriteInputTokens += usage.cacheWrite || 0;
          thread.total.outputTokens += usage.output || 0;thread.total.totalTokens += usage.totalTokens || 0;
          send('thread/tokenUsage/updated', { tokenUsage: { total: { ...thread.total } } });
          onCost(usage.cost?.total || 0);
        }
        if (event.message?.stopReason === 'error') thread.failed = event.message.errorMessage || 'The model request failed.';
      } else if (event.type === 'agent_settled') {
        const turn = { id: thread.turnId, status: event.aborted ? 'interrupted' : thread.failed ? 'failed' : 'completed', ...(thread.failed && !event.aborted ? { error: { message: thread.failed } } : {}) };
        const params = { threadId, turnId: thread.turnId, turn };thread.turnId = null;thread.failed = null;notify({ method: 'turn/completed', params });
      }
    });
    threads.set(threadId, thread);return thread;
  }
  return {
    threads,
    async rpc(method, params = {}) {
      if (method === 'thread/start') { const thread = await open(randomUUID(), params);return { thread: { id: thread.id } }; }
      // A session lives in this process. After a restart the thread is opened again without its history.
      if (method === 'thread/resume') { if (!threads.has(params.threadId)) await open(params.threadId, params);return { thread: { id: params.threadId } }; }
      if (method === 'turn/start') {
        const thread = threads.get(params.threadId);if (!thread) throw Error('Unknown thread.');
        const text = (params.input || []).filter(part => part.type === 'text').map(part => part.text).join('\n\n');
        thread.turnId = randomUUID();const turnId = thread.turnId;
        // The app expects the call to return as soon as the turn is accepted; the run reports through notifications.
        queueMicrotask(() => thread.session.prompt(text).catch(error => { if (thread.turnId === turnId) { thread.turnId = null;notify({ method: 'turn/completed', params: { threadId: thread.id, turnId, turn: { id: turnId, status: 'failed', error: { message: error.message } } } }); } }));
        return { turn: { id: turnId } };
      }
      if (method === 'turn/interrupt') { await threads.get(params.threadId)?.session.abort();return {}; }
      throw Error('Not part of the spike: ' + method);
    },
    dispose() { for (const thread of threads.values()) thread.session.dispose();threads.clear(); },
  };
}

// Two swarm rules as a Pi extension, to show where they would live.
// `leave_mark` is the deposit primitive: the agent writes a typed trace on a place of the work, not a message to a peer.
// The check before a tool runs is where a rule held in code overrides the agent: here, a claimed file cannot be written.
export function fieldExtension(field) {
  return pi => {
    pi.registerTool({
      name: 'leave_mark', label: 'Leave a mark',
      description: 'Leave a typed mark on a place of the work for whoever works there next. Not a message to another agent.',
      promptSnippet: 'Leave a typed mark (finding, claim, question, taken) on a file or part of the work',
      parameters: Type.Object({ kind: Type.Union([Type.Literal('finding'), Type.Literal('claim'), Type.Literal('question'), Type.Literal('taken')]), place: Type.String(), text: Type.String() }),
      async execute(_id, params) { field.marks.push({ ...params, at: Date.now() });return { content: [{ type: 'text', text: 'Mark left on ' + params.place }], details: {} }; },
    });
    // A place is compared as a path relative to the task folder, however the agent wrote it.
    const place = (path, cwd) => (typeof path === 'string' ? relative(cwd, isAbsolute(path) ? path : resolve(cwd, path.replace(/^@/, ''))) : null);
    pi.on('tool_call', async (event, ctx) => {
      const target = place(event.input?.path, ctx.cwd);
      const taken = target && field.marks.some(mark => mark.kind === 'taken' && mark.place === target && mark.by !== field.self);
      // For analysis only: which tool was tried, and whether a shell command named a taken file. No command text is kept.
      field.tried?.push({ tool: event.toolName, target, blocked: Boolean(taken && ['write', 'edit'].includes(event.toolName)),
        namesTaken: event.toolName === 'bash' && field.marks.some(mark => mark.kind === 'taken' && String(event.input?.command || '').includes(mark.place.split('/').pop())) });
      // The first time any tool is about to run, remember what the taken files hold.
      if (field.guard === 'effect' && !field.held) { field.held = new Map();for (const mark of field.marks) if (mark.kind === 'taken' && mark.by !== field.self) { const file = resolve(ctx.cwd, mark.place);field.held.set(file, existsSync(file) ? readFileSync(file, 'utf8') : null); } }
      if (taken && ['write', 'edit'].includes(event.toolName)) return { block: true, reason: `${target} is taken by another agent. Work elsewhere or leave a mark.` };
      return undefined;
    });
    // A rule on a tool only binds an agent that uses that tool: a file can also be changed from the shell.
    // With `guard: 'effect'` the rule is on the outcome instead. After every tool, a taken file that changed is put
    // back, and the agent is told so in the result of the call that changed it.
    pi.on('tool_result', async (event, ctx) => {
      if (field.guard !== 'effect' || !field.held) return undefined;
      const undone = [];
      for (const [file, text] of field.held) { const now = existsSync(file) ? readFileSync(file, 'utf8') : null;if (now !== text) { if (text === null) rmSync(file, { force: true });else writeFileSync(file, text);undone.push(relative(ctx.cwd, file)); } }
      if (!undone.length) return undefined;
      field.undone = (field.undone || 0) + undone.length;
      return { content: [...(event.content || []), { type: 'text', text: `${undone.join(', ')} is taken by another agent, so the change to it was undone. Work elsewhere or leave a mark.` }], isError: true };
    });
  };
}
