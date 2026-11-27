// T2 stage A, the calibration gate (tasks/T2A-GATE-PREREG.md, design in tasks/T2-TRIGGER-DESIGN.md).
// One agent with the whole input, on every task, size and instance of the Silo-Bench export. The question is only whether
// one agent degrades as the input grows on this model: if it does not, there is nothing for a trigger to decide and T2
// is not run on this benchmark. One wave, one request per instance.
import { TASKS, MANIFEST, INSTANCES, cell, soloRequest, callId, grade } from '../silo/tasks.mjs';
export { MAX_REQUEST_BYTES } from '../silo/tasks.mjs';

export const ID = 't2-gate';
export const TITLE = 'T2 stage A: does one agent with the whole input degrade as the input grows?';
export const PREREG = 'tasks/T2A-GATE-PREREG.md';
export const WAVES = 1;
export const SIZES = MANIFEST.sizes;
export const GATE = { maxInvalidShare: 0.1, ceiling: 0.9, floor: 0.6, tasksAtFloor: 2 };
export const CONTROLS = { exempt: 'this study is the single-agent arm on its own; it compares nothing and only decides whether the comparison of T2 can be run' };

export const cells = () => TASKS.flatMap((task) => SIZES.map((M) => cell(task, M)));
export const wave = () => cells().flatMap((c) => c.instances.map((inst) => ({ custom_id: callId(c.task, c.M, inst.i, 1, 0, 0), params: soloRequest(c, inst), meta: { task: c.task, M: c.M, i: inst.i } })));
export const ceiling = () => [];
export function score(k, rows, outputs) {
  return rows.map((q) => { const c = cell(q.meta.task, q.meta.M), inst = c.instances[q.meta.i]; return { customId: q.custom_id, ...q.meta, expected: inst.answer, ...grade(outputs.get(q.custom_id), inst) }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);

// The decision rule of the preregistration, as code. small: the largest size at which the agent is at the ceiling over all
// tasks. large: the smallest size above it at which it is at the floor over all tasks and on at least two tasks alone.
export function decide(table) {
  const pooled = Object.fromEntries(SIZES.map((M) => [M, TASKS.reduce((n, t) => n + table[t][M].right, 0) / (TASKS.length * INSTANCES)]));
  const small = [...SIZES].reverse().find((M) => pooled[M] >= GATE.ceiling) ?? null;
  const large = small === null ? null : SIZES.find((M) => M > small && pooled[M] <= GATE.floor && TASKS.filter((t) => table[t][M].right / INSTANCES <= GATE.floor).length >= GATE.tasksAtFloor) ?? null;
  const middle = small !== null && large !== null && large / small >= 4 ? 2 ** Math.round(Math.log2(Math.sqrt(small * large))) : null;
  const verdict = small === null ? 'not-at-ceiling: the instrument is revised, T2 does not proceed' : large === null ? 'no-degradation: T2 is not run on this benchmark with this model' : 'proceed';
  return { pooled, small, middle, large, verdict };
}
export function summarize(scoredByWave) {
  const rows = scoredByWave[0] || [], table = Object.fromEntries(TASKS.map((t) => [t, Object.fromEntries(SIZES.map((M) => { const r = rows.filter((x) => x.task === t && x.M === M); return [M, { n: r.length, right: r.filter((x) => x.right).length, truncated: r.filter((x) => x.truncated).length, invalid: r.filter((x) => !x.valid).length }]; }))]));
  return { table, decision: rows.length === TASKS.length * SIZES.length * INSTANCES ? decide(table) : null };
}
