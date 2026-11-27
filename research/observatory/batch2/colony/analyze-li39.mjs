// LI39 verdicts (tasks/LI39-SECOND-FAMILY-COLONY-PREREG.md): the second model family (gpt-6-luna, Colony) for LI38's
// latency cell. Primary H-LI119: minutes from the task message to the first all-pass (the first timeline poll with no
// failing check), wait against market, paired per seed; a run that never reaches it scores cap+1 minutes; two runs of a
// seed that both never reach it are a tie. Secondary (Holm): H-LI120 final failing, H-LI121 holdout failing, H-LI122
// tokens. Exact sign test per seed, ties dropped. Reads results/<out>/<arm>-s<seed>.json.
import fs from 'node:fs';
import path from 'node:path';

const cfg = JSON.parse(fs.readFileSync(new URL('./li39-k160.json', import.meta.url), 'utf8'));
const D = path.resolve(process.cwd(), 'results', cfg.out);
const CAP = cfg.capMinutes;
const rows = fs.readdirSync(D).filter((f) => new RegExp(`^(${cfg.arms.join('|')})-s\\d+\\.json$`).test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')));

// minutes to the first all-pass, from the timeline; never solved within the cap -> cap+1 (worst)
function firstAllPassMin(r) {
  const tl = (r.timeline || []).filter((p) => Array.isArray(p.fails));
  const hit = tl.find((p) => p.fails.length === 0);
  return hit ? hit.t / 60000 : CAP + 1;
}
for (const r of rows) { r.firstAllPassMin = firstAllPassMin(r); r.totalTokens = (r.tokens?.input || 0) + (r.tokens?.output || 0); r.neverSolved = r.firstAllPassMin > CAP; }

const seeds = [...new Set(rows.map((r) => r.seed))].sort((a, b) => a - b);
const get = (arm, seed) => rows.find((r) => r.arm === arm && r.seed === seed);
const [A, B] = cfg.arms; // wait, market

const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const signP = (w, l) => { const n = w + l; if (!n) return 1; const k = Math.min(w, l); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };

// a lower value of f(r) is better; a tie on the metric (or, for the primary, both runs never reaching it) is dropped
function compare(a, b, f, primary = false) {
  let wins = 0, losses = 0, ties = 0, pairs = 0;
  for (const s of seeds) {
    const x = get(a, s), y = get(b, s); if (!x || !y) continue; pairs++;
    if (primary && x.neverSolved && y.neverSolved) { ties++; continue; }
    const fx = f(x), fy = f(y);
    if (fx < fy) wins++; else if (fx > fy) losses++; else ties++;
  }
  return { a, b, pairs, wins, losses, ties, p: signP(wins, losses) };
}
function verdictOf(c) { // supported: a better in more cases with p<0.05; refuted: b better in more; else inconclusive
  if (c.p < 0.05 && c.wins > c.losses) return 'supported';
  if (c.p < 0.05 && c.losses > c.wins) return 'refuted';
  return 'inconclusive';
}

const H = [
  { id: 'H-LI119', primary: true, metric: 'minutesToFirstAllPass', f: (r) => r.firstAllPassMin, title: 'wait reaches the first all-pass in fewer minutes than market' },
  { id: 'H-LI120', metric: 'finalFailing', f: (r) => r.failing, title: 'wait ends with fewer failing checks than market' },
  { id: 'H-LI121', metric: 'holdoutFailing', f: (r) => r.holdoutFailing ?? (r.holdout ? 0 : (r.failing || 0)), title: 'wait leaves fewer checks failing on fresh inputs than market' },
  { id: 'H-LI122', metric: 'totalTokens', f: (r) => r.totalTokens, title: 'wait uses fewer total tokens per run than market' },
].map((h) => ({ ...h, ...compare(A, B, h.f, h.primary) }));
for (const h of H) h.verdict = verdictOf(h);
// Holm across the secondaries
const sec = H.filter((h) => !h.primary).sort((x, y) => x.p - y.p);
sec.forEach((h, i) => { h.pHolm = Math.min(1, Math.max(...sec.slice(0, i + 1).map((g, j) => (sec.length - j) * g.p))); h.verdict = h.pHolm < 0.05 && h.wins !== h.losses ? (h.wins > h.losses ? 'supported' : 'refuted') : 'inconclusive'; });

const per = (arm) => { const rs = rows.filter((r) => r.arm === arm); const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
  return { arm, runs: rs.length, solved: rs.filter((r) => r.solved).length, capped: rs.filter((r) => r.capped).length, neverAllPass: rs.filter((r) => r.neverSolved).length,
    medianWallMin: med(rs.map((r) => r.wallMs / 60000)), medianFirstAllPassMin: med(rs.map((r) => r.firstAllPassMin)), medianTokens: med(rs.map((r) => r.totalTokens)),
    medianFinalFailing: med(rs.map((r) => r.failing)), traces: rs.reduce((n, r) => n + (r.traces || 0), 0), antMessages: rs.reduce((n, r) => n + (r.antMessages || 0), 0) }; };

console.log(JSON.stringify({
  study: 'LI39', prereg: cfg.prereg, generatedBy: 'observatory/batch2/colony/analyze-li39.mjs', out: cfg.out,
  cases: seeds.length, capMinutes: CAP, model: cfg.model, colony: cfg.colonyCommit || cfg.bench?.colony || null,
  rule: 'per seed: exact sign test, ties dropped; supported if wait wins in more cases with p<0.05, refuted if market does, else inconclusive; Holm across the secondaries; a run that never reaches the all-pass scores cap+1 minutes and two such runs of a seed are a tie',
  hypotheses: H.map(({ f, ...h }) => h),
  arms: cfg.arms.map(per),
}, null, 1));
