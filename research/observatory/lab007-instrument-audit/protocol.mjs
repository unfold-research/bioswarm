import { MODEL, MAX_TOKENS, RESPONSE_SCHEMA, BASE } from '../lab007-economy/model.mjs';

export const SEEDS = Array.from({ length: 24 }, (_, i) => 701 + i);
export const ARMS = ['LOCAL', 'FULL', 'RING'];
export const N = 6;

export function makeTrials() {
  return SEEDS.map((seed, i) => {
    const pattern = Math.floor(i / 3);
    const truth = [0, 1, 2].map((bit) => (pattern >> bit) & 1);
    return { seed, pattern, truth, id: `audit-s${seed}` };
  });
}

export function makeAgentRuns() {
  const runs = [];
  for (const trial of makeTrials()) for (const arm of ARMS) {
    runs.push({ id: `${trial.id}-${arm}`, seed: trial.seed, pattern: trial.pattern,
      truth: trial.truth.slice(), arm, history: [], interventions: 0 });
  }
  return runs;
}

const obs = (seed, node, truth) => ({ id: `obs-s${seed}-a${node}`, source: `sensor-${node}`,
  values: [0, 1, 2].map((i) => i === node % 3 ? truth[i] : null) });
const paramsFor = (content) => ({ model: MODEL, max_tokens: MAX_TOKENS,
  thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
  system: BASE, messages: [{ role: 'user', content: JSON.stringify(content) }] });

export function round0Rows() {
  const rows = [];
  for (const t of makeTrials()) {
    for (let node = 0; node < N; node++) {
      const local = obs(t.seed, node, t.truth);
      rows.push({ custom_id: `${t.id}-prefix-r0-a${node}`,
        params: paramsFor({ case: t.id, local_observation: local.id, records: [local] }),
        meta: { trialId: t.id, seed: t.seed, pattern: t.pattern, truth: t.truth, arm: 'LOCAL+RING', node, records: [local], local, blockedCount: 0 } });
      const full = Array.from({ length: N }, (_, i) => obs(t.seed, i, t.truth)), fullLocal = full[node];
      rows.push({ custom_id: `${t.id}-full-r0-a${node}`,
        params: paramsFor({ case: t.id, local_observation: fullLocal.id, records: full }),
        meta: { trialId: t.id, seed: t.seed, pattern: t.pattern, truth: t.truth, arm: 'FULL', node, records: full, local: fullLocal, blockedCount: 0 } });
    }
  }
  return rows;
}

export function round1Rows(runs) {
  const rows = [];
  for (const run of runs.filter((x) => x.arm === 'RING')) {
    const prior = run.history[0];
    if (!prior || prior.length !== N) throw new Error(`Missing validated round-0 checkpoint for ${run.id}`);
    for (let node = 0; node < N; node++) {
      const local = obs(run.seed, node, run.truth), records = [local];
      for (const peer of [(node + N - 1) % N, (node + 1) % N]) {
        const q = prior[peer];
        if (!q?.valid) throw new Error(`Invalid peer output; cannot create dependent request ${run.id}/${node}`);
        records.push({ id: q.id, source: `peer-${peer}`, values: q.answer.v, text: q.answer.note,
          verdict: q.answer.verdict, ancestors: q.ancestors });
      }
      rows.push({ custom_id: `${run.id}-r1-a${node}`,
        params: paramsFor({ case: run.id, local_observation: local.id, records }),
        meta: { trialId: `audit-s${run.seed}`, seed: run.seed, pattern: run.pattern, truth: run.truth,
          arm: run.arm, node, records, local, blockedCount: 0 } });
    }
  }
  return rows;
}

