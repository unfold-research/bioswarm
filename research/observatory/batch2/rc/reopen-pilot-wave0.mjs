// LI42 Amendment 3 (tasks/LI42-SECOND-FAMILY-PREREG.md): re-opens a pilot's wave 0 whose batch delivered some requests only
// as transport-class errors (HTTP 5xx, 429, timeout), so the fixed runner resends exactly those on flex, and discards the
// waves run after it. On the LI42 pilot (2026-11-23): wave 0 closed with 145 replies and 15 HTTP 500 lines, wave 1 ran
// on flex from that incomplete state (108 of 140 sent, 86 returned, nothing applied) and was stopped.
// What it changes in results/<id>-pilot, and nothing else:
//   - each discarded wave part (--discard 1.0): its ledger entry is reconciled to its cost (succeeded replies priced from
//     their usage; every request sent without a recorded outcome, and every retry that may have been billed, at its full
//     reserve: the runner's own rule for an uncertain call); its files move to <file>.<tag>; its journal entry moves to
//     key "<tag>-<key>" with status discarded (still summed by the cap checks and the pilot gate, never by calibration;
//     the redo reserves under <ledger name>-r2). Reply content is never read: only result.type and usage.
//   - wave 0 (--reopen 0.0): the delivered results are kept byte for byte in wave-0-p0.batch-results.jsonl; the results
//     file moves aside; the journal entry becomes "batch-partial" with a flexRemainder naming exactly the requests whose
//     batch line is a transport-class error (provider-openai.mjs batchFailedRequest), so runPart resends only those, on
//     flex, under <ledger name>-flex, and closes the part with all of them. The manifest hash is re-derived for the current
//     sources after proving the regenerated requests equal the journal's under --prev-rev.
//   - state.json moves aside (only wave 0 was applied, so the run restarts from the state before wave 0 and applies the
//     complete wave 0); transport.json gets the remainder entry; deviations.jsonl gets one line.
// It refuses if any wave-0 error is not transport class (that is a stop rule, not a resend), and writes nothing without
// --write. Usage (from the study checkout, UNFOLD_LEDGER = the ledger):
//   node observatory/batch2/rc/reopen-pilot-wave0.mjs --spec sweeps/LI42.json --prev-rev 1439b91 --discard 1.0
//        --tag discarded-amendment3 --reason "LI42 Amendment 3 (PR #192, f0de21a)" [--write]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as P from './provider-openai.mjs';
import { pilotCfg, configHashOf, wave0Manifest, manifestHash } from './reattach-journal.mjs';
import { DEFAULT_FILE as LEDGER, reconcileWave } from '../../lab007-instrument-audit/global-budget.mjs';
import { usageCostFor, reserveMeasured } from '../../lab007-economy/pricing.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, '../../..');
const arg = (n, d = null) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const args = (n) => process.argv.flatMap((a, i) => (a === `--${n}` ? [process.argv[i + 1]] : []));
const lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sha256 = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail = (m) => { console.error(`reopen-pilot-wave0: ${m}; nothing written`); process.exit(1); };

