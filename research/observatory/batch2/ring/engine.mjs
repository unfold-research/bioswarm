// Ring engine: the partial-coverage setting of R2b and R3 as one parametrised module, so that new regimes and models can
// be added without copying the protocol again. The collections are those of ../r3-bounds/protocol.mjs (its generator
// with scenario "local" gives exactly the R2b collections for the same seed; checked in ring/engine.test.mjs).
//
// A study is a spec: { prefix, scenario, seeds, regime, prior, orchestrator }
//   scenario      'local' (three neighbouring parts edited), 'scatter' (three parts, no two adjacent), 'poison' (local,
//                 plus one false count on the board before the first round)
//   regime        'sweep'   parts 0 to 5 in order
//                 'alarm'   the R2b rule: neighbours of an alarmed part favoured, parts already re-read avoided
//                 'hedge'   one worker follows the alarm rule; the other ignores alarms and goes to a part not yet re-read
//                 'adapt'   the alarm rule until the board contradicts locality (no two alarmed parts adjacent and at
//                           least two re-counted neighbours of alarmed parts unchanged), then both workers explore
//                 'probe'   a planned search in code, added after the RD results: untouched neighbours of alarmed parts
//                           first, otherwise probes spaced three parts apart (the size of an edited block)
//                 'router'  an orchestrator model assigns the two workers of each round
//   prior         router only: whether the orchestrator is told that an edit tends to affect neighbouring parts
//   orchestrator  router only: 'haiku' or 'sonnet'. Readers are always Claude Haiku 5.5.
// Setting: 12 parts of 24 in a ring, every part counted once, then 6 re-counts in 3 rounds of 2 workers; an alarm is a
// count that differs from the previous count of its part by 3 or more; answers by code from the latest count of each part.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32 } from '../littask.mjs';
import { makeCorpus, tallyOf, parseCounts, PARTS, ROUNDS, WORKERS, ALARM_AT, BOOST, SEEN, OUT_MAX, POISON_ADD } from '../r3-bounds/protocol.mjs';

