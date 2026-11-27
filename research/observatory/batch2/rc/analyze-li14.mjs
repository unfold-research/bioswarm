// LI14 verdicts (tasks/LI14-CLONAL-PREREG.md), from results/li14-clonal-k{40,80}/analysis.json.
import fs from 'node:fs';
const K = [40, 80], S = Object.fromEntries(K.map((k) => [k, JSON.parse(fs.readFileSync(`results/li14-clonal-k${k}/analysis.json`, 'utf8'))]));
const sum = (f) => Object.values(S).reduce((n, a) => n + f(a), 0);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const sign = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const sg = (a, b) => { const w = sum((x) => x.signTests[`${a}_vs_${b}`].lowerIn), l = sum((x) => x.signTests[`${a}_vs_${b}`].higherIn); return { lowerIn: w, higherIn: l, p: sign(w, l) }; };
const solved = (arm) => sum((a) => a.arms[arm].solved), out = (arm) => sum((a) => a.arms[arm].meanOut * a.arms[arm].of), per = (arm) => (solved(arm) ? Math.round(out(arm) / solved(arm)) : 'inf');
const cs = sg('clonal', 'stig'), cm = sg('clonal', 'manager');
console.log(JSON.stringify({ solved: { clonal: solved('clonal'), stig: solved('stig'), manager: solved('manager') }, outPerSolved: { clonal: per('clonal'), stig: per('stig'), manager: per('manager') },
  'H-LI44 (primary) clonal selection beats agent-written stigmergy alone': { ...cs, verdict: solved('clonal') >= solved('stig') + 3 && cs.lowerIn > cs.higherIn && cs.p < 0.05 ? 'supported' : solved('clonal') <= solved('stig') ? 'refuted' : 'inconclusive' },
  'H-LI45 clonal selection ends below the manager': { ...cm, verdict: cm.lowerIn > cm.higherIn && cm.p < 0.05 ? 'supported' : cm.higherIn > cm.lowerIn ? 'refuted' : 'inconclusive' },
  'H-LI46 clonal selection costs less per solved case than the manager': { verdict: per('clonal') !== 'inf' && (per('manager') === 'inf' || per('clonal') < per('manager')) ? 'supported' : 'refuted' } }, null, 2));
