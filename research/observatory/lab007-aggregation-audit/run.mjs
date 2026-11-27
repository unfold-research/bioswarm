import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reserveFor, usageCost } from '../lab007-economy/batch.mjs';
import { DEFAULT_FILE, CAP_USD, reserveWaves, attachActualManifest, markSubmitted, reconcileWave } from '../lab007-instrument-audit/global-budget.mjs';
import { makeCases, makeRequests, auditDesign, scoreOutput, aggregateEvidence } from './protocol.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../..');
const OUT = path.join(BASE, 'results/lab007-aggregation-audit');
const PREREG = path.resolve(BASE, '../tasks/LAB-007-AGGREGATION-AUDIT-PREREG.md');
const NAME = 'instrument-audit-aggregation-v1';
const LOCK = path.join(OUT, 'frozen-lock.json');
const arg = process.argv[2] || '--plan';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stableHash = (value) => sha(JSON.stringify(value));
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJSONL = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const atomic = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
};
const writeJSONL = (file, rows) => fs.writeFileSync(file, rows.map((x) => JSON.stringify(x)).join('\n') + '\n', { mode: 0o600 });
const writeJSONLAtomic = (file, rows) => {
  const tmp = `${file}.${process.pid}.tmp`;
  writeJSONL(tmp, rows);
  fs.renameSync(tmp, file);
};
fs.mkdirSync(OUT, { recursive: true });

const cases = makeCases(), requestRows = makeRequests();
const manifest = requestRows.map(({ custom_id, params }) => ({ custom_id, params }));
const manifestHash = stableHash(manifest);
const reserveUsd = manifest.reduce((n, row) => n + reserveFor(row.params).usd, 0);
const logicalConfig = { protocol: 'LAB-007 aggregation audit v1', model: 'claude-haiku-5-5', maxTokens: 512,
  seedRange: [1001, 1024], cases: 24, archetypes: 8, repeatsPerArchetype: 3,
  formats: ['TEXT', 'STRUCTURED'], requestsPerFormat: 24, totalModelRequests: manifest.length,
  deterministicCases: 24, globalCapUsd: 50, perBatchUsdCap: null, cacheDiscount: 0 };
const sourceFiles = [
  ['protocol.mjs', path.join(HERE, 'protocol.mjs')],
  ['runner.mjs', path.join(HERE, 'run.mjs')],
  ['protocol.test.mjs', path.join(HERE, 'protocol.test.mjs')],
  ['sharedGlobalBudget.mjs', path.resolve(HERE, '../lab007-instrument-audit/global-budget.mjs')],
  ['originalPriceEstimator.mjs', path.resolve(HERE, '../lab007-economy/batch.mjs')],
];
const sourceHashes = Object.fromEntries(sourceFiles.map(([name, file]) => [name, sha(fs.readFileSync(file))]));
sourceHashes.preregistration = sha(fs.readFileSync(PREREG));
sourceHashes.previousAggregationScreen = readJSON(path.join(BASE, 'results/lab007-instrument-audit/frozen-lock.json')).configHash;
const configHash = stableHash({ logicalConfig, manifestHash, sourceHashes });
const requestHashes = requestRows.map((row) => stableHash([row.params.system, row.params.messages[0].content]));
if (new Set(requestHashes).size !== requestRows.length) throw new Error('Duplicate prompt found in frozen request set');

function globalState() {
  if (!fs.existsSync(DEFAULT_FILE)) throw new Error('Shared global budget file missing');
  const state = readJSON(DEFAULT_FILE);
  const committedUsd = Object.values(state.commitments || {}).reduce((n, x) => n + Number(x.committedUsd || 0), 0);
  return { capUsd: state.capUsd, committedUsd, availableUsd: state.capUsd - committedUsd };
}

function runPreflight() {
  const results = spawnSync(process.execPath, ['--test', path.join(HERE, 'protocol.test.mjs')], { encoding: 'utf8', timeout: 60000 });
  fs.writeFileSync(path.join(OUT, 'offline-tests.tap'), results.stdout + results.stderr, { mode: 0o600 });
  if (results.status !== 0 || !`${results.stdout}${results.stderr}`.includes('fail 0')) throw new Error('Aggregation audit offline tests failed');
}

