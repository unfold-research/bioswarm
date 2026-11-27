// R2b: R2 with an edit that cannot be located from the first counts. In R2 the edit exchanged leader and runner-up in a
// block, and the generator had to put the leader's largest counts in that block for the exchange to reverse the answer;
// the orchestrator read the first counts and went straight there (results/batch2-r2-regimes/REPORT.md). Here the leader's
// and runner-up's studies are spread without regard to the block, and the edit adds three qualifying studies of the
// runner-up to each of three neighbouring parts: 20 against 16 becomes 20 against 25. A regime is right only if it re-reads
// at least two of the three edited parts (16 + 3 + 3 = 22 against 20). Everything else is as in R2:
// 12 parts of 24 in a ring, every part read once at the start, then 6 reads in 3 rounds of 2, alarms computed by code,
// regimes sweep, random, alarm and router, answers by code from the latest count of each part.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32, qualifies } from '../littask.mjs';

export const TITLE = 'R2b coordination regimes under partial coverage, with an edit that the first counts do not reveal';
export const PREREG = 'tasks/R2B-PARTIAL-PREREG.md';
export const PARTS = 12, PART_SIZE = 24, ROUNDS = 3, WORKERS = 2, BLOCK = 3, ALARM_AT = 3, BOOST = 8, SEEN = 0.05, OUT_MAX = 1024, EDIT_PER_PART = 3;
export const SEEDS = Array.from({ length: 60 }, (_, i) => 28001 + i);
export const REGIMES = ['sweep', 'random', 'alarm', 'router'];
export const GATE = { maxInvalidShare: 0.1 };
const TAG = { sweep: 'sw', random: 'rn', alarm: 'al', router: 'rt' };

export function makeCorpus(seed) {
  const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const names = new Set(); while (names.size < 6) names.add(`au-${int(0, 46655).toString(36).padStart(3, '0')}`); const authors = [...names], [W, R, ...others] = authors, start = int(0, PARTS - 1), block = Array.from({ length: BLOCK }, (_, i) => (start + i) % PARTS);
  // The counts of leader and runner-up are spread over the ring without regard to the block that will be edited.
  const w = shuffle([2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1]), r = shuffle([2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1]);
  const good = () => ({ year: int(2020, 2025), review: 'peer-reviewed', outcome: 'positive' }), ids = new Set();
  const newId = () => { let id; do id = `s-${int(0, 1679615).toString(36).padStart(4, '0')}`; while (ids.has(id)); ids.add(id); return id; };
  const parts = Array.from({ length: PARTS }, (_, s) => { const recs = [];
    for (let i = 0; i < w[s]; i++) recs.push({ author: W, ...good() }); for (let i = 0; i < r[s]; i++) recs.push({ author: R, ...good() });
    for (const o of others) if (int(0, 1)) recs.push({ author: o, ...good() });
    for (let i = 0; i < 2; i++) recs.push({ author: others[0], ...good(), ...(i ? { review: 'preprint' } : { year: 2019 }) });
    while (recs.length < PART_SIZE) { const x = { author: authors[int(0, 5)], year: int(2012, 2025), review: rnd() < 0.5 ? 'peer-reviewed' : 'preprint', outcome: ['positive', 'negative', 'null'][int(0, 2)] }; recs.push(qualifies(x) ? { ...x, review: 'preprint' } : x); }
    return shuffle(recs).map((x) => ({ id: newId(), ...x })); });
  // The edit: in each part of the block, three studies that did not qualify are replaced by qualifying studies of the runner-up.
  const edited = parts.map((recs, s) => { if (!block.includes(s)) return recs; let left = EDIT_PER_PART; return recs.map((x) => (left > 0 && !qualifies(x) ? (left--, { id: x.id, author: R, year: 2021, review: 'peer-reviewed', outcome: 'positive' }) : x)); });
  return { id: `ring-${seed}`, seed, authors, block, parts: [parts, edited], answer: [W, R] };
}
export const tallyOf = (records, authors) => Object.fromEntries(authors.map((a) => [a, records.filter((x) => x.author === a && qualifies(x)).length]));
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const WORKER_SYSTEM = `You are one of several analysts in a synthetic bibliometric exercise. You see one part of a larger collection. Each record describes one study: id, author, year, review status and outcome. For every author listed in \`authors\`, count the studies in the records you are given that are ${COND}. Write your working in \`working\`, at most 80 words, then \`counts\` with one entry per author, in the order given, using 0 when an author has none. Return only JSON matching the schema.`;
const COUNT_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, n: { type: 'integer' } }, required: ['author', 'n'], additionalProperties: false } } }, required: ['working', 'counts'], additionalProperties: false };
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
export function parseCounts(o, authors) { if (!o || !Array.isArray(o.counts)) return null; const m = {}; for (const x of o.counts) if (x && typeof x.author === 'string' && Number.isInteger(x.n) && x.n >= 0) m[x.author.trim()] = x.n; return authors.every((a) => a in m) ? Object.fromEntries(authors.map((a) => [a, m[a]])) : null; }
const preId = (regime, seed, part) => `r2b-${seed}-${TAG[regime]}-pre-p${part}`, postId = (regime, seed, cond, round, slot) => `r2b-${seed}-${TAG[regime]}-c${cond}-r${round}s${slot}`, assignId = (seed, cond, round) => (round === 1 ? `r2b-${seed}-rt-a1` : `r2b-${seed}-rt-c${cond}-a${round}`);
const readRow = (regime, c, id, part, state, extra) => ({ custom_id: id, params: req(WORKER_SYSTEM, COUNT_SCHEMA, { collection: c.id, part, authors: c.authors, records: c.parts[state][part] }), meta: { kind: 'read', regime, seed: c.seed, part, truth: tallyOf(c.parts[state][part], c.authors), authors: c.authors, ...extra } });
export const preRows = (regime) => SEEDS.flatMap((seed) => { const c = makeCorpus(seed); return Array.from({ length: PARTS }, (_, p) => readRow(regime, c, preId(regime, seed, p), p, 0, { phase: 'pre', cond: null, round: 0 })); });

