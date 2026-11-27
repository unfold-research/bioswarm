// D6 (papers/P1-bio-inspired-agentic-swarms/RESEARCH-NEEDS.md; programs/trigger.md): one agent holding the whole
// re-counting budget at partial coverage. R2, R2b, R3 and RD compared a schedule, rules and orchestrators that direct
// several readers; none had a single agent with the whole budget, which is the control the P1 standard requires.
//
// Setting and collections of R2b (local, seeds 28001 to 28060) and R3 (scatter, seeds 29001 to 29060): 12 parts in a
// ring, every part counted once by ordinary readers, a silent edit of three parts, then 6 re-counts. Here one agent makes
// all six, one after another. At each step it sees the board (first counts, its own later counts, which of them
// changed), receives the records of the part it asked for at the previous step, counts them, and names the next part.
// It decides six times where two workers directed by an orchestrator are assigned three times, and it reads the same
// records. It is told, as the orchestrators were, that an edit tends to affect neighbouring parts.
// Answers by code from the latest count of each part, as in every other regime.
import { MODEL } from '../../lab007-economy/model.mjs';
import { makeCorpus, tallyOf, PARTS } from '../ring/engine.mjs';
import { parseCounts, ALARM_AT, OUT_MAX } from '../r3-bounds/protocol.mjs';

