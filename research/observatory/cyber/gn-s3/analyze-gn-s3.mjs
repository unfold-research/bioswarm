// GN-S3 registered analysis (tasks/GN-S3-PREREG.md). Reads results/gn-s3/episodes/*.json (never stage 0) and prints the
// analysis JSON on stdout (the bench writes it to results/gn-s3/analysis.json). Free, no network.
//   node observatory/cyber/gn-s3/analyze-gn-s3.mjs [episodes dir]
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] || 'results/gn-s3/episodes';
const REDS = ['fsm', 'discovery'], RED_NAME = { fsm: 'FiniteStateRedAgent', discovery: 'DiscoveryFSRed' };
const SEEDS = Array.from({ length: 30 }, (_, i) => 77001 + i);
const THRESHOLD = 22, GUARD = 1.10; // per red: at least 22 of 30 seeds; impacts guard 1.10x cd10

const rec = new Map();
for (const f of fs.readdirSync(DIR).filter((f) => /-s\d+\.json$/.test(f))) { const r = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); rec.set(`${r.arm}|${r.red}|${r.seed}`, r); }
const get = (arm, red, seed) => rec.get(`${arm}|${red}|${seed}`);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
function tail(k, n) { let p = 0, c = 1; for (let i = 0; i <= n; i++) { if (i >= k) p += c; c = (c * (n - i)) / (i + 1); } return p / 2 ** n; } // P(X>=k | n, 1/2)

function armStats(arm, red) {
  const rs = SEEDS.map((s) => get(arm, red, s)).filter(Boolean), m = (k) => rs.map((x) => x[k]);
  const acts = {}; for (const x of rs) for (const [k, v] of Object.entries(x.actions || {})) acts[k] = (acts[k] || 0) + v;
  return { arm, red, episodes: rs.length, reward: { mean: r4(mean(m('reward'))), median: median(m('reward')), min: rs.length ? Math.min(...m('reward')) : null, max: rs.length ? Math.max(...m('reward')) : null },
    greenFailBlue: r4(mean(m('green_fail_blue'))), greenFailRed: r4(mean(m('green_fail_red'))), redImpact: r4(mean(m('red_impact'))),
    firstImpactStep: r4(mean(rs.filter((x) => x.first_impact_step != null).map((x) => x.first_impact_step))), redHostsMax: r4(mean(m('red_hosts_max'))), redRootHostsMax: r4(mean(m('red_root_hosts_max'))),
    cueSteps: r4(mean(m('cue_steps'))), sentinelSteps: r4(mean(m('sentinel_steps'))), actionsPerEpisode: Object.fromEntries(Object.entries(acts).map(([k, v]) => [k, r4(v / (rs.length || 1))])) };
}

// one directional comparison under one red: `a` beats `b` on reward over paired seeds; with the two guards for a wins
function compare(a, b, red) {
  let wins = 0, losses = 0, ties = 0, pairs = 0; const ia = [], ib = [], gba = [], gbb = [];
  for (const s of SEEDS) { const x = get(a, red, s), y = get(b, red, s); if (!x || !y) continue; pairs++;
    ia.push(x.red_impact); ib.push(y.red_impact); gba.push(x.green_fail_blue); gbb.push(y.green_fail_blue);
    if (x.reward > y.reward) wins++; else if (x.reward < y.reward) losses++; else ties++; }
  const impactOk = mean(ia) <= GUARD * mean(ib) + 1e-9, greenOk = mean(gba) <= mean(gbb) + 1e-9, won = wins >= THRESHOLD;
  const result = !won ? 'not passed' : !impactOk ? 'reward up, red not stopped' : !greenOk ? 'defends by hurting the business' : 'passed';
  return { red, a, b, pairs, wins, losses, ties, pOneSided: pairs ? r4(tail(wins, wins + losses)) : null, threshold: THRESHOLD,
    meanRedImpactA: r4(mean(ia)), meanRedImpactB: r4(mean(ib)), impactGuardOk: impactOk, meanGreenBlueA: r4(mean(gba)), meanGreenBlueB: r4(mean(gbb)), greenGuardOk: greenOk, result };
}
// opposite direction: cd10 beats the mechanism on >= THRESHOLD seeds (no guards) -> the trait hurts
function opposite(mech, red) { let wins = 0, losses = 0; for (const s of SEEDS) { const x = get('code-cd10', red, s), y = get(mech, red, s); if (!x || !y) continue; if (x.reward > y.reward) wins++; else if (x.reward < y.reward) losses++; } return wins >= THRESHOLD; }

function hypothesis(id, trait, mech, { alsoBeat = null } = {}) {
  const perRed = REDS.map((red) => {
    const main = compare(mech, 'code-cd10', red);
    const extra = alsoBeat ? compare(mech, alsoBeat, red) : null;
    const passed = main.result === 'passed' && (!extra || extra.result === 'passed');
    return { red, vsCd10: main, ...(extra ? { vsControl: extra } : {}), hurts: opposite(mech, red), pass: passed };
  });
  const n = perRed.filter((c) => c.pass).length, hurt = perRed.filter((c) => c.hurts).length;
  return { id, trait, mechanism: mech, ...(alsoBeat ? { alsoBeat } : {}),
    verdict: n === 2 ? 'supported' : n === 1 ? 'red-dependent' : hurt === 2 ? 'hurts under both reds' : hurt === 1 ? 'hurts under one red' : 'not supported', perRed };
}

const ARMS = [...new Set([...rec.values()].map((x) => x.arm))];
const hasSentinel = ARMS.includes('code-sentinel');
const hypotheses = [
  hypothesis('H-GN-S3a', 'SIG-04', 'code-alarm'),
  hypothesis('H-GN-S3b', 'DEF-04', 'code-scaled'),
  ...(hasSentinel ? [hypothesis('H-GN-S3c', 'DEF-07', 'code-sentinel', { alsoBeat: 'code-cd10-qa' })] : [{ id: 'H-GN-S3c', trait: 'DEF-07', mechanism: 'code-sentinel', verdict: 'no channel', perRed: [], note: 'Analyse never changed the view in stage 0; DEF-07 has no channel in CC4 and was not run.' }]),
];
const reds = Object.fromEntries(REDS.map((red) => [red, Object.fromEntries(ARMS.map((a) => [a, armStats(a, red)]))]));
const expected = ARMS.length * REDS.length * SEEDS.length, missing = [];
for (const a of ARMS) for (const red of REDS) for (const s of SEEDS) if (!get(a, red, s)) missing.push(`${a}-${red}-s${s}`);
console.log(JSON.stringify({
  study: 'GN-S3', prereg: 'tasks/GN-S3-PREREG.md', generatedBy: 'observatory/cyber/gn-s3/analyze-gn-s3.mjs', episodes: rec.size, expected, missing, arms: ARMS, reds: RED_NAME,
  rule: `per red: sign test on paired seeds by reward; a mechanism passes with wins >= ${THRESHOLD} of 30 AND mean red Impacts <= ${GUARD}x code-cd10 AND mean blue-attributed green failures <= code-cd10; DEF-07 must pass against both code-cd10 and code-cd10-qa; opposite direction (code-cd10 wins >= ${THRESHOLD}) = the trait hurts; supported under both reds, red-dependent under one`,
  cosignedByCyber: ['H-GN-S3b', 'H-GN-S3c'], hypotheses, armStats: reds,
}, null, 1));
