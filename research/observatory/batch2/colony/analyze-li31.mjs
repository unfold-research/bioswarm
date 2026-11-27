// LI31 verdicts (tasks/LI31-COLONY-CLAIM-PREREG.md), from results/li31-colony-claim-k40/<arm>-s<seed>.json (with timeline).
import fs from 'node:fs';
import * as W from '../rc/code.mjs';
const cfg = JSON.parse(fs.readFileSync(new URL('./li31-k40.json', import.meta.url), 'utf8')), D = `results/${cfg.out}`;
const rows = fs.readdirSync(D).filter((f) => /^(claim|nopeer|market)-s\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')));
const M = (i) => 'M' + (i + 1);
// per run: polls where a failing format pair had both of its files changed (simultaneous), and format pairs that passed then failed again (regressions)
function dynamics(r) {
  const inst = W.makeInstance(cfg.k, r.seed, cfg.shape), sym = inst.checks.filter((c) => c.kind === 'symmetric').map((c) => ({ key: `round trip ${M(c.cons)}.${c.dec}(${M(c.prod)}.${c.enc}(rec))`, a: c.prod, b: c.cons }));
  const tl = (r.timeline || []).filter((p) => Array.isArray(p.fails)), failing = (p, s) => p.fails.some((f) => f.startsWith(s.key));
  let simultaneous = 0, regressions = 0;
  for (let i = 1; i < tl.length; i++) for (const s of sym) {
    const was = failing(tl[i - 1], s), now = failing(tl[i], s);
    if (was && tl[i].files[s.a] !== tl[i - 1].files[s.a] && tl[i].files[s.b] !== tl[i - 1].files[s.b]) simultaneous++;
    if (!was && now && tl[i - 1].files.some(Boolean)) regressions++;
  }
  return { simultaneous, regressions, polls: tl.length };
}
for (const r of rows) Object.assign(r, dynamics(r));
const seeds = [...new Set(rows.map((r) => r.seed))].sort(), get = (arm, seed) => rows.find((r) => r.arm === arm && r.seed === seed);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const sign = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const cmp = (A, B, f) => { let w = 0, l = 0; for (const s of seeds) { const a = get(A, s), b = get(B, s); if (!a || !b) continue; if (f(a) < f(b)) w++; else if (f(a) > f(b)) l++; } return { aBetter: w, bBetter: l, p: sign(w, l) }; };
const v = (t) => (t.aBetter > t.bBetter && t.p < 0.05 ? 'supported' : t.bBetter > t.aBetter ? 'refuted' : 'inconclusive');
const H = [
  ['H-LI90', 'claim', 'nopeer', (r) => r.simultaneous, 'announcing who adapts lowers simultaneous changes of both sides of a failing format pair'],
  ['H-LI91', 'claim', 'nopeer', (r) => r.holdoutFailing, 'announcing who adapts leaves fewer checks failing on fresh inputs'],
  ['H-LI92', 'claim', 'nopeer', (r) => r.wallMs, 'announcing who adapts finishes sooner'],
  ['H-LI93', 'claim', 'market', (r) => r.holdoutFailing, 'the announcing field leaves fewer checks failing on fresh inputs than the default team'],
].map(([id, a, b, f, title]) => ({ id, a, b, title, ...cmp(a, b, f) }));
const sec = H.slice(1).map((h) => h.p).sort((x, y) => x - y);
for (const h of H.slice(1)) { const i = sec.indexOf(h.p); h.pHolm = Math.min(1, Math.max(...sec.slice(0, i + 1).map((p, j) => (sec.length - j) * p))); }
for (const h of H) h.verdict = v(h);
const tally = (arm) => { const rs = rows.filter((r) => r.arm === arm); return { runs: rs.length, solved: rs.filter((r) => r.solved).length, holdout: rs.filter((r) => r.holdout).length, capped: rs.filter((r) => r.capped).length, stalled: rs.filter((r) => r.stalled).length, simultaneous: rs.reduce((n, r) => n + r.simultaneous, 0), regressions: rs.reduce((n, r) => n + r.regressions, 0), traces: rs.reduce((n, r) => n + (r.traces || 0), 0), medianWallMin: +(rs.map((r) => r.wallMs).sort((a, b) => a - b)[Math.floor(rs.length / 2)] / 60e3 || 0).toFixed(1), tokensTotal: rs.reduce((n, r) => n + (r.tokens?.total || 0), 0) }; };
console.log(JSON.stringify({ arms: Object.fromEntries(['claim', 'nopeer', 'market'].map((a) => [a, tally(a)])), hypotheses: H.map(({ id, title, a, b, aBetter, bBetter, p, pHolm, verdict }) => ({ id, title, a, b, aBetter, bBetter, p, pHolm, verdict })), perRun: rows.map((r) => ({ arm: r.arm, seed: r.seed, solved: r.solved, holdoutFailing: r.holdoutFailing, simultaneous: r.simultaneous, regressions: r.regressions, polls: r.polls, wallMin: +(r.wallMs / 60e3).toFixed(1) })) }, null, 1));
