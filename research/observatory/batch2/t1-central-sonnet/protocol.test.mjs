import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, WAVES } from './protocol.mjs';
import { makeField, state, roundsOf, outcome, evaluateRules, SEEDS, WORLDS, PARTS } from '../t1-trigger/protocol.mjs';
import { probe } from '../kernel/leak-probe.mjs';
test('fields: 30 per world; 20 against 16 at first, 25 for the runner-up after an edit; two edited parts re-counted are enough', () => {
  for (const w of WORLDS) assert.equal(SEEDS.filter((s) => makeField(s).world === w).length, 30);
  for (const s of SEEDS) { const f = makeField(s), tot = (c) => f.authors.map((a) => c.reduce((n, p) => n + p[a], 0)); assert.equal(tot(f.first)[0], 20); assert.equal(tot(f.first)[1], 16); assert.equal(tot(f.now)[1], f.world === 'stable' ? 16 : 25); assert.equal(f.block.length, f.world === 'stable' ? 0 : 3); assert.ok(Math.max(...tot(f.first).slice(2)) <= 10);
    assert.equal(outcome(f, 0).correct, f.world === 'stable' ? 1 : 0); assert.equal(outcome(f, 6).rounds, 6); assert.equal(roundsOf('never', f), 0); if (f.world === 'stable') assert.equal(roundsOf('thr8', f), 4); }
});
test('leak probe: the edited parts cannot be located from the first counts', () => {
  const cases = SEEDS.map((s) => makeField(s)).filter((f) => f.block.length).map((f) => ({ targets: f.block, candidates: f.first.map((c, part) => ({ id: part, features: { leader: c[f.authors[0]], runnerUp: c[f.authors[1]], diff: c[f.authors[0]] - c[f.authors[1]], total: f.authors.reduce((n, a) => n + c[a], 0) } })) }));
  assert.equal(probe(cases).leak, false);
});
test('central trigger sonnet: waves shrink as fields stop; a supervisor that continues only after a change', () => {
  const out = new Map(), scored = []; let stop = null;
  for (let k = 0; k < WAVES && !stop; k++) { const rows = wave(k, out); assert.equal(ceiling(k).length, 90); assert.ok(rows.length <= 90); if (k === 0) assert.equal(rows.length, 90);
    for (const q of rows) { assert.equal(q.params.model, 'sonnet' === 'sonnet' ? 'claude-sonnet-5-5' : 'claude-haiku-5-5'); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); const c = JSON.parse(q.params.messages[0].content); assert.equal(c.parts_recounted.length, 2 * c.rounds_done); assert.ok(!('world' in c) && !JSON.stringify(c).includes('stable'));
      out.set(q.custom_id, { output: { working: '', continue: c.parts_recounted.some((p) => p.changed) || c.rounds_done < 4 } }); }
    const s = score(k, rows, out); scored.push(s); stop = gate(k, s); }
  const s = summarize(scored), rules = evaluateRules(SEEDS); assert.equal(s.perField.length, 90); assert.equal(s.byWorld.stable.correct, 1); assert.equal(s.byWorld.stable.recounts, 8);
  for (const w of WORLDS) { assert.equal(s.byWorld[w].correct, rules.thr8[w].correct); assert.equal(s.byWorld[w].recounts, rules.thr8[w].recounts); } // that supervisor is the thr8 rule
  console.log('RULES', JSON.stringify(rules));
});
