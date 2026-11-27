// LI9 verdicts (tasks/LI9-ORCHESTRATION-PREREG.md), from results/li9-orchestration-k{5,12}/strict/analysis.json.
import fs from 'node:fs';
const A = [5, 12].map((k) => JSON.parse(fs.readFileSync(`results/li9-orchestration-k${k}/strict/analysis.json`, 'utf8')));
const sum = (f) => A.reduce((n, a) => n + f(a), 0);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const mcnemar = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const solved = (arm) => sum((a) => a.arms[arm].solved), out = (arm) => sum((a) => a.arms[arm].meanOut * a.arms[arm].of) / sum((a) => a.arms[arm].of);
const w = sum((a) => a.signTests.routed_vs_manager.lowerIn), l = sum((a) => a.signTests.routed_vs_manager.higherIn), p = mcnemar(w, l);
const r = solved('routed'), m = solved('manager'), c = solved('chat');
console.log(JSON.stringify({ solved: { routed: r, manager: m, chat: c }, outPerCase: { routed: Math.round(out('routed')), manager: Math.round(out('manager')), chat: Math.round(out('chat')) }, routedVsManagerFinal: { lowerIn: w, higherIn: l, p },
  verdict: { 'H-LI25 router beats manager': r >= m + 4 && w > l && p < 0.05 ? 'supported' : r <= m ? 'refuted' : 'inconclusive', 'H-LI26 router cheaper than manager': out('routed') < out('manager') ? 'supported' : 'refuted', 'H-LI27 manager beats chat': m > c ? 'supported' : 'refuted' } }, null, 2));
