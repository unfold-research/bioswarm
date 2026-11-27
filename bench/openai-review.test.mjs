import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseBits, requireOpenAIJudge, reviewOne, runBatch } from './openai-review.mjs';

const frozen = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const digest = (name) => createHash('sha256').update(frozen(name)).digest('hex');
const prompt = frozen('./memo-review-v2.pt.md');
const { cases, referencia } = JSON.parse(frozen('./memo-calibration-v2.json'));
const { uuid, expected, memorando } = cases[0];
const packet = { uuid, referencia, memorando };
const model = { provider: 'openai', id: 'gpt-6-luna' };
const pass = { model: model.id, effort: 'medium', promptHash: digest('./memo-review-v2.pt.md'),
  controlHash: digest('./memo-calibration-v2.json'), auth: 'openai-subscription', validMemos: 8,
  totalItems: 64, correctItems: 64, passed: true, receiptHashes: cases.map(({ uuid }) => createHash('sha256').update(uuid).digest('hex')) };
test('the historical Claude receipt, wrong effort, changed controls and incomplete scores cannot authorize OpenAI', () => {
  assert.equal(JSON.parse(frozen('./judge-openai-model.json')).providers.openai.models[0].id, model.id);
  requireOpenAIJudge(pass);
  for (const changed of [JSON.parse(frozen('../results/phase1/JUDGE-CALIBRATION.json')), { ...pass, model: 'gpt-6.2-astra' }, { ...pass, correctItems: 63 },
    { ...pass, effort: 'high' }, { ...pass, controlHash: 'wrong' }, { ...pass, receiptHashes: [] }])
    assert.throws(() => requireOpenAIJudge(changed));
});
test('one subscription request gets just the frozen prompt and a single masked packet with no tools', async () => {
  let calls = 0;
  const runtime = { isUsingOAuth: () => true, isUsingSubscription: () => true,
    completeSimple: async (selected, context, options) => {
      calls++;
      assert.deepEqual(selected, model);
      assert.equal(options.maxRetries, 0);
      assert.equal(options.reasoning, 'medium');
      assert.equal(context.systemPrompt, prompt);
      assert.equal(context.messages.length, 1);
      assert.deepEqual(JSON.parse(context.messages[0].content), packet);
      assert.ok(!context.tools);
      options.onPayload({ model: model.id, reasoning: { effort: 'medium' }, store: false });
      return { model: model.id, responseModel: model.id, stopReason: 'stop', content: [{ type: 'text', text: JSON.stringify(expected) }] };
    } };
  const reply = await reviewOne({ runtime, model, prompt, packet });
  assert.deepEqual(reply.bits, expected);
  await assert.rejects(() => reviewOne({ runtime: { ...runtime, isUsingSubscription: () => false }, model, prompt, packet }));
  assert.equal(calls, 1);
  assert.equal(parseBits('bad JSON'), null);
  assert.equal(parseBits(JSON.stringify({ ...expected, log: true })), null);
});
test('valid negative and malformed replies stay final; a documented zero-output 429 permits one identical retry', async () => {
  const entries = [{ packet, expected }];
  for (const bits of [expected, null]) {
    const out = mkdtempSync(join(tmpdir(), 'svc-judge-'));
    const [row] = await runBatch({ out, entries, call: async () => ({ bits, technical: false }) });
    assert.equal(row.valid, Boolean(bits));
    await runBatch({ out, entries, retryId: uuid, call: () => assert.fail('Duplicate request') });
  }
  const out = mkdtempSync(join(tmpdir(), 'svc-judge-'));
  await assert.rejects(runBatch({ out, entries, call: async () => ({ technical: true, rejectedBeforeResponse: true }) }), /429/);
  const [row] = await runBatch({ out, entries, retryId: uuid, call: async () => ({ bits: expected, technical: false }) });
  assert.equal(row.correct, 8);
  assert.equal(row.ordinal, 2);
  await runBatch({ out, entries, call: () => assert.fail('Duplicate request') });
});
