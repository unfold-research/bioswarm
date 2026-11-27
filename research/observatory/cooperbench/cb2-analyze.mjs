// CB2 analysis: four arms on the CooperBench flash subset, paired by feature pair.
// Input: results/cb2-cooperbench/pairs.json, written by cb2-extract.py from the harness's result.json and eval.json.
// Usage: node observatory/cooperbench/cb2-analyze.mjs
import fs from 'node:fs';
const dir = new URL('../../results/cb2-cooperbench/', import.meta.url);
const rows = JSON.parse(fs.readFileSync(new URL('pairs.json', dir)));
const ARMS = ['solo', 'none', 'messages', 'field'];
const key = r => `${r.repo}/${r.task}/${r.features.join('_')}`;
const taskOf = r => `${r.repo}/${r.task}`;
const by = Object.fromEntries(ARMS.map(a => [a, new Map(rows.filter(r => r.arm === a).map(r => [key(r), r]))]));
const allPairs = [...by.solo.keys()].sort();
// A pair with no result after its one rerun is scored as failed, as registered, and listed.
const failedTwice = [];
for (const a of ARMS) for (const p of allPairs) if (!by[a].has(p)) {
  const s = by.solo.get(p);
  by[a].set(p, { arm: a, repo: s.repo, task: s.task, features: s.features, both: false, f1: false, f2: false, merge: null, cost: 0, steps: 0, dur: 0, agents: [], noResult: true });
  failedTwice.push({ arm: a, pair: p });
}
for (const a of ARMS) if (by[a].size !== allPairs.length) throw new Error(`arm ${a} has pairs outside the subset`);
let pairs = allPairs;
const tasks = [...new Set(pairs.map(p => taskOf(by.solo.get(p))))].sort();
const ok = (a, p) => by[a].get(p).both === true ? 1 : 0;
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const q = (xs, p) => { const s = [...xs].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * s.length)))]; };
const r3 = x => Math.round(x * 1000) / 1000;
function diff(a, b, seed) {
  const d = pairs.map(p => ok(a, p) - ok(b, p));
  const point = d.reduce((s, x) => s + x, 0) / d.length;
  const rnd = mulberry32(seed), B = 4000;
  // By task: resample the 20 tasks, keep every pair of a drawn task.
  const groups = tasks.map(t => pairs.map((p, i) => taskOf(by.solo.get(p)) === t ? d[i] : null).filter(x => x !== null));
  const byTask = [], byPair = [];
  for (let i = 0; i < B; i++) {
    let s = 0, n = 0;
    for (let j = 0; j < groups.length; j++) { const g = groups[Math.floor(rnd() * groups.length)]; for (const x of g) { s += x; n++; } }
    byTask.push(s / n);
    let s2 = 0; for (let j = 0; j < d.length; j++) s2 += d[Math.floor(rnd() * d.length)];
    byPair.push(s2 / d.length);
  }
  return { a, b, diff: r3(point), byTask: [r3(q(byTask, 0.025)), r3(q(byTask, 0.975))], byPair: [r3(q(byPair, 0.025)), r3(q(byPair, 0.975))], aOnly: d.filter(x => x === 1).length, bOnly: d.filter(x => x === -1).length };
}
const sum = (xs, f) => xs.reduce((s, x) => s + (f(x) || 0), 0);
const arms = Object.fromEntries(ARMS.map(a => {
  const rs = pairs.map(p => by[a].get(p)), ag = rs.flatMap(r => r.agents);
  const failed = rs.filter(r => r.both !== true), conflicts = rs.filter(r => r.merge === 'conflicts');
  return [a, {
    pairs: rs.length, both: rs.filter(r => r.both === true).length, share: r3(rs.filter(r => r.both === true).length / rs.length),
    feature1: rs.filter(r => r.f1 === true).length, feature2: rs.filter(r => r.f2 === true).length,
    mergeConflicts: a === 'solo' ? null : conflicts.length,
    failures: failed.length, failuresWithConflict: a === 'solo' ? null : failed.filter(r => r.merge === 'conflicts').length,
    passedDespiteConflict: a === 'solo' ? null : conflicts.filter(r => r.both === true).length,
    cleanMergeBoth: a === 'solo' ? null : rs.filter(r => r.merge === 'clean' && r.both === true).length, cleanMerge: a === 'solo' ? null : rs.filter(r => r.merge === 'clean').length,
    costUsd: r3(sum(rs, r => r.cost)), steps: sum(rs, r => r.steps), inputTokens: sum(ag, x => x.input_tokens), outputTokens: sum(ag, x => x.output_tokens), cacheReadTokens: sum(ag, x => x.cache_read_tokens),
    agentSeconds: sum(rs, r => r.dur), agentStatus: ag.reduce((m, x) => (m[x.status] = (m[x.status] || 0) + 1, m), {}),
    noResult: rs.filter(r => r.noResult).map(key),
  }];
}));
const coop = ['none', 'messages', 'field'], best = coop.reduce((m, a) => arms[a].both > arms[m].both ? a : m);
const tests = { H1: diff('field', 'messages', 71001), H2: diff('messages', 'none', 71002), H3: diff('field', 'none', 71003), H4: diff(best, 'solo', 71004) };
const above = t => t.byTask[0] > 0;
const verdicts = {
  H1: above(tests.H1) ? 'supported' : 'not supported', H2: above(tests.H2) ? 'refuted' : 'supported',
  H3: above(tests.H3) ? 'supported' : 'not supported', H4: above(tests.H4) ? 'refuted' : 'supported',
};
const extra = { fieldMinusSolo: diff('field', 'solo', 71005), messagesMinusSolo: diff('messages', 'solo', 71006), noneMinusSolo: diff('none', 'solo', 71007) };
const perRepo = Object.fromEntries([...new Set(pairs.map(p => by.solo.get(p).repo))].sort().map(repo => [repo, Object.fromEntries(ARMS.map(a => [a, pairs.filter(p => by[a].get(p).repo === repo && ok(a, p)).length]).concat([['pairs', pairs.filter(p => by.solo.get(p).repo === repo).length]]))]));
// Sensitivity: the same differences with the pairs that have no result in some arm left out of every arm.
const dropped = new Set(failedTwice.map(f => f.pair));
pairs = allPairs.filter(p => !dropped.has(p));
const sensitivity = { pairs: pairs.length, both: Object.fromEntries(ARMS.map(a => [a, pairs.filter(p => ok(a, p)).length])), H1: diff('field', 'messages', 71001), H3: diff('field', 'none', 71003), H4: diff(best, 'solo', 71004), fieldMinusSolo: diff('field', 'solo', 71005) };
pairs = allPairs;
const out = { pairs: pairs.length, tasks: tasks.length, arms, tests, verdicts, bestCoop: best, extra, failedTwice, sensitivity, perRepo };
fs.writeFileSync(new URL('summary.json', dir), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ failedTwice, sensitivity, arms: Object.fromEntries(ARMS.map(a => [a, [arms[a].both, arms[a].mergeConflicts, arms[a].costUsd]])), tests, verdicts, extra }));
