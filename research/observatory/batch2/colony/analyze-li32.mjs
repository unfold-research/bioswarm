// LI32 verdicts (tasks/LI32-COLONY-CLAIM-REPLICATION-PREREG.md), from results/li32-colony-claim-k40/<arm>-s<seed>.json and
// .export.json (Colony lab telemetry: every edit with the functions it touched, ffa0d13 on).
import fs from 'node:fs';
import * as W from '../rc/code.mjs';
const cfg = JSON.parse(fs.readFileSync(new URL('./li32-k40.json', import.meta.url), 'utf8')), D = `results/${cfg.out}`, per = cfg.k / 4;
const rows = fs.readdirSync(D).filter((f) => /^(claim|nopeer|market)-s\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')));
const M = (i) => 'M' + (i + 1), antOf = (m) => Math.floor(m / per);
// Bilateral adaptation (LI31 review): a format pair whose two sides belong to different ants, failing at the last snapshot
// before an edit to its encoder function, and an edit to its decoder function within 60 s of it (either order); first
// writes of a file are not counted (they are the first implementation, not an adaptation).
function dynamics(r) {
  const inst = W.makeInstance(cfg.k, r.seed, cfg.shape), exp = JSON.parse(fs.readFileSync(`${D}/${r.arm}-s${r.seed}.export.json`, 'utf8'));
  const edits = (exp.agents || []).flatMap((a) => (a.tasks || []).flatMap((t) => t.tools || [])).filter((c) => ['write', 'edit'].includes(c.tool) && !c.blocked && !c.isError && c.input?.path).map((c) => ({ at: c.at, file: Number(String(c.input.path).match(/m(\d+)\.js$/)?.[1]) - 1, fns: c.input.functions || [] })).filter((e) => e.file >= 0).sort((a, b) => a.at - b.at);
  const firstWrite = new Map(); for (const e of edits) if (!firstWrite.has(e.file)) firstWrite.set(e.file, e.at);
  const tl = (r.timeline || []).filter((p) => Array.isArray(p.fails)).map((p) => ({ at: r.startedAt + p.t, fails: p.fails }));
  const failingAt = (key, at) => { let last = null; for (const p of tl) { if (p.at <= at) last = p; else break; } return last ? last.fails.some((f) => f.startsWith(key)) : true; };
  let bilateral = 0, regressions = 0;
  const pairs = inst.checks.filter((c) => c.kind === 'symmetric' && antOf(c.prod) !== antOf(c.cons)).map((c) => ({ key: `round trip ${M(c.cons)}.${c.dec}(${M(c.prod)}.${c.enc}(rec))`, prod: c.prod, cons: c.cons, enc: c.enc, dec: c.dec }));
  for (const p of pairs) {
    const enc = edits.filter((e) => e.file === p.prod && e.fns.includes(p.enc) && e.at > firstWrite.get(p.prod)), dec = edits.filter((e) => e.file === p.cons && e.fns.includes(p.dec) && e.at > firstWrite.get(p.cons));
    for (const a of enc) if (dec.some((b) => Math.abs(b.at - a.at) <= 60000) && failingAt(p.key, Math.min(a.at, ...dec.filter((b) => Math.abs(b.at - a.at) <= 60000).map((b) => b.at)))) bilateral++;
    for (let i = 1; i < tl.length; i++) if (!tl[i - 1].fails.some((f) => f.startsWith(p.key)) && tl[i].fails.some((f) => f.startsWith(p.key))) regressions++;
  }
  const announced = (exp.agents || []).flatMap((a) => (a.tasks || []).flatMap((t) => t.tools || [])).filter((c) => c.tool === 'field_trace' && !c.isError && /me adapto/i.test(JSON.stringify(c.input || ''))).length;
  return { bilateral, regressions, announced, crossPairs: pairs.length };
}
for (const r of rows) Object.assign(r, dynamics(r));
const seeds = [...new Set(rows.map((r) => r.seed))].sort(), get = (arm, seed) => rows.find((r) => r.arm === arm && r.seed === seed);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const sign = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const cmp = (A, B, f) => { let w = 0, l = 0; for (const s of seeds) { const a = get(A, s), b = get(B, s); if (!a || !b) continue; if (f(a) < f(b)) w++; else if (f(a) > f(b)) l++; } return { aBetter: w, bBetter: l, p: sign(w, l) }; };
const H = [
  ['H-LI94', 'claim', 'nopeer', (r) => r.bilateral, 'announcing who adapts lowers bilateral adaptation of cross-ant format pairs (both functions changed within 60 s while the pair fails)'],
  ['H-LI95', 'claim', 'market', (r) => r.holdoutFailing, 'the announcing field leaves fewer checks failing on fresh inputs than the default team'],
  ['H-LI96', 'claim', 'nopeer', (r) => r.regressions, 'announcing who adapts lowers regressions of cross-ant format pairs'],
  ['H-LI97', 'claim', 'nopeer', (r) => r.wallMs, 'announcing who adapts finishes sooner'],
].map(([id, a, b, f, title]) => ({ id, title, a, b, ...cmp(a, b, f) }));
const sec = H.slice(1).map((h) => h.p).sort((x, y) => x - y);
for (const h of H.slice(1)) { const i = sec.indexOf(h.p); h.pHolm = Math.min(1, Math.max(...sec.slice(0, i + 1).map((p, j) => (sec.length - j) * p))); }
for (const h of H) h.verdict = h.aBetter > h.bBetter && h.p < 0.05 ? 'supported' : h.bBetter > h.aBetter ? 'refuted' : 'inconclusive';
const tally = (arm) => { const rs = rows.filter((r) => r.arm === arm); const sum = (k) => rs.reduce((n, r) => n + (r[k] || 0), 0); return { runs: rs.length, solved: rs.filter((r) => r.solved).length, holdout: rs.filter((r) => r.holdout).length, capped: rs.filter((r) => r.capped).length, bilateral: sum('bilateral'), regressions: sum('regressions'), announced: sum('announced'), medianWallMin: +((rs.map((r) => r.wallMs).sort((a, b) => a - b)[Math.floor(rs.length / 2)] || 0) / 60e3).toFixed(1), tokensTotal: rs.reduce((n, r) => n + (r.tokens?.total || 0), 0) }; };
console.log(JSON.stringify({ arms: Object.fromEntries(['claim', 'nopeer', 'market'].map((a) => [a, tally(a)])), hypotheses: H, perRun: rows.map((r) => ({ arm: r.arm, seed: r.seed, solved: r.solved, holdoutFailing: r.holdoutFailing, bilateral: r.bilateral, regressions: r.regressions, announced: r.announced, wallMin: +(r.wallMs / 60e3).toFixed(1) })) }, null, 1));
