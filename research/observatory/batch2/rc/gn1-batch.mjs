// GN1 batch backend with the study cap checked against FULL reservations (Genome Research, 2026-11-23, follow-ups 2
// and 3). A lockstep wave is sent as parts (Message Batches); each part is a ledger "wave" (reserved before its POST,
// reconciled after). Parts are cut adaptively, in request order: each part takes the next requests whose full
// reservations sum to at most
//     min(partMaxUsd, studyCapUsd - committed)
// where committed = the pilot's spend + every part of this run (reconciled: actual; not yet reconciled: its full
// reservation). So a part goes out only if committed + its full reservation <= studyCapUsd, and near the cap the parts
// shrink, down to a single request. When not even the next single request fits: if parts are in flight, the backend
// waits for one to be reconciled and cuts again; with nothing in flight the wave stops: the backend returns null with
// capStop = { wave, part, requestsLeft, spentUsd, partReserveUsd (that one request), capUsd, waveReserveUsd } and the
// driver stops with a final exit (no unit is silently dropped). The parts already sent stay in the journal (each with
// its request ids) and resume as they are.
// Kept out of run-gn1.mjs on purpose: run-gn1.mjs is part of the study's source hash (configHash), and the GN1 study was
// started with it, so it must stay byte-identical for the study to resume after the pilot. The cap is budget, not
// design, and is not in the hash (as studyCapUsd).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireRecord, projectCost } from './run-gn1.mjs';

export const PART_MAX_USD = 0.5;
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const atomic = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 1) + '\n'); fs.renameSync(t, f); };
const readj = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);

// the cap rule: a part (full reservation) fits if committed + its reservation stays within the cap
export const fits = ({ spentUsd, reserveUsd, capUsd }) => !capUsd || spentUsd + reserveUsd <= capUsd + 1e-9;
// the room for the next part: min(partMaxUsd, cap - committed)
export const partRoom = ({ committedUsd, capUsd, partMaxUsd = PART_MAX_USD }) => Math.min(partMaxUsd, capUsd ? capUsd - committedUsd : Infinity);
// the next part: the longest prefix of the queue whose reservations fit in the room (at most 9000 requests); [] when
// not even the first request fits
export function nextPart(queue, roomUsd) {
  const out = []; let usd = 0;
  for (const q of queue) { if (out.length >= 9000 || usd + q.reserveUsd > roomUsd + 1e-9) break; out.push(q); usd += q.reserveUsd; }
  return out;
}
// spend of a journal: actual when reconciled, else the full reservation
export const journalSpent = (j) => Object.values(j).reduce((n, e) => n + (e.actualUsd ?? e.reserveUsd), 0);

