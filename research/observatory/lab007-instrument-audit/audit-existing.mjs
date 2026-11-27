import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreRun } from '../lab007-economy/model.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), BASE = path.resolve(HERE, '../..');
const OUT = path.join(BASE, 'results/lab007-instrument-audit');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const runs = read(path.join(BASE, 'results/lab007-economy-explore/round-1.json'));
const oldStatus = read(path.join(BASE, 'results/lab007-economy-json/status.json'));
const oldBatches = read(path.join(BASE, 'results/lab007-economy-json/batches.json'));
const oldBatch = Object.values(oldBatches).find((x) => x.batchId === 'msgbatch_01LSzoreLHhpkHffu6x9CGH7');
const clean = {};
for (const arm of ['NOSHARE', 'FIXED']) {
  const sample = runs.filter((x) => x.cell === 'S0' && x.arm === arm), scores = sample.map(scoreRun);
  const finals = sample.flatMap((r) => r.history.at(-1) || []);
  const correct = scores.reduce((n, s) => n + s.correct, 0), valid = scores.reduce((n, s) => n + s.valid, 0);
  const knownCounts = Object.fromEntries([0, 1, 2, 3].map((k) => [k, finals.filter((x) => x.valid && x.answer.v.filter((v) => v !== null).length === k).length]));
  clean[arm] = { trajectories: sample.length, validResponses: valid, correct, unsure: scores.reduce((n, s) => n + s.unsure, 0),
    wrong: scores.reduce((n, s) => n + s.valid - s.correct - s.unsure, 0), supportedIndicatorCount: knownCounts };
}
const fixed = clean.FIXED;
const result = { generated: new Date().toISOString(), source: 'existing persisted exploratory checkpoint only',
  originalGate: { runnerStatus: oldStatus.status, stage: oldStatus.stage, processId: oldStatus.pid,
    batchId: oldBatch?.batchId, batchJournalStatus: oldBatch?.status, batchReserveUsd: oldBatch?.reserve,
    registeredGateScored: !!oldStatus.calibrationGate, calibrationGate: oldStatus.calibrationGate || null },
  exploratoryClean: clean,
  descriptiveObservation: `FIXED has ${fixed.supportedIndicatorCount[3]} answers with all three evidence values; those equal the ${fixed.correct} correct outputs. Other valid FIXED outputs have incomplete evidence and are unsure. This describes the saved screen only; the seeds are unpaired and do not estimate a causal sharing effect.`,
  interpretationLimit: 'The six analyst outputs within each trajectory are clustered; the 8 clean trajectories per arm are only a small unpaired descriptive screen. Do not infer defence efficacy or alter the registered gate.' };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'existing-data-audit.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
