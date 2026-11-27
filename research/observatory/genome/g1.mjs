// G1 swarm genome runner. Usage: node observatory/genome/g1.mjs --freeze | --live | --repair
// --freeze writes the manifests and the config hash. --live reserves both coder batches in the shared ledger, submits once,
// waits, fetches, and reconciles. A batch already in the journal is never posted again.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SPECIES, CODERS, request, reserveUsd, usageUsd, hash, SYSTEM, SCHEMA } from './lib.mjs';
import { reserveWaves, markSubmitted, reconcileWave } from '../lab007-instrument-audit/global-budget.mjs';

const OUT = path.join(ROOT, 'results/genome-g1');
const STUDY_CAP_USD = 30;
const mode = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const atomic = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 2) + '\n'); fs.renameSync(t, f); };
const read = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);

const INPUT_TOKENS_EST = 6200; // measured in the schema smoke: 5,938 cached system + 62 user, rounded up
const waves = Object.keys(CODERS).map((coder) => {
  const rows = SPECIES.map((sp) => request(coder, sp));
  return { coder, name: `g1-genome-${coder}`, rows, manifestHash: hash(rows), reserveUsd: rows.length * reserveUsd(coder, INPUT_TOKENS_EST) };
});
const configHash = hash({ system: SYSTEM, schema: SCHEMA, coders: CODERS, waves: waves.map((w) => w.manifestHash), prereg: hash(fs.readFileSync(path.join(ROOT, 'tasks/G1-GENOME-PREREG.md'), 'utf8')) });

if (mode === '--freeze') {
  for (const w of waves) fs.writeFileSync(path.join(OUT, `${w.name}.requests.jsonl`), w.rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  atomic(path.join(OUT, 'config.json'), { configHash, studyCapUsd: STUDY_CAP_USD, waves: waves.map(({ name, coder, manifestHash, reserveUsd, rows }) => ({ name, coder, model: CODERS[coder].model, manifestHash, reserveUsd, requests: rows.length })) });
  const total = waves.reduce((s, w) => s + w.reserveUsd, 0);
  console.log(`frozen ${configHash.slice(0, 12)}; reserve US$ ${total.toFixed(2)} for ${waves.reduce((s, w) => s + w.rows.length, 0)} requests`);
  if (total > STUDY_CAP_USD) throw new Error('Reserve above the study cap');
} else if (mode === '--live') {
  const { createBatch, waitForBatch, fetchBatchResults } = await import('../../library/cards/batch-api.mjs');
  const cfg = read(path.join(OUT, 'config.json'));
  if (!cfg || cfg.configHash !== configHash) throw new Error('Run --freeze first; the frozen config differs');
  const jf = path.join(OUT, 'batches.json'), journal = read(jf, {});
  await reserveWaves({ studyHash: configHash, waves: waves.map(({ name, manifestHash, reserveUsd, rows }) => ({ name, manifestHash, reserveUsd, requestCount: rows.length })) });
  for (const w of waves) {
    if (journal[w.name]) continue;
    journal[w.name] = { status: 'posting', at: new Date().toISOString() }; atomic(jf, journal);
    const b = await createBatch(w.rows);
    journal[w.name] = { batchId: b.id, status: 'submitted', at: new Date().toISOString() }; atomic(jf, journal);
    await markSubmitted({ name: w.name, batchId: b.id, actualManifestHash: w.manifestHash });
    console.log(`${w.name} submitted ${b.id}`);
  }
  await Promise.all(waves.map(async (w) => {
    const entry = journal[w.name];
    if (!entry?.batchId) throw new Error(`${w.name}: uncertain POST, resolve by hand before retrying`);
    if (entry.status === 'reconciled') return;
    const batch = await waitForBatch(entry.batchId, { intervalMs: 30000, onPoll: (x) => console.log(w.name, x.processing_status, JSON.stringify(x.request_counts)) });
    const results = await fetchBatchResults(batch);
    fs.writeFileSync(path.join(OUT, `${w.name}.results.jsonl`), results.map((r) => JSON.stringify(r)).join('\n') + '\n');
    let usd = 0, allPriced = true;
    for (const r of results) { const m = r.result?.message; const c = m ? usageUsd(m.model, m.usage) : 0; if (c === null) allPriced = false; usd += c || 0; }
    await reconcileWave({ name: w.name, batchId: entry.batchId, resultCount: results.length, actualUsd: usd, allPriced });
    entry.status = 'reconciled'; entry.actualUsd = usd; atomic(jf, journal);
    console.log(`${w.name} reconciled US$ ${usd.toFixed(4)}`);
  }));
} else throw new Error('Usage: g1.mjs --freeze | --live');
