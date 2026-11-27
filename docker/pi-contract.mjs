// Docker contract check with genuine Pi sessions, a deterministic model and the private Control API.
// Runs in a separate directory from the live OpenBot team. Never an end-user benchmark observation.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { Type } from 'typebox';
import { fauxAssistantMessage, fauxToolCall, registerFauxProvider } from '@earendil-works/pi-ai/compat';
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
} from '@earendil-works/pi-coding-agent';

const invocation = process.argv[2],
  root = process.env.CONTRACT_ROOT || mkdtempSync(join(tmpdir(), 'bioswarm-pi-'));
process.env.BIOSWARM_API_KEY = readFileSync('/run/secrets/control_key', 'utf8').trim();
const api = async (method, path, body) => {
  const res = await fetch('http://control:8787' + path, {
    method,
    headers: { authorization: 'Bearer ' + process.env.BIOSWARM_API_KEY, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  assert.ok(res.ok, method + ' ' + path + ' ' + res.status);
  return res.json();
};
const pkg = resolve(import.meta.dirname, '../packages/connector-pi');
if (!invocation) {
  const { execFileSync } = await import('node:child_process');
  const team = ['a', 'b', 'c'].map((s) => 'contract-' + randomUUID() + '-' + s);
  mkdirSync(join(root, 'Shared'));
  const run = await api('POST', '/v1/runs', {
    goal: 'docker-contract',
    agents: team,
    strategy: 'stigwait-tiebreak',
    budgetUsd: 0.01,
  });
  for (const [i, id] of team.entries()) {
    const dir = join(root, 'Agents', id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.bioswarm'), '{}');
    execFileSync(process.execPath, [import.meta.filename, String(i)], {
      cwd: dir,
      stdio: 'inherit',
      env: { ...process.env, CONTRACT_ROOT: root, BIOSWARM_API_URL: 'http://control:8787' },
    });
  }
  let metrics;
  for (let i = 0; i < 20; i++) {
    metrics = (await api('GET', '/v1/runs/' + run.id)).metrics;
    if (metrics.requests === 3) break;
    await sleep(100);
  }
  assert.equal(metrics.requests, 3);
  assert.equal(metrics.marks, 3);
  assert.equal(metrics.messages, 3);
  const field = readFileSync(join(root, 'Shared', 'bioswarm', 'field.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(JSON.parse);
  assert.deepEqual(
    field.map((m) => m.by),
    team,
  );
  await api('POST', '/v1/runs/' + run.id + '/stop', {});
  console.log(
    JSON.stringify({
      host: 'Pi in Docker, fixture provider',
      sessions: 3,
      remotePolicies: 3,
      fieldWriters: 3,
      controlRunEnds: metrics.requests,
      mockBridgeCalls: metrics.messages,
    }),
  );
} else {
  const agentDir = mkdtempSync(join(tmpdir(), 'bioswarm-pi-home-'));
  mkdirSync(join(agentDir, 'extensions'));
  symlinkSync(pkg, join(agentDir, 'extensions', 'bioswarm'));
  const faux = registerFauxProvider(),
    model = faux.getModel();
  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir, 'auth.json'),
    modelsPath: join(agentDir, 'models.json'),
  });
  await modelRuntime.setRuntimeApiKey(model.provider, 'fixture');
  modelRuntime.registerProvider(model.provider, { baseUrl: model.baseUrl, api: model.api, models: [model] });
  const bridge = 'mcp__openbot_feedcafe__send_message';
  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir,
    noSkills: true,
    noThemes: true,
    noPromptTemplates: true,
    extensionFactories: [
      (pi) =>
        pi.registerTool({
          name: bridge,
          label: 'Demo bridge',
          description: 'Fixture pointer.',
          parameters: Type.Object({ text: Type.String() }),
          async execute() {
            return { content: [{ type: 'text', text: 'ok' }], details: {} };
          },
        }),
    ],
  });
  await loader.reload();
  const { session } = await createAgentSession({
    cwd: process.cwd(),
    agentDir,
    modelRuntime,
    model,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
  });
  const call = (name, args) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: 'toolUse' });
  try {
    faux.setResponses([
      call('leave_mark', { kind: 'finding', place: 'probe', text: 'fixture' }),
      call('read_marks', { place: 'probe' }),
      call(bridge, { text: 'see probe' }),
      fauxAssistantMessage('ok'),
    ]);
    await session.prompt('Contract check.');
    assert.match(JSON.parse(readFileSync('.bioswarm-policy.json')).id, /^stigwait-tiebreak@/);
    const events = readFileSync('.bioswarm-events.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(events.some((e) => e.type === 'read_marks' && e.count === Number(invocation) + 1));
    assert.ok(events.some((e) => e.type === 'message_sent'));
  } finally {
    session.dispose();
  }
}
