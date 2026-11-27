import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commitment as oldCommitment } from '../lab007-economy/batch.mjs';

export const CAP_USD = 100; // raised from 50 by the owner on 2026-11-13
export const MAX_BATCH_USD = 5;
export const OLD_CAP_USD = 5;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(DIR, '../..');
export const OLD_OUT = path.join(BASE, 'results/lab007-economy-json');
// UNFOLD_LEDGER: the research bench (bench/) keeps one canonical ledger for every checkout it runs studies in
export const DEFAULT_FILE = process.env.UNFOLD_LEDGER || path.join(BASE, 'results/lab007-economy-explore/global-budget.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const atomic = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
};
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }

export async function withLock(file, fn, timeoutMs = 30000) {
  const lockFile = `${file}.lock`, deadline = Date.now() + timeoutMs;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let fd;
  while (Date.now() < deadline) {
    try {
      fd = fs.openSync(lockFile, 'wx', 0o600);
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const owner = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
        if (!alive(Number(owner.pid))) { fs.unlinkSync(lockFile); continue; }
      } catch (readError) { if (readError.code === 'ENOENT') continue; }
      await delay(15);
    }
  }
  if (fd === undefined) throw new Error('Global budget lock timeout');
  try { return await fn(); }
  finally { fs.closeSync(fd); try { fs.unlinkSync(lockFile); } catch {} }
}

function readOld() {
  const batchesPath = path.join(OLD_OUT, 'batches.json');
  if (!fs.existsSync(batchesPath)) throw new Error('Cannot reconcile LAB-007 legacy runner: missing batches.json');
  const batches = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));
  const statusPath = path.join(OLD_OUT, 'status.json');
  const status = fs.existsSync(statusPath) ? JSON.parse(fs.readFileSync(statusPath, 'utf8')) : {};
  const ledgerPath = path.join(OLD_OUT, 'ledger.jsonl');
  const ledger = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
  return { batches, status, ledger };
}

function refreshLegacyEntry(entry) {
  const { batches, status, ledger } = readOld();
  const lockPath = path.join(OLD_OUT, 'RUNNING.lock');
  const terminal = ['heldout-complete', 'calibration-gate-failed', 'budget-stop', 'integrity-or-api-stop'].includes(status.status);
  const running = fs.existsSync(lockPath) || (!terminal && alive(Number(status.pid)));
  const journalActual = Object.values(batches).reduce((s, row) => s + (row.status === 'complete' ? Number(row.chargedOrReserved) || 0 : 0), 0);
  const uncertain = ledger.reduce((s, row) => s + (Number(row.uncertainReserveUsd) || 0), 0);
  const actual = Math.max(0, journalActual - uncertain);
  entry.actualUsdEstimate = actual;
  entry.latestStatus = status.status || 'unknown';
  entry.latestStage = status.stage || null;
  entry.running = running;
  if (!running && terminal) {
    const committed = oldCommitment(batches);
    if (committed > OLD_CAP_USD + 1e-8) throw new Error(`Legacy runner ledger exceeds its frozen $${OLD_CAP_USD} cap`);
    entry.committedUsd = committed;
    entry.reconciledAt = new Date().toISOString();
    entry.status = 'terminal-reconciled';
  } else {
    entry.committedUsd = OLD_CAP_USD;
    entry.status = 'active-cap-held';
  }
}

export async function initialize(file = DEFAULT_FILE) {
  return withLock(file, async () => {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const legacy = { id: 'legacy-pid-50063', status: 'active-cap-held', committedUsd: OLD_CAP_USD,
      actualUsdEstimate: 0, subsumes: ['legacy calibration attempts', 'contract probe', 'cal1-r0', 'pending cal1-r1 and any future waves'],
      remoteBatch: 'msgbatch_01LSzoreLHhpkHffu6x9CGH7', runnerPid: 50063, internalCapUsd: OLD_CAP_USD };
    refreshLegacyEntry(legacy);
    const state = { schema: 1, capUsd: CAP_USD, perBatchCapUsd: MAX_BATCH_USD,
      created: new Date().toISOString(), commitments: { [legacy.id]: legacy }, history: [] };
    atomic(file, state);
    return state;
  });
}

