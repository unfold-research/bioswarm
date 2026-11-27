// Phase 1b attempt runner (results/phase1b/PREREG.md). One attempt: three Pi agents, one arm, waves until every
// check passes, the 90-minute clock runs out, the US$ 9 team brake stops the work, or disk falls below the pause
// floor. Every wave: the runner verifies, publishes the failing checks, dispatches all three agents with the same
// observation, and waits for all of them. The record holds counts, times and hashes only: no prompts, messages,
// trace texts, memos or paths.
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignment, publishWave } from '../../packages/connector-pi/coordination.js';
import { budgetResult, initializeBudget } from '../budget.mjs';
import { perTurnUsd, teamUsd } from '../pi-budget/index.js';
import { observedSeconds, pricedUsage } from '../study.mjs';
import { initializeStudyCap, markerName as capMarker, studyCapResult, weightedOf } from './studycap.mjs';
import { drainInbox } from './bridge.js';
import { roles, team } from './case.mjs';
import { cases } from './cases.mjs';
import { changingTools, realTarget } from './driver.mjs';
import { agentWave, barrierSummary, barrierWave, checkWave, classSummary, coordinationOk } from './telemetry.mjs';
import { assignTeam, receivedSame } from './policy.mjs';
import { isolationReceipt, prepareModes } from './isolation.mjs';

export const arms = {
  A: { strategy: null, rules: null },
  B: { strategy: 'stigmergy', rules: { waitForTrace: false, tieBreak: null } },
  C: { strategy: 'stigwait-tiebreak', rules: { waitForTrace: true, tieBreak: 'hash', fallbackAfter: 3 } },
};
export const sequences = ['ABC', 'BCA', 'CAB', 'ACB', 'CBA', 'BAC'];
export const limits = { attemptMs: 90 * 60 * 1000, perTurnUsd, teamUsd, fallbackAfter: 3, diskSampleMs: 5000 };
export const plan = (kase = cases.v1) => {
  const seq = kase.sequences ?? sequences;
  return kase.sampleSeeds.flatMap((seed, i) => [...seq[i]].map((arm, position) => ({ index: i * seq[i].length + position, seed, arm, position })));
};

const lines = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const tally = (items, pick) => items.reduce((acc, x) => ((acc[pick(x)] = (acc[pick(x)] ?? 0) + 1), acc), {});

function wavePrompt({ kase, wave, agent, failing, taskDir, inbox, seed }) {
  const head = wave === 1 ? `Você é ${agent} (${roles[agent]}), da equipe ${team.map((a) => a + ' (' + roles[a] + ')').join(', ')}.\n${kase.brief(seed, taskDir)}\n\n` : '';
  const received = inbox.length ? inbox.map((m) => `- de ${m.from}: ${m.message}`).join('\n') : '(nenhuma)';
  return `${head}Onda ${wave}. Checks em falha publicados pelo verificador:\n${failing.map((c) => kase.describe(c, taskDir)).join('\n')}\nMensagens recebidas:\n${received}\nTrabalhe nesta onda e termine o turno quando tiver feito o que pode agora. O verificador roda de novo quando os três terminarem.`;
}

// Mechanical incidents (analysis contract of 26/11). A non-comparable attempt carries exactly one, by this priority.
// policy_mismatch suspends the whole sample. Pre-dispatch incidents cost nothing; dispatched ones keep cost and time.
// provider_429, provider_5xx and network: quota or transport signals (pre-flight probe or 429 during the attempt).
export const incidents = ['policy_mismatch', 'wrong_account', 'wrong_model', 'wrong_effort', 'provider_429', 'host_disk', 'host_preflight', 'provider_5xx', 'network'];
const firstIncident = (flags) => incidents.find((k) => flags[k]) ?? null;