// a request's reserve as the runner computes it, from the bytes / 3 estimate scaled up to the part's measured total
export function reservesOf(bodies, measuredTotal, model) {
  const est = bodies.map((b) => P.estimateTokens(b)), scale = Math.max(1, measuredTotal / est.reduce((n, x) => n + x, 0));
  return bodies.map((b, i) => { const t = Math.ceil(est[i] * scale); return { inputTokens: t, usd: reserveMeasured({ model, max_tokens: b.max_completion_tokens }, t).usd }; });
}
// the cost of a discarded flex part from its log: succeeded replies at their usage, uncertain calls at their reserve
export function discardedFlexCost(flexLines, requests, measuredTotal, model) {
  const res = reservesOf(requests.map((x) => x.body), measuredTotal, model), reserveOf = new Map(requests.map((x, i) => [x.custom_id, res[i].usd]));
  let usageUsd = 0, uncertainUsd = 0; const done = new Set(), sent = new Set(), counts = { succeeded: 0, errored: 0, inFlight: 0, billedUnknownRetries: 0, definiteRetries: 0 };
  for (const x of flexLines) {
    if (x.event === 'sent') sent.add(x.custom_id);
    else if (x.event === 'retry') { if (x.billedUnknown) { uncertainUsd += reserveOf.get(x.custom_id); counts.billedUnknownRetries++; } else counts.definiteRetries++; }
    else if (x.event === 'done') {
      done.add(x.custom_id);
      if (x.line?.result?.type === 'succeeded') { usageUsd += usageCostFor(model, x.line.result.message.usage); counts.succeeded++; } else counts.errored++;
      if (x.billedUnknown) uncertainUsd += reserveOf.get(x.custom_id);
    }
  }
  const inFlight = [...sent].filter((id) => !done.has(id)); counts.inFlight = inFlight.length;
  for (const id of inFlight) uncertainUsd += reserveOf.get(id);
  return { usd: usageUsd + uncertainUsd, usageUsd, uncertainUsd, counts, inFlight };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const write = process.argv.includes('--write'), tag = arg('tag'), reason = arg('reason'), prevRev = arg('prev-rev'), discard = args('discard');
  if (!arg('spec') || !tag || !/^[a-z0-9-]+$/.test(tag) || !reason || !prevRev) { console.error('usage: --spec <sweep spec> --prev-rev <commit> --discard <wave.part> ... --tag <tag> --reason <text> [--write]'); process.exit(2); }
  const s = JSON.parse(fs.readFileSync(path.resolve(HERE, arg('spec').replace(/^observatory\/batch2\/rc\//, '')), 'utf8')), cfg = pilotCfg(s), OUT = path.join(ROOT, 'results', cfg.out), F = (f) => path.join(OUT, f);
  const jf = F('batches.json'), j = JSON.parse(fs.readFileSync(jf, 'utf8')), led = JSON.parse(fs.readFileSync(LEDGER, 'utf8')).commitments, now = new Date().toISOString();
  const report = { out: path.relative(ROOT, OUT), ledger: LEDGER, discard: [], reopen: null };

  // ---- the discarded parts
  for (const key of discard) {
    const e = j[key], [k, i] = key.split('.').map(Number);
    if (!e) fail(`no journal entry ${key}`);
    if (e.transport !== 'flex' || e.status === 'complete') fail(`${key} is ${e.transport} ${e.status}; only an unfinished flex part is discarded`);
    const le = led[e.ledgerName];
    if (!le || le.status !== 'submitted' || le.providerBatchId !== e.batchId) fail(`ledger ${e.ledgerName} is not the submitted entry of ${key}`);
    if (fs.existsSync(F(`wave-${k}-p${i}.results.jsonl`))) fail(`${key} has a results file`);
    const reqs = lines(F(`wave-${k}-p${i}.requests.jsonl`)), flexLog = F(`wave-${k}-p${i}.flex.jsonl`);
    if (reqs.length !== e.requestCount) fail(`${key}: ${reqs.length} requests on disk, ${e.requestCount} in the journal`);
    const c = discardedFlexCost(fs.existsSync(flexLog) ? lines(flexLog) : [], reqs, e.measuredInputTokens, cfg.model);
    const files = fs.readdirSync(OUT).filter((f) => f.startsWith(`wave-${k}-p${i}.`) && !f.endsWith(`.${tag}`));
    report.discard.push({ key, ledgerName: e.ledgerName, requests: reqs.length, ...c.counts, usageUsd: +c.usageUsd.toFixed(8), uncertainUsd: +c.uncertainUsd.toFixed(8), reconcileUsd: +c.usd.toFixed(8), reserveUsd: le.reserveUsd, files, journalKey: `${tag}-${key}`, redoLedgerName: `${e.ledgerName}-r2` });
  }

  // ---- wave 0
  const e0 = j['0.0'];
  if (!e0 || e0.status !== 'complete' || e0.transport !== 'batch') fail('0.0 is not a complete batch part');
  const res0 = lines(F('wave-0-p0.results.jsonl')), errFile = F('wave-0-p0.openai-errors.jsonl'), errLines = fs.existsSync(errFile) ? lines(errFile) : [];
  const failedHow = new Map(errLines.map((x) => [x.custom_id, P.batchFailedRequest(x)]).filter(([, h]) => h));
  const notDelivered = res0.filter((x) => x.result?.type !== 'succeeded');
  const other = notDelivered.filter((x) => !failedHow.has(x.custom_id));
  if (other.length) fail(`${other.length} wave-0 result(s) are errors that are not transport class (${other.slice(0, 3).map((x) => `${x.custom_id} ${x.result?.error?.status}`).join(', ')}): a stop rule, not a resend`);
  if (!notDelivered.length) fail('wave 0 has no transport-class error to resend');
  const manifest = wave0Manifest(cfg), nd = new Set(notDelivered.map((x) => x.custom_id)), ids = manifest.map((x) => x.custom_id).filter((id) => nd.has(id)); // part order
  const sorted = (a) => JSON.stringify([...a].sort());
  if (res0.length !== manifest.length || sorted(manifest.map((x) => x.custom_id)) !== sorted(res0.map((x) => x.custom_id))) fail('the regenerated wave-0 requests are not the results file\'s'); // the file is in the batch's output order
  const prevRead = (f) => execFileSync('git', ['-C', ROOT, 'show', `${prevRev}:${path.relative(ROOT, path.resolve(HERE, f))}`], { encoding: 'buffer', maxBuffer: 64 << 20 });
  const mhPrev = manifestHash(configHashOf(cfg, prevRead), 0, 0, manifest);
  if (mhPrev !== e0.manifestHash) fail(`the regenerated wave-0 requests do not match the journal's manifest hash under ${prevRev}`);
  const mhNow = manifestHash(configHashOf(cfg, (f) => fs.readFileSync(path.resolve(HERE, f))), 0, 0, manifest);
  const flexName = `${e0.ledgerName}-flex`;
  if (led[flexName]) fail(`ledger ${flexName} already exists`);
  if (!led[e0.ledgerName] || led[e0.ledgerName].status !== 'complete') fail(`ledger ${e0.ledgerName} is not complete`);
  const res = reservesOf(manifest.map((x) => x.body), e0.measuredInputTokens, cfg.model), want = new Set(ids);
  const remReserve = manifest.reduce((n, x, idx) => n + (want.has(x.custom_id) ? res[idx].usd : 0), 0), remTokens = manifest.reduce((n, x, idx) => n + (want.has(x.custom_id) ? res[idx].inputTokens : 0), 0);
  const kinds = {}; for (const id of ids) kinds[failedHow.get(id)] = (kinds[failedHow.get(id)] || 0) + 1;
  const why = `LI42 Amendment 3: batch ${e0.batchId} ended ${JSON.parse(fs.readFileSync(F('wave-0-p0.batch.json'), 'utf8')).status} with ${res0.length - ids.length} of ${res0.length} delivered; ${Object.entries(kinds).map(([h, n]) => `${n} ${h}`).join(', ')} inside the batch are batch failures per request, resent on flex with the same body (${reason})`;
  const flexRemainder = { custom_ids: ids, why, at: now, ledgerName: flexName, manifestHash: sha256({ manifestHash: mhNow, flexRemainder: ids }), reserveUsd: remReserve, measuredInputTokens: remTokens };
  const kept = fs.readFileSync(F('wave-0-p0.results.jsonl'), 'utf8').split('\n').filter(Boolean).filter((l) => JSON.parse(l).result?.type === 'succeeded');
  report.reopen = { key: '0.0', delivered: kept.length, resend: ids.length, kinds, first: ids[0], last: ids.at(-1), manifestHash: { journal: e0.manifestHash, prevRev, provenEqual: true, now: mhNow }, batchActualUsd: e0.actualUsd, flexLedgerName: flexName, flexReserveUsd: +remReserve.toFixed(8), stateApplied: JSON.parse(fs.readFileSync(F('state.json'), 'utf8')).applied };
  if (JSON.stringify(report.reopen.stateApplied) !== '[0]') fail(`state.json has applied ${JSON.stringify(report.reopen.stateApplied)}; only [0] can be reset by moving it aside`);
  console.log(JSON.stringify(report, null, 1));
  if (!write) { console.log('dry run: add --write to apply'); process.exit(0); }

  // ---- writes
  for (const d of report.discard) {
    const e = j[d.key];
    const r = await reconcileWave({ name: e.ledgerName, batchId: e.batchId, resultCount: e.requestCount, actualUsd: d.reconcileUsd, allPriced: true });
    console.log(`ledger ${e.ledgerName}: ${r.entry.status} US$ ${r.entry.committedUsd}`);
    for (const f of d.files) fs.renameSync(F(f), F(`${f}.${tag}`));
    j[d.journalKey] = { ...e, status: 'discarded', discarded: true, actualUsd: d.reconcileUsd, discard: { at: now, reason, tag, files: d.files.map((f) => `${f}.${tag}`), cost: { usageUsd: d.usageUsd, uncertainUsd: d.uncertainUsd, succeeded: d.succeeded, inFlight: d.inFlight, rule: 'succeeded at usage; sent without outcome and billed-unknown retries at full reserve; 429 retries unbilled' } } };
    delete j[d.key];
  }
  fs.writeFileSync(F('wave-0-p0.batch-results.jsonl'), kept.join('\n') + '\n');
  fs.renameSync(F('wave-0-p0.results.jsonl'), F(`wave-0-p0.results.jsonl.${tag}`));
  const { actualUsd, actualInputTokens, ...rest } = e0;
  j['0.0'] = { ...rest, manifestHash: mhNow, status: 'batch-partial', batchActualUsd: actualUsd, batchResultCount: kept.length, batchEnd: { status: 'cancelled', why, at: now }, flexRemainder,
    reopened: { at: now, reason, tag, previousManifestHash: e0.manifestHash, previousActualUsd: actualUsd, previousResults: `wave-0-p0.results.jsonl.${tag}` } };
  const t = `${jf}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(j, null, 2) + '\n'); fs.renameSync(t, jf);
  fs.renameSync(F('state.json'), F(`state.json.${tag}`));
  P.recordRemainder(F('transport.json'), { wave: 0, part: 0, custom_ids: ids, reason: why });
  fs.appendFileSync(F('deviations.jsonl'), JSON.stringify({ at: now, kind: `${reason}: wave 0 re-opened (${kept.length} delivered kept, ${ids.length} transport-class errors to resend on flex under ${flexName}); discarded ${report.discard.map((d) => `${d.key} (ledger ${d.ledgerName} reconciled US$ ${d.reconcileUsd}, files *.${tag})`).join(', ')}; state.json moved to state.json.${tag}` }) + '\n');
  console.log(`re-opened 0.0 in ${jf}`);
}