const differs = (a, b, authors) => authors.reduce((n, x) => n + Math.abs(a[x] - b[x]), 0) >= ALARM_AT;
// Where the workers of each round go, and what the board looks like, replayed from the outputs so far.
// Returns { picks: [[part, part], ...] for rounds 1..upTo, board } where board = { first: counts|null per part, later: [{ round, part, counts, alarm }] }.
export function replay(regime, c, cond, outputs, upTo) {
  const first = Array.from({ length: PARTS }, (_, p) => parseCounts(outputs.get(preId(regime, c.seed, p))?.output, c.authors)), later = [], picks = [];
  const latest = (p) => { const l = later.filter((x) => x.part === p && x.counts); return l.length ? l[l.length - 1].counts : first[p]; };
  const rnd = mulberry32(c.seed * 97 + (regime === 'alarm' ? 5 : 3)); // the same stream in both conditions, so that round 1 coincides
  for (let round = 1; round <= upTo; round++) {
    let pick;
    if (regime === 'sweep') pick = [2 * (round - 1), 2 * (round - 1) + 1];
    else if (regime === 'router') { const a = outputs.get(assignId(c.seed, cond, round))?.output?.assignments; pick = Array.isArray(a) && a.length === WORKERS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS) ? a : [2 * (round - 1), 2 * (round - 1) + 1]; }
    else { const seen = new Set(later.map((x) => x.part)), wts = Array.from({ length: PARTS }, (_, p) => (seen.has(p) ? SEEN : 1));
      if (regime === 'alarm') for (const x of later.filter((y) => y.alarm)) for (const n of [(x.part + 1) % PARTS, (x.part + PARTS - 1) % PARTS]) if (!seen.has(n)) wts[n] += BOOST;
      const tot = wts.reduce((a, b) => a + b, 0); pick = Array.from({ length: WORKERS }, () => { let x = rnd() * tot, p = 0; while (p < PARTS - 1 && x >= wts[p]) { x -= wts[p]; p++; } return p; }); }
    picks.push(pick);
    if (round < upTo || outputs.has(postId(regime, c.seed, cond, round, 0))) { const fresh = pick.map((part, slot) => { const counts = parseCounts(outputs.get(postId(regime, c.seed, cond, round, slot))?.output, c.authors), prev = latest(part); return { round, part, counts, alarm: !!counts && !!prev && differs(counts, prev, c.authors) }; }); later.push(...fresh); }
  }
  return { picks, board: { first, later } };
}
export function postRows(regime, outputs, round) {
  return SEEDS.flatMap((seed) => { const c = makeCorpus(seed); return [0, 1].flatMap((cond) => replay(regime, c, cond, outputs, round).picks[round - 1].map((part, slot) => readRow(regime, c, postId(regime, seed, cond, round, slot), part, cond, { phase: 'post', cond, round, slot }))); });
}
// Orchestrator.
const ROUTER_SYSTEM = `You coordinate analysts in a synthetic bibliometric exercise. A collection of study records is split into ${PARTS} parts arranged in a ring, numbered 0 to ${PARTS - 1}; part ${PARTS - 1} is next to part 0. You never see the records. The goal is that the counts on the board, taking the latest count of each part, add up to the right author with the most studies that are ${COND}. Every part was counted once at the start (\`first\`). Since then the collection may have been edited; an edit, when there is one, tends to affect neighbouring parts. There are ${ROUNDS} rounds and in each you send ${WORKERS} analysts, each to one part. A count can contain small mistakes. \`later\` lists the counts made since the start; \`changed\` is true when a count differs clearly from the previous count of that part. Decide where the ${WORKERS} analysts of this round go. Write your working in \`working\`, at most 60 words, then \`assignments\`: exactly ${WORKERS} part numbers. Return only JSON matching the schema.`;
const ASSIGN_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, assignments: { type: 'array', items: { type: 'integer' } } }, required: ['working', 'assignments'], additionalProperties: false };
const assignRow = (c, cond, round, board) => ({ custom_id: assignId(c.seed, cond, round), params: req(ROUTER_SYSTEM, ASSIGN_SCHEMA, { collection: c.id, authors: c.authors, round, rounds_left_after_this: ROUNDS - round, first: board.first.map((counts, part) => ({ part, counts })), later: board.later.map((x) => ({ round: x.round, part: x.part, counts: x.counts, changed: x.alarm })) }), meta: { kind: 'assign', regime: 'router', seed: c.seed, cond: round === 1 ? null : cond, round } });
export function assignRows(outputs, round) { return SEEDS.flatMap((seed) => { const c = makeCorpus(seed); return (round === 1 ? [0] : [0, 1]).map((cond) => assignRow(c, cond, round, replay('router', c, cond, outputs, round - 1).board)); }); }
// Waves per regime. sweep and random need no feedback (random is seeded): everything in one wave.
export function waveOf(regime, k, outputs) {
  if (regime === 'sweep' || regime === 'random') return [...preRows(regime), ...[1, 2, 3].flatMap((r) => postRowsBlind(regime, r))];
  if (regime === 'alarm') return k === 0 ? preRows(regime) : postRows(regime, outputs, k);
  if (k === 0) return preRows(regime); const round = Math.ceil(k / 2); return k % 2 ? assignRows(outputs, round) : postRows(regime, outputs, round);
}
// For regimes whose picks do not depend on what was read, the rows of every round can be built without outputs.
function postRowsBlind(regime, round) { return postRows(regime, new Map(), round); }
export const WAVES = { sweep: 1, random: 1, alarm: 1 + ROUNDS, router: 1 + 2 * ROUNDS };
// Reservation ceilings for output-dependent waves: same number and size of requests, with a full board for the orchestrator.
export function ceilingOf(regime, k) {
  const truth = (c) => { const m = new Map(); for (let p = 0; p < PARTS; p++) m.set(preId(regime, c.seed, p), { output: { working: '', counts: c.authors.map((a) => ({ author: a, n: tallyOf(c.parts[0][p], c.authors)[a] })) } }); return m; };
  if (regime === 'alarm') return postRows('sweep', new Map(), k).map((q) => ({ ...q, custom_id: q.custom_id.replace('-sw-', '-al-') }));
  const round = Math.ceil(k / 2);
  if (k % 2 === 0) return postRows('sweep', new Map(), round).map((q) => ({ ...q, custom_id: q.custom_id.replace('-sw-', '-rt-') }));
  return SEEDS.flatMap((seed) => { const c = makeCorpus(seed), first = Array.from({ length: PARTS }, (_, p) => tallyOf(c.parts[0][p], c.authors)), later = Array.from({ length: WORKERS * (ROUNDS - 1) }, (_, i) => ({ round: 1 + Math.floor(i / WORKERS), part: i, counts: first[i], alarm: true })); truth(c);
    return (round === 1 ? [0] : [0, 1]).map((cond) => assignRow(c, cond, round, { first, later })); });
}
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'assign') { const a = o?.assignments, usable = Array.isArray(a) && a.length === WORKERS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS); return { customId: q.custom_id, kind: 'assign', seed: m.seed, cond: m.cond, round: m.round, valid: !!o && Array.isArray(a), usable, truncated, assignments: usable ? a : null }; }
    const counts = parseCounts(o, m.authors); return { customId: q.custom_id, kind: 'read', regime: m.regime, seed: m.seed, phase: m.phase, cond: m.cond, round: m.round, part: m.part, valid: !!counts, truncated, counts, exact: !!counts && m.authors.every((a) => counts[a] === m.truth[a]) }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
