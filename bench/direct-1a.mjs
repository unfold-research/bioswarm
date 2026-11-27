// Phase 1a on the direct Pi host (host amendment 0f5e158): three persistent Pi sessions per attempt on this Mac,
// the frozen 0.1 connector in B and C, the local send_message bridge in all arms, Control on BenchHost through a
// loopback tunnel. Commands: plan | freeze | status | smoke | activate <0..2> | run <0..8>.
// Records hold counts, durations, token categories and costs only: never prompts, messages or file contents.
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { blindMemo } from './blind.mjs';
import { budgetResult, initializeBudget } from './budget.mjs';
import { initializeQueue, queueCounts } from './bridge-queue.mjs';
import { brief, prepareCase, score, seeds } from './case.mjs';
import {
  connectorBlobs, connectorRevision, controlRoute, digestFiles, piBaseEnv, manipulation, measureTurns, model, piArgs, piVersion, readJsonl,
  runTeam, sampleGate, sessionFiles, smokeTools, smokeVerdict, team, verifyConnector,
} from './direct-1a-core.mjs';
import { hostName, hostSnapshot, requireStartSpace, studyHost } from './direct-host-health.mjs';
import { perTurnUsd } from './pi-budget/index.js';
import { teamPolicySnapshot } from './team-policy.mjs';
import { bioArm } from './study.mjs';

const repo = resolve(import.meta.dirname, '..');
const frozen = join(repo, '.bench', 'connector-0.1');
const cli = join(repo, 'node_modules', '.bin', 'pi');
const order = seeds.flatMap((seed, i) => [0, 1, 2].map((j) => ({ seed, arm: ['off', 'community', bioArm][(i + j) % 3] })));
const [cmd, index] = process.argv.slice(2);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

if (cmd === 'plan') {
  console.table(order);
  process.exit(0);
}
if (cmd === 'freeze') {
  mkdirSync(frozen, { recursive: true });
  for (const file of Object.keys(connectorBlobs))
    writeFileSync(join(frozen, file), execFileSync('git', ['-C', repo, 'show', connectorRevision + ':packages/connector-pi/' + file]));
  console.log(JSON.stringify({ frozen: verifyConnector(frozen) }));
  process.exit(0);
}
const calibrate = cmd === 'activate' && /^[0-2]$/.test(index ?? '');
const smoke = cmd === 'smoke';
if (cmd !== 'status' && !smoke && !calibrate && !(cmd === 'run' && /^\d$/.test(index ?? '') && order[Number(index)]))
  throw Error('Expected plan, freeze, status, smoke, activate <0..2> or run <0..8>');

// Leader's order of 25/11: on 0.1 only the technical activation (smoke) runs, outside the sample. Duration
// calibrations and the nine attempts stay implemented but closed here; efficacy moves to Phase 1b on 0.2.
if (calibrate || cmd === 'run')
  throw Error('Phase 1a collection on 0.1 is closed: only smoke runs. Efficacy is measured in Phase 1b on 0.2');
const results = process.env.PHASE1A_RESULTS;
if (!results || !isAbsolute(results)) throw Error('Set PHASE1A_RESULTS to an absolute private directory');
mkdirSync(results, { recursive: true, mode: 0o700 });
const workRoot = realpathSync(process.env.PHASE1A_WORK || tmpdir());
const readJson = (name) => (existsSync(join(results, name)) ? JSON.parse(readFileSync(join(results, name), 'utf8')) : null);

const connector = verifyConnector(frozen);
const bridgeFiles = ['pi-jail/index.js', 'pi-bridge/index.js', 'bridge-queue.mjs', 'pi-budget/index.js', 'direct-1a-core.mjs', 'direct-1a.mjs', 'team-policy.mjs']
  .map((name) => ({ name, path: join(repo, 'bench', name) }));
const treatment = {
  host: 'pi-direct',
  studyHost: hostName,
  piVersion,
  model: 'openai/' + model,
  thinking: 'medium',
  billing: 'subscription',
  auth: 'oauth',
  connector,
  bridge: 'local send_message, SQLite queue',
  instrumentDigest: digestFiles(bridgeFiles),
  runnerRevision: git('rev-parse', 'HEAD'),
};
const gate = () =>
  sampleGate({
    treatment,
    smoke: readJson('smoke.json'),
    activations: seeds.map((s) => readJson('activation-' + s + '.json')),
    calibration: JSON.parse(readFileSync(join(repo, 'results', 'phase1', 'JUDGE-CALIBRATION.json'), 'utf8')),
    approval: readJson('research-approval.json'),
  });
