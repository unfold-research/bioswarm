// T1 (programs/trigger.md): the trigger as a decision. How many re-counts should be spent on a field, when it is not
// known whether the field changed? Earlier regime studies fixed the budget. Here the budget is the decision.
//
// Field: 288 study records in 24 parts of 12, arranged in a ring; six authors; the leader has 20 qualifying studies and
// the runner-up 16. Every part was counted once. Three worlds, unknown to the regimes:
//   stable   nothing changed (the right answer is the leader, and no re-count is needed)
//   local    three neighbouring parts each gained three qualifying studies of the runner-up (25 against 20)
//   scatter  the same, in three parts no two of which are neighbours
// A regime is right in an edited world only if at least two of the three edited parts are re-counted.
// Re-counts happen in rounds of two, at most six rounds. Where to re-count is fixed for every regime: the planned search
// of the RD study (untouched neighbours of changed parts first, otherwise probes three parts apart from a seeded start).
// What differs is when to stop:
//   never        no re-count
//   always       all six rounds
//   thr4, thr8   probe for two or four rounds; stop if nothing changed; otherwise spend the whole budget
//   thr8flip     as thr8, and stop as soon as the leading author has changed
//   central      a model reads the board after each round and decides to continue or stop
// Readers are simulated with exact counts (in R2b and R3 real readers were exact in 0.99 of counts and the code regimes
// matched the simulation). Only the central trigger calls a model.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32, qualifies } from '../littask.mjs';

export const TITLE = 'T1 the trigger as a decision: when to stop re-counting a field that may or may not have changed';
export const PREREG = 'tasks/D6-T1-PREREG.md';
export const PARTS = 24, PART_SIZE = 12, ROUNDS = 6, WORKERS = 2, ADD = 3, ALARM_AT = 3;
export const WORLDS = ['stable', 'local', 'scatter'];
export const RULES = ['never', 'always', 'thr4', 'thr8', 'thr8flip'];
export const SEEDS = Array.from({ length: 90 }, (_, i) => 51001 + i); // world by seed; the range starting at 50001 was replaced after the leak probe flagged it (see the preregistration)
export const worldOf = (seed) => WORLDS[(seed - 1) % 3];
export const GATE = { maxInvalidShare: 0.1 }, SONNET = 'claude-sonnet-5-5';
export const CONTROLS = { exempt: 'the fixed-size controls (never, always) and the threshold rules are computed on the same fields by simulation; the study is of a decision, not of a collective against one agent' };

export function makeField(seed, world = worldOf(seed)) {
  const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const authors = Array.from({ length: 6 }, (_, i) => `au-${String.fromCharCode(97 + i)}${int(10, 99)}`), [W, R, ...others] = authors, all = () => shuffle(Array.from({ length: PARTS }, (_, i) => i));
  const parts = Array.from({ length: PARTS }, () => []), good = () => ({ year: int(2020, 2025), review: 'peer-reviewed', outcome: 'positive' });
  for (const p of all().slice(0, 20)) parts[p].push({ author: W, ...good() }); for (const p of all().slice(0, 16)) parts[p].push({ author: R, ...good() });
  for (const o of others) for (const p of all().slice(0, int(6, 10))) parts[p].push({ author: o, ...good() });
  for (const recs of parts) { recs.push({ author: others[0], ...good(), year: 2019 }); while (recs.length < PART_SIZE) { const x = { author: authors[int(0, 5)], year: int(2012, 2025), review: rnd() < 0.5 ? 'peer-reviewed' : 'preprint', outcome: ['positive', 'negative', 'null'][int(0, 2)] }; recs.push(qualifies(x) ? { ...x, review: 'preprint' } : x); } shuffle(recs); }
  const adjacent = (x, y) => { const d = Math.abs(x - y); return d === 1 || d === PARTS - 1; }; let block = [];
  if (world === 'local') { const s = int(0, PARTS - 1); block = [s, (s + 1) % PARTS, (s + 2) % PARTS]; }
  if (world === 'scatter') do block = all().slice(0, 3); while (block.some((x, i) => block.some((y, j) => i !== j && adjacent(x, y))));
  const tally = (recs) => Object.fromEntries(authors.map((a) => [a, recs.filter((x) => x.author === a && qualifies(x)).length]));
  const first = parts.map(tally), now = parts.map((recs, p) => (block.includes(p) ? { ...first[p], [R]: first[p][R] + ADD } : first[p]));
  return { id: `field-${seed}`, seed, world, authors, block, first, now, answer: world === 'stable' ? W : R, offset: int(0, PARTS - 1) };
}
const PROBES = [0, 12, 6, 18, 3, 15, 9, 21, 1, 13, 7, 19, 4, 16, 10, 22, 2, 14, 8, 20, 5, 17, 11, 23];
const differs = (a, b, authors) => authors.reduce((n, x) => n + Math.abs(a[x] - b[x]), 0) >= ALARM_AT;
// State after `rounds` rounds of the planned search with exact readers.
export function state(f, rounds) {
  const touched = [], changed = [];
  for (let r = 0; r < rounds; r++) { const want = [];
    for (const a of changed) for (const n of [(a + 1) % PARTS, (a + PARTS - 1) % PARTS]) if (!touched.includes(n) && !want.includes(n)) want.push(n);
    for (const x of PROBES.map((p) => (p + f.offset) % PARTS)) if (!touched.includes(x) && !want.includes(x)) want.push(x);
    for (const p of want.slice(0, WORKERS)) { touched.push(p); if (differs(f.now[p], f.first[p], f.authors)) changed.push(p); } }
  const total = Object.fromEntries(f.authors.map((a) => [a, 0])); for (let p = 0; p < PARTS; p++) { const c = touched.includes(p) ? f.now[p] : f.first[p]; for (const a of f.authors) total[a] += c[a]; }
  const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]); return { rounds, touched, changed, total, leader: sorted[0][1] > sorted[1][1] ? sorted[0][0] : null, lead: sorted[0][1] - sorted[1][1] };
}
// Rounds spent by a rule.
export function roundsOf(rule, f) {
  if (rule === 'never') return 0; if (rule === 'always') return ROUNDS;
  const k = rule === 'thr4' ? 2 : 4; if (!state(f, k).changed.length) return k;
  if (rule !== 'thr8flip') return ROUNDS; for (let r = k; r < ROUNDS; r++) if (state(f, r).leader !== f.authors[0]) return r; return ROUNDS;
}
export const outcome = (f, rounds) => ({ rounds, recounts: rounds * WORKERS, correct: state(f, rounds).leader === f.answer ? 1 : 0 });
export function evaluateRules(seeds) { const out = {}; for (const rule of RULES) { out[rule] = {}; for (const w of WORLDS) { const fs = seeds.filter((s) => worldOf(s) === w).map((s) => makeField(s)), o = fs.map((f) => outcome(f, roundsOf(rule, f))); out[rule][w] = { fields: o.length, correct: o.reduce((n, x) => n + x.correct, 0) / o.length, recounts: o.reduce((n, x) => n + x.recounts, 0) / o.length }; } } return out; }

