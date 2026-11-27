// LI10 verdicts (tasks/LI10-SCALE-BIO-VS-MARKET-PREREG.md), from results/li10-scale-k{40,80}/strict/analysis.json.
import fs from 'node:fs';
const S = { 40: JSON.parse(fs.readFileSync('results/li10-scale-k40/strict/analysis.json', 'utf8')), 80: JSON.parse(fs.readFileSync('results/li10-scale-k80/strict/analysis.json', 'utf8')) };
const A = Object.values(S), sum = (f) => A.reduce((n, a) => n + f(a), 0);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const mcnemar = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const solved = (arm) => sum((a) => a.arms[arm].solved), outTotal = (arm) => sum((a) => a.arms[arm].meanOut * a.arms[arm].of);
const vs = (b) => { const w = sum((a) => a.signTests[`routed_vs_${b}`].lowerIn), l = sum((a) => a.signTests[`routed_vs_${b}`].higherIn), p = mcnemar(w, l), r = solved('routed'), o = solved(b);
  return { routed: r, [b]: o, lowerIn: w, higherIn: l, p, verdict: r >= o + 4 && w > l && p < 0.05 ? 'supported' : r <= o ? 'refuted' : 'inconclusive' }; };
const perSolved = (arm) => (solved(arm) ? Math.round(outTotal(arm) / solved(arm)) : Infinity);
const soloK80 = S[80].arms.solo.solved;
console.log(JSON.stringify({ solvedBySize: Object.fromEntries(Object.entries(S).map(([k, a]) => [k, Object.fromEntries(Object.entries(a.arms).map(([n, v]) => [n, v.solved]))])),
  'H-LI28 routed vs manager': vs('manager'), 'H-LI29 routed vs chat': vs('chat'),
  'H-LI30 the task needs a team': { soloSolvedAt80: soloK80, verdict: soloK80 <= 4 ? 'supported' : soloK80 >= 6 ? 'refuted' : 'inconclusive' },
  'H-LI31 cost per solved case': { routed: perSolved('routed'), manager: perSolved('manager'), chat: perSolved('chat'), verdict: perSolved('routed') < perSolved('manager') && perSolved('routed') < perSolved('chat') ? 'supported' : 'refuted' } }, null, 2));
