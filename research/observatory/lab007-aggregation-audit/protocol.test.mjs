import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeCases, makeRequests, auditDesign, aggregateEvidence, scoreOutput, promptFingerprint } from './protocol.mjs';
import { reserveWaves } from '../lab007-instrument-audit/global-budget.mjs';

test('paired cases cover eight distinct evidence states with fresh IDs and no duplicated prompts', () => {
  const design = auditDesign(), cases = makeCases(), requests = makeRequests();
  assert.equal(design.cases, 24);
  assert.equal(design.archetypes, 8);
  assert.equal(design.modelRequests, 48);
  assert.equal(new Set(requests.map((x) => x.custom_id)).size, 48);
  assert.equal(new Set(requests.map(promptFingerprint)).size, 48);
  for (const c of cases) {
    assert.equal(new Set(c.records.map((x) => x.id)).size, c.records.length);
    assert.ok(c.records.every((x) => !('truth' in x) && !('label' in x)));
  }
});

test('deterministic aggregator sees only visible evidence and preserves missing, partial, and conflicting values', () => {
  const cases = makeCases();
  const decisivePartial = cases.find((x) => x.pattern === 2);
  const ambiguousMissing = cases.find((x) => x.pattern === 3);
  const conflictWithZero = cases.find((x) => x.pattern === 5);
  assert.equal(aggregateEvidence(decisivePartial.records).verdict, 'benign');
  assert.equal(aggregateEvidence(ambiguousMissing.records).verdict, 'unsure');
  const conflict = aggregateEvidence(conflictWithZero.records);
  assert.equal(conflict.verdict, 'unsure');
  assert.ok(conflict.indicatorStates.some((x) => x.state === 'conflict' && x.values.length === 2));
  assert.ok(conflict.indicatorStates.some((x) => x.state === 'unanimous' && x.values[0] === 0));
  assert.equal(scoreOutput(conflict, conflictWithZero.records, conflictWithZero.truth).exactClaims, true);
});

test('scorer detects absent, wrong, and unsupported citations separately from verdict correctness', () => {
  const c = makeCases().find((x) => x.pattern === 0), expected = aggregateEvidence(c.records);
  const complete = scoreOutput(expected, c.records, c.truth);
  assert.equal(complete.valid, true); assert.equal(complete.verdictCorrect, true);
  assert.equal(complete.completeClaims, true); assert.equal(complete.allCitationsSupported, true);
  const missing = structuredClone(expected); missing.claims[0].evidence_ids.pop();
  const missingScore = scoreOutput(missing, c.records, c.truth);
  assert.equal(missingScore.verdictCorrect, true); assert.equal(missingScore.allCitationsSupported, true);
  assert.equal(missingScore.exactClaims, false);
  const wrong = structuredClone(expected); wrong.claims[0].evidence_ids = ['unknown-evidence-id'];
  const wrongScore = scoreOutput(wrong, c.records, c.truth);
  assert.equal(wrongScore.allCitationsSupported, false); assert.equal(wrongScore.exactClaims, false);
  const unsupported = structuredClone(expected); unsupported.claims[0].value = unsupported.claims[0].value === 0 ? 1 : 0;
  const unsupportedScore = scoreOutput(unsupported, c.records, c.truth);
  assert.equal(unsupportedScore.allCitationsSupported, false);
});

test('claim omission and partial evidence do not masquerade as a correct complete account', () => {
  const c = makeCases().find((x) => x.pattern === 2), expected = aggregateEvidence(c.records);
  const output = structuredClone(expected); output.claims.pop();
  const score = scoreOutput(output, c.records, c.truth);
  assert.equal(score.verdictCorrect, true);
  assert.equal(score.completeClaims, false);
  assert.equal(score.missingOrExtraClaims, true);
  assert.equal(score.indicatorStates.some((x) => x.state === 'missing'), true);
});

test('text and structured prompts carry the same facts while changing only serialization', () => {
  const requests = makeRequests();
  for (const c of makeCases()) {
    const text = requests.find((x) => x.custom_id === `aggv2-s${c.seed}-text`);
    const structured = requests.find((x) => x.custom_id === `aggv2-s${c.seed}-structured`);
    assert.equal(text.params.system, structured.params.system);
    const t = JSON.parse(text.params.messages[0].content), s = JSON.parse(structured.params.messages[0].content);
    const decoded = t.reports.split('\n').map((line) => {
      const m = line.match(/^Record (\S+) \| origin (\S+) \| indicator ([0-2]) \| value ([01])$/);
      assert.ok(m); return { id: m[1], source: m[2], indicator: Number(m[3]), value: Number(m[4]) };
    });
    assert.deepEqual(decoded, c.records);
    assert.deepEqual(s.records.map((r) => ({ id: r.id, source: r.origin, indicator: r.indicator, value: r.value })), c.records);
  }
});

test('shared reservation admits a single wave over $5 under the sole $50 cumulative cap', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab007-agg-v2-'));
  const file = path.join(dir, 'global-budget.json');
  fs.writeFileSync(file, JSON.stringify({ schema: 1, capUsd: 100,
    commitments: { prior: { committedUsd: 0.18359216, status: 'complete' } }, history: [] }));
  try {
    const reservation = await reserveWaves({ file, studyHash: 'test-config', waves: [
      { name: 'test-wave', manifestHash: 'frozen-manifest', requestCount: 48, reserveUsd: 8 },
    ] });
    assert.equal(reservation.committedUsd, 8.18359216);
    assert.equal(reservation.waves[0].status, 'intent');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
