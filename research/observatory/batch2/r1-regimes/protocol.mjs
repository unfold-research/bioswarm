// R1: one task, five coordination regimes, the same reading budget. First regime comparison on real models.
// Motivation: tasks/L2-RELATED-WORK-TO-READ.md. The published stigmergy papers compare a swarm with conversation or
// hierarchy and none with one agent or a plain schedule at matched cost; none isolates decay with enough trials.
//
// Task. A collection of 288 study records in 6 parts of 48, by six authors. The answer is the author with the most
// studies that are peer-reviewed, from 2020 or later and positive: 20 for the leader, 16 for the runner-up, at most 12
// for the others. No call sees more than two parts. In the perturbed condition one part is edited half-way through the
// run (leader and runner-up exchanged in that part), which reverses the answer (16 against 20). Nobody is told.
//
// Budget. Every regime reads 12 parts' worth of records: 6 before the edit and 6 after.
//   sweep        a fixed schedule: each part once before the edit and once after; the latest count of a part is used
//   deep         the same schedule in half as many calls: one agent reads two parts at a time with more working
//   stig-decay   no schedule: in each of 4 rounds 3 workers each choose a part with probability proportional to
//                1/(1+m)^2, m the mark left on it; marks halve every round; the estimate of a part is the mean of
//                its counts weighted by the same decay
//   stig-nodecay the same rule with marks and weights that never fade
//   router       an orchestrator model assigns 6 workers per epoch after reading the board, and names the answer
// The first four are answered by code from the counts deposited; a tie or a part never read counts against the regime.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32, qualifies } from '../littask.mjs';

export const TITLE = 'R1 five coordination regimes on one task at the same reading budget';
export const PREREG = 'tasks/R1-REGIMES-PREREG.md';
export const PARTS = 6, PART_SIZE = 48, ROUNDS = 4, WORKERS = 3, DECAY = 0.5, OUT_MAX = 1024;
export const SEEDS = Array.from({ length: 30 }, (_, i) => 26001 + i);
export const REGIMES = ['sweep', 'deep', 'stig-decay', 'stig-nodecay', 'router'];
export const GATE = { maxInvalidShare: 0.1 };
const TAG = { sweep: 'sw', deep: 'dp', 'stig-decay': 'sd', 'stig-nodecay': 'sn', router: 'rt' };

export function makeCorpus(seed) {
  const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const names = new Set(); while (names.size < 6) names.add(`au-${int(0, 46655).toString(36).padStart(3, '0')}`); const authors = [...names], [W, R, ...others] = authors, p = int(0, PARTS - 1);
  const spread = (inP) => { const rest = shuffle([3, 3, 3, 3, 2]); return Array.from({ length: PARTS }, (_, s) => (s === p ? inP : rest.pop())); }, w = spread(6), r = spread(2);
  const good = () => ({ year: int(2020, 2025), review: 'peer-reviewed', outcome: 'positive' }), ids = new Set();
  const newId = () => { let id; do id = `s-${int(0, 1679615).toString(36).padStart(4, '0')}`; while (ids.has(id)); ids.add(id); return id; };
  const parts = Array.from({ length: PARTS }, (_, s) => { const recs = [];
    for (let i = 0; i < w[s]; i++) recs.push({ author: W, ...good() }); for (let i = 0; i < r[s]; i++) recs.push({ author: R, ...good() });
    for (const o of others) for (let i = int(1, 2); i > 0; i--) recs.push({ author: o, ...good() });
    for (let i = 0; i < 4; i++) recs.push({ author: others[0], ...good(), ...(i % 3 === 0 ? { year: 2019 } : i % 3 === 1 ? { review: 'preprint' } : { outcome: 'negative' }) });
    while (recs.length < PART_SIZE) { const x = { author: authors[int(0, 5)], year: int(2012, 2025), review: rnd() < 0.5 ? 'peer-reviewed' : 'preprint', outcome: ['positive', 'negative', 'null'][int(0, 2)] }; recs.push(qualifies(x) ? { ...x, review: 'preprint' } : x); }
    return shuffle(recs).map((x) => ({ id: newId(), ...x })); });
  const swap = (a) => (a === W ? R : a === R ? W : a), edited = parts.map((recs, s) => (s === p ? recs.map((x) => ({ ...x, author: swap(x.author) })) : recs));
  return { id: `col-${seed}`, seed, authors, perturbedPart: p, parts: [parts, edited], answer: [W, R] }; // index 0: before the edit; 1: after
}
export const tallyOf = (records, authors) => Object.fromEntries(authors.map((a) => [a, records.filter((x) => x.author === a && qualifies(x)).length]));
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const workerSystem = (words) => `You are one of several analysts in a synthetic bibliometric exercise. You see part of a larger collection. Each record describes one study: id, author, year, review status and outcome. For every author listed in \`authors\`, count the studies in the records you are given that are ${COND}. Write your working in \`working\`, at most ${words} words, then \`counts\` with one entry per author, in the order given, using 0 when an author has none. Return only JSON matching the schema.`;
const COUNT_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, n: { type: 'integer' } }, required: ['author', 'n'], additionalProperties: false } } }, required: ['working', 'counts'], additionalProperties: false };
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const readParams = (c, state, unit, words) => req(workerSystem(words), COUNT_SCHEMA, { collection: c.id, parts: unit, authors: c.authors, records: unit.flatMap((s) => c.parts[state][s]) });
export function parseCounts(o, authors) { if (!o || !Array.isArray(o.counts)) return null; const m = {}; for (const x of o.counts) if (x && typeof x.author === 'string' && Number.isInteger(x.n) && x.n >= 0) m[x.author.trim()] = x.n; return authors.every((a) => a in m) ? Object.fromEntries(authors.map((a) => [a, m[a]])) : null; }

