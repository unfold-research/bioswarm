import fs from 'node:fs';
import path from 'node:path';
import { withLock, readBudget } from '../lab007-economy-explore/budget.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const BASE = path.resolve(HERE, '../..');
export const CAP_USD = 300; // raised from 50 by the owner on 2026-11-13, to 200 on 2026-11-17, to 300 on 2026-11-19
// UNFOLD_LEDGER: the research bench (bench/) keeps one canonical ledger for every checkout it runs studies in
export const DEFAULT_FILE = process.env.UNFOLD_LEDGER || path.join(BASE, 'results/lab007-economy-explore/global-budget.json');
const atomic = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
};
const sum = (state) => Object.values(state.commitments || {}).reduce((n, x) => n + Number(x.committedUsd || 0), 0);

export async function reserveWaves({ file = DEFAULT_FILE, waves, studyHash }) {
  if (!Array.isArray(waves) || !waves.length || !studyHash) throw new Error('A frozen study hash and wave list are required');
  for (const w of waves) if (!w.name || !w.manifestHash || !Number.isFinite(w.reserveUsd) || w.reserveUsd <= 0 || !Number.isInteger(w.requestCount) || w.requestCount < 1) throw new Error('Invalid wave reservation');
  if (new Set(waves.map((x) => x.name)).size !== waves.length) throw new Error('Duplicate wave names');
  await readBudget(file); // refresh the original runner hold under the shared lock before admission
  return withLock(file, async () => {
    if (!fs.existsSync(file)) throw new Error('Shared LAB-007 global budget is missing');
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (state.capUsd !== CAP_USD) throw new Error(`Expected shared global cap $${CAP_USD}`);
    const additions = [];
    for (const w of waves) {
      const old = state.commitments[w.name];
      if (old) {
        if (old.studyHash !== studyHash || old.manifestHash !== w.manifestHash || old.requestCount !== w.requestCount || Math.abs(old.reserveUsd - w.reserveUsd) > 1e-9) throw new Error(`Existing reservation identity mismatch: ${w.name}`);
        continue;
      }
      additions.push(w);
    }
    const totalReserve = additions.reduce((n, w) => n + w.reserveUsd, 0);
    const current = sum(state);
    if (current + totalReserve > CAP_USD + 1e-8) throw new Error(`Global cap stop: current $${current.toFixed(8)} + new reserve $${totalReserve.toFixed(8)} > $${CAP_USD}`);
    const now = new Date().toISOString();
    for (const w of additions) state.commitments[w.name] = { id: w.name, kind: 'lab007-instrument-audit', studyHash,
      manifestHash: w.manifestHash, requestCount: w.requestCount, reserveUsd: w.reserveUsd,
      committedUsd: w.reserveUsd, actualUsdEstimate: 0, providerBatchId: null, status: 'intent', created: now };
    state.history ||= [];
    if (additions.length) state.history.push({ event: 'instrument-audit-reserve-intents', studyHash,
      waves: additions.map(({ name, manifestHash, requestCount, reserveUsd }) => ({ name, manifestHash, requestCount, reserveUsd })),
      totalCommittedUsd: current + totalReserve, at: now });
    atomic(file, state);
    return { capUsd: CAP_USD, beforeUsd: current, addedUsd: totalReserve, committedUsd: sum(state),
      waves: waves.map((w) => state.commitments[w.name]) };
  });
}

export async function attachActualManifest({ file = DEFAULT_FILE, name, actualManifestHash, requestCount }) {
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8')), entry = state.commitments[name];
    if (!entry || entry.kind !== 'lab007-instrument-audit' || entry.status !== 'intent' || entry.providerBatchId) throw new Error(`Cannot bind actual manifest to ${name}`);
    if (!actualManifestHash || requestCount !== entry.requestCount) throw new Error('Actual manifest identity/count invalid');
    if (entry.actualManifestHash && entry.actualManifestHash !== actualManifestHash) throw new Error(`Actual manifest conflict for ${name}`);
    entry.actualManifestHash = actualManifestHash; entry.actualManifestBound = new Date().toISOString();
    atomic(file, state); return entry;
  });
}

export async function markSubmitted({ file = DEFAULT_FILE, name, batchId, actualManifestHash }) {
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8')), entry = state.commitments[name];
    if (!entry || entry.kind !== 'lab007-instrument-audit') throw new Error(`Missing instrument-audit intent ${name}`);
    if (entry.providerBatchId && entry.providerBatchId !== batchId) throw new Error(`Provider batch conflict for ${name}`);
    if (actualManifestHash && entry.actualManifestHash && entry.actualManifestHash !== actualManifestHash) throw new Error(`Actual manifest hash conflict for ${name}`);
    if (actualManifestHash && !entry.actualManifestHash) entry.actualManifestHash = actualManifestHash;
    entry.providerBatchId = batchId; entry.status = 'submitted'; entry.submitted = new Date().toISOString();
    state.history.push({ event: 'instrument-audit-submitted', name, batchId, at: entry.submitted }); atomic(file, state); return entry;
  });
}

