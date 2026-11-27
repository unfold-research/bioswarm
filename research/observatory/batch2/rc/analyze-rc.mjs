// LI7 analysis (tasks/LI7-REAL-CODE-PREREG.md). Written before the main results were read.
// Usage: node observatory/batch2/rc/analyze-rc.mjs results/<out> > results/<out>/analysis.json
// Unit for the primary tests: a cross-module edge (a check whose id starts with S: symmetric or D: directed), paired across
// arms on the same case and edge; outcome: passing after the last round. Exact two-sided McNemar on discordant edges.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2], st = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
const arms = Object.keys(st.arms), cases = Object.keys(st.arms[arms[0]] || {});
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };
const mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const mcnemar = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };

// every edge id of a case: from the shared round-0 failing list we cannot know passing edges, so collect ids over all arms/waves
// and from the instance generator through the history; edges that never failed anywhere count as passing in every arm.
const edgeIds = (c) => { const ids = new Set(); for (const a of arms) for (const h of st.arms[a][c]?.history || []) for (const id of h.failing) if (/^[SD]:/.test(id)) ids.add(id); return [...ids]; };
const finalFailing = (a, c) => new Set(st.arms[a][c]?.history.at(-1)?.failing || []);
const kindOf = (id) => (id.startsWith('S:') ? 'symmetric' : 'directed');

const table = Object.fromEntries(arms.map((a) => { const rows = cases.map((c) => st.arms[a][c]).filter(Boolean); const fin = rows.map((s) => s.history.at(-1).counts);
  return [a, { solved: rows.filter((s) => s.solved).length, of: rows.length,
    finalTotal: { sum: fin.reduce((n, x) => n + x.total, 0), median: median(fin.map((x) => x.total)) },
    finalByKind: Object.fromEntries(['local', 'directed', 'symmetric'].map((k) => [k, fin.reduce((n, x) => n + x[k], 0)])),
    meanOut: Math.round(mean(rows.map((s) => s.history.reduce((n, h) => n + h.outSum, 0)))), meanUsd: +mean(rows.map((s) => s.history.reduce((n, h) => n + h.usd, 0))).toFixed(4),
    calls: rows.reduce((n, s) => n + s.history.filter((h) => !h.shared).reduce((m, h) => m + h.actors, 0), 0), trunc: rows.reduce((n, s) => n + s.history.reduce((m, h) => m + h.trunc, 0), 0),
    messages: rows.reduce((n, s) => n + s.history.reduce((m, h) => m + (h.sent || 0), 0), 0),
    meanTrajectory: Array.from({ length: Math.max(...rows.map((s) => s.history.length)) }, (_, i) => +mean(rows.map((s) => s.history[Math.min(i, s.history.length - 1)].counts.total)).toFixed(2)) }]; }));

const edges = (a, b, kind) => { let aOnly = 0, bOnly = 0, both = 0, neither = 0; for (const c of cases) { if (!st.arms[a][c] || !st.arms[b][c]) continue; const fa = finalFailing(a, c), fb = finalFailing(b, c);
  for (const id of edgeIds(c).filter((x) => !kind || kindOf(x) === kind)) { const pa = !fa.has(id), pb = !fb.has(id); if (pa && pb) both++; else if (pa) aOnly++; else if (pb) bOnly++; else neither++; } }
  return { [`${a}Only`]: aOnly, [`${b}Only`]: bOnly, both, neither, p: +mcnemar(aOnly, bOnly).toFixed(5) }; };
const sign = (a, b) => { let w = 0, l = 0; for (const c of cases) { const x = st.arms[a][c]?.history.at(-1).counts.total, y = st.arms[b][c]?.history.at(-1).counts.total; if (x == null || y == null) continue; if (x < y) w++; else if (x > y) l++; } return { lowerIn: w, higherIn: l, p: +mcnemar(w, l).toFixed(5) }; };

