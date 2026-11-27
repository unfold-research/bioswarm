// Generic verdicts for a sweep study (one spec, any arms and sizes): every hypothesis is a paired per-case comparison of
// arm a against arm b on a metric, with an exact two-sided sign test; the case is the unit (method rule 4). Secondary
// hypotheses carry a Holm-adjusted p (rule 3). Metrics, lower is better unless noted:
//   final          failing checks after the last wave (strict live check)
//   holdoutFailing failing checks on 40 fresh inputs per check
//   tokens         output tokens of the arm in that case
//   actRounds      waves in which the arm's members acted until it solved; manager plan waves excluded; unsolved = worst
//   wavesToSolve   waves (wall-clock in lockstep) until it solved; unsolved = worst
//   solved         1 if solved (higher is better)
// Rule: supported if a is better in more cases with p < 0.05 (and, if given, a solves at least minSolvedDiff more cases);
// refuted if b is better in more cases; otherwise inconclusive.
// Usage: node observatory/batch2/rc/verdict.mjs <spec.json>
import fs from 'node:fs';
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dir = (k) => `results/${spec.id.toLowerCase()}-k${k}`;
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const sign = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const cases = [];
for (const z of spec.sizes) {
  const st = JSON.parse(fs.readFileSync(`${dir(z.k)}/state.json`, 'utf8')), ho = JSON.parse(fs.readFileSync(`${dir(z.k)}/holdout.json`, 'utf8'));
  for (const key of Object.keys(st.arms[spec.arms[0]] || {})) {
    const row = { k: z.k, key, arm: {} };
    for (const arm of spec.arms) { const s = st.arms[arm]?.[key]; if (!s) continue;
      // an act wave is one in which members acted; a manager plan wave (one plan call, no module changed) is not (LI16 review)
      const isAct = (h) => h.actors > 0 && !(arm === 'manager' && h.actors === 1 && (h.acted || []).length === 0);
      const acts = s.history.slice(1).filter(isAct), solvedAt = s.solved ? s.history.findIndex((h) => h.counts.total === 0) : -1;
      row.arm[arm] = { final: s.history.at(-1).counts.total, holdoutFailing: ho[arm]?.perCase?.[key] ?? null, tokens: s.history.reduce((n, h) => n + (h.outSum || 0), 0), solved: s.solved ? 1 : 0,
        actRounds: s.solved ? s.history.slice(1, solvedAt + 1).filter(isAct).length : Infinity, wavesToSolve: s.solved ? solvedAt : Infinity, acted: acts.length }; }
    cases.push(row);
  }
}
const totals = Object.fromEntries(spec.arms.map((a) => [a, { solved: cases.filter((c) => c.arm[a]?.solved).length, holdout: cases.filter((c) => c.arm[a]?.solved && c.arm[a]?.holdoutFailing === 0).length, of: cases.filter((c) => c.arm[a]).length,
  tokensPerSolved: (() => { const n = cases.filter((c) => c.arm[a]?.solved).length; return n ? Math.round(cases.reduce((t, c) => t + (c.arm[a]?.tokens || 0), 0) / n) : null; })() }]));
const results = spec.hypotheses.map((h) => {
  const better = h.metric === 'solved' ? (x, y) => x > y : (x, y) => x < y; let w = 0, l = 0;
  for (const c of cases) { const x = c.arm[h.a]?.[h.metric], y = c.arm[h.b]?.[h.metric]; if (x == null || y == null) continue; if (better(x, y)) w++; else if (better(y, x)) l++; }
  const p = sign(w, l), solvedOk = !h.minSolvedDiff || totals[h.a].solved >= totals[h.b].solved + h.minSolvedDiff;
  return { ...h, aBetter: w, bBetter: l, p, verdict: w > l && p < 0.05 && solvedOk ? 'supported' : l > w ? 'refuted' : 'inconclusive' };
});
const sec = results.filter((r) => !r.primary).sort((a, b) => a.p - b.p); sec.forEach((r, i) => { r.pHolm = Math.min(1, Math.max(...sec.slice(0, i + 1).map((x, j) => x.p * (sec.length - j)))); });
const out = { id: spec.id, cases: cases.length, totals, hypotheses: results };
fs.mkdirSync(`results/${spec.id.toLowerCase()}`, { recursive: true });
fs.writeFileSync(`results/${spec.id.toLowerCase()}/verdicts.json`, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
