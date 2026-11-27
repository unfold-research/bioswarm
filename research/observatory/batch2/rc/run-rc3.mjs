// run-rc3 (LI10): run-rc2 with waves split into several batches when one would exceed the per-batch cap; each part is
// reserved, submitted, awaited and reconciled on its own (journal key '<wave>.<part>'); parts of a wave run concurrently.
// run-rc2 (LI9): run-rc plus arm 'manager' (a lead agent with every specification reads the failing checks and assigns
// which developers change their module, with an instruction each; the developers act in the next wave; so the manager arm
// alternates plan and act waves and gets the same number of act rounds as the others, in twice the waves).
// Original header: LI7 runner (tasks/LI7-REAL-CODE-PREREG.md): members own modules of a small JS codebase; the field is the executed test
// suite (rc/code.mjs). Same lockstep and ledger discipline as ne/run-gen4.mjs: every arm of every case advances one round per
// wave, one Message Batch per wave, reserved in the shared ledger before its single POST, never retried when uncertain,
// reconciled from returned usage, resumable. New: a per-study cap (cfg.studyCapUsd) checked before each wave from the
// actual spend so far plus the wave's reserve (LI5 overran its registered cap because the runner had no such check).
// LI42: cfg.provider 'openai-litellm' sends the same requests to gpt-6-luna through the LiteLLM gateway (provider-openai.mjs:
// translation to Chat Completions, batch or synchronous flex transport, results normalised to the shape read below, a
// transport plan fixed before the study's first wave). Without cfg.provider (every study before LI42) nothing changes:
// the same requests, byte for byte (anthropic-path.test.mjs checks LI41's), through Anthropic Message Batches.
// A batch that ends cancelled or expired keeps its returned results and sends only the missing requests on flex
// (provider-openai.mjs runPart; recorded in transport.json, the journal and state.flexRemainders); with no result at all
// nothing is resent and the run exits 6 with transportFailed.leader set (the Research Leader decides).
// LI42 Amendment 3: transport-class errors inside a batch (5xx, 429, timeout) go to the flex remainder the same way; and
// no wave is applied unless every request has a response the API delivered (else exit 6, transportFailed.invariant).
// Exit codes: 3 study cap stop (incomplete), 5 the model refused a parameter, 6 transport failed or switched mid-run.
// Usage: node observatory/batch2/rc/run-rc.mjs <config.json> [--dry]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as W from './code.mjs';
import { mechanismOf } from './mechanisms.mjs';
import { reserveWaves, attachActualManifest, markSubmitted, reconcileWave, releaseUnsubmitted } from '../../lab007-instrument-audit/global-budget.mjs';
import { priceFor, usageCostFor, reserveMeasured, measureRows } from '../../lab007-economy/pricing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const WAVE_CAP_USD = 5;
const cfgFile = process.argv[2], dry = process.argv.includes('--dry');
let capStopped = false;
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const OPENAI = cfg.provider === 'openai-litellm';
if (cfg.provider && !OPENAI) throw new Error(`Unknown provider ${cfg.provider}`);
const P = OPENAI ? await import('./provider-openai.mjs') : null;
let refused = null, transportFailed = null;
const OUT = path.join(ROOT, 'results', cfg.out); fs.mkdirSync(OUT, { recursive: true });
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const atomic = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 2) + '\n'); fs.renameSync(t, f); };
const readj = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
priceFor(cfg.model); // fails closed on a model with no registered price
// Reserve from MEASURED input tokens (free token-count endpoint, one call per distinct prompt) at the band they fall in;
// usage priced per model with Haiku 5.5's long-prompt band (pricing.mjs). Before this, every request was priced at the
// short band and reserved from bytes / 3, so prompts above 100k tokens (large manager plans) were understated 5x.
// RC_COUNT_STUB=YES counts bytes / 3 instead, for offline dry runs only (it never reaches a paid wave: --dry stops first).
const usageCost = (u) => usageCostFor(cfg.model, u);
const tokenCache = new Map();
let countFn = null;
const counter = async () => countFn ??= process.env.RC_COUNT_STUB === 'YES' ? async (p) => Math.ceil(Buffer.byteLength(JSON.stringify(p)) / 3) : (await import('../../../library/cards/batch-api.mjs')).countTokens;
async function measure(rows) { const t = await measureRows(rows, await counter(), { cache: tokenCache, hashFn: sha }); rows.forEach((q, i) => { q.inputTokens = t[i]; q.reserveUsd = reserveMeasured(q.params, t[i]).usd; }); }
// openai-litellm: no count_tokens; the estimate is max(gateway token_counter, bytes / 3) + schema, times the run's own
// calibration (largest actual / estimated prompt tokens so far), so a reserve never trails the real tokenizer
let oaClient = null;
const oaApi = async () => (oaClient ??= process.env.RC_OPENAI_FAKE ? (await import('./openai-fake.mjs')).fakeClient({ mode: process.env.RC_OPENAI_FAKE, cfg }) : (await import('../../../library/cards/openai-litellm-api.mjs')).makeClient({ routing: { headers: { 'x-litellm-model': cfg.model } } }));
async function measureOpenAI(rows, journal) {
  const live = process.env.RC_COUNT_STUB !== 'YES' && !process.env.RC_OPENAI_FAKE, api = live ? await oaApi() : null, calib = P.calibration(journal);
  for (const q of rows) q.body = P.toOpenAIBody(q.params, { model: cfg.model });
  const t = await measureRows(rows.map((q) => ({ params: q.body })), async (b) => P.estimateTokens(b, live ? await api.countTokens(b.model, b.messages) : null), { cache: tokenCache, hashFn: sha });
  rows.forEach((q, i) => { q.inputTokens = Math.ceil(t[i] * calib); q.reserveUsd = reserveMeasured(q.params, q.inputTokens).usd; });
  return calib;
}
const reserveFor = (q) => q.reserveUsd;
/* the study cap is budget, not design: it is left out of the hash so a cap can be raised on resume (LI27/LI28 lesson) */
const configHash = sha({ cfg: { ...cfg, studyCapUsd: undefined }, sources: [...['code.mjs', 'run-rc3.mjs', 'mechanisms.mjs'].map((f) => sha(fs.readFileSync(path.join(HERE, f)))), sha(fs.readFileSync(path.join(HERE, '../../lab007-economy/pricing.mjs'))), ...(OPENAI ? ['provider-openai.mjs', '../../../library/cards/openai-litellm-api.mjs'].map((f) => sha(fs.readFileSync(path.join(HERE, f)))) : [])] });

