// Pi sessions for Phase 1b, through Pi's own SDK. One session per agent lives for the whole attempt, so the
// connector's per-session message ceiling binds across waves, and the next attempt starts from a fresh session.
// The same code runs the real model (OAuth subscription, no paid fallback) and Pi's faux provider in the tests.
import { existsSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { createAgentSession, DefaultResourceLoader, SessionManager } from '@earendil-works/pi-coding-agent';
import { createBioSwarm } from '../../packages/connector-pi/index.js';
import { installBudget } from '../pi-budget/index.js';
import { installStudyCap } from './studycap.mjs';
import { createBridge } from './bridge.js';

// Identical reading and editing tools in every arm. B and C add the connector's field tools (the treatment).
export const baseTools = ['read', 'ls', 'grep', 'find', 'edit', 'write', 'send_message'];
export const fieldTools = ['leave_mark', 'read_marks', 'coordination_status'];
export const changingTools = ['edit', 'write', 'leave_mark', 'send_message'];
const fileTools = ['read', 'ls', 'grep', 'find', 'edit', 'write'];

// Same in every arm: file tools reach only the attempt's task folder and the agent's own workspace. Reference
// solutions, the blind key and credentials stay out of reach. Symlinks resolve before the check.
export function realTarget(cwd, path) {
  let p = resolve(cwd, String(path ?? '.').replace(/^@/, ''));
  const tail = [];
  while (!existsSync(p) && dirname(p) !== p) {
    tail.unshift(p.slice(dirname(p).length + 1));
    p = dirname(p);
  }
  return join(realpathSync(p), ...tail);
}
// The one decision every file tool goes through. It resolves the path (absolute, relative or through symlinks) with
// stat-level calls only; it never opens the file. The integrity gate checks real protected paths with it alone.
export function sandboxAllows(cwd, roots, path) {
  if (path !== undefined && typeof path !== 'string') return { allowed: false, target: null };
  const target = realTarget(cwd, path);
  const inside = (r) => target === r || target.startsWith(r.endsWith(sep) ? r : r + sep);
  return { allowed: roots.map((r) => realpathSync(r)).some(inside), target };
}
export function createSandbox({ cwd, roots, denied }) {
  return (pi) =>
    pi.on('tool_call', async (event) => {
      if (!fileTools.includes(event.toolName)) return undefined;
      const { allowed, target } = sandboxAllows(cwd, roots, event.input?.path);
      if (target === null) return { block: true, reason: 'Caminho inválido.' };
      if (allowed) return undefined;
      denied.push(target);
      return { block: true, reason: 'Fora da pasta de trabalho do estudo. Use apenas a pasta indicada.' };
    });
}

export function piDriver({ runtimeFor, modelFor, thinkingLevel = 'medium', expectModel, connectorEnv = {}, fetchImpl, countEvent }) {
  return {
    configuredEffort: thinkingLevel,
    // Pre-flight quota probe (Research review 714fe625): one minimal call through the same subscription and model,
    // identical in A, B and C, after the host controls and before any worker. No tools, no extensions, no ledger;
    // numbers only, kept apart from the attempt's tokens.
    async probe() {
      const agentDir = mkdtempSync(join(tmpdir(), 'phase1b-probe-'));
      const resourceLoader = new DefaultResourceLoader({ cwd: agentDir, agentDir, noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true });
      await resourceLoader.reload();
      const { session } = await createAgentSession({ cwd: agentDir, agentDir, modelRuntime: await runtimeFor('probe'), model: await modelFor('probe'), thinkingLevel, noTools: 'all', resourceLoader, sessionManager: SessionManager.inMemory(agentDir) });
      const r = { at: new Date().toISOString(), durationMs: 0, responses: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, unknownUsage: 0, hostUsd: 0, errors: 0, errorCodes: [], http429: 0, retries: 0, wrongModel: 0 };
      const provider = { http429: 0, retries: 0 };
      const unsubscribe = session.subscribe((e) => {
        countEvent?.(provider, e);
        if (e.type !== 'message_end' || e.message?.role !== 'assistant') return;
        const m = e.message;
        r.responses++;
        if (!Object.keys(r.tokens).every((k) => Number.isFinite(m.usage?.[k]))) r.unknownUsage++; // never priced as zero
        for (const k of Object.keys(r.tokens)) r.tokens[k] += Number.isFinite(m.usage?.[k]) ? m.usage[k] : 0;
        if (Number.isFinite(m.usage?.cost?.total)) r.hostUsd += m.usage.cost.total;
        if (expectModel && m.model !== expectModel) r.wrongModel++;
        if (m.stopReason === 'error') {
          r.errors++;
          const code = [m.status, m.statusCode, m.error?.status].find(Number.isInteger) ?? Number(/\b([45]\d\d)\b/.exec(String(m.errorMessage ?? ''))?.[1]);
          if (Number.isInteger(code)) r.errorCodes.push(code);
        }
      });
      const started = Date.now();
      try {
        await session.prompt('Responda apenas: ok');
      } catch {
        if (!r.errors) r.errors++; // a thrown prompt after an error response is the same failure
      } finally {
        unsubscribe();
        session.dispose();
      }
      r.durationMs = Date.now() - started;
      r.http429 = provider.http429 + r.errorCodes.filter((c) => c === 429).length;
      r.retries = provider.retries;
      return r;
    },
    async open({ agent, cwd, arm, bridge, roots }) {
      const agentDir = mkdtempSync(join(tmpdir(), 'phase1b-pi-')); // empty: no user settings, extensions or skills
      if (!roots?.length || !roots.every(isAbsolute)) throw Error('A sandbox root is required');
      const denied = [];
      const factories = [createSandbox({ cwd, roots, denied }), (pi) => installBudget(pi, cwd), (pi) => installStudyCap(pi, cwd), createBridge(bridge)];
      if (arm !== 'A') factories.push(createBioSwarm({ cwd, env: connectorEnv, fetchImpl }));
      const resourceLoader = new DefaultResourceLoader({ cwd, agentDir, extensionFactories: factories, noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true });
      await resourceLoader.reload();
      const { session } = await createAgentSession({
        cwd,
        agentDir,
        modelRuntime: await runtimeFor(agent),
        model: await modelFor(agent),
        thinkingLevel,
        tools: arm === 'A' ? baseTools : [...baseTools, ...fieldTools],
        resourceLoader,
        sessionManager: SessionManager.inMemory(cwd),
      });
      return {
        async turn(text, { deadline, provider, observe }) {
          const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, unknownUsage: 0, hostUsd: 0, responses: 0, errors: 0, wrongModel: 0, unpriced: 0, errorCodes: [], stopReasons: {} };
          let readChars = 0;
          const calls = new Map();
          const tools = {},
            accepted = {},
            deniedBefore = denied.length;
          const unsubscribe = session.subscribe((e) => {
            countEvent?.(provider, e);
            observe?.(e); // in-memory only (integrity gate on the local provider)
            if (e.type === 'tool_execution_start') {
              tools[e.toolName] = (tools[e.toolName] ?? 0) + 1;
              // In memory for the runner's telemetry; the path is mapped to a check ID and dropped before any record.
              calls.set(e.toolCallId, { tool: e.toolName, path: typeof e.args?.path === 'string' ? e.args.path : null, t0: Date.now(), t1: null, accepted: null, ran: null });
            }
            if (e.type === 'tool_execution_end' && calls.has(e.toolCallId)) Object.assign(calls.get(e.toolCallId), { t1: Date.now(), accepted: !e.isError, ran: e.durationMs !== undefined });
            if (e.type === 'tool_execution_end' && !e.isError) accepted[e.toolName] = (accepted[e.toolName] ?? 0) + 1;
            if (e.type === 'tool_execution_end' && !e.isError && e.toolName === 'read') readChars += (e.result?.content ?? []).reduce((n, c) => n + (typeof c.text === 'string' ? c.text.length : 0), 0); // a length, never the text
            if (e.type !== 'message_end' || e.message?.role !== 'assistant') return;
            const m = e.message;
            usage.responses++;
            usage.stopReasons[m.stopReason ?? 'none'] = (usage.stopReasons[m.stopReason ?? 'none'] ?? 0) + 1;
            if (m.stopReason === 'error') {
              usage.errors++;
              // The HTTP status only, as a number; the provider's error text never leaves the turn.
              const code = [m.status, m.statusCode, m.error?.status].find(Number.isInteger) ?? Number(/\b([45]\d\d)\b/.exec(String(m.errorMessage ?? ''))?.[1]);
              if (Number.isInteger(code)) usage.errorCodes.push(code);
            }
            if (expectModel && m.model !== expectModel) usage.wrongModel++;
            if (!['input', 'output', 'cacheRead', 'cacheWrite'].every((k) => Number.isFinite(m.usage?.[k]))) usage.unknownUsage++; // a missing count is unknown, not zero
            for (const k of ['input', 'output', 'cacheRead', 'cacheWrite']) usage[k] += Number.isFinite(m.usage?.[k]) ? m.usage[k] : 0;
            if (Number.isFinite(m.usage?.cost?.total)) usage.hostUsd += m.usage.cost.total;
            else usage.unpriced++;
          });
          const startedAt = new Date().toISOString();
          let timer,
            timedOut = false,
            failed = false;
          try {
            await Promise.race([
              session.prompt(text),
              new Promise((resolve) => (timer = setTimeout(() => ((timedOut = true), resolve()), Math.max(0, deadline - Date.now())))),
            ]);
            if (timedOut) await session.abort();
          } catch {
            failed = true;
          } finally {
            clearTimeout(timer);
            unsubscribe();
          }
          // deniedPaths stays in memory for the integrity gate; it never enters a record.
          return { startedAt, completedAt: new Date().toISOString(), usage, tools, accepted, toolCalls: [...calls.values()], readChars, readDenials: denied.length - deniedBefore, deniedPaths: denied.slice(deniedBefore), timedOut, failed };
        },
        // The effort the SDK session actually applies (after clamping to the model). The provider does not return one.
        effort: () => session.thinkingLevel,
        abort: () => session.abort(),
        close: () => session.dispose(),
      };
    },
  };
}

// The real model: the operator's Pi sign-in on this Mac. Refuses anything but an OAuth subscription.
export async function subscriptionModel({ authPath, modelsPath, provider = 'openai', id = 'gpt-6.1-sol' }) {
  const { ModelRuntime } = await import('@earendil-works/pi-coding-agent');
  const runtime = await ModelRuntime.create({ authPath, modelsPath });
  if (!runtime.isUsingOAuth(provider) || !runtime.isUsingSubscription(provider)) throw Error('Pi must use the OpenAI subscription sign-in, without an API key');
  const model = runtime.getModel(provider, id);
  if (!model) throw Error('Model not available: ' + provider + '/' + id);
  return { runtime, model };
}
