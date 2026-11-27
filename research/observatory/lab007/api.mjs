// LAB-007 pilot only. Anthropic Messages Batches API; hard cap is counted USD
// (real token prices × 1.25 contingency × 1.5 safety). One process owns ledger.
import fs from 'node:fs';
import path from 'node:path';

export const OUT = '/data/OpenBot/Shared/Norevia/norevia/results/lab007';
export const LEDGER = path.join(OUT, 'ledger-pilot1.jsonl');
export const RAW = path.join(OUT, 'raw-pilot1.jsonl');
export const HARD_CAP = 5;
export const CAP = Math.min(HARD_CAP, Number(process.env.L7_CAP || HARD_CAP));
export const MODEL = 'claude-haiku-5-5';
const KEY = (process.env.ANTHROPIC_API_KEY || fs.readFileSync(process.env.ANTHROPIC_API_KEY_FILE, 'utf8')).trim();
const PRICE = { input: 0.10 / 1e6, output: 0.50 / 1e6 };
const SAFETY = 1.875;
const BATCH_FACTOR = 0.5;
fs.mkdirSync(OUT, { recursive: true });
let spent = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).reduce((s, x) => s + (JSON.parse(x).counted_usd || 0), 0) : 0;
export const spentCounted = () => spent;
export class CapError extends Error {}
const prior = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((x) => JSON.parse(x).custom_id) : []);

function write(rec) { fs.appendFileSync(LEDGER, JSON.stringify(rec) + '\n'); }
function envelope(sys, user) {
  // Conservative estimate, including a fixed allowance for generated tokens.
  const input = Math.ceil((sys.length + user.length) / 3.2), output = 180;
  return (input * PRICE.input + output * PRICE.output) * BATCH_FACTOR * SAFETY;
}

async function api(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(init.headers || {}) } });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}: ${raw.slice(0, 250)}`);
  return raw ? JSON.parse(raw) : {};
}

export async function runBatch({ requests, meta }) {
  let reserve = 0;
  for (const q of requests) reserve += envelope(q.system, q.prompt);
  if (spent + reserve > CAP) throw new CapError(`counted spend ${spent.toFixed(4)} + batch reserve ${reserve.toFixed(4)} > $${CAP}`);
  // Every request is deterministic by custom_id, so a lost poll can be resumed.
  const batchPath = path.join(OUT, `batch-${meta.batch}.json`);
  let created;
  if (fs.existsSync(batchPath)) created = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  else {
  const body = { requests: requests.map((q) => ({ custom_id: q.id, params: {
    model: MODEL, max_tokens: 256,
    system: [{ type: 'text', text: q.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: q.prompt }]
  } })) };
  const submitted = await api('https://api.anthropic.com/v1/messages/batches', { method: 'POST', body: JSON.stringify(body) });
  created = { id: submitted.id, meta, request_count: requests.length, submitted_at: new Date().toISOString() };
  fs.writeFileSync(batchPath, JSON.stringify(created, null, 2));
  }
  let batch = created;
  while (batch.processing_status !== 'ended') {
    await new Promise((r) => setTimeout(r, 15000));
    batch = await api(`https://api.anthropic.com/v1/messages/batches/${created.id}`);
  }
  const rr = await fetch(`https://api.anthropic.com/v1/messages/batches/${created.id}/results`, { headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01' } });
  if (!rr.ok) throw new Error(`Anthropic results HTTP ${rr.status}: ${(await rr.text()).slice(0, 250)}`);
  const out = await rr.text();
  const map = new Map();
  const rows = out.split('\n');
  for (const row of rows) {
    if (!row) continue;
    let item; try { item = typeof row === 'string' ? JSON.parse(row) : row; } catch { continue; }
    map.set(item.custom_id, item);
  }
  if (map.size !== requests.length) throw new Error(`batch ${created.id}: results ${map.size} of ${requests.length} requests`);
  const results = [];
  for (const q of requests) {
    const item = map.get(q.id); const msg = item?.result?.message;
    const status = item?.result?.type || 'missing';
    const text = msg?.content?.filter((x) => x.type === 'text').map((x) => x.text).join('') || '';
    const u = msg?.usage || {};
    const inTok = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    const outTok = (u.output_tokens || 0) + (u.thinking_tokens || 0);
    const rawUsd = inTok * PRICE.input + outTok * PRICE.output;
    const actualUsd = rawUsd * BATCH_FACTOR;
    const countedUsd = actualUsd * SAFETY;
    const ok = status === 'succeeded' && !!text;
    if (!prior.has(q.id)) {
      spent += countedUsd; prior.add(q.id);
      write({ ts: new Date().toISOString(), ...meta, custom_id: q.id, model: MODEL, endpoint: 'messages/batches', batch_id: created.id, ok, result_type: status, in_tokens: inTok, out_tokens_including_thinking: outTok, cache_read_tokens: u.cache_read_input_tokens || 0, cache_write_tokens: u.cache_creation_input_tokens || 0, raw_list_usd: +rawUsd.toFixed(8), batch_usd: +actualUsd.toFixed(8), counted_usd: +countedUsd.toFixed(8), error: ok ? null : item?.result?.error?.message || status });
    }
    fs.appendFileSync(RAW, JSON.stringify({ ...meta, custom_id: q.id, request: { system: q.system, prompt: q.prompt }, text, status }) + '\n');
    results.push({ id: q.id, text, ok, status, inTok, outTok, cost: actualUsd, error: ok ? null : status });
  }
  if (spent > CAP) throw new CapError(`actual counted spend exceeded cap after API completion: $${spent.toFixed(4)} > $${CAP}`);
  return results;
}