// deps (tests): { api: { createBatch, waitForBatch, fetchBatchResults }, budget: { reserveWaves, attachActualManifest,
// markSubmitted, reconcileWave }, countFn }; by default the real batch API, the shared ledger (UNFOLD_LEDGER) and
// count_tokens (RC_COUNT_STUB=YES: bytes / 3).
export function batchBackend({ cfg, outDir, name, hash, priorSpentUsd = 0, record = null, partMaxUsd = PART_MAX_USD, deps = {}, log = (o) => console.log(JSON.stringify(o)) }) {
  const jf = path.join(outDir, 'batches.json'), tokenCache = new Map();
  let P = null, countFn = deps.countFn || null;
  const pricing = async () => (P ??= await import('../../lab007-economy/pricing.mjs'));
  const backend = {
    label: 'batch', capStopped: false, capStop: null,
    spent: () => journalSpent(readj(jf, {})),
    async wave(wk, rows) {
      if (record) requireRecord(record);
      const { priceFor, usageCostFor, reserveMeasured, measureRows } = await pricing(); priceFor(cfg.model);
      countFn ??= process.env.RC_COUNT_STUB === 'YES' ? async (p) => Math.ceil(Buffer.byteLength(JSON.stringify(p)) / 3) : (await import('../../../library/cards/batch-api.mjs')).countTokens;
      const t = await measureRows(rows, countFn, { cache: tokenCache, hashFn: sha }); rows.forEach((q, i) => { q.inputTokens = t[i]; q.reserveUsd = reserveMeasured(q.params, t[i]).usd; });
      const reserveUsd = rows.reduce((n, q) => n + q.reserveUsd, 0), maxOneUsd = Math.max(0, ...rows.map((q) => q.reserveUsd));
      const spentNow = () => priorSpentUsd + journalSpent(readj(jf, {}));
      log({ wave: wk, requests: rows.length, maxRequestReserveUsd: +maxOneUsd.toFixed(6), reserveUsd: +reserveUsd.toFixed(4), inputTokens: rows.reduce((n, q) => n + q.inputTokens, 0), counted: deps.countFn ? 'test' : process.env.RC_COUNT_STUB === 'YES' ? 'stub' : 'api', spentUsd: +spentNow().toFixed(4), capUsd: cfg.studyCapUsd });
      const api = deps.api || await import('../../../library/cards/batch-api.mjs'), B = deps.budget || await import('../../lab007-instrument-audit/global-budget.mjs');
      let lock = Promise.resolve(); const serial = (f) => (lock = lock.then(f, f));
      const meta = (part, i) => { const manifest = part.map(({ custom_id, params }) => ({ custom_id, params })); return { key: `${wk}.${i}`, manifest, mh: sha({ hash, wk, i, manifest }), pres: part.reduce((n, q) => n + q.reserveUsd, 0), bn: `${name}-${wk.replace('.', '-')}-p${i}` }; };
      // reserve one part (ledger, then journal), before its POST; awaited in order, so the journal is exact for the next check
      const reserve = (part, i) => serial(async () => { const { key, manifest, mh, pres, bn } = meta(part, i);
        fs.writeFileSync(path.join(outDir, `wave-${wk}-p${i}.requests.jsonl`), manifest.map((x) => JSON.stringify(x)).join('\n') + '\n');
        await B.reserveWaves({ studyHash: hash, waves: [{ name: bn, manifestHash: mh, requestCount: part.length, reserveUsd: pres }] });
        const j = readj(jf, {}); j[key] = { manifestHash: mh, requestCount: part.length, reserveUsd: pres, ids: part.map((q) => q.custom_id), batchId: null, status: 'intent' }; atomic(jf, j);
        await B.attachActualManifest({ name: bn, actualManifestHash: mh, requestCount: part.length }); });
      const send = async (part, i) => { const { key, manifest, mh, bn } = meta(part, i);
        let e = readj(jf, {})[key];
        if (e.status === 'intent') { if (e.sent) throw new Error(`part ${key}: uncertain submission, not retried`);
          await serial(async () => { const j = readj(jf, {}); j[key].sent = true; atomic(jf, j); });
          const created = await api.createBatch(manifest);
          e = await serial(async () => { const j = readj(jf, {}); Object.assign(j[key], { batchId: created.id, status: 'submitted', submittedAt: new Date().toISOString() }); atomic(jf, j); await B.markSubmitted({ name: bn, batchId: created.id, actualManifestHash: mh }); return j[key]; }); }
        const resFile = path.join(outDir, `wave-${wk}-p${i}.results.jsonl`); let raw;
        if (fs.existsSync(resFile)) raw = fs.readFileSync(resFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
        else { const ended = await api.waitForBatch(e.batchId, { intervalMs: 20000 }); raw = await api.fetchBatchResults(ended); fs.writeFileSync(resFile, raw.map((x) => JSON.stringify(x)).join('\n') + '\n'); }
        let usd = 0; for (const x of raw) { const m = x.result?.message; if (x.result?.type === 'succeeded' && m) usd += usageCostFor(cfg.model, m.usage); }
        await serial(async () => { const j = readj(jf, {}); if (j[key].status !== 'complete') { await B.reconcileWave({ name: bn, batchId: j[key].batchId, resultCount: raw.length, actualUsd: usd, allPriced: true }); Object.assign(j[key], { status: 'complete', actualUsd: usd }); atomic(jf, j); } });
        return raw; };
      const inflight = new Set(), raws = [], errors = [];
      const track = (i, pr) => { const x = pr.then((r) => { raws[i] = r; inflight.delete(x); }, (err) => { errors.push(err); inflight.delete(x); }); inflight.add(x); };
      const fail = () => { if (errors.length) throw errors[0]; };
      // parts already reserved for this wave (an earlier run): resumed as they are, already counted in committed
      const byId = new Map(rows.map((q) => [q.custom_id, q])), taken = new Set(); let i = 0;
      for (const [key, e] of Object.entries(readj(jf, {})).filter(([x]) => x.startsWith(`${wk}.`)).sort((a, b) => Number(a[0].slice(wk.length + 1)) - Number(b[0].slice(wk.length + 1)))) {
        const n = Number(key.slice(wk.length + 1)), part = (e.ids || []).map((id) => byId.get(id));
        if (!e.ids || part.some((q) => !q)) throw new Error(`part ${key}: journal without the request ids of this wave`);
        if (meta(part, n).mh !== e.manifestHash) throw new Error(`part ${key} manifest differs from journal`);
        part.forEach((q) => taken.add(q.custom_id)); track(n, send(part, n)); i = Math.max(i, n + 1);
      }
      const queue = rows.filter((q) => !taken.has(q.custom_id));
      while (queue.length) {
        const part = nextPart(queue, partRoom({ committedUsd: spentNow(), capUsd: cfg.studyCapUsd, partMaxUsd }));
        if (!part.length) {
          if (inflight.size) { await Promise.race(inflight); fail(); continue; } // wait for a reconciliation, then cut again
          backend.capStopped = true;
          backend.capStop = { wave: wk, part: i, requestsLeft: queue.length, spentUsd: +spentNow().toFixed(6), partReserveUsd: +queue[0].reserveUsd.toFixed(6), capUsd: cfg.studyCapUsd, waveReserveUsd: +reserveUsd.toFixed(6) };
          log({ wave: wk, stop: 'study cap', ...backend.capStop });
          return null;
        }
        if (!fits({ spentUsd: spentNow(), reserveUsd: part.reduce((n, q) => n + q.reserveUsd, 0), capUsd: cfg.studyCapUsd })) throw new Error('internal: a part above the cap'); // guard
        queue.splice(0, part.length);
        await reserve(part, i); track(i, send(part, i)); i++;
        fail();
      }
      await Promise.all(inflight); fail();
      const outputs = new Map();
      for (const x of raws.flat()) { const m = x.result?.message; if (x.result?.type !== 'succeeded' || !m) { outputs.set(x.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'failed', usd: 0 }); continue; }
        const tx = m.content?.filter((z) => z.type === 'text').map((z) => z.text).join('') || ''; let json = null; try { json = JSON.parse(tx); } catch {}
        outputs.set(x.custom_id, { json, usage: m.usage, stop: m.stop_reason, blocks: (m.content || []).map((z) => z.type), usd: usageCostFor(cfg.model, m.usage) }); }
      for (const q of rows) if (!outputs.has(q.custom_id)) outputs.set(q.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'missing', usd: 0 });
      return outputs;
    },
  };
  return backend;
}

