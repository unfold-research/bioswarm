// GN1 runner (tasks/GN1-MEMORY-PREREG.md, build B3): memory between related cases. The rc instrument of run-rc3 (one
// Message Batch per wave, reserved in the shared ledger before its single POST, never retried when uncertain, reconciled
// from returned usage, resumable, per-study cap checked before every wave) with:
//   - sequences of cases from family.mjs (related: f of the edges repeat from case 1; control: unrelated cases)
//   - case 1 runs once per sequence, shared by every arm ('shared'); cases 2.. run per arm
//   - after a case (its last wave), one extra request per member in each notes arm (notes.mjs): notebook and library;
//     the notes are cut to notesTokens (token-counted, recorded) and shown in every member request of the next case
//   - protocol stigwait for every arm, cfg.rounds act rounds after the start wave, strict feedback, cfg.memberMax
// Phases run in lockstep over all sequences: case 1, notes 1, case 2, notes 2, case 3. Each phase is one or more waves.
// At the end of each case phase one record per unit is written to recordsDir (<arm>-c<case>-s<seed>.json).
// Library use: runGN1({ cfg, sequences, outDir, recordsDir, backend, counter }); drive-gn1.mjs is the bench entry point.
// CLI (no spend): node observatory/batch2/rc/run-gn1.mjs <spec.json> --fake [--out DIR] [--pilot]
//   --fake  a stub model (gn1-fake.mjs): no network, no ledger, token counts bytes / 3; runs every phase end to end
//   --dry   the real batch backend in dry mode: counts offline, prints the first wave's requests and reserve, stops
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as W from './code.mjs';
import { makeSequence, firstPassBreakdown } from './family.mjs';
import { NOTE_ARMS, SEEN_MAX, cutToTokens, parseLibrary, libraryRead, noteRequest, withNotes, bytesCounter } from './notes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const WAVE_CAP_USD = 5;
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const atomic = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 1) + '\n'); fs.renameSync(t, f); };
const readj = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const SOURCES = ['code.mjs', 'family.mjs', 'notes.mjs', 'run-gn1.mjs'];
export const seqKey = (S) => `${S.type === 'control' ? 'c' : 'r'}${S.seed}`;
export const recordName = (arm, c, seed) => `${arm}-c${c}-s${seed}.json`;
// the design part of the config (the cap is budget, not design: left out so it can be raised on resume)
const design = (cfg) => ({ model: cfg.model, k: cfg.k, shape: cfg.shape, f: cfg.f, rounds: cfg.rounds, memberMax: cfg.memberMax, notesMax: cfg.notesMax, notesTokens: cfg.notesTokens, effort: cfg.effort ?? null, strictFeedback: !!cfg.strictFeedback, protocol: cfg.protocol, arms: cfg.arms });
export const configHash = (cfg, sequences) => sha({ design: design(cfg), sequences, sources: SOURCES.map((f) => sha(fs.readFileSync(path.join(HERE, f)))).concat(sha(fs.readFileSync(path.join(HERE, '../../lab007-economy/pricing.mjs')))) });

