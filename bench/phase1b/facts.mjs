// The four pre-sample integrity facts of results/phase1b/PREREG.md, on the policy the Control really sends (arm C,
// stigwait-tiebreak) and the 1b check representation of a calibration seed. Directive prompts make the real model
// act like the scripted agents of the tests. No real model runs unless the CLI is started in live mode.
//   (i)   a write is refused without a trace addressed to the writer, and allowed after a peer's trace;
//   (ii)  two disputants produce exactly one writer and one yield mark;
//   (iii) after the message ceiling refuses a message, field work and writing continue;
//   (iv)  only a check left alone and unchanged for three waves goes to the outsider, who acts on an addressed trace.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignment, publishWave } from '../../packages/connector-pi/coordination.js';
import { initializeBudget } from '../budget.mjs';
import { team } from './case.mjs';
import { cases } from './cases.mjs';
import { arms } from './runner.mjs';
import { assignTeam, receivedSame } from './policy.mjs';

const lines = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

// One step = one agent turn, described both as tool calls (for scripted agents) and as a directive prompt.
export const say = {
  write: (path, content) => ({ kind: 'write', calls: [{ tool: 'write', args: { path, content } }], text: `Use a ferramenta write exatamente uma vez em ${path} com o conteúdo ${content}. Se for recusada, não tente de novo e termine.` }),
  trace: (place, to) => ({ kind: 'trace', calls: [{ tool: 'leave_mark', args: { kind: 'requirement', place, to, text: 'Requisito: grave o valor combinado.' } }], text: `Use leave_mark uma vez com kind requirement, place ${place}, to ${to} e text "Requisito: grave o valor combinado." Depois termine.` }),
  ceiling: (to, topic, path, content) => ({
    kind: 'ceiling',
    calls: [
      { tool: 'send_message', args: { to, message: 'Veja o campo.' } },
      { tool: 'send_message', args: { to, message: 'Segundo aviso.' } },
      { tool: 'leave_mark', args: { kind: 'finding', place: topic, text: 'Achado registrado após o teto.' } },
      { tool: 'read_marks', args: {} },
      { tool: 'write', args: { path, content } },
    ],
    text: `Faça nesta ordem, cada ação uma vez: send_message para ${to} com "Veja o campo."; send_message para ${to} com "Segundo aviso."; se a segunda for recusada, leave_mark com kind finding, place ${topic} e text "Achado registrado após o teto."; read_marks; e write em ${path} com o conteúdo ${content}. Depois termine.`,
  }),
};

class TransportAbort extends Error {
  constructor(turn) {
    super('transport failed before any mechanism was observed');
    this.turn = turn;
  }
}

