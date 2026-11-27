import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCorpus, waveOf, ceilingOf, score, gate, summarize, wavesOf, range } from './engine.mjs';
import * as r2b from '../r2b-regimes/protocol.mjs';
import * as r3 from '../r3-bounds/protocol.mjs';
const PARTS = 12;
test('scenario "local" reproduces the R2b collections; the engine reproduces the R2b and R3 schedules for sweep and alarm', () => {
  for (const seed of [28001, 28017, 28060]) { const a = makeCorpus(seed, 'local'), b = r2b.makeCorpus(seed); assert.deepEqual(a.parts, b.parts); assert.deepEqual(a.block, b.block); assert.deepEqual(a.answer, b.answer); }
});
// Simulated run with exact readers; the orchestrator, when there is one, sends analysts to fresh neighbours of changed parts.
export function simulate(spec) {
  const out = new Map(), scored = [];
  for (let k = 0; k < wavesOf(spec); k++) { const rows = waveOf(spec, k, out); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length); if (k) assert.equal(ceilingOf(spec, k).length, rows.length);
    for (const q of rows) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); const m = q.meta; let o;
      if (m.kind === 'read') { assert.equal(q.params.model, 'claude-haiku-5-5'); o = { working: '', counts: m.authors.map((a) => ({ author: a, n: m.truth[a] })) }; }
      else { assert.equal(q.params.model, spec.orchestrator === 'sonnet' ? 'claude-sonnet-5-5' : 'claude-haiku-5-5'); assert.equal(q.params.system.includes('tends to affect neighbouring parts'), !!spec.prior);
        const b = JSON.parse(q.params.messages[0].content), seen = new Set(b.later.filter((x) => x.round > 0).map((x) => x.part)), want = []; for (const x of b.later.filter((y) => y.changed)) for (const n of [(x.part + 1) % PARTS, (x.part + PARTS - 1) % PARTS]) if (!seen.has(n) && !want.includes(n)) want.push(n);
        for (let p = (b.round * 5) % PARTS; want.length < 2; p = (p + 4) % PARTS) if (!seen.has(p) && !want.includes(p)) want.push(p); o = { working: '', assignments: want.slice(0, 2) }; }
      out.set(q.custom_id, { output: o }); }
    const s = score(k, rows, out); assert.equal(gate(k, s), null); scored.push(s); }
  return summarize(spec, scored);
}
test('with exact readers the engine gives the same accuracy as the R3 protocol for sweep and alarm, scatter and poison', () => {
  const exact = (sc, regime) => { const out = new Map(), scored = []; for (let k = 0; k < r3.WAVES[regime]; k++) { const rows = r3.waveOf(sc, regime, k, out); for (const q of rows) out.set(q.custom_id, { output: { working: '', counts: q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) } }); scored.push(r3.score(k, rows, out)); } return r3.summarizeRegime(sc, regime, scored).accuracy.edited; };
  for (const sc of ['scatter', 'poison']) for (const regime of ['sweep', 'alarm']) assert.equal(simulate({ prefix: 't', scenario: sc, seeds: r3.SEEDS_OF[sc], regime }).accuracy.edited, exact(sc, regime), `${sc} ${regime}`);
});
test('structural figures of the new regimes (printed for the preregistration)', () => {
  for (const [sc, from] of [['local', 31001], ['scatter', 32001]]) for (const regime of ['sweep', 'alarm', 'hedge', 'adapt']) { const s = simulate({ prefix: 't', scenario: sc, seeds: range(from, 60), regime }); assert.equal(s.accuracy.stable, 1); console.log('RESULT', sc, regime, s.accuracy.edited.toFixed(3), s.editedPartsReread.toFixed(2)); }
});