const instances = Array.from({ length: cfg.cases }, (_, i) => ({ key: `k${cfg.k}s${cfg.seed0 + i}`, seed: cfg.seed0 + i }));
const built = new Map(instances.map((x) => [x.key, W.makeInstance(cfg.k, x.seed, cfg.shape)]));
const stateFile = path.join(OUT, 'state.json');
// state.arms[arm][inst] = { code: [...], solved, inbox, history: [{ wave, counts, failing, actors, acted, outMax, outSum, inSum, usd, trunc, sent }] }
const state = readj(stateFile, { configHash, arms: {} });
if (state.configHash !== configHash) throw new Error('Config or sources changed since this run started');
const swarmArms = cfg.arms.filter((a) => a !== 'solo');

// LI13 member loss: a member (or the manager's plan) is down in a wave with probability cfg.lossRate, by a hash of case,
// member and wave that does not depend on the arm, so every arm loses the same members in the same wave. A down member
// sends nothing that wave and keeps its module.
const down = (xkey, m, k) => !!cfg.lossRate && (parseInt(sha(`loss:${xkey}:${m}:${k}`).slice(0, 8), 16) / 0xffffffff) < cfg.lossRate;
function requestsFor(k) {
  const rows = [];
  if (k === 0) {
    for (const x of instances) { const inst = built.get(x.key), empty = new Array(inst.k).fill('');
      for (let m = 0; m < inst.k; m++) rows.push({ custom_id: `start-${x.key}-m${m}`, arm: 'start', inst: x.key, m, params: W.memberRequest(cfg.model, inst, m, empty, [], cfg.memberMax, { effort: cfg.effort }) });
      if (cfg.arms.includes('solo')) rows.push({ custom_id: `solo-${x.key}-w0`, arm: 'solo', inst: x.key, m: null, params: W.soloRequest(cfg.model, inst, null, [], cfg.soloMax, cfg.effort) }); }
    return rows;
  }
  for (const arm of cfg.arms) for (const x of instances) {
    const s = state.arms[arm]?.[x.key]; if (!s || s.solved) continue; const inst = built.get(x.key), vs = W.check(inst, s.code, { strict: !!cfg.strictFeedback }); if (!vs.length) continue;
    if (cfg.waveBudget && k > cfg.rounds) continue;
    if (arm === 'manager') {
      if ((s.actRounds || 0) >= cfg.rounds) continue;
      if (!s.pending) { if (down(x.key, 'plan', k)) continue; rows.push({ custom_id: `manager-${x.key}-w${k}-plan`, arm, inst: x.key, m: 'plan', params: W.managerRequest(cfg.model, inst, vs, cfg.managerMax, cfg.managerEffort ?? cfg.effort) }); continue; }
      for (const a of s.pending) if (!down(x.key, a.m, k)) rows.push({ custom_id: `manager-${x.key}-w${k}-m${a.m}`, arm, inst: x.key, m: a.m, params: W.memberRequest(cfg.model, inst, a.m, s.code, vs.filter((v) => v.parts.includes(a.m)), cfg.memberMax, { effort: cfg.effort, instruction: a.text }) });
      continue; }
    if (k > cfg.rounds) continue;
    if (arm === 'solo') { rows.push({ custom_id: `solo-${x.key}-w${k}`, arm, inst: x.key, m: null, params: W.soloRequest(cfg.model, inst, s.code, vs, cfg.soloMax, cfg.effort) }); continue; }
    const mech = mechanismOf(cfg, arm), chat = !!mech.chat, p = W.plan(inst, vs, k, mech.rule, mech.evaporate ? Object.fromEntries(Object.entries(s.traces || {}).filter(([id]) => k - (s.traceAt?.[id] ?? k) <= mech.evaporate)) : (s.traces || {}));
    for (const [m, assigned] of p) {
      if (down(x.key, m, k)) continue;
      const params = W.memberRequest(cfg.model, inst, m, s.code, assigned, cfg.memberMax, { effort: cfg.effort, chat, inbox: s.inbox?.[m] || [] });
      // LI14 clonal selection: a helper owner acting on a failing directed check produces cfg.clones variants; the field
      // (the strict check) selects the one that leaves the fewest failing checks on its module
      const clones = mech.clones && assigned.some((v) => !v.traceOnly && v.kind === 'directed' && inst.checks.find((c) => c.id === v.id)?.impl === m) ? (cfg.clones || mech.clones) : 0;
      if (clones) for (let j = 0; j < clones; j++) rows.push({ custom_id: `${arm}-${x.key}-w${k}-m${m}-v${j}`, arm, inst: x.key, m, v: j, params });
      else rows.push({ custom_id: `${arm}-${x.key}-w${k}-m${m}`, arm, inst: x.key, m, params });
    }
  }
  return rows;
}

