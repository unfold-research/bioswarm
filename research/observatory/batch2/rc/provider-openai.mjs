// Provider adapter "openai-litellm" for the rc runner (run-rc3.mjs), LI42 (tasks/LI42-SECOND-FAMILY-PREREG.md).
// Selected only when cfg.provider === 'openai-litellm'; the Anthropic path does not import this file.
//   translation   the runner's request params (built by code.mjs exactly as for Anthropic) -> an OpenAI Chat Completions
//                 body: same messages, model, reasoning_effort from the effort the params carry (spec base.effort),
//                 max_completion_tokens = the params' max_tokens (member 8000, manager plan 128000), and the same JSON
//                 schema as response_format json_schema strict (the rc schemas already meet OpenAI's strict rules:
//                 additionalProperties false and every property required, so strictSchema changes nothing; it records
//                 any change it would have to make, and the runner refuses to run if there is one)
//   results       every reply, batch or flex, is normalised to the Anthropic batch result shape the runner already
//                 reads (result.type, message.content[text], usage, stop_reason), plus the returned model string, the
//                 reasoning_effort sent, the raw OpenAI usage, finish_reason and the transport used
//   usage         prompt_tokens - cached -> input_tokens; cached -> cache_read_input_tokens; completion_tokens (reasoning
//                 included) -> output_tokens; completion_tokens_details.reasoning_tokens -> output_tokens_details.thinking_tokens
//   refusals      a 400/422 that names max_completion_tokens, reasoning_effort, response_format / json_schema, service_tier
//                 or says a parameter or value is unsupported is "the model refuses a parameter" (a stop rule)
//   transports    batch (JSONL -> /v1/files -> /v1/batches -> poll -> output and error files) and synchronous flex
//                 (/v1/chat/completions, service_tier flex, bounded concurrency, retries on 429/5xx/timeouts)
//   plan          the transport plan file: written once before the study's first wave, never switched mid-run
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const PROVIDER = 'openai-litellm';
export const REFUSAL_PARAMS = ['max_completion_tokens', 'max_tokens', 'reasoning_effort', 'response_format', 'json_schema', 'service_tier'];
export const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

// ---------- translation ----------
// OpenAI strict structured outputs: every object lists all its properties in `required` and has additionalProperties
// false. Returns a deep copy and the list of changes (none for the rc schemas).
export function strictSchema(schema, at = '$') {
  const changes = [];
  const walk = (s, p) => {
    if (!s || typeof s !== 'object') return s;
    if (Array.isArray(s)) return s.map((x, i) => walk(x, `${p}[${i}]`));
    const o = {};
    for (const [k, v] of Object.entries(s)) o[k] = k === 'properties' ? Object.fromEntries(Object.entries(v).map(([n, x]) => [n, walk(x, `${p}.${n}`)])) : walk(v, `${p}.${k}`);
    if (o.type === 'object' && o.properties) {
      const names = Object.keys(o.properties);
      if (o.additionalProperties !== false) { changes.push(`${p}: additionalProperties set to false`); o.additionalProperties = false; }
      const req = Array.isArray(o.required) ? o.required : [];
      if (names.some((n) => !req.includes(n)) || req.length !== names.length) { changes.push(`${p}: required set to all properties`); o.required = names.slice(); }
    }
    return o;
  };
  return { schema: walk(schema, at), changes };
}
export const schemaName = (schema) => `rc_${Object.keys(schema?.properties || {}).sort().join('_') || 'reply'}`.slice(0, 64);

export function toOpenAIBody(params, { model = params.model } = {}) {
  for (const k of ['system', 'thinking', 'tools', 'tool_choice']) if (params[k] != null) throw Error(`openai-litellm: unsupported request field ${k}`);
  const fmt = params.output_config?.format, effort = params.output_config?.effort ?? null;
  if (!fmt || fmt.type !== 'json_schema' || !fmt.schema) throw Error('openai-litellm: every rc request carries a JSON schema');
  if (!EFFORTS.includes(effort)) throw Error(`openai-litellm: reasoning_effort must be set explicitly (spec base.effort), got ${effort}`);
  if (!Number.isInteger(params.max_tokens) || params.max_tokens < 1) throw Error('openai-litellm: the output limit must be set');
  const { schema, changes } = strictSchema(fmt.schema);
  if (changes.length) throw Error(`openai-litellm: schema would change under strict mode (${changes.join('; ')}); this is an instrument change`);
  return {
    model,
    messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
    reasoning_effort: effort,
    max_completion_tokens: params.max_tokens,
    response_format: { type: 'json_schema', json_schema: { name: schemaName(schema), strict: true, schema } },
  };
}
export const batchLine = (custom_id, body) => ({ custom_id, method: 'POST', url: '/v1/chat/completions', body });
export const flexBody = (body) => ({ ...body, service_tier: 'flex' });

