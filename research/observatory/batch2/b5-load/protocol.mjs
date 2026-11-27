// B5 (Murmur, H-M01 under load): the B2 relay comparison with twice the evidence. 4 indicators and 3 sources per case (up
// to 12 records), opaque short ids. Three source agents at hop 0, one merge at hop 1, relays at hops 2 and 3.
// Independent of B2's result: it tests whether the answer changes when there is more to carry.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';

export const ID = 'b5-load';
export const TITLE = 'B5 relay format across hops under higher evidence load (Murmur, H-M01)';
export const PREREG = 'tasks/B5-LOAD-PREREG.md';
export const WAVES = 4;
export const ARMS = ['struct', 'prose'];
export const SEEDS = Array.from({ length: 24 }, (_, i) => 7001 + i);
export const NODES = ['node-A', 'node-B', 'node-C'];
export const GATE = { hop0ExactMinPerArm: 66, hop0PerArm: 72, maxInvalidShare: 0.1 };

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const CLAIMS = { type: 'array', items: { type: 'object', properties: { indicator: { type: 'integer', enum: [0, 1, 2, 3] }, value: { type: 'integer', enum: [0, 1] }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['indicator', 'value', 'evidence_ids'], additionalProperties: false } };
const SCHEMA = { struct: { type: 'object', properties: { claims: CLAIMS }, required: ['claims'], additionalProperties: false }, prose: { type: 'object', properties: { briefing: { type: 'string' }, claims: CLAIMS }, required: ['briefing', 'claims'], additionalProperties: false } };
const CLAIM_RULE = 'Each claim is one exact (indicator, value) pair with every evidence ID that supports it. Do not infer missing values, resolve disagreements or choose between sources: when sources disagree on an indicator, keep one claim per value.';
const PROSE_RULE = ' Also write `briefing`: a plain-prose note of at most 90 words for the next researcher that states every finding and cites its evidence IDs in the text. Only the briefing is forwarded; the next researcher will not see your claims.';
const TASK = ['You are a source researcher. Extract exactly the evidence records in this packet into claims. ', 'You are a research lead. Merge the upstream reports into claims, preserving every distinct finding and every evidence ID. ', 'You are a relay researcher. Pass the upstream report on to the next researcher as claims, without adding, dropping or changing any finding or evidence ID. '];
const system = (arm, hop) => TASK[Math.min(hop, 2)] + CLAIM_RULE + (arm === 'prose' ? PROSE_RULE : '') + ' Return only JSON matching the schema.';

// Per indicator, one of five shapes, rotated so every case mixes them: all agree, one source silent, one dissenter,
// nobody reports, two sources silent.
export function makeCases() {
  return SEEDS.map((seed, ix) => {
    const rnd = mulberry32(seed), used = new Set(), newId = () => { let id; do id = `e${Math.floor(rnd() * 46656).toString(36).padStart(3, '0')}`; while (used.has(id)); used.add(id); return id; }, records = [], shapes = [];
    for (let indicator = 0; indicator < 4; indicator++) {
      const shape = (ix + indicator * 2 + Math.floor(ix / 5)) % 5, v = Math.floor(rnd() * 2), odd = Math.floor(rnd() * 3); shapes.push(shape);
      const values = shape === 0 ? [v, v, v] : shape === 1 ? [v, v, v].map((x, s) => (s === odd ? null : x)) : shape === 2 ? [v, v, v].map((x, s) => (s === odd ? 1 - x : x)) : shape === 3 ? [null, null, null] : [null, null, null].map((x, s) => (s === odd ? v : x));
      values.forEach((value, s) => { if (value !== null) records.push({ id: newId(), source: NODES[s], indicator, value }); });
    }
    return { id: `ld-case-${seed}`, seed, shapes, records };
  });
}
const sortClaims = (claims) => [...claims].map((c) => ({ indicator: c.indicator, value: c.value, evidence_ids: [...c.evidence_ids].sort() })).sort((a, b) => a.indicator - b.indicator || a.value - b.value || a.evidence_ids.join('|').localeCompare(b.evidence_ids.join('|')));
export function expectedClaims(records) {
  return sortClaims([...new Set(records.map((r) => `${r.indicator}/${r.value}`))].map((key) => { const [indicator, value] = key.split('/').map(Number); return { indicator, value, evidence_ids: records.filter((r) => r.indicator === indicator && r.value === value).map((r) => r.id) }; }));
}
export const validOutput = (arm, o) => !!o && Array.isArray(o.claims) && (arm === 'struct' || typeof o.briefing === 'string') && o.claims.every((c) => [0, 1, 2, 3].includes(c?.indicator) && [0, 1].includes(c?.value) && Array.isArray(c?.evidence_ids) && c.evidence_ids.every((x) => typeof x === 'string'));
export function scoreClaims(claims, records) {
  const want = expectedClaims(records), got = sortClaims(claims), supported = (c) => c.evidence_ids.length > 0 && c.evidence_ids.every((id) => records.some((r) => r.id === id && r.indicator === c.indicator && r.value === c.value)), pairs = new Set(got.map((c) => `${c.indicator}/${c.value}`));
  return { exact: JSON.stringify(got) === JSON.stringify(want), citationSupported: got.every(supported), unsupportedClaims: got.filter((c) => !supported(c)).length, missingPairs: want.filter((c) => !pairs.has(`${c.indicator}/${c.value}`)).length, missingIds: want.flatMap((c) => c.evidence_ids).filter((id) => !got.some((g) => g.evidence_ids.includes(id))).length };
}
const idOf = (seed, arm, hop, src) => `ld-${seed}-${arm}-h${hop}${hop === 0 ? `-${src}` : ''}`;
const params = (arm, hop, content) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: SCHEMA[arm] } }, system: system(arm, hop), messages: [{ role: 'user', content: JSON.stringify(content) }] });
const forward = (arm, from, item) => (arm === 'struct' ? { from, claims: Array.isArray(item?.output?.claims) ? item.output.claims : [] } : { from, briefing: typeof item?.output?.briefing === 'string' ? item.output.briefing : '' });
const SRC = ['a', 'b', 'c'];
export function wave(k, outputs) {
  const cases = makeCases();
  if (k === 0) return cases.flatMap((c) => ARMS.flatMap((arm) => SRC.map((src, s) => { const records = c.records.filter((r) => r.source === NODES[s]); return { custom_id: idOf(c.seed, arm, 0, src), params: params(arm, 0, { case_id: c.id, source_node: NODES[s], records }), meta: { seed: c.seed, arm, hop: 0, records } }; })));
  return cases.flatMap((c) => ARMS.map((arm) => {
    const upstream = k === 1 ? SRC.map((src, s) => forward(arm, NODES[s], outputs.get(idOf(c.seed, arm, 0, src)))) : [forward(arm, `hop-${k - 1}`, outputs.get(idOf(c.seed, arm, k - 1)))];
    return { custom_id: idOf(c.seed, arm, k), params: params(arm, k, { case_id: c.id, hop: k, upstream }), meta: { seed: c.seed, arm, hop: k, records: c.records } };
  }));
}
export function ceiling(k) {
  const fake = new Map(), pad = 'x'.repeat(700);
  for (const c of makeCases()) for (const arm of ARMS) { for (const src of SRC) fake.set(idOf(c.seed, arm, 0, src), { output: { briefing: pad, claims: expectedClaims(c.records) } }); for (let h = 1; h < k; h++) fake.set(idOf(c.seed, arm, h), { output: { briefing: pad, claims: expectedClaims(c.records) } }); }
  return wave(k, fake);
}
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), valid = validOutput(q.meta.arm, item?.output);
    const s = valid ? scoreClaims(item.output.claims, q.meta.records) : { exact: false, citationSupported: false, unsupportedClaims: 0, missingPairs: expectedClaims(q.meta.records).length, missingIds: q.meta.records.length };
    return { customId: q.custom_id, seed: q.meta.seed, arm: q.meta.arm, hop: k, valid, truncated: item?.stopReason === 'max_tokens', ...s }; });
}
export function gate(k, scored) {
  if (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare) return 'invalid-output-stop';
  if (k === 0 && ARMS.some((arm) => scored.filter((x) => x.arm === arm && x.exact).length < GATE.hop0ExactMinPerArm)) return 'instrument-insufficient';
  return null;
}
const wilson = (k, n) => { const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
export function verdict(byHop) {
  const s = (h) => byHop[h]?.struct.exact, p = (h) => byHop[h]?.prose.exact;
  if (![1, 2, 3].every((h) => byHop[h])) return 'not-evaluated';
  if (s(3) >= 23 && p(2) <= 16) return 'supported';
  if ([1, 2, 3].every((h) => s(h) - p(h) <= 1)) return 'refuted';
  return 'inconclusive';
}
export function summarize(scoredByWave) {
  const byHop = {};
  scoredByWave.forEach((rows, k) => {
    byHop[k] = Object.fromEntries(ARMS.map((arm) => { const r = rows.filter((x) => x.arm === arm), n = r.length, exact = r.filter((x) => x.exact).length;
      return [arm, { n, valid: r.filter((x) => x.valid).length, truncated: r.filter((x) => x.truncated).length, exact, exactCi95: wilson(exact, n), citationSupported: r.filter((x) => x.citationSupported).length, unsupportedClaims: r.reduce((a, x) => a + x.unsupportedClaims, 0), missingPairs: r.reduce((a, x) => a + x.missingPairs, 0), missingIds: r.reduce((a, x) => a + x.missingIds, 0) }]; }));
    if (k > 0) { const ok = (arm, seed) => rows.find((x) => x.arm === arm && x.seed === seed)?.exact; byHop[k].paired = { structOnly: SEEDS.filter((s) => ok('struct', s) && !ok('prose', s)).length, proseOnly: SEEDS.filter((s) => !ok('struct', s) && ok('prose', s)).length }; }
  });
  return { byHop, hypothesis: 'H-M01 under load', verdict: verdict(byHop) };
}
