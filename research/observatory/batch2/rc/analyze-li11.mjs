// LI11 verdicts (tasks/LI11-MECHANISMS-PREREG.md), from results/li11-mechanisms-k{40,80}/strict/analysis.json and state.json.
import fs from 'node:fs';
const K = [40, 80], S = Object.fromEntries(K.map((k) => [k, JSON.parse(fs.readFileSync(`results/li11-mechanisms-k${k}/strict/analysis.json`, 'utf8'))]));
const ST = Object.fromEntries(K.map((k) => [k, JSON.parse(fs.readFileSync(`results/li11-mechanisms-k${k}/state.json`, 'utf8'))]));
const A = Object.values(S), sum = (f) => A.reduce((n, a) => n + f(a), 0);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const mcnemar = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const solved = (arm) => sum((a) => a.arms[arm].solved), outTotal = (arm) => sum((a) => a.arms[arm].meanOut * a.arms[arm].of);
const perSolved = (arm) => (solved(arm) ? Math.round(outTotal(arm) / solved(arm)) : Infinity);
// symmetric edges that ever failed in an arm, and how many still fail at the end (strict = registered for symmetric edges)
const symLeft = (arm) => { let ever = 0, left = 0; for (const k of K) for (const s of Object.values(ST[k].arms[arm])) { const e = new Set(s.history.flatMap((h) => h.failing.filter((x) => x.startsWith('S:')))); ever += e.size; left += s.history.at(-1).failing.filter((x) => x.startsWith('S:')).length; } return { ever, left, share: ever ? +(left / ever).toFixed(3) : 0 }; };
const waves = (arm) => Object.fromEntries(K.flatMap((k) => Object.entries(ST[k].arms[arm]).map(([c, s]) => [`${k}:${c}`, s.solved ? s.history.find((h) => h.counts.total === 0)?.wave ?? null : null])));
const t = symLeft('threshold');
const d = sum((a) => a.edgeTests.pheromone_vs_routed_directed.pheromoneOnly), r = sum((a) => a.edgeTests.pheromone_vs_routed_directed.routedOnly), pd = mcnemar(d, r);
const dirLeft = (arm) => sum((a) => a.arms[arm].finalByKind.directed);
const w = sum((a) => a.signTests.pheromone_vs_manager.lowerIn), l = sum((a) => a.signTests.pheromone_vs_manager.higherIn);
const wp = waves('pheromone'), wm = waves('manager'); let fw = 0, sw = 0; for (const c of Object.keys(wp)) { const x = wp[c] ?? Infinity, y = wm[c] ?? Infinity; if (x < y) fw++; else if (x > y) sw++; }
const allSolved = solved('pheromone') === 16 && solved('manager') === 16;
const h34 = allSolved ? (fw > sw && mcnemar(fw, sw) < 0.05 ? 'supported' : sw > fw ? 'refuted' : 'inconclusive') : (w > l && mcnemar(w, l) < 0.05 ? 'supported' : l > w ? 'refuted' : 'inconclusive');
console.log(JSON.stringify({ solvedBySize: Object.fromEntries(K.map((k) => [k, Object.fromEntries(Object.entries(S[k].arms).map(([n, v]) => [n, v.solved]))])),
  'H-LI32 noise breaks symmetry': { ...t, verdict: t.share <= 0.10 ? 'supported' : t.share > 0.25 ? 'refuted' : 'inconclusive' },
  'H-LI33 field replaces messages': { pheromoneOnly: d, routedOnly: r, p: pd, strictDirectedLeft: { pheromone: dirLeft('pheromone'), routed: dirLeft('routed') }, verdict: r > d && pd < 0.05 ? 'refuted' : dirLeft('pheromone') < dirLeft('routed') ? 'supported' : 'inconclusive' },
  'H-LI34 pheromone vs manager': { finalLowerIn: w, finalHigherIn: l, fasterIn: fw, slowerIn: sw, verdict: h34 },
  'H-LI35 cost per solved case': { pheromone: perSolved('pheromone'), routed: perSolved('routed'), manager: perSolved('manager'), threshold: perSolved('threshold'), verdict: perSolved('pheromone') < perSolved('routed') && perSolved('pheromone') < perSolved('manager') ? 'supported' : 'refuted' },
  wavesToSolve: { pheromone: wp, manager: wm, routed: waves('routed'), threshold: waves('threshold') } }, null, 2));
