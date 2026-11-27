// LI7 runner (tasks/LI7-REAL-CODE-PREREG.md): members own modules of a small JS codebase; the field is the executed test
// suite (rc/code.mjs). Same lockstep and ledger discipline as ne/run-gen4.mjs: every arm of every case advances one round per
// wave, one Message Batch per wave, reserved in the shared ledger before its single POST, never retried when uncertain,
// reconciled from returned usage, resumable. New: a per-study cap (cfg.studyCapUsd) checked before each wave from the
// actual spend so far plus the wave's reserve (LI5 overran its registered cap because the runner had no such check).
// Usage: node observatory/batch2/rc/run-rc.mjs <config.json> [--dry]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as W from './code.mjs';
import { reserveWaves, attachActualManifest, markSubmitted, reconcileWave } from '../../lab007-instrument-audit/global-budget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const PRICE = { 'claude-haiku-5-5': { in: 0.05, out: 0.25 }, 'claude-sonnet-5-5': { in: 1, out: 5 } }; // batch US$/Mtok, as run2.mjs
const WAVE_CAP_USD = 5;
const cfgFile = process.argv[2], dry = process.argv.includes('--dry');
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const OUT = path.join(ROOT, 'results', cfg.out); fs.mkdirSync(OUT, { recursive: true });
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const atomic = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 2) + '\n'); fs.renameSync(t, f); };
const readj = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const price = PRICE[cfg.model]; if (!price) throw new Error('no price');
const reserveFor = (p) => ((Buffer.byteLength(JSON.stringify(p)) / 3 + 512) * price.in + p.max_tokens * price.out) / 1e6;
const usageCost = (u) => ((u.input_tokens || 0) * price.in + (u.output_tokens || 0) * price.out) / 1e6;
const configHash = sha({ cfg, sources: ['code.mjs', 'run-rc.mjs'].map((f) => sha(fs.readFileSync(path.join(HERE, f)))) });

const instances = Array.from({ length: cfg.cases }, (_, i) => ({ key: `k${cfg.k}s${cfg.seed0 + i}`, seed: cfg.seed0 + i }));
const built = new Map(instances.map((x) => [x.key, W.makeInstance(cfg.k, x.seed, cfg.shape)]));
const stateFile = path.join(OUT, 'state.json');
// state.arms[arm][inst] = { code: [...], solved, inbox, history: [{ wave, counts, failing, actors, acted, outMax, outSum, inSum, usd, trunc, sent }] }
const state = readj(stateFile, { configHash, arms: {} });
if (state.configHash !== configHash) throw new Error('Config or sources changed since this run started');
const swarmArms = cfg.arms.filter((a) => a !== 'solo');

function requestsFor(k) {
  const rows = [];
  if (k === 0) {
    for (const x of instances) { const inst = built.get(x.key), empty = new Array(inst.k).fill('');
      for (let m = 0; m < inst.k; m++) rows.push({ custom_id: `start-${x.key}-m${m}`, arm: 'start', inst: x.key, m, params: W.memberRequest(cfg.model, inst, m, empty, [], cfg.memberMax, { effort: cfg.effort }) });
      if (cfg.arms.includes('solo')) rows.push({ custom_id: `solo-${x.key}-w0`, arm: 'solo', inst: x.key, m: null, params: W.soloRequest(cfg.model, inst, null, [], cfg.soloMax, cfg.effort) }); }
    return rows;
  }
  if (cfg.stopAfter && k > cfg.stopAfter) return rows;
  for (const arm of cfg.arms) for (const x of instances) {
    const s = state.arms[arm]?.[x.key]; if (!s || s.solved) continue; const inst = built.get(x.key), vs = W.check(inst, s.code); if (!vs.length) continue;
    if (arm === 'solo') { rows.push({ custom_id: `solo-${x.key}-w${k}`, arm, inst: x.key, m: null, params: W.soloRequest(cfg.model, inst, s.code, vs, cfg.soloMax, cfg.effort) }); continue; }
    const chat = arm === 'chat' || arm === 'routed', p = W.plan(inst, vs, k, arm === 'inhibit' ? 'inhibit' : arm === 'routed' ? 'routed' : 'sync');
    for (const [m, assigned] of p) rows.push({ custom_id: `${arm}-${x.key}-w${k}-m${m}`, arm, inst: x.key, m, params: W.memberRequest(cfg.model, inst, m, s.code, assigned, cfg.memberMax, { effort: cfg.effort, chat, inbox: s.inbox?.[m] || [] }) });
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
      const acted = [];
      for (const [q, o] of a.rows) {
        if (q.m === null) { for (const md of o.json?.modules || []) { const m = Number(String(md.module).replace(/\D/g, '')) - 1; if (m >= 0 && m < inst.k && typeof md.code === 'string' && md.code.trim()) { if (md.code !== s.code[m]) acted.push(m); s.code[m] = md.code; } } continue; }
        const c = o.json?.code; if (typeof c === 'string' && c.trim()) { if (c !== s.code[q.m]) acted.push(q.m); s.code[q.m] = c; }
      }
      let sent = 0;
      if ((t === 'chat' || t === 'routed') && arm === t) { s.inbox = {}; for (const [q, o] of a.rows) for (const msg of (o.json?.messages || []).slice(0, 3)) { const to = Number(String(msg.to).replace(/\D/g, '')) - 1; if (to >= 0 && to < inst.k && to !== q.m) { (s.inbox[to] ||= []).push({ from: q.m, text: String(msg.text).slice(0, 300) }); sent++; } } }
      const vs = W.check(inst, s.code); s.solved = vs.length === 0;
      s.history.push({ wave: k, counts: W.counts(vs), failing: vs.map((v) => v.id), actors: a.rows.length, acted, outMax: a.outMax, outSum: a.outSum, inSum: a.inSum, usd: a.usd, trunc: a.trunc, sent, shared: arm === 'start', code: s.code.slice() });
    }
  }
  for (const arm of cfg.arms) for (const x of instances) { const s = state.arms[arm]?.[x.key]; if (s && s.history.at(-1)?.wave !== k) { const vs = W.check(built.get(x.key), s.code); s.history.push({ wave: k, counts: W.counts(vs), failing: vs.map((v) => v.id), actors: 0, acted: [], outMax: 0, outSum: 0, inSum: 0, usd: 0, trunc: 0, sent: 0 }); } }
}

