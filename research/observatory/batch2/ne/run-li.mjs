// LI lockstep runner (tasks/LI1-LATERAL-INHIBITION-PREREG.md). Every arm of every instance advances one round per wave;
// one Message Batch per wave carries all arms. Each wave is reserved in the shared ledger before its single POST, never
// retried when uncertain, and reconciled from returned usage. Resumable: a wave with a batch id is awaited, not resent.
// Usage: node observatory/batch2/ne/run-li.mjs <config.json> [--dry]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as W from './swarm.mjs';
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
const configHash = sha({ cfg, sources: ['swarm.mjs', 'tasks.mjs', 'run-li.mjs'].map((f) => sha(fs.readFileSync(path.join(HERE, f)))) });

const instances = cfg.sizes.flatMap((n) => Array.from({ length: cfg.perSize }, (_, i) => ({ key: `n${n}s${cfg.seed0 + i}`, n, seed: cfg.seed0 + i })));
const built = new Map(instances.map((x) => [x.key, W.makeInstance(x.n, x.seed, cfg.deg, cfg.regionSize)]));
const stateFile = path.join(OUT, 'state.json');
// state[arm][inst] = { col: [...], solved, history: [{ wave, conflicts, actors, outMax, outSum, inSum, usd }] }
const state = readj(stateFile, { configHash, arms: {} });
if (state.configHash !== configHash) throw new Error('Config or sources changed since this run started');
const rnd = (x) => crypto.createHash('sha256').update(x).digest().readUInt32LE(0) / 4294967296;

// Build the requests of wave k from the state. Wave 0: shared territorial start (arm "start") and the central solo start.
function requestsFor(k) {
  const rows = [];
  if (k === 0) {
    for (const x of instances) { const inst = built.get(x.key), empty = new Array(inst.n).fill(null);
      inst.regions.forEach((_, r) => rows.push({ custom_id: `start-${x.key}-r${r}`, arm: 'start', inst: x.key, nodes: inst.regions[r], params: W.memberRequest(cfg.model, inst, r, empty, [], cfg.memberMax, { showMarks: false, effort: cfg.effort }) }));
      if (cfg.arms.includes('solo')) rows.push({ custom_id: `solo-${x.key}-w0`, arm: 'solo', inst: x.key, nodes: null, params: W.soloRequest(cfg.model, inst, cfg.centralMax) }); }
    return rows;
  }
  for (const arm of cfg.arms) for (const x of instances) {
    const s = state.arms[arm]?.[x.key]; if (!s || s.solved) continue; const inst = built.get(x.key), col = s.col;
    if (W.conflicts(inst, col).length === 0) continue;
    if (arm === 'central' || arm === 'solo') { rows.push({ custom_id: `${arm}-${x.key}-w${k}`, arm, inst: x.key, nodes: null, params: W.repairRequest(cfg.model, inst, col, W.conflicts(inst, col), cfg.centralMax) }); continue; }
    let groups;
    if (arm === 'patch') groups = W.patches(inst, col, 1, cfg.patchCap).map((g) => ({ nodes: g.nodes, marks: g.marks }));
    else { const mode = arm === 'inhibit' ? 'inhibit' : 'sync'; const p = W.plan(inst, col, k, mode);
      groups = [...p.entries()].filter(([, ms]) => ms.length).map(([r, ms]) => ({ nodes: inst.regions[r], marks: ms, r }));
      if (arm === 'random') groups = groups.filter((g) => rnd(`${x.key}:${k}:${g.r}`) < 0.5); }
    groups.forEach((g, j) => rows.push({ custom_id: `${arm}-${x.key}-w${k}-g${j}`, arm, inst: x.key, nodes: g.nodes, params: W.memberRequest(cfg.model, inst, g.nodes, col, g.marks, cfg.memberMax, { showMarks: true, effort: cfg.effort }) }));
  }
  return rows;
}

