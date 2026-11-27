// Classical reference for LI (no model): the same colouring cases (LI1 seeds 1000-1011, LI3/LI4 seeds) repaired by
// deterministic greedy members under the fold-field rules, and a central min-conflicts search. Answers the review's
// question: does a non-LLM member under the same rules do better or worse than Haiku members, and is an LLM needed at all?
import { coordinate } from '../../../experiments/fold-field/field.mjs';
import * as C from './swarm.mjs';
import { rng } from './tasks.mjs';
const out = [];
for (const [n, seed0] of [[60, 1000], [120, 1000], [240, 1000]]) for (let i = 0; i < 12; i++) {
  const seed = seed0 + i, inst = C.makeInstance(n, seed, 2.3, 15), parts = Array.from({ length: n }, (_, j) => String(j));
  const ownerOf = (x) => `T${inst.owner[Number(x)]}`, neighbours = (x) => inst.adj[Number(x)].map(String);
  const col = (st) => Array.from({ length: n }, (_, j) => st.get(String(j)));
  const check = (st) => C.conflicts(inst, col(st)).map(([a, b]) => ({ parts: [String(a), String(b)] }));
  const r = rng(`cls:${n}:${seed}`);
  const act = async ({ parts: mine, violations, state }) => { const hot = new Set(violations.flatMap((v) => v.parts).filter((x) => mine.includes(x))); const m = new Map();
    for (const x of hot) { const cnt = { R: 0, G: 0, B: 0 }; for (const y of neighbours(x)) { const c = state.get(y); if (c) cnt[c]++; } const best = Math.min(...Object.values(cnt)); const opts = Object.keys(cnt).filter((c) => cnt[c] === best); m.set(x, opts[Math.floor(r() * opts.length)]); } return m; };
  const start = () => new Map(parts.map((x, j) => [x, 'RGB'[Math.floor(rng(`st:${n}:${seed}`)() * 3 + j) % 3]]));
  const row = { n, seed };
  for (const rule of ['sync', 'inhibit', 'random']) for (const rounds of [8, 100]) { const res = await coordinate({ parts, ownerOf, neighbours, check, act, state: start(), rule, rounds }); row[`${rule}${rounds}`] = check(res.state).length; }
  // central min-conflicts: repeatedly recolour a random conflicted node to its least-conflicting colour
  const st = start(); let steps = 0; for (; steps < 200000; steps++) { const cs = check(st); if (!cs.length) break; const v = cs[Math.floor(r() * cs.length)].parts[Math.floor(r() * 2)]; const cnt = { R: 0, G: 0, B: 0 }; for (const y of neighbours(v)) cnt[st.get(y)]++; const best = Math.min(...Object.values(cnt)); const opts = Object.keys(cnt).filter((c) => cnt[c] === best && (r() < 0.2 || c !== st.get(v))); st.set(v, (opts.length ? opts : Object.keys(cnt))[Math.floor(r() * (opts.length || 3))]); }
  row.minConflictsSolved = check(st).length === 0; row.minConflictsSteps = steps; out.push(row);
}
const agg = (k) => { const by = {}; for (const r of out) (by[r.n] ||= []).push(r[k]); return Object.fromEntries(Object.entries(by).map(([n, v]) => [n, typeof v[0] === 'boolean' ? v.filter(Boolean).length : v.sort((a, b) => a - b)[v.length >> 1]])); };
const summary = Object.fromEntries(['sync8', 'inhibit8', 'random8', 'sync100', 'inhibit100', 'random100', 'minConflictsSolved', 'minConflictsSteps'].map((k) => [k, agg(k)]));
console.log(JSON.stringify({ note: 'median final conflicts per size (solved count for minConflictsSolved, median steps for minConflictsSteps); greedy members, same territories and rules as LI1', summary, cases: out }, null, 1));
