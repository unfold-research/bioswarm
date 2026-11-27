// 1b-r integrity facts for the connector 0.3 class-aware waves (PREREG 1b-r: "Refazer integridade e fatos na revisão
// instalada, inclusive uma escrita própria no mesmo turno que uma recusa dirigida, a cessão só entre candidatos a uma
// disputa e a recuperação na terceira observação. Usar casos técnicos separados da amostra.").
// Runs on the local deterministic provider only (no model call, no cost), through the real Pi tool stack, the installed
// connector and the policy the Control really assigns to C. The checks are technical files of this module, never a
// sample seed or a map of the case. The receipt holds booleans, counts, rules and classes only.
//   (s1) own after a directed refusal: in ONE turn, the owner's write on a directed file without a trace is refused
//        (wait_for_trace, class directed) and the next write, on its own file, is allowed and lands;
//   (s2) yield only between candidates: on a dispute, the hash loser yields once (one yielded mark per wave, to the
//        winner), an agent who is not a contender is refused without a yield mark, and the winner writes with no trace;
//   (s3) recovery on the third observation: a directed check alone and unchanged keeps its owner in its first two lone
//        waves and goes to the outsider on the third, who writes after an addressed trace (stalled_check_reassigned);
//        an own check alone for as long keeps its owner (control).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignment, publishWave } from '../../packages/connector-pi/coordination.js';
import { initializeBudget } from '../budget.mjs';
import { team } from './case.mjs';
import { assignTeam, receivedSame } from './policy.mjs';

const lines = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const write = (path, content) => ({ tool: 'write', args: { path, content } });
const trace = (place, to) => ({ tool: 'leave_mark', args: { kind: 'requirement', place, to, text: 'Requisito técnico.' } });

// One isolated scratch run: its own task, field, waves and agent folders, the Control's C policy on every agent.
async function scratch(root, name, driver, control) {
  const dir = realpathSync(mkdtempSync(join(root, 'phase1b-r-facts-' + name + '-')));
  const task = join(dir, 'task'),
    field = join(dir, 'field'),
    waves = join(dir, 'waves'),
    inbox = join(dir, 'inbox'),
    ledger = join(dir, 'ledger.sqlite');
  for (const d of [task, field, waves, inbox]) mkdirSync(d);
  initializeBudget(ledger);
  const { ids: policies, rules } = await assignTeam(control, 'C', team);
  const cwds = Object.fromEntries(team.map((a) => [a, join(dir, 'agents', a)]));
  const h = {};
  for (const a of team) {
    mkdirSync(cwds[a], { recursive: true });
    writeFileSync(join(cwds[a], '.phase1-budget'), JSON.stringify({ ledger }));
    writeFileSync(join(cwds[a], '.bioswarm'), JSON.stringify({ field, waveDir: waves, gate: null }));
    h[a] = await driver.open({ agent: a, cwd: cwds[a], arm: 'C', roots: [task, cwds[a]], bridge: { self: a, team, inbox, counts: { accepted: 0, refused: 0, chars: 0 } } });
  }
  const file = (place) => join(task, place);
  const open = (...places) => places.forEach((p) => writeFileSync(file(p), 'OPEN'));
  const read = (place) => readFileSync(file(place), 'utf8').trim();
  const run = 'tech-' + name;
  const publish = (wave, checks) => publishWave(waves, { run, wave, root: task, team, fallbackAfter: rules.fallbackAfter, coordination: 'scoped-v1', checks: checks.map((c) => ({ ...c, revision: 'open' })) });
  const events = (a) => lines(join(cwds[a], '.bioswarm-events.jsonl'));
  const marks = () => lines(join(field, 'field.jsonl'));
  const active = new Set(); // the connector loads the remote policy on an agent's first turn
  const turn = async (agent, calls) => {
    active.add(agent);
    const before = events(agent).length;
    const r = await h[agent].turn('Passo técnico.', { deadline: Date.now() + 60_000, provider: { http429: 0, retries: 0 }, calls });
    return { r, events: events(agent).slice(before) };
  };
  const policyReceived = () =>
    active.size > 0 &&
    [...active].every((a) => {
      const cache = join(cwds[a], '.bioswarm-policy.json');
      return existsSync(cache) && receivedSame(JSON.parse(readFileSync(cache, 'utf8')), policies, rules, a) && events(a).some((e) => e.type === 'policy' && e.kind === 'remote');
    });
  const close = async () => {
    for (const a of team) await h[a].close();
    rmSync(dir, { recursive: true, force: true });
  };
  return { file, open, read, publish, turn, marks, events, rules, policyReceived, close };
}

