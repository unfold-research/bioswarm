// REP1: replication at larger samples of the results the P1 paper would lean on (results/CONSOLIDATED-2026-11-11.md, block A).
// 300 tasks per task family instead of 60 to 90, new seeds, Claude Haiku 5.5, thinking disabled.
// Two task families: 'search' (find one record; ../littask.mjs) and 'count' (tally by author; ../grouptask.mjs), each
// with 24, 48 and 96 records, 100 tasks per size.
//   wave 0, per task: d0, d1, d2 answer directly; s0, s1, s2 with at most 20 words of working; w60; w150
//   wave 1, per task: a verifier with at most 40 words of working on the s0 answer
// Strategies: direct = d0; directVote3 = plurality of d0..d2; single = s0; vote3 = plurality of s0..s2;
// verify3 = s0 if accepted, otherwise s1; w60; w150.
import { MODEL } from '../../lab007-economy/model.mjs';
import * as lit from '../littask.mjs';
import * as grp from '../grouptask.mjs';

export const TITLE = 'REP1 replication at 300 tasks: working space, votes and verification on two task families';
export const PREREG = 'tasks/REP1-PREREG.md';
export const WAVES = 2;
export const LEVELS = [24, 48, 96], PER_LEVEL = 100, OUT_MAX = 1536;
export const GATE = { maxInvalidShare: 0.1 };
export const CONTROLS = { exempt: 'the single-agent arms (direct, and one agent with working space) are in the study; there is no field and so no schedule to compare with' };
const FAMILY = {
  search: { tag: 's', from: 40001, tasks: (seeds) => lit.makeTasks(seeds, LEVELS), key: 'id', valid: (t, a) => t.records.some((r) => r.id === a), direct: [lit.SEARCH_SYSTEM, lit.ID_SCHEMA], work: (w) => [lit.workSearchSystem(w), lit.WORK_ID_SCHEMA], verify: [lit.verifyWorkSystem(40), lit.ACCEPT_WORK_SCHEMA], proposal: 'proposed_answer' },
  count: { tag: 'c', from: 41001, tasks: (seeds) => grp.makeTasks(seeds, LEVELS), key: 'author', valid: (t, a) => t.authors.includes(a), direct: [grp.DIRECT_SYSTEM, grp.AUTHOR_SCHEMA], work: (w) => [grp.workSystem(w), grp.WORK_AUTHOR_SCHEMA], verify: [grp.verifySystem(40), lit.ACCEPT_WORK_SCHEMA], proposal: 'proposed_author' },
};
export const AGENTS = ['d0', 'd1', 'd2', 's0', 's1', 's2', 'w60', 'w150'];
export const seedsOf = (family) => Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => FAMILY[family].from + i);
export const tasksOf = (family) => FAMILY[family].tasks(seedsOf(family));
const req = ([system, schema], content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const spec = (F, agent) => (agent[0] === 'd' ? F.direct : F.work(agent === 'w60' ? 60 : agent === 'w150' ? 150 : 20));
const answerOf = (F, outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o[F.key] === 'string' ? o[F.key].trim() : null; };
const verifierRow = (family, F, t, a) => ({ custom_id: `rp${F.tag}-${t.seed}-v`, params: req(F.verify, { task_id: t.id, records: t.records, [F.proposal]: a }), meta: { kind: 'verify', family, agent: 'v', seed: t.seed, level: t.level, truthCorrect: a === t.answer } });
export function waveOf(family, k, outputs = new Map()) {
  const F = FAMILY[family], ts = tasksOf(family);
  if (k === 0) return ts.flatMap((t) => AGENTS.map((agent) => ({ custom_id: `rp${F.tag}-${t.seed}-${agent}`, params: req(spec(F, agent), { task_id: t.id, records: t.records }), meta: { kind: 'answer', family, agent, seed: t.seed, level: t.level, answer: t.answer } })));
  return ts.flatMap((t) => { const a = answerOf(F, outputs, `rp${F.tag}-${t.seed}-s0`); return a && F.valid(t, a) ? [verifierRow(family, F, t, a)] : []; });
}
export const ceilingOf = (family, k) => tasksOf(family).map((t) => verifierRow(family, FAMILY[family], t, t.planted));
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, F = FAMILY[m.family], truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', agent: 'v', seed: m.seed, level: m.level, truthCorrect: m.truthCorrect, valid, truncated, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o[F.key] === 'string', a = valid ? o[F.key].trim() : null; return { customId: q.custom_id, kind: 'answer', agent: m.agent, seed: m.seed, level: m.level, valid, truncated, answer: a, correct: a === m.answer }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export const KEYS = ['direct', 'directVote3', 'single', 'vote3', 'verify3', 'w60', 'w150'];
const mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export function summarizeFamily(family, [s0, s1]) {
  if (!s1) return { family, tests: {} };
  const by = new Map(); for (const x of s0) { if (!by.has(x.seed)) by.set(x.seed, {}); by.get(x.seed)[x.agent] = x; } const acc = new Map(s1.map((x) => [x.seed, x.accept]));
  const rows = seedsOf(family).map((seed) => { const g = by.get(seed), ok = (x) => (x && x.correct ? 1 : 0), vote = (agents) => { const v = lit.plurality(agents.map((a) => (g[a].valid ? g[a].answer : null))); return agents.some((a) => g[a].correct && g[a].answer === v) ? 1 : 0; };
    return { seed, level: g.d0.level, direct: ok(g.d0), directVote3: vote(['d0', 'd1', 'd2']), single: ok(g.s0), vote3: vote(['s0', 's1', 's2']), verify3: acc.get(seed) === true ? ok(g.s0) : ok(g.s1), w60: ok(g.w60), w150: ok(g.w150), directDiffer: new Set(['d0', 'd1', 'd2'].map((a) => g[a].answer)).size > 1 ? 1 : 0, workDiffer: new Set(['s0', 's1', 's2'].map((a) => g[a].answer)).size > 1 ? 1 : 0 }; });
  const accOf = (r) => Object.fromEntries(KEYS.map((k) => [k, mean(r, (x) => x[k])])), d = (a, b, seed) => lit.bootDiff(rows, a, b, seed), right = s1.filter((x) => x.truthCorrect), wrong = s1.filter((x) => !x.truthCorrect);
  const diffs = { singleMinusDirectVote3: d('single', 'directVote3', 20261301), directVote3MinusDirect: d('directVote3', 'direct', 20261302), vote3MinusSingle: d('vote3', 'single', 20261303), verify3MinusVote3: d('verify3', 'vote3', 20261304), w150MinusVerify3: d('w150', 'verify3', 20261305), w60MinusSingle: d('w60', 'single', 20261306) };
  return { family, tasks: rows.length, overall: accOf(rows), byLevel: Object.fromEntries(LEVELS.map((L) => [L, accOf(rows.filter((x) => x.level === L))])), samplesDiffer: { direct: mean(rows, (x) => x.directDiffer), working: mean(rows, (x) => x.workDiffer) }, diffs,
    verifier: { correctAnswers: right.length, accepted: right.filter((x) => x.accept).length, wrongAnswers: wrong.length, rejected: wrong.filter((x) => !x.accept).length }, truncated: [...s0, ...s1].filter((x) => x.truncated).length,
    tests: { R1: lit.verdictOf(diffs.singleMinusDirectVote3), R2: diffs.directVote3MinusDirect.ci95[0] > 0 ? 'refuted' : 'supported', R3: lit.verdictOf(diffs.verify3MinusVote3), R4: lit.verdictOf(diffs.vote3MinusSingle), R5: lit.verdictOf(diffs.w150MinusVerify3) } };
}