export const TITLE = 'D6 one agent holding the whole budget at partial coverage';
export const PREREG = 'tasks/D6-T1-PREREG.md';
export const STEPS = 6, WAVES = 2 + STEPS;
export const SEEDS_OF = { local: Array.from({ length: 60 }, (_, i) => 28001 + i), scatter: Array.from({ length: 60 }, (_, i) => 29001 + i) };
export const GATE = { maxInvalidShare: 0.1 };
export const CONTROLS = { exempt: 'this study is the single-agent control; the fixed schedule on the same collections is r2b-sweep and r3-scatter-sweep' };
const SC = { local: 'l', scatter: 's' }, COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const READ_SYSTEM = `You are one of several analysts in a synthetic bibliometric exercise. You see one part of a larger collection. Each record describes one study: id, author, year, review status and outcome. For every author listed in \`authors\`, count the studies in the records you are given that are ${COND}. Write your working in \`working\`, at most 80 words, then \`counts\` with one entry per author, in the order given, using 0 when an author has none. Return only JSON matching the schema.`;
const DEEP_SYSTEM = `You are an analyst working alone in a synthetic bibliometric exercise. A collection of study records is split into ${PARTS} parts arranged in a ring, numbered 0 to ${PARTS - 1}; part ${PARTS - 1} is next to part 0. The goal is that the counts on the board, taking the latest count of each part, add up to the right author with the most studies that are ${COND}. Every part was counted once at the start (\`first\`). Since then the collection may have been edited; an edit, when there is one, tends to affect neighbouring parts. You can re-count ${STEPS} parts in all, one at a time. \`later\` lists your re-counts so far; \`changed\` is true when a re-count differed clearly from the previous count of that part. If \`records\` is present, it holds the part you asked for (\`part\`): count, for every author in \`authors\`, the studies in it that meet the three conditions, and give \`counts\` with one entry per author in the order given, 0 when none. If there are no records, give an empty \`counts\`. Then choose the next part to re-count in \`next_part\` (any number from 0 to ${PARTS - 1}; ignored after your last re-count). Write your working in \`working\`, at most 120 words. Return only JSON matching the schema.`;
const COUNT_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, n: { type: 'integer' } }, required: ['author', 'n'], additionalProperties: false } } }, required: ['working', 'counts'], additionalProperties: false };
const DEEP_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: COUNT_SCHEMA.properties.counts, next_part: { type: 'integer' } }, required: ['working', 'counts', 'next_part'], additionalProperties: false };
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const preId = (sc, seed, p) => `d6${SC[sc]}-${seed}-pre-p${p}`, stepId = (sc, seed, cond, step) => `d6${SC[sc]}-${seed}-c${cond}-d${step}`;
const differs = (a, b, authors) => authors.reduce((n, x) => n + Math.abs(a[x] - b[x]), 0) >= ALARM_AT;
// Replays one collection in one condition. Step s (1..STEPS) re-counts the part named by the output of step s-1
// (fallback: part s-1) and its count is in the output of step s.
export function replay(sc, c, cond, outputs, upTo) {
  const first = Array.from({ length: PARTS }, (_, p) => parseCounts(outputs.get(preId(sc, c.seed, p))?.output, c.authors)), later = [], picks = [];
  const latest = (p) => { const l = later.filter((x) => x.part === p && x.counts); return l.length ? l[l.length - 1].counts : first[p]; };
  for (let step = 1; step <= upTo; step++) { const g = outputs.get(stepId(sc, c.seed, cond, step - 1))?.output?.next_part, part = Number.isInteger(g) && g >= 0 && g < PARTS ? g : step - 1; picks.push(part);
    if (step < upTo || outputs.has(stepId(sc, c.seed, cond, step))) { const counts = parseCounts(outputs.get(stepId(sc, c.seed, cond, step))?.output, c.authors), prev = latest(part); later.push({ step, part, counts, alarm: !!counts && !!prev && differs(counts, prev, c.authors) }); } }
  return { picks, board: { first, later } };
}
export function waveOf(sc, k, outputs = new Map()) {
  const cs = SEEDS_OF[sc].map((seed) => makeCorpus(seed, sc));
  if (k === 0) return cs.flatMap((c) => Array.from({ length: PARTS }, (_, p) => ({ custom_id: preId(sc, c.seed, p), params: req(READ_SYSTEM, COUNT_SCHEMA, { collection: c.id, part: p, authors: c.authors, records: c.parts[0][p] }), meta: { kind: 'pre', seed: c.seed, part: p, truth: tallyOf(c.parts[0][p], c.authors), authors: c.authors } })));
  const step = k - 1; // wave k holds step k-1: step 0 chooses only; steps 1..STEPS count the part chosen before
  return cs.flatMap((c) => [0, 1].map((cond) => { const r = replay(sc, c, cond, outputs, step), part = step ? r.picks[step - 1] : null, board = { first: r.board.first.map((counts, p) => ({ part: p, counts })), later: r.board.later.map((x) => ({ step: x.step, part: x.part, counts: x.counts, changed: x.alarm })) };
    return { custom_id: stepId(sc, c.seed, cond, step), params: req(DEEP_SYSTEM, DEEP_SCHEMA, { collection: c.id, authors: c.authors, recounts_left_after_this: STEPS - step, ...board, ...(step ? { part, records: c.parts[cond][part] } : {}) }), meta: { kind: 'step', seed: c.seed, cond, step, part, truth: step ? tallyOf(c.parts[cond][part], c.authors) : null, authors: c.authors } }; }));
}
export function ceilingOf(sc, k) { const fake = new Map(); for (let j = 0; j < k; j++) for (const q of waveOf(sc, j, fake)) fake.set(q.custom_id, { output: { counts: q.meta.truth ? q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) : [], next_part: (q.meta.step || 0) % PARTS } }); return waveOf(sc, k, fake); }
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, counts = m.truth ? parseCounts(o, m.authors) : null, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'pre') return { customId: q.custom_id, kind: 'pre', seed: m.seed, part: m.part, valid: !!counts, truncated, counts, exact: !!counts && m.authors.every((a) => counts[a] === m.truth[a]) };
    const next = Number.isInteger(o?.next_part) ? o.next_part : null; return { customId: q.custom_id, kind: 'step', seed: m.seed, cond: m.cond, step: m.step, part: m.part, valid: !!o && (m.step === 0 || !!counts), truncated, counts, exact: m.step === 0 ? null : !!counts && m.authors.every((a) => counts[a] === m.truth[a]), nextPart: next, usableNext: next !== null && next >= 0 && next < PARTS }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarizeScenario(sc, scoredByWave) {
  const all = scoredByWave.flat(), outputs = new Map(all.map((x) => [x.customId, { output: { counts: x.counts ? Object.entries(x.counts).map(([author, n]) => ({ author, n })) : [], next_part: x.nextPart } }]));
  if (!all.some((x) => x.kind === 'step' && x.step === STEPS)) return { scenario: sc, perTask: [], note: 'stopped before the last step' };
  const perTask = SEEDS_OF[sc].flatMap((seed) => { const c = makeCorpus(seed, sc); return [0, 1].map((cond) => { const { picks, board } = replay(sc, c, cond, outputs, STEPS), total = Object.fromEntries(c.authors.map((a) => [a, 0]));
    for (let p = 0; p < PARTS; p++) { const l = board.later.filter((x) => x.part === p && x.counts), counts = l.length ? l[l.length - 1].counts : board.first[p]; if (counts) for (const a of c.authors) total[a] += counts[a]; }
    const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]), answer = sorted[0][1] > sorted[1][1] ? sorted[0][0] : null, reread = new Set(picks);
    return { seed, cond, correct: answer === c.answer[cond] ? 1 : 0, editedPartsReread: c.block.filter((p) => reread.has(p)).length, distinctPartsReread: reread.size, repeats: STEPS - reread.size }; }); });
  const by = (cond) => perTask.filter((x) => x.cond === cond), mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null), steps = all.filter((x) => x.kind === 'step'), counted = steps.filter((x) => x.step > 0);
  return { scenario: sc, accuracy: { stable: mean(by(0), (x) => x.correct), edited: mean(by(1), (x) => x.correct) }, editedPartsReread: mean(by(1), (x) => x.editedPartsReread), distinctPartsReread: mean(perTask, (x) => x.distinctPartsReread), repeatsPerRun: mean(perTask, (x) => x.repeats), recountsExact: mean(counted, (x) => (x.exact ? 1 : 0)), unusableNext: steps.filter((x) => x.step < STEPS && !x.usableNext).length, stepCalls: steps.length, truncated: all.filter((x) => x.truncated).length, perTask };
}