// ---------- results ----------
export function mapUsage(u = {}) {
  const cached = u?.prompt_tokens_details?.cached_tokens || 0;
  return { input_tokens: Math.max(0, (u?.prompt_tokens || 0) - cached), cache_read_input_tokens: cached, cache_creation_input_tokens: 0, output_tokens: u?.completion_tokens || 0,
    output_tokens_details: { thinking_tokens: u?.completion_tokens_details?.reasoning_tokens || 0 } };
}
export const STOP = { length: 'max_tokens', stop: 'end_turn', content_filter: 'refusal', tool_calls: 'tool_use', function_call: 'tool_use' };
export const stopOf = (choice) => (choice?.message?.refusal ? 'refusal' : STOP[choice?.finish_reason] || choice?.finish_reason || null);

// a successful chat completion -> the runner's result line
export function normalizeCompletion(custom_id, resp, sent, transport, pricedAs) {
  const ch = resp?.choices?.[0] || {}, text = typeof ch.message?.content === 'string' ? ch.message.content : '';
  return { custom_id, transport, result: { type: 'succeeded', message: {
    id: resp?.id ?? null, model: resp?.model ?? null, priced_as: pricedAs, reasoning_effort: sent.reasoning_effort, max_completion_tokens: sent.max_completion_tokens,
    service_tier: resp?.service_tier ?? null, content: text ? [{ type: 'text', text }] : [], refusal: ch.message?.refusal ?? null,
    stop_reason: stopOf(ch), finish_reason: ch.finish_reason ?? null, usage: mapUsage(resp?.usage), openai_usage: resp?.usage ?? null } } };
}
// a request the provider did not answer -> an errored result line (unbilled), with the refusal classification
export function normalizeError(custom_id, { status = null, error = null, kind = 'errored' } = {}, sent, transport) {
  const refusal = classifyRefusal(status, error);
  return { custom_id, transport, result: { type: kind, error: { status, message: String(error?.message || kind).slice(0, 500), param: error?.param ?? null, code: error?.code ?? null, refusal },
    reasoning_effort: sent?.reasoning_effort ?? null, max_completion_tokens: sent?.max_completion_tokens ?? null } };
}
// "the model refuses a parameter": a 400 (or 422) about the output limit, the effort, the response format, the service
// tier, or an unsupported parameter/value. Anything else (429, 5xx, a bad prompt) is not a refusal.
export function classifyRefusal(status, error) {
  if (status !== 400 && status !== 422) return null;
  const text = `${error?.param || ''} ${error?.code || ''} ${error?.message || ''}`;
  const param = REFUSAL_PARAMS.find((p) => text.includes(p));
  if (param) return { param: param === 'json_schema' ? 'response_format' : param === 'max_tokens' ? 'max_completion_tokens' : param, status, message: String(error?.message || '').slice(0, 300) };
  if (/unsupported (parameter|value)|not supported|unrecognized request argument|is not allowed|invalid.*(param|value)/i.test(text)) return { param: error?.param || 'unknown', status, message: String(error?.message || '').slice(0, 300) };
  return null;
}
// one line of a batch output or error file -> a result line
export function normalizeBatchLine(x, sentById, pricedAs) {
  const sent = sentById.get(x.custom_id) || {}, st = x.response?.status_code ?? null;
  if (st === 200 && x.response?.body?.choices) return normalizeCompletion(x.custom_id, x.response.body, sent, 'batch', pricedAs);
  const error = x.response?.body?.error || x.error || { message: `status ${st}` };
  return normalizeError(x.custom_id, { status: st ?? (x.error ? 400 : null), error }, sent, 'batch');
}
// A cancelled or expired batch lists every request it never ran in its error file, with no response and error.code
// batch_cancelled / batch_expired (LiteLLM -> OpenAI, cancel check 2026-11-23: {"custom_id": "cc-1", "response": null,
// "error": {"code": "batch_cancelled", "message": "This request was not executed because the batch was cancelled."}}).
// Such a line is not a result: the request is missing and goes to the flex remainder.
export const NOT_EXECUTED = ['batch_cancelled', 'batch_expired'];
export const notExecuted = (x) => !x?.response && NOT_EXECUTED.includes(x?.error?.code);
// LI42 Amendment 3: a per-request error of transport class inside a batch (HTTP 5xx, 429, 408 or a timeout) is a batch
// failure for that request, not a reply: the request goes to the flex remainder with the same body. Seen on the pilot's
// wave 0 (2026-11-23): 15 lines {"response": {"status_code": 500, "body": {"error": {"message": "The server had an error
// while processing your request. ...", "type": "server_error"}}}} in the error file of a cancelled batch whose
// request_counts said failed 0. Any other per-request error (400, 422, other 4xx, refusals) is a result and is not retried.
export const transportStatus = (s) => s === 408 || s === 429 || (Number.isInteger(s) && s >= 500 && s <= 599);
export function batchFailedRequest(x) {
  if (notExecuted(x)) return 'not executed';
  if (x?.response && transportStatus(x.response.status_code)) return `HTTP ${x.response.status_code}`;
  if (!x?.response && /time(d)?[ _-]?out/i.test(`${x?.error?.code || ''} ${x?.error?.message || ''}`)) return 'timeout';
  return null;
}
// LI42 Amendment 3 invariant (pilot and study): a wave advances only if every request has a response the API delivered
// (result type succeeded: a completion, whatever its content). Returns the requests without one.
export function undeliveredOf(rows, raws) {
  const got = new Map(raws.filter(Boolean).map((x) => [x.custom_id, x]));
  return rows.filter((q) => got.get(q.custom_id)?.result?.type !== 'succeeded').map((q) => { const x = got.get(q.custom_id);
    return { custom_id: q.custom_id, type: x?.result?.type ?? 'missing', status: x?.result?.error?.status ?? null, transport: x?.transport ?? null, message: String(x?.result?.error?.message || 'no result').slice(0, 200) }; });
}
export const refusalsOf = (lines) => lines.map((l) => l.result?.error?.refusal && { custom_id: l.custom_id, ...l.result.error.refusal }).filter(Boolean);

