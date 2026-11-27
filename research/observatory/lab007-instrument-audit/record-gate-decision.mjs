import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { retrieveBatch } from '../../../library/cards/batch-api.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), BASE = path.resolve(HERE, '../..');
const MAIN = path.join(BASE, 'results/lab007-economy-json'), OUT = path.join(BASE, 'results/lab007-instrument-audit');
const read = (x) => JSON.parse(fs.readFileSync(x, 'utf8'));
const hashFile = (x) => crypto.createHash('sha256').update(fs.readFileSync(x)).digest('hex');
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const statusPath = path.join(MAIN, 'status.json'), batchPath = path.join(MAIN, 'batches.json');
const status = read(statusPath), batches = read(batchPath), batchEntry = Object.values(batches).find((x) => x.batchId === 'msgbatch_01LSzoreLHhpkHffu6x9CGH7');
if (status.configHash !== 'ff286074b3fb31b8356ec32b0095f02259ed506d333c27cdcafa6b6685667c30') throw new Error('Original prereg hash mismatch');
if (status.status !== 'calibration-gate-failed' || status.calibrationGate?.passes !== false) throw new Error('Original status does not record a failed gate');
if (!batchEntry || batchEntry.status !== 'complete' || batchEntry.requestCount !== 240) throw new Error('Original batch is not fully reconciled locally');
if (alive(50063) || fs.existsSync(path.join(MAIN, 'RUNNING.lock'))) throw new Error('Original runner is still active');
const remote = await retrieveBatch('msgbatch_01LSzoreLHhpkHffu6x9CGH7');
if (remote.processing_status !== 'ended' || remote.request_counts.succeeded !== 240 || remote.request_counts.errored || remote.request_counts.canceled || remote.request_counts.expired) throw new Error('Original remote batch is not fully successful and terminal');
const result = { recordedAt: new Date().toISOString(), outcome: 'gate-failed',
  originalConfigHash: status.configHash, originalBatchId: batchEntry.batchId, remoteStatus: remote.processing_status,
  requestCounts: remote.request_counts, calibrationGate: status.calibrationGate,
  localRunnerStatus: status.status, localRunnerPid: status.pid, processAlive: false,
  statusFileSha256: hashFile(statusPath), batchJournalSha256: hashFile(batchPath),
  note: 'Gate adjudication records the frozen runner output only; no new inference or reinterpretation.' };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'gate-decision.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