// open(agent, ...) comes from driver.mjs (piDriver). health follows bench/direct-host-health.mjs. identity() reports
// whether Pi still uses the OAuth subscription (the SDK exposes no account id). tool: worker-module launcher.
// studyBalanceUsd (1b-r only): the study balance left before this attempt, from studyBrake. New spending is limited to it.
// publish: test hook only (a simulated 0.2 publisher); the CLI always uses the installed connector's publishWave.
export async function runAttempt({ kase = cases.v1, seed, arm, root, driver, health, control, identity, tool, countEvent, idleWavesLimit = 6, verifyTimeoutMs, limits: l = limits, studyBalanceUsd = null, publish = publishWave }) {
  if (!arms[arm]) throw Error('Unknown arm');
  const { strategy } = arms[arm];
  const startedAt = new Date().toISOString(),
    start = Date.now(),
    deadline = start + l.attemptMs;
  const attemptDir = realpathSync(mkdtempSync(join(root, 'phase1b-')));
  const run = randomUUID();
  // Refusal before dispatch: nothing ran, nothing was spent. The record still carries the mechanical reason.
  const refuse = (incident, receipts = {}) => {
    rmSync(attemptDir, { recursive: true, force: true });
    return { record: { run, case: kase.version, seed, arm, strategy, startedAt, dispatched: false, incident, comparable: false, ...receipts }, attemptDir, taskDir: null };
  };
  let hostStart;
  try {
    hostStart = health.requireStartSpace(attemptDir);
  } catch {
    return refuse('host_preflight');
  }
  const taskDir = join(attemptDir, 'task'),
    field = join(attemptDir, 'field'),
    waves = join(attemptDir, 'waves'),
    inbox = join(attemptDir, 'inbox'),
    ledger = join(attemptDir, 'ledger.sqlite');
  for (const d of [taskDir, field, waves, inbox]) mkdirSync(d, { mode: 0o700 });
  const oracle = kase.prepareCase(seed, taskDir);
  for (const c of kase.checkMap(seed)) if (kase.stub(c.place)) writeFileSync(join(taskDir, c.place), kase.stub(c.place));
  let isolation = null;
  if (tool) {
    prepareModes(attemptDir, taskDir);
    isolation = isolationReceipt(tool);
    if (!isolation.pass) return refuse('host_preflight', { isolation });
  }
  const accountStart = identity ? await identity() : null;
  if (accountStart && !(accountStart.oauth && accountStart.subscription)) return refuse('wrong_account', { isolation });
  // One minimal call through the same subscription and model, after the host controls and before any worker.
  const preflightCall = driver.probe ? await driver.probe() : null;
  const preflightWeightedUsd = preflightCall ? weightedOf(preflightCall.tokens) : 0; // null if the probe's tokens are unknown
  if (preflightCall) {
    const incident = preflightCall.http429 > 0 ? 'provider_429' : preflightCall.wrongModel > 0 ? 'wrong_model' : preflightCall.errors > 0 || preflightCall.responses === 0 ? (preflightCall.errorCodes.some((c) => c >= 500) ? 'provider_5xx' : 'network') : null;
    if (incident) return refuse(incident, { isolation, preflightCall, preflightWeightedUsd });
  }
  // The attempt's own ceiling: the study balance minus the probe just made. Unknown probe cost or no balance: no worker starts.
  const capUsd = studyBalanceUsd === null ? null : preflightWeightedUsd === null ? 0 : studyBalanceUsd - preflightWeightedUsd;
  if (capUsd !== null && !(capUsd > 0)) {
    rmSync(attemptDir, { recursive: true, force: true });
    return { record: { run, case: kase.version, seed, arm, strategy, startedAt, dispatched: false, incident: null, end: 'study-brake', comparable: false, isolation, preflightCall, preflightWeightedUsd }, attemptDir, taskDir: null };
  }
  initializeBudget(ledger);
  if (capUsd !== null) initializeStudyCap(ledger);
  const provider = { http429: 0, retries: 0 };
  const bridgeCounts = Object.fromEntries(team.map((a) => [a, { accepted: 0, refused: 0, chars: 0 }]));
  const cwds = Object.fromEntries(team.map((a) => [a, join(attemptDir, 'agents', a)]));
  // Assign and verify before anything starts; a divergent policy refuses the attempt. No local override.
  let policies = {},
    rules = null;
  try {
    if (strategy) ({ ids: policies, rules } = await assignTeam(control, arm, team));
    if (rules?.fallbackAfter !== undefined && rules.fallbackAfter !== l.fallbackAfter) throw Error('Control fallbackAfter differs from the wave threshold; attempt refused');
  } catch (err) {
    return refuse('policy_mismatch', { isolation, reason: String(err.message).replace(/[/\\][^\s]*/g, '') });
  }
  for (const agent of team) {
    mkdirSync(cwds[agent], { recursive: true, mode: 0o700 });
    writeFileSync(join(cwds[agent], '.phase1-budget'), JSON.stringify({ ledger }));
    if (capUsd !== null) writeFileSync(join(cwds[agent], capMarker), JSON.stringify({ ledger, capUsd }));
    if (strategy) writeFileSync(join(cwds[agent], '.bioswarm'), JSON.stringify({ field, waveDir: waves, gate: null }));
  }
  const handles = {};
  for (const agent of team) handles[agent] = await driver.open({ agent, cwd: cwds[agent], arm, roots: [taskDir, cwds[agent]], bridge: { self: agent, team, inbox, counts: bridgeCounts[agent] } });
  // Effort: configured in the SDK and effective in each session. The provider returns none, so none is claimed.
  const effortOk = () => team.every((a) => handles[a].effort?.() === driver.configuredEffort);
  if (driver.configuredEffort && !effortOk()) {
    for (const h of Object.values(handles)) await h.close();
    return refuse('wrong_effort', { isolation });
  }

  let minBytes = hostStart.availableBytes,
    diskStop = false;
  const sampler = setInterval(() => {
    const bytes = health.availableBytes(attemptDir);
    minBytes = Math.min(minBytes, bytes);
    if (bytes < health.pauseBytes && !diskStop) {
      diskStop = true;
      for (const h of Object.values(handles)) h.abort();
    }
  }, l.diskSampleMs);

  // Telemetry for Phase 1b-r (counts, IDs and instants only).
  const map = kase.checkMap(seed),
    placeByFile = new Map(map.map((c) => [join(taskDir, c.place), c.id]));
  const placeOf = (agent) => (path) => placeByFile.get(realTarget(cwds[agent], path)) ?? null;
  const publishedChecks = new Map(),
    waveTelemetry = [];
  // C under v2r: the wave file the connector reads carries the header and the map's class for every check, and every
  // decision the connector logged names the same class. B is not checked: its connector does not coordinate.
  const classOf = new Map(map.map((c) => [c.id, c.class]));
  function coordinationHeld(wave) {
    if (!kase.coordination) return true;
    const file = join(waves, 'wave-' + wave + '.json');
    const w = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
    const decisions = team.flatMap((a) => lines(join(cwds[a], '.bioswarm-events.jsonl')).filter((e) => e.type === 'decision' && e.wave === wave));
    return coordinationOk({ wave: w, header: kase.coordination, classOf, decisions });
  }
  function telemetryOf(wave, results, after) {
    const starts = results.map((r) => Date.parse(r.startedAt)),
      ends = results.map((r) => Date.parse(r.completedAt));
    const waveStart = Math.min(...starts),
      waveEnd = Math.max(...ends);
    const decisionsOf = (agent) => lines(join(cwds[agent], '.bioswarm-events.jsonl')).filter((e) => e.type === 'decision' && e.wave === wave).map((e) => ({ ...e, agent }));
    const marks = lines(join(field, 'field.jsonl')).filter((m) => (m.wave !== undefined ? m.wave === wave : m.at >= waveStart && m.at <= waveEnd));
    const agents = Object.fromEntries(team.map((a, i) => [a, agentWave({ turn: results[i], waveStart, waveEnd, placeOf: placeOf(a), decisions: decisionsOf(a) })]));
    // Each call reduced to its check ID; the path is dropped here.
    const calls = results.flatMap((r, i) => (r.toolCalls ?? []).map((c) => ({ tool: c.tool, accepted: c.accepted, ran: c.ran, check: c.path ? placeOf(team[i])(c.path) : null })));
    const passed = new Set(map.map((c) => c.id).filter((id) => !after.failing.some((f) => f.id === id)));
    const checks = checkWave({ map, published: publishedChecks.get(wave), decisions: team.flatMap(decisionsOf), marks, calls, markCheck: (m) => m.check ?? placeByFile.get(m.place) ?? null, passedAfter: passed });
    const barrier = barrierWave(results.map((r, i) => ({ agent: team[i], startedAt: r.startedAt, completedAt: r.completedAt })), waveEnd);
    return { wave, spanMs: waveEnd - waveStart, barrier, agents, checks };
  }
  const turns = [],
    verifications = [],
    reassignments = [];
  let v = kase.verifyAttempt(taskDir, oracle, { timeoutMs: verifyTimeoutMs, tool });
  verifications.push({ afterWave: 0, failing: v.failing.map((c) => ({ id: c.id, class: c.class, revision: c.revision, symptom: c.symptom.kind })) });
  let wave = 0,
    idle = 0,
    midIncident = null,
    effortEnd = true,
    end;
  // The connector's cached policy and its remote-load event, read after every wave (counts and ids only).
  const policyHeld = () =>
    team.every((a) => {
      const cache = join(cwds[a], '.bioswarm-policy.json');
      return existsSync(cache) && receivedSame(JSON.parse(readFileSync(cache, 'utf8')), policies, rules, a) && lines(join(cwds[a], '.bioswarm-events.jsonl')).some((e) => e.type === 'policy' && e.kind === 'remote');
    });
  try {
    for (;;) {
      if (!v.failing.length) end = 'complete';
      else if (diskStop) end = 'disk';
      else if (Date.now() >= deadline) end = 'timeout';
      else if (budgetResult(ledger).cost > l.teamUsd || budgetResult(ledger).stops > 0) end = 'budget';
      else if (capUsd !== null && (studyCapResult(ledger).weightedUsd >= capUsd || studyCapResult(ledger).unknown > 0)) end = 'study-brake';
      else if (idle >= idleWavesLimit) end = 'idle';
      else if (wave >= (l.maxWaves ?? Infinity)) end = 'wave-cap'; // tests only; the CLI never sets maxWaves
      if (end) break;
      wave++;
      // Phase 1b-r: the wave header opts the connector 0.3 into per-class coordination; every check carries its class.
      // Published identically in both arms; only C's connector acts on it.
      const scoped = kase.coordination ? { coordination: kase.coordination } : {};
      const published = publish(waves, { run, wave, root: taskDir, team, fallbackAfter: l.fallbackAfter, ...scoped, checks: v.failing.map((c) => ({ id: c.id, place: c.place, owners: c.owners, revision: c.revision, ...(kase.coordination ? { class: c.class } : {}) })) });
      publishedChecks.set(wave, v.failing.map((c) => ({ id: c.id, class: c.class })));
      if (rules?.waitForTrace && rules.tieBreak === 'hash')
        for (const c of published.checks) {
          const a = assignment(published, c, rules);
          if (a.fallback) reassignments.push({ wave, loneWaves: c.loneWaves, check: c.id, outsider: true, resolved: null });
        }
      const results = await Promise.all(
        team.map((agent) => handles[agent].turn(wavePrompt({ kase, wave, agent, failing: v.failing, taskDir, inbox: drainInbox(inbox, agent), seed }), { deadline, provider })),
      );
      // Effective actions (closed list of the amendment of 26/11): accepted write, edit, leave_mark and
      // send_message, plus the yield mark the connector actually wrote for a refused contender. Refusals do not count.
      const yields = lines(join(field, 'field.jsonl')).filter((m) => m.kind === 'yielded' && m.run === run && m.wave === wave);
      results.forEach((r, i) => (r.yielded = yields.filter((m) => m.by === team[i]).length));
      results.forEach((r, i) => turns.push({ wave, agent: team[i], ...r, deniedPaths: undefined }));
      // Identity and policy gate, before the verifier sees this wave's work.
      const account = identity ? await identity() : null;
      midIncident = firstIncident({
        policy_mismatch: (strategy && !policyHeld()) || (arm === 'C' && !coordinationHeld(wave)),
        wrong_account: account && !(account.oauth && account.subscription),
        wrong_model: results.some((r) => r.usage.wrongModel > 0),
        wrong_effort: driver.configuredEffort && !effortOk(),
      });
      if (midIncident) {
        end = 'incident';
        break;
      }
      const effective = results.reduce((n, r) => n + r.yielded + changingTools.reduce((m, t) => m + (r.accepted[t] ?? 0), 0), 0);
      idle = effective ? 0 : idle + 1;
      v = kase.verifyAttempt(taskDir, oracle, { timeoutMs: verifyTimeoutMs, tool });
      verifications.push({ afterWave: wave, failing: v.failing.map((c) => ({ id: c.id, class: c.class, revision: c.revision, symptom: c.symptom.kind })) });
      if (kase.coordination) waveTelemetry.push(telemetryOf(wave, results, v));
      for (const r of reassignments) if (r.wave === wave) r.resolved = !v.failing.some((c) => c.id === r.check);
    }
  } finally {
    clearInterval(sampler);
    effortEnd = !driver.configuredEffort || effortOk();
    for (const h of Object.values(handles)) await h.close();
  }
  const hostEnd = health.hostSnapshot(attemptDir);
  minBytes = Math.min(minBytes, hostEnd.availableBytes);

  // Manipulation checks and policy receipt, from the connector's own count-only logs and the field's mark kinds.
  const events = Object.fromEntries(team.map((a) => [a, lines(join(cwds[a], '.bioswarm-events.jsonl'))]));
  const marks = lines(join(field, 'field.jsonl'));
  const policyReceived = strategy
    ? team.every((a) => {
        const cache = join(cwds[a], '.bioswarm-policy.json');
        return existsSync(cache) && receivedSame(JSON.parse(readFileSync(cache, 'utf8')), policies, rules, a) && events[a].some((e) => e.type === 'policy' && e.kind === 'remote');
      })
    : team.every((a) => events[a].length === 0);
  const rulesFired = tally(Object.values(events).flat().filter((e) => e.type === 'rule'), (e) => e.rule);
  const sum = (k) => turns.reduce((s, t) => s + t.usage[k], 0);
  const tokens = { input: sum('input'), cacheRead: sum('cacheRead'), cacheWrite: sum('cacheWrite'), output: sum('output') };
  const sumBy = (a, field) => turns.filter((t) => t.agent === a).reduce((acc, t) => { for (const [k, n] of Object.entries(t[field])) acc[k] = (acc[k] ?? 0) + n; return acc; }, {});
  const toolCalls = Object.fromEntries(team.map((a) => [a, { attempted: sumBy(a, 'tools'), accepted: sumBy(a, 'accepted'), yieldMarks: turns.filter((t) => t.agent === a).reduce((s, t) => s + (t.yielded ?? 0), 0), readDenials: turns.filter((t) => t.agent === a).reduce((s, t) => s + t.readDenials, 0) }]));
  const participants = team.filter((a) => toolCalls[a].yieldMarks > 0 || changingTools.some((t) => toolCalls[a].accepted[t] > 0)).length;
  // Opportunity (amendment of 26/11): an ID the verifier published as failing in wave 1 or later. An ID already
  // resolved at wave 0 is excluded. failingAfterWork adds the stricter count of IDs still failing after a wave.
  const observed = { dispute: new Set(), directed: new Set() },
    afterWork = { dispute: new Set(), directed: new Set() };
  for (const ver of verifications.filter((x) => x.afterWave < wave)) for (const c of ver.failing) if (observed[c.class]) observed[c.class].add(c.id);
  for (const ver of verifications.filter((x) => x.afterWave >= 1)) for (const c of ver.failing) if (afterWork[c.class]) afterWork[c.class].add(c.id);
  const budget = budgetResult(ledger);
  const record = {
    run,
    case: kase.version,
    seed,
    arm,
    strategy,
    startedAt,
    endedAt: new Date().toISOString(),
    end,
    waves: wave,
    totalSeconds: (Date.now() - start) / 1000,
    setupSeconds: turns.length ? (Date.parse(turns[0].startedAt) - start) / 1000 : null,
    observedWallSeconds: observedSeconds(turns.map((t) => ({ started_at: t.startedAt, completed_at: t.completedAt }))),
    agentHours: turns.reduce((s, t) => s + (Date.parse(t.completedAt) - Date.parse(t.startedAt)), 0) / 3.6e6,
    tokens,
    weightedUsd: pricedUsage({ uncachedInput: tokens.input, cachedInput: tokens.cacheRead, cacheCreation: tokens.cacheWrite, output: tokens.output }),
    hostEstimatedUsd: sum('hostUsd'),
    modelResponses: sum('responses'),
    budget: { ...budget, overspendUsd: Math.max(0, (budget.cost ?? 0) - l.teamUsd) },
    provider,
    acceptance: v.acceptance,
    deterministicAccepted: Object.values(v.acceptance).every(Boolean),
    review: 'pending',
    verifications,
    observedOpportunities: { dispute: observed.dispute.size, directed: observed.directed.size },
    failingAfterWork: { dispute: afterWork.dispute.size, directed: afterWork.directed.size },
    idleStop: end === 'idle',
    reassignments,
    manipulation: {
      messages: Object.fromEntries(team.map((a) => [a, { ...bridgeCounts[a], chars: undefined }])),
      messageChars: Object.fromEntries(team.map((a) => [a, bridgeCounts[a].chars])),
      marks: tally(marks, (m) => m.kind),
      addressedRequirements: marks.filter((m) => m.kind === 'requirement' && m.to).length,
      rulesFired,
      recoveries: rulesFired.stalled_check_reassigned ?? 0,
    },
    toolCalls,
    // Proxy only: count of accepted reads and characters returned to the agents, measured without keeping any text.
    inputReadProxy: { reads: turns.reduce((n, t) => n + (t.accepted.read ?? 0), 0), chars: turns.reduce((n, t) => n + (t.readChars ?? 0), 0) },
    participants,
    policyReceived,
    host: { start: hostStart, end: hostEnd, minAvailableBytes: minBytes, studyWorkers: team.length },
    errors: { turnsFailed: turns.filter((t) => t.failed).length, providerErrors: sum('errors'), wrongModel: sum('wrongModel'), unpriced: sum('unpriced') + (budget.unpriced ?? 0), unknownUsage: turns.reduce((n, t) => n + (t.usage.unknownUsage ?? 0), 0) },
  };
  record.dispatched = true;
  record.isolation = isolation;
  record.preflightCall = preflightCall; // separate from the attempt's tokens and cost
  // The probe priced by the same fixed table, kept apart from weightedUsd and counted by the 1b-r study brake.
  record.preflightWeightedUsd = preflightWeightedUsd;
  if (capUsd !== null) {
    // Spending inside the attempt against its ceiling; responses already in flight when it was crossed are the excess.
    const cap = studyCapResult(ledger);
    record.studyCap = { capUsd, weightedUsd: cap.weightedUsd, unknownResponses: cap.unknown, blockedToolCalls: cap.stops, overspendUsd: Math.max(0, cap.weightedUsd - capUsd), stopped: end === 'study-brake' || cap.stops > 0 };
  }
  if (kase.coordination) {
    record.waveTelemetry = waveTelemetry;
    record.classSummary = classSummary(waveTelemetry);
    record.barrier = barrierSummary(waveTelemetry);
    record.coordination = { header: kase.coordination, held: arm !== 'C' || [...publishedChecks.keys()].every((w) => coordinationHeld(w)) };
  }
  record.effort = { configured: driver.configuredEffort ?? null, effective: effortEnd ? driver.configuredEffort ?? null : 'diverged', returnedByProvider: null };
  record.incident = firstIncident({
    policy_mismatch: midIncident === 'policy_mismatch' || (strategy && !policyReceived),
    wrong_account: midIncident === 'wrong_account',
    wrong_model: midIncident === 'wrong_model' || record.errors.wrongModel > 0,
    wrong_effort: midIncident === 'wrong_effort' || !effortEnd,
    provider_429: provider.http429 > 0, // quota signal during the attempt: operational incident, no paid fallback
    host_disk: end === 'disk',
  });
  // Comparability is mechanical only: no performance or outcome criterion. Price and telemetry errors stay as raw
  // facts in record.errors and limit the metrics they touch.
  record.comparable = record.incident === null;
  // The memo really missing when the attempt closes is a review outcome, not a pending verdict.
  record.review = existsSync(join(taskDir, 'close.md')) && lstatSync(join(taskDir, 'close.md')).isFile() ? 'pending' : 'missing';
  return { record, attemptDir, taskDir };
}

export const cleanup = (attemptDir) => rmSync(attemptDir, { recursive: true, force: true });