// ---------- token estimate for the reserve (no count_tokens on this provider) ----------
// max(the gateway's token_counter on the messages, bytes / 3), plus the schema at bytes / 3 and a small framing margin;
// the runner multiplies by its calibration factor (largest actual / estimated prompt tokens seen so far, never below 1)
export function estimateTokens(body, liveCount = null) {
  const msg = Math.ceil(Buffer.byteLength(JSON.stringify(body.messages)) / 3), schema = Math.ceil(Buffer.byteLength(JSON.stringify(body.response_format || {})) / 3);
  return Math.max(msg, Number.isFinite(liveCount) ? liveCount : 0) + schema + 32;
}
// from the journal: the largest actual / estimated prompt tokens of the parts reconciled so far, with 10% on top once
// any part ran over (so a reserve keeps up with a tokenizer larger than bytes / 3); 1 until then
export function calibration(journal) {
  let worst = 1;
  for (const e of Object.values(journal || {})) if (e.status === 'complete' && e.measuredInputTokens > 0 && Number.isFinite(e.actualInputTokens)) worst = Math.max(worst, e.actualInputTokens / e.measuredInputTokens);
  return worst > 1 ? worst * 1.1 : 1;
}

// ---------- transport plan ----------
// The study's transport is fixed before its first wave (prereg: batch if it worked in the pilot, else flex) in
// <study out>/transport-plan.json, and never switched mid-run. writePlan refuses a second, different plan.
export function writePlan(file, { transport, reason, pilot = null, at = new Date().toISOString() }) {
  if (!['batch', 'flex'].includes(transport)) throw Error(`transport must be batch or flex, got ${transport}`);
  if (fs.existsSync(file)) {
    const old = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (old.transport !== transport) throw Object.assign(Error(`transport plan already fixed to ${old.transport} at ${old.decidedAt}; refusing to switch to ${transport}`), { code: 'PLAN_SWITCH' });
    return old;
  }
  const plan = { transport, decidedAt: at, reason, pilot, rule: 'tasks/LI42-SECOND-FAMILY-PREREG.md: batch if it worked in the pilot, else flex; fixed before the first study wave, never switched mid-run' };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const t = `${file}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(plan, null, 1) + '\n'); fs.renameSync(t, file);
  return plan;
}
// The runner's view: the transport a wave may use. pilot: cfg.transport, switching to flex once (recorded) when batch
// fails and cfg.transportFallback is 'flex'. study: the plan file must exist before wave 0 and must still say what the
// first wave used.
export function transportFor({ cfg, out, k }) {
  const tf = path.join(out, 'transport.json'), cur = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : null;
  if (cfg.requireTransportPlan) {
    const pf = path.join(out, 'transport-plan.json');
    if (!fs.existsSync(pf)) throw Object.assign(Error(`no transport plan (${pf}) before wave ${k}: the study does not start without one`), { code: 'NO_PLAN' });
    const plan = JSON.parse(fs.readFileSync(pf, 'utf8'));
    if (cur && cur.mode !== plan.transport) throw Object.assign(Error(`transport plan says ${plan.transport} but the run started on ${cur.mode}: a switch mid-run is a failure of the run`), { code: 'PLAN_SWITCH' });
    if (!cur) writeAtomic(tf, { mode: plan.transport, since: k, plan: plan.decidedAt, history: [{ mode: plan.transport, wave: k, at: new Date().toISOString(), reason: 'transport plan' }] });
    return { mode: plan.transport, fallback: false, file: tf };
  }
  if (!cur) writeAtomic(tf, { mode: cfg.transport || 'batch', since: k, history: [{ mode: cfg.transport || 'batch', wave: k, at: new Date().toISOString(), reason: 'pilot start' }] });
  const now = JSON.parse(fs.readFileSync(tf, 'utf8'));
  return { mode: now.mode, fallback: cfg.transportFallback === 'flex' && now.mode === 'batch', file: tf };
}
export function switchToFlex(file, { wave, reason }) {
  const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cur.mode === 'flex') return cur;
  const next = { ...cur, mode: 'flex', switchedAt: new Date().toISOString(), switchedWave: wave, switchReason: reason, history: [...(cur.history || []), { mode: 'flex', wave, at: new Date().toISOString(), reason }] };
  writeAtomic(file, next); return next;
}
const writeAtomic = (f, x) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 1) + '\n'); fs.renameSync(t, f); };

// ---------- pilot stop rules (prereg "Pilot") ----------
// (a) projected study cost = cases x the pilot's cost per case (its own start wave + both arms) above the study cap
// (b) any refusal of a parameter (output limit, effort, response format) or of the transport (batch and flex both failed)
// (c) neither arm solved the pilot case within its rounds (spec pilot.stopIfNoArmSolves)
export function pilotGate({ pilotCostUsd, startWaveUsd, cases, studyCapUsd, refusals = [], transportFailed = null, solved = {}, stopIfNoArmSolves = true, capStopped = false, models = {}, transport = null }) {
  const projectedUsd = +(cases * pilotCostUsd).toFixed(6);
  const rules = {
    a_projectedCost: { projectedUsd, studyCapUsd, perCaseUsd: +pilotCostUsd.toFixed(6), startWaveUsd: +startWaveUsd.toFixed(6), armsUsd: +(pilotCostUsd - startWaveUsd).toFixed(6), formula: `${cases} x (pilot start wave + both arms)`, stop: !(projectedUsd <= studyCapUsd) },
    b_refusal: { refusals, transportFailed, stop: refusals.length > 0 || !!transportFailed },
    c_floor: { solved, enabled: !!stopIfNoArmSolves, stop: !!stopIfNoArmSolves && !Object.values(solved).some(Boolean) },
  };
  if (capStopped) rules.pilotCap = { stop: true, note: 'the pilot cap check stopped a pilot wave: the pilot is incomplete, so its cost and outcome are not known' };
  const stops = Object.entries(rules).filter(([, r]) => r.stop).map(([k]) => k);
  return { pass: stops.length === 0, stops, rules, models, transport, at: new Date().toISOString() };
}

// The remainder of a batch that ended cancelled or expired (prereg plan B, "flex if batch fails"): the results the batch
// returned are kept as they are; exactly the custom_ids it did not run (absent, or not executed: see notExecuted) are
// recorded here (transport.json history) and
// then sent on synchronous flex with the same bodies. In a pilot that was still on batch (plan B armed), the mode
// switches to flex from this wave on, as for a failed batch; a run already on flex keeps its mode. Idempotent per part.
export function recordRemainder(file, { wave, part, custom_ids, reason, switchMode = false }) {
  const cur = JSON.parse(fs.readFileSync(file, 'utf8')), at = new Date().toISOString();
  if ((cur.history || []).some((h) => h.scope === 'remainder' && h.wave === wave && h.part === part)) return cur;
  const next = { ...cur, ...(switchMode && cur.mode !== 'flex' ? { mode: 'flex', switchedAt: at, switchedWave: wave, switchReason: reason } : {}),
    history: [...(cur.history || []), { mode: 'flex', wave, part, scope: 'remainder', requests: custom_ids.length, custom_ids, at, reason }] };
  writeAtomic(file, next); return next;
}
const sha256 = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const readLines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
export function costOf(lines, usageCost) {
  let usd = 0, input = 0;
  for (const x of lines) { const m = x?.result?.message; if (x?.result?.type === 'succeeded' && m) { usd += usageCost(m.usage); input += (m.usage.input_tokens || 0) + (m.usage.cache_read_input_tokens || 0); } }
  return { usd, input };
}

// ---------- one wave part over the gateway ----------
// ctx: { k, i, part: rows {custom_id, body, inputTokens, reserveUsd}, name (ledger), configHash, mh, out, transport (from
// transportFor), api (makeClient), ledger { reserveWaves, attachActualManifest, markSubmitted, reconcileWave,
// releaseUnsubmitted }, journal { get(key), set(key, patch) } (serialised), usageCost(usage), pricedAs, log, flex
// { concurrency, retries, timeoutMs, backoffMs }, sleep }
// returns { raw: result lines (each tagged transport 'batch' or 'flex'), refusals, transport, flexRemainder }
// A batch that ends cancelled or expired: with some results, the results are kept and only the missing custom_ids go on
// flex, under their own ledger entry (<name>-flex) after the batch entry is reconciled to the returned results; with no
// result at all, nothing is resent and the part stops for the Research Leader (TransportFailure with leader: true).
export class TransportFailure extends Error { constructor(m, extra = {}) { super(m); Object.assign(this, extra); this.code = 'TRANSPORT'; } }

// synchronous flex for some rows of a part, resumable from its log (a call sent with no recorded outcome is uncertain and
// never resent); onStart runs once the log is known to be clean, before any call. Returns the lines in row order.
export function flexTransportError(line) {
  const r = line?.result; if (!r || r.type !== 'errored') return false;
  const s = Number(r.error?.status || 0), m = `${r.error?.code || ''} ${r.error?.message || ''}`;
  return s >= 500 || s === 429 || s === 408 || /time(d)?[ _-]?out/i.test(m);
}
async function flexRows(ctx, rows, flexLog, key, onStart) {
  const { api, pricedAs } = ctx, done = new Map(), sentOnly = new Set();
  // LI42 Amendment 3 on resume: a recorded outcome that is a transport-class error (HTTP 5xx, 429, 408, a timeout) is not a
  // delivered response; the request is sent again with the same body (the 524s of the pilot's wave-1 plan request)
  if (fs.existsSync(flexLog)) for (const x of readLines(flexLog)) { if (x.event === 'sent') sentOnly.add(x.custom_id); else { sentOnly.delete(x.custom_id); if (x.event === 'done') { if (flexTransportError(x.line)) done.delete(x.custom_id); else done.set(x.custom_id, x.line); } } }
  if (sentOnly.size) throw Error(`part ${key}: ${sentOnly.size} flex request(s) sent with no recorded outcome (a crash mid-call); uncertain, not retried`);
  await onStart?.();
  const append = (x) => fs.appendFileSync(flexLog, JSON.stringify(x) + '\n');
  const { concurrency = 16, retries = 8, timeoutMs = 20 * 60e3, backoffMs = 5000 } = ctx.flex || {}, sleep = ctx.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const todo = rows.filter((q) => !done.has(q.custom_id)); let next = 0, uncertain = 0;
  const one = async (q) => {
    const body = flexBody(q.body);
    for (let a = 0; ; a++) {
      append({ event: 'sent', custom_id: q.custom_id, attempt: a, at: new Date().toISOString() });
      try { const resp = await api.chat(body, { timeoutMs }); const line = normalizeCompletion(q.custom_id, resp, q.body, 'flex', pricedAs); append({ event: 'done', custom_id: q.custom_id, line }); return; }
      catch (err) {
        const retry = !err.definite || err.status === 429 || err.status === 408 || err.status === 409 || (err.status >= 500);
        if (!err.status) { uncertain += q.reserveUsd; } // a timeout or a dropped connection may still be billed: count its reserve
        if (retry && a < retries) { append({ event: 'retry', custom_id: q.custom_id, attempt: a, status: err.status, message: err.message.slice(0, 200), billedUnknown: !err.status }); await sleep(Math.min(120000, backoffMs * 2 ** a)); continue; }
        const line = normalizeError(q.custom_id, { status: err.status, error: err.error || { message: err.message } }, q.body, 'flex'); append({ event: 'done', custom_id: q.custom_id, line, billedUnknown: !err.status }); return;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, async () => { while (next < todo.length) await one(todo[next++]); }));
  const all = new Map(); for (const x of readLines(flexLog)) if (x.event === 'done') all.set(x.custom_id, x.line);
  return { lines: rows.map((q) => all.get(q.custom_id)), uncertain };
}

export async function runPart(ctx) {
  const { k, i, part, out, api, ledger, journal, log = () => {}, usageCost, pricedAs } = ctx;
  const key = `${k}.${i}`, sentById = new Map(part.map((q) => [q.custom_id, q.body]));
  const lines = part.map((q) => batchLine(q.custom_id, q.body)), jsonl = lines.map((x) => JSON.stringify(x)).join('\n') + '\n';
  const pres = part.reduce((n, q) => n + q.reserveUsd, 0), ptok = part.reduce((n, q) => n + q.inputTokens, 0);
  const resFile = path.join(out, `wave-${k}-p${i}.results.jsonl`), keptFile = path.join(out, `wave-${k}-p${i}.batch-results.jsonl`), flexLog = path.join(out, `wave-${k}-p${i}.flex.jsonl`);
  let e = await journal.get(key);
  if (e && e.manifestHash !== ctx.mh) throw Error(`part ${key} manifest differs from journal`);
  const reserve = async (name, transport) => {
    await ledger.reserveWaves({ studyHash: ctx.configHash, waves: [{ name, manifestHash: ctx.mh, requestCount: part.length, reserveUsd: pres }] });
    e = await journal.set(key, { manifestHash: ctx.mh, requestCount: part.length, reserveUsd: pres, measuredInputTokens: ptok, batchId: null, status: 'intent', transport, ledgerName: name, provider: PROVIDER });
    await ledger.attachActualManifest({ name, actualManifestHash: ctx.mh, requestCount: part.length });
  };
  if (!e) { fs.writeFileSync(path.join(out, `wave-${k}-p${i}.requests.jsonl`), jsonl); await reserve(ctx.name, ctx.transport.mode); }
  let raw = fs.existsSync(resFile) ? readLines(resFile) : null, uncertainUsd = e.uncertainUsd || 0;
  const leaderStop = (msg, extra = {}) => new TransportFailure(`${msg}; nothing was resent. The Research Leader decides what happens next (final stop, no automatic retry)`, { leader: true, ...extra });
  if (!raw && ['batch-ended-empty', 'batch-partial-stopped'].includes(e.status)) throw leaderStop(`part ${key}: ${e.batchEnd?.why || `batch ${e.batchId} ended ${e.status}`}`, { batchId: e.batchId, batchStatus: e.batchEnd?.status });

  // a batch that failed as a transport (not as a refusal): in the pilot, flex takes over under a new ledger entry
  const fallBack = async (why, extra = {}) => {
    if (!ctx.transport.fallback) throw new TransportFailure(`batch transport failed on part ${key}: ${why}`, extra);
    switchToFlex(ctx.transport.file, { wave: k, reason: `part ${key}: ${why}` });
    ctx.transport = { ...ctx.transport, mode: 'flex', fallback: false };
    log({ wave: k, part: i, transport: 'flex', fallbackFrom: 'batch', why });
    await journal.set(key, { batchFailure: { why, ...extra, at: new Date().toISOString() } });
    await reserve(`${ctx.name}-flex`, 'flex');
  };

  if (!raw && e.transport === 'batch' && e.status !== 'batch-partial') {
    if (!e.batchId) {
      if (e.submitAttempt) throw Error(`part ${key}: uncertain batch submission, not retried`);
      await journal.set(key, { submitAttempt: new Date().toISOString() });
      let batch = null;
      try {
        const file = await api.uploadBatchFile(jsonl, { filename: `wave-${k}-p${i}.jsonl` });
        await journal.set(key, { inputFileId: file.id });
        batch = await api.createBatch(file.id, { metadata: { part: `${ctx.name}` } });
      } catch (err) {
        if (!err.definite) throw err; // timeout / network: the batch may exist; uncertain, never retried
        const refusal = classifyRefusal(err.status, err.error);
        await ledger.releaseUnsubmitted({ name: e.ledgerName });
        if (refusal) { await journal.set(key, { status: 'refused', refusal }); return { raw: [], refusals: [{ custom_id: '*', where: err.where, ...refusal }], transport: 'batch' }; }
        await fallBack(`HTTP ${err.status} on ${err.where}: ${err.message}`, { status: err.status });
      }
      if (batch) {
        await ledger.markSubmitted({ name: e.ledgerName, batchId: batch.id, actualManifestHash: ctx.mh });
        e = await journal.set(key, { batchId: batch.id, status: 'submitted', submittedAt: new Date().toISOString() });
      }
    }
    if (e.transport === 'batch') {
      const ended = await api.waitForBatch(e.batchId, { intervalMs: ctx.pollMs ?? 20000, onPoll: (b) => writeAtomic(path.join(out, `status-p${i}.json`), { wave: k, part: i, batchId: e.batchId, status: b.status, counts: b.request_counts, at: new Date().toISOString() }) });
      fs.writeFileSync(path.join(out, `wave-${k}-p${i}.batch.json`), JSON.stringify(ended, null, 1) + '\n');
      if (ended.status === 'failed') {
        const errs = ended.errors?.data || [], refusals = errs.map((x) => classifyRefusal(400, x) && { custom_id: x.line != null ? `line-${x.line}` : '*', ...classifyRefusal(400, x) }).filter(Boolean);
        await ledger.reconcileWave({ name: e.ledgerName, batchId: e.batchId, resultCount: part.length, actualUsd: 0, allPriced: true }); // a failed batch ran nothing
        if (refusals.length) { await journal.set(key, { status: 'refused', refusals, actualUsd: 0 }); return { raw: [], refusals, transport: 'batch' }; }
        await journal.set(key, { status: 'batch-failed', actualUsd: 0 });
        await fallBack(`batch ${e.batchId} failed: ${errs.map((x) => x.message).join('; ').slice(0, 300) || 'no reason given'}`, { batchId: e.batchId });
      } else {
        const outText = ended.output_file_id ? await api.fileContent(ended.output_file_id) : '', errText = ended.error_file_id ? await api.fileContent(ended.error_file_id) : '';
        fs.writeFileSync(path.join(out, `wave-${k}-p${i}.openai-output.jsonl`), outText); if (errText) fs.writeFileSync(path.join(out, `wave-${k}-p${i}.openai-errors.jsonl`), errText);
        const got = [...outText.split('\n'), ...errText.split('\n')].filter(Boolean).map((l) => JSON.parse(l)), seen = new Set(), failedHow = new Map();
        raw = [];
        for (const x of got) {
          if (!sentById.has(x.custom_id) || seen.has(x.custom_id)) continue;
          const how = batchFailedRequest(x); if (how) { failedHow.set(x.custom_id, how); continue; } // not a result: resent on flex
          seen.add(x.custom_id); raw.push(normalizeBatchLine(x, sentById, pricedAs));
        }
        const missing = part.filter((q) => !seen.has(q.custom_id));
        if (missing.length) {
          // the batch did not deliver every request (cancelled or expired before it ran them, a transport-class error, or
          // no line at all): keep what came back, resend exactly the rest on flex
          const kinds = {}; for (const q of missing) { const h = failedHow.get(q.custom_id) || 'absent'; kinds[h] = (kinds[h] || 0) + 1; }
          const detail = Object.entries(kinds).map(([h, n]) => `${n} ${h}`).join(', ');
          const at = new Date().toISOString(), why = raw.length ? `batch ${e.batchId} ended ${ended.status} with ${raw.length} of ${part.length} results (${missing.length} without a result: ${detail})` : `batch ${e.batchId} ended ${ended.status} with no result (0 of ${part.length}: ${detail})`;
          const batchUsd = costOf(raw, usageCost).usd;
          await ledger.reconcileWave({ name: e.ledgerName, batchId: e.batchId, resultCount: part.length, actualUsd: batchUsd, allPriced: true }); // only what was returned is billed
          if (!raw.length) {
            await journal.set(key, { status: 'batch-ended-empty', actualUsd: 0, batchEnd: { status: ended.status, why, at } });
            log({ wave: k, part: i, batch: ended.status, results: 0, stop: 'leader' });
            throw leaderStop(`part ${key}: ${why}`, { batchId: e.batchId, batchStatus: ended.status });
          }
          if (!(ctx.transport.fallback || ctx.transport.mode === 'flex')) { // a study fixed on batch: flex would switch the transport mid-run
            fs.writeFileSync(keptFile, raw.map((x) => JSON.stringify(x)).join('\n') + '\n');
            await journal.set(key, { status: 'batch-partial-stopped', actualUsd: batchUsd, batchEnd: { status: ended.status, why, at, missing: missing.map((q) => q.custom_id) } });
            throw leaderStop(`part ${key}: ${why}; the transport plan is batch, so the remainder is not sent on flex`, { batchId: e.batchId, batchStatus: ended.status });
          }
          const ids = missing.map((q) => q.custom_id), flexName = `${ctx.name}-flex`;
          fs.writeFileSync(keptFile, raw.map((x) => JSON.stringify(x)).join('\n') + '\n');
          recordRemainder(ctx.transport.file, { wave: k, part: i, custom_ids: ids, reason: `part ${key}: ${why}; the ${ids.length} missing request(s) go on synchronous flex (plan B), the ${raw.length} returned are kept`, switchMode: !!ctx.transport.fallback });
          if (ctx.transport.fallback) ctx.transport = { ...ctx.transport, mode: 'flex', fallback: false };
          e = await journal.set(key, { status: 'batch-partial', batchActualUsd: batchUsd, batchResultCount: raw.length, batchEnd: { status: ended.status, why, at },
            flexRemainder: { custom_ids: ids, why, at, ledgerName: flexName, manifestHash: sha256({ manifestHash: ctx.mh, flexRemainder: ids }), reserveUsd: missing.reduce((n, q) => n + q.reserveUsd, 0), measuredInputTokens: missing.reduce((n, q) => n + q.inputTokens, 0) } });
          log({ wave: k, part: i, batch: ended.status, kept: raw.length, flexRemainder: ids.length, ledger: flexName });
          raw = null;
        }
      }
    }
  }

  // the flex remainder of a cancelled or expired batch (fresh or resumed): its own ledger entry, the same bodies
  if (!raw && e.status === 'batch-partial') {
    const fr = e.flexRemainder, want = new Set(fr.custom_ids), rows = part.filter((q) => want.has(q.custom_id)), kept = readLines(keptFile), fbid = `flex-${fr.ledgerName}`;
    if (rows.length !== fr.custom_ids.length) throw Error(`part ${key}: the flex remainder names requests this part does not have`);
    if (!fr.reserved) {
      await ledger.reserveWaves({ studyHash: ctx.configHash, waves: [{ name: fr.ledgerName, manifestHash: fr.manifestHash, requestCount: rows.length, reserveUsd: fr.reserveUsd }] });
      await ledger.attachActualManifest({ name: fr.ledgerName, actualManifestHash: fr.manifestHash, requestCount: rows.length });
      e = await journal.set(key, { flexRemainder: { ...fr, reserved: new Date().toISOString() } });
    }
    const r = await flexRows(ctx, rows, flexLog, key, async () => {
      if (e.flexRemainder.batchId) return;
      await ledger.markSubmitted({ name: fr.ledgerName, batchId: fbid, actualManifestHash: fr.manifestHash });
      e = await journal.set(key, { flexRemainder: { ...e.flexRemainder, batchId: fbid, submittedAt: new Date().toISOString() } });
    });
    const unc = (e.flexRemainder.uncertainUsd || 0) + r.uncertain, flexUsd = costOf(r.lines, usageCost).usd + unc;
    e = await journal.set(key, { flexRemainder: { ...e.flexRemainder, uncertainUsd: unc } });
    if (!r.lines.some((x) => x.result.type === 'succeeded') && !refusalsOf(r.lines).length) {
      await ledger.reconcileWave({ name: fr.ledgerName, batchId: fbid, resultCount: rows.length, actualUsd: unc, allPriced: true });
      await journal.set(key, { status: 'flex-failed', actualUsd: e.batchActualUsd + unc });
      throw new TransportFailure(`flex transport failed on the remainder of part ${key}: no request answered (${r.lines[0]?.result?.error?.message || 'no reason'})`);
    }
    await ledger.reconcileWave({ name: fr.ledgerName, batchId: fbid, resultCount: rows.length, actualUsd: flexUsd, allPriced: true });
    e = await journal.set(key, { flexRemainder: { ...e.flexRemainder, actualUsd: flexUsd, reconciled: new Date().toISOString() } });
    const byId = new Map([...kept, ...r.lines].map((x) => [x.custom_id, x]));
    raw = part.map((q) => byId.get(q.custom_id));
    if (raw.some((x) => !x)) throw Error(`part ${key}: a request has neither a batch nor a flex result`);
  }

  if (!raw && e.transport === 'flex') {
    const r = await flexRows(ctx, part, flexLog, key, async () => {
      if (e.batchId) return;
      await ledger.markSubmitted({ name: e.ledgerName, batchId: `flex-${e.ledgerName}`, actualManifestHash: ctx.mh });
      e = await journal.set(key, { batchId: `flex-${e.ledgerName}`, status: 'submitted', submittedAt: new Date().toISOString() });
    });
    raw = r.lines;
    uncertainUsd += r.uncertain; await journal.set(key, { uncertainUsd });
    if (!raw.some((x) => x.result.type === 'succeeded') && !refusalsOf(raw).length) {
      await ledger.reconcileWave({ name: e.ledgerName, batchId: e.batchId, resultCount: part.length, actualUsd: uncertainUsd, allPriced: true });
      await journal.set(key, { status: 'flex-failed', actualUsd: uncertainUsd });
      throw new TransportFailure(`flex transport failed on part ${key}: no request answered (${raw[0]?.result?.error?.message || 'no reason'})`);
    }
  }

  if (!raw) throw Error(`part ${key}: no results`);
  if (!fs.existsSync(resFile)) fs.writeFileSync(resFile, raw.map((x) => JSON.stringify(x)).join('\n') + '\n');
  e = await journal.get(key);
  if (e.status !== 'complete') {
    const c = costOf(raw, usageCost);
    if (e.flexRemainder) {
      // both ledger entries (the batch's returned results, the flex remainder) were reconciled before the results file was
      // written; the part's actual is their sum, so the cap checks (journal and ledger) see both
      await journal.set(key, { status: 'complete', actualUsd: c.usd + (e.uncertainUsd || 0) + (e.flexRemainder.uncertainUsd || 0), actualInputTokens: c.input });
    } else {
      const usd = (e.uncertainUsd || 0) + c.usd;
      await ledger.reconcileWave({ name: e.ledgerName, batchId: e.batchId, resultCount: raw.length, actualUsd: usd, allPriced: true });
      await journal.set(key, { status: 'complete', actualUsd: usd, actualInputTokens: c.input });
    }
  }
  e = await journal.get(key);
  const fr = e.flexRemainder ? { custom_ids: e.flexRemainder.custom_ids, why: e.flexRemainder.why, ledgerName: e.flexRemainder.ledgerName, at: e.flexRemainder.at } : null;
  return { raw, refusals: refusalsOf(raw), transport: e.transport, flexRemainder: fr };
}