// Reading schedules that do not depend on what was read: [{ round, slot, unit: [part, ...] }]. Rounds 1-2 are before the edit.
export function schedule(regime, c) {
  if (regime === 'sweep') return [1, 2, 3, 4].flatMap((round) => [0, 1, 2].map((slot) => ({ round, slot, unit: [((round - 1) % 2) * 3 + slot] })));
  if (regime === 'deep') return [1, 3].flatMap((round) => [0, 1, 2].map((slot) => ({ round, slot, unit: [2 * slot, 2 * slot + 1] })));
  const lambda = regime === 'stig-decay' ? DECAY : 1, rnd = mulberry32(c.seed * 31 + (regime === 'stig-decay' ? 1 : 2)), marks = Array(PARTS).fill(0), out = [];
  for (let round = 1; round <= ROUNDS; round++) { const wts = marks.map((m) => 1 / (1 + m) ** 2), tot = wts.reduce((a, b) => a + b, 0), picks = [];
    for (let slot = 0; slot < WORKERS; slot++) { let x = rnd() * tot, s = 0; while (s < PARTS - 1 && x >= wts[s]) { x -= wts[s]; s++; } picks.push(s); out.push({ round, slot, unit: [s] }); }
    for (let s = 0; s < PARTS; s++) marks[s] = marks[s] * lambda + picks.filter((x) => x === s).length; }
  return out;
}
const words = (regime) => (regime === 'deep' ? 200 : 100);
const readRow = (regime, c, call, cond) => { const post = call.round > 2, state = post && cond === 1 ? 1 : 0, shared = !post;
  return { custom_id: `r1-${c.seed}-${TAG[regime]}-r${call.round}s${call.slot}${shared ? '' : `-c${cond}`}`, params: readParams(c, state, call.unit, words(regime)), meta: { kind: 'read', regime, seed: c.seed, round: call.round, slot: call.slot, unit: call.unit, cond: shared ? null : cond, truth: tallyOf(call.unit.flatMap((s) => c.parts[state][s]), c.authors), authors: c.authors } }; };
export const scheduledRows = (regime) => SEEDS.flatMap((seed) => { const c = makeCorpus(seed); return schedule(regime, c).flatMap((call) => (call.round > 2 ? [0, 1].map((cond) => readRow(regime, c, call, cond)) : [readRow(regime, c, call, 0)])); });

