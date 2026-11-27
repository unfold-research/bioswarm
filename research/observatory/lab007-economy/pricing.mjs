// Per-model Batch API prices and the token-measured reserve, ported from PR #42 (closed) for the rc runner.
// Source: platform.claude.com/docs/en/about-claude/pricing, "Batch processing" table, read 2026-11-16 (PR #42).
// USD per million tokens; batch = 50% of standard. Cache: read 0.1x, 5m write 1.25x, 1h write 2x of the batch input rate.
// Haiku 5.5 is banded by prompt size: above 100,000 prompt tokens (input + cache read + cache write) every rate is 5x,
// as lab007-economy/batch.mjs usageCost already priced it.
export const PRICES = {
  'claude-haiku-5-5': { short: { in: 0.05, out: 0.25, read: 0.005, w5: 0.0625, w1: 0.1 }, long: { in: 0.25, out: 1.25, read: 0.025, w5: 0.3125, w1: 0.5 }, longOver: 100000 },
  'claude-sonnet-5-5': { short: { in: 1, out: 5, read: 0.05, w5: 1.25, w1: 2 }, long: null, longOver: Infinity },
  // gpt-6-luna (OpenAI through the LiteLLM gateway, LI42). Source: the gateway's model table (GET /model/info), read
  // 2026-11-23; NOT an invoice and not OpenAI's own price page. The table gives batch in 5e-8 / out 2.5e-7 per token
  // (input_/output_cost_per_token_batches) and the same for the flex tier (*_flex), so batch and flex share one price.
  // Above 272,000 prompt tokens the table has standard 2e-7 / 7.5e-7 and flex 1e-7 / 3.75e-7 (*_above_272k_tokens[_flex]);
  // it has no batch entry for that band, so the batch long band is taken as the flex one (half of standard, as below the
  // band). Cache read: flex 5e-9, above 272k 1e-8. OpenAI usage reports no cache writes; w5/w1 carry the table's flex
  // cache-creation rate (6.25e-8, above 272k 1.25e-7) only so a cache write, should one ever appear, is never free.
  // The band applies like Haiku's: prompt tokens (input + cache read) above longOver price every token at the long rates.
  'gpt-6-luna': { short: { in: 0.05, out: 0.25, read: 0.005, w5: 0.0625, w1: 0.0625 }, long: { in: 0.10, out: 0.375, read: 0.01, w5: 0.125, w1: 0.125 }, longOver: 272000, source: 'LiteLLM gateway /model/info, 2026-11-23 (not an invoice)' },
};
// Largest max_tokens the API accepts (Haiku 5.5: the API's own 400 answer on 2026-11-20, "> 128000, which is the maximum").
// gpt-6-luna: max_output_tokens 128000 in the gateway's model table (2026-11-23).
export const OUTPUT_LIMIT = { 'claude-haiku-5-5': 128000, 'gpt-6-luna': 128000 };

export function priceFor(model) {
  const p = PRICES[model];
  if (!p) throw new Error(`No registered batch price for model ${model}; add it to pricing.mjs from the official table before any paid call`);
  return p;
}
const bandOf = (p, promptTokens) => (p.long && promptTokens > p.longOver ? p.long : p.short);

// Cost of one result's usage at the model's own batch rates, with the prompt-size band.
export function usageCostFor(model, u) {
  const p = priceFor(model), input = u.input_tokens || 0, read = u.cache_read_input_tokens || 0, write = u.cache_creation_input_tokens || 0, output = u.output_tokens || 0;
  const r = bandOf(p, input + read + write), hour = u.cache_creation?.ephemeral_1h_input_tokens || 0, five = write - hour;
  return (input * r.in + read * r.read + five * r.w5 + hour * r.w1 + output * r.out) / 1e6;
}

// Reserve for one request from its MEASURED input tokens (token-count endpoint): 1.5 x (1.1 x tokens at the band those
// tokens fall in + the request's own max_tokens at that band's output rate). No cache discount is assumed. A prompt within
// 10% of the band edge is reserved at the expensive band.
export function reserveMeasured(params, inputTokens, { margin = 1.1, safety = 1.5 } = {}) {
  const p = priceFor(params.model);
  if (!Number.isFinite(inputTokens) || inputTokens <= 0) throw new Error('A measured input token count is required to reserve');
  const limit = OUTPUT_LIMIT[params.model];
  if (!Number.isInteger(params.max_tokens) || params.max_tokens < 1 || (limit && params.max_tokens > limit)) throw new Error(`max_tokens must be set by the study, 1 to ${limit || 'the model limit'}`);
  if (params.tools) throw new Error('Unapproved request shape (tools)');
  const band = bandOf(p, inputTokens * margin);
  return { inputTokens, band: band === p.short ? 'short' : 'long', usd: ((inputTokens * margin) * band.in + params.max_tokens * band.out) / 1e6 * safety };
}

// Measure every request through `count(params) -> input_tokens`, one call per distinct prompt (content-hash cache), with
// bounded concurrency; order is kept.
export async function measureRows(rows, count, { concurrency = 8, cache = new Map(), hashFn } = {}) {
  const out = new Array(rows.length); let next = 0;
  async function worker() { while (next < rows.length) { const i = next++, h = hashFn(rows[i].params); if (!cache.has(h)) cache.set(h, Promise.resolve(count(rows[i].params))); out[i] = await cache.get(h); } }
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker));
  return out;
}