async function runWave(k) {
  const rows = requestsFor(k); if (!rows.length) return false;
  const manifest = rows.map(({ custom_id, params }) => ({ custom_id, params })), mh = sha({ configHash, k, manifest });
  const reserveUsd = rows.reduce((n, q) => n + reserveFor(q.params), 0);
  const jf = path.join(OUT, 'batches.json'), journal = readj(jf, {}), spent = Object.entries(journal).filter(([w]) => Number(w) !== k).reduce((n, [, e]) => n + (e.actualUsd ?? e.reserveUsd), 0);
  console.log(JSON.stringify({ wave: k, requests: rows.length, reserveUsd: +reserveUsd.toFixed(4), spentUsd: +spent.toFixed(4), byArm: Object.fromEntries(cfg.arms.concat('start').map((a) => [a, rows.filter((q) => q.arm === a).length])) }));
  if (dry) return false;
  let e = journal[k];
  if (!e && reserveUsd > WAVE_CAP_USD) throw new Error(`wave reserve ${reserveUsd} > per-batch cap`);
  if (!e && cfg.studyCapUsd && spent + reserveUsd > cfg.studyCapUsd) { console.log(JSON.stringify({ wave: k, stop: 'study cap', spent, reserveUsd, cap: cfg.studyCapUsd })); return false; }
  const name = `${cfg.out}-wave-${k}`;
  if (e && e.manifestHash !== mh) throw new Error(`wave ${k} manifest differs from journal`);
  const api = await import('../../../library/cards/batch-api.mjs');
  if (!e) {
    fs.writeFileSync(path.join(OUT, `wave-${k}.requests.jsonl`), manifest.map((x) => JSON.stringify(x)).join('\n') + '\n');
    await reserveWaves({ studyHash: configHash, waves: [{ name, manifestHash: mh, requestCount: rows.length, reserveUsd }] });
    e = journal[k] = { manifestHash: mh, requestCount: rows.length, reserveUsd, batchId: null, status: 'intent' }; atomic(jf, journal);
    await attachActualManifest({ name, actualManifestHash: mh, requestCount: rows.length });
    const created = await api.createBatch(manifest);
    e.batchId = created.id; e.status = 'submitted'; e.submittedAt = new Date().toISOString(); atomic(jf, journal);
    await markSubmitted({ name, batchId: created.id, actualManifestHash: mh });
  } else if (!e.batchId) throw new Error(`wave ${k}: uncertain submission, not retried`);
  const resFile = path.join(OUT, `wave-${k}.results.jsonl`); let raw;
  if (fs.existsSync(resFile)) raw = fs.readFileSync(resFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  else { const ended = await api.waitForBatch(e.batchId, { intervalMs: 20000, onPoll: (b) => atomic(path.join(OUT, 'status.json'), { wave: k, batchId: e.batchId, counts: b.request_counts, at: new Date().toISOString() }) }); raw = await api.fetchBatchResults(ended); fs.writeFileSync(resFile, raw.map((x) => JSON.stringify(x)).join('\n') + '\n'); }
  const outputs = new Map(); let usd = 0, failed = 0;
  for (const x of raw) { const m = x.result?.message; if (x.result?.type !== 'succeeded' || !m) { failed++; outputs.set(x.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'failed' }); continue; }
    const tx = m.content?.filter((z) => z.type === 'text').map((z) => z.text).join('') || ''; let json = null; try { json = JSON.parse(tx); } catch {}
    outputs.set(x.custom_id, { json, usage: m.usage, stop: m.stop_reason }); usd += usageCost(m.usage); }
  for (const q of rows) if (!outputs.has(q.custom_id)) { failed++; outputs.set(q.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'missing' }); }
  if (e.status !== 'complete') { await reconcileWave({ name, batchId: e.batchId, resultCount: raw.length, actualUsd: usd, allPriced: true }); e.status = 'complete'; e.actualUsd = usd; e.failed = failed; atomic(jf, journal); }
  if (!state.applied?.includes(k)) { apply(k, rows, outputs); (state.applied ||= []).push(k); atomic(stateFile, state); }
  console.log(JSON.stringify({ wave: k, done: true, usd: +usd.toFixed(4), failed, solved: Object.fromEntries(cfg.arms.map((a) => [a, Object.values(state.arms[a] || {}).filter((s) => s.solved).length])), left: Object.fromEntries(cfg.arms.map((a) => [a, Object.values(state.arms[a] || {}).reduce((n, s) => n + (s.history.at(-1)?.counts.total || 0), 0)])) }));
  return true;
}

for (let k = 0; k <= cfg.rounds; k++) { if (state.applied?.includes(k) && !dry) continue; const more = await runWave(k); if (!more) break; }
if (!dry) atomic(path.join(OUT, 'summary.json'), { configHash, finishedAt: new Date().toISOString(), arms: Object.fromEntries(cfg.arms.map((a) => [a, { solved: Object.values(state.arms[a] || {}).filter((s) => s.solved).length, of: instances.length }])) });
