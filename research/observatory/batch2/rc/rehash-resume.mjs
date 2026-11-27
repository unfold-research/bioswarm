// LI42 resume after a source change (2026-11-23): run-rc3's configHash covers provider-openai.mjs, so the #197 fix (flex
// resume resends a request whose recorded outcome is a transport-class error) makes a resume refuse the run ("Config or
// sources changed") and the open part ("manifest differs from journal"). This re-hashes exactly what the source change
// touches, after proving the run's requests are unchanged, and re-opens the part so only its undelivered requests go out:
//   - state.json configHash: old value proven equal to configHash(pilot config, sources at --prev-rev); set to the value
//     for the current sources (the previous value is kept in deviations.jsonl and run-provenance.json)
//   - the part (--part 1.0): its manifest (wave-<k>-p<i>.requests.jsonl, the batch lines sent) re-hashed: old value
//     proven equal to the journal's; new value for the current sources
//   - the part's delivered replies are kept byte for byte (wave-<k>-p<i>.batch-results.jsonl, the file runPart's
//     remainder path reads); its results file moves aside (<file>.before-resend); its requests whose result is a
//     transport-class error (flexTransportError) become a flex remainder under a continuation ledger entry
//     (<ledger name>-resend), reserved before the call and reconciled after it.
// Ledger choice: the part's own entry stays as it is (already reconciled to what it delivered; global-budget.mjs keeps
// studyHash and manifestHash immutable and only checks them at reserve time), and the continuation entry carries the
// resend under the new studyHash. Refuses if any result is an error that is not transport class, or any request has no
// result. Writes nothing without --write.
// Decision B (pilot-accounting.mjs): every journal entry whose ledger name is a cap-only name (the discarded wave 1, the
// mirrored 524 entry) is flagged capOnly with its reason: counted by the cap check, left out of rule (a).
// Usage (from the study checkout, UNFOLD_LEDGER = the ledger):
//   node observatory/batch2/rc/rehash-resume.mjs --spec sweeps/LI42.json --prev-rev eee08e4 --part 1.0 --reason "<text>" [--write]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as P from './provider-openai.mjs';
import { pilotCfg, configHashOf, manifestHash } from './reattach-journal.mjs';
import { reservesOf } from './reopen-pilot-wave0.mjs';
import { DEFAULT_FILE as LEDGER } from '../../lab007-instrument-audit/global-budget.mjs';
import { CAP_ONLY, isCapOnly } from './pilot-accounting.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, '../../..');
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? null : process.argv[i + 1]; };
const fail = (m) => { console.error(`rehash-resume: ${m}; nothing written`); process.exit(1); };
const sha256 = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const atomic = (f, x, indent) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, indent) + '\n'); fs.renameSync(t, f); };