function apply(k, rows, outputs) {
  const agg = new Map();
  for (const q of rows) { const o = outputs.get(q.custom_id), key = `${q.arm}|${q.inst}`; if (!agg.has(key)) agg.set(key, { rows: [], outMax: 0, outSum: 0, inSum: 0, usd: 0, trunc: 0 }); const a = agg.get(key); a.rows.push([q, o]); a.outMax = Math.max(a.outMax, o.usage.output_tokens); a.outSum += o.usage.output_tokens; a.inSum += o.usage.input_tokens; a.usd += usageCost(o.usage); if (o.stop === 'max_tokens') a.trunc++; }
  for (const [key, a] of agg) {
    const [arm, ik] = key.split('|'), inst = built.get(ik);
    for (const t of arm === 'start' ? swarmArms : [arm]) {
      state.arms[t] ||= {}; const s = state.arms[t][ik] ||= { code: new Array(inst.k).fill(''), solved: false, history: [] };
      const acted = []; let sent = 0;
      const variants = new Map();
      for (const [q, o] of a.rows) {
        if (q.v != null) { if (!variants.has(q.m)) variants.set(q.m, []); variants.get(q.m).push(o); continue; }
        if (q.m === 'plan') { const as = []; for (const a of o.json?.assignments || []) { const m = Number(String(a.module).replace(/\D/g, '')) - 1; if (m >= 0 && m < inst.k && !as.some((z) => z.m === m)) as.push({ m, text: String(a.instruction || '').slice(0, 600) }); } s.pending = as.length ? as : null; s.plans = (s.plans || 0) + 1; continue; }
        if (q.m === null) { for (const md of o.json?.modules || []) { const m = Number(String(md.module).replace(/\D/g, '')) - 1; if (m >= 0 && m < inst.k && typeof md.code === 'string' && md.code.trim()) { if (md.code !== s.code[m]) acted.push(m); s.code[m] = md.code; } } continue; }
        for (const tr of (o.json?.traces || []).slice(0, 20)) { const id = String(tr.check || '').trim().replace(/^\[\s*|\s*\]$/g, ''); /* the prompt shows ids in brackets; agents often copy them */ if (inst.checks.some((x) => x.id === id && x.kind === 'directed' && x.holder === q.m)) { (s.traces ||= {})[id] = String(tr.text || '').slice(0, 400); (s.traceAt ||= {})[id] = k; sent++; } }
        const c = o.json?.code; if (typeof c === 'string' && c.trim()) { if (c !== s.code[q.m]) acted.push(q.m); s.code[q.m] = c; }
      }
      for (const [m, outs] of variants) {
        let best = null, bestN = Infinity;
        for (const o of outs) { const c = o.json?.code; if (typeof c !== 'string' || !c.trim()) continue; const trial = s.code.slice(); trial[m] = c; const n = W.check(inst, trial, { strict: !!cfg.strictFeedback }).filter((v) => v.parts.includes(m)).length; if (n < bestN) { best = o; bestN = n; } }
        if (!best) continue;
        for (const tr of (best.json?.traces || []).slice(0, 20)) { const id = String(tr.check || '').trim().replace(/^\[\s*|\s*\]$/g, ''); /* the prompt shows ids in brackets; agents often copy them */ if (inst.checks.some((x) => x.id === id && x.kind === 'directed' && x.holder === m)) { (s.traces ||= {})[id] = String(tr.text || '').slice(0, 400); (s.traceAt ||= {})[id] = k; sent++; } }
        if (best.json.code !== s.code[m]) acted.push(m); s.code[m] = best.json.code; (s.selected ||= []).push({ wave: k, m, of: outs.length, failing: bestN });
      }
      if (t === 'manager' && arm === 'manager' && a.rows.some(([q]) => q.m !== 'plan')) { s.pending = null; s.actRounds = (s.actRounds || 0) + 1; }
      if (arm === t && mechanismOf(cfg, t).chat) { s.inbox = {}; for (const [q, o] of a.rows) for (const msg of (o.json?.messages || []).slice(0, 3)) { const to = Number(String(msg.to).replace(/\D/g, '')) - 1; if (to >= 0 && to < inst.k && to !== q.m) { (s.inbox[to] ||= []).push({ from: q.m, text: String(msg.text).slice(0, 300) }); sent++; } } }
      const vs = W.check(inst, s.code, { strict: !!cfg.strictFeedback }); s.solved = vs.length === 0;
      s.history.push({ wave: k, counts: W.counts(vs), failing: vs.map((v) => v.id), actors: a.rows.length, acted, outMax: a.outMax, outSum: a.outSum, inSum: a.inSum, usd: a.usd, trunc: a.trunc, sent, shared: arm === 'start', code: s.code.slice() });
    }
  }
  for (const arm of cfg.arms) for (const x of instances) { const s = state.arms[arm]?.[x.key]; if (s && s.history.at(-1)?.wave !== k) { const vs = W.check(built.get(x.key), s.code, { strict: !!cfg.strictFeedback }); s.history.push({ wave: k, counts: W.counts(vs), failing: vs.map((v) => v.id), actors: 0, acted: [], outMax: 0, outSum: 0, inSum: 0, usd: 0, trunc: 0, sent: 0 }); } }
}

