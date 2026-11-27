// M7 (H-M03, H-02): selection among five. V3 found that at least one of five reasoning samples is right on 0.92 of tasks
// while the best strategy reached 0.82, and that one agent with more working was level with the collectives but may have
// been capped by the 512-token output limit. M7 verifies every candidate, and gives the deep agent a higher limit.
// Search task with 48, 96 and 144 records, new seeds (../littask.mjs).
//   wave 0  five searchers with at most 20 words of working (s0..s4); three searchers with at most 150 words and a
//           1,536-token output limit (d0..d2)
//   wave 1  a verifier with at most 40 words of working on every distinct record id among s0..s4
// Strategies: single = s0; vote5; verify3 = s0 if accepted, otherwise s1; select5 = the first accepted answer in sample
// order, otherwise the plurality; deep = d0; deepvote3 = plurality of d0..d2.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import { makeTasks, workSearchSystem, WORK_ID_SCHEMA, verifyWorkSystem, ACCEPT_WORK_SCHEMA, plurality, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'm7-select';
export const TITLE = 'M7 selection among five candidates by a verifier, against a deeper single agent (H-M03, H-02)';
export const PREREG = 'tasks/M7-SELECT-PREREG.md';
export const WAVES = 2;
export const LEVELS = [48, 96, 144];
export const PER_LEVEL = 30, DEEP_MAX_TOKENS = 1536;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 20001 + i);
export const GATE = { maxInvalidShare: 0.1 };
export const tasks = () => makeTasks(SEEDS, LEVELS);
const req = (system, schema, content, max = MAX_TOKENS) => ({ model: MODEL, max_tokens: max, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const answerOf = (outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o.id === 'string' ? o.id.trim() : null; };
const verifierRows = (t, proposals) => proposals.map((p) => ({ custom_id: `m7-${t.seed}-v-${p}`, params: req(verifyWorkSystem(40), ACCEPT_WORK_SCHEMA, { task_id: t.id, records: t.records, proposed_answer: p }), meta: { kind: 'verify', seed: t.seed, level: t.level, proposed: p, truthCorrect: p === t.answer } }));
export function wave(k, outputs) {
  if (k === 0) return tasks().flatMap((t) => { const meta = (variant, sample) => ({ kind: 'search', variant, sample, seed: t.seed, level: t.level, answer: t.answer, ids: t.records.map((r) => r.id) }), c = { task_id: t.id, records: t.records };
    return [...[0, 1, 2, 3, 4].map((s) => ({ custom_id: `m7-${t.seed}-s${s}`, params: req(workSearchSystem(20), WORK_ID_SCHEMA, c), meta: meta('w20', s) })), ...[0, 1, 2].map((s) => ({ custom_id: `m7-${t.seed}-d${s}`, params: req(workSearchSystem(150), WORK_ID_SCHEMA, c, DEEP_MAX_TOKENS), meta: meta('deep', s) }))]; });
  return tasks().flatMap((t) => { const known = new Set(t.records.map((r) => r.id)); return verifierRows(t, [...new Set([0, 1, 2, 3, 4].map((s) => answerOf(outputs, `m7-${t.seed}-s${s}`)).filter((a) => a && known.has(a)))]); });
}
export const ceiling = (k) => tasks().flatMap((t) => verifierRows(t, t.records.slice(0, 5).map((r) => r.id)));
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', seed: m.seed, level: m.level, proposed: m.proposed, truthCorrect: m.truthCorrect, valid, truncated, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null; return { customId: q.custom_id, kind: 'search', variant: m.variant, sample: m.sample, seed: m.seed, level: m.level, valid, truncated, answer: a, known: valid && m.ids.includes(a), correct: a === m.answer }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
const KEYS = ['single', 'vote5', 'verify3', 'select5', 'deep', 'deepvote3', 'any5'], mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated', P4: 'not-evaluated' } };
  const verdict = new Map(s1.map((x) => [`${x.seed}/${x.proposed}`, x.accept]));
  const rows = SEEDS.map((seed) => { const of = (v) => s0.filter((x) => x.seed === seed && x.variant === v).sort((a, b) => a.sample - b.sample), r = of('w20'), d = of('deep'), a = r.map((x) => (x.valid ? x.answer : null)), da = d.map((x) => (x.valid ? x.answer : null));
    const ok = (x) => ([...r, ...d].some((y) => y.correct && y.answer === x) ? 1 : 0), acc = (i) => !!a[i] && r[i].known && verdict.get(`${seed}/${a[i]}`) === true, first = [0, 1, 2, 3, 4].find(acc);
    return { seed, level: r[0].level, single: ok(a[0]), vote5: ok(plurality(a)), verify3: ok(acc(0) ? a[0] : a[1]), select5: ok(first !== undefined ? a[first] : plurality(a)), deep: ok(da[0]), deepvote3: ok(plurality(da)), any5: a.some((x) => ok(x)) ? 1 : 0, verifierCalls: new Set(a.filter((x, i) => x && r[i].known)).size, noneAccepted: first === undefined ? 1 : 0 }; });
  const acc = (rs) => Object.fromEntries(KEYS.map((s) => [s, mean(rs, (x) => x[s])])), d = (a, b, seed) => bootDiff(rows, a, b, seed);
  const d1 = d('select5', 'vote5', 20261161), d2 = d('select5', 'verify3', 20261162), d3 = d('deep', 'select5', 20261163), d4 = d('deepvote3', 'deep', 20261164), right = s1.filter((x) => x.truthCorrect), wrong = s1.filter((x) => !x.truthCorrect);
  return { byLevel: Object.fromEntries(LEVELS.map((L) => [L, acc(rows.filter((x) => x.level === L))])), overall: acc(rows), meanVerifierCalls: mean(rows, (x) => x.verifierCalls), noneAccepted: rows.filter((x) => x.noneAccepted).length, select5MinusVote5: d1, select5MinusVerify3: d2, deepMinusSelect5: d3, deepvote3MinusDeep: d4,
    verifier: { correctAnswers: right.length, specificity: right.length ? right.filter((x) => x.accept).length / right.length : null, wrongAnswers: wrong.length, sensitivity: wrong.length ? wrong.filter((x) => !x.accept).length / wrong.length : null }, truncated: { w20: s0.filter((x) => x.variant === 'w20' && x.truncated).length, deep: s0.filter((x) => x.variant === 'deep' && x.truncated).length, verifier: s1.filter((x) => x.truncated).length },
    tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3), P4: verdictOf(d4) } };
}
