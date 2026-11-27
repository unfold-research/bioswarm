// run-gen4-stop: run-gen4 with an explicit last wave (env STOP_AFTER) so a study stops at its registered cost cap.
// Its config hash is computed from run-gen4.mjs (the source list is unchanged), so it resumes run-gen4's journal
// exactly: a wave with a batch id is awaited, never resent. Used for LI6 on 2026-11-17 (cap US$ 13).
// run-gen4 (LI6): domain 'sched2' (shared machines) and arms 'routed' (a symmetric conflict goes to one side, a directed
// one to both, members may message) and 'routedsilent' (same routing, no messages).
// run-gen3: adds 'chatinhibit' (inhibition decides who acts; every member touched by a violation may still message) and
// 'ask' (inhibition plus typed requests left on the field: a member may attach to a foreign item it depends on a short
// request, shown next round to that item's owner beside its violations; no free-text conversation). LI5.
// run-gen2: run-gen plus arm 'patch2' (stimulus-centred recruitment with radius 2). LI4 and later.
// Generic lockstep runner (LI2 and later; LI1 used run-li.mjs, kept unchanged). Domain plug-in: cfg.domain is 'colour'
// (swarm.mjs) or 'sched' (sched.mjs). Adds the 'chat' arm: every territory with a conflict acts (as sync) and may send short
// messages to the owners of neighbouring items, read by them next round.
// Original header:
// LI lockstep runner (tasks/LI1-LATERAL-INHIBITION-PREREG.md). Every arm of every instance advances one round per wave;
// one Message Batch per wave carries all arms. Each wave is reserved in the shared ledger before its single POST, never
// retried when uncertain, and reconciled from returned usage. Resumable: a wave with a batch id is awaited, not resent.
// Usage: node observatory/batch2/ne/run-li.mjs <config.json> [--dry]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as C from './swarm.mjs';
import * as S from './sched.mjs';
import * as S2 from './sched2.mjs';
import { reserveWaves, attachActualManifest, markSubmitted, reconcileWave } from '../../lab007-instrument-audit/global-budget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const PRICE = { 'claude-haiku-5-5': { in: 0.05, out: 0.25 }, 'claude-sonnet-5-5': { in: 1, out: 5 } }; // batch US$/Mtok, as run2.mjs
const WAVE_CAP_USD = 5;
const cfgFile = process.argv[2], dry = process.argv.includes('--dry');
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const W = cfg.domain === 'sched2' ? { ...S2, parseColors: S2.parse } : cfg.domain === 'sched' ? { ...S, parseColors: S.parse } : C;
const nodeName = (u) => (cfg.domain.startsWith('sched') ? `W${u}` : String(u));
const ASK_SCHEMA = { type: 'object', properties: { answer: { type: 'string' }, asks: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, want: { type: 'string' } }, required: ['item', 'want'], additionalProperties: false } } }, required: ['answer', 'asks'], additionalProperties: false };
const CHAT_SCHEMA = { type: 'object', properties: { answer: { type: 'string' }, messages: { type: 'array', items: { type: 'object', properties: { to: { type: 'string' }, text: { type: 'string' } }, required: ['to', 'text'], additionalProperties: false } } }, required: ['answer', 'messages'], additionalProperties: false };
const OUT = path.join(ROOT, 'results', cfg.out); fs.mkdirSync(OUT, { recursive: true });
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const atomic = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 2) + '\n'); fs.renameSync(t, f); };
const readj = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const price = PRICE[cfg.model]; if (!price) throw new Error('no price');
const reserveFor = (p) => ((Buffer.byteLength(JSON.stringify(p)) / 3 + 512) * price.in + p.max_tokens * price.out) / 1e6;
const usageCost = (u) => ((u.input_tokens || 0) * price.in + (u.output_tokens || 0) * price.out) / 1e6;
const configHash = sha({ cfg, sources: ['swarm.mjs', 'sched.mjs', 'tasks.mjs', 'sched2.mjs', 'run-gen4.mjs'].map((f) => sha(fs.readFileSync(path.join(HERE, f)))) });

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
    if (arm === 'ask') { const p = W.plan(inst, col, k, 'inhibit');
      for (const [r, ms] of p.entries()) { if (!ms.length) continue; const nodes = inst.regions[r], mine = new Set(nodes); const params = W.memberRequest(cfg.model, inst, r, col, ms, cfg.memberMax, { showMarks: true, effort: cfg.effort });
        const reqs = (s.asks || []).filter((a) => mine.has(a.item)).map((a) => `${nodeName(a.item)}: ${a.want}`).join('; ');
        params.messages[0].content += `\nRequests other planners left on your items last round: ${reqs || '(none)'}.\nYou may leave short requests (at most 12 words each, at most 3) on items owned by others that constrain yours, saying what you need, e.g. item "W12", want "end by week 17"; their owner sees them next round. Put your colours or weeks in "answer" as before.`;
        params.output_config.format.schema = ASK_SCHEMA; rows.push({ custom_id: `ask-${x.key}-w${k}-r${r}`, arm, inst: x.key, nodes, region: r, params }); }
      continue; }
    if (arm === 'chat' || arm === 'chatinhibit' || arm === 'routed') { const p = W.plan(inst, col, k, arm === 'routed' ? 'routed' : 'sync'), act = arm === 'chatinhibit' ? W.plan(inst, col, k, 'inhibit') : p;
      for (const [r, msAll] of p.entries()) { const ms = act.get(r) || []; if (!msAll.length) continue; const holds = arm === 'chatinhibit' && !ms.length; const nodes = inst.regions[r], mine = new Set(nodes); const params = W.memberRequest(cfg.model, inst, r, col, holds ? msAll : ms, cfg.memberMax, { showMarks: true, effort: cfg.effort });
        if (holds) params.messages[0].content += `\nThis round another planner has the turn on these violations: you must keep your current values (return them unchanged) and may only send messages.`;
        const owners = [...new Set(inst.edges.flatMap(([a, b]) => (mine.has(a) && !mine.has(b) ? [b] : mine.has(b) && !mine.has(a) ? [a] : [])))].map((u) => `${nodeName(u)}→P${inst.owner[u] + 1}`).join(', ');
        const inbox = (s.inbox?.[r] || []).map((m) => `from P${m.from + 1}: ${m.text}`).join('\n');
        params.messages[0].content = `You are planner P${r + 1}.\n` + params.messages[0].content + `\nOwners of the neighbouring items: ${owners || 'none'}.\nMessages to you from other planners last round:\n${inbox || '(none)'}\nBesides your answer you may send short messages (at most 40 words each, at most 3) to other planners by id (e.g. "P4"), for example to ask one of them to move an item or to say what you will move; they read them next round. Put your colours or weeks in "answer" as before.`;
        params.output_config.format.schema = CHAT_SCHEMA; rows.push({ custom_id: `${arm}-${x.key}-w${k}-r${r}`, arm, inst: x.key, nodes: holds ? [] : nodes, region: r, params }); }
      continue; }
    if (arm === 'patch' || arm === 'patch2') groups = W.patches(inst, col, arm === 'patch2' ? 2 : 1, cfg.patchCap).map((g) => ({ nodes: g.nodes, marks: g.marks }));
    else { const mode = arm === 'inhibit' ? 'inhibit' : arm === 'routedsilent' ? 'routed' : 'sync'; const p = W.plan(inst, col, k, mode);
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
      if (t === 'ask' && arm === 'ask') { s.asks = []; for (const [q, o] of a.rows) for (const r of (o.asks || []).slice(0, 3)) { const u = Number(String(r.item).replace(/\D/g, '')); if (Number.isInteger(u) && u >= 0 && u < inst.n && inst.owner[u] !== q.region) s.asks.push({ item: u, want: String(r.want).slice(0, 120), from: q.region }); } s.sent = (s.sent || 0) + s.asks.length; }
      if ((t === 'chat' || t === 'chatinhibit' || t === 'routed') && arm === t) { s.inbox = {}; let sent = 0; for (const [q, o] of a.rows) for (const msg of (o.messages || []).slice(0, 3)) { const to = Number(String(msg.to).replace(/\D/g, '')) - 1; if (to >= 0 && to < inst.k && to !== q.region) { (s.inbox[to] ||= []).push({ from: q.region, text: String(msg.text).slice(0, 300) }); sent++; } } s.sent = (s.sent || 0) + sent; }
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
    const tx = m.content?.filter((z) => z.type === 'text').map((z) => z.text).join('') || ''; let answer = null, messages = [], asks = []; try { const j = JSON.parse(tx); answer = j.answer; messages = Array.isArray(j.messages) ? j.messages : []; asks = Array.isArray(j.asks) ? j.asks : []; } catch {}
    outputs.set(x.custom_id, { answer, messages, asks, usage: m.usage, stop: m.stop_reason }); usd += usageCost(m.usage); }
  for (const q of rows) if (!outputs.has(q.custom_id)) { failed++; outputs.set(q.custom_id, { answer: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'missing' }); }
  if (e.status !== 'complete') { await reconcileWave({ name, batchId: e.batchId, resultCount: raw.length, actualUsd: usd, allPriced: true }); e.status = 'complete'; e.actualUsd = usd; e.failed = failed; atomic(jf, journal); }
  if (!state.applied?.includes(k)) { apply(k, rows, outputs); (state.applied ||= []).push(k); atomic(stateFile, state); }
  console.log(JSON.stringify({ wave: k, done: true, usd: +usd.toFixed(4), failed, solved: Object.fromEntries(cfg.arms.map((a) => [a, Object.values(state.arms[a] || {}).filter((s) => s.solved).length])) }));
  return true;
}

for (let k = 0; k <= cfg.rounds; k++) { if (state.applied?.includes(k)) continue; if (process.env.STOP_AFTER && k > Number(process.env.STOP_AFTER)) { console.log(JSON.stringify({ stopped: 'study cost cap', lastWave: Number(process.env.STOP_AFTER) })); break; } const more = await runWave(k); if (!more && !dry) break; if (dry && k === 0) { state.arms = {}; } if (dry) break; }
if (!dry) atomic(path.join(OUT, 'summary.json'), { configHash, finishedAt: new Date().toISOString(), arms: Object.fromEntries(cfg.arms.map((a) => [a, { solved: Object.values(state.arms[a] || {}).filter((s) => s.solved).length, of: instances.length }])) });