// Central trigger: one decision per field after each round, for fields that have not stopped.
const DECIDE_SYSTEM = `You supervise the re-counting of a collection of study records in a synthetic bibliometric exercise. The collection is split into ${PARTS} parts arranged in a ring. Every part was counted once at the start, and the totals per author come from the latest count of each part. The task is to name the author with the most qualifying studies. The collection may or may not have been edited since the first count; you are not told. Re-counting costs: each round sends two analysts to re-count two parts, chosen for you, and there can be at most ${ROUNDS} rounds. After each round you decide whether to pay for another round or to stop. Stop when further re-counts are unlikely to change which author leads; continue when they might. Write your working in \`working\`, at most 60 words, then \`continue\` (true or false). Return only JSON matching the schema.`;
const DECIDE_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, continue: { type: 'boolean' } }, required: ['working', 'continue'], additionalProperties: false };
const decideId = (seed, r) => `t1-${seed}-r${r}`;
export function decideRows(model, k, outputs = new Map()) {
  const round = k + 1; // wave k is the decision after round k+1
  return SEEDS.map((s) => makeField(s)).filter((f) => { for (let r = 1; r < round; r++) if (outputs.get(decideId(f.seed, r))?.output?.continue !== true) return false; return true; }).map((f) => { const st = state(f, round);
    const content = { collection: f.id, rounds_done: round, rounds_left: ROUNDS - round, parts_recounted: st.touched.map((p) => ({ part: p, changed: st.changed.includes(p), ...(st.changed.includes(p) ? { first_count: f.first[p], new_count: f.now[p] } : {}) })), totals_by_author: st.total };
    const params = model === 'sonnet' ? { model: SONNET, max_tokens: 1024, output_config: { format: { type: 'json_schema', schema: DECIDE_SCHEMA }, effort: 'low' }, system: DECIDE_SYSTEM, messages: [{ role: 'user', content: JSON.stringify(content) }] }
      : { model: MODEL, max_tokens: 512, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: DECIDE_SCHEMA } }, system: DECIDE_SYSTEM, messages: [{ role: 'user', content: JSON.stringify(content) }] };
    return { custom_id: decideId(f.seed, round), params, meta: { seed: f.seed, world: f.world, round } }; });
}
export const WAVES = ROUNDS - 1;
export const ceilingRows = (model, k) => decideRows(model, k, new Map(SEEDS.flatMap((s) => Array.from({ length: ROUNDS }, (_, r) => [decideId(s, r + 1), { output: { continue: true } }]))));
export function score(k, rows, outputs) { return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, valid = !!o && typeof o.continue === 'boolean'; return { customId: q.custom_id, seed: q.meta.seed, world: q.meta.world, round: q.meta.round, valid, truncated: item?.stopReason === 'max_tokens', cont: valid && o.continue === true }; }); }
// The run ends early when every field has stopped; an invalid decision counts as stop.
export const gate = (k, scored) => (!scored.length ? 'invalid-output-stop' : scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : scored.some((x) => x.cont) ? null : 'all-fields-stopped');
export function summarizeCentral(scoredByWave) {
  const all = scoredByWave.flat(), perField = SEEDS.map((seed) => { const f = makeField(seed); let rounds = 1; for (let r = 1; r < ROUNDS; r++) { const d = all.find((x) => x.seed === seed && x.round === r); if (d && d.cont) rounds = r + 1; else break; } return { seed, world: f.world, decisions: all.filter((x) => x.seed === seed).length, ...outcome(f, rounds) }; });
  const byWorld = Object.fromEntries(WORLDS.map((w) => { const r = perField.filter((x) => x.world === w), m = (g) => r.reduce((n, x) => n + g(x), 0) / r.length; return [w, { fields: r.length, correct: m((x) => x.correct), recounts: m((x) => x.recounts), decisions: m((x) => x.decisions) }]; }));
  return { byWorld, decisionCalls: all.length, invalid: all.filter((x) => !x.valid).length, perField };
}