export { makeCorpus, tallyOf, PARTS, ROUNDS };
export const GATE = { maxInvalidShare: 0.1 }, SONNET = 'claude-sonnet-5-5';
const TAG = { sweep: 'sw', alarm: 'al', hedge: 'hg', adapt: 'ad', probe: 'pb', router: 'rt' };
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const WORKER_SYSTEM = `You are one of several analysts in a synthetic bibliometric exercise. You see one part of a larger collection. Each record describes one study: id, author, year, review status and outcome. For every author listed in \`authors\`, count the studies in the records you are given that are ${COND}. Write your working in \`working\`, at most 80 words, then \`counts\` with one entry per author, in the order given, using 0 when an author has none. Return only JSON matching the schema.`;
const COUNT_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, counts: { type: 'array', items: { type: 'object', properties: { author: { type: 'string' }, n: { type: 'integer' } }, required: ['author', 'n'], additionalProperties: false } } }, required: ['working', 'counts'], additionalProperties: false };
const routerSystem = (prior) => `You coordinate analysts in a synthetic bibliometric exercise. A collection of study records is split into ${PARTS} parts arranged in a ring, numbered 0 to ${PARTS - 1}; part ${PARTS - 1} is next to part 0. You never see the records. The goal is that the counts on the board, taking the latest count of each part, add up to the right author with the most studies that are ${COND}. Every part was counted once at the start (\`first\`). Since then the collection may have been edited${prior ? '; an edit, when there is one, tends to affect neighbouring parts' : ''}. There are ${ROUNDS} rounds and in each you send ${WORKERS} analysts, each to one part. A count can contain small mistakes. \`later\` lists the counts made since the start; \`changed\` is true when a count differs clearly from the previous count of that part. Decide where the ${WORKERS} analysts of this round go. Write your working in \`working\`, at most 60 words, then \`assignments\`: exactly ${WORKERS} part numbers. Return only JSON matching the schema.`;
const ASSIGN_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, assignments: { type: 'array', items: { type: 'integer' } } }, required: ['working', 'assignments'], additionalProperties: false };
const haiku = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
// Sonnet 5.5 rejects disabled thinking: adaptive thinking stays on, effort low, 1,024 output tokens (an assignment is two numbers).
const sonnet = (system, schema, content) => ({ model: SONNET, max_tokens: 1024, output_config: { format: { type: 'json_schema', schema }, effort: 'low' }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const key = (spec, seed) => `${spec.prefix}-${seed}-${TAG[spec.regime]}`;
const preId = (spec, seed, part) => `${key(spec, seed)}-pre-p${part}`, postId = (spec, seed, cond, round, slot) => `${key(spec, seed)}-c${cond}-r${round}s${slot}`, assignId = (spec, seed, cond, round) => `${key(spec, seed)}-c${cond}-a${round}`;
const corpora = (spec) => spec.seeds.map((seed) => makeCorpus(seed, spec.scenario));
const readRow = (spec, c, id, part, state, extra) => ({ custom_id: id, params: haiku(WORKER_SYSTEM, COUNT_SCHEMA, { collection: c.id, part, authors: c.authors, records: c.parts[state][part] }), meta: { kind: 'read', seed: c.seed, part, truth: tallyOf(c.parts[state][part], c.authors), authors: c.authors, ...extra } });
const differs = (a, b, authors) => authors.reduce((n, x) => n + Math.abs(a[x] - b[x]), 0) >= ALARM_AT;
const adjacent = (x, y) => { const d = Math.abs(x - y); return d === 1 || d === PARTS - 1; };
const draw = (rnd, wts) => { const tot = wts.reduce((a, b) => a + b, 0); let x = rnd() * tot, p = 0; while (p < PARTS - 1 && x >= wts[p]) { x -= wts[p]; p++; } return p; };

export function replay(spec, c, cond, outputs, upTo) {
  const first = Array.from({ length: PARTS }, (_, p) => parseCounts(outputs.get(preId(spec, c.seed, p))?.output, c.authors)), later = [], picks = [];
  if (c.poison !== null) { const b = first[c.poison] || tallyOf(c.parts[0][c.poison], c.authors); later.push({ round: 0, part: c.poison, counts: { ...b, [c.authors[0]]: b[c.authors[0]] + POISON_ADD }, alarm: true, planted: true }); }
  const latest = (p) => { const l = later.filter((x) => x.part === p && x.counts); return l.length ? l[l.length - 1].counts : first[p]; };
  const rnd = mulberry32(c.seed * 97 + { alarm: 5, hedge: 11, adapt: 13 }[spec.regime] || 1);
  for (let round = 1; round <= upTo; round++) {
    let pick;
    if (spec.regime === 'sweep') pick = [2 * (round - 1), 2 * (round - 1) + 1];
    else if (spec.regime === 'router') { const a = outputs.get(assignId(spec, c.seed, cond, round))?.output?.assignments; pick = Array.isArray(a) && a.length === WORKERS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS) ? a : [2 * (round - 1), 2 * (round - 1) + 1]; }
    else { const touched = new Set(later.map((x) => x.part)), explore = Array.from({ length: PARTS }, (_, p) => (touched.has(p) ? SEEN : 1)), follow = [...explore], alarmed = [...new Set(later.filter((y) => y.alarm).map((y) => y.part))];
      for (const a of alarmed) for (const n of [(a + 1) % PARTS, (a + PARTS - 1) % PARTS]) if (!touched.has(n)) follow[n] += BOOST;
      const quiet = later.filter((y) => !y.alarm && y.round > 0 && alarmed.some((a) => adjacent(a, y.part))).length, refuted = !alarmed.some((a) => alarmed.some((b) => adjacent(a, b))) && quiet >= 2;
      if (spec.regime === 'probe') { // a planned search: untouched neighbours of alarmed parts first, then probes spaced three apart, starting at a seeded offset
        const off = Math.floor(mulberry32(c.seed * 53 + 3)() * PARTS), seq = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5, 11].map((x) => (x + off) % PARTS), want = [];
        for (const a of alarmed) for (const n of [(a + 1) % PARTS, (a + PARTS - 1) % PARTS]) if (!touched.has(n) && !want.includes(n)) want.push(n);
        for (const x of seq) if (!touched.has(x) && !want.includes(x)) want.push(x);
        pick = want.slice(0, WORKERS); while (pick.length < WORKERS) pick.push(seq[pick.length]);
      } else
      pick = spec.regime === 'alarm' ? [draw(rnd, follow), draw(rnd, follow)] : spec.regime === 'hedge' ? [draw(rnd, follow), draw(rnd, explore)] : (refuted ? [draw(rnd, explore), draw(rnd, explore)] : [draw(rnd, follow), draw(rnd, follow)]); }
    picks.push(pick);
    if (round < upTo || outputs.has(postId(spec, c.seed, cond, round, 0))) later.push(...pick.map((part, slot) => { const counts = parseCounts(outputs.get(postId(spec, c.seed, cond, round, slot))?.output, c.authors), prev = latest(part); return { round, part, counts, alarm: !!counts && !!prev && differs(counts, prev, c.authors) }; }));
  }
  return { picks, board: { first, later } };
}
const preRows = (spec) => corpora(spec).flatMap((c) => Array.from({ length: PARTS }, (_, p) => readRow(spec, c, preId(spec, c.seed, p), p, 0, { phase: 'pre', cond: null, round: 0 })));
const postRows = (spec, outputs, round) => corpora(spec).flatMap((c) => [0, 1].flatMap((cond) => replay(spec, c, cond, outputs, round).picks[round - 1].map((part, slot) => readRow(spec, c, postId(spec, c.seed, cond, round, slot), part, cond, { phase: 'post', cond, round, slot }))));
const assignRows = (spec, outputs, round) => corpora(spec).flatMap((c) => [0, 1].map((cond) => { const board = replay(spec, c, cond, outputs, round - 1).board, content = { collection: c.id, authors: c.authors, round, rounds_left_after_this: ROUNDS - round, first: board.first.map((counts, part) => ({ part, counts })), later: board.later.map((x) => ({ round: x.round, part: x.part, counts: x.counts, changed: x.alarm })) };
  return { custom_id: assignId(spec, c.seed, cond, round), params: (spec.orchestrator === 'sonnet' ? sonnet : haiku)(routerSystem(spec.prior), ASSIGN_SCHEMA, content), meta: { kind: 'assign', seed: c.seed, cond, round } }; }));