const write = process.argv.includes('--write'), prevRev = arg('prev-rev'), key = arg('part'), reason = arg('reason');
// --count-entry <ledger name> (repeatable): a pilot ledger entry the runner did not write (e.g. the 8 cut HTTP 524 calls,
// added by hand) is mirrored into the journal as a discarded entry, so the runner's cap check and the pilot gate, which
// read the journal, count it too. The ledger entry itself is not touched.
const countEntries = process.argv.flatMap((a, idx) => (a === '--count-entry' ? [process.argv[idx + 1]] : []));
if (!arg('spec') || !prevRev || !/^\d+\.\d+$/.test(key || '') || !reason) { console.error('usage: --spec <sweep spec> --prev-rev <commit> --part <wave.part> --reason <text> [--write]'); process.exit(2); }
const s = JSON.parse(fs.readFileSync(path.resolve(HERE, arg('spec').replace(/^observatory\/batch2\/rc\//, '')), 'utf8')), cfg = pilotCfg(s), OUT = path.join(ROOT, 'results', cfg.out), F = (f) => path.join(OUT, f);
const [k, i] = key.split('.').map(Number), now = new Date().toISOString();
const prevRead = (f) => execFileSync('git', ['-C', ROOT, 'show', `${prevRev}:${path.relative(ROOT, path.resolve(HERE, f))}`], { encoding: 'buffer', maxBuffer: 64 << 20 });
const chPrev = configHashOf(cfg, prevRead), chNow = configHashOf(cfg, (f) => fs.readFileSync(path.resolve(HERE, f)));

const st = JSON.parse(fs.readFileSync(F('state.json'), 'utf8'));
if (st.configHash !== chPrev) fail(`state.json configHash ${st.configHash} is not the pilot config's under ${prevRev} (${chPrev})`);
if (st.applied?.includes(k)) fail(`wave ${k} is already applied`);
const jf = F('batches.json'), j = JSON.parse(fs.readFileSync(jf, 'utf8')), e = j[key];
if (!e) fail(`no journal entry ${key}`);
const open = Object.entries(j).filter(([kk, x]) => !x.discarded && !(st.applied || []).includes(Number(kk.split('.')[0])));
if (open.length !== 1 || open[0][0] !== key) fail(`open parts are ${open.map(([kk]) => kk).join(', ')}; expected only ${key}`);
const manifest = fs.readFileSync(F(`wave-${k}-p${i}.requests.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const mhPrev = manifestHash(chPrev, k, i, manifest), mhNow = manifestHash(chNow, k, i, manifest);
if (mhPrev !== e.manifestHash) fail(`the part's requests file does not hash to the journal's manifestHash under ${prevRev}`);
const led = JSON.parse(fs.readFileSync(LEDGER, 'utf8')).commitments, le = led[e.ledgerName], contName = `${e.ledgerName}-resend`;
if (!le || le.providerBatchId !== e.batchId || le.studyHash !== chPrev || le.manifestHash !== mhPrev) fail(`ledger ${e.ledgerName} is not this part's entry under ${prevRev}`);
if (le.status !== 'complete') fail(`ledger ${e.ledgerName} is ${le.status}; this tool continues a reconciled part only`);
if (led[contName]) fail(`ledger ${contName} already exists`);

const resFile = F(`wave-${k}-p${i}.results.jsonl`), keptFile = F(`wave-${k}-p${i}.batch-results.jsonl`);
if (!fs.existsSync(resFile)) fail('no results file');
if (fs.existsSync(keptFile)) fail(`${path.basename(keptFile)} exists`);
const resText = fs.readFileSync(resFile, 'utf8').split('\n').filter(Boolean), res = resText.map((l) => JSON.parse(l)), byId = new Map(res.map((x) => [x.custom_id, x]));
const absent = manifest.filter((x) => !byId.has(x.custom_id)); if (absent.length) fail(`${absent.length} request(s) have no result`);
const notDelivered = res.filter((x) => x.result?.type !== 'succeeded'), other = notDelivered.filter((x) => !P.flexTransportError(x));
if (other.length) fail(`${other.length} result(s) are errors that are not transport class (${other.map((x) => `${x.custom_id} ${x.result?.error?.status}`).join(', ')}): a stop rule, not a resend`);
if (!notDelivered.length) fail('nothing to resend');
const nd = new Set(notDelivered.map((x) => x.custom_id)), ids = manifest.map((x) => x.custom_id).filter((id) => nd.has(id));
const kept = resText.filter((l) => JSON.parse(l).result?.type === 'succeeded');
const rs = reservesOf(manifest.map((x) => x.body), e.measuredInputTokens, cfg.model), pick = (f) => manifest.reduce((n, x, idx) => n + (nd.has(x.custom_id) ? f(rs[idx]) : 0), 0);
const why = `${reason}: ${ids.length} request(s) of part ${key} have a transport-class error as their last outcome (${notDelivered.map((x) => `${x.custom_id} HTTP ${x.result.error.status}`).join(', ')}); resent on flex with the same body; the ${kept.length} delivered are kept`;
const flexRemainder = { custom_ids: ids, why, at: now, ledgerName: contName, manifestHash: sha256({ manifestHash: mhNow, flexRemainder: ids }), reserveUsd: pick((r) => r.usd), measuredInputTokens: pick((r) => r.inputTokens) };
const mirrors = countEntries.map((name) => { const x = led[name]; if (!x || x.status !== 'complete' || !Number.isFinite(x.committedUsd)) fail(`ledger ${name} is not a complete entry`); if (j[`ledger-${name}`]) fail(`journal already mirrors ${name}`); return { key: `ledger-${name}`, name, usd: x.committedUsd }; });
const flagCapOnly = Object.entries(j).filter(([, x]) => isCapOnly(x) && !x.capOnly).map(([kk, x]) => ({ key: kk, ledgerName: x.ledgerName }));
const report = { mirrors: mirrors.map((m) => ({ ...m, capOnly: Object.prototype.hasOwnProperty.call(CAP_ONLY, m.name) })), flagCapOnly, out: path.relative(ROOT, OUT), configHash: { state: st.configHash, prevRev, provenEqual: true, now: chNow }, part: { key, manifestHash: { journal: e.manifestHash, provenEqual: true, now: mhNow }, requests: manifest.length, delivered: kept.length, resend: ids, ledgerEntry: { name: e.ledgerName, status: le.status, committedUsd: le.committedUsd, kept: 'as is' }, continuation: { name: contName, reserveUsd: +flexRemainder.reserveUsd.toFixed(8) } } };
console.log(JSON.stringify(report, null, 1));
if (!write) { console.log('dry run: add --write to apply'); process.exit(0); }

fs.copyFileSync(F('state.json'), F('state.json.before-rehash'));
fs.writeFileSync(keptFile, kept.join('\n') + '\n');
fs.renameSync(resFile, `${resFile}.before-resend`);
const { actualUsd, actualInputTokens, ...rest } = e;
j[key] = { ...rest, manifestHash: mhNow, status: 'batch-partial', batchActualUsd: actualUsd, batchResultCount: kept.length, flexRemainder,
  rehashed: { at: now, reason, prevRev, previousManifestHash: e.manifestHash, previousConfigHash: st.configHash, configHash: chNow, previousActualUsd: actualUsd, previousResults: `${path.basename(resFile)}.before-resend`, note: 'status batch-partial is runPart\'s remainder state; the kept replies were delivered on flex (their transport field says so)' } };
for (const m of mirrors) j[m.key] = { status: 'discarded', discarded: true, ledgerName: m.name, actualUsd: m.usd, mirroredAt: now, note: 'mirror of a ledger entry the runner did not write; counted by the cap check, never by calibration' };
for (const [, x] of Object.entries(j)) if (isCapOnly(x)) Object.assign(x, { capOnly: true, capOnlyReason: CAP_ONLY[x.ledgerName] });
atomic(jf, j, 2);
st.configHash = chNow; atomic(F('state.json'), st, 2);
P.recordRemainder(F('transport.json'), { wave: k, part: i, custom_ids: ids, reason: why });
fs.appendFileSync(F('deviations.jsonl'), JSON.stringify({ at: now, kind: `${why}; state.json configHash ${report.configHash.state} -> ${chNow} and part ${key} manifestHash ${e.manifestHash} -> ${mhNow} after proving both under ${prevRev}; continuation ledger entry ${contName}` }) + '\n');
console.log(`re-hashed and re-opened ${key}`);