export function round1WorstCaseRows() {
  const runs = makeAgentRuns().filter((x) => x.arm === 'RING');
  for (const run of runs) {
    const prev = [];
    for (let node = 0; node < N; node++) {
      const local = obs(run.seed, node, run.truth), qid = `audit-s${run.seed}-prefix-r0-a${node}`;
      prev.push({ id: qid, node, valid: true,
        answer: { v: local.values, verdict: run.truth.every((x) => x === 1) ? 'malicious' : 'unsure',
          refs: [local.id], alarm: [], note: 'x'.repeat(240) }, ancestors: [local.id], blocked: false });
    }
    run.history.push(prev);
  }
  return round1Rows(runs);
}

export function validateRows(rows, expectedCount) {
  if (rows.length !== expectedCount) throw new Error(`Expected ${expectedCount} requests, found ${rows.length}`);
  const ids = rows.map((q) => q.custom_id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate request IDs');
  const promptHashes = new Set();
  for (const q of rows) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(q.custom_id)) throw new Error(`Invalid request ID ${q.custom_id}`);
    if (q.params.model !== MODEL || q.params.max_tokens !== MAX_TOKENS || q.params.output_config?.format?.type !== 'json_schema') throw new Error(`Request contract mismatch ${q.custom_id}`);
    if (q.params.thinking?.type !== 'disabled' || q.params.tools) throw new Error(`Unexpected generation/tool configuration ${q.custom_id}`);
    if (!q.meta.records.some((x) => x.id === q.meta.local.id)) throw new Error(`Local observation is not visible in ${q.custom_id}`);
    const text = q.params.messages[0].content;
    if (['groundTruth', 'ground_truth', 'targetVerdict', 'hiddenLabel'].some((x) => text.includes(x))) throw new Error(`Hidden label leak ${q.custom_id}`);
    const promptHash = `${q.params.system}\n${text}`;
    if (promptHashes.has(promptHash)) throw new Error(`Unexpected duplicate prompt ${q.custom_id}`);
    promptHashes.add(promptHash);
    if (Buffer.byteLength(JSON.stringify(q.params)) > 16000) throw new Error(`Request byte ceiling exceeded ${q.custom_id}`);
  }
  return { count: rows.length, uniqueIds: new Set(ids).size, uniquePromptHashes: promptHashes.size };
}

export function deterministicAudit() {
  const trials = makeTrials();
  if (trials.length !== 24 || new Set(trials.map((x) => x.seed)).size !== 24) throw new Error('Trial identity mismatch');
  const byPattern = new Map();
  for (const t of trials) byPattern.set(t.pattern, (byPattern.get(t.pattern) || 0) + 1);
  if ([...byPattern.keys()].length !== 8 || [...byPattern.values()].some((x) => x !== 3)) throw new Error('Truth-state coverage mismatch');
  for (const t of trials) {
    for (let node = 0; node < N; node++) {
      const own = obs(t.seed, node, t.truth);
      const full = [0, 1, 2].map((i) => obs(t.seed, i, t.truth));
      if (!full.some((x) => x.id === full[node % 3].id)) throw new Error(`Full-evidence local record missing in ${t.id}, node ${node}`);
      const neighbors = [(node + N - 1) % N, (node + 1) % N].map((peer) => obs(t.seed, peer, t.truth));
      const values = [own, ...neighbors].flatMap((x) => x.values).filter((x) => x !== null);
      if (values.length !== 3) throw new Error(`Ring does not deliver exactly 3 facts in ${t.id}, node ${node}`);
      const verdict = own.values.includes(0) ? 'benign' : 'unsure';
      const expectedLocal = t.truth.every((x) => x === 1) ? 'unsure' : own.values.includes(0) ? 'benign' : 'unsure';
      if (verdict !== expectedLocal) throw new Error('Local-only deterministic rule mismatch');
    }
  }
  return { stateTrials: trials.length, distinctTruthVectors: byPattern.size, repeatsPerVector: 3,
    maliciousTrials: trials.filter((x) => x.truth.every((v) => v === 1)).length,
    benignTrials: trials.filter((x) => !x.truth.every((v) => v === 1)).length,
    ringNodesWithAllThreeIndicators: trials.length * N };
}
