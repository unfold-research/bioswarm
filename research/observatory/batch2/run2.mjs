// Second generic preregistered batch runner (2026-11-11). Same rules as run.mjs, with three differences: a study may be
// frozen while other studies hold open reservations (the shared ledger already serialises reservations under a lock),
// the study cap is US$ 5 (the per-batch limit the owner set on 2026-11-09), and pricing covers Haiku 5.5 and Sonnet 5.5.
// run.mjs is left untouched because studies frozen with it are still in flight.
// Usage: node observatory/batch2/run2.mjs <study> --freeze | --live
// A study module exports: ID, TITLE, PREREG (repo-relative path), WAVES, wave(k, outputsById), ceiling(k), score(k, rows,
// outputsById), gate(k, scored), summarize(scoredByWave).
// Rules kept from LAB-007: frozen config hash, reserve before submit in the shared cumulative ledger, one POST per wave and
// never a retry of an uncertain POST, integrity check of provider ids, reconciliation by returned tokens.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEFAULT_FILE, CAP_USD, reserveWaves, attachActualManifest, markSubmitted, reconcileWave } from '../lab007-instrument-audit/global-budget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const STUDY_CAP_USD = 5;
// Batch list prices in US$ per million tokens (50% of standard). Estimates from returned tokens, not an invoice.
const PRICE = { 'claude-haiku-5-5': { in: 0.05, out: 0.25 }, 'claude-sonnet-5-5': { in: 1, out: 5 } };
const priceOf = (model) => { const p = PRICE[model]; if (!p) throw new Error(`No price for model ${model}`); return p; };
// A study may raise the 20,000-byte request ceiling by exporting MAX_REQUEST_BYTES (hard limit 400,000); the export is part
// of its frozen protocol hash. Added for T2 on 2026-11-12, when no study was frozen or in flight.
// Pessimistic reservation: one input token per 3 bytes of request plus a 4,096-token envelope, and the full max_tokens as output.
const reserveFor = (params) => { if (params.tools || params.messages.some((m) => typeof m.content !== 'string')) throw new Error('Unapproved request shape'); const bytes = Buffer.byteLength(JSON.stringify(params)); if (bytes > Math.min(study.MAX_REQUEST_BYTES ?? 20000, 400000)) throw new Error('Prompt byte ceiling'); if (bytes > 220000) throw new Error('Request may exceed 100,000 input tokens, where the price table here is wrong (t2-gate was under-priced that way)'); const p = priceOf(params.model); return { usd: ((bytes / 3 + 4096) * p.in + params.max_tokens * p.out) / 1e6 }; };
const usageCost = (u, model) => { const p = priceOf(model); return ((u.input_tokens || 0) * p.in + (u.cache_read_input_tokens || 0) * p.in * 0.1 + (u.cache_creation_input_tokens || 0) * p.in * 1.25 + (u.output_tokens || 0) * p.out) / 1e6; };
const [name, mode] = process.argv.slice(2);
if (!name || !['--freeze', '--live'].includes(mode)) throw new Error('Usage: run.mjs <study> --freeze | --live');
const study = await import(`./${name}/protocol.mjs`);
const OUT = path.join(ROOT, 'results', `batch2-${study.ID}`);
fs.mkdirSync(OUT, { recursive: true });

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex'), hash = (x) => sha(JSON.stringify(x));
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const readl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const atomic = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 2) + '\n'); fs.renameSync(t, f); };
const writel = (f, rows) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, rows.map((x) => JSON.stringify(x)).join('\n') + '\n'); fs.renameSync(t, f); };
const manifest = (rows) => rows.map(({ custom_id, params }) => ({ custom_id, params }));
const reserve = (rows) => rows.reduce((n, r) => n + reserveFor(r.params).usd, 0);

const sources = [['protocol', path.join(HERE, name, 'protocol.mjs')], ['tests', path.join(HERE, name, 'protocol.test.mjs')], ['runner', path.join(HERE, 'run2.mjs')],
  ['budget', path.resolve(HERE, '../lab007-instrument-audit/global-budget.mjs')], ['budget-lock', path.resolve(HERE, '../lab007-economy-explore/budget.mjs')],
  ['batch-api', path.join(ROOT, 'library/cards/batch-api.mjs')],
  ['model', path.resolve(HERE, '../lab007-economy/model.mjs')], ['prereg', path.join(ROOT, study.PREREG)]];
