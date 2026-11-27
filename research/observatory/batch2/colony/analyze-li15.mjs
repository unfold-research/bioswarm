// LI15 verdicts (tasks/LI15-COLONY-FIELD-PREREG.md), from results/li15-colony-k{24,40}/<arm>-s<seed>.json.
import fs from 'node:fs';
const K = [24, 40], R = (k) => `results/li15-colony-k${k}`;
const rows = K.flatMap((k) => fs.readdirSync(R(k)).filter((f) => /^(market|field)-s\d+\.json$/.test(f)).map((f) => ({ k, ...JSON.parse(fs.readFileSync(`${R(k)}/${f}`, 'utf8')) })));
const pair = K.flatMap((k) => [...new Set(rows.filter((r) => r.k === k).map((r) => r.seed))].map((seed) => [rows.find((r) => r.k === k && r.seed === seed && r.arm === 'field'), rows.find((r) => r.k === k && r.seed === seed && r.arm === 'market')])).filter(([f, m]) => f && m);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const sign = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const cmp = (f) => { let w = 0, l = 0; for (const [a, b] of pair) { const x = f(a), y = f(b); if (x < y) w++; else if (x > y) l++; } return { fieldBetter: w, marketBetter: l, p: sign(w, l) }; };
const v = (t) => (t.fieldBetter > t.marketBetter && t.p < 0.05 ? 'supported' : t.marketBetter > t.fieldBetter ? 'refuted' : 'inconclusive');
const hold = cmp((r) => r.holdoutFailing), wall = cmp((r) => r.wallMs), tok = cmp((r) => (r.tokens?.input || 0) + (r.tokens?.output || 0));
const tally = (arm) => ({ solved: rows.filter((r) => r.arm === arm && r.solved).length, holdout: rows.filter((r) => r.arm === arm && r.holdout).length, of: rows.filter((r) => r.arm === arm).length, capped: rows.filter((r) => r.arm === arm && r.capped).length, traces: rows.filter((r) => r.arm === arm).reduce((n, r) => n + (r.traces || 0), 0) });
console.log(JSON.stringify({ pairs: pair.length, field: tally('field'), market: tally('market'),
  'H-LI47 (primary) the field leaves fewer checks failing on fresh inputs': { ...hold, verdict: v(hold) },
  'H-LI48 the field finishes sooner': { ...wall, verdict: v(wall) },
  'H-LI49 the field uses fewer tokens': { ...tok, verdict: v(tok) } }, null, 2));
