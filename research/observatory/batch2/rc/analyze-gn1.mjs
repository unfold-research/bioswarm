// GN1 registered analysis (tasks/GN1-MEMORY-PREREG.md). Unit: a case of a related sequence, cases 2 and 3 (12 units),
// paired across arms on the same case. Rule (the prereg's, with an exact ONE-SIDED sign test; verdict.mjs, two-sided, is
// not used): supported if the first arm is better in more units with one-sided p < 0.05 (ties dropped); refuted if the
// second is better in more units; otherwise inconclusive. Verdicts use the raw p; the Holm-adjusted p across GN1-H2 to
// GN1-H5 is reported beside it (pHolm). GN1-H5 (H-G27) is a no-harm hypothesis with two outcomes only, tested in the
// direction "none better": refuted if `none` is better in more units with one-sided p < 0.05; otherwise inconclusive,
// which the report reads as "not refuted (no harm detected)". It is never recorded as supported (scripts/coverage.mjs
// counts any supported toward L1): if `notebook` is better in more units with p < 0.05, that is only a descriptive
// observation (h5NotebookBetterDescriptive, and a sentence in requiredStatements). Verdicts are the registry's words
// (scripts/verdicts.mjs): supported, refuted, inconclusive, and aborted for GN1-H2 when stage 0 drops the library arm. Each hypothesis carries its registry id (H-G23 to H-G27) and its prereg label (GN1-H1 to H5).
// Metrics (lower is better):
//   firstPassFailing  failing checks on the strict check after the first act wave (the start wave)
//   wavesToSolve      waves until zero failing checks; unsolved is worst (rounds + 1)
//   tokens            output tokens of the case, plus the note-writing request that fed it (notes arms)
//   holdoutFailing    failing checks of the final code on 40 fresh inputs per check (strict)
// Also: the sequence-level count (sum over cases 2 and 3), the control guard, and without a verdict: notebook against
// library, firstPassFailing by check type and by repeated against new edge, notes cut, note-writing cost, failing per
// wave, stage-0 shares against the observed gain; a per-arm table and the statements the report must carry
// (requiredStatements; the fixed ones are also bench.reportNote in the spec).
// Usage: node observatory/batch2/rc/analyze-gn1.mjs [spec.json]   (from the repository root; JSON on stdout)
import fs from 'node:fs';
import path from 'node:path';
import { check } from './code.mjs';
import { makeSequence } from './family.mjs';
import { rng } from '../ne/tasks.mjs';