async function runWave(k) {
  const rows = requestsFor(k);
  // a wave emptied by member loss is not the end while cases are unsolved (LI13 review: a run ended early this way)
  if (!rows.length) return !!cfg.lossRate && Object.values(state.arms).some((cs) => Object.values(cs).some((c) => !c.solved));
  if (dry && process.env.RC_COUNT_STUB !== 'YES' && !process.env.RC_COUNT_LIVE) process.env.RC_COUNT_STUB = 'YES'; // a dry run counts offline unless asked
  const calib = OPENAI ? await measureOpenAI(rows, readj(path.join(OUT, 'batches.json'), {})) : (await measure(rows), null);
  const parts = []; let cur = [], curUsd = 0;
  for (const q of rows) { const u = reserveFor(q); if (cur.length && (curUsd + u > WAVE_CAP_USD * 0.9 || cur.length >= 9000)) { parts.push(cur); cur = []; curUsd = 0; } cur.push(q); curUsd += u; }
  if (cur.length) parts.push(cur);
  const jf = path.join(OUT, 'batches.json'), journal0 = readj(jf, {});
  const spent = Object.entries(journal0).filter(([w]) => Number(w.split('.')[0]) !== k).reduce((n, [, e]) => n + (e.actualUsd ?? e.reserveUsd), 0);
  const reserveUsd = rows.reduce((n, q) => n + reserveFor(q), 0), inputTokens = rows.reduce((n, q) => n + q.inputTokens, 0), longBand = rows.filter((q) => q.inputTokens * 1.1 > (priceFor(cfg.model).longOver)).length;
  console.log(JSON.stringify({ wave: k, requests: rows.length, parts: parts.length, reserveUsd: +reserveUsd.toFixed(4), inputTokens, longBand, counted: process.env.RC_COUNT_STUB === 'YES' ? 'stub' : 'api', spentUsd: +spent.toFixed(4), byArm: Object.fromEntries(cfg.arms.concat('start').map((a) => [a, rows.filter((q) => q.arm === a).length])), ...(OPENAI ? { provider: cfg.provider, calibration: +calib.toFixed(4), counted: process.env.RC_COUNT_STUB === 'YES' || process.env.RC_OPENAI_FAKE ? 'bytes/3' : 'gateway+bytes/3' } : {}) }));
  if (dry) return false;
  // the study's transport comes from its plan (written by sweep.mjs after the pilot, before wave 0) and never changes
  let transport = null;
  if (OPENAI) { try { transport = P.transportFor({ cfg, out: OUT, k }); } catch (e) { console.error(`${cfg.out}: ${e.message}`); transportFailed = { wave: k, error: e.message, code: e.code }; atomic(path.join(OUT, 'transport-failure.json'), { wave: k, at: new Date().toISOString(), refusals: null, transportFailed }); return false; } }
  const fresh = parts.some((_, i) => !journal0[`${k}.${i}`]);
  /* LI27/LI28 lesson: reserves run about 6 times above spend, so the cap is checked on expected spend: the reserve times
     this run's own spend-to-reserve ratio so far, with a 1.5 margin (the full reserve until a wave has been reconciled) */
  const done = Object.values(journal0).filter((e) => e.status === 'complete' && e.reserveUsd), ratio = done.length ? Math.min(1, 1.5 * done.reduce((n, e) => n + (e.actualUsd || 0), 0) / done.reduce((n, e) => n + e.reserveUsd, 0)) : 1;
  const expectedUsd = reserveUsd * ratio;
  if (fresh && cfg.studyCapUsd && spent + expectedUsd > cfg.studyCapUsd) { console.log(JSON.stringify({ wave: k, stop: 'study cap', spent, reserveUsd, expectedUsd, cap: cfg.studyCapUsd })); capStopped = true; return false; }
  const api = OPENAI ? null : await import('../../../library/cards/batch-api.mjs');
  let lock = Promise.resolve(); const serial = (f) => (lock = lock.then(f, f)); // journal and ledger writes one at a time
  const remainders = {};
  const runPartOpenAI = async (part, i) => {
    const manifest = part.map((q) => P.batchLine(q.custom_id, q.body)), mh = sha({ configHash, k, i, manifest });
    const journal = { get: (key) => serial(async () => readj(jf, {})[key]), set: (key, patch) => serial(async () => { const j = readj(jf, {}); j[key] = { ...(j[key] || {}), ...patch }; atomic(jf, j); return j[key]; }) };
    const ledger = { reserveWaves: (x) => serial(() => reserveWaves(x)), attachActualManifest: (x) => serial(() => attachActualManifest(x)), markSubmitted: (x) => serial(() => markSubmitted(x)), reconcileWave: (x) => serial(() => reconcileWave(x)), releaseUnsubmitted: (x) => serial(() => releaseUnsubmitted(x)) };
    // a part discarded by an amendment (journal entry marked discarded, moved off its key) keeps its ledger entry; the redo
    // reserves under the next free name (<name>-r2, -r3 ...), so the discarded cost stays recorded and counted
    const base = `${cfg.out}-wave-${k}-p${i}`, discardedNames = new Set(Object.values(readj(jf, {})).filter((x) => x?.discarded).map((x) => x.ledgerName));
    let name = base; for (let n = 2; discardedNames.has(name); n++) name = `${base}-r${n}`;
    const r = await P.runPart({ k, i, part, out: OUT, api: await oaApi(), ledger, journal, configHash, mh, name, transport, usageCost, pricedAs: cfg.model,
      flex: { concurrency: cfg.flexConcurrency || 16, retries: 8, backoffMs: process.env.RC_OPENAI_FAKE ? 1 : 5000 }, pollMs: process.env.RC_OPENAI_FAKE ? 5 : 20000, log: (o) => console.log(JSON.stringify(o)) });
    if (r.refusals.length) refused = [...(refused || []), ...r.refusals.map((x) => ({ wave: k, part: i, ...x }))];
    if (r.flexRemainder) remainders[`${k}.${i}`] = r.flexRemainder; // a cancelled or expired batch: which requests went on flex, and why
    return r.raw;
  };
  const runPart = OPENAI ? async (part, i) => { try { return await runPartOpenAI(part, i); } catch (e) { if (e.code !== 'TRANSPORT') throw e; transportFailed = { wave: k, part: i, error: e.message, ...(e.leader ? { leader: true, batchId: e.batchId ?? null, batchStatus: e.batchStatus ?? null } : {}) }; return []; } } : async (part, i) => {
    const key = `${k}.${i}`, manifest = part.map(({ custom_id, params }) => ({ custom_id, params })), mh = sha({ configHash, k, i, manifest }), pres = part.reduce((n, q) => n + reserveFor(q), 0), ptok = part.reduce((n, q) => n + q.inputTokens, 0), name = `${cfg.out}-wave-${k}-p${i}`;
    let e = await serial(async () => { const j = readj(jf, {}); const x = j[key]; if (x && x.manifestHash !== mh) throw new Error(`part ${key} manifest differs from journal`); return x; });
    if (!e) {
      fs.writeFileSync(path.join(OUT, `wave-${k}-p${i}.requests.jsonl`), manifest.map((x) => JSON.stringify(x)).join('\n') + '\n');
      await serial(async () => { await reserveWaves({ studyHash: configHash, waves: [{ name, manifestHash: mh, requestCount: part.length, reserveUsd: pres }] }); const j = readj(jf, {}); j[key] = { manifestHash: mh, requestCount: part.length, reserveUsd: pres, measuredInputTokens: ptok, batchId: null, status: 'intent' }; atomic(jf, j); await attachActualManifest({ name, actualManifestHash: mh, requestCount: part.length }); });
      const created = await api.createBatch(manifest);
      e = await serial(async () => { const j = readj(jf, {}); Object.assign(j[key], { batchId: created.id, status: 'submitted', submittedAt: new Date().toISOString() }); atomic(jf, j); await markSubmitted({ name, batchId: created.id, actualManifestHash: mh }); return j[key]; });
    } else if (!e.batchId) throw new Error(`part ${key}: uncertain submission, not retried`);
    const resFile = path.join(OUT, `wave-${k}-p${i}.results.jsonl`); let raw;
    if (fs.existsSync(resFile)) raw = fs.readFileSync(resFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    else { const ended = await api.waitForBatch(e.batchId, { intervalMs: 20000, onPoll: (b) => atomic(path.join(OUT, `status-p${i}.json`), { wave: k, part: i, batchId: e.batchId, counts: b.request_counts, at: new Date().toISOString() }) }); raw = await api.fetchBatchResults(ended); fs.writeFileSync(resFile, raw.map((x) => JSON.stringify(x)).join('\n') + '\n'); }
    let usd = 0; for (const x of raw) { const m = x.result?.message; if (x.result?.type === 'succeeded' && m) usd += usageCost(m.usage); }
    await serial(async () => { const j = readj(jf, {}); if (j[key].status !== 'complete') { await reconcileWave({ name, batchId: j[key].batchId, resultCount: raw.length, actualUsd: usd, allPriced: true }); Object.assign(j[key], { status: 'complete', actualUsd: usd }); atomic(jf, j); } });
    return raw;
  };
  const raws = (await Promise.all(parts.map(runPart))).flat();
  if (OPENAI && (refused || transportFailed)) { // stop before applying: a refused parameter or a dead transport ends the run (no retry pays again)
    atomic(path.join(OUT, refused ? 'refusals.json' : 'transport-failure.json'), { wave: k, at: new Date().toISOString(), refusals: refused, transportFailed });
    console.error(`${cfg.out}: ${refused ? `the model refused a parameter at wave ${k}: ${refused.map((x) => `${x.param} (${x.status}): ${x.message}`).slice(0, 3).join(' | ')}` : `transport failed at wave ${k}: ${transportFailed.error}`}`);
    return false;
  }
  // LI42 Amendment 3 invariant (pilot and study): the wave is applied only if every request has a response the API
  // delivered; a delivered reply whose content fails parsing or checks is data and does not stop the run. Otherwise the run
  // stops hard (exit 6, transportFailed.leader: final for the sweep and the bench) with nothing applied.
  if (OPENAI && !state.applied?.includes(k)) {
    const undelivered = P.undeliveredOf(rows, raws);
    if (undelivered.length) {
      transportFailed = { wave: k, error: `${undelivered.length} of ${rows.length} requests of wave ${k} have no response delivered by the API (${undelivered.slice(0, 3).map((x) => `${x.custom_id}: ${x.type}${x.status ? ' ' + x.status : ''}`).join('; ')}); the wave is not applied and the run stops for the Research Leader`, leader: true, invariant: true, undelivered };
      atomic(path.join(OUT, 'transport-failure.json'), { wave: k, at: new Date().toISOString(), refusals: null, transportFailed });
      console.error(`${cfg.out}: ${transportFailed.error}`);
      return false;
    }
  }
  const outputs = new Map(); let usd = 0, failed = 0;
  for (const x of raws) { const m = x.result?.message; if (x.result?.type !== 'succeeded' || !m) { failed++; outputs.set(x.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'failed' }); continue; }
    const tx = m.content?.filter((z) => z.type === 'text').map((z) => z.text).join('') || ''; let json = null; try { json = JSON.parse(tx); } catch {}
    outputs.set(x.custom_id, { json, usage: m.usage, stop: m.stop_reason }); usd += usageCost(m.usage); }
  for (const q of rows) if (!outputs.has(q.custom_id)) { failed++; outputs.set(q.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'missing' }); }
  if (OPENAI && !state.applied?.includes(k)) { // every returned model string and the effort sent, per request (prereg: recorded in the export)
    for (const x of raws) { const m = x.result?.message, eff = m?.reasoning_effort ?? x.result?.reasoning_effort ?? 'none-sent'; if (m?.model) (state.models ||= {})[m.model] = (state.models[m.model] || 0) + 1; (state.efforts ||= {})[eff] = (state.efforts[eff] || 0) + 1; (state.transports ||= {})[x.transport] = (state.transports[x.transport] || 0) + 1; }
    if (Object.keys(remainders).length) Object.assign(state.flexRemainders ||= {}, remainders); }
  if (!state.applied?.includes(k)) { apply(k, rows, outputs); (state.applied ||= []).push(k); atomic(stateFile, state); }
  console.log(JSON.stringify({ wave: k, done: true, usd: +usd.toFixed(4), failed, solved: Object.fromEntries(cfg.arms.map((a) => [a, Object.values(state.arms[a] || {}).filter((s) => s.solved).length])), left: Object.fromEntries(cfg.arms.map((a) => [a, Object.values(state.arms[a] || {}).reduce((n, s) => n + (s.history.at(-1)?.counts.total || 0), 0)])) }));
  return true;
}