export const wavesOf = (spec) => (spec.regime === 'sweep' ? 1 : spec.regime === 'router' ? 1 + 2 * ROUNDS : 1 + ROUNDS);
export function waveOf(spec, k, outputs = new Map()) {
  if (spec.regime === 'sweep') return [...preRows(spec), ...[1, 2, 3].flatMap((r) => postRows(spec, new Map(), r))];
  if (k === 0) return preRows(spec);
  if (spec.regime !== 'router') return postRows(spec, outputs, k);
  const round = Math.ceil(k / 2); return k % 2 ? assignRows(spec, outputs, round) : postRows(spec, outputs, round);
}
export function ceilingOf(spec, k) {
  const fake = new Map(); for (let j = 0; j < k; j++) for (const q of waveOf(spec, j, fake)) fake.set(q.custom_id, { output: q.meta.kind === 'assign' ? { assignments: [0, 1] } : { counts: q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) } });
  return waveOf(spec, k, fake);
}
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'assign') { const a = o?.assignments, usable = Array.isArray(a) && a.length === WORKERS && a.every((x) => Number.isInteger(x) && x >= 0 && x < PARTS); return { customId: q.custom_id, kind: 'assign', seed: m.seed, cond: m.cond, round: m.round, valid: !!o && Array.isArray(a), usable, truncated, assignments: usable ? a : null }; }
    const counts = parseCounts(o, m.authors); return { customId: q.custom_id, kind: 'read', seed: m.seed, phase: m.phase, cond: m.cond, round: m.round, part: m.part, valid: !!counts, truncated, counts, exact: !!counts && m.authors.every((a) => counts[a] === m.truth[a]) }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarize(spec, scoredByWave) {
  const all = scoredByWave.flat(), outputs = new Map(all.map((x) => [x.customId, { output: x.kind === 'assign' ? { assignments: x.assignments } : x.counts ? { counts: Object.entries(x.counts).map(([author, n]) => ({ author, n })) } : null }]));
  if (!all.some((x) => x.kind === 'read' && x.round === ROUNDS)) return { spec, perTask: [], note: 'stopped before the last round' };
  const perTask = corpora(spec).flatMap((c) => [0, 1].map((cond) => { const { picks, board } = replay(spec, c, cond, outputs, ROUNDS), total = Object.fromEntries(c.authors.map((a) => [a, 0]));
    for (let p = 0; p < PARTS; p++) { const l = board.later.filter((x) => x.part === p && x.counts), counts = l.length ? l[l.length - 1].counts : board.first[p]; if (counts) for (const a of c.authors) total[a] += counts[a]; }
    const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]), answer = sorted[0][1] > sorted[1][1] ? sorted[0][0] : null, reread = new Set(picks.flat());
    return { seed: c.seed, cond, correct: answer === c.answer[cond] ? 1 : 0, editedPartsReread: c.block.filter((p) => reread.has(p)).length, distinctPartsReread: reread.size, poisonReread: c.poison !== null && reread.has(c.poison) ? 1 : 0, readsNextToPoison: c.poison === null ? 0 : picks.flat().filter((p) => adjacent(p, c.poison)).length }; }));
  const by = (cond) => perTask.filter((x) => x.cond === cond), mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null), reads = all.filter((x) => x.kind === 'read'), assigns = all.filter((x) => x.kind === 'assign');
  return { spec: { ...spec, seeds: [spec.seeds[0], spec.seeds[spec.seeds.length - 1]] }, accuracy: { stable: mean(by(0), (x) => x.correct), edited: mean(by(1), (x) => x.correct) }, editedPartsReread: mean(by(1), (x) => x.editedPartsReread), distinctPartsReread: mean(perTask, (x) => x.distinctPartsReread), poisonReread: mean(perTask, (x) => x.poisonReread), readsNextToPoison: mean(perTask, (x) => x.readsNextToPoison),
    readCalls: reads.length, readsExact: mean(reads, (x) => (x.exact ? 1 : 0)), invalidReads: reads.filter((x) => !x.valid).length, unusableAssignments: assigns.filter((x) => !x.usable).length, assignCalls: assigns.length, perTask };
}
// A study module from a spec.
export const study = (id, title, prereg, spec) => ({ ID: id, TITLE: title, PREREG: prereg, WAVES: wavesOf(spec), SPEC: spec, CONTROLS: { exempt: 'the fixed-schedule control is the sweep regime on the same collections; one agent cannot hold the field, which exceeds the request size ceiling' },
  wave: (k, outputs) => waveOf(spec, k, outputs), ceiling: (k) => ceilingOf(spec, k), score, gate, summarize: (scoredByWave) => summarize(spec, scoredByWave) });
export const range = (from, n) => Array.from({ length: n }, (_, i) => from + i);
