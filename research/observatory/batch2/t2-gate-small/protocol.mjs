// T2 stage A, second gate (tasks/T2A2-GATE-SMALL-PREREG.md). The first gate (../t2-gate) started at 16 shards and found one
// agent at the floor everywhere. This one asks the same question from 1 to 16 shards: where is one agent with the whole
// input at ceiling, and where does it fall? Same agent, same request, same rule; only the sizes and the tasks the leak
// probe admits at those sizes change. One wave, one request per instance.
import { instanceSet, soloRequest, callId, grade } from '../silo/tasks.mjs';
export { MAX_REQUEST_BYTES } from '../silo/tasks.mjs';

const SET = instanceSet('small');
export const ID = 't2-gate-small';
export const TITLE = 'T2 stage A, second gate: one agent with the whole input from 1 to 16 shards';
export const PREREG = 'tasks/T2A2-GATE-SMALL-PREREG.md';
export const WAVES = 1;
export const TASKS = SET.tasks, SIZES = SET.sizes, INSTANCES = SET.instances, cell = SET.cell;
export const GATE = { maxInvalidShare: 0.1, ceiling: 0.9, floor: 0.6, tasksAtFloor: 2 };
export const CONTROLS = { exempt: 'this study is the single-agent arm on its own; it compares nothing and only decides whether the comparison of T2 can be run' };

export const wave = () => TASKS.flatMap((task) => SIZES.map((M) => cell(task, M))).flatMap((c) => c.instances.map((inst) => ({ custom_id: callId(c.task, c.M, inst.i, 1, 0, 0), params: soloRequest(c, inst), meta: { task: c.task, M: c.M, i: inst.i } })));
export const ceiling = () => [];
export const score = (k, rows, outputs) => rows.map((q) => { const inst = cell(q.meta.task, q.meta.M).instances[q.meta.i]; return { customId: q.custom_id, ...q.meta, expected: inst.answer, ...grade(outputs.get(q.custom_id), inst) }; });
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);

// The registered rule. small: the largest size at the ceiling over all tasks. large: the smallest size above it at the
// floor over all tasks and on at least two tasks alone. middle: a size of the study strictly between them, the one nearest
// their geometric mean, the smaller on a tie.
export function decide(table) {
  const pooled = Object.fromEntries(SIZES.map((M) => [M, TASKS.reduce((n, t) => n + table[t][M].right, 0) / (TASKS.length * INSTANCES)]));
  const small = [...SIZES].reverse().find((M) => pooled[M] >= GATE.ceiling) ?? null;
  const large = small === null ? null : SIZES.find((M) => M > small && pooled[M] <= GATE.floor && TASKS.filter((t) => table[t][M].right / INSTANCES <= GATE.floor).length >= GATE.tasksAtFloor) ?? null;
  const between = small !== null && large !== null ? SIZES.filter((M) => M > small && M < large) : [], g = Math.sqrt(small * large);
  const middle = between.length ? between.reduce((b, M) => (Math.abs(Math.log(M / g)) < Math.abs(Math.log(b / g)) - 1e-9 ? M : b)) : null;
  const verdict = small === null ? 'not-at-ceiling: one agent of this kind is not at ceiling even on one shard; the single-agent arm is revised' : large === null ? 'no-degradation-in-range' : 'proceed';
  return { pooled, small, middle, large, verdict };
}
export function summarize(scoredByWave) {
  const rows = scoredByWave[0] || [], table = Object.fromEntries(TASKS.map((t) => [t, Object.fromEntries(SIZES.map((M) => { const r = rows.filter((x) => x.task === t && x.M === M); return [M, { n: r.length, right: r.filter((x) => x.right).length, truncated: r.filter((x) => x.truncated).length, invalid: r.filter((x) => !x.valid).length }]; }))]));
  return { table, decision: rows.length === TASKS.length * SIZES.length * INSTANCES ? decide(table) : null };
}
