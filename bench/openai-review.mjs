// The judge sees a fresh, tool-free context containing one masked packet.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { blindMemo } from './blind.mjs';
import { blindManifest } from './blind-manifest.mjs';

const modelId = 'gpt-6-luna';
const effort = 'medium';
const promptHash = '318a7b7f51d251f51c8418c9fb38574e6229e57c64ac7af49f2fc4e71e425467';
const controlHash = 'e9f13465877e32cb7c692a09351f96fb0c1a050263a72c0248b7b0fa1d9f8a7e';
const hash = (data) => createHash('sha256').update(data).digest('hex');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const save = (file, data) => writeFileSync(file, JSON.stringify(data), { flag: 'wx', mode: 0o600 });
const decisions = ['grossCents', 'refundCents', 'paidCents', 'differenceCents', 'exceptions', 'missing', 'over', 'under'];
const identity = { model: modelId, effort, promptHash, controlHash, auth: 'openai-subscription' };

function frozen(file, expected) {
  const text = readFileSync(new URL(file, import.meta.url), 'utf8');
  assert.equal(hash(text), expected);
  return text;
}

export function requireOpenAIJudge(gate) {
  assert.ok(gate && Object.entries(identity).every(([k, v]) => gate[k] === v) &&
    gate.passed === true && gate.validMemos === 8 && gate.totalItems === 64 && gate.correctItems === 64 &&
    gate.receiptHashes?.length === 8 && new Set(gate.receiptHashes).size === 8 &&
    gate.receiptHashes.every((s) => /^[0-9a-f]{64}$/.test(s)), 'Requires the frozen OpenAI calibration (64/64)');
}

export function parseBits(text) {
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  return value && Object.keys(value).length === decisions.length &&
    decisions.every((k) => typeof value[k] === 'boolean') ? value : null;
}

function controls() {
  const { referencia, cases } = JSON.parse(frozen('./memo-calibration-v2.json', controlHash));
  return cases.map(({ uuid, memorando, expected }) => ({
    packet: { uuid, referencia, memorando: blindMemo(memorando, []).text }, expected,
  }));
}

function samplePackets(dir, manifestFile) {
  assert.ok(isAbsolute(dir) && isAbsolute(manifestFile));
  const received = blindManifest(dir);
  assert.deepEqual(received, json(manifestFile), 'Closed and received manifests differ');
  const files = new Map(received.map((r) => [r.name, r.sha256]));
  function read(name) {
    const bytes = readFileSync(join(dir, name));
    assert.equal(hash(bytes), files.get(name));
    return bytes.toString('utf8');
  }
  return received.filter(({ name }) => name.endsWith('.md')).map(({ name }) => {
    const uuid = name.slice(0, -3);
    return { packet: { uuid, referencia: JSON.parse(read(uuid + '.json')), memorando: read(name) } };
  });
}

export async function reviewOne({ runtime, model, prompt, packet }) {
  assert.ok(runtime.isUsingOAuth('openai') && runtime.isUsingSubscription('openai'));
  assert.equal(model.id, modelId);
  assert.equal(model.provider, 'openai');
  const started = Date.now();
  let dispatched = false;
  const context = { systemPrompt: prompt, messages: [{ role: 'user', content: JSON.stringify(packet), timestamp: started }] };
  const reply = await runtime.completeSimple(model, context, {
    reasoning: effort, maxRetries: 0, cacheRetention: 'none', signal: AbortSignal.timeout(180000),
    onPayload(payload) {
      assert.ok(!dispatched && payload.model === modelId && payload.reasoning?.effort === effort &&
        !payload.tools?.length && !payload.previous_response_id && payload.store === false, 'Unexpected judge request');
      dispatched = true;
    },
  });
  const elapsedMs = Date.now() - started;
  const text = reply.content.filter((item) => item.type === 'text').map((item) => item.text).join('');
  const tokens = Object.fromEntries(['input', 'output', 'cacheRead', 'cacheWrite'].map((k) => [k, reply.usage?.[k] ?? null]));
  const httpCode = Number(/\b([45]\d\d)\b/.exec(reply.errorMessage ?? '')?.[1]) || null;
  const returnedModel = reply.responseModel ?? null;
  const returnedEffort = reply.providerThinkingLevel ?? null;
  const sameModel = reply.model === modelId && (!returnedModel || returnedModel === modelId);
  const sameEffort = !returnedEffort || returnedEffort === effort;
  const configurationMismatch = !dispatched || !sameModel || !sameEffort;
  const technical = !dispatched || !sameModel || !sameEffort || ['aborted', 'error'].includes(reply.stopReason);
  const rejectedBeforeResponse = technical && dispatched && httpCode === 429 && !reply.responseId &&
    reply.content.length === 0 && Object.values(tokens).every((n) => n === 0);
  return { technical, configurationMismatch, rejectedBeforeResponse, elapsedMs, httpCode, tokens, returnedModel, returnedEffort,
    responseId: reply.responseId ?? null, text, bits: technical || reply.stopReason !== 'stop' ? null : parseBits(text) };
}

