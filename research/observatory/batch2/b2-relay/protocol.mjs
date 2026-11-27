// B2 (Murmur, H-M01): does a relay of structured facts keep provenance across hops better than a relay of prose?
// 24 synthetic cases (8 archetypes x 3 repeats), two arms, four dependent waves:
//   hop 0: two source agents per case read their own evidence packet;
//   hop 1: one agent merges the two upstream reports;
//   hop 2, 3: one agent relays the single upstream report.
// STRUCT forwards the `claims` array; PROSE forwards only a prose `briefing`. Every agent in both arms also returns
// `claims`, which is what gets scored, so both arms make the same number of calls.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';

export const ID = 'b2-relay';
export const TITLE = 'B2 relay format across hops (Murmur, H-M01)';
export const PREREG = 'tasks/B2-RELAY-PREREG.md';
export const WAVES = 4;
export const ARMS = ['struct', 'prose'];
export const SEEDS = Array.from({ length: 24 }, (_, i) => 4001 + i);
export const ARCHETYPES = ['unanimous-one-zero', 'unanimous-all-one', 'missing-with-known-zero', 'missing-all-one', 'single-conflict', 'conflict-plus-known-zero', 'two-conflicts', 'single-source-omission'];
export const GATE = { hop0ExactMinPerArm: 44, hop0PerArm: 48, maxInvalidShare: 0.1 };

const CLAIMS = { type: 'array', items: { type: 'object', properties: { indicator: { type: 'integer', enum: [0, 1, 2] }, value: { type: 'integer', enum: [0, 1] }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['indicator', 'value', 'evidence_ids'], additionalProperties: false } };
const SCHEMA = {
  struct: { type: 'object', properties: { claims: CLAIMS }, required: ['claims'], additionalProperties: false },
  prose: { type: 'object', properties: { briefing: { type: 'string' }, claims: CLAIMS }, required: ['briefing', 'claims'], additionalProperties: false },
};
const CLAIM_RULE = 'Each claim is one exact (indicator, value) pair with every evidence ID that supports it. Do not infer missing values, resolve disagreements or choose between sources: when sources disagree on an indicator, keep one claim per value.';
const PROSE_RULE = ' Also write `briefing`: a plain-prose note of at most 90 words for the next researcher that states every finding and cites its evidence IDs in the text. Only the briefing is forwarded; the next researcher will not see your claims.';
const TASK = [
  'You are a source researcher. Extract exactly the evidence records in this packet into claims. ',
  'You are a research lead. Merge the upstream reports into claims, preserving every distinct finding and every evidence ID. ',
  'You are a relay researcher. Pass the upstream report on to the next researcher as claims, without adding, dropping or changing any finding or evidence ID. ',
];
const system = (arm, hop) => TASK[Math.min(hop, 2)] + CLAIM_RULE + (arm === 'prose' ? PROSE_RULE : '') + ' Return only JSON matching the schema.';

export function makeCases() {
  return SEEDS.map((seed, ix) => {
    const pattern = Math.floor(ix / 3), repeat = ix % 3, t = (pattern + repeat) % 3, u = (t + 1) % 3, records = [];
    for (let indicator = 0; indicator < 3; indicator++) {
      let values = [1, 1]; // [node-A, node-B]; null = that source has no record
      if (pattern === 0 && indicator === t) values = [0, 0];
      if (pattern === 2) { if (indicator === t) values = [null, null]; if (indicator === u) values = [0, 0]; }
      if (pattern === 3 && indicator === t) values = [null, null];
      if (pattern === 4 && indicator === t) values = [0, 1];
      if (pattern === 5) { if (indicator === t) values = [0, 1]; if (indicator === u) values = [0, 0]; }
      if (pattern === 6 && (indicator === t || indicator === u)) values = [indicator === t ? 0 : 1, indicator === t ? 1 : 0];
      if (pattern === 7 && indicator === t) values = [1, null];
      values.forEach((value, s) => { if (value !== null) records.push({ id: `rl-${seed}-q${indicator}-${s ? 'B' : 'A'}`, source: s ? 'node-B' : 'node-A', indicator, value }); });
    }
    return { id: `rl-case-${seed}`, seed, pattern, archetype: ARCHETYPES[pattern], repeat, records };
  });
}

const sortClaims = (claims) => [...claims].map((c) => ({ indicator: c.indicator, value: c.value, evidence_ids: [...c.evidence_ids].sort() }))
  .sort((a, b) => a.indicator - b.indicator || a.value - b.value || a.evidence_ids.join('|').localeCompare(b.evidence_ids.join('|')));
export function expectedClaims(records) {
  return sortClaims([...new Set(records.map((r) => `${r.indicator}/${r.value}`))].map((key) => {
    const [indicator, value] = key.split('/').map(Number);
    return { indicator, value, evidence_ids: records.filter((r) => r.indicator === indicator && r.value === value).map((r) => r.id) };
  }));
}
export const validOutput = (arm, o) => !!o && Array.isArray(o.claims) && (arm === 'struct' || typeof o.briefing === 'string')
  && o.claims.every((c) => [0, 1, 2].includes(c?.indicator) && [0, 1].includes(c?.value) && Array.isArray(c?.evidence_ids) && c.evidence_ids.every((x) => typeof x === 'string'));
export function scoreClaims(claims, records) {
  const want = expectedClaims(records), got = sortClaims(claims);
  const supported = (c) => c.evidence_ids.length > 0 && c.evidence_ids.every((id) => records.some((r) => r.id === id && r.indicator === c.indicator && r.value === c.value));
  const pairs = new Set(got.map((c) => `${c.indicator}/${c.value}`));
  return { exact: JSON.stringify(got) === JSON.stringify(want), citationSupported: got.length > 0 && got.every(supported), unsupportedClaims: got.filter((c) => !supported(c)).length,
    missingPairs: want.filter((c) => !pairs.has(`${c.indicator}/${c.value}`)).length, missingIds: want.flatMap((c) => c.evidence_ids).filter((id) => !got.some((g) => g.evidence_ids.includes(id))).length };
}

const idOf = (seed, arm, hop, src) => `rl-${seed}-${arm}-h${hop}${hop === 0 ? `-${src}` : ''}`;
const params = (arm, hop, content) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: SCHEMA[arm] } }, system: system(arm, hop), messages: [{ role: 'user', content: JSON.stringify(content) }] });
const forward = (arm, from, item) => (arm === 'struct' ? { from, claims: Array.isArray(item?.output?.claims) ? item.output.claims : [] } : { from, briefing: typeof item?.output?.briefing === 'string' ? item.output.briefing : '' });

