// D5 decay with power. R1 compared stigmergy with and without decay on 30 collections and found 17 against 18 right:
// too few to say anything. D5 repeats that comparison as a sweep of the decay rate, first with exact readers by
// simulation, then with real readers on enough collections to detect what the simulation predicts.
//
// Setting: the R1 collections (../r1-regimes/protocol.mjs: 288 records in 6 parts of 48, one part edited silently so
// that the answer reverses). Avoid-stigmergy: in each round 3 workers each choose a part with probability proportional
// to 1/(1+m)^2, m the visit mark on it; after a round marks are multiplied by lambda and the new visits are added; the
// estimate of a part is the mean of its counts weighted by lambda^(age in rounds). lambda = 1 is no decay (the R1
// "stig-nodecay"), lambda = 0.5 is the R1 "stig-decay", lambda = 0 keeps only the latest round of marks and counts.
// A part never read contributes nothing. The edit happens after round EDIT_AFTER.
// Differences from R1, stated in the preregistration: every lambda uses the same random stream for a collection
// (common random numbers, so that arms are paired), and a second horizon of 8 rounds is added.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32 } from '../littask.mjs';
import { makeCorpus, tallyOf, parseCounts, PARTS } from '../r1-regimes/protocol.mjs';

export const TITLE = 'D5 decay with power: a sweep of the decay rate in avoid-stigmergy, simulated and with real readers';
export const PREREG = 'tasks/D5-Q1-PREREG.md';
export const WORKERS = 3, OUT_MAX = 1024, GATE = { maxInvalidShare: 0.1 };
export const LAMBDAS = [1, 0.75, 0.5, 0.25, 0];
export const HORIZONS = { short: { rounds: 4, editAfter: 2 }, long: { rounds: 8, editAfter: 4 } };
export const CONTROLS = { exempt: 'the fixed schedule and the single-agent arms of this setting are in R1 (both 30 of 30); D5 isolates one parameter of one regime and compares the regime with itself' };
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const SYSTEM = `You are one of several analysts in a synthetic bibliometric exercise. You see part of a larger collection. Each record describes one study: id, author, year, review status and outcome. For every author listed in \`authors\`, count the studies in the records you are given that are ${COND}. Write your working in \`working\`, at most 100 words, then \`counts\` with one entry per author, in the order given, using 0 when an author has none. Return only JSON matching the schema.`;
const SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, n: { type: 'integer' } }, required: ['author', 'n'], additionalProperties: false } } }, required: ['working', 'counts'], additionalProperties: false };
const tag = (lambda) => `l${Math.round(lambda * 100)}`;
// Reads of one collection under one decay rate: [{ round, slot, part }]. The stream does not depend on lambda.
export function schedule(c, lambda, h) {
  const rnd = mulberry32(c.seed * 31 + 7), marks = Array(PARTS).fill(0), out = [];
  for (let round = 1; round <= h.rounds; round++) { const wts = marks.map((m) => 1 / (1 + m) ** 2), tot = wts.reduce((a, b) => a + b, 0), picks = [];
    for (let slot = 0; slot < WORKERS; slot++) { let x = rnd() * tot, s = 0; while (s < PARTS - 1 && x >= wts[s]) { x -= wts[s]; s++; } picks.push(s); out.push({ round, slot, part: s }); }
    for (let s = 0; s < PARTS; s++) marks[s] = marks[s] * lambda + picks.filter((x) => x === s).length; }
  return out;
}
// Answer by code from deposits [{ round, part, counts }]: per part, the mean of its counts weighted by lambda^(age).
export function estimate(c, lambda, h, deposits) {
  const total = Object.fromEntries(c.authors.map((a) => [a, 0]));
  for (let p = 0; p < PARTS; p++) { const ds = deposits.filter((d) => d.part === p && d.counts); if (!ds.length) continue;
    const latest = Math.max(...ds.map((d) => d.round)), w = ds.map((d) => (lambda === 0 ? (d.round === latest ? 1 : 0) : lambda ** (h.rounds - d.round))), sw = w.reduce((x, y) => x + y, 0);
    for (const a of c.authors) total[a] += ds.reduce((n, d, i) => n + w[i] * d.counts[a], 0) / sw; }
  const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]); return sorted[0][1] - sorted[1][1] > 1e-9 ? sorted[0][0] : null;
}
// Exact readers: the outcome of one collection, condition (0 stable, 1 edited) and decay rate.
export function exact(seed, lambda, h, cond) { const c = makeCorpus(seed), calls = schedule(c, lambda, h);
  const deps = calls.map((x) => ({ ...x, counts: tallyOf(c.parts[x.round > h.editAfter && cond === 1 ? 1 : 0][x.part], c.authors) }));
  return { correct: estimate(c, lambda, h, deps) === c.answer[cond] ? 1 : 0, reread: calls.some((x) => x.round > h.editAfter && x.part === c.perturbedPart) ? 1 : 0, covered: new Set(calls.map((x) => x.part)).size }; }
