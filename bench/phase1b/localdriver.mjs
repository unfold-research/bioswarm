// Deterministic local provider for the integrity gate: the same Pi SDK sessions and tool stack as the study (sandbox,
// budget, bridge and, in B/C, the connector with the policy the Control really assigns), but every model response is
// scripted on this machine by Pi's faux provider. Nothing a tool returns can reach a remote model.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fauxAssistantMessage, fauxToolCall, registerFauxProvider } from '@earendil-works/pi-ai/compat';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { piDriver } from './driver.mjs';
import { team } from './case.mjs';

export async function localDriver({ connectorEnv = {}, fetchImpl } = {}) {
  const pending = {},
    runtimes = {},
    models = {},
    registrations = [];
  for (const agent of team) {
    const faux = registerFauxProvider({ provider: 'local-' + agent, models: [{ id: 'local-scripted', reasoning: true }] });
    registrations.push(faux);
    const model = faux.getModel();
    const dir = mkdtempSync(join(tmpdir(), 'phase1b-local-'));
    const runtime = await ModelRuntime.create({ authPath: join(dir, 'auth.json'), modelsPath: join(dir, 'models.json') });
    await runtime.setRuntimeApiKey(model.provider, 'local');
    runtime.registerProvider(model.provider, { baseUrl: model.baseUrl, api: model.api, models: [{ id: model.id, name: model.name, api: model.api, reasoning: model.reasoning, input: model.input, cost: model.cost, contextWindow: model.contextWindow, maxTokens: model.maxTokens, baseUrl: model.baseUrl }] });
    const step = () => {
      const next = pending[agent]?.shift();
      return next ? fauxAssistantMessage([fauxToolCall(next.tool, next.args)], { stopReason: 'toolUse' }) : fauxAssistantMessage('ok');
    };
    faux.setResponses(Array.from({ length: 2000 }, () => step));
    runtimes[agent] = runtime;
    models[agent] = model;
  }
  const base = piDriver({ runtimeFor: (a) => runtimes[a], modelFor: (a) => models[a], connectorEnv, fetchImpl });
  return {
    local: true,
    configuredEffort: base.configuredEffort,
    open: async (args) => {
      const inner = await base.open(args);
      return { ...inner, turn: (text, o) => ((pending[args.agent] = [...(o.calls ?? [])]), inner.turn(text, o)) };
    },
    dispose: () => registrations.forEach((r) => r.unregister()),
  };
}