function currentPlan() {
  const shapes = auditDesign(), budget = globalState();
  return { generatedAt: new Date().toISOString(), configHash, logicalConfig, sourceHashes, manifestHash,
    independentCalls: manifest.length, exactReserveUsd: reserveUsd,
    projectedGlobalAfterReservation: budget.committedUsd + reserveUsd,
    globalBudgetBefore: budget, scenarioAudit: shapes,
    integrity: { uniqueRequestIds: new Set(manifest.map((x) => x.custom_id)).size,
      uniquePrompts: new Set(requestHashes).size, outputSchema: 'claims with per-value evidence_ids; verdict scored separately' },
    execution: 'One independent batch; all 48 calls can be submitted together. The deterministic comparator makes no model calls.' };
}

function checkFrozen() {
  if (!fs.existsSync(LOCK)) throw new Error('Missing frozen-lock.json; freeze before execution');
  if (readJSON(LOCK).configHash !== configHash) throw new Error('Frozen source/config/manifest hash mismatch');
}

function checkPreviousStudyTerminal() {
  const prior = readJSON(path.join(BASE, 'results/lab007-instrument-audit/status.json'));
  const journal = readJSON(path.join(BASE, 'results/lab007-instrument-audit/batches.json'));
  if (prior.status !== 'instrument-insufficient' || journal['round-0']?.status !== 'complete' || journal['round-1']?.status !== 'complete') throw new Error('Prior clean instrument diagnostic is not fully terminal');
  if (fs.existsSync(path.join(BASE, 'results/lab007-economy-json/RUNNING.lock'))) throw new Error('Original runner lock remains present');
  if (Object.values(journal).some((x) => ['intent', 'post-intent', 'submitted'].includes(x.status))) throw new Error('Previous instrument diagnostic has unresolved batch state');
}

function summaryFor(rawById, batchId, usageUsd) {
  const byPattern = {};
  const results = [];
  for (const c of cases) {
    const det = scoreOutput(aggregateEvidence(c.records), c.records, c.truth);
    for (const format of ['TEXT', 'STRUCTURED']) {
      const customId = `aggv2-s${c.seed}-${format.toLowerCase()}`;
      const item = rawById.get(customId);
      const modelScore = scoreOutput(item?.text || '', c.records, c.truth);
      const row = { caseId: c.id, seed: c.seed, archetype: c.pattern, repeat: c.repeat, format,
        deterministic: det, model: modelScore, resultType: item?.resultType || 'missing', stopReason: item?.stopReason || null };
      results.push(row);
      const g = byPattern[c.pattern] ||= { cases: 3, TEXT: [], STRUCTURED: [], deterministic: [] };
      g[format].push(modelScore);
      if (format === 'TEXT') g.deterministic.push(det);
    }
  }
  const aggregate = (scores) => ({ outputs: scores.length, valid: scores.filter((x) => x.valid).length,
    exactClaims: scores.filter((x) => x.exactClaims).length, citationSupported: scores.filter((x) => x.allCitationsSupported).length,
    evidenceDecisionCorrect: scores.filter((x) => x.verdictCorrect).length,
    hiddenTruthCorrect: scores.filter((x) => x.truthCorrect).length,
    falseCertainty: scores.filter((x) => x.valid && x.verdict !== 'unsure' && x.expectedEvidenceVerdict === 'unsure').length,
    exactAttribution: scores.filter((x) => x.exactClaims).length });
  const byFormat = { TEXT: aggregate(results.filter((x) => x.format === 'TEXT').map((x) => x.model)),
    STRUCTURED: aggregate(results.filter((x) => x.format === 'STRUCTURED').map((x) => x.model)),
    DETERMINISTIC: aggregate(results.filter((x) => x.format === 'TEXT').map((x) => x.deterministic)) };
  const perArchetype = Object.fromEntries(Object.entries(byPattern).map(([key, val]) => [key, {
    TEXT: aggregate(val.TEXT), STRUCTURED: aggregate(val.STRUCTURED), DETERMINISTIC: aggregate(val.deterministic),
  }]));
  return { configHash, batchId, gate: 'diagnostic-only', caseClusters: cases.length,
    modelResponses: rawById.size, usageUsdEstimate: usageUsd, globalCommittedUsd: globalState().committedUsd,
    byFormat, perArchetype, pairedCaseResults: results,
    limits: ['24 case clusters across eight authored archetypes are an instrument screen, not a powered or diverse benchmark.',
      'The deterministic aggregator uses only supplied records and does not know hidden truth or source reliability.',
      'This one-step input-format test does not measure contamination, propagation, defence efficacy, topology, or production transfer.',
      'List-price estimate from returned token usage; it is not an invoice and the model alias does not freeze provider weights.'] };
}