if (cmd === 'status') {
  console.log(JSON.stringify({ treatment, gate: gate(), host: hostSnapshot(workRoot) }, null, 2));
  process.exit(0);
}

// Preflight: nothing starts on a dirty runner, low disk, another attempt, wrong Pi or a non-subscription sign-in.
if (git('status', '--porcelain', '--', 'bench', 'packages')) throw Error('Commit the runner before an attempt');
const hostStart = requireStartSpace(workRoot);
const active = join(results, 'active-attempt.json');
if (existsSync(active)) throw Error('Earlier attempt requires reconciliation before starting another');
const piEnv = piBaseEnv(process.env, homedir());
if (spawnSync(cli, ['--version'], { env: piEnv, encoding: 'utf8' }).stdout.trim() !== piVersion) throw Error('Pi ' + piVersion + ' required');
const auth = spawnSync(cli, ['auth', 'check', '--provider', 'openai', '--model', model, '--json', '--no-refresh'], { env: piEnv, encoding: 'utf8' });
if (auth.status !== 0 || JSON.parse(auth.stdout).authType !== 'oauth') throw Error('Pi OpenAI subscription sign-in required');
if (!smoke && !readJson('smoke.json')?.pass) throw Error('Live smoke required for this treatment');
if (!smoke && JSON.stringify(readJson('smoke.json').treatment) !== JSON.stringify(treatment)) throw Error('Smoke ran on another treatment');
if (cmd === 'run') {
  const g = gate();
  if (!g.ready) throw Error('Sample gate not met: ' + g.problems.join(', '));
}
const { seed, arm } = smoke ? { seed: 419, arm: bioArm } : calibrate ? { seed: seeds[Number(index)], arm: 'off' } : order[Number(index)];

