// Rebuilds a lost run journal entry (results/<out>/batches.json, key "<wave>.<part>") for a pilot wave-0 part whose batch
// was submitted before the journal was lost (LI42, 2026-11-23: the worktree incident removed the pilot's journal while
// its wave 0 batch was in progress). With the entry back, run-rc3.mjs re-attaches to the batch on restart: it polls the
// same batch id and never reserves or submits again (provider-openai.mjs runPart reads the entry first).
// The entry is derived only from the ledger entry and the runner's own status file, and checked against them:
//   - the pilot config is rebuilt the way sweep.mjs builds it, and the wave-0 requests the way run-rc3.mjs builds them
//     (wave 0 needs no run state); the manifest hash under the sources the batch was submitted with (--orig-rev) must
//     equal the ledger entry's studyHash and manifestHash, so the requests are proven byte-identical to what was sent;
//   - the entry is then written with the manifest hash under the current sources (run-rc3's configHash covers its own
//     sources and provider-openai.mjs, so a fixed adapter changes it), and both hashes are recorded in the entry.
// It refuses to overwrite an existing entry, and writes nothing without --write.
// Usage: node observatory/batch2/rc/reattach-journal.mjs --spec sweeps/LI42.json --ledger-name li42-pilot-wave-0-p0
//          --status results/li42-pilot/status-p0.json --orig-rev 6422dab --measured-input-tokens 189273 [--write]
//        (UNFOLD_LEDGER: the ledger to read; run from the study checkout)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as W from './code.mjs';
import * as P from './provider-openai.mjs';
import { DEFAULT_FILE as LEDGER } from '../../lab007-instrument-audit/global-budget.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, '../../..');
const arg = (n, d = null) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const write = process.argv.includes('--write');
// the same hash as run-rc3.mjs: a string as is, anything else (a Buffer too) as its JSON
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');

// sweep.mjs pilot config (keep in step with sweep.mjs pilot())
const shapeOf = (z) => ({ local: 2, directed: z.directed || z.k, symmetric: z.symmetric || Math.round(z.k * 3 / 4), tests: z.tests || 8, shown: 3 });
export function pilotCfg(s) {
  const z = s.sizes[0], out = `${s.id.toLowerCase()}-pilot`;
  return { out, k: z.k, cases: 1, seed0: s.pilot.seed, shape: shapeOf(z), studyCapUsd: s.pilot.cap, arms: s.arms, ...(s.mechanisms ? { mechanisms: s.mechanisms } : {}), ...s.base, ...(z.extra || {}), rounds: s.pilot.rounds ?? s.base.rounds, pilot: true, transport: 'batch', transportFallback: 'flex' };
}
// run-rc3.mjs configHash, over the sources read by `read(relative path from rc/)` (keep in step with run-rc3.mjs)
const SOURCES = ['code.mjs', 'run-rc3.mjs', 'mechanisms.mjs', '../../lab007-economy/pricing.mjs', 'provider-openai.mjs', '../../../library/cards/openai-litellm-api.mjs'];
export function configHashOf(cfg, read) {
  if (cfg.provider !== 'openai-litellm') throw Error('only the openai-litellm path is supported');
  return sha({ cfg: { ...cfg, studyCapUsd: undefined }, sources: SOURCES.map((f) => sha(read(f))) });
}
// run-rc3.mjs requestsFor(0) and the openai-litellm manifest of part 0 (wave 0 is one part when the ledger says so)
export function wave0Manifest(cfg) {
  const rows = [];
  for (let i = 0; i < cfg.cases; i++) {
    const key = `k${cfg.k}s${cfg.seed0 + i}`, inst = W.makeInstance(cfg.k, cfg.seed0 + i, cfg.shape), empty = new Array(inst.k).fill('');
    for (let m = 0; m < inst.k; m++) rows.push({ custom_id: `start-${key}-m${m}`, params: W.memberRequest(cfg.model, inst, m, empty, [], cfg.memberMax, { effort: cfg.effort }) });
    if (cfg.arms.includes('solo')) rows.push({ custom_id: `solo-${key}-w0`, params: W.soloRequest(cfg.model, inst, null, [], cfg.soloMax, cfg.effort) });
  }
  return rows.map((q) => P.batchLine(q.custom_id, P.toOpenAIBody(q.params, { model: cfg.model })));
}
export const manifestHash = (configHash, k, i, manifest) => sha({ configHash, k, i, manifest });