const sourceHashes = Object.fromEntries(sources.map(([n, f]) => [n, sha(fs.readFileSync(f))]));
const wave0 = study.wave(0), wave0Hash = hash(manifest(wave0));
const configHash = hash({ id: study.ID, waves: study.WAVES, wave0Hash, sourceHashes, studyCapUsd: STUDY_CAP_USD });
const waveName = (k) => `${study.ID}-wave-${k}`;
const manifestHash = (k, rows) => hash({ configHash, wave: k, manifest: manifest(rows) });

function offlineTests() {
  const t = spawnSync(process.execPath, ['--test', path.join(HERE, name, 'protocol.test.mjs')], { encoding: 'utf8', timeout: 120000 });
  fs.writeFileSync(path.join(OUT, 'offline-tests.tap'), t.stdout + t.stderr);
  if (t.status !== 0 || !`${t.stdout}`.includes('# fail 0')) throw new Error('Offline protocol tests failed');
}
function globalBudget() {
  const s = read(DEFAULT_FILE), c = Object.values(s.commitments || {});
  return { capUsd: s.capUsd, committedUsd: c.reduce((n, x) => n + Number(x.committedUsd || 0), 0), open: c.filter((x) => !['complete', 'terminal-reconciled', 'released'].includes(x.status)).map((x) => x.id) };
}
function parseText(text) { try { return JSON.parse(text); } catch { return null; } }

async function runWave(k, rows) {
  const journalFile = path.join(OUT, 'batches.json'); let journal = fs.existsSync(journalFile) ? read(journalFile) : {};
  const mh = manifestHash(k, rows), reqFile = path.join(OUT, `wave-${k}.requests.jsonl`), resFile = path.join(OUT, `wave-${k}.results.jsonl`);
  let entry = journal[k];
  if (entry && entry.manifestHash !== mh) throw new Error(`wave ${k}: manifest differs from the journal`);
  if (!entry) {
    const reserveUsd = reserve(rows), studyCommitted = Object.values(journal).reduce((n, e) => n + (e.actualUsd ?? e.reserveUsd), 0);
    if (studyCommitted + reserveUsd > STUDY_CAP_USD) throw new Error(`Study cap stop: ${studyCommitted} + ${reserveUsd} > ${STUDY_CAP_USD}`);
    writel(reqFile, manifest(rows));
    await reserveWaves({ studyHash: configHash, waves: [{ name: waveName(k), manifestHash: mh, requestCount: rows.length, reserveUsd }] });
    entry = { manifestHash: mh, requestCount: rows.length, reserveUsd, status: 'intent', batchId: null }; journal[k] = entry; atomic(journalFile, journal);
    await attachActualManifest({ name: waveName(k), actualManifestHash: mh, requestCount: rows.length });
    const api = await import('../../library/cards/batch-api.mjs');
    const created = await api.createBatch(manifest(rows)); // single POST; an uncertain outcome is never retried
    entry.batchId = created.id; entry.status = 'submitted'; entry.submittedAt = new Date().toISOString(); atomic(journalFile, journal);
    await markSubmitted({ name: waveName(k), batchId: created.id, actualManifestHash: mh });
    console.log(JSON.stringify({ event: 'submitted', wave: k, batchId: created.id, requests: rows.length, reserveUsd }));
  } else if (!entry.batchId) throw new Error(`wave ${k}: submission outcome uncertain; reservation kept, no retry`);
  let raw;
  if (fs.existsSync(resFile)) raw = readl(resFile);
  else {
    const api = await import('../../library/cards/batch-api.mjs');
    const ended = await api.waitForBatch(entry.batchId, { intervalMs: 15000, onPoll: (b) => atomic(path.join(OUT, 'status.json'), { status: `waiting-wave-${k}`, batchId: entry.batchId, counts: b.request_counts, configHash, updated: new Date().toISOString() }) });
    raw = await api.fetchBatchResults(ended); writel(resFile, raw);
  }
  const want = new Set(rows.map((r) => r.custom_id)), got = raw.map((x) => x.custom_id);
  if (raw.length !== rows.length || new Set(got).size !== rows.length || got.some((x) => !want.has(x))) throw new Error(`wave ${k}: missing, duplicate or extraneous provider ids`);
  if (raw.some((x) => x.result?.type !== 'succeeded' || !Number.isFinite(x.result.message?.usage?.input_tokens))) throw new Error(`wave ${k}: failed or unpriced result; reservation kept, stop`);
  const outputs = new Map(); let usd = 0; const ledger = [];
  for (const x of raw) {
    const m = x.result.message, text = m.content?.filter((z) => z.type === 'text').map((z) => z.text).join('') || '', c = usageCost(m.usage, rows[0].params.model);
    usd += c; outputs.set(x.custom_id, { output: parseText(text), stopReason: m.stop_reason });
    ledger.push({ batchId: entry.batchId, customId: x.custom_id, model: m.model, usage: { input_tokens: m.usage.input_tokens, output_tokens: m.usage.output_tokens }, usageCostUsd: c });
  }
  if (entry.status !== 'complete') {
    fs.appendFileSync(path.join(OUT, 'ledger.jsonl'), ledger.map((x) => JSON.stringify(x)).join('\n') + '\n');
    await reconcileWave({ name: waveName(k), batchId: entry.batchId, resultCount: raw.length, actualUsd: usd, allPriced: true });
    journal = read(journalFile); journal[k] = { ...journal[k], status: 'complete', actualUsd: usd, completedAt: new Date().toISOString() }; atomic(journalFile, journal);
  }
  return { outputs, usd };
}

