// V5 (H-01; Void and Murmur): reasoning or model? V4 found Sonnet 5.5 answering directly at low effort (0.74) below
// Haiku 5.5 with 60 words of working (0.79), and M7 found Haiku with 150 words at 0.91. V5 gives both models the same
// working budgets on the same tasks and reports accuracy against cost.
// Search task with 48, 96 and 144 records, 20 tasks each, new seeds (../littask.mjs). Arms, per model:
//   direct  answer only        w60  at most 60 words of working        w150  at most 150 words
// Haiku: thinking disabled, 1,536 output tokens. Sonnet (../v5-budget-sonnet): adaptive thinking, effort low, 2,048.
import { MODEL } from '../../lab007-economy/model.mjs';
import { makeTasks, SEARCH_SYSTEM, ID_SCHEMA, workSearchSystem, WORK_ID_SCHEMA } from '../littask.mjs';

export const ID = 'v5-budget';
export const TITLE = 'V5 working budget against model on the search task (H-01)';
export const PREREG = 'tasks/V5-BUDGET-PREREG.md';
export const WAVES = 1;
export const LEVELS = [48, 96, 144];
export const PER_LEVEL = 20, OUT_MAX = 1536;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 22001 + i);
export const ARMS = ['direct', 'w60', 'w150'];
export const GATE = { maxInvalidShare: 0.1 };
export const tasks = () => makeTasks(SEEDS, LEVELS);
export function wave() {
  return tasks().flatMap((t) => ARMS.map((arm) => ({ custom_id: `v5-${t.seed}-${arm}`,
    params: { model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: arm === 'direct' ? ID_SCHEMA : WORK_ID_SCHEMA } }, system: arm === 'direct' ? SEARCH_SYSTEM : workSearchSystem(arm === 'w60' ? 60 : 150), messages: [{ role: 'user', content: JSON.stringify({ task_id: t.id, records: t.records }) }] },
    meta: { arm, seed: t.seed, level: t.level, answer: t.answer } })));
}
export const ceiling = wave;
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null; return { customId: q.custom_id, arm: m.arm, seed: m.seed, level: m.level, valid, truncated: item?.stopReason === 'max_tokens', correct: a === m.answer }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarize([scored]) {
  const acc = (rows) => Object.fromEntries(ARMS.map((a) => { const r = rows.filter((x) => x.arm === a); return [a, r.filter((x) => x.correct).length / r.length]; }));
  return { overall: acc(scored), byLevel: Object.fromEntries(LEVELS.map((L) => [L, acc(scored.filter((x) => x.level === L))])), truncated: scored.filter((x) => x.truncated).length, note: 'Preregistered tests: node observatory/batch2/v5-budget/analyze.mjs' };
}