// Final summary from all scored rows of a regime: replays the board from the scored counts.
export function summarizeRegime(regime, scoredByWave) {
  const all = scoredByWave.flat(), outputs = new Map(all.map((x) => [x.customId, { output: x.kind === 'assign' ? { assignments: x.assignments } : x.counts ? { counts: Object.entries(x.counts).map(([author, n]) => ({ author, n })) } : null }]));
  const complete = all.some((x) => x.kind === 'read' && x.round === ROUNDS); if (!complete) return { regime, perTask: [], note: 'stopped before the last round' };
  const perTask = SEEDS.flatMap((seed) => { const c = makeCorpus(seed); return [0, 1].map((cond) => { const { picks, board } = replay(regime, c, cond, outputs, ROUNDS), total = Object.fromEntries(c.authors.map((a) => [a, 0]));
    for (let p = 0; p < PARTS; p++) { const l = board.later.filter((x) => x.part === p && x.counts), counts = l.length ? l[l.length - 1].counts : board.first[p]; if (counts) for (const a of c.authors) total[a] += counts[a]; }
    const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]), answer = sorted[0][1] > sorted[1][1] ? sorted[0][0] : null, reread = new Set(picks.flat());
    return { seed, cond, correct: answer === c.answer[cond] ? 1 : 0, editedPartsReread: c.block.filter((p) => reread.has(p)).length, distinctPartsReread: reread.size, alarms: board.later.filter((x) => x.alarm).length }; }); });
  const by = (cond) => perTask.filter((x) => x.cond === cond), mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null), reads = all.filter((x) => x.kind === 'read'), assigns = all.filter((x) => x.kind === 'assign');
  return { regime, accuracy: { stable: mean(by(0), (x) => x.correct), edited: mean(by(1), (x) => x.correct) }, editedPartsReread: mean(by(1), (x) => x.editedPartsReread), atLeastTwoEditedReread: mean(by(1), (x) => (x.editedPartsReread >= 2 ? 1 : 0)), distinctPartsReread: mean(perTask, (x) => x.distinctPartsReread), alarmsPerCollection: { stable: mean(by(0), (x) => x.alarms), edited: mean(by(1), (x) => x.alarms) },
    readCalls: reads.length, readsExact: mean(reads, (x) => (x.exact ? 1 : 0)), invalidReads: reads.filter((x) => !x.valid).length, unusableAssignments: assigns.filter((x) => !x.usable).length, assignCalls: assigns.length, perTask };
}