function apply(k, rows, outputs) {
  const agg = new Map();
  for (const q of rows) { const o = outputs.get(q.custom_id); const key = `${q.arm}|${q.inst}`; if (!agg.has(key)) agg.set(key, { rows: [], outMax: 0, outSum: 0, inSum: 0, usd: 0, trunc: 0 }); const a = agg.get(key); a.rows.push([q, o]); a.outMax = Math.max(a.outMax, o.usage.output_tokens); a.outSum += o.usage.output_tokens; a.inSum += o.usage.input_tokens; a.usd += usageCost(o.usage); if (o.stop === 'max_tokens') a.trunc++; }
  for (const [key, a] of agg) {
    const [arm, ik] = key.split('|'), inst = built.get(ik);
    const targets = arm === 'start' ? cfg.arms.filter((x) => x !== 'solo') : [arm];
    for (const t of targets) {
      state.arms[t] ||= {}; const s = state.arms[t][ik] ||= { col: new Array(inst.n).fill(null), solved: false, history: [] };
      if (arm === 'start' || t === arm) for (const [q, o] of a.rows) { const m = W.parseColors(o.answer, q.nodes ? new Set(q.nodes) : null); for (const [u, c] of m) s.col[u] = c; }
      const c = W.conflicts(inst, s.col).length; s.solved = c === 0;
      s.history.push({ wave: k, conflicts: c, actors: a.rows.length, outMax: a.outMax, outSum: a.outSum, inSum: a.inSum, usd: a.usd, trunc: a.trunc, shared: arm === 'start' });
    }
  }
  // arms with no actors this wave keep their state; record a no-op so every arm has one entry per wave once started
  for (const arm of cfg.arms) for (const x of instances) { const s = state.arms[arm]?.[x.key]; if (s && s.history.at(-1)?.wave !== k) s.history.push({ wave: k, conflicts: W.conflicts(built.get(x.key), s.col).length, actors: 0, outMax: 0, outSum: 0, inSum: 0, usd: 0, trunc: 0 }); }
}

async function runWave(k) {
  const rows = requestsFor(k); if (!rows.length) return false;
  const manifest = rows.map(({ custom_id, params }) => ({ custom_id, params })), mh = sha({ configHash, k, manifest });
  const reserveUsd = rows.reduce((n, q) => n + reserveFor(q.params), 0);
  console.log(JSON.stringify({ wave: k, requests: rows.length, reserveUsd: +reserveUsd.toFixed(4), byArm: Object.fromEntries(cfg.arms.concat('start').map((a) => [a, rows.filter((q) => q.arm === a).length])) }));
  if (dry) return false;
  if (reserveUsd > WAVE_CAP_USD) throw new Error(`wave reserve ${reserveUsd} > per-batch cap`);
  const jf = path.join(OUT, 'batches.json'), journal = readj(jf, {}), name = `${cfg.out}-wave-${k}`;
  let e = journal[k];
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
  for (const x of raw) { const m = x.result?.message; if (x.result?.type !== 'succeeded' || !m) { failed++; outputs.set(x.custom_id, { answer: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'failed' }); continue; }
    const tx = m.content?.filter((z) => z.type === 'text').map((z) => z.text).join('') || ''; let answer = null; try { answer = JSON.parse(tx).answer; } catch {}
    outputs.set(x.custom_id, { answer, usage: m.usage, stop: m.stop_reason }); usd += usageCost(m.usage); }
  for (const q of rows) if (!outputs.has(q.custom_id)) { failed++; outputs.set(q.custom_id, { answer: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'missing' }); }
  if (e.status !== 'complete') { await reconcileWave({ name, batchId: e.batchId, resultCount: raw.length, actualUsd: usd, allPriced: true }); e.status = 'complete'; e.actualUsd = usd; e.failed = failed; atomic(jf, journal); }
  if (!state.applied?.includes(k)) { apply(k, rows, outputs); (state.applied ||= []).push(k); atomic(stateFile, state); }
  console.log(JSON.stringify({ wave: k, done: true, usd: +usd.toFixed(4), failed, solved: Object.fromEntries(cfg.arms.map((a) => [a, Object.values(state.arms[a] || {}).filter((s) => s.solved).length])) }));
  return true;
}

for (let k = 0; k <= cfg.rounds; k++) { const more = await runWave(k); if (!more && !dry) break; if (dry && k === 0) { state.arms = {}; } if (dry) break; }
if (!dry) atomic(path.join(OUT, 'summary.json'), { configHash, finishedAt: new Date().toISOString(), arms: Object.fromEntries(cfg.arms.map((a) => [a, { solved: Object.values(state.arms[a] || {}).filter((s) => s.solved).length, of: instances.length }])) });