export function simulate(seeds, h) { return Object.fromEntries(LAMBDAS.map((l) => { const o = seeds.map((s) => [exact(s, l, h, 0), exact(s, l, h, 1)]), m = (f) => o.reduce((n, x) => n + f(x), 0) / o.length; return [l, { stable: m((x) => x[0].correct), edited: m((x) => x[1].correct), reread: m((x) => x[1].reread), covered: m((x) => x[1].covered) }]; })); }

// Paid study: one decay rate, one horizon, a list of collections. Reads before the edit are shared by the two conditions.
export function rows(spec) { const h = HORIZONS[spec.horizon];
  return spec.seeds.flatMap((seed) => { const c = makeCorpus(seed); return schedule(c, spec.lambda, h).flatMap((x) => (x.round > h.editAfter ? [0, 1] : [null]).map((cond) => { const state = cond === 1 ? 1 : 0;
    return { custom_id: `d5-${seed}-${tag(spec.lambda)}-r${x.round}s${x.slot}${cond === null ? '' : `-c${cond}`}`, params: { model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: SCHEMA } }, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify({ collection: c.id, parts: [x.part], authors: c.authors, records: c.parts[state][x.part] }) }] },
      meta: { seed, round: x.round, slot: x.slot, part: x.part, cond, authors: c.authors, truth: tallyOf(c.parts[state][x.part], c.authors) } }; })); });
}
export function score(k, rs, outputs) { return rs.map((q) => { const item = outputs.get(q.custom_id), m = q.meta, counts = parseCounts(item?.output, m.authors); return { customId: q.custom_id, seed: m.seed, round: m.round, slot: m.slot, part: m.part, cond: m.cond, valid: !!counts, truncated: item?.stopReason === 'max_tokens', counts, exact: !!counts && m.authors.every((a) => counts[a] === m.truth[a]) }; }); }
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarize(spec, [scored]) { const h = HORIZONS[spec.horizon];
  const perTask = spec.seeds.flatMap((seed) => { const c = makeCorpus(seed); return [0, 1].map((cond) => { const mine = scored.filter((x) => x.seed === seed && (x.cond === null || x.cond === cond));
    return { seed, cond, correct: estimate(c, spec.lambda, h, mine.filter((x) => x.valid)) === c.answer[cond] ? 1 : 0, reread: mine.some((x) => x.round > h.editAfter && x.part === c.perturbedPart) ? 1 : 0 }; }); });
  const m = (r, f) => r.reduce((n, x) => n + f(x), 0) / r.length, by = (cond) => perTask.filter((x) => x.cond === cond);
  return { spec: { ...spec, seeds: [spec.seeds[0], spec.seeds[spec.seeds.length - 1], spec.seeds.length] }, stable: m(by(0), (x) => x.correct), edited: m(by(1), (x) => x.correct), editedPartReread: m(by(1), (x) => x.reread), readsExact: m(scored, (x) => (x.exact ? 1 : 0)), readCalls: scored.length, invalid: scored.filter((x) => !x.valid).length, perTask }; }
export const study = (id, spec) => ({ ID: id, TITLE: `${TITLE} — lambda ${spec.lambda}, ${spec.horizon}`, PREREG, WAVES: 1, CONTROLS, SPEC: spec, wave: () => rows(spec), ceiling: () => rows(spec), score, gate, summarize: (s) => summarize(spec, s) });
export const range = (from, n) => Array.from({ length: n }, (_, i) => from + i);
