// A fake LiteLLM gateway and a fake gpt-6-luna for LI42 dry runs and tests: no network, no key, no cost. It answers the
// real client (library/cards/openai-litellm-api.mjs) at the fetch level, so the dry run exercises the same JSONL upload,
// batch create / poll / output and error files, and synchronous flex calls as a paid run.
// The fake model is an oracle with a skill: asked to resolve failing checks, it writes, with probability `skill` per
// function and wave, code that passes them (a lookup table over the check's own test inputs, calling the helper the way
// the check requires); everything else in the module stays as it was (functions it got right keep a //ok mark) or a
// stub. Traces: one per bracketed check. Manager plans: every module named in the failing checks. Usage is bytes / 2.8
// (more than the runner's bytes / 3 estimate, so the reserve calibration is exercised), 300 reasoning tokens a reply.
// Modes (RC_OPENAI_FAKE=<mode>): ok | nosolve (skill 0: stop rule c) | refuse-128k (a 400 on max_completion_tokens above
// 100000: stop rule b) | batch-down (POST /v1/batches answers 404: the pilot falls back to flex) | expensive (usage x 400:
// stop rule a) | flex-down (every chat call 503: with batch-down, the transport is refused) | batch-cancel-partial,
// batch-expire-partial (the batch ends cancelled / expired after answering the first half of its lines, as a cancelled or
// expired OpenAI batch returns the completed ones in its output file) | batch-cancel-empty (cancelled with no result) |
// batch-cancel-5xx (cancelled at half; the other half come back in the error file as HTTP 500 server_error lines while
// request_counts says failed 0, the LI42 pilot wave 0 case of 2026-11-23) | batch-cancel-5xx-400 (the same, and the last
// answered line is a 400 that is not a parameter refusal) | batch-400-one (a completed batch whose last line is that 400).
// Restart checks: fakeFetch({ remote }) knows batches it never created (id -> { input: JSONL text of the requests, end:
// completed | cancelled | expired, answered }), as after a runner restart on a batch submitted before it; `trace` gets
// every call (method and path). fakeClient takes them from RC_OPENAI_FAKE_REMOTE (a JSON file, input as a file path) and
// RC_OPENAI_FAKE_TRACE (a file the calls are appended to).
// Guard: it refuses to run unless UNFOLD_LEDGER points to a ledger copy (never the bench's canonical ledger).
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as W from './code.mjs';
import { makeClient } from '../../../library/cards/openai-litellm-api.mjs';

const CANON = '/srv/bench/ledger/global-budget.json';
const h01 = (s) => crypto.createHash('sha256').update(s).digest().readUInt32LE(0) / 0xffffffff;
const mod = (i) => `M${i + 1}`;
const J = (x) => JSON.stringify(x);

// correct code for one function of module m, from the instance (checks' own inputs and references)
export function oracleFn(inst, m, name) {
  for (const c of inst.checks) {
    if (c.kind === 'local' && c.owner === m && c.fn === name) return `function ${name}(s) { const T = ${J(Object.fromEntries(c.inputs.map((s) => [J(s), c.ref(s)])))}; return T[JSON.stringify(s)]; } //ok`;
    if (c.kind === 'directed' && c.holder === m && c.fn === name) return `function ${name}(s) { const T = ${J(Object.fromEntries(c.inputs.map((s) => [J([s, c.hRef(s)]), c.ref(s)])))}; return T[JSON.stringify([s, ${mod(c.impl)}.${c.helper}(s)])]; } //ok`;
    if (c.kind === 'directed' && c.impl === m && c.helper === name) return `function ${name}(s) { const T = ${J(Object.fromEntries(c.inputs.map((s) => [J(s), c.hRef(s)])))}; return T[JSON.stringify(s)]; } //ok`;
    if (c.kind === 'symmetric' && c.prod === m && c.enc === name) return `function ${name}(rec) { const T = ${J(Object.fromEntries(c.inputs.map((r, i) => [J(r), `r${i}`])))}; return T[JSON.stringify(rec)]; } //ok`;
    if (c.kind === 'symmetric' && c.cons === m && c.dec === name) return `function ${name}(str) { const T = ${J(Object.fromEntries(c.inputs.map((r, i) => [`r${i}`, r])))}; return T[str]; } //ok`;
  }
  return `function ${name}(x) { return x; }`;
}