// The cost rule (prereg and Genome Research's reading, 2026-11-23; no extra margin, follow-up 3). Per step, the study's
// projection without the pilot, from the pilot's actual cost per case run and per note round; the first step (prereg
// order) whose projection is at most thresholdUsd (7.4) and at most studyCapUsd minus the pilot's actual spend.
// plan.json records what was used (headroomUsd = studyCapUsd - pilot actual; partMaxUsd of the batches).
export function chooseSample({ spec, arms, pilotSpentUsd, perCaseRunUsd, perNoteRoundUsd, partMaxUsd = spec.partMaxUsd ?? PART_MAX_USD }) {
  const headroomUsd = +(spec.studyCapUsd - pilotSpentUsd).toFixed(6);
  const steps = spec.costRule.steps.map((x) => { const studyProjectedUsd = +projectCost({ pilotSpentUsd: 0, perCaseRunUsd, perNoteRoundUsd, related: x.related.length, control: x.control.length, cases: spec.sequences.cases, arms }).toFixed(4);
    return { sample: x.sample, studyProjectedUsd, withPilotUsd: +(studyProjectedUsd + pilotSpentUsd).toFixed(4), underThreshold: studyProjectedUsd <= spec.costRule.thresholdUsd + 1e-9, underHeadroom: studyProjectedUsd <= headroomUsd + 1e-9 }; });
  return { steps, pick: steps.find((x) => x.underThreshold && x.underHeadroom) || null, headroomUsd, partMaxUsd };
}

// A cap stop in a run the recorded plan still needs: the numbers go to <out>/cap-stop.json and to stderr; the driver
// exits 4 (final for the bench: a raise needs the owner). unitsNeeded: case runs of the plan with no record yet.
export function capStopReport({ out, part, capStop, sequences, arms, recordsDir, recordName }) {
  const needed = [];
  for (const S of sequences) for (let c = 1; c <= S.cases; c++) for (const arm of c === 1 ? ['shared'] : arms) if (!fs.existsSync(path.join(recordsDir, recordName(arm, c, S.seed)))) needed.push(`${arm}-c${c}-s${S.seed}`);
  const rep = { at: new Date().toISOString(), phase: part, ...capStop, unitsNeeded: needed.length, units: needed,
    note: 'not even one request of a wave the recorded plan needs fits: committed (spent so far, unreconciled parts at full reservation) + its full reservation is above the study cap, with nothing in flight; nothing was dropped; the parts already sent are in the journal and resume as they are after a cap raise by the owner' };
  fs.mkdirSync(out, { recursive: true }); atomic(path.join(out, 'cap-stop.json'), rep);
  console.error(`GN1 study cap stop (${part}): wave ${capStop.wave}, ${capStop.requestsLeft} requests not sent: spent so far US$ ${capStop.spentUsd} + one request's full reservation US$ ${capStop.partReserveUsd} > cap US$ ${capStop.capUsd}, nothing in flight; ${needed.length} case runs still needed (${path.join(out, 'cap-stop.json')})`);
  return rep;
}
