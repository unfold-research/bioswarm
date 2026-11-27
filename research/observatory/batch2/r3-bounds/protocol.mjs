// R3: two boundaries of the R2b result (a local alarm rule beats the best fixed schedule under partial coverage).
// Setting of R2b unless stated: 12 parts of 24 in a ring, every part counted once, then 6 re-counts in 3 rounds of 2
// workers, alarms computed by code (a count that differs from the previous count of its part by 3 or more), answers by
// code from the latest count of each part. Two scenarios, each with its own 60 collections:
//   scatter  the three edited parts are not neighbours (no two adjacent). The alarm rule and the orchestrator still
//            act on the belief that edits are local. Tests whether the advantage of R2b depends on locality.
//   poison   the edit is as in R2b (three neighbouring parts), and before the first round a false count is on the board:
//            on one part outside the block, the first count with three studies added to the leader. It raises an alarm
//            and inflates the leader's total (20 becomes 23), so that in the edited condition a regime is right only if
//            it re-reads all three edited parts, or two of them and the poisoned part.
// Regimes: sweep (parts 0 to 5), alarm (the R2b rule: neighbours of an alarmed part are favoured, parts already re-read
// avoided), router (orchestrator model), and, in the poison scenario, verify: an alarmed part is re-read once more
// before its neighbours are favoured; if the second count agrees with the first count of all, the alarm is cleared.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32, qualifies } from '../littask.mjs';

export const TITLE = 'R3 boundaries of the partial-coverage result: scattered edits and a false count on the board';
export const PREREG = 'tasks/R3-D4B-PREREG.md';
export const PARTS = 12, PART_SIZE = 24, ROUNDS = 3, WORKERS = 2, BLOCK = 3, ALARM_AT = 3, BOOST = 8, SEEN = 0.05, OUT_MAX = 1024, EDIT_PER_PART = 3;
export const SCENARIOS = ['scatter', 'poison'];
export const SEEDS_OF = { scatter: Array.from({ length: 60 }, (_, i) => 29001 + i), poison: Array.from({ length: 60 }, (_, i) => 30001 + i) };
export const POISON_ADD = 3;
export const REGIMES = { scatter: ['sweep', 'alarm', 'router'], poison: ['sweep', 'alarm', 'verify', 'router'] };
export const GATE = { maxInvalidShare: 0.1 };
const TAG = { sweep: 'sw', alarm: 'al', verify: 'vf', router: 'rt' }, SC = { scatter: 's', poison: 'p' };