// Orchestrator (router regime).
const ROUTER_SYSTEM = `You coordinate analysts in a synthetic bibliometric exercise. A collection of study records is split into ${PARTS} parts, numbered 0 to ${PARTS - 1}; you never see the records. The goal is to name the author with the most studies in the whole collection that are ${COND}. There are two epochs. In each epoch you send ${PARTS} analysts, each to one part; several may go to the same part. An analyst returns, for its part, a count per author; a count can contain mistakes. The collection may be edited between the epochs; a count made in a later epoch is the more recent reading of that part. The board lists every count returned so far.`;
const ASSIGN_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, assignments: { type: 'array', items: { type: 'integer' } } }, required: ['working', 'assignments'], additionalProperties: false };
const FINAL_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, author: { type: 'string' } }, required: ['working', 'author'], additionalProperties: false };
const assignRow = (c, epoch, board) => ({ custom_id: `r1-${c.seed}-rt-a${epoch}`, params: req(`${ROUTER_SYSTEM} Decide where the ${PARTS} analysts of epoch ${epoch} go. Write your working in \`working\`, at most 60 words, then \`assignments\`: exactly ${PARTS} part numbers. Return only JSON matching the schema.`, ASSIGN_SCHEMA, { collection: c.id, authors: c.authors, epoch, board }), meta: { kind: 'assign', regime: 'router', seed: c.seed, epoch } });
const finalRow = (c, cond, board) => ({ custom_id: `r1-${c.seed}-rt-f-c${cond}`, params: req(`${ROUTER_SYSTEM} Both epochs are over. Write your working in \`working\`, at most 120 words, then the author id in \`author\`. Return only JSON matching the schema.`, FINAL_SCHEMA, { collection: c.id, authors: c.authors, board }), meta: { kind: 'final', regime: 'router', seed: c.seed, cond, answer: c.answer[cond], authors: c.authors } });
export function assignmentsOf(outputs, seed, epoch) { const a = outputs.get(`r1-${seed}-rt-a${epoch}`)?.output?.assignments; return Array.isArray(a) && a.length === PARTS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS) ? a : null; }
const fallback = () => Array.from({ length: PARTS }, (_, i) => i);
// Board entries for one task and condition, from the outputs so far.
function board(c, outputs, cond, upToEpoch) {
  const out = [];
  for (let epoch = 1; epoch <= upToEpoch; epoch++) { const a = assignmentsOf(outputs, c.seed, epoch) || fallback();
    a.forEach((part, slot) => { const id = `r1-${c.seed}-rt-e${epoch}s${slot}${epoch === 1 ? '' : `-c${cond}`}`, counts = parseCounts(outputs.get(id)?.output, c.authors); if (counts) out.push({ epoch, part, counts }); }); }
  return out;
}
const routerRead = (c, epoch, slot, part, cond) => { const state = epoch === 2 && cond === 1 ? 1 : 0; return { custom_id: `r1-${c.seed}-rt-e${epoch}s${slot}${epoch === 1 ? '' : `-c${cond}`}`, params: readParams(c, state, [part], 100), meta: { kind: 'read', regime: 'router', seed: c.seed, round: epoch === 1 ? 1 : 3, slot, unit: [part], cond: epoch === 1 ? null : cond, truth: tallyOf(c.parts[state][part], c.authors), authors: c.authors } }; };
export function routerWave(k, outputs) {
  const cs = SEEDS.map(makeCorpus);
  if (k === 0) return cs.map((c) => assignRow(c, 1, []));
  if (k === 1) return cs.flatMap((c) => (assignmentsOf(outputs, c.seed, 1) || fallback()).map((part, slot) => routerRead(c, 1, slot, part, 0)));
  if (k === 2) return cs.map((c) => assignRow(c, 2, board(c, outputs, 0, 1)));
  if (k === 3) return cs.flatMap((c) => [0, 1].flatMap((cond) => (assignmentsOf(outputs, c.seed, 2) || fallback()).map((part, slot) => routerRead(c, 2, slot, part, cond))));
  return cs.flatMap((c) => [0, 1].map((cond) => finalRow(c, cond, board(c, outputs, cond, 2))));
}
// Reservation ceilings for the router waves that depend on outputs: fixed assignments and a full board of true counts.
export function routerCeiling(k) {
  const cs = SEEDS.map(makeCorpus), full = (c, n) => Array.from({ length: n }, (_, i) => ({ epoch: 1 + Math.floor(i / PARTS), part: i % PARTS, counts: tallyOf(c.parts[0][i % PARTS], c.authors) }));
  if (k === 1) return cs.flatMap((c) => fallback().map((part, slot) => routerRead(c, 1, slot, part, 0)));
  if (k === 2) return cs.map((c) => assignRow(c, 2, full(c, PARTS)));
  if (k === 3) return cs.flatMap((c) => [0, 1].flatMap((cond) => fallback().map((part, slot) => routerRead(c, 2, slot, part, cond))));
  return cs.flatMap((c) => [0, 1].map((cond) => finalRow(c, cond, full(c, 2 * PARTS))));
}
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'read') { const counts = parseCounts(o, m.authors); return { customId: q.custom_id, kind: 'read', regime: m.regime, seed: m.seed, round: m.round, slot: m.slot, unit: m.unit, cond: m.cond, valid: !!counts, truncated, counts, exact: !!counts && m.authors.every((a) => counts[a] === m.truth[a]) }; }
    if (m.kind === 'assign') { const a = o?.assignments, ok = Array.isArray(a) && a.length === PARTS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS); return { customId: q.custom_id, kind: 'assign', regime: 'router', seed: m.seed, epoch: m.epoch, valid: !!o && Array.isArray(a), usable: ok, truncated, assignments: ok ? a : null }; }
    const valid = !!o && typeof o.author === 'string', a = valid ? o.author.trim() : null; return { customId: q.custom_id, kind: 'final', regime: 'router', seed: m.seed, cond: m.cond, valid, truncated, answer: a, correct: a === m.answer }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);