export async function runGN1({ cfg, sequences, outDir, recordsDir, backend, counter = bytesCounter, log = (o) => console.log(JSON.stringify(o)) }) {
  if (cfg.protocol !== 'stigwait') throw Error('GN1 registers stigwait for every arm');
  for (const a of cfg.arms) if (a !== 'none' && !NOTE_ARMS.includes(a)) throw Error(`unknown GN1 arm ${a}`);
  fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(recordsDir, { recursive: true });
  const strict = { strict: !!cfg.strictFeedback }, hashNow = configHash(cfg, sequences);
  const fam = new Map(sequences.map((S) => [seqKey(S), makeSequence(S.seed, { type: S.type, cases: S.cases, k: cfg.k, shape: cfg.shape, f: cfg.f })]));
  const inst = (S, c) => fam.get(seqKey(S))[c - 1];
  const stateFile = path.join(outDir, 'state.json'), state = readj(stateFile, { configHash: hashNow, units: {}, notes: {}, applied: [] });
  if (state.configHash !== hashNow) throw Error('Config, sequences or sources changed since this run started');
  const save = () => atomic(stateFile, state);
  const maxCases = Math.max(...sequences.map((S) => S.cases));
  const caseUnits = (c) => sequences.filter((S) => S.cases >= c).flatMap((S) => (c === 1 ? ['shared'] : cfg.arms).map((arm) => ({ S, c, arm, key: `${seqKey(S)}|c${c}|${arm}` })));
  const noteUnits = (c) => sequences.filter((S) => S.cases > c).flatMap((S) => cfg.arms.filter((a) => NOTE_ARMS.includes(a)).map((arm) => ({ S, c, arm, key: `${seqKey(S)}|n${c}|${arm}`, src: `${seqKey(S)}|c${c}|${c === 1 ? 'shared' : arm}` })));
  // the notes a member of unit u reads (none in case 1 and in arm none): notebook its own, library its module's view
  const shown = (u, m) => { if (u.c === 1 || !NOTE_ARMS.includes(u.arm)) return null; const n = state.notes[`${seqKey(u.S)}|n${u.c - 1}|${u.arm}`]; if (!n) throw Error(`notes missing for ${u.key}`); return u.arm === 'notebook' ? n.written[m]?.text || '' : n.views[m]?.text || ''; };
  const cid = (u, tail) => `${seqKey(u.S)}-c${u.c}-${u.arm}-${tail}`; // Message Batches custom_id: [a-zA-Z0-9_-]{1,64}

  function caseRows(units, k) {
    const rows = [];
    for (const u of units) {
      const I = inst(u.S, u.c), s = state.units[u.key];
      if (k === 0) { if (s) continue; const empty = new Array(I.k).fill('');
        for (let m = 0; m < I.k; m++) rows.push({ custom_id: cid(u, `w0-m${m}`), unit: u.key, m, seen: [], notes: shown(u, m) != null, params: withNotes(W.memberRequest(cfg.model, I, m, empty, [], cfg.memberMax, { effort: cfg.effort }), m, u.arm, shown(u, m)) });
        continue; }
      if (!s || s.solved || k > cfg.rounds) continue;
      const vs = W.check(I, s.code, strict); if (!vs.length) continue;
      for (const [m, assigned] of W.plan(I, vs, k, 'stigwait', s.traces || {})) rows.push({ custom_id: cid(u, `w${k}-m${m}`), unit: u.key, m, seen: assigned.map((v) => [v.id, v.text]), notes: shown(u, m) != null, params: withNotes(W.memberRequest(cfg.model, I, m, s.code, assigned, cfg.memberMax, { effort: cfg.effort }), m, u.arm, shown(u, m)) });
    }
    return rows;
  }
  function applyCase(units, k, rows, outputs) {
    for (const u of units) {
      const I = inst(u.S, u.c), mine = rows.filter((q) => q.unit === u.key);
      const s = state.units[u.key] ||= { code: new Array(I.k).fill(''), solved: false, history: [], seen: {} };
      const acted = []; let sent = 0, outMax = 0, outSum = 0, inSum = 0, usd = 0, trunc = 0;
      for (const q of mine) {
        const o = outputs.get(q.custom_id); outMax = Math.max(outMax, o.usage.output_tokens); outSum += o.usage.output_tokens; inSum += o.usage.input_tokens; usd += o.usd || 0; if (o.stop === 'max_tokens') trunc++;
        for (const [id, text] of q.seen) (s.seen[q.m] ||= {})[id] = text;
        for (const tr of (o.json?.traces || []).slice(0, 20)) { const id = String(tr.check || '').trim().replace(/^\[\s*|\s*\]$/g, ''); if (I.checks.some((x) => x.id === id && x.kind === 'directed' && x.holder === q.m)) { (s.traces ||= {})[id] = String(tr.text || '').slice(0, 400); sent++; } }
        const c = o.json?.code; if (typeof c === 'string' && c.trim()) { if (c !== s.code[q.m]) acted.push(q.m); s.code[q.m] = c; }
      }
      if (!mine.length && s.history.at(-1)?.wave === k) continue;
      const vs = W.check(I, s.code, strict); s.solved = vs.length === 0;
      s.history.push({ wave: k, counts: W.counts(vs), failing: vs.map((v) => v.id), actors: mine.length, acted, outMax, outSum, inSum, usd, trunc, sent, notesShown: mine.filter((q) => q.notes).length });
    }
  }
  async function applyNotes(units, rows, outputs) {
    for (const u of units) {
      const I = inst(u.S, u.c), written = {}, use = { requests: 0, outSum: 0, inSum: 0, usd: 0, trunc: 0, failed: 0 };
      for (const q of rows.filter((x) => x.unit === u.key)) {
        const o = outputs.get(q.custom_id); use.requests++; use.outSum += o.usage.output_tokens; use.inSum += o.usage.input_tokens; use.usd += o.usd || 0; if (o.stop === 'max_tokens') use.trunc++;
        const raw = typeof o.json?.notes === 'string' ? o.json.notes : ''; if (!raw) use.failed++;
        written[q.m] = { ...(await cutToTokens(raw, cfg.notesTokens, counter)), seen: q.seenCount, seenCut: q.seenCut, priorShown: q.prior };
        if (u.arm === 'library') { const p = parseLibrary(written[q.m].text, I.k); written[q.m].tagged = p.lines.length; written[q.m].untagged = p.dropped.length; }
      }
      const views = {};
      if (u.arm === 'library') for (let m = 0; m < I.k; m++) views[m] = await libraryRead(written, m, I.k, cfg.notesTokens, counter);
      const W_ = Object.values(written), V_ = Object.values(views);
      state.notes[u.key] = { arm: u.arm, from: u.src, counter: counter.label, usage: use, written, views,
        summary: { written: W_.length, seenCutMembers: W_.filter((x) => x.seenCut > 0).length, seenCutChecks: W_.reduce((n, x) => n + x.seenCut, 0), priorShown: W_.filter((x) => x.priorShown).length, writeCut: W_.filter((x) => x.cut).length, writeTokens: W_.reduce((n, x) => n + x.tokens, 0), writeRawTokens: W_.reduce((n, x) => n + x.rawTokens, 0), readCut: V_.filter((x) => x.cut).length, readTokens: V_.reduce((n, x) => n + x.tokens, 0) } };
      log({ notes: u.key, ...state.notes[u.key].summary, usd: +use.usd.toFixed(4), failed: use.failed });
    }
  }
  function writeRecords(units) {
    for (const u of units) {
      const s = state.units[u.key], I = inst(u.S, u.c); if (!s) continue;
      const solvedAt = s.history.findIndex((h) => h.counts.total === 0), fed = u.c > 1 && NOTE_ARMS.includes(u.arm) ? state.notes[`${seqKey(u.S)}|n${u.c - 1}|${u.arm}`] : null;
      atomic(path.join(recordsDir, recordName(u.arm, u.c, u.S.seed)), { study: 'GN1', seq: u.S.seed, type: u.S.type, case: u.c, arm: u.arm, instHash: I.hash, protocol: cfg.protocol, rounds: cfg.rounds,
        firstPassFailing: s.history[0].counts.total, firstPass: firstPassBreakdown(I, s.history[0].failing), solved: s.solved, wavesToSolve: s.solved ? solvedAt : null,
        finalFailing: s.history.at(-1).counts.total, tokens: s.history.reduce((n, h) => n + h.outSum, 0), usd: s.history.reduce((n, h) => n + h.usd, 0),
        notesRead: fed ? { from: fed.from, ...fed.summary, writeUsage: fed.usage } : null, noteWriteOutTokens: fed ? fed.usage.outSum : 0,
        history: s.history, finalCode: s.code });
    }
  }

  const phases = []; for (let c = 1; c <= maxCases; c++) { phases.push({ type: 'case', c }); if (c < maxCases) phases.push({ type: 'notes', c }); }
  for (const ph of phases) {
    const name = `${ph.type === 'case' ? 'c' : 'n'}${ph.c}`;
    if (ph.type === 'notes') {
      const units = noteUnits(ph.c), wk = `${name}.w0`; if (!units.length || state.applied.includes(wk)) continue;
      const rows = units.flatMap((u) => { const s = state.units[u.src], I = inst(u.S, u.c); if (!s) throw Error(`case state missing for ${u.src}`);
        // the last SEEN_MAX failing checks the member saw (the number left out is recorded), and the notes it read in this
        // case (after case 2: its case-1 notes of the same arm), in the same block as in its member requests
        return Array.from({ length: I.k }, (_, m) => { const seen = Object.values(s.seen[m] || {}), prior = shown(u, m);
          return { custom_id: `${seqKey(u.S)}-n${u.c}-${u.arm}-m${m}`, unit: u.key, m, seenCount: seen.length, seenCut: Math.max(0, seen.length - SEEN_MAX), prior: prior != null,
            params: noteRequest(cfg.model, I, m, s.code, seen.slice(-SEEN_MAX), u.arm, cfg.notesMax, cfg.effort, prior) }; }); });
      const outputs = await backend.wave(wk, rows); if (!outputs) return { stopped: true, state };
      await applyNotes(units, rows, outputs); state.applied.push(wk); save(); continue;
    }
    const units = caseUnits(ph.c);
    for (let k = 0; k <= cfg.rounds; k++) {
      const wk = `${name}.w${k}`; if (state.applied.includes(wk)) continue;
      const rows = caseRows(units, k); if (!rows.length) break;
      const outputs = await backend.wave(wk, rows); if (!outputs) return { stopped: true, state };
      applyCase(units, k, rows, outputs); state.applied.push(wk); save();
      log({ wave: wk, requests: rows.length, notesShown: rows.filter((q) => q.notes).length, solved: units.filter((u) => state.units[u.key]?.solved).length, of: units.length, left: units.reduce((n, u) => n + (state.units[u.key]?.history.at(-1)?.counts.total || 0), 0) });
    }
    writeRecords(units);
  }
  return { stopped: false, state };
}

