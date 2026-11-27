// LI analysis (tasks/LI1-LATERAL-INHIBITION-PREREG.md). Written before results were read.
// Usage: node observatory/batch2/ne/analyze-li.mjs results/<out> > results/<out>/analysis.json
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2], st = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
const arms = Object.keys(st.arms), keys = Object.keys(st.arms[arms[0]] || {}), sizeOf = (k) => Number(k.match(/^n(\d+)/)[1]);
const sizes = [...new Set(keys.map(sizeOf))].sort((a, b) => a - b);
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };
const mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null);
// exact two-sided McNemar (binomial on discordant pairs)
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const mcnemar = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };

const per = (arm, k) => { const s = st.arms[arm]?.[k]; if (!s) return null; const h = s.history;
  return { solved: s.solved, final: h.at(-1).conflicts, out: h.reduce((n, x) => n + x.outSum, 0), inp: h.reduce((n, x) => n + x.inSum, 0), usd: h.reduce((n, x) => n + x.usd, 0), latency: h.reduce((n, x) => n + x.outMax, 0), calls: h.reduce((n, x) => n + x.actors, 0), trunc: h.reduce((n, x) => n + x.trunc, 0), roundsUsed: h.filter((x) => x.actors > 0).length, traj: h.map((x) => x.conflicts) }; };

const table = Object.fromEntries(arms.map((a) => { const rows = keys.map((k) => per(a, k)).filter(Boolean);
  const bySize = Object.fromEntries(sizes.map((n) => { const r = keys.filter((k) => sizeOf(k) === n).map((k) => per(a, k)).filter(Boolean); return [n, { solved: r.filter((x) => x.solved).length, of: r.length, medianFinal: median(r.map((x) => x.final)), meanOut: Math.round(mean(r.map((x) => x.out))), meanUsd: +mean(r.map((x) => x.usd)).toFixed(5), meanLatency: Math.round(mean(r.map((x) => x.latency))), meanCalls: +mean(r.map((x) => x.calls)).toFixed(1) }]; }));
  const maxLen = Math.max(...rows.map((x) => x.traj.length)); const traj = Array.from({ length: maxLen }, (_, i) => +mean(rows.map((x) => x.traj[Math.min(i, x.traj.length - 1)])).toFixed(2));
  return [a, { solved: rows.filter((x) => x.solved).length, of: rows.length, medianFinal: median(rows.map((x) => x.final)), meanOut: Math.round(mean(rows.map((x) => x.out))), meanUsd: +mean(rows.map((x) => x.usd)).toFixed(5), meanLatency: Math.round(mean(rows.map((x) => x.latency))), trunc: rows.reduce((n, x) => n + x.trunc, 0), meanTrajectory: traj, bySize }]; }));

const paired = (a, b) => { let aOnly = 0, bOnly = 0, both = 0, neither = 0, lower = 0, higher = 0; for (const k of keys) { const x = per(a, k), y = per(b, k); if (!x || !y) continue; if (x.solved && y.solved) both++; else if (x.solved) aOnly++; else if (y.solved) bOnly++; else neither++; if (x.final < y.final) lower++; else if (x.final > y.final) higher++; } return { [`${a}Only`]: aOnly, [`${b}Only`]: bOnly, both, neither, mcnemarP: +mcnemar(aOnly, bOnly).toFixed(4), finalLowerIn: lower, finalHigherIn: higher }; };

