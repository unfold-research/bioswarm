// T2 stage B, the map (tasks/T2B-MAP-PREREG.md): how often is the answer right, and at what cost, when a Silo-Bench
// instance of M shards is given to k agents? The number of agents is fixed in each study; nothing here decides it.
// The agent is the one the third gate settled: Haiku with adaptive thinking at high effort, in every call of every arm.
//   solo      k = 1: one agent holds every shard and answers                        all four tasks
//   reduce    k agents report a partial result, one merge call answers               I-01, I-05, I-06 (level I)
//   board     k agents post notes for two rounds and answer in the third; the        III-22 (level III)
//             answer most agents give is the collective's
// An agent of a collective holds at least two shards, so k = 2 runs at 4, 8 and 16 shards, k = 4 at 8 and 16, k = 8 at 16.
import { instanceSet, soloRequest, thinking, callId, grade } from '../silo/tasks.mjs';
import { wave as regimeWave, answerOf, REGIME_OF, WAVES_OF } from '../silo/regimes.mjs';
export { MAX_REQUEST_BYTES } from '../silo/tasks.mjs';

const SET = instanceSet('map');
export const PREREG = 'tasks/T2B-MAP-PREREG.md';
export const TASKS = SET.tasks, SIZES = SET.sizes, INSTANCES = SET.instances, cell = SET.cell;
export const KS = [1, 2, 4, 8], MIN_SHARDS = 2, GATE = { maxInvalidShare: 0.1 };
export const STUDIES = [['solo', 1], ['reduce', 2], ['reduce', 4], ['reduce', 8], ['board', 2], ['board', 4], ['board', 8]];
export const idOf = (regime, k) => `t2-map-${regime}${k > 1 ? `-k${k}` : ''}`;
export const tasksOf = (regime) => (regime === 'solo' ? TASKS : TASKS.filter((t) => REGIME_OF(t) === regime));
export const sizesOf = (k) => SIZES.filter((M) => k === 1 || M / k >= MIN_SHARDS);

export function study(regime, k) {
  const tasks = tasksOf(regime), sizes = sizesOf(k), WAVES = regime === 'solo' ? 1 : WAVES_OF[regime];
  const runs = () => tasks.flatMap((t) => sizes.flatMap((M) => { const c = cell(t, M); return c.instances.map((inst) => ({ c, inst })); }));
  const rows = (w, outputs) => runs().flatMap(({ c, inst }) => (regime === 'solo'
    ? [{ custom_id: callId(c.task, c.M, inst.i, 1, 0, 0), params: soloRequest(c, inst), meta: { task: c.task, M: c.M, i: inst.i, k: 1, wave: 0, kind: 'answer', agent: 0 } }]
    : regimeWave(c, inst, k, w, outputs)).map((r) => ({ ...r, params: thinking(r.params) })));
  const wave = (w, outputs = new Map()) => rows(w, outputs);
  // The largest requests a later wave can make: every earlier reply at its length limit.
  const ceiling = (w) => { const full = new Map(); for (let j = 0; j < w; j++) for (const q of rows(j, full)) full.set(q.custom_id, { output: { working: '', partial: 'x'.repeat(400), note: 'x'.repeat(1200) }, stopReason: 'end_turn' }); return rows(w, full); };
  function score(w, asked, outputs) {
    const calls = asked.map((q) => { const item = outputs.get(q.custom_id), m = q.meta, truncated = item?.stopReason === 'max_tokens';
      if (m.kind === 'answer') { const inst = cell(m.task, m.M).instances[m.i]; return { customId: q.custom_id, ...m, expected: inst.answer, ...grade(item, inst) }; }
      return { customId: q.custom_id, ...m, truncated, valid: typeof item?.output?.[m.kind] === 'string' || truncated }; });
    if (w < WAVES - 1) return calls;
    const done = runs().map(({ c, inst }) => { const base = { kind: 'run', task: c.task, M: c.M, i: inst.i, k, expected: inst.answer };
      if (regime === 'solo') { const g = grade(outputs.get(callId(c.task, c.M, inst.i, 1, 0, 0)), inst); return { ...base, answer: g.answer, right: g.right }; }
      return { ...base, ...answerOf(c, inst, k, outputs) }; });
    return [...calls, ...done];
  }
  const gate = (w, scored) => { const calls = scored.filter((x) => x.kind !== 'run'); return !calls.length || calls.filter((x) => !x.valid).length / calls.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null; };
  const summarize = (scoredByWave) => { const done = (scoredByWave[WAVES - 1] || []).filter((x) => x.kind === 'run');
    return { regime, k, runs: done.length, table: Object.fromEntries(tasks.map((t) => [t, Object.fromEntries(sizes.map((M) => { const r = done.filter((x) => x.task === t && x.M === M); return [M, { n: r.length, right: r.filter((x) => x.right).length }]; }))])) }; };
  return { ID: idOf(regime, k), TITLE: `T2 stage B, the map: ${regime}${k > 1 ? `, ${k} agents` : ', one agent'}`, PREREG, WAVES, regime, k, tasks, sizes, runs,
    CONTROLS: { exempt: 'the single-agent arm with the whole input is t2-map-solo on the same instances; the regime of the collective is itself a fixed script, so there is no separate schedule control' },
    wave, ceiling, score, gate, summarize };
}