if (mode === '--freeze') {
  offlineTests();
  const b = globalBudget(); if (b.capUsd !== CAP_USD) throw new Error('Global cap mismatch');
  const ceilings = Array.from({ length: study.WAVES }, (_, k) => { const rows = k === 0 ? wave0 : study.ceiling(k); return { wave: k, requests: rows.length, reserveUsd: reserve(rows) }; });
  const total = ceilings.reduce((n, c) => n + c.reserveUsd, 0);
  if (total > STUDY_CAP_USD || b.committedUsd + total > CAP_USD) throw new Error('Expected reserve exceeds the study or cumulative cap');
  const plan = { study: study.ID, title: study.TITLE, configHash, wave0Hash, sourceHashes, waves: ceilings, expectedReserveUsd: total, studyCapUsd: STUDY_CAP_USD, globalBudgetBefore: b, frozenAt: new Date().toISOString() };
  writel(path.join(OUT, 'wave-0.manifest.jsonl'), manifest(wave0)); atomic(path.join(OUT, 'plan.json'), plan); atomic(path.join(OUT, 'frozen-lock.json'), { configHash, wave0Hash, sourceHashes, frozenAt: plan.frozenAt });
  console.log(JSON.stringify(plan, null, 2));
} else {
  const lock = read(path.join(OUT, 'frozen-lock.json')), approval = read(path.join(OUT, 'approval.json'));
  if (lock.configHash !== configHash) throw new Error('Frozen config or source changed since the freeze');
  if (process.env.BATCH2_PAID_APPROVED !== 'YES' || approval.approved !== true || approval.configHash !== configHash) throw new Error('Paid calls disabled: approval missing or for another config');
  offlineTests();
  const all = new Map(), scoredByWave = []; let usd = 0, stop = null;
  try {
    for (let k = 0; k < study.WAVES && !stop; k++) {
      const rows = k === 0 ? wave0 : study.wave(k, all);
      const r = await runWave(k, rows); usd += r.usd; for (const [id, v] of r.outputs) all.set(id, v);
      const scored = study.score(k, rows, all); scoredByWave.push(scored); atomic(path.join(OUT, `wave-${k}.scored.json`), scored);
      stop = study.gate(k, scored);
    }
    const summary = { study: study.ID, configHash, status: stop || 'complete', wavesRun: scoredByWave.length, usageUsdEstimate: usd, globalCommittedUsd: globalBudget().committedUsd, ...study.summarize(scoredByWave), finishedAt: new Date().toISOString() };
    atomic(path.join(OUT, 'summary.json'), summary); atomic(path.join(OUT, 'status.json'), { status: summary.status, configHash, usageUsdEstimate: usd, updated: summary.finishedAt });
    console.log(JSON.stringify({ status: summary.status, usageUsdEstimate: usd, globalCommittedUsd: summary.globalCommittedUsd }));
  } catch (e) {
    atomic(path.join(OUT, 'error.json'), { time: new Date().toISOString(), message: String(e?.message || e), note: 'Reservation and provider id are preserved; never resubmit an uncertain POST.' });
    console.error(e.stack || e); process.exitCode = 1;
  }
}
