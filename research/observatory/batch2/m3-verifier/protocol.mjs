// M3 (H-M03, H-02): how well does a verifier agent catch planted provenance errors in a research report, with and without
// access to the sources? Measures the sensitivity and specificity that the theory says dominate swarm quality.
// 48 cases, each with a clean report and a corrupted twin (4 error types x 12). GROUNDED sees records and report; BLIND sees
// the report only. Evidence ids are opaque so the report itself carries no hint.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';

export const ID = 'm3-verifier';
export const TITLE = 'M3 verifier sensitivity and specificity on planted provenance errors (H-M03, H-02)';
export const PREREG = 'tasks/M3-VERIFIER-PREREG.md';
export const WAVES = 1;
export const SEEDS = Array.from({ length: 48 }, (_, i) => 9001 + i);
export const ARMS = ['grounded', 'blind'];
export const ERRORS = ['wrong-citation', 'flipped-value', 'dropped-finding', 'invented-conflict'];
export const GATE = { maxInvalidShare: 0.1 };

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sortClaims = (claims) => [...claims].map((c) => ({ indicator: c.indicator, value: c.value, evidence_ids: [...c.evidence_ids].sort() })).sort((a, b) => a.indicator - b.indicator || a.value - b.value || a.evidence_ids.join('|').localeCompare(b.evidence_ids.join('|')));
export function expectedClaims(records) {
  return sortClaims([...new Set(records.map((r) => `${r.indicator}/${r.value}`))].map((key) => { const [indicator, value] = key.split('/').map(Number); return { indicator, value, evidence_ids: records.filter((r) => r.indicator === indicator && r.value === value).map((r) => r.id) }; }));
}
// Deterministic checker: the ground truth of whether a report is faithful to the records.
export const faithful = (claims, records) => JSON.stringify(sortClaims(claims)) === JSON.stringify(expectedClaims(records));

export function makeCases() {
  return SEEDS.map((seed, ix) => {
    const rnd = mulberry32(seed), used = new Set(), newId = () => { let id; do id = `r-${Math.floor(rnd() * 46656).toString(36).padStart(3, '0')}`; while (used.has(id)); used.add(id); return id; };
    // three indicators, two sources, unanimous; one indicator may be 0. No natural conflicts, so a planted conflict is unambiguous.
    const zeroAt = ix % 3 === 0 ? null : (ix >> 2) % 3, records = [];
    for (let i = 0; i < 3; i++) for (const s of ['A', 'B']) records.push({ id: newId(), source: `node-${s}`, indicator: i, value: i === zeroAt ? 0 : 1 });
    const clean = expectedClaims(records), error = ERRORS[ix % 4], j = (ix >> 2) % 3, other = (j + 1) % 3, corrupted = clean.map((c) => ({ ...c, evidence_ids: [...c.evidence_ids] }));
    if (error === 'wrong-citation') corrupted[j].evidence_ids[0] = clean[other].evidence_ids[0];
    if (error === 'flipped-value') corrupted[j].value = 1 - corrupted[j].value;
    if (error === 'dropped-finding') corrupted.splice(j, 1);
    if (error === 'invented-conflict') { const moved = corrupted[j].evidence_ids.pop(); corrupted.push({ indicator: clean[j].indicator, value: 1 - clean[j].value, evidence_ids: [moved] }); }
    return { id: `vf-${seed}`, seed, records, error, errorIndicator: clean[j].indicator, reports: { clean, corrupted: sortClaims(corrupted) } };
  });
}
const SCHEMA = { type: 'object', properties: { faithful: { type: 'boolean' }, issues: { type: 'array', items: { type: 'object', properties: { indicator: { type: 'integer', enum: [0, 1, 2] }, kind: { type: 'string', enum: ['unsupported-citation', 'wrong-value', 'missing-finding', 'invented-finding'] } }, required: ['indicator', 'kind'], additionalProperties: false } } }, required: ['faithful', 'issues'], additionalProperties: false };
const SYS = {
  grounded: 'You verify a research report against its source records. The report is faithful only if every (indicator, value) pair in the records appears as a claim, no claim states a value the records do not contain, and every claim cites exactly the record IDs that support that value. Check each claim and each record. Set faithful to false if anything is wrong and list each issue; otherwise return faithful true and no issues. Return only JSON matching the schema.',
  blind: 'You review a research report without access to its source records. Judge whether the report is faithful to its sources as well as you can from the report alone. Set faithful to false only if you find a problem, and list each issue; otherwise return faithful true and no issues. Return only JSON matching the schema.',
};
export function wave() {
  return makeCases().flatMap((c) => ['clean', 'corrupted'].flatMap((kind) => ARMS.map((arm) => ({
    custom_id: `vf-${c.seed}-${kind}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: SCHEMA } }, system: SYS[arm], messages: [{ role: 'user', content: JSON.stringify(arm === 'grounded' ? { case_id: c.id, records: c.records, report: { claims: c.reports[kind] } } : { case_id: c.id, report: { claims: c.reports[kind] } }) }] },
    meta: { seed: c.seed, arm, kind, error: kind === 'corrupted' ? c.error : null, errorIndicator: c.errorIndicator },
  }))));
}
export const ceiling = () => wave();
export function score(k, rows, outputs) {
  return rows.map((q) => { const o = outputs.get(q.custom_id)?.output, valid = !!o && typeof o.faithful === 'boolean' && Array.isArray(o.issues); const flagged = valid && o.faithful === false;
    return { customId: q.custom_id, seed: q.meta.seed, arm: q.meta.arm, kind: q.meta.kind, error: q.meta.error, valid, flagged, localised: flagged && q.meta.kind === 'corrupted' && o.issues.some((i) => i.indicator === q.meta.errorIndicator) }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
const wilson = (k, n) => { const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
export function summarize([scored]) {
  const arms = Object.fromEntries(ARMS.map((arm) => {
    const r = scored.filter((x) => x.arm === arm && x.valid), bad = r.filter((x) => x.kind === 'corrupted'), ok = r.filter((x) => x.kind === 'clean'), tp = bad.filter((x) => x.flagged).length, tn = ok.filter((x) => !x.flagged).length;
    return [arm, { corrupted: bad.length, clean: ok.length, sensitivity: tp / bad.length, sensitivityCi95: wilson(tp, bad.length), specificity: tn / ok.length, specificityCi95: wilson(tn, ok.length), localised: bad.filter((x) => x.localised).length,
      byError: Object.fromEntries(ERRORS.map((e) => { const b = bad.filter((x) => x.error === e); return [e, { n: b.length, caught: b.filter((x) => x.flagged).length }]; })) }];
  }));
  const g = arms.grounded, b = arms.blind;
  return { arms, tests: { P1: g.specificity >= 0.95 && g.sensitivity >= 0.9 ? 'supported' : 'not supported', P2: g.sensitivity - b.sensitivity >= 0.4 ? 'supported' : 'not supported' } };
}
