import {
  appendFileSync,
  copyFileSync,
  lstatSync,
  readlinkSync,
  symlinkSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { initializeBudget, budgetResult } from './budget.mjs';
import { perTurnUsd } from './pi-budget/index.js';
import { blindMemo } from './blind.mjs';
import { bioArm } from './study.mjs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { api, measure, waitTeam } from './host.mjs';
import { brief, prepareCase, score, seeds } from './case.mjs';

const order = seeds.flatMap((seed, i) =>
  [0, 1, 2].map((j) => ({ seed, arm: ['off', 'community', bioArm][(i + j) % 3] })),
);
const [cmd, index] = process.argv.slice(2);
if (cmd === 'plan') {
  console.table(order);
  process.exit(0);
}
const calibrate = cmd === 'activate' && /^[0-2]$/.test(index);
if (!calibrate && cmd !== 'smoke' && !(cmd === 'run' && /^\d+$/.test(index) && order[Number(index)]))
  throw Error('Expected plan, smoke or run <0..8>');
if (cmd !== 'smoke')
  throw Error('Run Phase 1a only from its frozen 0.1 checkout. Phase 1b has a separate protocol.');
const config = JSON.parse(readFileSync('/results/team.json', 'utf8'));
const ids = config.ids;
if (
  !Array.isArray(ids) ||
  ids.length !== 3 ||
  new Set(ids).size !== 3 ||
  !ids.every((x) => /^agent-[a-zA-Z0-9-]+$/.test(x)) ||
  config.model !== 'openai/gpt-6.1-sol' ||
  !config.account ||
  config.billing !== 'subscription'
)
  throw Error('Dedicated three-agent subscription team required');
const enabled = await api('GET', '/v1/agents');
if (!ids.every((id) => enabled.some((a) => a.id === id)))
  throw Error('Enable Local scripts for all three study agents');
const names = ids.map((id) => enabled.find((a) => a.id === id).name);
const dirs = ids.map((id) => join('/data/OpenBot/Agents', id));
if (!dirs.every(existsSync)) throw Error('Agent workspace missing');
if (measure(ids, '1970-01-01T00:00:00.000Z').busy) throw Error('Study team already busy');
const smoke = cmd === 'smoke',
  { seed, arm } = smoke
    ? { seed: 419, arm: bioArm }
    : calibrate
      ? { seed: seeds[Number(index)], arm: 'off' }
      : order[Number(index)];
const stamp = randomUUID(),
  folder = join('/data/OpenBot/Shared/phase1', stamp);
const results = '/results',
  evidence = join(results, stamp);
mkdirSync(evidence, { recursive: true });
function write(name, data) {
  writeFileSync(join(evidence, name + '.json'), JSON.stringify(data, null, 2) + '\n');
}
const hostVersion = config.hostVersion;
if (!/^\d+\.\d+\.\d+$/.test(hostVersion)) throw Error('Missing measured OpenBot version');
const treatment = {
  hostVersion,
  model: config.model,
  account: config.account,
  ids,
  connectorRevision: process.env.CONNECTOR_REVISION,
};
if (!/^[a-f0-9]{40}$/.test(treatment.connectorRevision ?? '')) throw Error('Set exact checkout revision');
if (!smoke) {
  const gate = JSON.parse(readFileSync(join(results, 'smoke.json'), 'utf8'));
  if (!gate.pass || JSON.stringify(gate.treatment) !== JSON.stringify(treatment))
    throw Error('Live smoke required for this team, model, host and connector');
}
if (cmd === 'run') {
  const signoff = JSON.parse(readFileSync(join(results, 'research-approval.json'), 'utf8'));
  if (
    signoff.revision !== treatment.connectorRevision ||
    signoff.approved !== true ||
    signoff.reviewer !== 'Research Leader' ||
    !signoff.blindReviewerConfirmed
  )
    throw Error('Research approval and a blind reviewer are required');
  const times = seeds
    .map((s) => {
      const r = JSON.parse(readFileSync(join(results, 'activation-' + s + '.json'), 'utf8'));
      if (!r.comparable || JSON.stringify(r.treatment) !== JSON.stringify(treatment))
        throw Error('Activation must match this treatment');
      return r.metrics.observedWallSeconds;
    })
    .sort((a, b) => a - b);
  if (times[1] < 1800) throw Error('Baseline too short: amend case and repeat activation');
}
const policyKey = readFileSync('/run/secrets/control_key', 'utf8').trim();
async function assign(id) {
  const res = await fetch('http://control:8787/v1/policy', {
    method: 'PUT',
    headers: { authorization: 'Bearer ' + policyKey, 'content-type': 'application/json' },
    body: JSON.stringify({ agent: id, strategy: arm }),
  });
  if (!res.ok) throw Error('Control assignment failed: ' + res.status);
  const policy = await res.json();
  if (policy.rules?.runBudgetUsd !== perTurnUsd || !policy.id.startsWith(arm + '@'))
    throw Error('Unexpected assigned policy');
  return policy.id;
}
const priorPending = join(results, 'active-attempt.json');
if (existsSync(priorPending)) throw Error('Earlier attempt requires reconciliation before starting another');
writeFileSync(priorPending, JSON.stringify({ stamp, seed, arm, smoke }), { flag: 'wx' });
mkdirSync(folder, { recursive: true });
const ledgersDir = '/data/.config/bioswarm-bench-ledgers';
mkdirSync(ledgersDir, { recursive: true, mode: 0o700 });
const ledger = join(ledgersDir, stamp + '.sqlite');
initializeBudget(ledger);
const extDir = '/data/.pi/agent/extensions';
const budgetLink = join(extDir, 'phase1-budget');
mkdirSync(extDir, { recursive: true });
if (!lstatSync(budgetLink, { throwIfNoEntry: false })) symlinkSync('/opt/phase1-budget', budgetLink);
if (readlinkSync(budgetLink) !== '/opt/phase1-budget') throw Error('Study budget extension path is occupied');
const expected = [],
  offsets = [];
for (const [i, id] of ids.entries()) {
  const settings = await api('POST', '/v1/agents/' + id + '/settings', {
    provider: 'pi',
    model: config.model,
    providerAccountId: config.account,
    reasoningEffort: 'medium',
  });
  if (
    settings.provider !== 'pi' ||
    settings.model !== config.model ||
    settings.reasoningEffort !== 'medium' ||
    settings.providerAccountId !== config.account
  )
    throw Error('Provider settings mismatch');
  const dir = dirs[i],
    marker = join(dir, '.bioswarm'),
    cache = join(dir, '.bioswarm-policy.json');
  if (existsSync(marker)) {
    const previous = JSON.parse(readFileSync(marker, 'utf8'));
    if (!String(previous.field ?? '').startsWith('/data/OpenBot/Shared/phase1/'))
      throw Error('Refusing to replace unrelated agent settings');
    rmSync(marker);
  }
  if (existsSync(cache)) rmSync(cache);
  if (arm !== 'off') {
    expected.push(await assign(id));
    writeFileSync(marker, JSON.stringify({ field: join(folder, 'field'), gate: null }));
  }
  writeFileSync(join(dir, '.phase1-budget'), JSON.stringify({ ledger }));
  await api('POST', '/v1/agents/' + id + '/context/clear');
  const log = join(dir, '.bioswarm-events.jsonl');
  offsets.push(existsSync(log) ? statSync(log).size : 0);
}
mkdirSync(folder, { recursive: true });
if (smoke) {
  const { publishWave } = await import('/opt/bioswarm/packages/connector-pi/coordination.js');
  publishWave(join(folder, 'field', 'waves'), {
    run: stamp,
    wave: 1,
    root: folder,
    team: ids,
    fallbackAfter: 3,
    checks: [{ id: 'progress', place: 'progress.ok', owners: [ids[0]], revision: 'open' }],
  });
}
const oracle = smoke ? null : prepareCase(seed, folder);
const since = new Date().toISOString(),
  deliveries = [];
write('attempt', { stamp, seed, arm, since, smoke, treatment });
for (const id of smoke ? [ids[1], ids[2], ids[0]] : [ids[0]]) {
  const i = ids.indexOf(id);
  const prompt = smoke
    ? `Escreva com leave_mark um finding no tópico phase1-check e leia o campo com read_marks. ${
        i === 0
          ? 'No mesmo turno, após registrar a marca, envie pelo send_message dois ponteiros curtos individuais ao colega ' +
            names[1] +
            ', sem pedir resposta. Quando o teto recusar o segundo, registre outro finding no mesmo tópico com o requisito recebido, leia o campo e use a ferramenta write para escrever a palavra OK no arquivo ' +
            join(folder, 'progress.ok') +
            '.'
          : i === 1
            ? 'Antes de terminar, use leave_mark com kind requirement, place ' +
              join(folder, 'progress.ok') +
              ', to ' +
              ids[0] +
              ', text OK.'
            : 'Leia o campo e termine.'
      }`
    : brief +
      '\nPasta: ' +
      folder +
      '. Equipe: ' +
      names.join(', ') +
      '. Use números inteiros sem separador de milhar no memorando. Para contatar dois colegas com teto por turno, o primeiro pode chamar o segundo.';
  const sent = await api('POST', '/v1/agents/' + id + '/messages', {
    text: prompt,
    clientMessageId: stamp + '-' + i,
  });
  const delivery = sent.deliveries.find((d) => d.recipientAgentId === id);
  if (!delivery) throw Error('No delivery receipt');
  deliveries.push({ agent: id, id: delivery.id });
  if (smoke && i === 1) {
    const donor = await waitTeam(ids, deliveries, since, 180000);
    if (donor.timedOut || donor.statuses[0] !== 'completed') throw Error('Trace sender did not complete');
  }
}
const state = await waitTeam(ids, deliveries, since, smoke ? 600000 : 5400000);
const events = dirs.map((dir, i) => {
  const log = join(dir, '.bioswarm-events.jsonl');
  return existsSync(log)
    ? readFileSync(log).subarray(offsets[i]).toString().split('\n').filter(Boolean).map(JSON.parse)
    : [];
});
const remote = dirs.map((d, i) => {
  const f = join(d, '.bioswarm-policy.json');
  return (
    existsSync(f) &&
    JSON.parse(readFileSync(f, 'utf8')).id === expected[i] &&
    events[i].some((e) => e.type === 'policy' && e.kind === 'remote')
  );
});
const active = arm === 'off' ? events.every((es) => es.length === 0) : remote.every(Boolean);
const finished = state.statuses.length > 0 && state.statuses.every((s) => s === 'completed');
const recordedModel = state.metrics.models[0];
const modelMatches = recordedModel === config.model || recordedModel === config.model.split('/').at(-1);
const budget = budgetResult(ledger);
const comparable =
  budget.agents === ids.length &&
  budget.unpriced === 0 &&
  modelMatches &&
  finished &&
  !state.timedOut &&
  active &&
  state.metrics.contributors === 3 &&
  state.metrics.estimatedUsd !== null &&
  state.metrics.models.length === 1 &&
  state.metrics.providers.join() === 'pi';
if (smoke) {
  const field = join(folder, 'field', 'field.jsonl');
  const marks = existsSync(field)
    ? readFileSync(field, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
    : [];
  const writers = new Set(marks.map((m) => m.by));
  const tools = events
    .flat()
    .filter((e) => e.type === 'tool')
    .map((e) => e.tool);
  const bridge = [...new Set(tools.filter((x) => /(?:^|[._])send_message$/.test(x)))];
  const crossRead = events.some((es, i) => {
    const ownMarks = marks.filter((m) => m.by === ids[i]).length;
    return es.some((e) => e.type === 'read_marks' && e.count > ownMarks);
  });
  const leadEvents = events[0];
  const markBefore = leadEvents.findIndex((e) => e.type === 'mark');
  const firstMessage = leadEvents.findIndex((e) => e.type === 'message_sent');
  const refused = leadEvents.findIndex(
    (e) => e.type === 'rule' && ['message_ceiling', 'session_ceiling'].includes(e.rule),
  );
  const after = leadEvents.slice(refused + 1);
  const proof = join(folder, 'progress.ok');
  const continued =
    markBefore >= 0 &&
    firstMessage > markBefore &&
    refused > firstMessage &&
    after.some((e) => e.type === 'mark') &&
    after.some((e) => e.type === 'read_marks') &&
    after.some((e) => e.type === 'tool' && e.tool === 'write') &&
    existsSync(proof) &&
    lstatSync(proof).isFile() &&
    readFileSync(proof, 'utf8').trim() === 'OK';
  const pass =
    continued &&
    comparable &&
    ids.every((id) => writers.has(id)) &&
    crossRead &&
    bridge.length > 0 &&
    events.flat().some((e) => e.type === 'message_sent') &&
    state.metrics.agentMessages > 0;
  const record = {
    stamp,
    pass,
    treatment,
    remote,
    writers: writers.size,
    crossRead,
    bridge,
    continued,
    budget,
    ...state,
  };
  write('smoke', record);
  if (pass) writeFileSync(join(results, 'smoke.json'), JSON.stringify(record));
  console.log(JSON.stringify({ stamp, pass, remote, writers: writers.size, crossRead, bridge }));
  if (!pass) process.exitCode = 1;
} else {
  const checks = score(folder, oracle);
  const manipulation = events.map((log, i) => {
    const isCeiling = (e) => e.type === 'rule' && ['message_ceiling', 'session_ceiling'].includes(e.rule);
    const first = log.findIndex(isCeiling);
    return {
      policyId: expected[i] ?? null,
      ceilingRefusals: log.filter(isCeiling).length,
      fieldWritesAfterCeiling: first < 0 ? 0 : log.slice(first + 1).filter((e) => e.type === 'mark').length,
    };
  });
  const record = {
    stamp,
    seed,
    arm,
    treatment,
    ...state,
    budget,
    comparable,
    checks,
    manipulation,
    review: 'pending',
    incrementalApiUsd: null,
  };
  write('measured', record);
  if (calibrate) writeFileSync(join(results, 'activation-' + seed + '.json'), JSON.stringify(record));
  else {
    appendFileSync(join(results, 'runs.jsonl'), JSON.stringify(record) + '\n');
    const memo = join(folder, 'close.md');
    if (existsSync(memo) && lstatSync(memo).isFile()) {
      const blindId = randomUUID();
      const blind = join(results, 'blind');
      mkdirSync(blind, { recursive: true });
      const redacted = blindMemo(readFileSync(memo, 'utf8'), [...names, ...ids]);
      writeFileSync(join(blind, blindId + '.md'), redacted.text);
      write('redactions', { blindId, removals: redacted.removals });
      const totals = [...oracle.balances.values()].reduce((a, r) => a.map((v, i) => v + r[i]), [0, 0, 0, 0]);
      writeFileSync(
        join(blind, blindId + '.json'),
        JSON.stringify({
          grossCents: totals[0],
          refundCents: totals[1],
          paidCents: totals[2],
          differenceCents: totals[3],
          exceptions: oracle.exceptions.size,
        }),
      );
      appendFileSync(join(results, 'blind-key.jsonl'), JSON.stringify({ blindId, stamp }) + '\n', {
        mode: 0o600,
      });
    }
  }
  console.log(JSON.stringify(record));
  if (!comparable) process.exitCode = 1;
}

if (!state.timedOut && !state.metrics.busy) {
  for (const name of ['balances.csv', 'exceptions.csv', 'close.md']) {
    const file = join(folder, name);
    if (existsSync(file) && lstatSync(file).isFile()) copyFileSync(file, join(evidence, name));
  }
  for (const dir of dirs) rmSync(join(dir, '.phase1-budget'), { force: true });
  rmSync(folder, { recursive: true });
  rmSync(priorPending);
}
