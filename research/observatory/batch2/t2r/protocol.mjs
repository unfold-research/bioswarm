// T2 redundancy (tasks/T2R-REDUNDANCY-PREREG.md): how many times should a task be done? One agent with the whole input
// answers the same instance five times, independently. Every policy is then scored on those attempts in their fixed
// order, so the policies differ only in how many attempts they use and how they choose the answer.
//   t2r-first   wave 0: attempts 1 to 3 of every instance; wave 1: a judge reads attempt 1 and says accept or repeat
//   t2r-more    wave 0: attempts 4 and 5
// The agent is the one of the gates and the map: Haiku with adaptive thinking at high effort. The judge is the same model.
import { instanceSet, soloRequest, thinking, callId, grade, statement, SCHEMA } from '../silo/tasks.mjs';
import { MODEL } from '../../lab007-economy/model.mjs';
export { MAX_REQUEST_BYTES } from '../silo/tasks.mjs';

const SET = instanceSet('map');
export const PREREG = 'tasks/T2R-REDUNDANCY-PREREG.md';
export const TASKS = SET.tasks, SIZES = SET.sizes, INSTANCES = SET.instances, cell = SET.cell;
export const ATTEMPTS = 5, FIRST = [1, 2, 3], MORE = [4, 5], GATE = { maxInvalidShare: 0.1 }, WORKING_SHOWN = 6000, JUDGE_MAX = 4096;
export const instances = () => TASKS.flatMap((t) => SIZES.flatMap((M) => { const c = cell(t, M); return c.instances.map((inst) => ({ c, inst })); }));
export const attemptId = (c, inst, a) => callId(c.task, c.M, inst.i, 1, 0, `t${a}`), judgeId = (c, inst) => callId(c.task, c.M, inst.i, 1, 1, 'judge');

const JUDGE_SYSTEM = 'You review the reply of another agent to a data task. You are not shown the data, only the task, the agent\'s working and its answer. Decide whether the reply can be accepted as it stands or whether the task should be done again by a fresh agent. Doing it again costs as much as the first attempt, and an accepted wrong answer is a failure.';
const JUDGE_SCHEMA = { type: 'object', properties: { reason: { type: 'string', description: 'At most 200 characters' }, repeat: { type: 'boolean' } }, required: ['reason', 'repeat'], additionalProperties: false };
const judgeRequest = (c, reply) => ({ model: MODEL, max_tokens: JUDGE_MAX, thinking: { type: 'adaptive' }, output_config: { format: { type: 'json_schema', schema: JUDGE_SCHEMA }, effort: 'high' }, system: JUDGE_SYSTEM,
  messages: [{ role: 'user', content: `${statement(c)}\n\nThe data was in ${c.M} shards, all held by the agent.\n\nThe agent's working:\n${String(reply?.working ?? '').slice(0, WORKING_SHOWN) || '[none]'}\n\nThe agent's answer: ${Number.isInteger(reply?.answer) ? reply.answer : '[no answer]'}` }] });
void SCHEMA;

export function study(which) {
  const attempts = which === 'first' ? FIRST : MORE, WAVES = which === 'first' ? 2 : 1;
  const attemptRows = () => instances().flatMap(({ c, inst }) => attempts.map((a) => ({ custom_id: attemptId(c, inst, a), params: thinking(soloRequest(c, inst)), meta: { kind: 'attempt', task: c.task, M: c.M, i: inst.i, attempt: a } })));
  const judgeRows = (outputs) => instances().map(({ c, inst }) => ({ custom_id: judgeId(c, inst), params: judgeRequest(c, outputs.get(attemptId(c, inst, 1))?.output), meta: { kind: 'judge', task: c.task, M: c.M, i: inst.i } }));
  const wave = (w, outputs = new Map()) => (w === 0 ? attemptRows() : judgeRows(outputs));
  const ceiling = (w) => { if (w === 0) return attemptRows(); const full = new Map(attemptRows().map((q) => [q.custom_id, { output: { working: 'x'.repeat(WORKING_SHOWN), answer: 123456789 }, stopReason: 'end_turn' }])); return judgeRows(full); };
  const score = (w, rows, outputs) => rows.map((q) => { const item = outputs.get(q.custom_id), m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'attempt') { const inst = cell(m.task, m.M).instances[m.i]; return { customId: q.custom_id, ...m, expected: inst.answer, ...grade(item, inst) }; }
    return { customId: q.custom_id, ...m, truncated, valid: typeof item?.output?.repeat === 'boolean' || truncated, repeat: typeof item?.output?.repeat === 'boolean' ? item.output.repeat : null }; });
  const gate = (w, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
  const summarize = (scoredByWave) => { const a = (scoredByWave[0] || []), j = scoredByWave[1] || [];
    return { attempts, rightByAttempt: Object.fromEntries(attempts.map((n) => [n, a.filter((x) => x.attempt === n && x.right).length])), instances: instances().length, judgeRepeat: j.length ? j.filter((x) => x.repeat === true).length : null }; };
  return { ID: `t2r-${which}`, TITLE: `T2 redundancy: ${which === 'first' ? 'attempts 1 to 3 and the judge of attempt 1' : 'attempts 4 and 5'}`, PREREG, WAVES,
    CONTROLS: { exempt: 'every arm is one agent with the whole input; the policies compared are numbers of attempts of that agent, and the single attempt is one of them' }, wave, ceiling, score, gate, summarize };
}

// Policies, on the answers of an instance in attempt order (null where an attempt gave no answer).
// agree: accept the first answer that two attempts share, looking at attempts 1..n for n = 2..5; no answer if none does.
export function agree(answers) { for (let n = 2; n <= answers.length; n++) { const seen = new Map(); for (const x of answers.slice(0, n)) if (x !== null) { seen.set(x, (seen.get(x) || 0) + 1); if (seen.get(x) === 2) return { answer: x, used: n }; } } return { answer: null, used: answers.length }; }
// plurality of the first n: the most common answer; a tie for first place is no answer.
export function plurality(answers, n) { const count = new Map(); for (const x of answers.slice(0, n)) if (x !== null) count.set(x, (count.get(x) || 0) + 1); const r = [...count].sort((a, b) => b[1] - a[1]); return { answer: r.length && (r.length === 1 || r[0][1] > r[1][1]) ? r[0][0] : null, used: n }; }
export const POLICIES = {
  one: (answers) => ({ answer: answers[0], used: 1 }),
  agree: (answers) => agree(answers),
  three: (answers) => plurality(answers, 3),
  five: (answers) => plurality(answers, 5),
  judge: (answers, repeat) => (repeat === false ? { answer: answers[0], used: 1, judged: true } : { ...agree(answers), judged: true }), // an invalid verdict counts as repeat
};