function renderReport(summary) {
  const rows = Object.entries(summary.byFormat).map(([format, s]) => `| ${format} | ${s.outputs} | ${s.valid} | ${s.exactClaims} | ${s.citationSupported} | ${s.evidenceDecisionCorrect} | ${s.hiddenTruthCorrect} | ${s.falseCertainty} |`).join('\n');
  return `# LAB-007 aggregation audit v1\n\nConfig: \`${summary.configHash}\`. This is a one-step no-attack representation test; it is not a propagation or defence experiment.\n\nBatch: \`${summary.batchId}\` (${summary.modelResponses} model responses). Estimated usage: US$${summary.usageUsdEstimate.toFixed(8)}. Reconciled global commitment: US$${summary.globalCommittedUsd.toFixed(8)} / US$50.\n\n| Arm | Outputs | Valid schema | Exact fact set | Supported citations | Evidence-rule decision | Hidden-truth correct | False certainty |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\n## Interpretation\n\nTEXT and STRUCTURED are paired per case; six aggregate counts do not establish causal superiority. DETERMINISTIC has no model calls and serves as an engineering comparator. Evidence completeness, source support, decision correctness and hidden-truth correctness remain separate metrics. See \`summary.json\` for archetype-level outcomes and paired rows.\n\n## Limits\n\n${summary.limits.map((x) => `- ${x}`).join('\n')}\n`;
}

function parseResponses(raw) {
  const ids = manifest.map((x) => x.custom_id), actualIds = raw.map((x) => x.custom_id), want = new Set(ids);
  if (raw.length !== ids.length || new Set(actualIds).size !== ids.length || actualIds.some((x) => !want.has(x))) throw new Error('Response ID integrity failure');
  if (raw.some((x) => x.result?.type !== 'succeeded' || !Number.isFinite(x.result.message?.usage?.input_tokens) || !Number.isFinite(x.result.message?.usage?.output_tokens))) throw new Error('Batch returned a failed or unpriced request; retain pessimistic reserve and stop');
  let total = 0;
  const byId = new Map(), ledger = [];
  for (const item of raw) {
    const msg = item.result.message, cost = usageCost(msg.usage);
    total += cost;
    const text = msg.content?.filter((x) => x.type === 'text').map((x) => x.text).join('') || '';
    byId.set(item.custom_id, { text, resultType: item.result.type, stopReason: msg.stop_reason, model: msg.model });
    ledger.push({ ts: new Date().toISOString(), batchId: null, customId: item.custom_id, model: msg.model || 'claude-haiku-5-5',
      resultType: item.result.type, usage: msg.usage, usageCostUsd: cost, reserveUsd: 0,
      pricing: 'Haiku 5.5 batch list-price estimate; not invoice' });
  }
  return { byId, ledger, total };
}