const has = (...xs) => xs.every((x) => arms.includes(x));
const pairs = [['inhibit', 'sync'], ['chat', 'sync'], ['routed', 'sync'], ['inhibit', 'chat'], ['routed', 'chat'], ['routed', 'inhibit'], ['routed', 'manager'], ['manager', 'chat'], ['routed', 'solo'], ['threshold', 'routed'], ['pheromone', 'routed'], ['threshold', 'manager'], ['pheromone', 'manager'], ['polarity', 'routed'], ['stig', 'manager'], ['stig', 'polarity'], ['stig', 'oracle'], ['oracle', 'manager'], ['polarity', 'manager'], ['stig', 'routed'], ['clonal', 'stig'], ['clonal', 'manager']].filter(([a, b]) => has(a, b));
const edgeTests = Object.fromEntries(pairs.flatMap(([a, b]) => ['symmetric', 'directed', null].map((k) => [`${a}_vs_${b}_${k || 'all'}`, edges(a, b, k)])));
const signTests = Object.fromEntries(pairs.concat(has('solo') ? swarm().map((a) => ['solo', a]) : []).map(([a, b]) => [`${a}_vs_${b}`, sign(a, b)]));
function swarm() { return arms.filter((a) => a !== 'solo'); }

// oscillation: a symmetric edge failing before a round, both of its modules changed in that round, still failing after
const osc = Object.fromEntries(swarm().map((a) => { let both = 0, flips = 0; for (const c of cases) { const h = st.arms[a][c].history; for (let i = 1; i < h.length; i++) for (const id of h[i - 1].failing.filter((x) => x.startsWith('S:'))) {
  const m = id.match(/^S:M(\d+)\..*~M(\d+)\./), p = Number(m[1]) - 1, q = Number(m[2]) - 1; if (h[i].acted.includes(p) && h[i].acted.includes(q)) { both++; if (h[i].failing.includes(id)) flips++; } } }
  return [a, { bothSidesChanged: both, stillFailingAfter: flips }]; }));

const rule = (t, aKey) => { const b = t[`${aKey}Only`], c = Object.entries(t).find(([k]) => k.endsWith('Only') && k !== `${aKey}Only`)[1]; return b > c && t.p < 0.05 ? 'supported' : b <= c ? 'refuted' : 'inconclusive'; };
const verdict = {};
if (has('inhibit', 'sync')) verdict['H-LI17 inhibit resolves more symmetric edges than sync'] = rule(edgeTests.inhibit_vs_sync_symmetric, 'inhibit');
if (has('chat', 'sync')) verdict['H-LI18 chat resolves more directed edges than sync'] = rule(edgeTests.chat_vs_sync_directed, 'chat');
if (has('inhibit', 'sync')) { const t = edgeTests.inhibit_vs_sync_directed; verdict['H-LI19 inhibit resolves fewer directed edges than sync'] = t.syncOnly > t.inhibitOnly && t.p < 0.05 ? 'supported' : t.syncOnly <= t.inhibitOnly ? 'refuted' : 'inconclusive'; }
if (has('routed', 'inhibit', 'chat')) { const a = edgeTests.routed_vs_inhibit_all, b = edgeTests.routed_vs_chat_all; verdict['H-LI20 the router resolves more cross-module edges than inhibit and no fewer than chat'] = a.routedOnly > a.inhibitOnly && a.p < 0.05 && b.routedOnly >= b.chatOnly ? 'supported' : a.routedOnly <= a.inhibitOnly || b.routedOnly < b.chatOnly ? 'refuted' : 'inconclusive'; }
if (has('solo')) { const best = Math.max(...swarm().map((a) => table[a].solved)); verdict['H-LI21 one agent solves at least as many cases as the best swarm arm'] = table.solo.solved >= best ? 'supported' : 'refuted'; }

console.log(JSON.stringify({ arms: table, edgeTests, signTests, oscillation: osc, verdict }, null, 2));