// The fake reads only the request body, as the real model does (a flex call carries no custom_id): the case is the
// instance of the run whose specification lines the prompt contains, the module is the one the prompt names.
export function fakeAnswer({ body, cfg, skill = 0.8, cache = new Map() }) {
  const content = body.messages[0].content, props = body.response_format.json_schema.schema.properties, tag = crypto.createHash('sha256').update(content).digest('hex');
  if (!cache.size) for (let i = 0; i < cfg.cases; i++) cache.set(cfg.seed0 + i, W.makeInstance(cfg.k, cfg.seed0 + i, cfg.shape));
  const mm = content.match(/developer of module M(\d+) in a small/), m = mm ? Number(mm[1]) - 1 : 0;
  const inst = [...cache.values()].find((x) => x.specs[m].every((l) => content.includes(l)));
  if (!inst) throw Error('fake: the prompt matches no case of this run');
  if (props.assignments) {
    const sec = content.split('Failing checks now:\n')[1]?.split('\nDecide which')[0] || '';
    const ms = [...new Set([...sec.matchAll(/\bM(\d+)\b/g)].map((x) => Number(x[1])))].filter((x) => x >= 1 && x <= inst.k);
    return { assignments: ms.map((x) => ({ module: `M${x}`, instruction: 'Resolve every failing check that involves your module, following the specification.' })) };
  }
  const out = {};
  if (props.code) {
    const cur = content.split(`--- current code of ${mod(m)} ---\n`)[1] || '', kept = new Set([...cur.matchAll(/^function (\w+)\(.*\/\/ok$/gm)].map((x) => x[1]));
    const asked = content.split('Failing checks you are asked to resolve now:\n')[1]?.split('\n--- current code')[0] || '';
    out.code = inst.names[m].map((n) => (kept.has(n) || (asked.includes(n) && h01(`${n}:${tag}`) < skill) ? oracleFn(inst, m, n) : `function ${n}(x) { return x; }`)).join('\n');
  }
  if (props.traces) out.traces = [...content.matchAll(/^- \[([^\]]+)\]/gm)].map((x) => ({ check: x[1], text: 'the helper must return what the caller specification says' }));
  if (props.messages) out.messages = [];
  if (props.modules) out.modules = [];
  return out;
}

