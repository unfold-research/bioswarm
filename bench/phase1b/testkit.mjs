// Test kit shared by the Phase 1b test files: Control stand-in, host health stand-in and scripted Pi agents on Pi's
// faux provider. Test-only; never imported by the runner.
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fauxAssistantMessage, fauxToolCall, registerFauxProvider } from '@earendil-works/pi-ai/compat';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { team } from './case.mjs';
import { piDriver } from './driver.mjs';

export const temp = (t, prefix) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const strategies = {
  stigmergy: { runBudgetUsd: 3, messagesPerRun: 1, messageChars: 400, messagesPerSession: 4, gate: null },
  'stigwait-tiebreak': { runBudgetUsd: 3, messagesPerRun: 1, messageChars: 400, messagesPerSession: 4, gate: null, waitForTrace: true, tieBreak: 'hash' },
};
// tamper simulates a Control that answers differently from what the arm requires (on PUT, GET or both).
export function fakeControl(tamper = {}) {
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
export const health = (bytes = () => 50e9) => ({
  pauseBytes: 10e9,
  availableBytes: bytes,
  hostSnapshot: () => ({ at: new Date().toISOString(), availableBytes: bytes(), loadAverage: [0, 0, 0], providerProcesses: 0 }),
  requireStartSpace: () => ({ at: new Date().toISOString(), availableBytes: 50e9, loadAverage: [0, 0, 0], providerProcesses: 0 }),
});

// Scripted Pi agents on the faux provider. Each turn performs the tool calls its script returns, one per response.
export async function scriptedDriver(t, control, script, { expectModel } = {}) {
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

