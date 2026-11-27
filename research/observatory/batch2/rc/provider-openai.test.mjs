// Checks for the openai-litellm provider adapter (LI42), offline: no key, no network, no ledger.
// Run: node --test observatory/batch2/rc/provider-openai.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as W from './code.mjs';
import * as P from './provider-openai.mjs';
import * as PA from './pilot-accounting.mjs';
import { fakeFetch, fakeAnswer, oracleFn } from './openai-fake.mjs';
import { makeClient, mask } from '../../../library/cards/openai-litellm-api.mjs';
import { usageCostFor, reserveMeasured } from '../../lab007-economy/pricing.mjs';

const spec = JSON.parse(fs.readFileSync(new URL('./sweeps/LI42.json', import.meta.url), 'utf8'));
const shape = { local: 2, directed: 12, symmetric: 4, tests: 4, shown: 3 };
const inst = W.makeInstance(8, 42390, shape);
const vs = W.check(inst, new Array(8).fill(''), { strict: true });

test('translation: member and manager requests become Chat Completions bodies with the spec values', () => {
  const member = W.memberRequest('gpt-6-luna', inst, 2, new Array(8).fill(''), vs.filter((v) => v.parts.includes(2)), spec.base.memberMax, { effort: spec.base.effort });
  const b = P.toOpenAIBody(member);
  assert.deepEqual(Object.keys(b), ['model', 'messages', 'reasoning_effort', 'max_completion_tokens', 'response_format']);
  assert.equal(b.model, 'gpt-6-luna'); assert.equal(b.reasoning_effort, 'medium'); assert.equal(b.max_completion_tokens, 8000);
  assert.deepEqual(b.messages, member.messages, 'the prompt is sent unchanged');
  assert.equal(b.response_format.type, 'json_schema'); assert.equal(b.response_format.json_schema.strict, true);
  assert.deepEqual(b.response_format.json_schema.schema, member.output_config.format.schema, 'the schema is sent unchanged');
  assert.ok(!('output_config' in b) && !('max_tokens' in b) && !('service_tier' in b));
  const plan = P.toOpenAIBody(W.managerRequest('gpt-6-luna', inst, vs, spec.base.managerMax, spec.base.effort));
  assert.equal(plan.max_completion_tokens, 128000); assert.equal(plan.reasoning_effort, 'medium'); assert.equal(plan.response_format.json_schema.name, 'rc_assignments');
  assert.deepEqual(P.flexBody(plan), { ...plan, service_tier: 'flex' });
  assert.deepEqual(P.batchLine('x', plan), { custom_id: 'x', method: 'POST', url: '/v1/chat/completions', body: plan });
  // no effort, an unknown effort, no output limit, a system prompt or thinking: refused before any call
  assert.throws(() => P.toOpenAIBody(W.memberRequest('gpt-6-luna', inst, 2, new Array(8).fill(''), [], 8000, {})), /reasoning_effort/);
  assert.throws(() => P.toOpenAIBody({ ...member, output_config: { ...member.output_config, effort: 'extreme' } }), /reasoning_effort/);
  assert.throws(() => P.toOpenAIBody({ ...member, max_tokens: undefined }), /output limit/);
  assert.throws(() => P.toOpenAIBody({ ...member, system: 'x' }), /system/);
  assert.throws(() => P.toOpenAIBody({ ...member, thinking: { type: 'enabled' } }), /thinking/);
});

test('strict schema: every rc schema already meets OpenAI strict rules (no change); a loose one is caught', () => {
  for (const s of [W.CODE_SCHEMA, W.CODE_CHAT_SCHEMA, W.TRACE_SCHEMA, W.CODE_TRACE_SCHEMA, W.SOLO_SCHEMA, W.MANAGER_SCHEMA]) { const r = P.strictSchema(s); assert.deepEqual(r.changes, []); assert.deepEqual(r.schema, s); }
  const loose = { type: 'object', properties: { a: { type: 'string' }, b: { type: 'object', properties: { c: { type: 'string' } } } }, required: ['a'] };
  const r = P.strictSchema(loose);
  assert.equal(r.changes.length, 4); assert.deepEqual(r.schema.required, ['a', 'b']); assert.equal(r.schema.properties.b.additionalProperties, false);
  assert.throws(() => P.toOpenAIBody({ model: 'gpt-6-luna', max_tokens: 10, output_config: { format: { type: 'json_schema', schema: loose }, effort: 'medium' }, messages: [{ role: 'user', content: 'x' }] }), /instrument change/);
});

test('results: usage, stop reason, returned model and effort map to the runner shape', () => {
  const body = P.toOpenAIBody(W.managerRequest('gpt-6-luna', inst, vs, 128000, 'medium'));
  const resp = { id: 'c1', model: 'gpt-6-luna-2026-11-01', service_tier: 'flex', choices: [{ finish_reason: 'stop', message: { content: '{"assignments":[]}', refusal: null } }],
    usage: { prompt_tokens: 1200, completion_tokens: 900, prompt_tokens_details: { cached_tokens: 200 }, completion_tokens_details: { reasoning_tokens: 700 } } };
  const x = P.normalizeCompletion('manager-k8s1-w1-plan', resp, body, 'flex', 'gpt-6-luna'), m = x.result.message;
  assert.equal(x.result.type, 'succeeded'); assert.equal(x.transport, 'flex');
  assert.deepEqual(m.usage, { input_tokens: 1000, cache_read_input_tokens: 200, cache_creation_input_tokens: 0, output_tokens: 900, output_tokens_details: { thinking_tokens: 700 } });
  assert.equal(m.model, 'gpt-6-luna-2026-11-01'); assert.equal(m.priced_as, 'gpt-6-luna'); assert.equal(m.reasoning_effort, 'medium'); assert.equal(m.max_completion_tokens, 128000);
  assert.equal(m.content[0].text, '{"assignments":[]}'); assert.equal(m.stop_reason, 'end_turn');
  assert.ok(Math.abs(usageCostFor('gpt-6-luna', m.usage) - (1000 * 0.05 + 200 * 0.005 + 900 * 0.25) / 1e6) < 1e-15);
  assert.equal(P.stopOf({ finish_reason: 'length' }), 'max_tokens'); assert.equal(P.stopOf({ finish_reason: 'content_filter' }), 'refusal'); assert.equal(P.stopOf({ finish_reason: 'stop', message: { refusal: 'no' } }), 'refusal');
  // batch lines: a 200, an error-file line, a 400 refusal
  const sent = new Map([['a', body], ['b', body], ['c', body]]);
  assert.equal(P.normalizeBatchLine({ custom_id: 'a', response: { status_code: 200, body: resp } }, sent, 'gpt-6-luna').result.type, 'succeeded');
  const e5 = P.normalizeBatchLine({ custom_id: 'b', response: { status_code: 500, body: { error: { message: 'upstream' } } } }, sent, 'gpt-6-luna');
  assert.equal(e5.result.type, 'errored'); assert.equal(e5.result.error.refusal, null); assert.equal(e5.result.reasoning_effort, 'medium');
  const e4 = P.normalizeBatchLine({ custom_id: 'c', response: { status_code: 400, body: { error: { message: 'Unsupported value: reasoning_effort medium', param: 'reasoning_effort' } } } }, sent, 'gpt-6-luna');
  assert.deepEqual(P.refusalsOf([e4]).map((r) => r.param), ['reasoning_effort']);
});