export function fakeFetch({ mode = 'ok', cfg, remote = {}, trace = null }) {
  const files = new Map(), batches = new Map(), cache = new Map(); let n = 0;
  const skill = mode === 'nosolve' ? 0 : 0.8, mult = mode === 'expensive' ? 400 : 1;
  const res = (status, x) => new Response(typeof x === 'string' ? x : JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
  const complete = (body) => {
    if (mode === 'refuse-128k' && body.max_completion_tokens > 100000) return { status: 400, body: { error: { message: `max_completion_tokens is too large: ${body.max_completion_tokens}. This model supports at most 100000 completion tokens.`, type: 'invalid_request_error', param: 'max_completion_tokens', code: 'invalid_value' } } };
    const ans = J(fakeAnswer({ body, cfg, skill, cache })), prompt = Math.ceil(Buffer.byteLength(J(body.messages)) / 2.8) * mult, cached = prompt > 1024 ? 128 : 0;
    return { status: 200, body: { id: `chatcmpl-fake-${++n}`, object: 'chat.completion', model: 'gpt-6-luna-fake', service_tier: body.service_tier || 'default',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: ans, refusal: null } }],
      usage: { prompt_tokens: prompt, completion_tokens: (Math.ceil(Buffer.byteLength(ans) / 3) + 300) * mult, total_tokens: 0, prompt_tokens_details: { cached_tokens: cached }, completion_tokens_details: { reasoning_tokens: 300 * mult } } } };
  };
  // a batch over the JSONL text: the first `answered` lines are answered (null: half, Infinity: all), then it ends `end`;
  // as the real gateway does (cancel check 2026-11-23), a cancelled or expired batch lists the requests it never ran in
  // its error file (no response, error.code batch_cancelled / batch_expired); with no answer it has no output file
  // tail '500': the lines after `answered` come back as HTTP 500 server errors (request_counts still failed 0, as seen);
  // bad400: the last answered line is a 400 that is not a parameter refusal
  const E500 = { error: { message: 'The server had an error while processing your request. Sorry about that!', type: 'server_error', param: null, code: null } };
  const E400 = { error: { message: 'Your prompt was flagged as potentially violating our usage policy.', type: 'invalid_request_error', param: null, code: 'invalid_prompt' } };
  const runBatch = (id, text, end, answered, { tail = 'notexec', bad400 = false } = {}) => {
    const lines = text.split('\n').filter(Boolean).map((l) => JSON.parse(l)), upto = answered == null ? Math.ceil(lines.length / 2) : Math.min(answered, lines.length), ok = [], bad = [];
    for (const [j, x] of lines.slice(0, upto).entries()) { const r = bad400 && j === upto - 1 ? { status: 400, body: E400 } : complete(x.body); (r.status === 200 ? ok : bad).push({ id: `req-${++n}`, custom_id: x.custom_id, response: { status_code: r.status, request_id: `r${n}`, body: r.body }, error: null }); }
    if (tail === '500') for (const x of lines.slice(upto)) bad.push({ id: `req-${++n}`, custom_id: x.custom_id, response: { status_code: 500, request_id: `r${n}`, body: E500 }, error: null, uncounted: true });
    else if (end !== 'completed') for (const x of lines.slice(upto)) bad.push({ id: `req-${++n}`, custom_id: x.custom_id, response: null, error: end === 'cancelled' ? { code: 'batch_cancelled', message: 'This request was not executed because the batch was cancelled.' } : { code: 'batch_expired', message: 'This request could not be executed before the completion window expired.' } });
    const outId = ok.length || end === 'completed' ? `file-fake${++n}` : null, errId = bad.length ? `file-fake${++n}` : null; if (outId) files.set(outId, ok.map(J).join('\n') + (ok.length ? '\n' : '')); if (errId) files.set(errId, bad.map(({ uncounted, ...x }) => J(x)).join('\n') + '\n');
    return { polls: 0, done: { id, object: 'batch', status: end, output_file_id: outId, error_file_id: errId, request_counts: { total: lines.length, completed: ok.length, failed: bad.filter((x) => x.response && !x.uncounted).length } } };
  };
  return async (url, init = {}) => {
    const u = new URL(url), p = u.pathname, method = init.method || 'GET';
    trace?.(`${method} ${p}`);
    if (!String(init.headers?.authorization || '').startsWith('Bearer ')) return res(401, { error: { message: 'no key' } });
    if (method === 'POST' && p === '/v1/files') { const f = init.body.get('file'), id = `file-fake${++n}`; files.set(id, await f.text()); return res(200, { id, object: 'file', purpose: 'batch', bytes: 0 }); }
    if (method === 'POST' && p === '/v1/batches') {
      if (mode === 'batch-down' || mode === 'flex-down') return res(404, { error: { message: 'batches are not available for this model on this gateway', type: 'not_found', param: null, code: '404' } });
      const b = JSON.parse(init.body); if (!files.has(b.input_file_id)) return res(400, { error: { message: 'unknown input file' } });
      const id = `batch_fake${++n}`, end = { 'batch-cancel-partial': 'cancelled', 'batch-expire-partial': 'expired', 'batch-cancel-empty': 'cancelled', 'batch-cancel-5xx': 'cancelled', 'batch-cancel-5xx-400': 'cancelled' }[mode] || 'completed';
      batches.set(id, runBatch(id, files.get(b.input_file_id), end, mode === 'batch-cancel-empty' ? 0 : end === 'completed' ? Infinity : null, { tail: mode.startsWith('batch-cancel-5xx') ? '500' : 'notexec', bad400: mode === 'batch-cancel-5xx-400' || mode === 'batch-400-one' }));
      return res(200, { id, object: 'batch', status: 'validating', input_file_id: b.input_file_id });
    }
    let m;
    if (method === 'GET' && (m = p.match(/^\/v1\/batches\/([^/]+)$/))) {
      if (!batches.has(m[1]) && remote[m[1]]) { const r = remote[m[1]]; batches.set(m[1], runBatch(m[1], r.input, r.end || 'completed', r.answered ?? (r.end && r.end !== 'completed' ? null : Infinity), { tail: r.tail, bad400: r.bad400 })); }
      const b = batches.get(m[1]); if (!b) return res(404, { error: { message: 'no batch' } }); return res(200, b.polls++ < 1 ? { ...b.done, status: 'in_progress', output_file_id: null, error_file_id: null } : b.done);
    }
    if (method === 'GET' && (m = p.match(/^\/v1\/files\/([^/]+)\/content$/))) return files.has(m[1]) ? new Response(files.get(m[1]), { status: 200 }) : res(404, { error: { message: 'no file' } });
    if (method === 'POST' && p === '/v1/chat/completions') {
      if (mode === 'flex-down') return res(503, { error: { message: 'flex capacity unavailable', type: 'service_unavailable' } });
      const r = complete(JSON.parse(init.body)); return res(r.status, r.body);
    }
    if (method === 'POST' && p === '/utils/token_counter') { const b = JSON.parse(init.body); return res(200, { total_tokens: Math.ceil(Buffer.byteLength(J(b.messages)) / 3) }); }
    return res(404, { error: { message: `fake gateway: no route ${method} ${p}` } });
  };
}
export function fakeClient({ mode = 'ok', cfg }) {
  const led = process.env.UNFOLD_LEDGER;
  if (!led || led === CANON) throw Error('fake gateway: set UNFOLD_LEDGER to a ledger copy; the fake never runs against the canonical ledger');
  const rf = process.env.RC_OPENAI_FAKE_REMOTE, tf = process.env.RC_OPENAI_FAKE_TRACE;
  const remote = rf ? Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(rf, 'utf8'))).map(([id, r]) => [id, { ...r, input: fs.readFileSync(r.input, 'utf8') }])) : {};
  const trace = tf ? (line) => fs.appendFileSync(tf, line + '\n') : null;
  return Object.assign(makeClient({ fetchImpl: fakeFetch({ mode, cfg, remote, trace }), base: 'http://fake-gateway.invalid', apiKey: 'fake-not-a-secret' }), { fake: mode });
}