export function makeCorpus(seed, scenario) {
  const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const names = new Set(); while (names.size < 6) names.add(`au-${int(0, 46655).toString(36).padStart(3, '0')}`); const authors = [...names], [W, R, ...others] = authors;
  const adjacent = (x, y) => { const d = Math.abs(x - y); return d === 1 || d === PARTS - 1; };
  let block; if (scenario === 'scatter') { do block = shuffle(Array.from({ length: PARTS }, (_, i) => i)).slice(0, BLOCK).sort((x, y) => x - y); while (block.some((x, i) => block.some((y, j) => i !== j && adjacent(x, y)))); } else { const start = int(0, PARTS - 1); block = Array.from({ length: BLOCK }, (_, i) => (start + i) % PARTS); }
  const w = shuffle([2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1]), r = shuffle([2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1]);
  const good = () => ({ year: int(2020, 2025), review: 'peer-reviewed', outcome: 'positive' }), ids = new Set();
  const newId = () => { let id; do id = `s-${int(0, 1679615).toString(36).padStart(4, '0')}`; while (ids.has(id)); ids.add(id); return id; };
  const parts = Array.from({ length: PARTS }, (_, s) => { const recs = [];
    for (let i = 0; i < w[s]; i++) recs.push({ author: W, ...good() }); for (let i = 0; i < r[s]; i++) recs.push({ author: R, ...good() });
    for (const o of others) if (int(0, 1)) recs.push({ author: o, ...good() });
    for (let i = 0; i < 2; i++) recs.push({ author: others[0], ...good(), ...(i ? { review: 'preprint' } : { year: 2019 }) });
    while (recs.length < PART_SIZE) { const x = { author: authors[int(0, 5)], year: int(2012, 2025), review: rnd() < 0.5 ? 'peer-reviewed' : 'preprint', outcome: ['positive', 'negative', 'null'][int(0, 2)] }; recs.push(qualifies(x) ? { ...x, review: 'preprint' } : x); }
    return shuffle(recs).map((x) => ({ id: newId(), ...x })); });
  const edited = parts.map((recs, s) => { if (!block.includes(s)) return recs; let left = EDIT_PER_PART; return recs.map((x) => (left > 0 && !qualifies(x) ? (left--, { id: x.id, author: R, year: 2021, review: 'peer-reviewed', outcome: 'positive' }) : x)); });
  let poison = null; if (scenario === 'poison') { const free = Array.from({ length: PARTS }, (_, i) => i).filter((p) => !block.includes(p)); poison = free[int(0, free.length - 1)]; }
  return { id: `ring-${seed}`, seed, scenario, authors, block, poison, parts: [parts, edited], answer: [W, R] };
}
export const tallyOf = (records, authors) => Object.fromEntries(authors.map((a) => [a, records.filter((x) => x.author === a && qualifies(x)).length]));
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const WORKER_SYSTEM = `You are one of several analysts in a synthetic bibliometric exercise. You see one part of a larger collection. Each record describes one study: id, author, year, review status and outcome. For every author listed in \`authors\`, count the studies in the records you are given that are ${COND}. Write your working in \`working\`, at most 80 words, then \`counts\` with one entry per author, in the order given, using 0 when an author has none. Return only JSON matching the schema.`;
const COUNT_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, n: { type: 'integer' } }, required: ['author', 'n'], additionalProperties: false } } }, required: ['working', 'counts'], additionalProperties: false };
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
export function parseCounts(o, authors) { if (!o || !Array.isArray(o.counts)) return null; const m = {}; for (const x of o.counts) if (x && typeof x.author === 'string' && Number.isInteger(x.n) && x.n >= 0) m[x.author.trim()] = x.n; return authors.every((a) => a in m) ? Object.fromEntries(authors.map((a) => [a, m[a]])) : null; }
const key = (sc, regime, seed) => `r3${SC[sc]}-${seed}-${TAG[regime]}`;
const preId = (sc, regime, seed, part) => `${key(sc, regime, seed)}-pre-p${part}`, postId = (sc, regime, seed, cond, round, slot) => `${key(sc, regime, seed)}-c${cond}-r${round}s${slot}`, assignId = (sc, seed, cond, round) => `${key(sc, 'router', seed)}-c${cond}-a${round}`;
const readRow = (regime, c, id, part, state, extra) => ({ custom_id: id, params: req(WORKER_SYSTEM, COUNT_SCHEMA, { collection: c.id, part, authors: c.authors, records: c.parts[state][part] }), meta: { kind: 'read', regime, scenario: c.scenario, seed: c.seed, part, truth: tallyOf(c.parts[state][part], c.authors), authors: c.authors, ...extra } });
const corpora = (sc) => SEEDS_OF[sc].map((seed) => makeCorpus(seed, sc));
export const preRows = (sc, regime) => corpora(sc).flatMap((c) => Array.from({ length: PARTS }, (_, p) => readRow(regime, c, preId(sc, regime, c.seed, p), p, 0, { phase: 'pre', cond: null, round: 0 })));

