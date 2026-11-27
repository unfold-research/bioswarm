// Checks for pricing.mjs (offline, no key). Run: node observatory/lab007-economy/pricing.test.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { usageCost } from './batch.mjs';
import { PRICES, OUTPUT_LIMIT, priceFor, usageCostFor, reserveMeasured, measureRows } from './pricing.mjs';
const hash = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const mk = (model = 'claude-haiku-5-5', max = 300, text = 'x') => ({ model, max_tokens: max, messages: [{ role: 'user', content: text }] });

// Haiku 5.5 cost equals the lab's legacy usageCost, long band and cache included
for (const u of [{ input_tokens: 900, output_tokens: 200 }, { input_tokens: 120000, output_tokens: 400 }, { input_tokens: 500, cache_read_input_tokens: 3000, cache_creation_input_tokens: 2000, cache_creation: { ephemeral_1h_input_tokens: 500 }, output_tokens: 100 }])
  assert.ok(Math.abs(usageCostFor('claude-haiku-5-5', u) - usageCost(u)) < 1e-12);
// the LI36 case that run-rc3's flat price missed: a 136,463-token plan with 20,000 output tokens costs 5x the flat price
const plan = { input_tokens: 136463, output_tokens: 20000 };
assert.ok(Math.abs(usageCostFor('claude-haiku-5-5', plan) - (136463 * 0.25 + 20000 * 1.25) / 1e6) < 1e-12);
assert.ok(Math.abs(usageCostFor('claude-haiku-5-5', plan) / ((136463 * 0.05 + 20000 * 0.25) / 1e6) - 5) < 1e-9);
// Sonnet 5.5 at its own rates, no long band
assert.equal(usageCostFor('claude-sonnet-5-5', { input_tokens: 150000 }), 0.15);
// an unknown model fails closed
assert.throws(() => priceFor('claude-opus-9'), /No registered batch price/);
assert.throws(() => reserveMeasured(mk('claude-opus-9'), 10));
// measured reserve: short band below 100k, long band above (with the 10% margin), rc-sized max_tokens allowed
const s = reserveMeasured(mk('claude-haiku-5-5', 8000), 5000);
assert.equal(s.band, 'short'); assert.ok(Math.abs(s.usd - ((5500 * 0.05 + 8000 * 0.25) / 1e6) * 1.5) < 1e-12);
const l = reserveMeasured(mk('claude-haiku-5-5', 96000), 273000);
assert.equal(l.band, 'long'); assert.ok(Math.abs(l.usd - ((273000 * 1.1 * 0.25 + 96000 * 1.25) / 1e6) * 1.5) < 1e-12);
assert.equal(reserveMeasured(mk('claude-haiku-5-5', 100), 95000).band, 'long', 'within 10% of the edge: expensive band');
// the reserve always covers the real cost of a request that uses its whole max_tokens
for (const [tok, max] of [[5000, 8000], [99000, 32000], [136463, 96000], [273000, 128000]]) assert.ok(reserveMeasured(mk('claude-haiku-5-5', max), tok).usd >= usageCostFor('claude-haiku-5-5', { input_tokens: tok, output_tokens: max }));
// max_tokens bounds: the model's output limit (128,000 for Haiku 5.5), never unset
assert.equal(OUTPUT_LIMIT['claude-haiku-5-5'], 128000);
assert.throws(() => reserveMeasured(mk('claude-haiku-5-5', 128001), 900), /max_tokens/);
assert.throws(() => reserveMeasured({ ...mk(), max_tokens: undefined }, 900), /max_tokens/);
assert.throws(() => reserveMeasured(mk(), 0)); assert.throws(() => reserveMeasured({ ...mk(), tools: [{}] }, 900), /shape/);
// measureRows: one count per distinct prompt, bounded concurrency, order kept
{
  const rows = Array.from({ length: 50 }, (_, i) => ({ custom_id: 'r' + i, params: mk('claude-haiku-5-5', 100, 'p' + (i % 10)) }));
  let calls = 0, live = 0, peak = 0;
  const count = async (p) => { calls++; live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 2)); live--; return 100 + Number(p.messages[0].content.slice(1)); };
  const t = await measureRows(rows, count, { concurrency: 4, hashFn: hash });
  assert.equal(calls, 10); assert.ok(peak <= 4); assert.deepEqual(t.slice(0, 3), [100, 101, 102]); assert.equal(t[49], 109);
}
assert.deepEqual(PRICES['claude-haiku-5-5'].short, { in: 0.05, out: 0.25, read: 0.005, w5: 0.0625, w1: 0.1 });
// gpt-6-luna (LI42): batch = flex = 0.05 / 0.25 per Mtok; above 272k prompt tokens 0.10 / 0.375 (gateway table)
{
  const g = 'gpt-6-luna';
  assert.equal(PRICES[g].longOver, 272000);
  assert.ok(Math.abs(usageCostFor(g, { input_tokens: 200000, output_tokens: 1e6 }) - 0.26) < 1e-12);
  // cached prompt tokens are cheaper, and count toward the band
  assert.ok(Math.abs(usageCostFor(g, { input_tokens: 9000, cache_read_input_tokens: 1000, output_tokens: 0 }) - (9000 * 0.05 + 1000 * 0.005) / 1e6) < 1e-15);
  // at the edge: 272,000 prompt tokens is still the short band, 272,001 is the long one, on every token
  assert.ok(Math.abs(usageCostFor(g, { input_tokens: 272000, output_tokens: 1000 }) - (272000 * 0.05 + 1000 * 0.25) / 1e6) < 1e-12);
  assert.ok(Math.abs(usageCostFor(g, { input_tokens: 272001, output_tokens: 1000 }) - (272001 * 0.10 + 1000 * 0.375) / 1e6) < 1e-12);
  assert.ok(Math.abs(usageCostFor(g, { input_tokens: 200000, cache_read_input_tokens: 80000, output_tokens: 10 }) - (200000 * 0.10 + 80000 * 0.01 + 10 * 0.375) / 1e6) < 1e-12, 'cache read pushes the prompt over the band');
  // reserve: a 128,000 plan output is accepted, 128,001 is not; within 10% of 272k reserves at the long band
  const plan = reserveMeasured(mk(g, 128000), 170000);
  assert.equal(plan.band, 'short'); assert.ok(Math.abs(plan.usd - ((170000 * 1.1 * 0.05 + 128000 * 0.25) / 1e6) * 1.5) < 1e-12);
  assert.equal(reserveMeasured(mk(g, 8000), 250000).band, 'long');
  assert.throws(() => reserveMeasured(mk(g, 128001), 900), /max_tokens/);
  for (const [tok, max] of [[5000, 8000], [180000, 128000], [260000, 128000], [400000, 128000]]) assert.ok(reserveMeasured(mk(g, max), tok).usd >= usageCostFor(g, { input_tokens: tok, output_tokens: max }));
}
console.log('pricing: ok');
