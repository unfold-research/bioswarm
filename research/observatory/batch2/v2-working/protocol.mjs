// V2 (H-01; Void and Murmur): how much working space does an agent need before it beats a vote of agents without any, on
// a task that is not arithmetic? V1b found one sample with working right on 96 of 96 arithmetic tasks; M4 found the
// literature-search task hard for an answer-only agent (0.46) and votes useless. V2 puts the two together.
// Task of M4 with new seeds (../littask.mjs). Arms:
//   a      answer only, 3 samples (single = the first; vote3 = plurality)
//   w20    one sample with a `working` field of at most 20 words before the answer
//   w60    at most 60 words
//   w150   at most 150 words
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import { LEVELS, makeTasks, COND, SEARCH_SYSTEM, ID_SCHEMA, plurality, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'v2-working';
export const TITLE = 'V2 working-space dose against a vote on a search task (H-01)';
export const PREREG = 'tasks/V2-WORKING-PREREG.md';
export const WAVES = 1;
export const PER_LEVEL = 30;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 17001 + i);
export const DOSES = [20, 60, 150];
export const GATE = { maxInvalidShare: 0.1 }, BAND = [0.2, 0.9];
export const tasks = () => makeTasks(SEEDS);
const workSystem = (w) => `You are a research assistant in a synthetic literature search exercise. Each record describes one study: id, year, review status, outcome and sample size n. Find the study with the largest n among those that are ${COND}. Write your working in \`working\`, at most ${w} words, then the id of the study in \`id\`. Return only JSON matching the schema.`;
const WORK_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, id: { type: 'string' } }, required: ['working', 'id'], additionalProperties: false };
const req = (system, schema, t) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify({ task_id: t.id, records: t.records }) }] });
export function wave() {
  return tasks().flatMap((t) => { const meta = (arm, sample) => ({ arm, sample, seed: t.seed, level: t.level, answer: t.answer, ids: t.records.map((r) => r.id) });
    return [...[0, 1, 2].map((s) => ({ custom_id: `v2-${t.seed}-a-s${s}`, params: req(SEARCH_SYSTEM, ID_SCHEMA, t), meta: meta('a', s) })), ...DOSES.map((w) => ({ custom_id: `v2-${t.seed}-w${w}-s0`, params: req(workSystem(w), WORK_SCHEMA, t), meta: meta(`w${w}`, 0) }))]; });
}
export const ceiling = () => wave();
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null;
    return { customId: q.custom_id, arm: m.arm, sample: m.sample, seed: m.seed, level: m.level, valid, truncated: item?.stopReason === 'max_tokens', answer: a, correct: a === m.answer, workingWords: valid && typeof o.working === 'string' ? o.working.trim().split(/\s+/).filter(Boolean).length : null }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
const ARMS = ['single', 'vote3', 'w20', 'w60', 'w150'], mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export function summarize([scored]) {
  const rows = SEEDS.map((seed) => { const r = scored.filter((x) => x.seed === seed), a = r.filter((x) => x.arm === 'a').sort((x, y) => x.sample - y.sample), v = plurality(a.map((x) => (x.valid ? x.answer : null))), ok = (arm) => (r.find((x) => x.arm === arm).correct ? 1 : 0);
    return { seed, level: r[0].level, single: a[0].correct ? 1 : 0, vote3: a.some((x) => x.correct && x.answer === v) ? 1 : 0, w20: ok('w20'), w60: ok('w60'), w150: ok('w150') }; });
  const acc = (rs) => Object.fromEntries(ARMS.map((s) => [s, mean(rs, (x) => x[s])])), byLevel = Object.fromEntries(LEVELS.map((L) => [L, acc(rows.filter((x) => x.level === L))]));
  const levels = LEVELS.filter((L) => byLevel[L].single >= BAND[0] && byLevel[L].single <= BAND[1]), pool = rows.filter((x) => levels.includes(x.level)), p = pool.length ? acc(pool) : null;
  const d60 = bootDiff(pool, 'w60', 'vote3', 20261131), d20 = bootDiff(pool, 'w20', 'vote3', 20261132), d150 = bootDiff(pool, 'w150', 'vote3', 20261133);
  const words = Object.fromEntries(DOSES.map((w) => [`w${w}`, mean(scored.filter((x) => x.arm === `w${w}` && x.workingWords !== null), (x) => x.workingWords)]));
  return { byLevel, analysisLevels: levels, pooled: p ? { tasks: pool.length, ...p } : null, w20MinusVote3: d20, w60MinusVote3: d60, w150MinusVote3: d150, meanWorkingWords: words, truncated: scored.filter((x) => x.truncated).length,
    tests: { P1: verdictOf(d60), P2: !p ? 'inconclusive' : p.w20 >= p.single - 0.03 && p.w60 >= p.w20 - 0.03 && p.w150 >= p.w60 - 0.03 && p.w150 - p.single >= 0.1 ? 'supported' : 'not supported', P3: verdictOf(d20) } };
}