// the registry's verdict words (scripts/verdicts.mjs statusOf, without pending)
export const VERDICTS = new Set(['supported', 'refuted', 'inconclusive', 'aborted']);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
// P(X >= w) for X ~ Binomial(w + l, 1/2): the exact one-sided sign test, ties dropped
export const signOneSided = (w, l) => { const n = w + l; if (!n) return 1; let p = 0; for (let i = w; i <= n; i++) p += binom(n, i); return Math.min(1, p / 2 ** n); };
// statement (2) follows the units actually run (Genome Research, 2026-11-23): the cost rule chose 5 related sequences,
// so 10 units; the preregistered 12-unit text is kept and quoted whenever the count differs from 12.
export const PREREG_PRIMARY_STATEMENT = 'With 12 units the primary hypothesis holds only with 10 or more wins (10/12 gives one-sided p = 0.019; 9/12 gives p = 0.073): a 9 to 3 split is not an effect.';
export const winsNeeded = (n) => { for (let k = 0; k <= n; k++) if (signOneSided(k, n - k) < 0.05) return k; return null; };
export function primaryStatement(n) {
  if (n === 12) return PREREG_PRIMARY_STATEMENT;
  const k = winsNeeded(n); if (k == null) return `With ${n} units no split reaches one-sided p < 0.05. Statement as preregistered: "${PREREG_PRIMARY_STATEMENT}"`;
  return `Under the cost rule the sample was ${n / 2} related sequences, so ${n} primary units: the primary holds only with ${k} or more wins (${k}/${n} gives one-sided p = ${signOneSided(k, n - k).toFixed(3)}; ${k - 1}/${n} gives p = ${signOneSided(k - 1, n - k + 1).toFixed(3)}); ${k - 1} to ${n - k + 1} is not an effect. Statement as preregistered: "${PREREG_PRIMARY_STATEMENT}"`;
}
const primaryReading = (n) => { const k = winsNeeded(n); return k == null ? `with ${n} units no split reaches p < 0.05` : `with ${n} units the primary holds only with ${k} or more wins (${k}/${n} one-sided p = ${signOneSided(k, n - k).toFixed(3)}; ${k - 1}/${n} p = ${signOneSided(k - 1, n - k + 1).toFixed(3)}, not an effect)`; };
export function compare(pairs, noHarm = false) {
  let w = 0, l = 0; for (const [x, y] of pairs) { if (x == null || y == null) continue; if (x < y) w++; else if (y < x) l++; }
  const p = signOneSided(w, l), pRev = signOneSided(l, w);
  // no harm: refuted or inconclusive only; a significant gain for a is descriptive (aBetterDescriptive), never supported
  const verdict = noHarm ? (l > w && pRev < 0.05 ? 'refuted' : 'inconclusive') : w > l && p < 0.05 ? 'supported' : l > w ? 'refuted' : 'inconclusive';
  // p: the registered direction (a better; for a no-harm hypothesis, b better); the other direction is pAgainst
  return { aBetter: w, bBetter: l, ties: pairs.length - w - l, p: noHarm ? pRev : p, pAgainst: noHarm ? p : pRev, ...(noHarm ? { direction: 'b better (harm)', aBetterDescriptive: w > l && p < 0.05 } : {}), verdict };
}
export const holm = (rows) => { const s = rows.filter((r) => r.p != null).sort((a, b) => a.p - b.p); s.forEach((r, i) => { r.pHolm = Math.min(1, Math.max(...s.slice(0, i + 1).map((x, j) => x.p * (s.length - j)))); }); return rows; };
const median = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const word = (r, lo, hi) => Array.from({ length: int(r, lo, hi) }, () => String.fromCharCode(97 + int(r, 0, 25))).join('');
// the final code on 40 fresh inputs per check (as holdout.mjs), strict
export function holdoutFailing(inst, code, key) {
  const r = rng(`holdout:gn1:${key}`);
  for (const c of inst.checks) c.inputs = c.kind === 'symmetric' ? Array.from({ length: 40 }, () => Object.fromEntries(Object.entries(c.inputs[0]).map(([n, v]) => [n, typeof v === 'number' ? int(r, 0, 999) : typeof v === 'boolean' ? r() < 0.5 : Array.isArray(v) ? Array.from({ length: int(r, 0, 3) }, () => word(r, 2, 6)) : word(r, 3, 8)]))) : Array.from({ length: 40 }, () => { const w = word(r, 4, 9); return r() < 0.5 ? w : w.replace(/(.)(.)/, (_, a) => a + a); });
  return check(inst, code, { strict: true }).length;
}