const decisionsOf = (evs) => evs.filter((e) => e.type === 'decision').map((e) => ({ wave: e.wave, check: e.check, class: e.class, tool: e.tool, outcome: e.outcome, rule: e.rule ?? null }));

export async function runScopedFacts({ root, driver, control }) {
  if (driver.local !== true) throw Error('The 1b-r scoped facts run only on the local deterministic provider');
  const [x, y, z] = team;
  const facts = {},
    detail = {};
  let policyReceived = true;

  // s1 and s2 share wave 1 of one run: an own file and a directed file of x, and a dispute between y and z.
  {
    const s = await scratch(root, 'w1', driver, control);
    try {
      s.open('own.md', 'directed.md', 'dispute.md');
      const w1 = s.publish(1, [
        { id: 'tech-own', place: 'own.md', owners: [x], class: 'own' },
        { id: 'tech-directed', place: 'directed.md', owners: [x], class: 'directed' },
        { id: 'tech-dispute', place: 'dispute.md', owners: [y, z], class: 'dispute' },
      ]);
      // s1: one turn, directed first (refused), then own (allowed).
      const t1 = await s.turn(x, [write(s.file('directed.md'), 'S1-D'), write(s.file('own.md'), 'S1-O')]);
      const d1 = decisionsOf(t1.events);
      detail.s1 = { decisions: d1, toolCalls: t1.r.toolCalls.map((c) => ({ tool: c.tool, accepted: c.accepted, ran: c.ran })) };
      facts.s1 =
        d1.length === 2 &&
        d1[0].check === 'tech-directed' && d1[0].class === 'directed' && d1[0].outcome === 'refused' && d1[0].rule === 'wait_for_trace' &&
        d1[1].check === 'tech-own' && d1[1].class === 'own' && d1[1].outcome === 'allowed' &&
        t1.r.toolCalls.length === 2 && t1.r.toolCalls[0].ran === false && t1.r.toolCalls[1].ran === true && t1.r.toolCalls[1].accepted === true &&
        s.read('directed.md') === 'OPEN' && s.read('own.md') === 'S1-O';
      // s2: the outsider x is refused without a yield mark; the loser yields once (twice refused, one mark); the winner writes.
      const check = w1.checks.find((c) => c.id === 'tech-dispute');
      const winner = assignment(w1, check, s.rules).agent,
        loser = [y, z].find((a) => a !== winner);
      const tx = await s.turn(x, [write(s.file('dispute.md'), 'S2-X')]);
      const tl = await s.turn(loser, [write(s.file('dispute.md'), 'S2-L'), write(s.file('dispute.md'), 'S2-L')]);
      const untouched = s.read('dispute.md') === 'OPEN';
      const tw = await s.turn(winner, [write(s.file('dispute.md'), 'S2-W')]);
      const yields = s.marks().filter((m) => m.kind === 'yielded');
      const requirements = s.marks().filter((m) => m.kind === 'requirement');
      const [dx, dl, dw] = [tx, tl, tw].map((t) => decisionsOf(t.events));
      detail.s2 = { outsider: dx, loser: dl, winner: dw, yieldMarks: yields.map((m) => ({ by: m.by === loser ? 'loser' : m.by === x ? 'outsider' : 'other', to: m.to === winner ? 'winner' : 'other', class: m.class ?? null })) };
      facts.s2 =
        dx.length === 1 && dx[0].outcome === 'refused' && dx[0].rule === 'unassigned_place' && dx[0].class === 'dispute' &&
        dl.length === 2 && dl.every((d) => d.outcome === 'yielded' && d.rule === 'yielded_place' && d.class === 'dispute') &&
        untouched &&
        dw.length === 1 && dw[0].outcome === 'allowed' && requirements.length === 0 && s.read('dispute.md') === 'S2-W' &&
        yields.length === 1 && yields[0].by === loser && yields[0].to === winner && yields[0].check === 'tech-dispute' && yields[0].class === 'dispute';
      policyReceived &&= s.policyReceived();
    } finally {
      await s.close();
    }
  }

  // s3: a directed check of y alone and unchanged for three waves; then an own check of y alone for as long (control).
  {
    const s = await scratch(root, 'lone', driver, control);
    try {
      s.open('lone.md');
      const lone = { id: 'tech-lone', place: 'lone.md', owners: [y], class: 'directed' };
      const observations = [];
      for (const wave of [1, 2]) {
        const w = s.publish(wave, [lone]);
        const a = assignment(w, w.checks[0], s.rules);
        const t = await s.turn(y, [write(s.file('lone.md'), 'S3-OWNER')]);
        observations.push({ wave, loneWaves: w.checks[0].loneWaves, outsider: a.agent !== y, fallback: a.fallback, decisions: decisionsOf(t.events) });
      }
      const heldBack = s.read('lone.md') === 'OPEN';
      const w3 = s.publish(3, [lone]);
      const rescue = assignment(w3, w3.checks[0], s.rules);
      observations.push({ wave: 3, loneWaves: w3.checks[0].loneWaves, outsider: rescue.agent !== y, fallback: rescue.fallback, decisions: [] });
      const ty = await s.turn(y, [trace(s.file('lone.md'), rescue.agent), write(s.file('lone.md'), 'S3-OWNER')]);
      const tr = await s.turn(rescue.agent, [write(s.file('lone.md'), 'S3-RESCUE')]);
      const dy = decisionsOf(ty.events),
        dr = decisionsOf(tr.events);
      const reassigned = tr.events.some((e) => e.type === 'rule' && e.rule === 'stalled_check_reassigned');
      detail.s3 = { observations, ownerAfterReassignment: dy, rescuer: dr, reassignedRule: reassigned };
      const early = observations.slice(0, 2).every((o) => !o.fallback && !o.outsider && o.decisions.length === 1 && o.decisions[0].outcome === 'refused' && o.decisions[0].rule === 'wait_for_trace');
      const directedOk =
        early && heldBack &&
        observations[2].loneWaves === s.rules.fallbackAfter && rescue.fallback && rescue.agent !== y && team.includes(rescue.agent) &&
        dy.length === 1 && dy[0].outcome === 'refused' &&
        dr.length === 1 && dr[0].outcome === 'allowed' && dr[0].class === 'directed' && reassigned && s.read('lone.md') === 'S3-RESCUE';
      policyReceived &&= s.policyReceived();
      await s.close();
      // Control: an own check alone for the same number of waves keeps its owner, who writes at once.
      const c = await scratch(root, 'own', driver, control);
      try {
        c.open('mine.md');
        const mine = { id: 'tech-mine', place: 'mine.md', owners: [y], class: 'own' };
        let w;
        for (const wave of [1, 2, 3]) w = c.publish(wave, [mine]);
        const a = assignment(w, w.checks[0], c.rules);
        const t = await c.turn(y, [write(c.file('mine.md'), 'S3-MINE')]);
        const d = decisionsOf(t.events);
        detail.s3.ownControl = { loneWaves: w.checks[0].loneWaves, fallback: a.fallback, decisions: d };
        facts.s3 = directedOk && w.checks[0].loneWaves === c.rules.fallbackAfter && !a.fallback && a.agent === y && d.length === 1 && d[0].outcome === 'allowed' && c.read('mine.md') === 'S3-MINE';
        policyReceived &&= c.policyReceived();
      } finally {
        await c.close();
      }
    } catch (err) {
      await s.close().catch(() => {});
      throw err;
    }
  }
  return { connector: 'scoped-v1', driver: 'local', facts, detail, policyReceived, pass: policyReceived && ['s1', 's2', 's3'].every((k) => facts[k] === true) };
}
