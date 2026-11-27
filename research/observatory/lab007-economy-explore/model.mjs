// Exploratory-only adapter. Reuses the frozen LAB-007 evidence generator and
// response contract, adding a star contact graph without editing frozen files.
import { N, MODEL, MAX_TOKENS, RESPONSE_SCHEMA, BASE, makeRun, localRecord, applyRound, scoreRun } from '../lab007-economy/model.mjs';
export { N, MODEL, MAX_TOKENS, makeRun, applyRound, scoreRun };
export const TOPOLOGIES = ['ring', 'star'];
export const CELLS = ['S0', 'S1', 'S2', 'S3'];
export const ARMS = ['NOSHARE', 'FIXED'];
export const SEEDS_PER_CELL = 4;

export function makeExploreRun(topology, cell, arm, seed) {
  const run = makeRun(seed, cell, arm, 0, 1, 2);
  run.topology = topology;
  run.id = `x${topology}-${run.id}`;
  return run;
}

export function neighbors(topology, node) {
  if (topology === 'ring') return [(node + N - 1) % N, (node + 1) % N];
  if (topology === 'star') return node === 0 ? [1, 2, 3, 4, 5] : [0];
  throw new Error(`Unknown exploratory topology: ${topology}`);
}

export function buildExploreRequest(run, node, round) {
  if (!ARMS.includes(run.arm) || !TOPOLOGIES.includes(run.topology) || !CELLS.includes(run.cell)) throw new Error('Unapproved exploratory condition');
  const local = localRecord(run, node), records = [local];
  if (node === 0 && run.bulletin) records.push(run.bulletin);
  if (round > 0 && run.arm === 'FIXED') {
    const prior = run.history[round - 1];
    let selected = 0;
    for (const peer of neighbors(run.topology, node)) {
      if (selected === 2) break;
      const q = prior[peer];
      if (!q?.valid) continue;
      records.push({ id: q.id, source: `peer-${peer}`, values: q.answer.v, text: q.answer.note,
        verdict: q.answer.verdict, ancestors: q.ancestors });
      selected++;
    }
  }
  const prompt = JSON.stringify({ case: `case-${run.seed}`, local_observation: local.id, records });
  const params = { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' },
    output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
    system: BASE, messages: [{ role: 'user', content: prompt }] };
  const custom_id = `${run.id}-r${round}-a${node}`;
  return { custom_id, params, scope: custom_id, meta: { runId: run.id, topology: run.topology, seed: run.seed,
    cell: run.cell, arm: run.arm, round, node, records } };
}