const differs = (a, b, authors) => authors.reduce((n, x) => n + Math.abs(a[x] - b[x]), 0) >= ALARM_AT;
// Replays one collection in one condition from the outputs so far: where the workers of each round go, and the board.
// board = { first: counts|null per part, later: [{ round, part, counts, alarm, planted? }] }. In the poison scenario the
// board starts with one planted entry at round 0.
export function replay(regime, c, cond, outputs, upTo) {
  const sc = c.scenario, first = Array.from({ length: PARTS }, (_, p) => parseCounts(outputs.get(preId(sc, regime, c.seed, p))?.output, c.authors)), later = [], picks = [];
  if (c.poison !== null) { const baseCounts = first[c.poison] || tallyOf(c.parts[0][c.poison], c.authors); later.push({ round: 0, part: c.poison, counts: { ...baseCounts, [c.authors[0]]: baseCounts[c.authors[0]] + POISON_ADD }, alarm: true, planted: true }); }
  const of = (p) => later.filter((x) => x.part === p && x.counts), latest = (p) => { const l = of(p); return l.length ? l[l.length - 1].counts : first[p]; };
  const rnd = mulberry32(c.seed * 97 + (regime === 'verify' ? 7 : 5));
  for (let round = 1; round <= upTo; round++) {
    let pick;
    if (regime === 'sweep') pick = [2 * (round - 1), 2 * (round - 1) + 1];
    else if (regime === 'router') { const a = outputs.get(assignId(sc, c.seed, cond, round))?.output?.assignments; pick = Array.isArray(a) && a.length === WORKERS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS) ? a : [2 * (round - 1), 2 * (round - 1) + 1]; }
    else { const wts = Array(PARTS).fill(1), touched = new Set(later.map((x) => x.part));
      if (regime === 'alarm') { for (const p of touched) wts[p] = SEEN; for (const x of later.filter((y) => y.alarm)) for (const n of [(x.part + 1) % PARTS, (x.part + PARTS - 1) % PARTS]) if (!touched.has(n)) wts[n] += BOOST; }
      else { // verify: an alarmed part with a single later count is re-read first; only a confirmed alarm favours its neighbours
        for (const p of touched) { const l = of(p), alarmed = later.some((y) => y.part === p && y.alarm);
          if (alarmed && l.length === 1) wts[p] += BOOST; else { wts[p] = SEEN; if (alarmed && first[p] && differs(l[l.length - 1].counts, first[p], c.authors)) for (const n of [(p + 1) % PARTS, (p + PARTS - 1) % PARTS]) if (!touched.has(n)) wts[n] += BOOST; } } }
      const tot = wts.reduce((a, b) => a + b, 0); pick = Array.from({ length: WORKERS }, () => { let x = rnd() * tot, p = 0; while (p < PARTS - 1 && x >= wts[p]) { x -= wts[p]; p++; } return p; }); }
    picks.push(pick);
    if (round < upTo || outputs.has(postId(sc, regime, c.seed, cond, round, 0))) later.push(...pick.map((part, slot) => { const counts = parseCounts(outputs.get(postId(sc, regime, c.seed, cond, round, slot))?.output, c.authors), prev = latest(part); return { round, part, counts, alarm: !!counts && !!prev && differs(counts, prev, c.authors) }; }));
  }
  return { picks, board: { first, later } };
}
export const postRows = (sc, regime, outputs, round) => corpora(sc).flatMap((c) => [0, 1].flatMap((cond) => replay(regime, c, cond, outputs, round).picks[round - 1].map((part, slot) => readRow(regime, c, postId(sc, regime, c.seed, cond, round, slot), part, cond, { phase: 'post', cond, round, slot }))));
// Orchestrator. Same instructions as in R2b, including the sentence that edits tend to affect neighbouring parts.
const ROUTER_SYSTEM = `You coordinate analysts in a synthetic bibliometric exercise. A collection of study records is split into ${PARTS} parts arranged in a ring, numbered 0 to ${PARTS - 1}; part ${PARTS - 1} is next to part 0. You never see the records. The goal is that the counts on the board, taking the latest count of each part, add up to the right author with the most studies that are ${COND}. Every part was counted once at the start (\`first\`). Since then the collection may have been edited; an edit, when there is one, tends to affect neighbouring parts. There are ${ROUNDS} rounds and in each you send ${WORKERS} analysts, each to one part. A count can contain small mistakes. \`later\` lists the counts made since the start; \`changed\` is true when a count differs clearly from the previous count of that part. Decide where the ${WORKERS} analysts of this round go. Write your working in \`working\`, at most 60 words, then \`assignments\`: exactly ${WORKERS} part numbers. Return only JSON matching the schema.`;
const ASSIGN_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, assignments: { type: 'array', items: { type: 'integer' } } }, required: ['working', 'assignments'], additionalProperties: false };
const assignRow = (c, cond, round, board) => ({ custom_id: assignId(c.scenario, c.seed, cond, round), params: req(ROUTER_SYSTEM, ASSIGN_SCHEMA, { collection: c.id, authors: c.authors, round, rounds_left_after_this: ROUNDS - round, first: board.first.map((counts, part) => ({ part, counts })), later: board.later.map((x) => ({ round: x.round, part: x.part, counts: x.counts, changed: x.alarm })) }), meta: { kind: 'assign', regime: 'router', scenario: c.scenario, seed: c.seed, cond, round } });
export const assignRows = (sc, outputs, round) => corpora(sc).flatMap((c) => [0, 1].map((cond) => assignRow(c, cond, round, replay('router', c, cond, outputs, round - 1).board)));
export const WAVES = { sweep: 1, alarm: 1 + ROUNDS, verify: 1 + ROUNDS, router: 1 + 2 * ROUNDS };
export function waveOf(sc, regime, k, outputs = new Map()) {
  if (regime === 'sweep') return [...preRows(sc, regime), ...[1, 2, 3].flatMap((r) => postRows(sc, regime, new Map(), r))];
  if (k === 0) return preRows(sc, regime);
  if (regime !== 'router') return postRows(sc, regime, outputs, k);
  const round = Math.ceil(k / 2); return k % 2 ? assignRows(sc, outputs, round) : postRows(sc, regime, outputs, round);
}
// Ceiling of an output-dependent wave: the same number of requests, built from true first counts and exact re-counts.
export function ceilingOf(sc, regime, k) {
  const fake = new Map(); for (let j = 0; j < k; j++) for (const q of waveOf(sc, regime, j, fake)) fake.set(q.custom_id, { output: q.meta.kind === 'assign' ? { assignments: [0, 1] } : { counts: q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) } });
  return waveOf(sc, regime, k, fake);
}
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'assign') { const a = o?.assignments, usable = Array.isArray(a) && a.length === WORKERS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS); return { customId: q.custom_id, kind: 'assign', seed: m.seed, cond: m.cond, round: m.round, valid: !!o && Array.isArray(a), usable, truncated, assignments: usable ? a : null }; }
    const counts = parseCounts(o, m.authors); return { customId: q.custom_id, kind: 'read', regime: m.regime, seed: m.seed, phase: m.phase, cond: m.cond, round: m.round, part: m.part, valid: !!counts, truncated, counts, exact: !!counts && m.authors.every((a) => counts[a] === m.truth[a]) }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarizeRegime(sc, regime, scoredByWave) {
  const all = scoredByWave.flat(), outputs = new Map(all.map((x) => [x.customId, { output: x.kind === 'assign' ? { assignments: x.assignments } : x.counts ? { counts: Object.entries(x.counts).map(([author, n]) => ({ author, n })) } : null }]));
  if (!all.some((x) => x.kind === 'read' && x.round === ROUNDS)) return { scenario: sc, regime, perTask: [], note: 'stopped before the last round' };
  const perTask = corpora(sc).flatMap((c) => [0, 1].map((cond) => { const { picks, board } = replay(regime, c, cond, outputs, ROUNDS), total = Object.fromEntries(c.authors.map((a) => [a, 0]));
    for (let p = 0; p < PARTS; p++) { const l = board.later.filter((x) => x.part === p && x.counts), counts = l.length ? l[l.length - 1].counts : board.first[p]; if (counts) for (const a of c.authors) total[a] += counts[a]; }
    const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]), answer = sorted[0][1] > sorted[1][1] ? sorted[0][0] : null, reread = new Set(picks.flat());
    return { seed: c.seed, cond, correct: answer === c.answer[cond] ? 1 : 0, editedPartsReread: c.block.filter((p) => reread.has(p)).length, distinctPartsReread: reread.size, poisonReread: c.poison !== null && reread.has(c.poison) ? 1 : 0, readsNextToPoison: c.poison === null ? 0 : picks.flat().filter((p) => p === (c.poison + 1) % PARTS || p === (c.poison + PARTS - 1) % PARTS).length, alarms: board.later.filter((x) => x.alarm && !x.planted).length }; }));
  const by = (cond) => perTask.filter((x) => x.cond === cond), mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null), reads = all.filter((x) => x.kind === 'read'), assigns = all.filter((x) => x.kind === 'assign');
  return { scenario: sc, regime, accuracy: { stable: mean(by(0), (x) => x.correct), edited: mean(by(1), (x) => x.correct) }, editedPartsReread: mean(by(1), (x) => x.editedPartsReread), distinctPartsReread: mean(perTask, (x) => x.distinctPartsReread), poisonReread: mean(perTask, (x) => x.poisonReread), readsNextToPoison: mean(perTask, (x) => x.readsNextToPoison), alarmsPerCollection: { stable: mean(by(0), (x) => x.alarms), edited: mean(by(1), (x) => x.alarms) },
    readCalls: reads.length, readsExact: mean(reads, (x) => (x.exact ? 1 : 0)), invalidReads: reads.filter((x) => !x.valid).length, unusableAssignments: assigns.filter((x) => !x.usable).length, assignCalls: assigns.length, perTask };
}