async function live() {
  checkFrozen();
  if (process.env.LAB007_AGGREGATION_V2_PAID_APPROVED !== 'YES') throw new Error('Paid calls disabled; require current scope authorization flag');
  checkPreviousStudyTerminal();
  const approvalFile = path.join(OUT, 'approval.json');
  if (!fs.existsSync(approvalFile)) throw new Error('Missing approval record for this authorized spend scope');
  const approval = readJSON(approvalFile);
  if (approval.configHash !== configHash || approval.approved !== true || approval.reserveUsd + 1e-9 < reserveUsd || approval.globalCapUsd !== CAP_USD) throw new Error('Approval does not cover frozen protocol/reserve');
  runPreflight();
  const plan = readJSON(path.join(OUT, 'plan.json'));
  if (plan.configHash !== configHash || Math.abs(plan.exactReserveUsd - reserveUsd) > 1e-9) throw new Error('Frozen plan changed');
  const reserved = await reserveWaves({ studyHash: configHash, waves: [{ name: NAME, manifestHash, requestCount: manifest.length, reserveUsd }] });
  atomic(path.join(OUT, 'budget-start.json'), reserved);
  const budget = reserved.waves.find((x) => x.id === NAME);
  const journalFile = path.join(OUT, 'batches.json');
  let journal = fs.existsSync(journalFile) ? readJSON(journalFile) : {};
  let entry = journal[NAME] || { reservationManifestHash: budget.manifestHash, requestCount: budget.requestCount,
    reserveUsd: budget.reserveUsd, status: budget.status, created: budget.created,
    actualManifestHash: budget.actualManifestHash || null, batchId: budget.providerBatchId || null };
  if (entry.reservationManifestHash !== manifestHash || entry.requestCount !== manifest.length) throw new Error('Local journal does not match the atomic reservation');
  if (entry.status === 'post-intent' && !entry.batchId && !budget.providerBatchId) throw new Error('POST outcome uncertain; preserve reserve and do not resubmit');
  const resultFile = path.join(OUT, 'results.jsonl');
  let raw, batchId = entry.batchId || budget.providerBatchId;
  if (!batchId) {
    if (entry.status !== 'intent' || budget.status !== 'intent') throw new Error('Reservation state is uncertain; no retry permitted');
    writeJSONLAtomic(path.join(OUT, 'requests.jsonl'), manifest);
    await attachActualManifest({ name: NAME, actualManifestHash: manifestHash, requestCount: manifest.length });
    entry = { ...entry, actualManifestHash: manifestHash, status: 'post-intent', postIntentAt: new Date().toISOString() };
    journal[NAME] = entry; atomic(journalFile, journal);
    const { createBatch } = await import('../../../library/cards/batch-api.mjs');
    const created = await createBatch(manifest);
    batchId = created.id;
    await markSubmitted({ name: NAME, batchId, actualManifestHash: manifestHash });
    entry = { ...entry, batchId, status: 'submitted', submittedAt: new Date().toISOString() };
    journal[NAME] = entry; atomic(journalFile, journal);
  }
  atomic(path.join(OUT, 'status.json'), { status: 'waiting', batchId, requests: manifest.length, reserveUsd, configHash, updated: new Date().toISOString() });
  if (fs.existsSync(resultFile)) raw = readJSONL(resultFile);
  else {
    const { waitForBatch, fetchBatchResults } = await import('../../../library/cards/batch-api.mjs');
    const ended = await waitForBatch(batchId, { intervalMs: 15000, timeoutMs: 24 * 60 * 60 * 1000,
      onPoll: (b) => atomic(path.join(OUT, 'status.json'), { status: 'waiting', batchId, requests: manifest.length, counts: b.request_counts, reserveUsd, configHash, updated: new Date().toISOString() }) });
    raw = await fetchBatchResults(ended);
    writeJSONLAtomic(resultFile, raw);
  }
  const parsed = parseResponses(raw);
  const ledgerFile = path.join(OUT, 'ledger.jsonl'), oldLedger = readJSONL(ledgerFile), existing = new Set(oldLedger.map((x) => `${x.batchId}/${x.customId}`));
  for (const row of parsed.ledger) {
    row.batchId = batchId;
    if (!existing.has(`${batchId}/${row.customId}`)) fs.appendFileSync(ledgerFile, JSON.stringify(row) + '\n');
  }
  await reconcileWave({ name: NAME, batchId, resultCount: raw.length, actualUsd: parsed.total, allPriced: true });
  journal = fs.existsSync(journalFile) ? readJSON(journalFile) : {};
  journal[NAME] = { ...journal[NAME], batchId, status: 'complete', resultCount: raw.length,
    actualUsdEstimate: parsed.total, completedAt: new Date().toISOString() };
  atomic(journalFile, journal);
  const summary = summaryFor(parsed.byId, batchId, parsed.total);
  atomic(path.join(OUT, 'summary.json'), summary);
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), renderReport(summary), { mode: 0o600 });
  atomic(path.join(OUT, 'status.json'), { status: 'complete', gate: 'diagnostic-only', configHash,
    batchId, responses: raw.length, usageUsdEstimate: parsed.total, globalCommittedUsd: summary.globalCommittedUsd,
    completedAt: new Date().toISOString() });
}

if (arg === '--plan' || arg === '--freeze') {
  const plan = currentPlan();
  if (arg === '--freeze') {
    runPreflight();
    const changedAfterReserve = fs.existsSync(path.join(OUT, 'batches.json')) || Object.keys(readJSON(DEFAULT_FILE).commitments || {}).includes(NAME);
    const oldLock = fs.existsSync(LOCK) ? readJSON(LOCK) : null;
    if (oldLock && oldLock.configHash !== configHash && changedAfterReserve) throw new Error('Cannot refreeze after a reservation or submission');
    if (oldLock && oldLock.configHash !== configHash) atomic(path.join(OUT, 'frozen-lock.previous.json'), oldLock);
    writeJSONL(path.join(OUT, 'manifest.jsonl'), manifest);
    atomic(path.join(OUT, 'plan.json'), plan);
    atomic(LOCK, { ...plan, frozenAt: new Date().toISOString() });
  }
  process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
} else if (arg === '--live') {
  live().catch((error) => {
    atomic(path.join(OUT, 'error.json'), { ts: new Date().toISOString(), message: String(error?.message || error),
      note: 'Preserve any budget intent and provider ID; do not automatically resubmit.' });
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
} else throw new Error('Use --plan, --freeze, or --live');