// GN1-H5 (no harm): how the report reads its verdict, and the descriptive observation when notebook did better
export const h5Statement = (h) => !h ? 'GN1-H5 was not analysed.' : `GN1-H5 (${h.id}, no harm on fresh inputs): recorded ${h.verdict}, read as "${h.reading}"; it is never recorded as supported.${h.h5NotebookBetterDescriptive ? ` Descriptive observation only (not a verdict): notebook had fewer hold-out failures than none in ${h.aBetter} units against ${h.bBetter} (one-sided p = ${h.pAgainst.toFixed(3)}).` : ''}`;
// implementation choices fixed before the data (Genome Research, 2026-11-23); the report lists them
export const IMPLEMENTATION_CHOICES = 'Implementation choices fixed before the data, 2026-11-23: (a) a member\'s note-writing request lists at most the last 40 failing checks it saw during the case, the same in every arm, and the number left out is recorded per member; (b) the note-writing request after case 2 shows the member the case-1 notes of its arm in the same block as its other requests (notebook: its own notes; library: the lines about its module, cut at 300 tokens); (c) the cost rule compares the study\'s projection without the pilot with US$ 7.4, and also cuts back (2 control sequences, then 5 related) while that projection exceeds US$ 8 minus the pilot\'s actual spend, because the US$ 8 cap includes the pilot (no extra margin); the projection and the choice are written to results/gn1/plan.json with a timestamp before the first study wave; (d) the study cap against full reservations: each batch (part of a wave) reserves at most min(US$ 0.5, US$ 8 minus committed), where committed is the spend so far with the pilot and unreconciled batches at their full reservation, down to a single request; when not even one request fits with nothing in flight, the study stops with a final exit and the numbers in results/gn1/cap-stop.json, so no unit is dropped silently.';
export function analyse(spec, records, { stage0 = null, plan = null, holdout = true } = {}) {
  const live = records.filter((x) => !x.dropped), worst = spec.rounds + 1, fams = new Map();
  const inst = (x) => { const key = `${x.type}${x.seq}`; if (!fams.has(key)) fams.set(key, makeSequence(x.seq, { type: x.type, cases: spec.sequences.cases, k: spec.k, shape: spec.shape, f: spec.f })); return fams.get(key)[x.case - 1]; };
  const metric = (x) => ({ firstPassFailing: x.firstPassFailing, wavesToSolve: x.solved ? x.wavesToSolve : worst, tokens: x.tokens + (x.noteWriteOutTokens || 0),
    // the same fresh inputs for every arm of a case (key without the arm, as holdout.mjs), so the pairs compare like with like
    holdoutFailing: holdout && x.finalCode ? holdoutFailing(inst(x), x.finalCode, `${x.type}${x.seq}:c${x.case}`) : null, firstPass: x.firstPass, solved: x.solved });
  // every record must be scored on the instance it ran on
  for (const x of live) if (x.instHash && inst(x).hash !== x.instHash) throw Error(`record ${x.arm}-c${x.case}-s${x.seq}: instance hash ${x.instHash} differs from the regenerated ${inst(x).hash}`);
  const units = new Map(); // `${type}${seq}:c${case}` -> { arm: metrics }
  for (const x of live) { if (x.case < 2) continue; const k = `${x.type}${x.seq}:c${x.case}`; if (!units.has(k)) units.set(k, { type: x.type, seq: x.seq, case: x.case, arm: {} }); units.get(k).arm[x.arm] = metric(x); }
  const rel = [...units.values()].filter((u) => u.type === 'related'), ctl = [...units.values()].filter((u) => u.type === 'control');
  const pairs = (us, a, b, m) => us.filter((u) => u.arm[a] && u.arm[b]).map((u) => [u.arm[a][m], u.arm[b][m]]);
  const bySeq = (us, a, b, m) => { const g = new Map(); for (const u of us) { if (!u.arm[a] || !u.arm[b]) continue; const s = g.get(u.seq) || [0, 0]; s[0] += u.arm[a][m]; s[1] += u.arm[b][m]; g.set(u.seq, s); } return [...g.values()]; };
  const libraryRun = rel.some((u) => u.arm.library);
  const hyps = spec.hypotheses.map((h) => {
    if (h.a === 'library' && !libraryRun) return { ...h, verdict: 'aborted', p: null, note: 'library arm dropped at stage 0: not run' };
    const c = compare(pairs(rel, h.a, h.b, h.metric), !!h.noHarm), sq = compare(bySeq(rel, h.a, h.b, h.metric), !!h.noHarm);
    const out = { ...h, units: c.aBetter + c.bBetter + c.ties, ...c, sequenceLevel: { aBetter: sq.aBetter, bBetter: sq.bBetter, ties: sq.ties, p: sq.p } };
    if (h.noHarm) { delete out.aBetterDescriptive; out.reading = c.verdict === 'refuted' ? 'refuted (harm on fresh inputs)' : 'not refuted (no harm detected)'; out.h5NotebookBetterDescriptive = c.aBetterDescriptive; }
    return out;
  });
  holm(hyps.filter((h) => !h.primary)); // Holm across the secondaries only
  // control guard: notebook must not raise median firstPassFailing by more than 10% over none, nor median wavesToSolve by more than 1
  const cu = ctl.filter((u) => u.arm.notebook && u.arm.none), med = (a, m) => median(cu.map((u) => u.arm[a][m]));
  const guard = { units: cu.length, weak: cu.length < 6, firstPass: { notebook: med('notebook', 'firstPassFailing'), none: med('none', 'firstPassFailing') }, waves: { notebook: med('notebook', 'wavesToSolve'), none: med('none', 'wavesToSolve') } };
  guard.holds = cu.length ? guard.firstPass.notebook <= guard.firstPass.none * (1 + spec.guard.maxFirstPassRise) && guard.waves.notebook <= guard.waves.none + spec.guard.maxWavesRise : null;
  if (guard.holds === false) guard.note = 'notes hurt on unrelated work';
  const breakdown = Object.fromEntries(spec.arms.map((a) => { const xs = rel.filter((u) => u.arm[a]).map((u) => u.arm[a].firstPass), keys = xs.length ? Object.keys(xs[0]) : []; return [a, Object.fromEntries(keys.map((k) => [k, xs.reduce((n, x) => n + x[k], 0)]))]; }));
  const notes = Object.fromEntries(spec.arms.filter((a) => a !== 'none').map((a) => { const xs = live.filter((x) => x.arm === a && x.notesRead); return [a, { feeds: xs.length, writeCut: xs.reduce((n, x) => n + x.notesRead.writeCut, 0), readCut: xs.reduce((n, x) => n + x.notesRead.readCut, 0), written: xs.reduce((n, x) => n + x.notesRead.written, 0), noteWritingUsd: +xs.reduce((n, x) => n + x.notesRead.writeUsage.usd, 0).toFixed(4), noteWritingOutTokens: xs.reduce((n, x) => n + x.notesRead.writeUsage.outSum, 0) }]; }));
  const perWave = Object.fromEntries(spec.arms.map((a) => [a, live.filter((x) => x.arm === a && x.type === 'related' && x.case >= 2).map((x) => ({ seq: x.seq, case: x.case, failing: x.history.map((h) => h.counts.total) }))]));
  const gain = (a) => { const ps = pairs(rel, a, 'none', 'firstPassFailing'), base = ps.reduce((n, [, y]) => n + y, 0); return base ? ps.reduce((n, [x, y]) => n + (y - x), 0) / base : null; };
  for (const h of hyps) if (!VERDICTS.has(h.verdict)) throw Error(`${h.id}: verdict ${h.verdict} is not a registry verdict`);
  const primary = hyps.find((h) => h.primary);
  // reported without a verdict (prereg): notebook against library on every measure, case level and sequence level
  const METRICS = ['firstPassFailing', 'wavesToSolve', 'tokens', 'holdoutFailing'];
  const notebookVsLibrary = libraryRun ? Object.fromEntries(METRICS.map((m) => { const c = compare(pairs(rel, 'notebook', 'library', m)), sq = compare(bySeq(rel, 'notebook', 'library', m));
    return [m, { notebookBetter: c.aBetter, libraryBetter: c.bBetter, ties: c.ties, p: c.p, sequenceLevel: { notebookBetter: sq.aBetter, libraryBetter: sq.bBetter, ties: sq.ties, p: sq.p } }]; })) : null;
  // per arm on the related units (the report's results table)
  const perArm = Object.fromEntries(spec.arms.map((a) => { const us = rel.filter((u) => u.arm[a]); return [a, { units: us.length, solved: us.filter((u) => u.arm[a].solved).length,
    ...Object.fromEntries(METRICS.map((m) => [m, { median: median(us.map((u) => u.arm[a][m])), sum: us.some((u) => u.arm[a][m] == null) ? null : us.reduce((n, u) => n + u.arm[a][m], 0) }])) }]; }));
  // statements the report must carry (Genome Research, approval of the prereg, 2026-11-22)
  const requiredStatements = [
    `The prereg's cost estimate (about US$ 7.9 to 8.6 with the pilot) is above the US$ 7.4 trigger, so the cost rule was expected to cut the study to 2 control sequences. Sample used: ${plan?.sample ?? 'unknown (no plan.json)'}; the control guard had ${guard.units} units${guard.weak ? ' and is therefore weak' : ''}.`,
    primaryStatement(primary?.units ?? rel.length),
    IMPLEMENTATION_CHOICES,
    h5Statement(hyps.find((h) => h.noHarm)),
  ];
  return { id: 'GN1', units: rel.length, controlUnits: ctl.length, dropped: records.length - live.length, plan: plan ? { sample: plan.sample, libraryDropped: plan.libraryDropped, steps: plan.steps } : null,
    hypotheses: hyps, h5NotebookBetterDescriptive: !!hyps.find((h) => h.noHarm)?.h5NotebookBetterDescriptive, perArm, guard, notebookVsLibrary, firstPassBreakdown: breakdown, notes, failingPerWave: perWave,
    stage0VsObserved: stage0 ? { notebookShare: stage0.notebook.share, libraryShare: stage0.library.share, observedGain: { notebook: gain('notebook'), library: gain('library') } } : null,
    reading: { primaryWinsNeeded: winsNeeded(primary?.units ?? rel.length), note: primaryReading(primary?.units ?? rel.length), guardWeak: guard.weak ? `the guard has ${guard.units} units: weak` : null },
    requiredStatements };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2] || 'observatory/batch2/gn1/bench.json', spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const dir = spec.episodes, records = fs.readdirSync(dir).filter((f) => /-s\d+\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const rj = (f) => { try { return JSON.parse(fs.readFileSync(path.join(spec.out, f), 'utf8')); } catch { return null; } };
  console.log(JSON.stringify(analyse(spec, records, { stage0: rj('stage0.json'), plan: rj('plan.json') }), null, 1));
}
