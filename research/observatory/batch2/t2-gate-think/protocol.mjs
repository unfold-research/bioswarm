// T2 stage A, third gate (tasks/T2A3-GATE-THINK-PREREG.md). The second gate (../t2-gate-small) found one Haiku agent
// without thinking at 0.79 on one shard and falling to 0.27 at sixteen. Its registered consequence was to revise the
// agent and not the sizes. This gate runs the same instances with adaptive thinking at high effort, and decides per task.
import { instanceSet, soloRequest, thinking, callId, grade } from '../silo/tasks.mjs';
export { MAX_REQUEST_BYTES } from '../silo/tasks.mjs';

const SET = instanceSet('small');
export const ID = 't2-gate-think';
export const TITLE = 'T2 stage A, third gate: one agent with thinking and the whole input, 1 to 16 shards';
export const PREREG = 'tasks/T2A3-GATE-THINK-PREREG.md';
export const WAVES = 1;
export const TASKS = SET.tasks, SIZES = SET.sizes, INSTANCES = SET.instances, cell = SET.cell;
export const GATE = { maxInvalidShare: 0.1, ceiling: 11, floor: 7, fallingTasks: 2 }; // right answers out of 12
export const CONTROLS = { exempt: 'this study is the single-agent arm on its own; it compares nothing and only decides whether the comparison of T2 can be run' };

export const wave = () => TASKS.flatMap((task) => SIZES.map((M) => cell(task, M))).flatMap((c) => c.instances.map((inst) => ({ custom_id: callId(c.task, c.M, inst.i, 1, 0, 0), params: thinking(soloRequest(c, inst)), meta: { task: c.task, M: c.M, i: inst.i } })));
export const ceiling = () => [];
export const score = (k, rows, outputs) => rows.map((q) => { const inst = cell(q.meta.task, q.meta.M).instances[q.meta.i]; return { customId: q.custom_id, ...q.meta, expected: inst.answer, ...grade(outputs.get(q.custom_id), inst) }; });
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);

// The registered rule, per task. small: the largest size with at least 11 of 12 right. large: the smallest size above it
// with at most 7 of 12. A task is
//   quiet        at the ceiling at every size: one agent is enough, a trigger should not fire
//   falls        small and large both exist: the size at which one agent stops being enough is inside the range
//   holds        small exists, no large: it weakens without reaching the floor by 16 shards
//   never        not at the ceiling at any size: the task is beyond one call whatever the size
export function classify(rightBySize) {
  const small = [...SIZES].reverse().find((M) => rightBySize[M] >= GATE.ceiling) ?? null;
  const large = small === null ? null : SIZES.find((M) => M > small && rightBySize[M] <= GATE.floor) ?? null;
  const kind = small === null ? 'never' : SIZES.every((M) => rightBySize[M] >= GATE.ceiling) ? 'quiet' : large === null ? 'holds' : 'falls';
  return { kind, small, large };
}
export function decide(table) {
  const tasks = Object.fromEntries(TASKS.map((t) => [t, classify(Object.fromEntries(SIZES.map((M) => [M, table[t][M].right])))])), of = (k) => TASKS.filter((t) => tasks[t].kind === k);
  const verdict = of('falls').length >= GATE.fallingTasks ? 'proceed' : of('falls').length + of('holds').length >= GATE.fallingTasks || of('quiet').length === TASKS.length ? 'extend-sizes' : 'revise';
  return { tasks, falls: of('falls'), quiet: of('quiet'), holds: of('holds'), never: of('never'), verdict };
}
export function summarize(scoredByWave) {
  const rows = scoredByWave[0] || [], table = Object.fromEntries(TASKS.map((t) => [t, Object.fromEntries(SIZES.map((M) => { const r = rows.filter((x) => x.task === t && x.M === M); return [M, { n: r.length, right: r.filter((x) => x.right).length, truncated: r.filter((x) => x.truncated).length, invalid: r.filter((x) => !x.valid).length }]; }))]));
  return { table, decision: rows.length === TASKS.length * SIZES.length * INSTANCES ? decide(table) : null };
}