export async function runBatch({ entries, out, retryId, call }) {
  if (!existsSync(out)) mkdirSync(out, { mode: 0o700 });
  assert.ok(lstatSync(out).isDirectory() && (lstatSync(out).mode & 0o077) === 0);
  assert.ok(!retryId || entries.some(({ packet }) => packet.uuid === retryId));
  const rows = [];
  for (const { packet, expected } of entries.sort((a, b) => a.packet.uuid.localeCompare(b.packet.uuid))) {
    const prefix = join(out, packet.uuid);
    const key = { ...identity, uuid: packet.uuid, packetHash: hash(JSON.stringify(packet)) };
    const decision = prefix + '.decision.json';
    if (!existsSync(decision)) {
      let ordinal = 1;
      if (existsSync(prefix + '.1.dispatch.json')) {
        assert.deepEqual(json(prefix + '.1.dispatch.json'), key);
        if (retryId === packet.uuid || existsSync(prefix + '.2.dispatch.json')) {
          assert.ok(json(prefix + '.1.receipt.json').rejectedBeforeResponse, 'Retry requires a confirmed pre-response rejection');
          ordinal = 2;
        } else if (!existsSync(prefix + '.1.receipt.json')) {
          throw Error('Dispatch without receipt: reconcile privately; do not redispatch');
        }
      }
      const attempt = prefix + '.' + ordinal;
      const file = attempt + '.receipt.json';
      if (!existsSync(file)) {
        save(attempt + '.dispatch.json', key);
        save(file, await call(packet));
      }
      const receipt = json(file);
      assert.ok(!receipt.configurationMismatch, 'Judge identity or request mismatch; suspend adjudication');
      if (ordinal === 1 && receipt.technical && receipt.rejectedBeforeResponse)
        throw Error('Confirmed 429 before response; preserve the receipt, then resume once with its UUID');
      const bits = receipt.bits;
      const correct = expected && bits ? decisions.filter((k) => bits[k] === expected[k]).length : 0;
      save(decision, { ...key, receiptHash: hash(readFileSync(file)), ordinal, valid: Boolean(bits),
        correct, verdict: bits ? decisions.every((k) => bits[k]) : null });
    }
    const row = json(decision);
    for (const [k, value] of Object.entries(key)) assert.equal(row[k], value);
    rows.push(row);
  }
  return rows;
}

async function main() {
  const [cmd, out, dir, manifestFile] = process.argv.slice(2);
  assert.ok(['calibrate', 'sample'].includes(cmd) && isAbsolute(out));
  const prompt = frozen('./memo-review-v2.pt.md', promptHash);
  if (cmd === 'sample') requireOpenAIJudge(json(process.env.OPENAI_JUDGE_CALIBRATION));
  const entries = cmd === 'sample' ? samplePackets(dir, manifestFile) : controls();
  if (!existsSync(out)) mkdirSync(out, { mode: 0o700 });
  assert.ok(lstatSync(out).isDirectory() && (lstatSync(out).mode & 0o077) === 0);
  const { ModelRuntime } = await import('@earendil-works/pi-coding-agent');
  const runtime = await ModelRuntime.create({ authPath: join(homedir(), '.pi/agent/auth.json'),
    modelsStorePath: join(out, 'models-store.json'), modelsPath: fileURLToPath(new URL('./judge-openai-model.json', import.meta.url)), allowModelNetwork: false });
  const model = runtime.getPhysicalModel('openai', modelId);
  assert.ok(model?.reasoning && runtime.isUsingOAuth('openai') && runtime.isUsingSubscription('openai'));
  const rows = await runBatch({ entries, out, retryId: process.env.JUDGE_TECHNICAL_RETRY_UUID,
    call: (packet) => reviewOne({ runtime, model, prompt, packet }) });
  await runtime.settleCredentialWrites();
  if (cmd === 'sample') return;
  const validMemos = rows.filter((r) => r.valid).length;
  const correctItems = rows.reduce((n, r) => n + r.correct, 0);
  const aggregate = { ...identity, validMemos, totalItems: 64, correctItems,
    passed: rows.length === 8 && validMemos === 8 && correctItems === 64,
    receiptHashes: rows.map((r) => r.receiptHash) };
  const destination = join(out, 'calibration.json');
  if (existsSync(destination)) assert.deepEqual(json(destination), aggregate);
  else save(destination, aggregate);
  console.log(JSON.stringify({ validMemos, correctItems, passed: aggregate.passed }));
  if (!aggregate.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
