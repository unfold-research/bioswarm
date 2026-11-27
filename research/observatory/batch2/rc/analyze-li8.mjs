// LI8 verdicts (tasks/LI8-HAIKU-CAPACITY-PREREG.md), from the per-size analysis.json files written by analyze-rc.mjs.
import fs from 'node:fs';
const A = (k) => JSON.parse(fs.readFileSync(`results/li8-haiku-capacity-k${k}/analysis.json`, 'utf8'));
const a5 = A(5), a12 = A(12), add = (x, y) => Object.fromEntries(Object.keys(x).map((k) => [k, x[k] + y[k]]));
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const mcnemar = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const sym = add(a5.edgeTests.routed_vs_chat_symmetric, a12.edgeTests.routed_vs_chat_symmetric), dir = add(a5.edgeTests.routed_vs_inhibit_directed, a12.edgeTests.routed_vs_inhibit_directed);
sym.p = mcnemar(sym.routedOnly, sym.chatOnly); dir.p = mcnemar(dir.routedOnly, dir.inhibitOnly);
const r12 = a12.arms.routed.solved, s12 = a12.arms.solo.solved, r5 = a5.arms.routed.solved, s5 = a5.arms.solo.solved;
const verdict = {
  'H-LI22 past capacity the router beats one agent': r12 >= s12 + 3 ? 'supported' : r12 <= s12 ? 'refuted' : 'inconclusive',
  'H-LI23 below capacity one agent is enough': s5 >= r5 ? 'supported' : 'refuted',
  'H-LI24 geometry transfers to Haiku': sym.routedOnly > sym.chatOnly && sym.p < 0.05 && dir.routedOnly > dir.inhibitOnly && dir.p < 0.05 ? 'supported' : sym.routedOnly <= sym.chatOnly || dir.routedOnly <= dir.inhibitOnly ? 'refuted' : 'inconclusive',
};
console.log(JSON.stringify({ solved: { k5: { routed: r5, solo: s5 }, k12: { routed: r12, solo: s12 } }, pooled: { routed_vs_chat_symmetric: sym, routed_vs_inhibit_directed: dir }, verdict }, null, 2));