const T = table, verdict = {};
// Correction 2026-11-17 (after the independent methodology review, docs/reviews/LI-REVIEW-2026-11-17.md): the LI1 rules
// below are applied only to LI1 (study id from the folder name); LI2/LI3 rules are added under their own names, and every
// study also gets sign tests on paired final conflicts, since no swarm arm solved a case.
const study = path.basename(path.resolve(dir));
const signP = (w, l) => mcnemar(w, l);
const finalPairs = (a, b, f = () => true) => { let w = 0, l = 0; for (const k of keys.filter(f)) { const x = per(a, k), y = per(b, k); if (!x || !y) continue; if (x.final < y.final) w++; else if (x.final > y.final) l++; } return { wins: w, losses: l, signP: +signP(w, l).toFixed(6) }; };
const finals = {}; for (const [a, b] of [['inhibit', 'sync'], ['inhibit', 'random'], ['random', 'sync'], ['inhibit', 'chat'], ['chat', 'sync'], ['patch', 'inhibit'], ['chatinhibit', 'chat'], ['chatinhibit', 'inhibit'], ['ask', 'chat'], ['ask', 'inhibit'], ['patch2', 'patch'], ['patch', 'central'], ['patch2', 'central'], ['solo', 'central']]) if (T[a] && T[b]) finals[`${a}_vs_${b}`] = finalPairs(a, b);
const big = Math.max(...sizes); for (const a of arms.filter((x) => x !== 'central')) if (T.central) finals[`${a}_vs_central_at_${big}`] = finalPairs(a, 'central', (k) => sizeOf(k) === big);
if (study.startsWith('li1')) {
if (T.inhibit && T.sync) { const d = T.inhibit.solved - T.sync.solved; verdict['H-LI1'] = d >= 6 && T.inhibit.medianFinal <= T.sync.medianFinal ? 'supported' : d <= 0 ? 'refuted' : 'inconclusive'; }
if (T.inhibit && T.random) { const d = T.inhibit.solved - T.random.solved; verdict['H-LI2'] = d >= 4 ? 'supported' : d <= 0 ? 'refuted' : 'inconclusive'; }
if (T.central && (T.inhibit || T.patch) && sizes.includes(240)) { const c = T.central.bySize[240]; const best = ['inhibit', 'patch'].filter((a) => T[a]).map((a) => ({ a, ...T[a].bySize[240] })).sort((x, y) => y.solved - x.solved || x.meanOut - y.meanOut)[0];
  verdict['H-LI3'] = best.solved > c.solved && best.meanOut <= 1.5 * c.meanOut ? `supported (${best.a})` : best.solved <= c.solved ? 'refuted' : `inconclusive (${best.a} solves more but costs ${(best.meanOut / c.meanOut).toFixed(2)}x)`; }
if (T.patch && T.inhibit) verdict['H-LI4'] = T.patch.solved >= T.inhibit.solved && T.patch.meanOut < T.inhibit.meanOut ? 'supported' : T.patch.solved < T.inhibit.solved ? 'refuted' : 'inconclusive';
}
if ((study.startsWith('li2') || study.startsWith('li3')) && T.inhibit && T.chat) { const tag = study.startsWith('li3') ? 'H-LI5b' : 'H-LI5'; verdict[tag] = T.inhibit.solved >= T.chat.solved && T.inhibit.meanOut <= 0.8 * T.chat.meanOut ? (T.inhibit.solved + T.chat.solved === 0 ? 'supported on the registered rule, degenerate (0 solved in both)' : 'supported') : T.chat.solved >= T.inhibit.solved + 4 ? 'refuted' : 'inconclusive'; }
if (study.startsWith('li2')) { const a = T.inhibit.solved - T.sync.solved, b = T.inhibit.solved - T.random.solved; verdict['H-LI6'] = a >= 4 && b >= 3 ? 'supported' : a <= 0 || b <= 0 ? 'refuted' : 'inconclusive';
  const best = Math.max(T.inhibit.solved, T.patch?.solved ?? 0); verdict['H-LI7'] = best > T.central.solved ? 'supported' : 'refuted'; }
if (study.startsWith('li4')) { const s = Math.max(T.patch.solved, T.patch2.solved); verdict['H-LI8'] = s >= 8 ? 'supported' : s <= 2 ? 'refuted' : 'inconclusive'; const f = finals[`patch_vs_central_at_${big}`]; verdict['H-LI9'] = f.wins >= 9 ? 'supported' : f.wins <= 6 ? 'refuted' : 'inconclusive'; verdict['H-LI10'] = T.patch2.solved > T.patch.solved ? 'supported' : 'refuted'; }
if (study.startsWith('li5')) { const f = finals; verdict['H-LI11'] = f.chat_vs_sync.wins >= 16 ? 'supported' : f.chat_vs_sync.wins <= 12 ? 'refuted' : 'inconclusive';
  const a = f.chatinhibit_vs_chat.wins, b = f.chatinhibit_vs_inhibit.wins; verdict['H-LI12'] = a >= 15 && b >= 15 ? 'supported' : a <= 12 || b <= 12 ? 'refuted' : 'inconclusive';
  const atOrBelow = keys.filter((k) => per('ask', k).final <= per('chat', k).final).length, below = f.ask_vs_chat.wins, ratio = T.ask.meanOut / T.chat.meanOut;
  verdict['H-LI13'] = below <= 8 || ratio > 1 ? `refuted (below in ${below}, at or below in ${atOrBelow}, tokens ${ratio.toFixed(2)}x)` : atOrBelow >= 12 && ratio <= 0.75 ? `supported (at or below in ${atOrBelow}, tokens ${ratio.toFixed(2)}x)` : `inconclusive (at or below in ${atOrBelow}, tokens ${ratio.toFixed(2)}x)`; }

console.log(JSON.stringify({ arms: table, paired: { inhibit_vs_sync: paired('inhibit', 'sync'), inhibit_vs_random: paired('inhibit', 'random'), inhibit_vs_central: paired('inhibit', 'central'), patch_vs_central: paired('patch', 'central'), patch_vs_inhibit: paired('patch', 'inhibit') }, finals, verdict }, null, 2));