function totalCommitted(state) { return Object.values(state.commitments).reduce((s, e) => s + (Number(e.committedUsd) || 0), 0); }

export async function reserveBatch({ file = DEFAULT_FILE, name, manifestHash, reserveUsd, requestCount }) {
  if (!name || !manifestHash || !Number.isFinite(reserveUsd) || reserveUsd <= 0 || !Number.isInteger(requestCount) || requestCount < 1) throw new Error('Invalid global batch reservation');
  if (reserveUsd > MAX_BATCH_USD + 1e-9) throw new Error(`Batch reservation $${reserveUsd.toFixed(4)} exceeds per-batch $${MAX_BATCH_USD}`);
  return withLock(file, async () => {
    if (!fs.existsSync(file)) throw new Error('Global budget must be initialized before reserving');
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    const legacy = state.commitments['legacy-pid-50063'];
    if (legacy) refreshLegacyEntry(legacy);
    const old = state.commitments[name];
    if (old) {
      if (old.manifestHash !== manifestHash || old.requestCount !== requestCount || Math.abs(old.reserveUsd - reserveUsd) > 1e-8) throw new Error(`Reservation identity mismatch: ${name}`);
      atomic(file, state);
      return { entry: old, isNew: false };
    }
    const committed = totalCommitted(state);
    if (committed + reserveUsd > state.capUsd + 1e-8) throw new Error(`Global cap stop: committed $${committed.toFixed(6)} + reserve $${reserveUsd.toFixed(6)} > $${state.capUsd}`);
    const entry = { id: name, status: 'intent', manifestHash, requestCount, reserveUsd,
      committedUsd: reserveUsd, actualUsdEstimate: 0, providerBatchId: null,
      created: new Date().toISOString() };
    state.commitments[name] = entry;
    state.history.push({ event: 'reserve-intent', id: name, manifestHash, reserveUsd, totalCommittedUsd: committed + reserveUsd, at: entry.created });
    atomic(file, state);
    return { entry, isNew: true };
  });
}

export async function markSubmitted({ file = DEFAULT_FILE, name, batchId }) {
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8')), entry = state.commitments[name];
    if (!entry) throw new Error(`Missing reservation: ${name}`);
    if (entry.providerBatchId && entry.providerBatchId !== batchId) throw new Error(`Batch ID conflict: ${name}`);
    entry.providerBatchId = batchId; entry.status = 'submitted'; entry.submitted = new Date().toISOString();
    state.history.push({ event: 'batch-submitted', id: name, batchId, at: entry.submitted }); atomic(file, state); return entry;
  });
}

export async function reconcileBatch({ file = DEFAULT_FILE, name, batchId, resultCount, actualUsd, allResultsPriced }) {
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8')), entry = state.commitments[name];
    if (!entry || entry.providerBatchId !== batchId) throw new Error(`Cannot reconcile unbound batch: ${name}`);
    if (!Number.isInteger(resultCount) || resultCount !== entry.requestCount) throw new Error('Result count does not match frozen request count');
    if (!Number.isFinite(actualUsd) || actualUsd < 0) throw new Error('Invalid actual usage estimate');
    entry.actualUsdEstimate = actualUsd;
    entry.resultCount = resultCount;
    entry.reconciled = new Date().toISOString();
    if (allResultsPriced) { entry.committedUsd = actualUsd; entry.status = 'complete'; }
    else { entry.committedUsd = entry.reserveUsd; entry.status = 'needs-reconcile'; }
    state.history.push({ event: 'batch-reconciled', id: name, batchId, resultCount, actualUsdEstimate: actualUsd,
      committedUsd: entry.committedUsd, status: entry.status, at: entry.reconciled });
    const total = totalCommitted(state);
    if (total > state.capUsd + 1e-8) throw new Error(`Global cap exceeded after reconcile: $${total.toFixed(6)}`);
    atomic(file, state); return { totalCommittedUsd: total, entry };
  });
}

export async function readBudget(file = DEFAULT_FILE) {
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    const legacy = state.commitments['legacy-pid-50063'];
    if (legacy) refreshLegacyEntry(legacy);
    atomic(file, state);
    return { capUsd: state.capUsd, committedUsd: totalCommitted(state), commitments: state.commitments };
  });
}