export async function runFacts({ root, driver, control, kase = cases.v1, seed = kase.calibrationSeeds[0] }) {
  const { strategy } = arms.C;
  const dir = realpathSync(mkdtempSync(join(root, 'phase1b-facts-')));
  const task = join(dir, 'task'),
    field = join(dir, 'field'),
    waves = join(dir, 'waves'),
    inbox = join(dir, 'inbox'),
    ledger = join(dir, 'ledger.sqlite');
  for (const d of [task, field, waves, inbox]) mkdirSync(d);
  initializeBudget(ledger);
  const map = kase.checkMap(seed);
  const directed = map.find((c) => c.class === 'directed'),
    dispute = map.find((c) => c.class === 'dispute'),
    lone = map.find((c) => c.class === 'own' && c.id !== directed.id) ?? map.find((c) => c.id === 'memo');
  for (const c of [directed, dispute, lone]) writeFileSync(join(task, c.place), 'OPEN');
  const path = (c) => join(task, c.place);
  const read = (c) => readFileSync(path(c), 'utf8').trim();
  const cwds = Object.fromEntries(team.map((a) => [a, join(dir, 'agents', a)]));
  const { ids: policies, rules } = await assignTeam(control, 'C', team);
  const counts = {};
  for (const a of team) {
    mkdirSync(cwds[a], { recursive: true });
    writeFileSync(join(cwds[a], '.phase1-budget'), JSON.stringify({ ledger }));
    writeFileSync(join(cwds[a], '.bioswarm'), JSON.stringify({ field, waveDir: waves, gate: null }));
    counts[a] = { accepted: 0, refused: 0, chars: 0 };
  }
  const h = {};
  for (const a of team) h[a] = await driver.open({ agent: a, cwd: cwds[a], arm: 'C', roots: [task, cwds[a]], bridge: { self: a, team, inbox, counts: counts[a] } });
  const run = 'facts-' + seed;
  const publish = (wave, checks) => publishWave(waves, { run, wave, root: task, team, fallbackAfter: 3, checks: checks.map((c) => ({ id: c.id, place: c.place, owners: c.owners, revision: 'open' })) });
  const events = (a) => lines(join(cwds[a], '.bioswarm-events.jsonl'));
  const marks = () => lines(join(field, 'field.jsonl'));
  // A numeric summary of every turn: no prompt, path, tool argument or provider text. calls is ignored by the real
  // model; a scripted test agent performs exactly these tool calls.
  const turns = [];
  const mechanismSeen = () => marks().length > 0 || team.some((a) => events(a).some((e) => e.type === 'rule' || e.type === 'mark'));
  const turn = async (agent, step) => {
    const provider = { http429: 0, retries: 0 },
      started = Date.now(),
      rulesBefore = events(agent).filter((e) => e.type === 'rule').length;
    const expected = step.calls.length;
    const r = await h[agent].turn(step.text, { deadline: Date.now() + 10 * 60 * 1000, provider, calls: [...step.calls] });
    const u = r.usage;
    const summary = {
      n: turns.length + 1,
      agent,
      step: step.kind,
      durationMs: Date.now() - started,
      responses: u.responses,
      tokens: { input: u.input, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite },
      hostUsd: u.hostUsd,
      providerErrors: u.errors,
      errorCodes: u.errorCodes ?? [],
      stopReasons: u.stopReasons ?? {},
      http429: provider.http429,
      retries: provider.retries,
      toolsExpected: expected,
      toolsAttempted: Object.values(r.tools).reduce((a, b) => a + b, 0),
      toolsAccepted: Object.values(r.accepted).reduce((a, b) => a + b, 0),
      refusals: events(agent).filter((e) => e.type === 'rule').length - rulesBefore,
      readDenials: r.readDenials,
      timedOut: r.timedOut,
      failed: r.failed,
      wrongModel: u.wrongModel,
    };
    turns.push(summary);
    // Fail fast: a transport failure before any mechanism was observed makes every later fact meaningless.
    const transport = r.failed || r.timedOut || u.responses === 0 || (u.errors > 0 && summary.toolsAttempted === 0);
    if (transport && !mechanismSeen()) throw new TransportAbort(summary.n);
    return r;
  };
  const facts = {},
    observations = [];
  let firstOwnerChange = null,
    aborted = null;
  try {
    // Wave 1: two checks, so no fallback can happen. The hash draw depends on the wave, so (i) and (ii) complete
    // within this wave: first attempts refused, traces left, then the assigned writers succeed.
    const w1 = publish(1, [directed, dispute]);
    const owner = directed.owners[0],
      holder = directed.requirement.holder ?? team.find((a) => a !== owner);
    const winner = assignment(w1, w1.checks.find((c) => c.id === dispute.id), rules).agent,
      loser = dispute.owners.find((a) => a !== winner);
    const noFallback = w1.checks.every((c) => !assignment(w1, c, rules).fallback);
    await turn(owner, say.write(path(directed), 'FACT-I'));
    const refusedBeforeTrace = read(directed) === 'OPEN' && events(owner).some((e) => e.rule === 'wait_for_trace');
    await Promise.all(dispute.owners.map((a) => turn(a, say.write(path(dispute), 'FACT-II-' + a))));
    const disputeUntouched = read(dispute) === 'OPEN';
    await turn(holder, say.trace(path(directed), owner));
    await turn(loser, say.trace(path(dispute), winner));
    const third = team.find((a) => !dispute.owners.includes(a));
    await turn(third, say.ceiling(winner, 'fatos', path(dispute), 'FACT-III'));
    const disputeStillOpen = read(dispute) === 'OPEN';
    await turn(owner, say.write(path(directed), 'FACT-I'));
    await turn(winner, say.write(path(dispute), 'FACT-II-' + winner));
    facts.i = refusedBeforeTrace && read(directed) === 'FACT-I';
    const yields = marks().filter((m) => m.kind === 'yielded' && m.place === path(dispute) && dispute.owners.includes(m.by));
    facts.ii = noFallback && disputeUntouched && disputeStillOpen && read(dispute) === 'FACT-II-' + winner && yields.length === 1 && yields[0].by === loser && yields[0].to === winner;
    const ev = events(third),
      ceiling = ev.findIndex((e) => e.type === 'rule' && ['message_ceiling', 'session_ceiling'].includes(e.rule));
    const after = ceiling < 0 ? [] : ev.slice(ceiling + 1);
    facts.iii = ev.filter((e) => e.type === 'message_sent').length === 1 && ceiling >= 0 && after.some((e) => e.type === 'mark') && after.some((e) => e.type === 'read_marks') && after.some((e) => e.type === 'tool' && e.tool === 'write');
    // Waves 2 to 4: a single unchanged check. The owner fails twice; on the third lone wave the outsider is assigned.
    // Recorded per the approved amendment: the three consecutive observations, with the absolute wave number,
    // and the first effective change of owner (none in the first two, the outsider on the third, on a trace).
    const loneOwner = lone.owners[0];
    observations.length = 0;
    for (const wave of [2, 3]) {
      const w = publish(wave, [lone]);
      const a = assignment(w, w.checks[0], rules);
      observations.push({ wave, loneWaves: w.checks[0].loneWaves, assigned: a.agent, outsider: !lone.owners.includes(a.agent), fallback: a.fallback });
      await turn(loneOwner, say.write(path(lone), 'FACT-IV-OWNER'));
    }
    const ownerHeldBack = read(lone) === 'OPEN';
    const w4 = publish(4, [lone]);
    const rescue = assignment(w4, w4.checks[0], rules);
    observations.push({ wave: 4, loneWaves: w4.checks[0].loneWaves, assigned: rescue.agent, outsider: !lone.owners.includes(rescue.agent), fallback: rescue.fallback });
    await turn(loneOwner, say.trace(path(lone), rescue.agent));
    const traced = marks().some((m) => m.kind === 'requirement' && m.place === path(lone) && m.to === rescue.agent && m.wave === 4);
    await turn(rescue.agent, say.write(path(lone), 'FACT-IV'));
    const changed = read(lone) === 'FACT-IV';
    firstOwnerChange = changed ? { wave: 4, observation: observations.findIndex((o) => o.fallback) + 1, outsider: !lone.owners.includes(rescue.agent), addressedTrace: traced } : null;
    const noneEarly = observations.slice(0, 2).every((o) => !o.fallback && !o.outsider);
    facts.iv = noneEarly && observations.length === 3 && observations[2].loneWaves === 3 && ownerHeldBack && rescue.fallback && traced && changed && firstOwnerChange.observation === 3 && events(rescue.agent).some((e) => e.rule === 'stalled_check_reassigned');
  } catch (err) {
    if (!(err instanceof TransportAbort)) throw err;
    aborted = { reason: 'transport', atTurn: err.turn };
  } finally {
    for (const a of team) await h[a].close();
  }
  const policyReceived = team.every((a) => {
    const cache = join(cwds[a], '.bioswarm-policy.json');
    return existsSync(cache) && receivedSame(JSON.parse(readFileSync(cache, 'utf8')), policies, rules, a) && events(a).some((e) => e.type === 'policy' && e.kind === 'remote');
  });
  const tally = {};
  for (const a of team) for (const e of events(a)) if (e.type === 'rule') tally[e.rule] = (tally[e.rule] ?? 0) + 1;
  return { seed, facts, aborted, turns, fallbackAfter: rules.fallbackAfter, observations, firstOwnerChange, policyReceived, pass: !aborted && policyReceived && Object.values(facts).length === 4 && Object.values(facts).every(Boolean), rulesFired: tally, marks: marks().reduce((acc, m) => ((acc[m.kind] = (acc[m.kind] ?? 0) + 1), acc), {}), dir };
}
