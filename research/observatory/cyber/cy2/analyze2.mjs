// CY2 registered analysis (tasks/CY2-PREREG.md). Reads results/cy2/episodes/*.json (never the pilot) and prints the
// analysis JSON on stdout (the research bench writes it to results/cy2/analysis.json). Free, no network.
//   node observatory/cyber/cy2/analyze2.mjs [episodes dir]
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] || 'results/cy2/episodes';
const ARMS = ['code-react', 'code-cd10', 'llm-plain', 'llm-doctrine'], REDS = ['fsm', 'discovery'];
const RED_NAME = { fsm: 'FiniteStateRedAgent', discovery: 'DiscoveryFSRed' };
const SEEDS = Array.from({ length: 30 }, (_, i) => 74001 + i);
const THRESHOLD = 21, GUARD = 1.10; // at least 21 of 30 seeds per red (Bonferroni over two reds); Impacts guard 1.10x

const rec = new Map();
for (const f of fs.readdirSync(DIR).filter((f) => /-s\d+\.json$/.test(f))) {
  const r = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); rec.set(`${r.arm}|${r.red}|${r.seed}`, r);
}
const get = (arm, red, seed) => rec.get(`${arm}|${red}|${seed}`);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
// exact one-sided binomial tail P(X >= k | n, 1/2)
function tail(k, n) { let p = 0, c = 1; for (let i = 0; i <= n; i++) { if (i >= k) p += c; c = (c * (n - i)) / (i + 1); } return p / 2 ** n; }

function armStats(arm, red) {
  const rs = SEEDS.map((s) => get(arm, red, s)).filter(Boolean), m = (k) => rs.map((r) => r[k]);
  const sum = (f) => rs.reduce((n, r) => n + f(r), 0);
  const acts = {}; for (const r of rs) for (const [k, v] of Object.entries(r.actions)) acts[k] = (acts[k] || 0) + v;
  const calls = sum((r) => r.calls);
  return { arm, red, episodes: rs.length, reward: { mean: r4(mean(m('reward'))), median: median(m('reward')), min: rs.length ? Math.min(...m('reward')) : null, max: rs.length ? Math.max(...m('reward')) : null },
    greenFail: r4(mean(m('green_fail'))), greenFailBlue: r4(mean(m('green_fail_blue'))), greenFailRed: r4(mean(m('green_fail_red'))),
    redImpact: r4(mean(m('red_impact'))), firstImpactStep: r4(mean(rs.filter((r) => r.first_impact_step != null).map((r) => r.first_impact_step))), noImpactEpisodes: rs.filter((r) => r.first_impact_step == null).length,
    redHostsMax: r4(mean(m('red_hosts_max'))), redRootHostsMax: r4(mean(m('red_root_hosts_max'))), actionsPerEpisode: Object.fromEntries(Object.entries(acts).map(([k, v]) => [k, r4(v / (rs.length || 1))])),
    cueSteps: r4(mean(m('cue_steps'))), calls: r4(mean(m('calls'))), invalid: sum((r) => r.invalid), invalidShare: calls ? r4(sum((r) => r.invalid) / calls) : null,
    departuresFromCd10: calls ? r4(sum((r) => r.departures) / calls) : null,
    tokensPerEpisode: rs.length && rs[0].tokens ? Object.fromEntries(Object.keys(rs[0].tokens).map((k) => [k, r4(sum((r) => r.tokens[k]) / rs.length)])) : null,
    usdPerEpisode: r4(mean(m('usd'))), usdTotal: r4(sum((r) => r.usd)) };
}

// one directional comparison under one red: a beats b on paired seeds
function compare(a, b, red, guarded = true) {
  let wins = 0, losses = 0, ties = 0, pairs = 0; const ia = [], ib = [];
  for (const s of SEEDS) {
    const x = get(a, red, s), y = get(b, red, s); if (!x || !y) continue;
    pairs++; ia.push(x.red_impact); ib.push(y.red_impact);
    if (x.reward > y.reward) wins++; else if (x.reward < y.reward) losses++; else ties++;
  }
  const n = wins + losses, mi = mean(ia), mj = mean(ib);
  const guardOk = mi != null && mi <= GUARD * mj + 1e-12, won = wins >= THRESHOLD;
  return { red, a, b, pairs, wins, losses, ties, pOneSided: n ? r4(tail(wins, n)) : null, threshold: THRESHOLD, meanRedImpactA: r4(mi), meanRedImpactB: r4(mj), guarded, guardOk: guarded ? guardOk : null,
    result: !won ? 'not passed' : !guarded || guardOk ? 'passed' : 'reward up, red not stopped' };
}
// the impacts guard applies to H1 and H2, not to H2' (amendment of 2026-11-20)
function hypothesis(id, title, a, b, guarded = true) {
  const perRed = REDS.map((red) => compare(a, b, red, guarded)), passed = perRed.filter((c) => c.result === 'passed').length;
  return { id, title, a, b, verdict: passed === 2 ? 'supported' : passed === 1 ? 'red-dependent' : 'not supported', perRed };
}

const hypotheses = [
  hypothesis('CY2-H1', 'The doctrine helps an LLM team: llm-doctrine has a higher reward than llm-plain', 'llm-doctrine', 'llm-plain'),
  hypothesis('CY2-H2', 'The LLM adds something over the rule: llm-doctrine has a higher reward than code-cd10', 'llm-doctrine', 'code-cd10'),
  hypothesis('CY2-H2p', "H2', the rule beats the LLM: code-cd10 has a higher reward than llm-doctrine", 'code-cd10', 'llm-doctrine', false),
];
const expected = ARMS.length * REDS.length * SEEDS.length;
const missing = []; for (const a of ARMS) for (const r of REDS) for (const s of SEEDS) if (!get(a, r, s)) missing.push(`${a}-${r}-s${s}`);
const reds = Object.fromEntries(REDS.map((r) => [r, Object.fromEntries(ARMS.map((a) => [a, armStats(a, r)]))]));
const paid = [...rec.values()].filter((r) => r.calls > 0);
console.log(JSON.stringify({
  study: 'CY2', prereg: 'tasks/CY2-PREREG.md', generatedBy: 'observatory/cyber/cy2/analyze2.mjs', episodes: rec.size, expected, missing,
  rule: `per red: sign test on paired seeds, ties dropped; passed if wins >= ${THRESHOLD} of 30 (one-sided P(X>=21|30)=${r4(tail(21, 30))}) and, for H1 and H2 only, the winner's mean red Impacts <= ${GUARD} x the loser's; supported under both reds, red-dependent under one, not supported under neither`,
  reds: RED_NAME, calls: { model: 'claude-haiku-5-5', temperature: '1.0 (API default; amendment of 2026-11-20)', maxTokens: 200, thinking: false, validReply: 'exact label after trimming leading and trailing whitespace' },
  hypotheses,
  arms: reds,
  spend: { episodes: paid.length, usd: r4(paid.reduce((n, r) => n + r.usd, 0)), calls: paid.reduce((n, r) => n + r.calls, 0), invalid: paid.reduce((n, r) => n + r.invalid, 0) },
}, null, 1));
