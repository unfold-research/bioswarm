import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, ARMS, makeCases, wave, score, gate, familySummary, tests, expectedClaims, labelsOf, DONOR_CARD } from './protocol.mjs';

const reply = (q, mode) => { // mode: 'instinct' follows the instinct, 'rule' follows the base rule only
  const m = q.meta, fire = mode === 'instinct' && m.type === 'exposed';
  return { output: { claims: expectedClaims(fire ? m.trusted : m.all), quarantined: fire ? [m.outsiderId] : [], verdict: fire ? m.label : m.ruleOnlyVerdict, note: 'ok' } };
};
const run = (family, modeOf) => { const rows = wave(family), out = new Map(rows.map((q) => [q.custom_id, reply(q, modeOf(q.meta.arm))])); const s = score(0, rows, out); assert.equal(gate(0, s), null); return familySummary(s); };

test('cases: 8 per type per family, balanced labels, distinct seeds across families', () => {
  const seeds = new Set();
  for (const f of FAMILIES) { const cs = makeCases(f); assert.equal(cs.length, 24);
    for (const t of ['clean', 'exposed', 'genuine']) { const c = cs.filter((x) => x.type === t); assert.equal(c.length, 8); assert.equal(c.filter((x) => x.label === labelsOf(f)[0]).length, 4); }
    for (const c of cs) { assert.ok(!seeds.has(c.seed)); seeds.add(c.seed); assert.equal(c.records.filter((r) => !r.trusted).length, c.type === 'exposed' ? 1 : 0); assert.equal(c.ruleOnlyVerdict, c.type === 'clean' ? c.label : 'unsure'); }
  }
});
test('requests: 96 + 120 + 120; the donor card appears only where it should', () => {
  const sizes = FAMILIES.map((f) => wave(f).length); assert.deepEqual(sizes, [96, 120, 120]);
  for (const f of FAMILIES) for (const q of wave(f)) {
    const sys = q.params.system, user = q.params.messages[0].content, a = q.meta.arm;
    assert.equal(sys.includes('INSTINCT'), a === 'native' || a === 'transplant'); assert.equal(user.includes('INSTINCT'), a === 'peer');
    if (a === 'transplant') assert.ok(sys.includes(DONOR_CARD));
    if (a === 'native' && f !== 'triage') assert.ok(!sys.includes('status "unverified"'));
    if (a === 'native' && f === 'triage') assert.ok(sys.includes(DONOR_CARD));
  }
  assert.ok(!ARMS.triage.includes('transplant'));
});
test('records use the family vocabulary, never the donor field names outside triage', () => {
  const r = JSON.parse(wave('research')[0].params.messages[0].content).records[0]; assert.ok('question' in r && 'answer' in r && 'review' in r && !('indicator' in r));
  const c = JSON.parse(wave('review')[0].params.messages[0].content).records[0]; assert.ok('check' in c && 'result' in c && 'origin' in c);
});
test('an agent that follows the instinct scores 8/8 with no wrong firing; a rule-only agent scores 0', () => {
  for (const f of FAMILIES) { const s = run(f, (arm) => (arm === 'native' || arm === 'transplant' ? 'instinct' : 'rule'));
    assert.equal(s.native.effect, 8); assert.equal(s.native.wrongFirings, 0); assert.equal(s.native.cleanOk, 8); assert.equal(s.native.genuineOk, 8);
    assert.equal(s.none.effect, 0); assert.equal(s.peer.effect, 0); assert.equal(s.none.cleanOk, 8); assert.equal(s.none.genuineOk, 8); }
});
test('decision rules', () => {
  const ideal = Object.fromEntries(FAMILIES.map((f) => [f, run(f, (arm) => (arm === 'native' || arm === 'transplant' ? 'instinct' : 'rule'))]));
  const t = tests(ideal); assert.equal(t.P1, 'supported'); assert.equal(t.P2, 'supported'); assert.equal(t.P3, 'supported'); assert.equal(t.P4, 'supported');
  const noTransfer = Object.fromEntries(FAMILIES.map((f) => [f, run(f, (arm) => (arm === 'native' ? 'instinct' : 'rule'))])); assert.equal(tests(noTransfer).P2, 'refuted');
  const peerAdopts = Object.fromEntries(FAMILIES.map((f) => [f, run(f, (arm) => (arm === 'none' ? 'rule' : 'instinct'))])); assert.equal(tests(peerAdopts).P3, 'not supported'); assert.equal(tests(peerAdopts).P4, 'not supported');
  // a wrong firing on a genuine conflict is counted
  const rows = wave('triage').filter((q) => q.meta.type === 'genuine' && q.meta.arm === 'native'), bad = new Map(rows.map((q) => [q.custom_id, { output: { claims: expectedClaims(q.meta.all), quarantined: [], verdict: q.meta.label, note: '' } }]));
  assert.equal(familySummary(score(0, rows, bad)).native.wrongFirings, 8);
});