/* LI24 review: a re-planned (truncated) plan must not starve the manager of act rounds; with cfg.managerSlack the loop leaves room for a third of extra plan waves, and the manager still stops at cfg.rounds act rounds */
for (let k = 0; k <= cfg.rounds * (cfg.arms.includes('manager') && !cfg.waveBudget ? (cfg.managerSlack ? 3 : 2) : 1) + 1; k++) { if (state.applied?.includes(k) && !dry) continue; const more = await runWave(k); if (!more) break; }
/* LI21 review: a cap stop is an incomplete run (exit 3, no summary), so the sweep skips its verdicts and a resume continues it */
if (capStopped) process.exit(3);
if (refused) process.exit(5);
if (transportFailed) process.exit(6);
if (!dry) atomic(path.join(OUT, 'summary.json'), { configHash, finishedAt: new Date().toISOString(), arms: Object.fromEntries(cfg.arms.map((a) => [a, { solved: Object.values(state.arms[a] || {}).filter((s) => s.solved).length, of: instances.length }])),
  ...(OPENAI ? { provider: cfg.provider, model: cfg.model, effort: cfg.effort, models: state.models || {}, efforts: state.efforts || {}, transports: state.transports || {}, transport: readj(path.join(OUT, 'transport.json'), null) } : {}) });
