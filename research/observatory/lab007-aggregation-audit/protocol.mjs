import crypto from 'node:crypto';
import { MODEL, MAX_TOKENS } from '../lab007-economy/model.mjs';

export const SEEDS = Array.from({ length: 24 }, (_, i) => 1001 + i);
export const FORMATS = ['TEXT', 'STRUCTURED'];
export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    claims: { type: 'array', items: { type: 'object', properties: {
      indicator: { type: 'integer', enum: [0, 1, 2] }, value: { type: 'integer', enum: [0, 1] },
      evidence_ids: { type: 'array', items: { type: 'string' } },
    }, required: ['indicator', 'value', 'evidence_ids'], additionalProperties: false } },
    verdict: { type: 'string', enum: ['malicious', 'benign', 'unsure'] },
    note: { type: 'string' },
  }, required: ['claims', 'verdict', 'note'], additionalProperties: false,
};

const TRUTH = [
  [0, 1, 1], // unanimous benign
  [1, 1, 1], // unanimous malicious
  [0, 1, 1], // missing, but one consistent zero remains decisive
  [1, 1, 1], // missing one all-one indicator: unresolved
  [1, 1, 1], // one indicator conflicts
  [0, 1, 1], // a known zero plus a conflict: remain unsure
  [0, 1, 1], // one observation per indicator, no conflict
  [1, 1, 1], // two indicators conflict
];

function evidenceFor(seed, pattern, repeat) {
  const truth = TRUTH[pattern].slice();
  const records = [];
  const missingIndex = pattern === 2 ? 1 + (repeat % 2) : repeat % 3;
  const conflictA = (pattern + repeat) % 3;
  const conflictB = (conflictA + 1) % 3;
  const add = (indicator, value, replica) => {
    const ordinal = records.length;
    records.push({ id: `ev-${seed}-${String(ordinal).padStart(2, '0')}`,
      source: `node-${(ordinal + repeat) % 6}`, indicator, value });
    return replica;
  };
  for (let indicator = 0; indicator < 3; indicator++) {
    if ((pattern === 2 || pattern === 3) && indicator === missingIndex) continue;
    if (pattern === 6) { add(indicator, truth[indicator], 0); continue; }
    if (pattern === 4 && indicator === conflictA) {
      add(indicator, 0, 0); add(indicator, 1, 1); continue;
    }
    if (pattern === 5 && indicator === conflictA) {
      add(indicator, 0, 0); add(indicator, 1, 1); continue;
    }
    if (pattern === 7 && (indicator === conflictA || indicator === conflictB)) {
      add(indicator, 0, 0); add(indicator, 1, 1); continue;
    }
    add(indicator, truth[indicator], 0); add(indicator, truth[indicator], 1);
  }
  if ((repeat + pattern) % 2) records.reverse();
  return { truth, records };
}

export function makeCases() {
  return SEEDS.map((seed, ix) => {
    const pattern = Math.floor(ix / 3), repeat = ix % 3;
    const { truth, records } = evidenceFor(seed, pattern, repeat);
    return { id: `case-${seed}`, seed, pattern, repeat, truth, records };
  });
}

export function aggregateEvidence(records) {
  const values = Array.from({ length: 3 }, () => new Map());
  for (const record of records) {
    if (![0, 1, 2].includes(record.indicator) || ![0, 1].includes(record.value) || typeof record.id !== 'string') throw new Error(`Malformed evidence ${record.id}`);
    const byValue = values[record.indicator];
    const ids = byValue.get(record.value) || [];
    ids.push(record.id);
    byValue.set(record.value, ids);
  }
  const claims = [];
  const states = values.map((byValue) => [...byValue.entries()].sort(([a], [b]) => a - b));
  states.forEach((items, indicator) => items.forEach(([value, evidence_ids]) => claims.push({ indicator, value, evidence_ids: [...evidence_ids].sort() })));
  const hasConflict = states.some((items) => items.length > 1);
  const knownZero = states.some((items) => items.length === 1 && items[0][0] === 0);
  const allOne = states.every((items) => items.length === 1 && items[0][0] === 1);
  const verdict = hasConflict ? 'unsure' : knownZero ? 'benign' : allOne ? 'malicious' : 'unsure';
  const indicatorStates = states.map((items) => ({ state: items.length === 0 ? 'missing' : items.length === 1 ? 'unanimous' : 'conflict', values: items.map(([value]) => value) }));
  return { claims, indicatorStates, verdict, note: 'deterministic aggregation of visible evidence' };
}

const instruction = 'Aggregate only the visible evidence records. Source names identify origin, not trust or truth; do not rank sources. Copy every distinct (indicator,value) fact and cite all record IDs that support that exact pair. Preserve missing indicators and contradictory values; never erase a conflict or fill an absent value. Decision rule: if any indicator conflicts, verdict is unsure; otherwise if any known value is 0, verdict is benign; otherwise if all three indicators are known 1, verdict is malicious; else unsure. Return only JSON: claims [{indicator,value,evidence_ids}], verdict, note (brief).';
export const SYSTEM = `Synthetic evidence aggregation task. Report only what the supplied records support.\n${instruction}`;

