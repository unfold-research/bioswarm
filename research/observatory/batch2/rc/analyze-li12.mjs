// LI12 verdicts (tasks/LI12-POLARITY-TRACE-PREREG.md), from results/li12-polarity-trace-k{40,80}/analysis.json (feedback and
// scoring are the same strict live check) and state.json.
import fs from 'node:fs';
// Usage: node analyze-li12.mjs [dir prefix, default results/li12-polarity-trace] [sizes, default 40,80] (LI12R: results/li12r-replication 40)
const PRE = process.argv[2] || 'results/li12-polarity-trace', K = (process.argv[3] || '40,80').split(',').map(Number);
// thresholds were registered for 16 cases (two sizes); with one size (LI12R, 8 cases) they scale by half, rounded up
const F = K.length / 2;
const S = Object.fromEntries(K.map((k) => [k, JSON.parse(fs.readFileSync(`${PRE}-k${k}/analysis.json`, 'utf8'))]));
const ST = Object.fromEntries(K.map((k) => [k, JSON.parse(fs.readFileSync(`${PRE}-k${k}/state.json`, 'utf8'))]));
const A = Object.values(S), sum = (f) => A.reduce((n, a) => n + f(a), 0);
const binom = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c; };
const mcnemar = (b, c) => { const n = b + c; if (!n) return 1; const k = Math.min(b, c); let p = 0; for (let i = 0; i <= k; i++) p += binom(n, i); return Math.min(1, 2 * p / 2 ** n); };
const solved = (arm) => sum((a) => a.arms[arm].solved), outTotal = (arm) => sum((a) => a.arms[arm].meanOut * a.arms[arm].of);
const perSolved = (arm) => (solved(arm) ? Math.round(outTotal(arm) / solved(arm)) : 'inf');
const sg = (a, b) => { const w = sum((x) => x.signTests[`${a}_vs_${b}`].lowerIn), l = sum((x) => x.signTests[`${a}_vs_${b}`].higherIn); return { lowerIn: w, higherIn: l, p: mcnemar(w, l) }; };
// act rounds to solve: count waves in which the arm acted (not shared round 0, not manager plan waves) until total = 0
const actRounds = (arm) => Object.fromEntries(K.flatMap((k) => Object.entries(ST[k].arms[arm]).map(([c, s]) => { let n = 0; for (const h of s.history.slice(1)) { if (h.actors > 0 && !(arm === 'manager' && h.acted.length === 0 && h.actors === 1)) n++; if (h.counts.total === 0) return [`${k}:${c}`, n]; } return [`${k}:${c}`, null]; })));
const pr = sg('polarity', 'routed'), sm = sg('stig', 'manager');
const v36 = solved('polarity') >= solved('routed') + Math.ceil(4 * F) && pr.lowerIn > pr.higherIn && pr.p < 0.05 ? 'supported' : solved('polarity') <= solved('routed') ? 'refuted' : 'inconclusive';
const v37 = solved('stig') >= solved('manager') && sm.lowerIn > sm.higherIn && sm.p < 0.05 ? 'supported' : sm.higherIn > sm.lowerIn ? 'refuted' : 'inconclusive';
const v38 = solved('stig') >= solved('polarity') + Math.ceil(3 * F) ? 'supported' : solved('stig') <= solved('polarity') ? 'refuted' : 'inconclusive';
const v39 = solved('stig') >= solved('oracle') - Math.ceil(2 * F) ? 'supported' : 'refuted';
const v40 = perSolved('stig') !== 'inf' && (perSolved('manager') === 'inf' || perSolved('stig') < perSolved('manager')) ? 'supported' : 'refuted';
const traces = Object.fromEntries(K.map((k) => [k, Object.values(ST[k].arms.stig).reduce((n, s) => n + Object.keys(s.traces || {}).length, 0)]));
console.log(JSON.stringify({ solvedBySize: Object.fromEntries(K.map((k) => [k, Object.fromEntries(Object.entries(S[k].arms).map(([n, v]) => [n, v.solved]))])),
  'H-LI36 polarity alone beats the router': { polarity: solved('polarity'), routed: solved('routed'), ...pr, verdict: v36 },
  'H-LI37 agent-written stigmergy beats the manager': { stig: solved('stig'), manager: solved('manager'), ...sm, verdict: v37 },
  'H-LI38 the trace matters': { stig: solved('stig'), polarity: solved('polarity'), verdict: v38 },
  'H-LI39 agent traces come within 2 cases of the oracle': { stig: solved('stig'), oracle: solved('oracle'), verdict: v39 },
  'H-LI40 stigmergy cheaper than the manager per solved case': { stig: perSolved('stig'), manager: perSolved('manager'), routed: perSolved('routed'), polarity: perSolved('polarity'), oracle: perSolved('oracle'), verdict: v40 },
  tracesWritten: traces, actRoundsToSolve: Object.fromEntries(['routed', 'manager', 'polarity', 'oracle', 'stig'].map((a) => [a, actRounds(a)])) }, null, 2));
