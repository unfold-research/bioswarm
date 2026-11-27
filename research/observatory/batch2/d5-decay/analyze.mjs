// D5 analysis: three decay rates on the same 150 collections with real readers, paired by collection, against the
// simulation with exact readers on the same collections and on 3,000 others.
// Usage: node observatory/batch2/d5-decay/analyze.mjs   -> results/batch2-d5-decay/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from './protocol.mjs';
import { makeCorpus } from '../r1-regimes/protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), dir = (l) => path.join(ROOT, `results/batch2-d5-decay-l${l}`), h = P.HORIZONS.short;
const ARMS = [[100, 1], [50, 0.5], [0, 0]], seeds = P.range(61001, 150), scored = Object.fromEntries(ARMS.map(([t]) => [t, JSON.parse(fs.readFileSync(path.join(dir(t), 'wave-0.scored.json'), 'utf8'))]));
const usd = (t) => fs.readFileSync(path.join(dir(t), 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
const deps = (t, seed, cond) => scored[t].filter((x) => x.seed === seed && (x.cond === null || x.cond === cond) && x.valid);
// outcome of the reads of arm `t` combined with estimate weights `lambdaEst`: 1 right, 0 wrong, 0.5 on a tie when half credit is asked
const outcome = (t, lambdaEst, seed, cond, half) => { const c = makeCorpus(seed), e = P.estimate(c, lambdaEst, h, deps(t, seed, cond)); return e === c.answer[cond] ? 1 : e === null && half ? 0.5 : 0; };
const rows = seeds.map((seed) => { const r = { seed }; for (const [t, l] of ARMS) { r[`e${t}`] = outcome(t, l, seed, 1, false); r[`s${t}`] = outcome(t, l, seed, 0, false); r[`eh${t}`] = outcome(t, l, seed, 1, true); r[`tie${t}`] = P.estimate(makeCorpus(seed), l, h, deps(t, seed, 1)) === null ? 1 : 0; }
  r.reads100est50 = outcome(100, 0.5, seed, 1, false); r.reads50est100 = outcome(50, 1, seed, 1, false); r.reads100est0 = outcome(100, 0, seed, 1, false); r.reads0est100 = outcome(0, 1, seed, 1, false); return r; });
const mean = (k) => rows.reduce((n, x) => n + x[k], 0) / rows.length, d = (a, b, s) => bootDiff(rows, a, b, s);
const simStudy = P.simulate(seeds, h), simBig = P.simulate(P.range(960001, 3000), h), exactDiff = seeds.reduce((n, s) => n + P.exact(s, 0.5, h, 1).correct - P.exact(s, 1, h, 1).correct, 0) / seeds.length;
const out = { collections: seeds.length,
  table: ARMS.map(([t, l]) => ({ lambda: l, edited: mean(`e${t}`), stable: mean(`s${t}`), editedHalfCreditForTies: mean(`eh${t}`), tiesEdited: mean(`tie${t}`), simulatedOnTheseCollections: simStudy[l], simulatedOn3000: simBig[l], readsExact: scored[t].filter((x) => x.exact).length / scored[t].length, invalid: scored[t].filter((x) => !x.valid).length, usd: usd(t) })),
  diffs: { l50MinusL100_edited: d('e50', 'e100', 20261501), l0MinusL100_edited: d('e0', 'e100', 20261502), l0MinusL100_stable: d('s0', 's100', 20261503), l0MinusL50_edited: d('e0', 'e50', 20261504), l50MinusL100_edited_halfCredit: d('eh50', 'eh100', 20261505), l0MinusL100_edited_halfCredit: d('eh0', 'eh100', 20261506) },
  decomposition: { note: 'edited condition; reads of one arm re-estimated with the weights of another', readsNoDecay_weightsNoDecay: mean('e100'), readsNoDecay_weightsDecay: mean('reads100est50'), readsDecay_weightsNoDecay: mean('reads50est100'), readsDecay_weightsDecay: mean('e50'), readsNoDecay_weightsLatestOnly: mean('reads100est0'), readsLatestOnly_weightsNoDecay: mean('reads0est100'),
    weightingAlone: d('reads100est50', 'e100', 20261507), marksAlone: d('reads50est100', 'e100', 20261508) },
  simulatedDiffOnTheseCollections: exactDiff };
out.tests = { P1: verdictOf(out.diffs.l50MinusL100_edited), P2: verdictOf(out.diffs.l0MinusL100_edited), P3: out.diffs.l0MinusL100_stable.ci95[1] < 0 ? 'supported' : out.diffs.l0MinusL100_stable.ci95[0] > 0 ? 'refuted' : 'not supported', P4: out.diffs.l50MinusL100_edited.diff < 0.37 ? 'supported' : 'not supported' };
fs.mkdirSync(path.join(ROOT, 'results/batch2-d5-decay'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-d5-decay/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