// Control on BenchHost, reached privately through a loopback tunnel. B and C get their policy from it.
// Mac: SSH tunnel on loopback. BenchHost: the local route to the Control container (direct-1a-core controlRoute).
const controlUrl = controlRoute(process.env.BIOSWARM_CONTROL_URL, studyHost);
const keyFile = process.env.BIOSWARM_CONTROL_KEY_FILE;
if (!keyFile || (statSync(keyFile).mode & 0o077) !== 0) throw Error('Control key file must exist with mode 0600');
const controlKey = readFileSync(keyFile, 'utf8').trim();
const health = await fetch(new URL('/health', controlUrl), { signal: AbortSignal.timeout(5000) });
if (!health.ok || !(await health.json()).ok) throw Error('Control unreachable');
async function assign(agent) {
  const res = await fetch(new URL('/v1/policy', controlUrl), {
    method: 'PUT',
    signal: AbortSignal.timeout(10000),
    headers: { authorization: 'Bearer ' + controlKey, 'content-type': 'application/json' },
    body: JSON.stringify({ agent, strategy: arm }),
  });
  if (!res.ok) throw Error('Control assignment failed: ' + res.status);
  return res.json();
}
async function getPolicy(agent) {
  const url = new URL('/v1/policy', controlUrl);
  url.searchParams.set('agent', agent);
  const res = await fetch(url, { headers: { authorization: 'Bearer ' + controlKey }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw Error('Control read-back failed: ' + res.status);
  return res.json();
}
function checkPolicy(policy) {
  if (policy.rules?.runBudgetUsd !== perTurnUsd || !String(policy.id).startsWith(arm + '@')) throw Error('Unexpected assigned policy');
  return policy;
}

const stamp = randomUUID();
writeFileSync(active, JSON.stringify({ stamp, seed, arm, smoke }), { flag: 'wx' });
const evidence = join(results, stamp);
mkdirSync(evidence, { recursive: true });
const write = (name, data) => writeFileSync(join(evidence, name + '.json'), JSON.stringify(data, null, 2) + '\n');
const work = join(workRoot, 'bioswarm-1a-' + stamp);
mkdirSync(work, { mode: 0o700 });
const folder = join(work, 'case'), field = join(work, 'field'), queue = join(work, 'queue.sqlite');
const sessions = join(work, 'sessions'), ledger = join(work, 'budget.sqlite');
mkdirSync(folder);
mkdirSync(field);
initializeQueue(queue);
initializeBudget(ledger);
const ids = team.map(() => 'agent-' + randomUUID());
const names = Object.fromEntries(ids.map((id, i) => [id, team[i]]));
const dirOf = (id) => join(work, 'agents', id);
const snapshot = arm === 'off' ? null : await teamPolicySnapshot(ids, assign, getPolicy, checkPolicy);
const policies = snapshot ? ids.map((id) => snapshot.ids[id]) : [];
for (const id of ids) {
  mkdirSync(join(dirOf(id), '.tmp'), { recursive: true });
  mkdirSync(join(sessions, id), { recursive: true });
  writeFileSync(join(dirOf(id), '.phase1-budget'), JSON.stringify({ ledger }));
  writeFileSync(join(dirOf(id), '.phase1-bridge'), JSON.stringify({ queue, team: ids.map((x) => ({ id: x, name: names[x] })) }));
  // Smoke: the jail allows only its toolset, reads in the case folder and the field, writes in the case folder.
  if (smoke)
    writeFileSync(join(dirOf(id), '.phase1-jail'), JSON.stringify({ tools: smokeTools, read: [folder, field], write: [folder] }));
  if (arm !== 'off') {
    writeFileSync(join(dirOf(id), '.bioswarm'), JSON.stringify({ field, gate: null }));
  }
}
const extensions = [join(repo, 'bench', 'pi-budget', 'index.js'), join(repo, 'bench', 'pi-bridge', 'index.js')];
if (smoke) extensions.unshift(join(repo, 'bench', 'pi-jail', 'index.js'));
if (arm !== 'off') extensions.push(join(frozen, 'index.js'));
const sessionIds = Object.fromEntries(ids.map((id) => [id, randomUUID()]));
const system = (id) =>
  `Você é ${names[id]}, da equipe ${team.join(', ')}. Pedidos de colegas chegam como mensagens; ` +
  'para escrever a um colega, use send_message com o nome dele.';
const oracle = smoke ? null : prepareCase(seed, folder);
const proof = join(folder, 'progress.ok');
const leadPrompt = smoke
  ? 'Escreva com leave_mark um finding no tópico phase1-check e leia o campo com read_marks. No mesmo turno, após ' +
    'registrar a marca, envie pelo send_message dois ponteiros curtos individuais ao colega ' + team[1] +
    ', sem pedir resposta. Quando o teto recusar o segundo, registre outro finding no mesmo tópico com o requisito ' +
    'recebido, leia o campo e use a ferramenta write para escrever a palavra OK no arquivo ' + proof + '.'
  : brief + '\nPasta: ' + folder + '. Equipe: ' + team.join(', ') +
    '. Use números inteiros sem separador de milhar no memorando. Para contatar dois colegas com teto por turno, o primeiro pode chamar o segundo.';
const stages = smoke
  ? [
      [{ agent: ids[1], prompt: 'Escreva com leave_mark um finding no tópico phase1-check e leia o campo com read_marks. Antes de terminar, use leave_mark com kind requirement, place ' + proof + ', to ' + ids[0] + ', text OK.' }],
      [
        { agent: ids[2], prompt: 'Escreva com leave_mark um finding no tópico phase1-check e leia o campo com read_marks. Leia o campo e termine.' },
        { agent: ids[0], prompt: leadPrompt },
      ],
    ]
  : [[{ agent: ids[0], prompt: leadPrompt }]];
const since = new Date().toISOString();
write('attempt', { stamp, seed, arm, since, smoke, treatment, host: hostStart });
const team1a = await runTeam({
  command: [cli],
  agents: ids,
  names,
  queue,
  stages,
  deadlineMs: smoke ? 600000 : 5400000,
  diskDir: workRoot,
  cwdFor: dirOf,
  envFor: (id) => ({
    ...piEnv,
    TMPDIR: join(dirOf(id), '.tmp'),
    ...(arm !== 'off' ? { BIOSWARM_API_URL: controlUrl.origin, BIOSWARM_API_KEY: controlKey } : {}),
  }),
  argsFor: (id, prompt) =>
    piArgs({ sessionDir: join(sessions, id), sessionId: sessionIds[id], extensions, system: system(id), prompt, tools: smoke ? smokeTools : undefined }),
});
const metrics = measureTurns(team1a.turns, team1a.start, ids);
const events = ids.map((id) => readJsonl(join(dirOf(id), '.bioswarm-events.jsonl')));
const remote = ids.map((id, i) => {
  const cache = join(dirOf(id), '.bioswarm-policy.json');
  return existsSync(cache) && JSON.parse(readFileSync(cache, 'utf8')).id === policies[i] &&
    events[i].some((e) => e.type === 'policy' && e.kind === 'remote');
});
const counts = queueCounts(queue);
const role = (id) => ids.indexOf(id);
const messages = {
  acceptedByRole: ids.map((id) => counts.accepted[id] ?? 0),
  bridgeRefusals: counts.refused.map((r) => ({ role: role(r.sender), reason: r.reason, n: r.n })),
  undelivered: counts.undelivered,
  maxDeliveryWaitMs: counts.maxDeliveryWaitMs,
};
const accepted = messages.acceptedByRole.reduce((a, b) => a + b, 0);
const sessionsPersistent = ids.every((id, i) => metrics.turnsByRole[i] === 0 || sessionFiles(join(sessions, id)) === 1);
const budget = budgetResult(ledger);
const armActive = arm === 'off' ? events.every((es) => es.length === 0) : remote.every(Boolean);
const comparable =
  budget.agents === 3 && budget.unpriced === 0 && metrics.contributors === 3 && metrics.failedTurns === 0 &&
  metrics.models.length === 1 && metrics.models[0] === model && metrics.estimatedUsd !== null &&
  !team1a.timedOut && !team1a.diskPaused && armActive && sessionsPersistent;
const host = {
  start: hostStart, end: hostSnapshot(workRoot), minAvailableBytes: team1a.minAvailableBytes,
  diskPaused: team1a.diskPaused, maxStudyWorkers: team1a.maxWorkers,
};
const base = {
  stamp, seed, arm, treatment, metrics, messages, manipulation: manipulation(events, policies), remote,
  sessionsPersistent, budget, host, timedOut: team1a.timedOut, comparable,
};
if (smoke) {
  const proofOk = existsSync(proof) && lstatSync(proof).isFile() && readFileSync(proof, 'utf8').trim() === 'OK';
  const verdict = smokeVerdict({ events, marks: readJsonl(join(field, 'field.jsonl')), ids, remote, accepted, proofOk, comparable });
  const record = { ...base, ...verdict };
  write('smoke', record);
  if (verdict.pass) writeFileSync(join(results, 'smoke.json'), JSON.stringify(record));
  console.log(JSON.stringify({ stamp, ...verdict, remote }));
  if (!verdict.pass) process.exitCode = 1;
} else {
  const record = { ...base, checks: score(folder, oracle), review: 'pending', incrementalApiUsd: null };
  write('measured', record);
  if (calibrate) writeFileSync(join(results, 'activation-' + seed + '.json'), JSON.stringify(record));
  else {
    appendFileSync(join(results, 'runs.jsonl'), JSON.stringify(record) + '\n');
    const memo = join(folder, 'close.md');
    if (existsSync(memo) && lstatSync(memo).isFile()) {
      const blindId = randomUUID(), blind = join(results, 'blind');
      mkdirSync(blind, { recursive: true });
      const redacted = blindMemo(readFileSync(memo, 'utf8'), [...team, ...ids]);
      writeFileSync(join(blind, blindId + '.md'), redacted.text);
      write('redactions', { blindId, removals: redacted.removals });
      const totals = [...oracle.balances.values()].reduce((a, r) => a.map((v, i) => v + r[i]), [0, 0, 0, 0]);
      writeFileSync(join(blind, blindId + '.json'), JSON.stringify({
        grossCents: totals[0], refundCents: totals[1], paidCents: totals[2], differenceCents: totals[3],
        exceptions: oracle.exceptions.size,
      }));
      appendFileSync(join(results, 'blind-key.jsonl'), JSON.stringify({ blindId, stamp }) + '\n', { mode: 0o600 });
    }
  }
  console.log(JSON.stringify({ stamp, seed, arm, comparable, checks: record.checks, observedWallSeconds: metrics.observedWallSeconds }));
  if (!comparable) process.exitCode = 1;
}
for (const name of ['balances.csv', 'exceptions.csv', 'close.md']) {
  const file = join(folder, name);
  if (existsSync(file) && lstatSync(file).isFile()) copyFileSync(file, join(evidence, name));
}
if (team1a.diskPaused) {
  // Retained as an operational incident: partial work stays for reconciliation, the next attempt is refused.
  write('incident', { kind: 'disk_pause', minAvailableBytes: team1a.minAvailableBytes });
  process.exitCode = 1;
} else {
  rmSync(work, { recursive: true });
  rmSync(active);
}