if (import.meta.url === `file://${process.argv[1]}`) {
  const specFile = path.resolve(HERE, String(arg('spec')).replace(/^observatory\/batch2\/rc\//, '')), name = arg('ledger-name'), statusFile = path.resolve(ROOT, arg('status') || ''), rev = arg('orig-rev'), measured = Number(arg('measured-input-tokens'));
  if (!arg('spec') || !name || !arg('status') || !rev || !Number.isInteger(measured) || measured < 1) { console.error('usage: --spec <sweep spec> --ledger-name <entry> --status <status-pN.json> --orig-rev <commit> --measured-input-tokens <n> [--write]'); process.exit(2); }
  const s = JSON.parse(fs.readFileSync(specFile, 'utf8')), cfg = pilotCfg(s), k = 0;
  const st = JSON.parse(fs.readFileSync(statusFile, 'utf8')), i = st.part;
  const led = JSON.parse(fs.readFileSync(LEDGER, 'utf8')), le = led.commitments?.[name];
  const fail = (m) => { console.error(`reattach-journal: ${m}; nothing written`); process.exit(1); };
  if (!le) fail(`no ledger entry ${name} in ${LEDGER}`);
  if (name !== `${cfg.out}-wave-${k}-p${i}`) fail(`ledger name ${name} is not the runner's name for wave ${k} part ${i} (${cfg.out}-wave-${k}-p${i})`);
  if (st.wave !== k) fail(`status file is for wave ${st.wave}; only wave 0 can be rebuilt without run state`);
  if (le.status !== 'submitted' || !le.providerBatchId) fail(`ledger entry is ${le.status}, not submitted`);
  if (le.providerBatchId !== st.batchId) fail('status file and ledger name different batches');
  const manifest = wave0Manifest(cfg);
  if (i !== 0 || le.requestCount !== manifest.length) fail(`ledger has ${le.requestCount} requests, wave 0 has ${manifest.length}: not a single part 0`);
  const origRead = (f) => execFileSync('git', ['-C', ROOT, 'show', `${rev}:${path.relative(ROOT, path.resolve(HERE, f))}`], { encoding: 'buffer', maxBuffer: 64 << 20 });
  const nowRead = (f) => fs.readFileSync(path.resolve(HERE, f));
  const chOrig = configHashOf(cfg, origRead), mhOrig = manifestHash(chOrig, k, i, manifest);
  const chNow = configHashOf(cfg, nowRead), mhNow = manifestHash(chNow, k, i, manifest);
  const check = { studyHash: { ledger: le.studyHash, rebuilt: chOrig, equal: chOrig === le.studyHash }, manifestHash: { ledger: le.manifestHash, actual: le.actualManifestHash, rebuilt: mhOrig, equal: mhOrig === le.manifestHash && mhOrig === le.actualManifestHash },
    requests: manifest.length, customIds: { first: manifest[0].custom_id, last: manifest.at(-1).custom_id, sha: sha(manifest.map((x) => x.custom_id)) }, now: { configHash: chNow, manifestHash: mhNow, sourcesChanged: chNow !== chOrig } };
  console.log(JSON.stringify(check, null, 1));
  if (!check.studyHash.equal || !check.manifestHash.equal) fail(`the rebuilt requests do not match the ledger entry under ${rev}`);
  const jf = path.join(ROOT, 'results', cfg.out, 'batches.json'), j = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : {}, key = `${k}.${i}`;
  if (j[key]) fail(`${jf} already has ${key} (${j[key].status}, ${j[key].batchId})`);
  const entry = { manifestHash: mhNow, requestCount: le.requestCount, reserveUsd: le.reserveUsd, measuredInputTokens: measured, batchId: le.providerBatchId, status: 'submitted', transport: 'batch', ledgerName: name, provider: P.PROVIDER,
    submitAttempt: le.created, submittedAt: le.submitted,
    reconstructed: { at: new Date().toISOString(), by: 'observatory/batch2/rc/reattach-journal.mjs', from: [`ledger ${name}`, path.relative(ROOT, statusFile)], origRev: rev, ledgerStudyHash: le.studyHash, ledgerManifestHash: le.manifestHash, configHash: chNow, customIdsSha: check.customIds.sha,
      note: 'journal lost in the worktree incident; rebuilt from the ledger entry and the status file; requests proven identical to the submitted ones (manifest hash under origRev equals the ledger); manifestHash here is under the current sources' } };
  console.log(JSON.stringify({ journal: jf, key, entry }, null, 1));
  if (!write) { console.log('dry run: add --write to write the entry'); process.exit(0); }
  j[key] = entry; fs.mkdirSync(path.dirname(jf), { recursive: true });
  const t = `${jf}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(j, null, 2) + '\n'); fs.renameSync(t, jf);
  console.log(`wrote ${jf} ${key}`);
}