function formatText(records) {
  return records.map((r) => `Record ${r.id} | origin ${r.source} | indicator ${r.indicator} | value ${r.value}`).join('\n');
}

export function requestFor(testCase, format) {
  const content = format === 'TEXT' ? { case: testCase.id, recipient: 'triage-reader', reports: formatText(testCase.records) }
    : { case: testCase.id, recipient: 'triage-reader', records: testCase.records.map((r) => ({ id: r.id, origin: r.source, indicator: r.indicator, value: r.value })) };
  return { custom_id: `aggv2-s${testCase.seed}-${format.toLowerCase()}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' },
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } }, system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(content) }] },
    meta: { caseId: testCase.id, seed: testCase.seed, pattern: testCase.pattern, repeat: testCase.repeat, format, truth: testCase.truth, records: testCase.records } };
}

export function makeRequests() {
  return makeCases().flatMap((testCase) => FORMATS.map((format) => requestFor(testCase, format)));
}

function canonicalClaims(claims) {
  return claims.map((x) => ({ indicator: x.indicator, value: x.value, evidence_ids: [...x.evidence_ids].sort() }))
    .sort((a, b) => a.indicator - b.indicator || a.value - b.value || a.evidence_ids.join('|').localeCompare(b.evidence_ids.join('|')));
}

export function scoreOutput(raw, records, truth) {
  let output;
  try { output = typeof raw === 'string' ? JSON.parse(raw.trim()) : raw; }
  catch { return { valid: false, error: 'invalid-json', verdictCorrect: false, truthCorrect: false, completeClaims: false, allCitationsSupported: false, exactClaims: false }; }
  if (!output || !Array.isArray(output.claims) || !['malicious', 'benign', 'unsure'].includes(output.verdict) || typeof output.note !== 'string') return { valid: false, error: 'schema', verdictCorrect: false, truthCorrect: false, completeClaims: false, allCitationsSupported: false, exactClaims: false };
  const expected = aggregateEvidence(records), visible = new Map(records.map((r) => [r.id, r]));
  const supported = output.claims.every((claim) => claim && [0, 1, 2].includes(claim.indicator) && [0, 1].includes(claim.value)
    && Array.isArray(claim.evidence_ids) && claim.evidence_ids.length > 0
    && claim.evidence_ids.every((id) => visible.has(id) && visible.get(id).indicator === claim.indicator && visible.get(id).value === claim.value));
  const uniqueClaims = new Set(output.claims.map((x) => `${x.indicator}/${x.value}`)).size === output.claims.length;
  const exactClaims = supported && uniqueClaims && JSON.stringify(canonicalClaims(output.claims)) === JSON.stringify(canonicalClaims(expected.claims));
  const truthVerdict = truth.includes(0) ? 'benign' : 'malicious';
  return { valid: true, verdict: output.verdict, expectedEvidenceVerdict: expected.verdict,
    verdictCorrect: output.verdict === expected.verdict, truthCorrect: output.verdict === truthVerdict,
    completeClaims: exactClaims, allCitationsSupported: supported, exactClaims,
    emittedClaims: output.claims.length, expectedClaims: expected.claims.length,
    unsupportedOrMisattachedCitations: supported ? 0 : 1,
    missingOrExtraClaims: !exactClaims, indicatorStates: expected.indicatorStates };
}

export function auditDesign() {
  const cases = makeCases(), requests = makeRequests();
  if (cases.length !== 24 || new Set(cases.map((x) => x.seed)).size !== 24) throw new Error('Expected 24 fresh independent case IDs');
  if (new Set(requests.map((x) => x.custom_id)).size !== 48) throw new Error('Model request IDs are not unique');
  for (const c of cases) {
    const parsedText = [...c.records].map((r) => ({ id: r.id, source: r.source, indicator: r.indicator, value: r.value }));
    if (JSON.stringify(parsedText) !== JSON.stringify(c.records)) throw new Error(`Text representation is not semantically lossless for ${c.id}`);
    const det = aggregateEvidence(c.records);
    const direct = scoreOutput(det, c.records, c.truth);
    if (!direct.valid || !direct.exactClaims || !direct.allCitationsSupported || !direct.verdictCorrect) throw new Error(`Deterministic control failed on ${c.id}`);
  }
  return { cases: cases.length, archetypes: 8, repeatsPerArchetype: 3, modelFormats: FORMATS,
    modelRequests: requests.length, independentCallsPerFormat: cases.length,
    deterministicControlCases: cases.length, usesGroundTruthInAggregator: false,
    scenarios: ['unanimous benign', 'unanimous malicious', 'partial but decisive', 'partial ambiguous', 'single conflict', 'conflict plus zero', 'single reading per indicator', 'multiple conflicts'] };
}

export function promptFingerprint(request) {
  return crypto.createHash('sha256').update(request.params.system + '\n' + request.params.messages[0].content).digest('hex');
}