export async function reconcileWave({ file = DEFAULT_FILE, name, batchId, resultCount, actualUsd, allPriced }) {
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8')), entry = state.commitments[name];
    if (!entry || entry.providerBatchId !== batchId) throw new Error(`Cannot reconcile unknown batch ${name}`);
    if (resultCount !== entry.requestCount || !Number.isFinite(actualUsd) || actualUsd < 0) throw new Error('Invalid reconciliation counts or price');
    entry.resultCount = resultCount; entry.actualUsdEstimate = actualUsd; entry.reconciled = new Date().toISOString();
    entry.status = allPriced ? 'complete' : 'needs-reconcile'; entry.committedUsd = allPriced ? actualUsd : entry.reserveUsd;
    state.history.push({ event: 'instrument-audit-reconciled', name, batchId, resultCount, actualUsdEstimate: actualUsd,
      committedUsd: entry.committedUsd, status: entry.status, at: entry.reconciled });
    if (sum(state) > CAP_USD + 1e-8) throw new Error('Global cap exceeded after reconcile');
    atomic(file, state); return { committedUsd: sum(state), entry };
  });
}

export async function releaseUnsubmitted({ file = DEFAULT_FILE, name }) {
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8')), entry = state.commitments[name];
    if (!entry || entry.kind !== 'lab007-instrument-audit' || entry.providerBatchId || entry.status !== 'intent') throw new Error(`Cannot release non-unsubmitted intent ${name}`);
    entry.status = 'released'; entry.committedUsd = 0; entry.released = new Date().toISOString();
    state.history.push({ event: 'instrument-audit-intent-released', name, at: entry.released }); atomic(file, state);
    return sum(state);
  });
}

export { sum as committedUsd };

// Price corrections of a finished study go through here, never by hand (method rule 7): one entry per study,
// `correction-<study>`, holding the difference between the recomputed cost and what its wave entries recorded, with the
// old value, the new value, the reason and the owner's approval. The wave entries themselves stay as they were, so the
// history keeps what the runner recorded. Idempotent: the same correction again changes nothing; a different one for the
// same study fails. A correction records money already spent, so it is written even above the cap, and says so.
export async function correctStudyCost({ file = DEFAULT_FILE, study, oldUsd, newUsd, reason, approval, evidence }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(study))) throw new Error('A study id is required');
  if (![oldUsd, newUsd].every(Number.isFinite) || oldUsd < 0 || newUsd < 0) throw new Error('Old and new values must be finite and non-negative');
  if (!reason || String(reason).length < 20) throw new Error('A reason is required');
  if (!approval || String(approval).length < 10) throw new Error('A reference to the owner approval is required');
  const name = `correction-${study}`, deltaUsd = +(newUsd - oldUsd).toFixed(6);
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8')), old = state.commitments[name];
    if (old) {
      if (Math.abs(old.committedUsd - deltaUsd) > 1e-9 || Math.abs(old.oldUsd - oldUsd) > 1e-9) throw new Error(`A different correction already exists for ${study}`);
      return { name, deltaUsd, isNew: false, committedUsd: sum(state) };
    }
    const recorded = Object.entries(state.commitments).filter(([k]) => k.startsWith(`${study}-wave-`)).reduce((n, [, e]) => n + Number(e.committedUsd || 0), 0);
    if (Math.abs(recorded - oldUsd) > 0.005) throw new Error(`Old value ${oldUsd} does not match the ${study} wave entries (${recorded.toFixed(6)})`);
    const at = new Date().toISOString();
    state.commitments[name] = { id: name, kind: 'cost-correction', study, status: 'complete', committedUsd: deltaUsd, oldUsd, newUsd, reason: String(reason), approval: String(approval), evidence: evidence || null, at };
    const total = sum(state);
    state.history.push({ event: 'cost-corrected', name, study, oldUsd, newUsd, deltaUsd, reason: String(reason), approval: String(approval), totalCommittedUsd: +total.toFixed(6), aboveCap: total > state.capUsd + 1e-8, at });
    atomic(file, state);
    return { name, deltaUsd, isNew: true, committedUsd: total, aboveCap: total > state.capUsd + 1e-8 };
  });
}

// Cap raises go through here, never by hand (method rule 7, docs/CONVENTIONS.md). Edit CAP_USD above in a commit that cites
// the owner's approval, then call raiseCap({ to: CAP_USD, approval }) with no runner active: it syncs the ledger and logs
// the raise with the time it happened.
export async function raiseCap({ file = DEFAULT_FILE, to, approval }) {
  if (to !== CAP_USD) throw new Error(`Edit CAP_USD to ${to} first (it is ${CAP_USD})`);
  if (!approval || String(approval).length < 10) throw new Error('A reference to the owner approval is required');
  return withLock(file, async () => {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (to <= state.capUsd) throw new Error(`The cap is already $${state.capUsd}`);
    const from = state.capUsd;
    state.capUsd = to;
    (state.history ||= []).push({ event: 'cap-raised', from, to, approval: String(approval), at: new Date().toISOString() });
    atomic(file, state);
    return { from, to };
  });
}
