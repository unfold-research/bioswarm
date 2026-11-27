// A stand-in for library/cards/batch-api.mjs in tests (anthropic-path.test.mjs): Message Batches answered in-process by
// the fake model of openai-fake.mjs, no network, no key. Loaded through anthropic-fake-hooks.mjs, so the runner under
// test is the real file, unmodified. Every createBatch input is what the runner would have sent to Anthropic.
import fs from 'node:fs';
import { fakeAnswer } from './openai-fake.mjs';
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), batches = new Map(), cache = new Map(); let n = 0;
export async function createBatch(requests) { const id = `msgbatch_fake${++n}`; batches.set(id, requests); return { id }; }
export async function waitForBatch(id) { return { id, processing_status: 'ended' }; }
export async function fetchBatchResults(b) {
  return batches.get(b.id).map((r) => {
    const body = { messages: r.params.messages, response_format: { json_schema: { schema: r.params.output_config.format.schema } } }, text = JSON.stringify(fakeAnswer({ body, cfg, cache }));
    return { custom_id: r.custom_id, result: { type: 'succeeded', message: { model: cfg.model, content: [{ type: 'text', text }], usage: { input_tokens: 100, output_tokens: 50 }, stop_reason: 'end_turn' } } };
  });
}
export async function countTokens(p) { return Math.ceil(Buffer.byteLength(JSON.stringify(p)) / 3); }