test('refusal detection: parameter refusals are a stop rule, other errors are not', () => {
  const r = (status, error) => P.classifyRefusal(status, error)?.param ?? null;
  assert.equal(r(400, { param: 'max_completion_tokens', message: 'max_completion_tokens is too large: 128000' }), 'max_completion_tokens');
  assert.equal(r(400, { message: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead." }), 'max_completion_tokens');
  assert.equal(r(400, { message: "Unsupported value: 'reasoning_effort' does not support 'medium' with this model." }), 'reasoning_effort');
  assert.equal(r(400, { message: "Invalid schema for response_format 'rc_code'" }), 'response_format');
  assert.equal(r(400, { message: 'json_schema strict mode is not available' }), 'response_format');
  assert.equal(r(400, { param: 'service_tier', message: 'flex is not available' }), 'service_tier');
  assert.equal(r(422, { message: 'Unsupported parameter: temperature' }), 'unknown');
  assert.equal(r(429, { message: 'max_completion_tokens rate limit' }), null);
  assert.equal(r(500, { message: 'reasoning_effort upstream error' }), null);
  assert.equal(r(400, { message: 'Your prompt was flagged' }), null);
});

test('reserve estimate: never below bytes / 3, the gateway count wins when larger, calibration only rises', () => {
  const body = P.toOpenAIBody(W.managerRequest('gpt-6-luna', inst, vs, 128000, 'medium'));
  const bytes3 = Math.ceil(Buffer.byteLength(JSON.stringify(body.messages)) / 3);
  assert.ok(P.estimateTokens(body) > bytes3); assert.equal(P.estimateTokens(body, bytes3 * 2) - P.estimateTokens(body), bytes3);
  assert.equal(P.calibration({}), 1);
  assert.equal(P.calibration({ '0.0': { status: 'complete', measuredInputTokens: 1000, actualInputTokens: 800 } }), 1);
  assert.ok(Math.abs(P.calibration({ '0.0': { status: 'complete', measuredInputTokens: 1000, actualInputTokens: 1200 }, '1.0': { status: 'submitted', measuredInputTokens: 1, actualInputTokens: 9 } }) - 1.32) < 1e-12);
  // the reserve covers a reply that uses all 128,000 output tokens with a prompt up to the estimate
  const t = P.estimateTokens(body), params = W.managerRequest('gpt-6-luna', inst, vs, 128000, 'medium');
  assert.ok(reserveMeasured(params, t).usd >= usageCostFor('gpt-6-luna', { input_tokens: t, output_tokens: 128000 }));
});

test('stop rules: each one stops the pilot alone; a clean pilot passes', () => {
  const base = { pilotCostUsd: 0.6, startWaveUsd: 0.05, cases: 12, studyCapUsd: 11, solved: { stigwait: true, manager: false } };
  const ok = P.pilotGate(base);
  assert.equal(ok.pass, true); assert.equal(ok.rules.a_projectedCost.projectedUsd, 7.2);
  const a = P.pilotGate({ ...base, pilotCostUsd: 0.95 });
  assert.deepEqual(a.stops, ['a_projectedCost']); assert.equal(a.rules.a_projectedCost.projectedUsd, 11.4);
  assert.equal(P.pilotGate({ ...base, pilotCostUsd: 11 / 12 }).pass, true, 'exactly at the cap is not above it');
  assert.deepEqual(P.pilotGate({ ...base, refusals: [{ param: 'max_completion_tokens' }] }).stops, ['b_refusal']);
  assert.deepEqual(P.pilotGate({ ...base, transportFailed: { error: 'batch and flex failed' } }).stops, ['b_refusal']);
  assert.deepEqual(P.pilotGate({ ...base, solved: { stigwait: false, manager: false } }).stops, ['c_floor']);
  assert.equal(P.pilotGate({ ...base, solved: { stigwait: false, manager: false }, stopIfNoArmSolves: false }).pass, true);
  assert.deepEqual(P.pilotGate({ ...base, capStopped: true }).stops, ['pilotCap']);
  assert.equal(P.pilotGate({ ...base, pilotCostUsd: NaN }).pass, false, 'an unknown cost never passes');
});

test('transport plan: required before the first study wave, written once, never switched mid-run', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'li42-plan-')), cfg = { requireTransportPlan: true };
  try {
    assert.throws(() => P.transportFor({ cfg, out, k: 0 }), /no transport plan/);
    assert.ok(!fs.existsSync(path.join(out, 'transport.json')), 'no wave starts without a plan');
    const plan = P.writePlan(path.join(out, 'transport-plan.json'), { transport: 'batch', reason: 'pilot ran on batch' });
    assert.equal(plan.transport, 'batch'); assert.ok(Date.parse(plan.decidedAt));
    assert.equal(P.transportFor({ cfg, out, k: 0 }).mode, 'batch');
    assert.ok(Date.parse(plan.decidedAt) <= Date.parse(JSON.parse(fs.readFileSync(path.join(out, 'transport.json'), 'utf8')).history[0].at), 'the plan predates wave 0');
    assert.equal(P.writePlan(path.join(out, 'transport-plan.json'), { transport: 'batch', reason: 'again' }).decidedAt, plan.decidedAt, 'the same plan again is a no-op');
    assert.throws(() => P.writePlan(path.join(out, 'transport-plan.json'), { transport: 'flex', reason: 'switch' }), /refusing to switch/);
    // a plan edited by hand after the run started is refused at the next wave
    fs.writeFileSync(path.join(out, 'transport-plan.json'), JSON.stringify({ ...plan, transport: 'flex' }));
    assert.throws(() => P.transportFor({ cfg, out, k: 3 }), /switch mid-run/);
    assert.equal(P.transportFor({ cfg: {}, out: fs.mkdtempSync(path.join(os.tmpdir(), 'li42-pilot-')), k: 0 }).mode, 'batch', 'the pilot starts on batch');
    assert.throws(() => P.writePlan(path.join(out, 'x.json'), { transport: 'sync' }), /batch or flex/);
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

test('client: errors never carry the key or the Authorization header', async () => {
  const key = 'not-a-real-key-li42-0123456789';
  const fetchImpl = async (url, init) => new Response(JSON.stringify({ error: { message: `bad key ${init.headers.authorization}; key=${key}` } }), { status: 401 });
  const c = makeClient({ fetchImpl, base: 'http://x.invalid', apiKey: key });
  await assert.rejects(c.chat({}), (e) => { assert.ok(!e.message.includes(key) && !JSON.stringify(e.error).includes(key)); assert.match(e.message, /Bearer \*\*\*|\*\*\*/); assert.equal(e.definite, true); return true; });
  const down = makeClient({ fetchImpl: async () => { throw new Error(`connect failed Authorization: Bearer ${key}`); }, base: 'http://x.invalid', apiKey: key });
  await assert.rejects(down.chat({}), (e) => !e.message.includes(key) && e.definite === false);
  assert.equal(mask(`x ${key} y`, key), 'x *** y');
});

// runPart over the fake gateway with ledger doubles
function harness({ mode = 'ok', fallback = true, cfg, tmode = 'batch', remote = {} }) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'li42-part-')), calls = [], j = {}, http = [];
  const ledger = Object.fromEntries(['reserveWaves', 'attachActualManifest', 'markSubmitted', 'reconcileWave', 'releaseUnsubmitted'].map((f) => [f, async (x) => { calls.push([f, x]); }]));
  const journal = { get: async (k) => j[k], set: async (k, p) => (j[k] = { ...(j[k] || {}), ...p }) };
  fs.writeFileSync(path.join(out, 'transport.json'), JSON.stringify({ mode: tmode, history: [] }));
  const api = makeClient({ fetchImpl: fakeFetch({ mode, cfg, remote, trace: (x) => http.push(x) }), base: 'http://fake.invalid', apiKey: 'fake' });
  return { out, calls, j, http, run: (part) => P.runPart({ k: 1, i: 0, part, out, api, ledger, journal, configHash: 'h', mh: 'm', name: 'zz-wave-1-p0', transport: { mode: JSON.parse(fs.readFileSync(path.join(out, 'transport.json'))).mode, fallback, file: path.join(out, 'transport.json') }, usageCost: (u) => usageCostFor('gpt-6-luna', u), pricedAs: 'gpt-6-luna', pollMs: 1, flex: { concurrency: 2, retries: 1, backoffMs: 1 } }) };
}
const cfgK8 = { k: 8, cases: 1, seed0: 42390, shape };
const rowsK8 = () => { const code = new Array(8).fill(''); return [0, 1, 2].map((m) => ({ custom_id: `stigwait-k8s42390-w1-m${m}`, m, params: W.memberRequest('gpt-6-luna', inst, m, code, vs.filter((v) => v.parts.includes(m)), 8000, { effort: 'medium' }) }))
  .concat([{ custom_id: 'manager-k8s42390-w1-plan', m: 'plan', params: W.managerRequest('gpt-6-luna', inst, vs, 128000, 'medium') }])
  .map((q) => { const body = P.toOpenAIBody(q.params), t = P.estimateTokens(body); return { ...q, body, inputTokens: t, reserveUsd: reserveMeasured(q.params, t).usd }; }); };