// The study cap (prereg: US$ 8 including the pilot, checked before every wave): a wave is sent only if the spend so far
// (reconciled, or reserved while a wave is unreconciled; the pilot included) plus the wave's expected spend stays within
// the cap. Expected spend = reservation x min(1, 1.5 x this run's actual/reserve so far) (run-rc3); full reservation until
// a wave has been reconciled.
export function expectedRatio(journal) {
  const done = Object.values(journal).filter((e) => e.status === 'complete' && e.reserveUsd);
  return done.length ? Math.min(1, 1.5 * done.reduce((n, e) => n + (e.actualUsd || 0), 0) / done.reduce((n, e) => n + e.reserveUsd, 0)) : 1;
}
export const capAllows = ({ spentUsd, expectedUsd, capUsd }) => !capUsd || spentUsd + expectedUsd <= capUsd + 1e-9;
// The cost-rule record (plan.json) must exist, with its timestamp and sample, before the study's first wave.
export function requireRecord(file) {
  let r = null; try { r = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (!r || !r.at || !r.sample) throw Object.assign(Error(`no cost-rule record ${file} (with at and sample): the study sends no wave without it`), { final: true });
  return r;
}

// The real backend: run-rc3's wave discipline. priorSpentUsd: spend of earlier runs of the same study (the pilot) that
// the study cap includes. dry: count offline, print the wave, stop before any reservation or request.
// record: path of the cost-rule record the study needs before any wave (requireRecord); null for the pilot.
export function batchBackend({ cfg, outDir, name, hash, priorSpentUsd = 0, dry = false, record = null, log = (o) => console.log(JSON.stringify(o)) }) {
  const jf = path.join(outDir, 'batches.json'), tokenCache = new Map();
  let P = null, countFn = null;
  const pricing = async () => (P ??= await import('../../lab007-economy/pricing.mjs'));
  return {
    label: dry ? 'dry' : 'batch',
    spent: () => Object.values(readj(jf, {})).reduce((n, e) => n + (e.actualUsd ?? e.reserveUsd), 0),
    async wave(wk, rows) {
      if (record) requireRecord(record);
      const { priceFor, usageCostFor, reserveMeasured, measureRows } = await pricing(); priceFor(cfg.model);
      if (dry && !process.env.RC_COUNT_LIVE) process.env.RC_COUNT_STUB = 'YES';
      countFn ??= process.env.RC_COUNT_STUB === 'YES' ? async (p) => Math.ceil(Buffer.byteLength(JSON.stringify(p)) / 3) : (await import('../../../library/cards/batch-api.mjs')).countTokens;
      const t = await measureRows(rows, countFn, { cache: tokenCache, hashFn: sha }); rows.forEach((q, i) => { q.inputTokens = t[i]; q.reserveUsd = reserveMeasured(q.params, t[i]).usd; });
      const parts = []; let cur = [], curUsd = 0;
      for (const q of rows) { if (cur.length && (curUsd + q.reserveUsd > WAVE_CAP_USD * 0.9 || cur.length >= 9000)) { parts.push(cur); cur = []; curUsd = 0; } cur.push(q); curUsd += q.reserveUsd; }
      if (cur.length) parts.push(cur);
      const journal0 = readj(jf, {}), spent = priorSpentUsd + Object.entries(journal0).filter(([w]) => !w.startsWith(wk + '.')).reduce((n, [, e]) => n + (e.actualUsd ?? e.reserveUsd), 0);
      const reserveUsd = rows.reduce((n, q) => n + q.reserveUsd, 0);
      log({ wave: wk, requests: rows.length, parts: parts.length, reserveUsd: +reserveUsd.toFixed(4), inputTokens: rows.reduce((n, q) => n + q.inputTokens, 0), counted: process.env.RC_COUNT_STUB === 'YES' ? 'stub' : 'api', spentUsd: +spent.toFixed(4) });
      if (dry) return null;
      const fresh = parts.some((_, i) => !journal0[`${wk}.${i}`]);
      const ratio = expectedRatio(journal0);
      if (fresh && !capAllows({ spentUsd: spent, expectedUsd: reserveUsd * ratio, capUsd: cfg.studyCapUsd })) { log({ wave: wk, stop: 'study cap', spent, reserveUsd, expectedUsd: reserveUsd * ratio, cap: cfg.studyCapUsd }); this.capStopped = true; return null; }
      const api = await import('../../../library/cards/batch-api.mjs'), B = await import('../../lab007-instrument-audit/global-budget.mjs');
      let lock = Promise.resolve(); const serial = (f) => (lock = lock.then(f, f));
      const runPart = async (part, i) => {
        const key = `${wk}.${i}`, manifest = part.map(({ custom_id, params }) => ({ custom_id, params })), mh = sha({ hash, wk, i, manifest }), pres = part.reduce((n, q) => n + q.reserveUsd, 0), bn = `${name}-${wk.replace('.', '-')}-p${i}`;
        let e = await serial(async () => { const x = readj(jf, {})[key]; if (x && x.manifestHash !== mh) throw new Error(`part ${key} manifest differs from journal`); return x; });
        if (!e) {
          fs.writeFileSync(path.join(outDir, `wave-${wk}-p${i}.requests.jsonl`), manifest.map((x) => JSON.stringify(x)).join('\n') + '\n');
          await serial(async () => { await B.reserveWaves({ studyHash: hash, waves: [{ name: bn, manifestHash: mh, requestCount: part.length, reserveUsd: pres }] }); const j = readj(jf, {}); j[key] = { manifestHash: mh, requestCount: part.length, reserveUsd: pres, batchId: null, status: 'intent' }; atomic(jf, j); await B.attachActualManifest({ name: bn, actualManifestHash: mh, requestCount: part.length }); });
          const created = await api.createBatch(manifest);
          e = await serial(async () => { const j = readj(jf, {}); Object.assign(j[key], { batchId: created.id, status: 'submitted', submittedAt: new Date().toISOString() }); atomic(jf, j); await B.markSubmitted({ name: bn, batchId: created.id, actualManifestHash: mh }); return j[key]; });
        } else if (!e.batchId) throw new Error(`part ${key}: uncertain submission, not retried`);
        const resFile = path.join(outDir, `wave-${wk}-p${i}.results.jsonl`); let raw;
        if (fs.existsSync(resFile)) raw = fs.readFileSync(resFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
        else { const ended = await api.waitForBatch(e.batchId, { intervalMs: 20000 }); raw = await api.fetchBatchResults(ended); fs.writeFileSync(resFile, raw.map((x) => JSON.stringify(x)).join('\n') + '\n'); }
        let usd = 0; for (const x of raw) { const m = x.result?.message; if (x.result?.type === 'succeeded' && m) usd += usageCostFor(cfg.model, m.usage); }
        await serial(async () => { const j = readj(jf, {}); if (j[key].status !== 'complete') { await B.reconcileWave({ name: bn, batchId: j[key].batchId, resultCount: raw.length, actualUsd: usd, allPriced: true }); Object.assign(j[key], { status: 'complete', actualUsd: usd }); atomic(jf, j); } });
        return raw;
      };
      const raws = (await Promise.all(parts.map(runPart))).flat(), outputs = new Map();
      for (const x of raws) { const m = x.result?.message; if (x.result?.type !== 'succeeded' || !m) { outputs.set(x.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'failed', usd: 0 }); continue; }
        const tx = m.content?.filter((z) => z.type === 'text').map((z) => z.text).join('') || ''; let json = null; try { json = JSON.parse(tx); } catch {}
        outputs.set(x.custom_id, { json, usage: m.usage, stop: m.stop_reason, blocks: (m.content || []).map((z) => z.type), usd: usageCostFor(cfg.model, m.usage) }); }
      for (const q of rows) if (!outputs.has(q.custom_id)) outputs.set(q.custom_id, { json: null, usage: { input_tokens: 0, output_tokens: 0 }, stop: 'missing', usd: 0 });
      return outputs;
    },
  };
}

// the sequences of a spec part: the pilot, or the study sample (all, or the cost rule's reduced sample)
export function sequencesOf(spec, part, sample = 'full') {
  if (part === 'pilot') return [{ seed: spec.pilot.seed, type: 'related', cases: spec.pilot.cases }];
  const step = spec.costRule.steps.find((x) => x.sample === sample); if (!step) throw Error(`unknown sample ${sample}`);
  return [...step.related.map((seed) => ({ seed, type: 'related', cases: spec.sequences.cases })), ...step.control.map((seed) => ({ seed, type: 'control', cases: spec.sequences.cases }))];
}
// The cost rule's projection: the pilot's spend plus, per sequence, its case runs (1 shared case 1 + (cases-1) x arms) at
// the pilot's cost per case run and its note rounds ((cases-1) x notes arms) at the pilot's cost per note round.
export function projectCost({ pilotSpentUsd, perCaseRunUsd, perNoteRoundUsd, related, control, cases, arms }) {
  const noteArms = arms.filter((a) => NOTE_ARMS.includes(a)).length;
  return pilotSpentUsd + (related + control) * ((1 + (cases - 1) * arms.length) * perCaseRunUsd + (cases - 1) * noteArms * perNoteRoundUsd);
}
// The cost rule (prereg, reading fixed before the data 2026-11-23): per step, the study's projection without the pilot;
// the first step (prereg order) at or under thresholdUsd and at or under studyCapUsd minus the pilot's actual spend.
export function chooseSample({ spec, arms, pilotSpentUsd, perCaseRunUsd, perNoteRoundUsd }) {
  const headroomUsd = +(spec.studyCapUsd - pilotSpentUsd).toFixed(6);
  const steps = spec.costRule.steps.map((x) => { const studyProjectedUsd = +projectCost({ pilotSpentUsd: 0, perCaseRunUsd, perNoteRoundUsd, related: x.related.length, control: x.control.length, cases: spec.sequences.cases, arms }).toFixed(4);
    return { sample: x.sample, studyProjectedUsd, withPilotUsd: +(studyProjectedUsd + pilotSpentUsd).toFixed(4), underThreshold: studyProjectedUsd <= spec.costRule.thresholdUsd + 1e-9, underHeadroom: studyProjectedUsd <= headroomUsd + 1e-9 }; });
  return { steps, pick: steps.find((x) => x.underThreshold && x.underHeadroom) || null, headroomUsd };
}
export const runConfig = (spec, arms = spec.arms) => ({ model: spec.model, k: spec.k, shape: spec.shape, f: spec.f, rounds: spec.rounds, memberMax: spec.memberMax, notesMax: spec.notesMax, notesTokens: spec.notesTokens, effort: spec.effort, strictFeedback: spec.strictFeedback, protocol: spec.protocol, arms, studyCapUsd: spec.studyCapUsd });

if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2], spec = JSON.parse(fs.readFileSync(specPath, 'utf8')), fake = process.argv.includes('--fake'), dry = process.argv.includes('--dry');
  if (!fake && !dry) { console.error('run-gn1.mjs alone runs only --fake or --dry; paid runs go through drive-gn1.mjs (the bench)'); process.exit(2); }
  const oi = process.argv.indexOf('--out'), out = oi > 0 ? path.resolve(process.argv[oi + 1]) : path.join(ROOT, '.bench', 'gn1-dry');
  const part = process.argv.includes('--pilot') ? 'pilot' : 'study', sequences = sequencesOf(spec, part), cfg = runConfig(spec);
  process.env.RC_COUNT_STUB = 'YES';
  const backend = fake ? (await import('./gn1-fake.mjs')).fakeBackend({ cfg }) : batchBackend({ cfg, outDir: out, name: 'gn1-dry', hash: configHash(cfg, sequences), dry: true });
  const r = await runGN1({ cfg, sequences, outDir: out, recordsDir: path.join(out, 'runs'), backend, counter: bytesCounter });
  console.log(JSON.stringify({ done: !r.stopped, backend: backend.label, out, records: fs.readdirSync(path.join(out, 'runs')).length }));
}
