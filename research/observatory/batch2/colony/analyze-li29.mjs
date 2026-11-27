// LI29 verdicts (tasks/LI29-COLONY-K80-PREREG.md), from results/li29-colony-k80/<arm>-s<seed>.json.
import fs from 'node:fs';
const K = [80], R = (k) => `results/li29-colony-k${k}`;
const rows = K.flatMap((k) => fs.readdirSync(R(k)).filter((f) => /^(market|fieldwait)-s\d+\.json$/.test(f)).map((f) => ({ k, ...JSON.parse(fs.readFileSync(`${R(k)}/${f}`, 'utf8')) })));
const pair = K.flatMap((k) => [...new Set(rows.filter((r) => r.k === k).map((r) => r.seed))].map((seed) => [rows.find((r) => r.k === k && r.seed === seed && r.arm === "fieldwait"), rows.find((r) => r.k === k && r.seed === seed && r.arm === 'market')])).filter(([f, m]) => f && m);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const sign = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const cmp = (f) => { let w = 0, l = 0; for (const [a, b] of pair) { const x = f(a), y = f(b); if (x < y) w++; else if (x > y) l++; } return { fieldBetter: w, marketBetter: l, p: sign(w, l) }; };
const v = (t) => (t.fieldBetter > t.marketBetter && t.p < 0.05 ? 'supported' : t.marketBetter > t.fieldBetter ? 'refuted' : 'inconclusive');
const hold = cmp((r) => r.holdoutFailing), wall = cmp((r) => r.wallMs), tok = cmp((r) => r.tokens?.total || 0); /* LI20 review: total tokens, cached input included, as registered */
const holm = (p, q) => Math.min(1, Math.max(2 * Math.min(p, q), p === Math.min(p, q) ? 0 : Math.min(1, Math.max(p, q))));
const tally = (arm) => ({ solved: rows.filter((r) => r.arm === arm && r.solved).length, holdout: rows.filter((r) => r.arm === arm && r.holdout).length, of: rows.filter((r) => r.arm === arm).length, capped: rows.filter((r) => r.arm === arm && r.capped).length, traces: rows.filter((r) => r.arm === arm).reduce((n, r) => n + (r.traces || 0), 0) });
console.log(JSON.stringify({ pairs: pair.length, field: tally('fieldwait'), market: tally('market'),
  'H-LI84 (primary) the waiting field leaves fewer checks failing on fresh inputs': { ...hold, verdict: v(hold) },
  'H-LI85 the waiting field finishes sooner': { ...wall, verdict: v(wall), pHolm: holm(wall.p, tok.p) },
  'H-LI86 the waiting field uses fewer tokens (cached input included)': { ...tok, verdict: v(tok), pHolm: holm(tok.p, wall.p) },
  stalls: { fieldwait: rows.filter((r) => r.arm === 'fieldwait' && r.stalled).length, market: rows.filter((r) => r.arm === 'market' && r.stalled).length } }, null, 2));
