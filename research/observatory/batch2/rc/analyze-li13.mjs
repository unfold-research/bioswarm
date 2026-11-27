// LI13 verdicts (tasks/LI13-MEMBER-LOSS-PREREG.md), from results/li13-member-loss-k{40,80}/analysis.json and, for the paired
// no-loss reference on the same instances, results/li12-polarity-trace-k{40,80}/state.json.
import fs from 'node:fs';
const K = [40, 80], J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const S = Object.fromEntries(K.map((k) => [k, J(`results/li13-member-loss-k${k}/analysis.json`)])), L = Object.fromEntries(K.map((k) => [k, J(`results/li13-member-loss-k${k}/state.json`)])), R = Object.fromEntries(K.map((k) => [k, J(`results/li12-polarity-trace-k${k}/state.json`)]));
const sum = (f) => Object.values(S).reduce((n, a) => n + f(a), 0);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const sign = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const sg = (a, b) => { const w = sum((x) => x.signTests[`${a}_vs_${b}`]?.lowerIn ?? x.signTests[`${b}_vs_${a}`].higherIn), l = sum((x) => x.signTests[`${a}_vs_${b}`]?.higherIn ?? x.signTests[`${b}_vs_${a}`].lowerIn); return { lowerIn: w, higherIn: l, p: sign(w, l) }; };
const verdict = (t) => (t.lowerIn > t.higherIn && t.p < 0.05 ? 'supported' : t.higherIn > t.lowerIn ? 'refuted' : 'inconclusive');
// cases solved without loss (LI12, same instances) and not solved with 20% loss
const lost = (arm) => K.reduce((n, k) => n + Object.entries(R[k].arms[arm] || {}).filter(([c, s]) => s.solved && !L[k].arms[arm]?.[c]?.solved).length, 0);
const solved = (arm) => sum((a) => a.arms[arm].solved);
const rm = sg('routed', 'manager'), sm = sg('stig', 'manager');
const deg = Object.fromEntries(['routed', 'manager', 'oracle', 'stig'].map((a) => [a, lost(a)]));
console.log(JSON.stringify({ solved: Object.fromEntries(['routed', 'manager', 'oracle', 'stig'].map((a) => [a, solved(a)])), lostToMemberLoss: deg,
  'H-LI41 (primary) under member loss the router ends below the manager': { ...rm, verdict: verdict(rm) },
  'H-LI42 member loss costs the manager more cases than the router': { manager: deg.manager, routed: deg.routed, verdict: deg.manager >= deg.routed + 2 ? 'supported' : deg.manager <= deg.routed ? 'refuted' : 'inconclusive' },
  'H-LI43 under member loss agent-written stigmergy ends below the manager': { ...sm, verdict: verdict(sm) },
  holm: 'secondary H-LI42 and H-LI43: Holm over their p-values where one exists (H-LI43); H-LI42 is a count rule' }, null, 2));