// Answer of a scheduled regime for one task and condition, by code from the deposits. Returns the author or null (tie).
export function estimate(regime, c, deposits) {
  const lambda = regime === 'stig-decay' ? DECAY : 1, total = Object.fromEntries(c.authors.map((a) => [a, 0])), units = new Map();
  for (const d of deposits) { const key = d.unit.join('+'); if (!units.has(key)) units.set(key, []); units.get(key).push(d); }
  for (const ds of units.values()) {
    if (regime === 'sweep' || regime === 'deep') { const last = ds.reduce((a, b) => (b.round >= a.round ? b : a)); for (const a of c.authors) total[a] += last.counts[a]; }
    else { const w = ds.map((d) => lambda ** (ROUNDS - d.round)), sw = w.reduce((x, y) => x + y, 0); for (const a of c.authors) total[a] += ds.reduce((n, d, i) => n + w[i] * d.counts[a], 0) / sw; }
  }
  const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]); return sorted[0][1] - sorted[1][1] > 1e-9 ? sorted[0][0] : null;
}
const mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export function summarizeScheduled(regime, scored) {
  const perTask = SEEDS.flatMap((seed) => { const c = makeCorpus(seed); return [0, 1].map((cond) => { const mine = scored.filter((x) => x.seed === seed && (x.cond === null || x.cond === cond)), deps = mine.filter((x) => x.valid);
    const reread = mine.some((x) => x.round > 2 && x.unit.includes(c.perturbedPart)), covered = new Set(mine.flatMap((x) => x.unit)).size;
    return { seed, cond, correct: estimate(regime, c, deps) === c.answer[cond] ? 1 : 0, calls: mine.length, partsCovered: covered, editedPartRereadAfterEdit: reread ? 1 : 0 }; }); });
  return finish(regime, scored, perTask);
}
export function summarizeRouter(scoredByWave) {
  const all = scoredByWave.flat(), finals = all.filter((x) => x.kind === 'final');
  if (!finals.length) return { regime: 'router', perTask: [], note: 'stopped before the final wave' };
  const perTask = SEEDS.flatMap((seed) => { const c = makeCorpus(seed), a2 = all.find((x) => x.kind === 'assign' && x.seed === seed && x.epoch === 2), a1 = all.find((x) => x.kind === 'assign' && x.seed === seed && x.epoch === 1), e2 = a2?.assignments || fallback(), e1 = a1?.assignments || fallback();
    return [0, 1].map((cond) => ({ seed, cond, correct: finals.find((x) => x.seed === seed && x.cond === cond)?.correct ? 1 : 0, calls: 2 * PARTS + 3, partsCovered: new Set([...e1, ...e2]).size, editedPartRereadAfterEdit: e2.includes(c.perturbedPart) ? 1 : 0 })); });
  const assigns = all.filter((x) => x.kind === 'assign');
  return { ...finish('router', all.filter((x) => x.kind === 'read'), perTask), unusableAssignments: assigns.filter((x) => !x.usable).length, epoch2Distinct: mean(assigns.filter((x) => x.epoch === 2 && x.usable), (x) => new Set(x.assignments).size) };
}
function finish(regime, reads, perTask) {
  const by = (cond) => perTask.filter((x) => x.cond === cond);
  return { regime, accuracy: { stable: mean(by(0), (x) => x.correct), edited: mean(by(1), (x) => x.correct) }, editedPartRereadAfterEdit: mean(by(1), (x) => x.editedPartRereadAfterEdit), partsCovered: mean(by(1), (x) => x.partsCovered), readCalls: reads.length, readsExact: mean(reads, (x) => (x.exact ? 1 : 0)), invalidReads: reads.filter((x) => !x.valid).length, truncated: reads.filter((x) => x.truncated).length, perTask };
}