// Rows of wave k. `outputs` maps custom_id -> { output, stopReason } for every earlier wave.
export function wave(k, outputs) {
  const cases = makeCases();
  if (k === 0) return cases.flatMap((c) => ARMS.flatMap((arm) => ['a', 'b'].map((src) => {
    const source = src === 'a' ? 'node-A' : 'node-B', records = c.records.filter((r) => r.source === source);
    return { custom_id: idOf(c.seed, arm, 0, src), params: params(arm, 0, { case_id: c.id, source_node: source, records }), meta: { seed: c.seed, arm, hop: 0, archetype: c.archetype, records } };
  })));
  return cases.flatMap((c) => ARMS.map((arm) => {
    const upstream = k === 1 ? ['a', 'b'].map((src) => forward(arm, src === 'a' ? 'node-A' : 'node-B', outputs.get(idOf(c.seed, arm, 0, src)))) : [forward(arm, `hop-${k - 1}`, outputs.get(idOf(c.seed, arm, k - 1)))];
    return { custom_id: idOf(c.seed, arm, k), params: params(arm, k, { case_id: c.id, hop: k, upstream }), meta: { seed: c.seed, arm, hop: k, archetype: c.archetype, records: c.records } };
  }));
}
// Deterministic stand-in for upstream outputs, used only to size the reservation of later waves at freeze time.
export function ceiling(k) {
  const fake = new Map(), cases = makeCases(), pad = 'x'.repeat(700);
  for (const c of cases) for (const arm of ARMS) {
    for (const src of ['a', 'b']) fake.set(idOf(c.seed, arm, 0, src), { output: { briefing: pad, claims: expectedClaims(c.records) } });
    for (let h = 1; h < k; h++) fake.set(idOf(c.seed, arm, h), { output: { briefing: pad, claims: expectedClaims(c.records) } });
  }
  return wave(k, fake);
}

export function score(k, rows, outputs) {
  return rows.map((q) => {
    const item = outputs.get(q.custom_id), valid = validOutput(q.meta.arm, item?.output);
    const s = valid ? scoreClaims(item.output.claims, q.meta.records) : { exact: false, citationSupported: false, unsupportedClaims: 0, missingPairs: expectedClaims(q.meta.records).length, missingIds: q.meta.records.length };
    return { customId: q.custom_id, seed: q.meta.seed, arm: q.meta.arm, hop: k, archetype: q.meta.archetype, valid, truncated: item?.stopReason === 'max_tokens', ...s };
  });
}
export function gate(k, scored) {
  if (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare) return 'invalid-output-stop';
  if (k === 0 && ARMS.some((arm) => scored.filter((x) => x.arm === arm && x.exact).length < GATE.hop0ExactMinPerArm)) return 'instrument-insufficient';
  return null;
}

const wilson = (k, n) => { const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
export function verdict(byHop) { // preregistered decision rule for H-M01
  const s = (h) => byHop[h]?.struct.exact, p = (h) => byHop[h]?.prose.exact;
  if (![1, 2, 3].every((h) => byHop[h])) return 'not-evaluated';
  if (s(3) >= 23 && p(2) <= 16) return 'supported';
  if ([1, 2, 3].every((h) => s(h) - p(h) <= 1)) return 'refuted';
  return 'inconclusive';
}
export function summarize(scoredByWave) {
  const byHop = {};
  scoredByWave.forEach((rows, k) => {
    byHop[k] = Object.fromEntries(ARMS.map((arm) => {
      const r = rows.filter((x) => x.arm === arm), n = r.length, exact = r.filter((x) => x.exact).length;
      return [arm, { n, valid: r.filter((x) => x.valid).length, truncated: r.filter((x) => x.truncated).length, exact, exactCi95: wilson(exact, n), citationSupported: r.filter((x) => x.citationSupported).length,
        unsupportedClaims: r.reduce((a, x) => a + x.unsupportedClaims, 0), missingPairs: r.reduce((a, x) => a + x.missingPairs, 0), missingIds: r.reduce((a, x) => a + x.missingIds, 0) }];
    }));
    if (k > 0) { const ok = (arm, seed) => rows.find((x) => x.arm === arm && x.seed === seed)?.exact; byHop[k].paired = { structOnly: SEEDS.filter((s) => ok('struct', s) && !ok('prose', s)).length, proseOnly: SEEDS.filter((s) => !ok('struct', s) && ok('prose', s)).length }; }
  });
  return { byHop, hypothesis: 'H-M01', verdict: verdict(byHop) };
}