test('batch transport end to end (fake gateway): JSONL, upload, batch, poll, output file, ledger reserve -> reconcile', async () => {
  const h = harness({ cfg: cfgK8 });
  try {
    const r = await h.run(rowsK8());
    assert.equal(r.transport, 'batch'); assert.equal(r.raw.length, 4); assert.ok(r.raw.every((x) => x.result.type === 'succeeded' && x.transport === 'batch'));
    assert.deepEqual(h.calls.map((c) => c[0]), ['reserveWaves', 'attachActualManifest', 'markSubmitted', 'reconcileWave']);
    const rec = h.calls.at(-1)[1]; assert.equal(rec.resultCount, 4); assert.ok(rec.actualUsd > 0 && rec.actualUsd < h.calls[0][1].waves[0].reserveUsd);
    const sent = fs.readFileSync(path.join(h.out, 'wave-1-p0.requests.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual(sent[3], P.batchLine('manager-k8s42390-w1-plan', rowsK8()[3].body));
    assert.equal(r.raw[3].result.message.model, 'gpt-6-luna-fake'); assert.equal(r.raw[3].result.message.reasoning_effort, 'medium'); assert.equal(r.raw[3].result.message.max_completion_tokens, 128000);
    assert.equal(h.j['1.0'].status, 'complete'); assert.ok(h.j['1.0'].actualInputTokens > 0);
    const again = await h.run(rowsK8()); assert.equal(h.calls.length, 4, 'a resumed part is read from disk, not sent again'); assert.equal(again.raw.length, 4);
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
});

test('pilot: a batch that the gateway refuses falls back to flex under its own ledger entry, and the switch is recorded', async () => {
  const h = harness({ mode: 'batch-down', cfg: cfgK8 });
  try {
    const r = await h.run(rowsK8());
    assert.equal(r.transport, 'flex'); assert.ok(r.raw.every((x) => x.result.type === 'succeeded' && x.transport === 'flex' && x.result.message.service_tier === 'flex'));
    assert.deepEqual(h.calls.map((c) => [c[0], c[1].name || c[1].waves?.[0].name]), [['reserveWaves', 'zz-wave-1-p0'], ['attachActualManifest', 'zz-wave-1-p0'], ['releaseUnsubmitted', 'zz-wave-1-p0'], ['reserveWaves', 'zz-wave-1-p0-flex'], ['attachActualManifest', 'zz-wave-1-p0-flex'], ['markSubmitted', 'zz-wave-1-p0-flex'], ['reconcileWave', 'zz-wave-1-p0-flex']]);
    const tf = JSON.parse(fs.readFileSync(path.join(h.out, 'transport.json'), 'utf8')); assert.equal(tf.mode, 'flex'); assert.equal(tf.switchedWave, 1); assert.match(tf.switchReason, /HTTP 404/);
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
});

test('study: no fallback; a failed batch is a transport failure, and flex that never answers is too', async () => {
  const h = harness({ mode: 'batch-down', fallback: false, cfg: cfgK8 });
  try { await assert.rejects(h.run(rowsK8()), (e) => e.code === 'TRANSPORT'); } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
  const f = harness({ mode: 'flex-down', cfg: cfgK8 });
  try { await assert.rejects(f.run(rowsK8()), (e) => e.code === 'TRANSPORT' && /flex transport failed/.test(e.message)); assert.equal(f.calls.at(-1)[0], 'reconcileWave'); } finally { fs.rmSync(f.out, { recursive: true, force: true }); }
});

test('a refused 128k output limit comes back as a refusal (batch error file and flex 400)', async () => {
  const h = harness({ mode: 'refuse-128k', cfg: cfgK8 });
  try {
    const r = await h.run(rowsK8());
    assert.deepEqual(r.refusals.map((x) => [x.custom_id, x.param]), [['manager-k8s42390-w1-plan', 'max_completion_tokens']]);
    assert.ok(fs.existsSync(path.join(h.out, 'wave-1-p0.openai-errors.jsonl')));
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
  const f = harness({ mode: 'refuse-128k', cfg: cfgK8 });
  fs.writeFileSync(path.join(f.out, 'transport.json'), JSON.stringify({ mode: 'flex', history: [] }));
  try { const r = await f.run(rowsK8()); assert.equal(r.transport, 'flex'); assert.deepEqual(r.refusals.map((x) => x.param), ['max_completion_tokens']); } finally { fs.rmSync(f.out, { recursive: true, force: true }); }
});

test('flex: a call sent with no recorded outcome (crash mid-call) is uncertain and never resent', async () => {
  const h = harness({ cfg: cfgK8 }); fs.writeFileSync(path.join(h.out, 'transport.json'), JSON.stringify({ mode: 'flex', history: [] }));
  try {
    const rows = rowsK8(); h.j['1.0'] = { manifestHash: 'm', status: 'intent', transport: 'flex', ledgerName: 'zz-wave-1-p0', reserveUsd: 1 };
    fs.writeFileSync(path.join(h.out, 'wave-1-p0.flex.jsonl'), JSON.stringify({ event: 'sent', custom_id: rows[0].custom_id, attempt: 0 }) + '\n');
    await assert.rejects(h.run(rows), /uncertain, not retried/);
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
});

// LI42 defect fix: a batch that ends cancelled or expired keeps its results and sends exactly the missing ones on flex
const ledgerNames = (calls) => calls.map((c) => [c[0], c[1].name || c[1].waves?.[0].name]);
// reattach: the LI42 restart case, a batch submitted on batch before the runner restarted with transport.json already on
// flex (Amendment 1); the journal entry is the one reconstructed from the ledger, the batch is one the fake did not create
async function partialCase({ mode = 'ok', end, tmode, fallback, reattach = false, tail = 'notexec' }) {
  const rows = rowsK8(), remote = reattach ? { batch_li42_remote: { input: rows.map((q) => JSON.stringify(P.batchLine(q.custom_id, q.body))).join('\n') + '\n', end, tail } } : {};
  const h = harness({ mode, cfg: cfgK8, tmode, fallback, remote });
  if (reattach) h.j['1.0'] = { manifestHash: 'm', requestCount: 4, reserveUsd: rows.reduce((n, q) => n + q.reserveUsd, 0), measuredInputTokens: 1, batchId: 'batch_li42_remote', status: 'submitted', transport: 'batch', ledgerName: 'zz-wave-1-p0', provider: P.PROVIDER };
  try {
    const r = await h.run(rows), usage = (u) => usageCostFor('gpt-6-luna', u);
    // the batch answered the first half (2 of 4); the other two are in its error file, as not executed (the real shape of
    // a cancelled batch) or, tail '500', as HTTP 500 server errors while request_counts says failed 0 (LI42 pilot wave 0)
    const errs = fs.readFileSync(path.join(h.out, 'wave-1-p0.openai-errors.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    if (tail === '500') {
      assert.deepEqual(errs.map((x) => [x.custom_id, x.response.status_code, x.response.body.error.type]), rows.slice(2).map((q) => [q.custom_id, 500, 'server_error']));
      assert.equal(JSON.parse(fs.readFileSync(path.join(h.out, 'wave-1-p0.batch.json'), 'utf8')).request_counts.failed, 0);
    } else assert.deepEqual(errs.map((x) => [x.custom_id, x.response, x.error.code]), rows.slice(2).map((q) => [q.custom_id, null, end === 'cancelled' ? 'batch_cancelled' : 'batch_expired']));
    assert.deepEqual(P.undeliveredOf(rows, r.raw), [], 'every request has a delivered response (the invariant holds)');
    // its output file lines are kept exactly as returned
    const out = fs.readFileSync(path.join(h.out, 'wave-1-p0.openai-output.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual(out.map((x) => x.custom_id), rows.slice(0, 2).map((q) => q.custom_id));
    const sent = new Map(rows.map((q) => [q.custom_id, q.body]));
    assert.deepEqual(r.raw.slice(0, 2), out.map((x) => P.normalizeBatchLine(x, sent, 'gpt-6-luna')), 'the returned results are untouched');
    assert.deepEqual(r.raw.map((x) => x.custom_id), rows.map((q) => q.custom_id), 'one result per request, in part order');
    assert.deepEqual(r.raw.map((x) => x.transport), ['batch', 'batch', 'flex', 'flex'], 'transport per request');
    assert.ok(r.raw.every((x) => x.result.type === 'succeeded'));
    assert.ok(r.raw.slice(2).every((x) => x.result.message.service_tier === 'flex'));
    // exactly the missing requests were resent, with the same bodies (plus service_tier flex), once each
    assert.equal(h.http.filter((x) => x === 'POST /v1/chat/completions').length, 2);
    assert.equal(h.http.filter((x) => x === 'POST /v1/batches').length, reattach ? 0 : 1);
    const flexLog = fs.readFileSync(path.join(h.out, 'wave-1-p0.flex.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual([...new Set(flexLog.map((x) => x.custom_id))], rows.slice(2).map((q) => q.custom_id));
    assert.equal(r.raw[3].result.message.max_completion_tokens, 128000); assert.equal(r.raw[3].result.message.reasoning_effort, 'medium');
    // ledger: the batch entry reconciled to what it returned, the remainder reserved and reconciled under <name>-flex
    const pre = reattach ? [] : [['reserveWaves', 'zz-wave-1-p0'], ['attachActualManifest', 'zz-wave-1-p0'], ['markSubmitted', 'zz-wave-1-p0']];
    assert.deepEqual(ledgerNames(h.calls), [...pre, ['reconcileWave', 'zz-wave-1-p0'], ['reserveWaves', 'zz-wave-1-p0-flex'], ['attachActualManifest', 'zz-wave-1-p0-flex'], ['markSubmitted', 'zz-wave-1-p0-flex'], ['reconcileWave', 'zz-wave-1-p0-flex']]);
    const [[, recB], [, resF], , [, subF], [, recF]] = h.calls.slice(pre.length);
    const batchUsd = P.costOf(r.raw.slice(0, 2), usage).usd, flexUsd = P.costOf(r.raw.slice(2), usage).usd;
    assert.equal(recB.resultCount, 4); assert.ok(Math.abs(recB.actualUsd - batchUsd) < 1e-15 && batchUsd > 0);
    assert.equal(resF.waves[0].requestCount, 2); assert.ok(Math.abs(resF.waves[0].reserveUsd - rows[2].reserveUsd - rows[3].reserveUsd) < 1e-12); assert.equal(resF.studyHash, 'h');
    assert.equal(subF.batchId, 'flex-zz-wave-1-p0-flex'); assert.equal(recF.resultCount, 2); assert.ok(Math.abs(recF.actualUsd - flexUsd) < 1e-15);
    // journal: the part's actual is both entries (the cap checks read it), and which requests went on flex, and why
    const e = h.j['1.0'];
    assert.equal(e.status, 'complete'); assert.ok(Math.abs(e.actualUsd - batchUsd - flexUsd) < 1e-15); assert.equal(e.batchEnd.status, end);
    assert.deepEqual(e.flexRemainder.custom_ids, rows.slice(2).map((q) => q.custom_id)); assert.match(e.flexRemainder.why, new RegExp(`ended ${end} with 2 of 4 results`));
    assert.deepEqual(r.flexRemainder.custom_ids, e.flexRemainder.custom_ids);
    // transport.json: a remainder entry in the history naming the requests and the reason
    const tf = JSON.parse(fs.readFileSync(path.join(h.out, 'transport.json'), 'utf8')), last = tf.history.at(-1);
    assert.equal(last.scope, 'remainder'); assert.equal(last.mode, 'flex'); assert.deepEqual(last.custom_ids, e.flexRemainder.custom_ids); assert.match(last.reason, new RegExp(end));
    assert.equal(tf.mode, 'flex');
    // a rerun reads the results from disk: no call, no ledger write
    const n = h.calls.length, m = h.http.length, again = await h.run(rows);
    assert.equal(h.calls.length, n); assert.equal(h.http.length, m); assert.deepEqual(again.raw, r.raw);
    return { h, tf };
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
}

test('not executed: the error-file line of a request a cancelled or expired batch never ran is not a result', () => {
  const real = { id: 'batch_req_6b048458987081908f11c38755b97596', custom_id: 'cc-1', response: null, error: { code: 'batch_cancelled', message: 'This request was not executed because the batch was cancelled.' } };
  assert.equal(P.notExecuted(real), true); assert.equal(P.notExecuted({ ...real, error: { code: 'batch_expired' } }), true);
  assert.equal(P.notExecuted({ custom_id: 'x', response: { status_code: 500, body: {} }, error: null }), false, 'a request that ran and failed is a result');
  assert.equal(P.notExecuted({ custom_id: 'x', response: null, error: { code: 'invalid_request', message: 'bad line' } }), false, 'a refused line is a result');
});

test('a batch cancelled with some results: results kept, exactly the missing requests on flex, per-request transport, two ledger entries', async () => {
  const { tf } = await partialCase({ mode: 'batch-cancel-partial', end: 'cancelled', tmode: 'batch', fallback: true });
  assert.equal(tf.switchedWave, 1, 'a pilot still on batch switches to flex (plan B), as for a failed batch');
});

test('a batch expired with some results: the same (pilot on batch)', async () => {
  await partialCase({ mode: 'batch-expire-partial', end: 'expired', tmode: 'batch', fallback: true });
});

test('LI42 Amendment 3, the exact case: cancelled batch, HTTP 500 lines in the error file, request_counts failed 0: the 500s go to flex', async () => {
  await partialCase({ end: 'cancelled', tmode: 'flex', fallback: false, reattach: true, tail: '500' }); // as on the pilot: re-attached, run on flex
  await partialCase({ mode: 'batch-cancel-5xx', end: 'cancelled', tmode: 'batch', fallback: true, tail: '500' });
});

test('LI42 Amendment 3: transport-class lines are batch failures per request; other errors are results', () => {
  const r = (status) => ({ custom_id: 'x', response: { status_code: status, body: { error: { message: 'e' } } }, error: null });
  for (const s of [500, 502, 503, 504, 429, 408]) assert.ok(P.batchFailedRequest(r(s)), `HTTP ${s} is transport class`);
  for (const s of [200, 400, 401, 404, 409, 422]) assert.equal(P.batchFailedRequest(r(s)), null, `HTTP ${s} is not`);
  assert.equal(P.batchFailedRequest({ custom_id: 'x', response: null, error: { code: 'batch_cancelled' } }), 'not executed');
  assert.equal(P.batchFailedRequest({ custom_id: 'x', response: null, error: { code: 'request_timeout', message: 'Request timed out' } }), 'timeout');
  assert.equal(P.batchFailedRequest({ custom_id: 'x', response: null, error: { code: 'invalid_request', message: 'bad line' } }), null);
  // the invariant: a delivered reply is a completion, whatever its content (an empty or unparseable text is data)
  const ok = (id, text) => P.normalizeCompletion(id, { choices: [{ finish_reason: 'length', message: { content: text } }], usage: {} }, {}, 'batch', 'gpt-6-luna');
  assert.deepEqual(P.undeliveredOf([{ custom_id: 'a' }, { custom_id: 'b' }], [ok('a', ''), ok('b', 'not json {')]), []);
  const und = P.undeliveredOf([{ custom_id: 'a' }, { custom_id: 'b' }, { custom_id: 'c' }], [ok('a', '{}'), P.normalizeError('b', { status: 400, error: { message: 'flagged' } }, {}, 'batch')]);
  assert.deepEqual(und.map((x) => [x.custom_id, x.type, x.status]), [['b', 'errored', 400], ['c', 'missing', null]]);
});

test('LI42 Amendment 3: a 400 inside a cancelled batch is not resent (only the 500s go to flex) and leaves the wave undelivered', async () => {
  const h = harness({ mode: 'batch-cancel-5xx-400', cfg: cfgK8, tmode: 'batch', fallback: true });
  try {
    const rows = rowsK8(), r = await h.run(rows);
    assert.deepEqual(r.raw.map((x) => [x.transport, x.result.type, x.result.error?.status ?? null]), [['batch', 'succeeded', null], ['batch', 'errored', 400], ['flex', 'succeeded', null], ['flex', 'succeeded', null]]);
    assert.equal(h.http.filter((x) => x === 'POST /v1/chat/completions').length, 2, 'only the two HTTP 500 requests are resent');
    assert.deepEqual(r.refusals, [], 'not a parameter refusal');
    assert.deepEqual(P.undeliveredOf(rows, r.raw).map((x) => x.custom_id), [rows[1].custom_id], 'the runner stops on it before applying the wave');
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
});

test('LI42 restart: re-attached to a batch submitted before, run already on flex (Amendment 1), batch expired or cancelled partway: the same, no new batch', async () => {
  await partialCase({ end: 'cancelled', tmode: 'flex', fallback: false, reattach: true });
  const { tf } = await partialCase({ end: 'expired', tmode: 'flex', fallback: false, reattach: true });
  assert.equal(tf.switchedWave, undefined, 'the mode was already flex; only the history records the remainder');
});

test('a cancelled batch with no result: nothing is resent, the part stops for the Research Leader', async () => {
  for (const [tmode, fallback, reattach] of [['batch', true, false], ['flex', false, true]]) {
    const rows = rowsK8(), remote = reattach ? { batch_li42_remote: { input: rows.map((q) => JSON.stringify(P.batchLine(q.custom_id, q.body))).join('\n') + '\n', end: 'cancelled', answered: 0 } } : {};
    const h = harness({ mode: reattach ? 'ok' : 'batch-cancel-empty', cfg: cfgK8, tmode, fallback, remote });
    if (reattach) h.j['1.0'] = { manifestHash: 'm', requestCount: 4, reserveUsd: 1, batchId: 'batch_li42_remote', status: 'submitted', transport: 'batch', ledgerName: 'zz-wave-1-p0' };
    try {
      await assert.rejects(h.run(rows), (e) => e.code === 'TRANSPORT' && e.leader === true && e.batchStatus === 'cancelled' && /no result/.test(e.message) && /Research Leader/.test(e.message));
      assert.equal(h.http.filter((x) => x === 'POST /v1/chat/completions').length, 0, 'no flex call');
      assert.deepEqual(ledgerNames(h.calls), [...(reattach ? [] : [['reserveWaves', 'zz-wave-1-p0'], ['attachActualManifest', 'zz-wave-1-p0'], ['markSubmitted', 'zz-wave-1-p0']]), ['reconcileWave', 'zz-wave-1-p0']]);
      assert.equal(h.calls.at(-1)[1].actualUsd, 0);
      assert.equal(h.j['1.0'].status, 'batch-ended-empty');
      assert.equal(JSON.parse(fs.readFileSync(path.join(h.out, 'transport.json'), 'utf8')).mode, tmode, 'no switch');
      const n = h.http.length; // a restart stops again without calling anything
      await assert.rejects(h.run(rows), (e) => e.leader === true); assert.equal(h.http.length, n);
    } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
  }
});

test('a study fixed on batch: a partial cancelled batch is reconciled and stops; flex would switch mid-run', async () => {
  const h = harness({ mode: 'batch-cancel-partial', cfg: cfgK8, tmode: 'batch', fallback: false });
  try {
    await assert.rejects(h.run(rowsK8()), (e) => e.leader === true && /transport plan is batch/.test(e.message));
    assert.equal(h.http.filter((x) => x === 'POST /v1/chat/completions').length, 0);
    assert.equal(h.calls.at(-1)[0], 'reconcileWave'); assert.ok(h.calls.at(-1)[1].actualUsd > 0);
    assert.equal(h.j['1.0'].status, 'batch-partial-stopped'); assert.equal(h.j['1.0'].batchEnd.missing.length, 2);
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
});

test('a remainder interrupted after its reserve resumes without a second reserve or resending finished calls', async () => {
  const h = harness({ mode: 'batch-cancel-partial', cfg: cfgK8, tmode: 'batch', fallback: true });
  try {
    const rows = rowsK8(), api0 = h.run;
    let r = await api0(rows); // a complete run, then rewound to the state after the remainder's reserve with one flex call done
    const full = r.raw, flexLog = path.join(h.out, 'wave-1-p0.flex.jsonl');
    const kept = fs.readFileSync(flexLog, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.custom_id === rows[2].custom_id);
    fs.writeFileSync(flexLog, kept.map((x) => JSON.stringify(x)).join('\n') + '\n'); fs.rmSync(path.join(h.out, 'wave-1-p0.results.jsonl'));
    const { actualUsd, flexRemainder, ...rest } = h.j['1.0']; h.j['1.0'] = { ...rest, status: 'batch-partial', flexRemainder: { ...flexRemainder, actualUsd: undefined, reconciled: undefined } };
    const n = h.calls.length, posts = h.http.filter((x) => x.startsWith('POST')).length;
    r = await api0(rows);
    assert.deepEqual(ledgerNames(h.calls.slice(n)), [['reconcileWave', 'zz-wave-1-p0-flex']], 'no new reserve, no new batch entry');
    assert.deepEqual(h.http.filter((x) => x.startsWith('POST')).slice(posts), ['POST /v1/chat/completions'], 'only the one unfinished request is sent');
    assert.deepEqual(r.raw.map((x) => x.transport), ['batch', 'batch', 'flex', 'flex']); assert.deepEqual(r.raw.slice(0, 3), full.slice(0, 3));
    assert.equal(h.j['1.0'].status, 'complete');
  } finally { fs.rmSync(h.out, { recursive: true, force: true }); }
});

test('fake model: its oracle code passes the checks it targets, so dry runs can solve', () => {
  const code = inst.names.map((ns, m) => ns.map((n) => oracleFn(inst, m, n)).join('\n'));
  assert.equal(W.check(inst, code, { strict: true }).length, 0);
  const body = P.toOpenAIBody(W.managerRequest('gpt-6-luna', inst, vs, 128000, 'medium'));
  assert.ok(fakeAnswer({ body, cfg: cfgK8 }).assignments.length > 0);
});

// the runner end to end (run-rc3.mjs over the fake gateway, a ledger written for the test): the Amendment 3 case advances
// only once every reply is delivered; a 400 in the batch stops it before anything is applied (the invariant)
function runRc3(mode, seed = null) {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..'), out = `test-li42-a3-${mode}-${process.pid}`, dir = path.join(root, 'results', out);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'li42-a3-')), ledger = path.join(tmp, 'ledger.json'), cfgFile = path.join(tmp, 'cfg.json'), trace = path.join(tmp, 'trace.txt');
  fs.writeFileSync(ledger, JSON.stringify({ schema: 1, capUsd: 300, perBatchCapUsd: 5, created: new Date().toISOString(), commitments: {}, history: [] }), { mode: 0o600 });
  fs.writeFileSync(cfgFile, JSON.stringify({ out, k: 8, cases: 1, seed0: 42390, shape, studyCapUsd: 1, arms: ['stigwait', 'manager'], provider: 'openai-litellm', model: 'gpt-6-luna', effort: 'medium', memberMax: 8000, managerMax: 128000, rounds: 1, strictFeedback: true, pilot: true, transport: 'batch', transportFallback: 'flex' }));
  if (seed) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'batches.json'), JSON.stringify(seed)); }
  const p = spawnSync(process.execPath, [path.join(root, 'observatory/batch2/rc/run-rc3.mjs'), cfgFile], { cwd: root, env: { ...process.env, UNFOLD_LEDGER: ledger, RC_OPENAI_FAKE: mode, RC_OPENAI_FAKE_TRACE: trace }, encoding: 'utf8', timeout: 120000 });
  const read = (f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : null);
  const res = { code: p.status, stderr: p.stderr, stdout: p.stdout, state: JSON.parse(read('state.json') || 'null'), failure: JSON.parse(read('transport-failure.json') || 'null'), wave0: (read('wave-0-p0.results.jsonl') || '').split('\n').filter(Boolean).map((l) => JSON.parse(l)),
    flex0: (read('wave-0-p0.flex.jsonl') || '').split('\n').filter(Boolean).map((l) => JSON.parse(l)), ledger: JSON.parse(fs.readFileSync(ledger, 'utf8')), trace: fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8').split('\n').filter(Boolean) : [] };
  fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(tmp, { recursive: true, force: true });
  return res;
}

test('runner: cancelled batch with HTTP 500 lines: the 500s go on flex and wave 0 is applied only with all 8 replies delivered', () => {
  const r = runRc3('batch-cancel-5xx');
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.wave0.map((x) => x.transport), ['batch', 'batch', 'batch', 'batch', 'flex', 'flex', 'flex', 'flex']);
  assert.ok(r.wave0.every((x) => x.result.type === 'succeeded'));
  assert.deepEqual([...new Set(r.flex0.map((x) => x.custom_id))], r.wave0.slice(4).map((x) => x.custom_id), 'exactly the four 500s were resent');
  assert.equal(r.trace.filter((x) => x === 'POST /v1/batches').length, 1, 'one batch, for wave 0 only');
  assert.ok(r.state.applied.includes(0) && r.state.applied.length > 1, 'wave 0 applied, the run went on');
  assert.equal(r.state.flexRemainders['0.0'].custom_ids.length, 4);
  assert.equal(r.state.transports.batch, 4);
  assert.deepEqual(Object.keys(r.ledger.commitments).slice(0, 2), ['test-li42-a3-batch-cancel-5xx-' + process.pid + '-wave-0-p0', 'test-li42-a3-batch-cancel-5xx-' + process.pid + '-wave-0-p0-flex']);
});

test('runner: a 400 inside the batch is not resent; the wave is not applied and the run stops hard (invariant)', () => {
  const r = runRc3('batch-cancel-5xx-400');
  assert.equal(r.code, 6, r.stderr);
  assert.equal(r.failure.transportFailed.invariant, true); assert.equal(r.failure.transportFailed.leader, true);
  assert.deepEqual(r.failure.transportFailed.undelivered.map((x) => [x.type, x.status, x.transport]), [['errored', 400, 'batch']]);
  assert.equal(r.state, null, 'nothing was applied to the run state');
  assert.equal(new Set(r.flex0.map((x) => x.custom_id)).size, 4, 'only the four 500s went on flex');
  assert.match(r.stderr, /no response delivered by the API/);
});

test('LI42 resume: a flex outcome recorded as HTTP 524 (or other transport-class error) is resent, a 400 is kept', async () => {
  const P = await import('./provider-openai.mjs');
  assert.equal(P.flexTransportError({ result: { type: 'errored', error: { status: 524, message: '<!DOCTYPE html>' } } }), true);
  assert.equal(P.flexTransportError({ result: { type: 'errored', error: { status: 429 } } }), true);
  assert.equal(P.flexTransportError({ result: { type: 'errored', error: { status: 0, message: 'request timed out' } } }), true);
  assert.equal(P.flexTransportError({ result: { type: 'errored', error: { status: 400, message: 'bad schema' } } }), false);
  assert.equal(P.flexTransportError({ result: { type: 'succeeded' } }), false);
});

// LI42 cost accounting, decision B (pilot-accounting.mjs): the cap counts everything; rule (a) projects from applied waves
const li42Journal = () => ({
  '0.0': { status: 'complete', ledgerName: 'li42-pilot-wave-0-p0', actualUsd: 0.051235665, reserveUsd: 0.4956 },
  'discarded-amendment3-1.0': { status: 'discarded', discarded: true, ledgerName: 'li42-pilot-wave-1-p0', actualUsd: 0.07169665, reserveUsd: 0.51 },
  '1.0': { status: 'complete', ledgerName: 'li42-pilot-wave-1-p0-r2', actualUsd: 0.031219265, reserveUsd: 0.5032 },
  'ledger-li42-pilot-wave-1-p0-r2-cut524': { status: 'discarded', discarded: true, ledgerName: 'li42-pilot-wave-1-p0-r2-cut524', actualUsd: 0.3123044 },
});

test('decision B: the cap total counts everything (about US$ 0.47), the projection only the applied waves; cap-only is by ledger name', () => {
  const c = PA.pilotCosts(li42Journal());
  assert.ok(Math.abs(c.capTotalUsd - 0.466456) < 1e-6, `cap total ${c.capTotalUsd}`);
  assert.ok(Math.abs(c.projectionUsd - (0.051235665 + 0.031219265)) < 1e-12);
  assert.ok(Math.abs(c.startWaveUsd - 0.051235665) < 1e-12);
  assert.deepEqual(c.capOnly.map((x) => x.ledgerName), ['li42-pilot-wave-1-p0', 'li42-pilot-wave-1-p0-r2-cut524']);
  assert.deepEqual(Object.keys(PA.CAP_ONLY), ['li42-pilot-wave-1-p0', 'li42-pilot-wave-1-p0-r2-cut524'], 'exactly these two names');
  // nothing else can become cap-only: a flag without a listed name is an error, a discarded entry with another name counts in (a)
  assert.throws(() => PA.pilotCosts({ ...li42Journal(), x: { capOnly: true, ledgerName: 'li42-pilot-wave-2-p0', actualUsd: 1 } }), /not a cap-only name/);
  assert.ok(Math.abs(PA.pilotCosts({ ...li42Journal(), y: { status: 'discarded', discarded: true, ledgerName: 'li42-pilot-wave-3-p0', actualUsd: 0.1 } }).projectionUsd - 0.182454930) < 1e-9);
});

test('decision B: both projections; the margin stop only when (A) is above the cap and (B) is not', () => {
  const costs = PA.pilotCosts(li42Journal());
  const normal = PA.projections({ costs, cases: 12, studyCapUsd: 11 });
  assert.equal(normal.B.projectedUsd, +(12 * costs.projectionUsd).toFixed(6)); assert.equal(normal.A.projectedUsd, +(12 * costs.capTotalUsd).toFixed(6));
  assert.equal(normal.marginStop, false); assert.equal(normal.marginNote, null);
  const margin = PA.projections({ costs, cases: 24, studyCapUsd: 11 }); // A 11.19 > 11, B 1.98
  assert.equal(margin.marginStop, true); assert.match(margin.marginNote, /Research Leader decides before study wave 1/);
  const over = PA.projections({ costs: { ...costs, projectionUsd: 1 }, cases: 12, studyCapUsd: 11 }); // B 12 > 11: rule (a) stops as before
  assert.equal(over.marginStop, false);
  assert.equal(P.pilotGate({ pilotCostUsd: costs.projectionUsd, startWaveUsd: costs.startWaveUsd, cases: 12, studyCapUsd: 11, solved: { stigwait: true } }).rules.a_projectedCost.projectedUsd, normal.B.projectedUsd, 'the gate uses (B)');
});

test('runner: the cap check counts the cap-only journal entries (spent-so-far includes them)', () => {
  const j = li42Journal(), seed = { 'discarded-amendment3-1.0': j['discarded-amendment3-1.0'], 'ledger-li42-pilot-wave-1-p0-r2-cut524': j['ledger-li42-pilot-wave-1-p0-r2-cut524'] };
  const r = runRc3('ok', seed);
  const w0 = r.stdout.split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((x) => x.wave === 0 && x.requests);
  assert.equal(w0.spentUsd, +(0.07169665 + 0.3123044).toFixed(4), 'the pilot cap check sees the cap-only entries');
});

// sweep.mjs end to end on a finished fake pilot (summary.json present, so no pilot run): the gate records both
// projections; the margin is settled by spec.pilot.marginDecision when present. A study that proceeds runs on a fake
// gateway whose flex is down, so it ends at once (exit 5) after its transport plan is written.
import { pilotCfg, configHashOf } from './reattach-journal.mjs';
const journalFor = (appliedArmsUsd) => ({ ...li42Journal(), '1.0': { ...li42Journal()['1.0'], actualUsd: appliedArmsUsd } });
function sweepGate({ cases = 12, cap = 10.5, pilotCap = 1.5, marginDecision, journal = journalFor(0.483436) }) {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..'), id = `ZZB${process.pid}X${Math.random().toString(36).slice(2, 7)}`, lid = id.toLowerCase();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'li42-b-')), specFile = path.join(tmp, `${id}.json`), dir = path.join(root, 'results', `${lid}-pilot`), sdir = path.join(root, 'results', `${lid}-k8`), sweeps = path.join(root, 'observatory/batch2/rc/sweeps');
  const spec = { id, base: { provider: 'openai-litellm', model: 'gpt-6-luna', effort: 'medium', memberMax: 8000, managerMax: 128000, rounds: 1, strictFeedback: true }, pilot: { seed: 42390, cap: pilotCap, rounds: 1, ...(marginDecision ? { marginDecision } : {}) }, sizes: [{ k: 8, seed0: 42400, cases, cap }], arms: ['stigwait', 'manager'] };
  fs.writeFileSync(specFile, JSON.stringify(spec));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'summary.json'), '{}'); fs.writeFileSync(path.join(dir, 'batches.json'), JSON.stringify(journal));
  fs.writeFileSync(path.join(dir, 'transport.json'), JSON.stringify({ mode: 'flex', history: [] }));
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ arms: { stigwait: { k8s42390: { solved: true } } }, models: { 'gpt-6-luna': 1 } }));
  fs.writeFileSync(path.join(tmp, 'ledger.json'), JSON.stringify({ schema: 1, capUsd: 300, perBatchCapUsd: 5, created: new Date().toISOString(), commitments: {}, history: [] }), { mode: 0o600 });
  const run = () => spawnSync(process.execPath, [path.join(root, 'observatory/batch2/rc/sweep.mjs'), specFile], { cwd: root, env: { ...process.env, RC_OPENAI_FAKE: 'flex-down', UNFOLD_LEDGER: path.join(tmp, 'ledger.json') }, encoding: 'utf8', timeout: 120000 });
  const rj = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
  try {
    const a = run(), gate = rj(path.join(dir, 'pilot-gate.json')), studyStarted = fs.existsSync(path.join(sdir, 'transport-plan.json')), prov = rj(path.join(sdir, 'run-provenance.json'));
    const cfgs = { pilot: rj(path.join(sweeps, `${lid}-pilot.json`)), study: rj(path.join(sweeps, `${lid}-k8.json`)) };
    const b = studyStarted ? null : run();
    return { a, b, gate, studyStarted, prov, cfgs };
  } finally { for (const d of [dir, sdir, tmp]) fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(path.join(root, 'results', `${lid}-verdicts.log`), { force: true }); for (const f of [`${lid}-pilot.json`, `${lid}-k8.json`]) fs.rmSync(path.join(sweeps, f), { force: true }); }
}
const DECISION = JSON.parse(fs.readFileSync(new URL('./sweeps/LI42.json', import.meta.url), 'utf8')).pilot.marginDecision; // LI42 Amendment 4, as registered in the spec

test('margin decision in the spec: (B) 6.4, (A) 11.0, study cap 10.5, threshold 9.0: the study proceeds; decision and outcome recorded', () => {
  const r = sweepGate({ marginDecision: DECISION });
  assert.equal(r.gate.pass, true); assert.equal(r.gate.costAccounting.studyCapUsd, 10.5, 'the study cap comes from the spec');
  assert.ok(Math.abs(r.gate.costAccounting.B.projectedUsd - 6.416) < 1e-3 && Math.abs(r.gate.costAccounting.A.projectedUsd - 11.024) < 1e-3, JSON.stringify(r.gate.costAccounting.A));
  assert.equal(r.gate.costAccounting.marginStop, true, 'the margin condition holds (A > 10.5 >= B)');
  assert.equal(r.gate.marginDecision.text, DECISION.text); assert.equal(r.gate.marginDecision.approvedBy, DECISION.approvedBy);
  assert.equal(r.gate.marginDecision.outcome.action, 'continue'); assert.equal(r.gate.marginDecision.outcome.threshold, 9); assert.match(r.gate.marginDecision.outcome.reason, /proceed to the study although \(A\) US\$ 11\.024\d* is above the study cap US\$ 10.5/);
  assert.deepEqual(r.prov.marginDecision, r.gate.marginDecision, 'recorded in the study run-provenance.json');
  assert.equal(r.studyStarted, true, 'the study started (its transport plan was written)');
  assert.doesNotMatch(r.a.stderr, /margin/); assert.match(r.a.stdout, /"margin":"ZZB\w+","action":"continue"/);
});

test('margin decision in the spec: (B) 9.5 above the threshold 9.0: final stop before the study', () => {
  const r = sweepGate({ marginDecision: DECISION, journal: journalFor(9.5 / 12 - 0.051235665) });
  assert.equal(r.gate.pass, true); assert.equal(r.gate.costAccounting.B.projectedUsd, 9.5);
  assert.equal(r.a.status, 3); assert.match(r.a.stderr, /margin decision: projection \(B\) US\$ 9.5 > US\$ 9 and \(A\) US\$ 14\.1\d* > study cap US\$ 10.5; final stop, the Research Leader decides before study wave 1/);
  assert.equal(r.gate.marginDecision.outcome.action, 'stop'); assert.equal(r.studyStarted, false);
  assert.equal(r.b.status, 3, 'a rerun stops again');
});

test('no margin decision: (A) above the study cap 10.5 and (B) not: final stop as before; caps are read from the spec', () => {
  const r = sweepGate({});
  assert.equal(r.a.status, 3, r.a.stderr); assert.match(r.a.stderr, /margin: projection with incidents > cap; Research Leader decides before study wave 1/);
  assert.equal(r.gate.costAccounting.marginStop, true); assert.match(r.gate.marginNote, /above the study cap US\$ 10.5/); assert.equal(r.gate.marginDecision, undefined);
  assert.match(r.a.stdout, /"projectionB":6\.416\d*,"projectionA":11\.024\d*,"capTotalUsd":0\.9186\d*/);
  assert.equal(r.b.status, 3, 'a rerun stays stopped'); assert.equal(r.studyStarted, false);
  assert.equal(r.cfgs.pilot.studyCapUsd, 1.5, 'the pilot cap from the spec reaches the pilot run config');
  const wider = sweepGate({ cap: 11.5 }); // the same costs with a study cap of 11.5: no margin, the study proceeds
  assert.equal(wider.gate.costAccounting.marginStop, false); assert.equal(wider.studyStarted, true);
  assert.equal(wider.cfgs.study.studyCapUsd, 11.5);
});

test('caps are not in run-rc3 configHash: changing pilot.cap and sizes[0].cap leaves the pilot and study config hashes as they were', () => {
  const read = (f) => fs.readFileSync(new URL(f, import.meta.url));
  const a = sweepGate({ cap: 11.5, pilotCap: 1 }).cfgs, b = sweepGate({ cap: 10.5, pilotCap: 1.5, marginDecision: DECISION }).cfgs;
  const norm = (c) => ({ ...c, out: 'x' }); // the test ids differ; everything else is what sweep.mjs writes
  assert.notEqual(a.pilot.studyCapUsd, b.pilot.studyCapUsd); assert.notEqual(a.study.studyCapUsd, b.study.studyCapUsd);
  assert.equal(configHashOf(norm(a.pilot), read), configHashOf(norm(b.pilot), read));
  assert.equal(configHashOf(norm(a.study), read), configHashOf(norm(b.study), read));
  // the LI42 pilot config as sweep.mjs builds it: caps 1 / 1.5 give the same hash
  const li42 = JSON.parse(fs.readFileSync(new URL('./sweeps/LI42.json', import.meta.url), 'utf8'));
  const moved = { ...li42, pilot: { ...li42.pilot, cap: 1.5, marginDecision: DECISION }, sizes: [{ ...li42.sizes[0], cap: 10.5 }] };
  assert.equal(configHashOf(pilotCfg(li42), read), configHashOf(pilotCfg(moved), read));
});

test('LI42 spec: Amendment 4 caps and the margin decision as registered', () => {
  const li42 = JSON.parse(fs.readFileSync(new URL('./sweeps/LI42.json', import.meta.url), 'utf8'));
  assert.equal(li42.pilot.cap, 1.5); assert.equal(li42.sizes[0].cap, 10.5); assert.equal(li42.bench.reviewCap, 2);
  assert.deepEqual(Object.keys(li42.pilot.marginDecision), ['proceedIfProjectionBAtMostUsd', 'approvedBy', 'at', 'source', 'text']);
  assert.equal(li42.pilot.marginDecision.proceedIfProjectionBAtMostUsd, 9); assert.ok(PA.validMarginDecision(li42.pilot.marginDecision));
});

test('margin outcome (Amendment 4 text): within the margin (B) decides; outside it the study proceeds; rule (a) is separate', () => {
  const at = (B, A) => PA.marginOutcome({ A: { projectedUsd: A }, B: { projectedUsd: B }, studyCapUsd: 10.5 }, DECISION).action;
  assert.equal(at(6.4, 11.0), 'continue', '(B) <= 9 proceeds even when (A) > 10.5');
  assert.equal(at(9.0, 11.0), 'continue', 'at the threshold');
  assert.equal(at(9.5, 14.1), 'stop', '(B) > 9 and (A) > 10.5: final stop');
  assert.equal(at(9.5, 10.2), 'continue', '(B) > 9 but (A) <= 10.5: no margin, proceed');
  assert.equal(at(6.4, 10.5), 'continue', '(A) exactly at the cap is not above it');
});

test('margin outcome: decision shape is validated', () => {
  const ca = { A: { projectedUsd: 11 }, B: { projectedUsd: 6 }, studyCapUsd: 10.5 };
  assert.throws(() => PA.marginOutcome(ca, { proceedIfProjectionBAtMostUsd: '9' }), /marginDecision must be/);
  assert.equal(PA.marginOutcome(ca, DECISION).action, 'continue'); assert.equal(PA.marginOutcome(ca, null).action, 'stop');
  assert.equal(PA.marginOutcome({ ...ca, A: { projectedUsd: 10 } }, null).action, 'continue');
});
