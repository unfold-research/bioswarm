// D4b: can the exploration half of the rule live in the agent? In D4 workers shown the marks near them followed an alarm
// to a fresh neighbour in 90% of choices, and asked to be sent elsewhere in 3 of 720: they did not explore, and reached
// 0.58 against 0.70 for the rule in the harness. Three ways of giving them exploration, each as its own variant on the
// same 60 collections and starting positions as D4 and R2b:
//   told  the D4 view, and two sentences on the trade: two analysts who stay near where they start reach only a few
//         parts, and when nothing near them has changed, being sent elsewhere covers more of the ring
//   wide  the D4 instructions with nine parts in view instead of five
//   draw  the D4 view plus one concrete offer: a part elsewhere, drawn by the harness, that the worker may take
// Everything else as in D4 (../d4-choice/protocol.mjs): marks computed by code, answers by code from the latest counts.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32 } from '../littask.mjs';
import { makeCorpus, tallyOf, parseCounts, SEEDS, PARTS, ROUNDS, WORKERS, ALARM_AT, OUT_MAX } from '../r2b-regimes/protocol.mjs';

export { SEEDS, makeCorpus };
export const TITLE = 'D4b exploration carried by the agents: told, a wider view, or a concrete offer';
export const PREREG = 'tasks/R3-D4B-PREREG.md';
export const VARIANTS = ['told', 'wide', 'draw'];
export const WAVES = 1 + 2 * ROUNDS;
const radius = (variant) => (variant === 'wide' ? 4 : 2);
export const GATE = { maxInvalidShare: 0.1 };
export const CONTROLS = { exempt: 'the fixed-schedule control (r2b-sweep) and the orchestrator (r2b-router) were run on the same 60 collections; one agent cannot hold the field, which exceeds the request size ceiling' };
const TAG = { told: 'td', wide: 'wd', draw: 'dr' };
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const READ_SYSTEM = `You are one of several analysts in a synthetic bibliometric exercise. You see one part of a larger collection. Each record describes one study: id, author, year, review status and outcome. For every author listed in \`authors\`, count the studies in the records you are given that are ${COND}. Write your working in \`working\`, at most 80 words, then \`counts\` with one entry per author, in the order given, using 0 when an author has none. Return only JSON matching the schema.`;
const COUNT_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, n: { type: 'integer' } }, required: ['author', 'n'], additionalProperties: false } } }, required: ['working', 'counts'], additionalProperties: false };
const chooseSystem = (variant) => `You are one of several analysts in a synthetic bibliometric exercise. A collection of study records is split into ${PARTS} parts arranged in a ring, numbered 0 to ${PARTS - 1}; part ${PARTS - 1} is next to part 0. Every part was counted once at the start. Since then the collection may have been edited; an edit, when there is one, tends to affect neighbouring parts. You can re-count one part now, and the analysts as a group can re-count only a few. You are at one part and you see only the parts near you. For each, \`recounted\` says whether someone has re-counted it since the start; \`changed\` says whether a re-count of it differed clearly from its earlier count.${variant === 'told' ? ' Two analysts who stay near where they started can reach only a few parts of the ring. When nothing near you has changed, being sent elsewhere covers more of it.' : ''} Choose the part to re-count: one of the parts listed, ${variant === 'draw' ? 'or the part given in \`offered_elsewhere\`, which has not been re-counted' : 'or -1 to be sent to a part elsewhere in the ring that has not been re-counted'}. Write your working in \`working\`, at most 40 words, then \`go_to\`. Return only JSON matching the schema.`;
const CHOOSE_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, go_to: { type: 'integer' } }, required: ['working', 'go_to'], additionalProperties: false };
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const preId = (v, seed, p) => `d4b-${seed}-${TAG[v]}-pre-p${p}`, chooseId = (v, seed, cond, round, slot) => `d4b-${seed}-${TAG[v]}-c${cond}-g${round}s${slot}`, readId = (v, seed, cond, round, slot) => `d4b-${seed}-${TAG[v]}-c${cond}-r${round}s${slot}`;
const near = (p, variant) => Array.from({ length: 2 * radius(variant) + 1 }, (_, i) => (p - radius(variant) + i + PARTS) % PARTS);
const differs = (a, b, authors) => authors.reduce((n, x) => n + Math.abs(a[x] - b[x]), 0) >= ALARM_AT;
export function startPositions(seed) { const rnd = mulberry32(seed * 131 + 7), a = Math.floor(rnd() * PARTS); let b = Math.floor(rnd() * (PARTS - 1)); if (b >= a) b++; return [a, b]; }
// Replays a collection in one condition from the outputs so far. Returns positions, the view each worker gets in round
// `upTo` (if choices for it are still to be made), the parts chosen in each completed round, and the board.
const elsewhere = (c, later, round, slot, exclude = []) => { const seen = new Set(later.map((x) => x.part)), free = Array.from({ length: PARTS }, (_, p) => p).filter((p) => !seen.has(p) && !exclude.includes(p)), pool = free.length ? free : Array.from({ length: PARTS }, (_, p) => p).filter((p) => !seen.has(p)), all = pool.length ? pool : Array.from({ length: PARTS }, (_, p) => p); return all[Math.floor(mulberry32(c.seed * 1000 + round * 10 + slot)() * all.length)]; };
export function replay(variant, c, cond, outputs, upTo) {
  const first = Array.from({ length: PARTS }, (_, p) => parseCounts(outputs.get(preId(variant, c.seed, p))?.output, c.authors)), later = [], picks = [], choices = [], pos = startPositions(c.seed);
  const latest = (p) => { const l = later.filter((x) => x.part === p && x.counts); return l.length ? l[l.length - 1].counts : first[p]; };
  const view = (slot) => near(pos[slot], variant).map((part) => ({ part, recounted: later.some((x) => x.part === part), changed: later.some((x) => x.part === part && x.alarm) }));
  for (let round = 1; round <= upTo; round++) {
    const views = [0, 1].map(view), offers = [0, 1].map((slot) => elsewhere(c, later, round, slot, views[slot].map((x) => x.part))), have = outputs.has(chooseId(variant, c.seed, cond, round, 0)) || outputs.has(chooseId(variant, c.seed, cond, round, 1));
    if (!have) return { pos, views, offers, picks, choices, board: { first, later }, pendingRound: round };
    const pick = [0, 1].map((slot) => { const g = outputs.get(chooseId(variant, c.seed, cond, round, slot))?.output?.go_to, listed = views[slot].map((x) => x.part), away = variant === 'draw' ? g === offers[slot] : g === -1, valid = Number.isInteger(g) && (away || listed.includes(g));
      const part = valid && !away ? g : offers[slot], cell = views[slot].find((x) => x.part === g);
      choices.push({ round, slot, valid, elsewhere: !valid || away, part, changedInView: views[slot].some((x) => x.changed), toChangedNeighbour: valid && !away && !cell.recounted && views[slot].some((x) => x.changed && Math.min((x.part - g + PARTS) % PARTS, (g - x.part + PARTS) % PARTS) === 1), toRecounted: valid && !away && cell.recounted });
      return part; });
    picks.push(pick); pick.forEach((part, slot) => { pos[slot] = part; });
    later.push(...pick.map((part, slot) => { const counts = parseCounts(outputs.get(readId(variant, c.seed, cond, round, slot))?.output, c.authors), prev = latest(part); return { round, part, counts, alarm: !!counts && !!prev && differs(counts, prev, c.authors) }; }));
  }
  return { pos, views: null, offers: null, picks, choices, board: { first, later }, pendingRound: null };
}
const readRow = (variant, c, id, part, state, extra) => ({ custom_id: id, params: req(READ_SYSTEM, COUNT_SCHEMA, { collection: c.id, part, authors: c.authors, records: c.parts[state][part] }), meta: { kind: 'read', variant, seed: c.seed, part, truth: tallyOf(c.parts[state][part], c.authors), authors: c.authors, ...extra } });
export function waveOf(variant, k, outputs = new Map()) {
  const cs = SEEDS.map(makeCorpus);
  if (k === 0) return cs.flatMap((c) => Array.from({ length: PARTS }, (_, p) => readRow(variant, c, preId(variant, c.seed, p), p, 0, { phase: 'pre', cond: null, round: 0 })));
  const round = Math.ceil(k / 2);
  if (k % 2) return cs.flatMap((c) => [0, 1].flatMap((cond) => { const r = replay(variant, c, cond, outputs, round); return [0, 1].map((slot) => ({ custom_id: chooseId(variant, c.seed, cond, round, slot), params: req(chooseSystem(variant), CHOOSE_SCHEMA, { collection: c.id, round, rounds_left_after_this: ROUNDS - round, you_are_at: r.pos[slot], nearby: r.views[slot], ...(variant === 'draw' ? { offered_elsewhere: r.offers[slot] } : {}) }), meta: { kind: 'choose', variant, seed: c.seed, cond, round, slot, at: r.pos[slot], nearby: r.views[slot], offer: r.offers[slot] } })); }));
  return cs.flatMap((c) => [0, 1].flatMap((cond) => replay(variant, c, cond, outputs, round).picks[round - 1].map((part, slot) => readRow(variant, c, readId(variant, c.seed, cond, round, slot), part, cond, { phase: 'post', cond, round, slot }))));
}
// Ceiling of an output-dependent wave: the same number of requests of the same size, built as if every worker had asked
// to be sent elsewhere.
export function ceilingOf(variant, k) {
  const fake = new Map(); for (let j = 1; j < k; j++) for (const q of waveOf(variant, j, fake)) fake.set(q.custom_id, { output: q.meta.kind === 'choose' ? { go_to: variant === 'draw' ? q.meta.offer : -1 } : { counts: q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) } });
  return waveOf(variant, k, fake);
}
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'choose') { const g = o?.go_to, listed = m.nearby.map((x) => x.part), usable = Number.isInteger(g) && ((m.variant === 'draw' ? g === m.offer : g === -1) || listed.includes(g)); return { customId: q.custom_id, kind: 'choose', seed: m.seed, cond: m.cond, round: m.round, slot: m.slot, valid: !!o && Number.isInteger(g), usable, truncated, goTo: Number.isInteger(g) ? g : null }; }
    const counts = parseCounts(o, m.authors); return { customId: q.custom_id, kind: 'read', seed: m.seed, phase: m.phase, cond: m.cond, round: m.round, part: m.part, valid: !!counts, truncated, counts, exact: !!counts && m.authors.every((a) => counts[a] === m.truth[a]) }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarizeVariant(variant, scoredByWave) {
  const all = scoredByWave.flat(), outputs = new Map(all.map((x) => [x.customId, { output: x.kind === 'choose' ? { go_to: x.goTo } : x.counts ? { counts: Object.entries(x.counts).map(([author, n]) => ({ author, n })) } : null }]));
  if (!all.some((x) => x.kind === 'read' && x.round === ROUNDS)) return { variant, perTask: [], note: 'stopped before the last round' };
  const stats = [], perTask = SEEDS.flatMap((seed) => { const c = makeCorpus(seed); return [0, 1].map((cond) => { const { picks, board, choices } = replay(variant, c, cond, outputs, ROUNDS), total = Object.fromEntries(c.authors.map((a) => [a, 0])); stats.push(...choices.map((x) => ({ ...x, cond })));
    for (let p = 0; p < PARTS; p++) { const l = board.later.filter((x) => x.part === p && x.counts), counts = l.length ? l[l.length - 1].counts : board.first[p]; if (counts) for (const a of c.authors) total[a] += counts[a]; }
    const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]), answer = sorted[0][1] > sorted[1][1] ? sorted[0][0] : null, reread = new Set(picks.flat());
    return { seed, cond, correct: answer === c.answer[cond] ? 1 : 0, editedPartsReread: c.block.filter((p) => reread.has(p)).length, distinctPartsReread: reread.size, alarms: board.later.filter((x) => x.alarm).length }; }); });
  const by = (cond) => perTask.filter((x) => x.cond === cond), mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null), reads = all.filter((x) => x.kind === 'read'), withAlarm = stats.filter((x) => x.changedInView);
  return { variant, accuracy: { stable: mean(by(0), (x) => x.correct), edited: mean(by(1), (x) => x.correct) }, editedPartsReread: mean(by(1), (x) => x.editedPartsReread), distinctPartsReread: mean(perTask, (x) => x.distinctPartsReread), alarmsPerCollection: { stable: mean(by(0), (x) => x.alarms), edited: mean(by(1), (x) => x.alarms) },
    choices: { total: stats.length, unusable: stats.filter((x) => !x.valid).length, elsewhere: mean(stats, (x) => (x.elsewhere ? 1 : 0)), toAlreadyRecounted: mean(stats, (x) => (x.toRecounted ? 1 : 0)), withAChangedPartInView: withAlarm.length, ofThoseToAFreshNeighbourOfIt: mean(withAlarm, (x) => (x.toChangedNeighbour ? 1 : 0)) },
    readCalls: reads.length, chooseCalls: all.filter((x) => x.kind === 'choose').length, readsExact: mean(reads, (x) => (x.exact ? 1 : 0)), perTask };
}
