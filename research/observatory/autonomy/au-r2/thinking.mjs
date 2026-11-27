// AU-R2 (programs/autonomy.md, agenda item 2): where thinking goes in the batch instrument. Exploratory reanalysis, not a
// registered test. No model calls: it only reads raw batch files already paid for (restored from R2 with scripts/raw.sh).
// For every reply of LI24, LI26, LI27 and LI33 to LI38 (batch instrument; LI37 is a Colony study and has no batch files):
// thinking tokens, output tokens, stop reason, role (start, member, plan), the reply's outcome (its module's checks after
// the wave, from state.json history) and its case's final outcome. Tests AU-E2 (failing replies spend a larger share of
// output on thinking), checks LI35's economy label, and estimates per-case variance of `stigwait` at 80 modules to size
// the AU1 pilot (6 cases per arm).
// Usage (from the repo root, raw files restored first):
//   for d in li24-k80 li24-k120 li26-k160 li27-k80 li27-k160 li33-k80 li33-k160 li34-k80 li34-k120 li35-k40 li36-k120 li38-k160; do scripts/raw.sh get results/$d; done
//   node observatory/autonomy/au-r2/thinking.mjs            -> results/au-r2/analysis.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { usageCostFor } from '../../lab007-economy/pricing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const RES = path.join(ROOT, 'results'), SWEEPS = path.join(ROOT, 'observatory/batch2/rc/sweeps');
const DIRS = ['li24-k80', 'li24-k120', 'li26-k160', 'li27-k80', 'li27-k160', 'li33-k80', 'li33-k160', 'li34-k80', 'li34-k120', 'li35-k40', 'li36-k120', 'li38-k160'];
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
const readj = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
const mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null);
const sd = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((n, x) => n + (x - m) ** 2, 0) / (a.length - 1)); };
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const modsOf = (id) => [...id.matchAll(/M(\d+)\./g)].map((x) => Number(x[1]) - 1);
const ID = /^(.+?)-(k\d+s\d+)(?:-w(\d+))?-(m\d+|plan)(?:-v\d+)?$/;

// ---------- statistics ----------
function normCdf(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function lgamma(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const q of c) s += q / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break; } return h; }
function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
const tCdf = (t, df) => { const x = df / (df + t * t), p = 0.5 * ibeta(df / 2, 0.5, x); return t > 0 ? 1 - p : p; };
const tInv = (p, df) => { let lo = -50, hi = 50; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (tCdf(m, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
// minimal detectable difference (two-sided alpha, power) in SD units: two independent arms of n, or paired on n cases
const mddTwo = (n, alpha = 0.05, power = 0.8) => (tInv(1 - alpha / 2, 2 * n - 2) + tInv(power, 2 * n - 2)) * Math.sqrt(2 / n);
const mddPaired = (n, alpha = 0.05, power = 0.8) => (tInv(1 - alpha / 2, n - 1) + tInv(power, n - 1)) / Math.sqrt(n);
// Mann-Whitney U (normal approximation with tie correction): z > 0 when x tends to be larger than y
function mannWhitney(x, y) {
  const all = x.map((v) => [v, 0]).concat(y.map((v) => [v, 1])).sort((a, b) => a[0] - b[0]), n1 = x.length, n2 = y.length, N = n1 + n2;
  if (!n1 || !n2) return null; let r1 = 0, ties = 0;
  for (let i = 0; i < N;) { let j = i; while (j < N && all[j][0] === all[i][0]) j++; const rank = (i + j + 1) / 2, t = j - i; ties += t ** 3 - t; for (let q = i; q < j; q++) if (all[q][1] === 0) r1 += rank; i = j; }
  const U = r1 - n1 * (n1 + 1) / 2, mu = n1 * n2 / 2, sig = Math.sqrt(n1 * n2 / 12 * (N + 1 - ties / (N * (N - 1))));
  const z = sig ? (U - mu) / sig : 0; return { n1, n2, auc: r4(U / (n1 * n2)), z: r4(z), p: r4(2 * (1 - normCdf(Math.abs(z)))) };
}
// Fisher exact, two-sided (sum of tables no more likely than the observed one)
function fisher(a, n1, c, n2) {
  const lc = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1), s = a + c, N = n1 + n2, lo = Math.max(0, s - n2), hi = Math.min(s, n1);
  const pr = (x) => Math.exp(lc(n1, x) + lc(n2, s - x) - lc(N, s)), p0 = pr(a); let p = 0; for (let x = lo; x <= hi; x++) { const q = pr(x); if (q <= p0 * (1 + 1e-9)) p += q; } return Math.min(1, p);
}
// exact power of Fisher's test with n per arm, true solve probabilities p1 (default effort) and p2 (lower effort)
function fisherPower(n, p1, p2, alpha = 0.05) {
  const bin = (k, p) => Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)) * p ** k * (1 - p) ** (n - k); let pw = 0;
  for (let a = 0; a <= n; a++) for (let c = 0; c <= n; c++) if (fisher(a, n, c, n) <= alpha) pw += bin(a, p1) * bin(c, p2); return pw;
}
const pearson = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };

// ---------- read every reply ----------
const replies = []; // { dir, study, arm, role, inst, wave, m, out, think, stop, usd, modPass, improved, caseSolved }
const cases = {}; // `${dir}|${arm}|${inst}` -> per-case record
const studyInfo = {};
for (const dir of DIRS) {
  const d = path.join(RES, dir), cfg = readj(path.join(SWEEPS, `${dir}.json`));
  if (!fs.existsSync(path.join(d, 'state.json'))) throw Error(`${dir}: raw files not restored (scripts/raw.sh get results/${dir})`);
  const st = readj(path.join(d, 'state.json')), hold = fs.existsSync(path.join(d, 'holdout.json')) ? readj(path.join(d, 'holdout.json')) : null;
  const study = dir.split('-')[0].toUpperCase(), swarm = cfg.arms.filter((a) => a !== 'solo');
  const reqMeta = {}, effortSeen = {};
  for (const f of fs.readdirSync(d).filter((f) => /^wave-\d+(-p\d+)?\.requests\.jsonl$/.test(f))) for (const l of lines(path.join(d, f))) {
    const id = l.match(/"custom_id":"([^"]+)"/)?.[1], eff = l.match(/"effort":"(low|medium|high|max)"/)?.[1] || 'default', model = l.match(/"model":"([^"]+)"/)?.[1], mt = Number(l.match(/"max_tokens":(\d+)/)?.[1]);
    const role = id.startsWith('start-') ? 'start' : id.endsWith('-plan') ? 'plan' : 'member'; reqMeta[id] = { eff, mt }; const key = `${role}|${model}|${eff}|${mt}`; effortSeen[key] = (effortSeen[key] || 0) + 1;
  }
  const modelsSeen = {};
  for (const f of fs.readdirSync(d).filter((f) => /^wave-\d+(-p\d+)?\.results\.jsonl$/.test(f))) for (const l of lines(path.join(d, f))) {
    const x = JSON.parse(l), msg = x.result?.message, g = x.custom_id.match(ID); if (!g) throw Error(`${dir}: unparsed id ${x.custom_id}`);
    const [, arm, inst, w, mm] = g, wave = w == null ? 0 : Number(w), role = arm === 'start' ? 'start' : mm === 'plan' ? 'plan' : 'member', m = mm === 'plan' ? null : Number(mm.slice(1));
    if (!msg) { replies.push({ dir, study, arm, role, inst, wave, m, failed: true }); continue; }
    modelsSeen[msg.model] = (modelsSeen[msg.model] || 0) + 1;
    const u = msg.usage || {}, out = u.output_tokens || 0, think = u.output_tokens_details?.thinking_tokens || 0;
    replies.push({ dir, study, arm, role, inst, wave, m, model: msg.model, out, think, stop: msg.stop_reason, usd: usageCostFor(msg.model, u), usdHaiku: usageCostFor('claude-haiku-5-5', u), effort: reqMeta[x.custom_id]?.eff });
  }
  // outcomes: a member (or start) reply passes when no check involving its module fails after its wave; a plan improves
  // when the failing count after the act wave that follows it is below the count before the plan
  const histOf = (arm, inst) => st.arms[arm]?.[inst]?.history || [];
  for (const r of replies.filter((q) => q.dir === dir && !q.failed)) {
    const tArm = r.arm === 'start' ? swarm[0] : r.arm, h = histOf(tArm, r.inst), after = h.find((e) => e.wave === r.wave);
    if (r.role !== 'plan') { if (after) r.modPass = !after.failing.some((id) => modsOf(id).includes(r.m)); }
    else { const before = h.filter((e) => e.wave < r.wave).at(-1), act = h.find((e) => e.wave === r.wave + 1); if (before && act) r.improved = act.counts.total < before.counts.total; }
    r.caseSolved = r.arm === 'start' ? null : !!st.arms[r.arm]?.[r.inst]?.solved;
  }
  // per case: solved, fresh-input (holdout) failing checks, act rounds to zero, output, thinking, cost (own arm + its start)
  const byInst = {}; for (const q of replies) if (q.dir === dir && !q.failed) (byInst[q.inst] ||= []).push(q);
  for (const arm of swarm) for (const [inst, s] of Object.entries(st.arms[arm] || {})) {
    const mine = (byInst[inst] || []).filter((q) => q.arm === arm || q.arm === 'start');
    const z = s.history.find((e) => e.counts.total === 0), rounds = arm === 'manager' ? null : z ? z.wave : null;
    const sum = (f, pred = () => true) => mine.filter(pred).reduce((n, q) => n + f(q), 0);
    cases[`${dir}|${arm}|${inst}`] = { dir, study, arm, inst, solved: !!s.solved, holdoutFailing: hold?.[arm]?.perCase?.[inst] ?? null,
      freshPass: hold?.[arm]?.perCase?.[inst] == null ? null : !!s.solved && hold[arm].perCase[inst] === 0, actRoundsToZero: rounds, censoredAt: z ? null : cfg.rounds + 1,
      out: sum((q) => q.out), think: sum((q) => q.think), usd: sum((q) => q.usd), usdArm: sum((q) => q.usd, (q) => q.arm === arm), usdStart: sum((q) => q.usd, (q) => q.arm === 'start'),
      outArm: sum((q) => q.out, (q) => q.arm === arm), thinkArm: sum((q) => q.think, (q) => q.arm === arm), memberThink: sum((q) => q.think, (q) => q.role === 'member'), trunc: mine.filter((q) => q.stop === 'max_tokens').length };
  }
  studyInfo[dir] = { study, k: cfg.k, cases: cfg.cases, arms: cfg.arms, model: cfg.model, effort: cfg.effort ?? 'default', managerEffort: cfg.managerEffort ?? cfg.effort ?? 'default', memberMax: cfg.memberMax, managerMax: cfg.managerMax, rounds: cfg.rounds, modelsInResults: modelsSeen, requestsByRoleModelEffortMax: effortSeen, holdout: !!hold };
}

// ---------- 1. thinking by role ----------
const ok = replies.filter((q) => !q.failed);
const share = (qs) => { const o = qs.reduce((n, q) => n + q.out, 0); return o ? r4(qs.reduce((n, q) => n + q.think, 0) / o) : null; };
const group = (qs, keyf) => { const g = {}; for (const q of qs) (g[keyf(q)] ||= []).push(q); return g; };
const byRole = {};
for (const [key, qs] of Object.entries(group(ok, (q) => `${q.dir}|${q.arm === 'start' ? 'start' : q.arm}|${q.role}`))) {
  const [dir, arm, role] = key.split('|'), withO = qs.filter((q) => q.modPass != null), plans = qs.filter((q) => q.improved != null);
  (byRole[dir] ||= []).push({ arm, role, replies: qs.length, meanOut: Math.round(mean(qs.map((q) => q.out))), meanThinking: Math.round(mean(qs.map((q) => q.think))), medianThinking: median(qs.map((q) => q.think)),
    thinkingShare: share(qs), zeroThinking: qs.filter((q) => q.think === 0).length, truncated: qs.filter((q) => q.stop === 'max_tokens').length,
    truncatedThinkingShare: share(qs.filter((q) => q.stop === 'max_tokens')), modulePassRate: withO.length ? r4(withO.filter((q) => q.modPass).length / withO.length) : null,
    planImprovedRate: plans.length ? r4(plans.filter((q) => q.improved).length / plans.length) : null });
}

// ---------- 2. AU-E2: thinking share of failing vs passing replies ----------
// Pooled comparisons mix waves (later waves face harder residual checks) and studies, so the primary exploratory reading
// is stratified: within (study size, arm, role, wave), the difference in mean thinking share between failing and passing
// replies, combined with weights n_f*n_p/(n_f+n_p); and the count of strata where failing replies think more (sign).
const ts = (q) => (q.out ? q.think / q.out : null);
function e2(qs, outcome) {
  const lab = qs.filter((q) => q[outcome] != null && q.out > 0 && q.stop !== 'max_tokens'), strata = group(lab, (q) => `${q.dir}|${q.arm}|${q.role}|${q.wave}`);
  let wsum = 0, dsum = 0, dThinkSum = 0, more = 0, less = 0, n = 0; const perStudy = {};
  for (const [key, xs] of Object.entries(strata)) {
    const f = xs.filter((q) => !q[outcome]), p = xs.filter((q) => q[outcome]); if (f.length < 3 || p.length < 3) continue;
    const d = mean(f.map(ts)) - mean(p.map(ts)), dT = mean(f.map((q) => q.think)) - mean(p.map((q) => q.think)), w = f.length * p.length / (f.length + p.length);
    wsum += w; dsum += w * d; dThinkSum += w * dT; n++; if (d > 0) more++; else if (d < 0) less++;
    const s = (perStudy[key.split('|')[0].split('-')[0].toUpperCase()] ||= { w: 0, d: 0, dT: 0, strata: 0, more: 0 }); s.w += w; s.d += w * d; s.dT += w * dT; s.strata++; if (d > 0) s.more++;
  }
  // sign test on strata (two-sided, binomial 0.5)
  const k = Math.min(more, less), N = more + less; let p = 0; for (let i = 0; i <= k; i++) p += Math.exp(lgamma(N + 1) - lgamma(i + 1) - lgamma(N - i + 1) - N * Math.log(2)); p = Math.min(1, 2 * p);
  const f = lab.filter((q) => !q[outcome]), pz = lab.filter((q) => q[outcome]);
  return { labelled: lab.length, failing: f.length, passing: pz.length, pooled: { failShare: share(f), passShare: share(pz), failMeanThinking: Math.round(mean(f.map((q) => q.think)) || 0), passMeanThinking: Math.round(mean(pz.map((q) => q.think)) || 0), mannWhitneyShare: mannWhitney(f.map(ts), pz.map(ts)) },
    stratified: { strata: n, weightedDiffShare: r4(dsum / wsum), weightedDiffThinkingTokens: Math.round(dThinkSum / wsum), failThinksMore: more, failThinksLess: less, signTestP: r4(p) },
    perStudy: Object.fromEntries(Object.entries(perStudy).map(([s, x]) => [s, { strata: x.strata, failThinksMore: x.more, weightedDiffShare: r4(x.d / x.w), weightedDiffThinkingTokens: Math.round(x.dT / x.w) }])) };
}
const haikuDefault = ok.filter((q) => studyInfo[q.dir].model === 'claude-haiku-5-5' && studyInfo[q.dir].effort === 'default');
const e2Reply = { note: 'truncated replies excluded here (reported in truncation); LI35 (Sonnet, low effort) reported separately',
  memberModule: e2(haikuDefault.filter((q) => q.role === 'member'), 'modPass'), startModule: e2(haikuDefault.filter((q) => q.role === 'start'), 'modPass'), planImproved: e2(haikuDefault.filter((q) => q.role === 'plan'), 'improved'),
  memberCaseSolved: e2(haikuDefault.filter((q) => q.role === 'member'), 'caseSolved'), li35Member: e2(ok.filter((q) => q.study === 'LI35' && q.role === 'member'), 'modPass') };
// case level: within (study size, arm), thinking share of the arm's own replies in unsolved vs solved cases
const caseList = Object.values(cases);
const e2Case = [];
for (const [key, cs] of Object.entries(group(caseList, (c) => `${c.dir}|${c.arm}`))) {
  const u = cs.filter((c) => !c.solved), s = cs.filter((c) => c.solved), sh = (c) => (c.outArm ? c.thinkArm / c.outArm : null);
  e2Case.push({ dir: key.split('|')[0], arm: key.split('|')[1], solved: s.length, unsolved: u.length, solvedShare: s.length ? r4(mean(s.map(sh))) : null, unsolvedShare: u.length ? r4(mean(u.map(sh))) : null });
}
// arm level: per study size and arm, solved share and thinking share (the LI33 polarity prior)
const e2CaseSummary = { comparisons: e2Case.filter((x) => x.solvedShare != null && x.unsolvedShare != null).length, unsolvedThinksMore: e2Case.filter((x) => x.solvedShare != null && x.unsolvedShare != null && x.unsolvedShare > x.solvedShare).length };
const e2Arm = Object.entries(group(caseList, (c) => `${c.dir}|${c.arm}`)).map(([key, cs]) => { const qs = ok.filter((q) => `${q.dir}|${q.arm}` === key);
  return { dir: key.split('|')[0], arm: key.split('|')[1], solved: cs.filter((c) => c.solved).length, of: cs.length, thinkingShare: share(qs), truncated: qs.filter((q) => q.stop === 'max_tokens').length }; });
const armPairs = e2Arm.filter((a) => studyInfo[a.dir].effort === 'default'); const rho = pearson(armPairs.map((a) => a.solved / a.of), armPairs.map((a) => a.thinkingShare));

// ---------- 3. truncation ----------
const truncation = Object.entries(group(ok, (q) => `${q.study}|${q.role}`)).map(([key, qs]) => { const t = qs.filter((q) => q.stop === 'max_tokens'), tl = t.filter((q) => q.modPass != null);
  return { study: key.split('|')[0], role: key.split('|')[1], replies: qs.length, truncated: t.length, rate: r4(t.length / qs.length), truncatedThinkingShare: share(t), notTruncatedThinkingShare: share(qs.filter((q) => q.stop !== 'max_tokens')), truncatedModulePass: tl.length ? r4(tl.filter((q) => q.modPass).length / tl.length) : null }; });

// ---------- 4. LI35 check ----------
const li35 = ok.filter((q) => q.study === 'LI35'), eco35 = readj(path.join(RES, 'li35/economy.json'));
const li35Check = { economyModelLabel: eco35.model, sweepModel: studyInfo['li35-k40'].model, sweepEffort: studyInfo['li35-k40'].effort, modelsInResults: studyInfo['li35-k40'].modelsInResults,
  requestEfforts: studyInfo['li35-k40'].requestsByRoleModelEffortMax,
  thinkingShareByArm: Object.fromEntries(Object.entries(group(li35, (q) => q.arm)).map(([a, qs]) => [a, share(qs)])),
  costByArm: Object.fromEntries(Object.entries(group(li35, (q) => q.arm)).map(([a, qs]) => [a, { atReplyModelPrice: r4(qs.reduce((n, q) => n + q.usd, 0)), ifPricedAsHaiku: r4(qs.reduce((n, q) => n + q.usdHaiku, 0)), economyFile: eco35.perArm[a]?.costUsd ?? null }])),
  zeroThinkingReplies: li35.filter((q) => q.think === 0).length, replies: li35.length };

// ---------- 5. AU1 effect size: per-case variance of stigwait (Haiku 5.5, default effort, strict, 6 act rounds) ----------
const N1 = 6, ALPHA = 0.05, ALPHA_HOLM = 0.025, POWER = 0.8;
const metricsOf = (cs) => {
  const v = (f) => cs.map(f).filter((x) => x != null && Number.isFinite(x)), d = (xs, unit) => ({ n: xs.length, mean: r4(mean(xs)), sd: r4(sd(xs)), cv: xs.length > 1 && mean(xs) ? r4(sd(xs) / mean(xs)) : null, min: r4(Math.min(...xs)), max: r4(Math.max(...xs)), unit });
  const rounds = cs.map((c) => c.actRoundsToZero ?? c.censoredAt);
  return { cases: cs.length, solved: cs.filter((c) => c.solved).length, freshPass: cs.filter((c) => c.freshPass).length, freshKnown: cs.filter((c) => c.freshPass != null).length,
    actRounds: d(rounds, 'act rounds to zero failing checks (unsolved counted as rounds + 1)'), usdPerCase: d(v((c) => c.usd), 'US$ per case, arm + its start wave'), usdArmPerCase: d(v((c) => c.usdArm), 'US$ per case, arm only'),
    outPerCase: d(v((c) => c.out), 'output tokens per case, arm + start'), logOut: d(v((c) => Math.log(c.out)), 'ln output tokens'), logUsd: d(v((c) => Math.log(c.usd)), 'ln US$'),
    memberThinkPerCase: d(v((c) => c.memberThink), 'member thinking tokens per case'), holdoutFailing: d(v((c) => c.holdoutFailing), 'fresh-input failing checks per case') };
};
const sw80 = ['li34-k80', 'li33-k80', 'li27-k80', 'li24-k80'];
const au1Sources = Object.fromEntries(['li34-k80', 'li34-k120', 'li33-k80', 'li27-k80', 'li24-k80', 'li36-k120', 'li38-k160'].map((dir) => [dir, metricsOf(caseList.filter((c) => c.dir === dir && c.arm === 'stigwait'))]));
const pooled80 = metricsOf(caseList.filter((c) => sw80.includes(c.dir) && c.arm === 'stigwait'));
// paired correlation proxy: the same instances under two close arms (LI27 stigwait vs stigwait_both; LI33 stigwait vs oracle)
const pairCorr = (dir, a, b, f) => { const xs = [], ys = []; for (const c of caseList.filter((c) => c.dir === dir && c.arm === a)) { const o = cases[`${dir}|${b}|${c.inst}`]; if (o) { xs.push(f(c)); ys.push(f(o)); } } return { n: xs.length, r: r4(pearson(xs, ys)) }; };
const pairs = { 'li27-k80 stigwait~stigwait_both': { logOut: pairCorr('li27-k80', 'stigwait', 'stigwait_both', (c) => Math.log(c.out)), logUsd: pairCorr('li27-k80', 'stigwait', 'stigwait_both', (c) => Math.log(c.usd)) },
  'li27-k160 stigwait~stigwait_both': { logOut: pairCorr('li27-k160', 'stigwait', 'stigwait_both', (c) => Math.log(c.out)), logUsd: pairCorr('li27-k160', 'stigwait', 'stigwait_both', (c) => Math.log(c.usd)) },
  'li33-k80 stigwait~oracle': { logOut: pairCorr('li33-k80', 'stigwait', 'oracle', (c) => Math.log(c.out)), logUsd: pairCorr('li33-k80', 'stigwait', 'oracle', (c) => Math.log(c.usd)) } };
const kTwo = mddTwo(N1, ALPHA, POWER), kTwoHolm = mddTwo(N1, ALPHA_HOLM, POWER), kPair = mddPaired(N1, ALPHA, POWER), kPairHolm = mddPaired(N1, ALPHA_HOLM, POWER);
const mddFor = (m, sdv, unit) => ({ unit, sd: r4(sdv), independent: r4(kTwo * sdv), independentHolm: r4(kTwoHolm * sdv), ...(m != null ? { relToMean: r4(kTwo * sdv / m), relToMeanHolm: r4(kTwoHolm * sdv / m) } : {}) });
const ref = au1Sources['li34-k80'], sdMax = (f) => Math.max(...[ref, pooled80].map(f).filter((x) => x != null));
const rhoMin = Math.min(...Object.entries(pairs).filter(([k]) => k.includes('-k80')).map(([, p]) => p.logOut.r).filter((x) => x != null)); // 80-module pairs only
const sdLogOut = sdMax((x) => x.logOut.sd), sdLogUsd = sdMax((x) => x.logUsd.sd), sdRounds = sdMax((x) => x.actRounds.sd);
const fisherGrid = [1, 0.9583, 0.9].map((p1) => ({ p1, p2At80Power: (() => { for (let p2 = p1; p2 >= 0; p2 = r4(p2 - 0.01)) if (fisherPower(N1, p1, p2, ALPHA) >= POWER) return r4(p2); return null; })(),
  minSignificantContrast: (() => { for (let c = N1; c >= 0; c--) if (fisher(N1, N1, c, N1) <= ALPHA) return `${N1}/${N1} vs ${c}/${N1}`; return null; })() }));
const au1 = {
  design: 'AU1 pilot as planned: Haiku 5.5, LI34 80-module shape, strict check, stigwait, 6 cases per effort arm (low, medium, default), each with its own start wave',
  multipliers: { note: 'minimal detectable difference = multiplier x SD (t-based, power 0.8)', independentAlpha05: r4(kTwo), independentAlpha025Holm: r4(kTwoHolm), pairedAlpha05: r4(kPair), pairedAlpha025Holm: r4(kPairHolm) },
  sources: au1Sources, pooled80Stigwait: pooled80, pairedCorrelationProxy: pairs,
  mdd: {
    actRounds: mddFor(ref.actRounds.mean, sdRounds, 'act rounds'),
    usdPerCase: mddFor(ref.usdPerCase.mean, sdMax((x) => x.usdPerCase.sd), 'US$ per case'),
    outPerCase: mddFor(ref.outPerCase.mean, sdMax((x) => x.outPerCase.sd), 'output tokens per case'),
    logOut: { ...mddFor(null, sdLogOut, 'ln output tokens'), ratioIndependent: r4(Math.exp(-kTwo * sdLogOut)), ratioIndependentHolm: r4(Math.exp(-kTwoHolm * sdLogOut)),
      ratioPairedHolmAtMinRho: rhoMin != null ? r4(Math.exp(-kPairHolm * sdLogOut * Math.sqrt(2 * (1 - Math.max(0, rhoMin))))) : null, rhoMin },
    logUsd: { ...mddFor(null, sdLogUsd, 'ln US$'), ratioIndependent: r4(Math.exp(-kTwo * sdLogUsd)), ratioIndependentHolm: r4(Math.exp(-kTwoHolm * sdLogUsd)) },
    solvedBinary: fisherGrid,
    casesPerArmForSolvedDrop: [0.5, 0.67, 0.75, 0.8].map((p2) => ({ p1: r4(pooled80.solved / pooled80.cases), p2, nPerArmAt80Power: (() => { for (let n = 4; n <= 60; n++) if (fisherPower(n, pooled80.solved / pooled80.cases, p2, ALPHA) >= POWER) return n; return '>60'; })() })),
    sdInflationAllowedFor30PctOutputCut: r4(Math.log(1 / 0.7) / kTwoHolm / sdLogOut),
    freshPassBinary: 'same as solved: every solved stigwait case at 80 modules also passed fresh inputs, so the fresh-input pass has the same (near-zero) variance',
  },
};
// association: member thinking tokens vs module success (does more thinking predict passing?), stigwait members at
// default effort, within (study size, wave) strata: pass rate by thinking quartile of that stratum, and the AUC of
// thinking tokens for passing (0.5 = no information; below 0.5 = passing replies think less)
function assoc(qs) {
  const lab = qs.filter((q) => q.modPass != null && q.out > 0), strata = group(lab, (q) => `${q.dir}|${q.wave}`); const quart = [[0, 0], [0, 0], [0, 0], [0, 0]]; let aucW = 0, w = 0; const perWave = {};
  for (const [key, xs] of Object.entries(strata)) {
    if (xs.length < 20) continue; const sorted = [...xs].sort((a, b) => a.think - b.think);
    sorted.forEach((q, i) => { const b = Math.min(3, Math.floor(4 * i / sorted.length)); quart[b][0] += q.modPass ? 1 : 0; quart[b][1]++; });
    const mw = mannWhitney(xs.filter((q) => q.modPass).map((q) => q.think), xs.filter((q) => !q.modPass).map((q) => q.think)); if (!mw) continue;
    const ww = mw.n1 * mw.n2 / (mw.n1 + mw.n2); aucW += ww * mw.auc; w += ww; const wv = key.split('|')[1]; (perWave[wv] ||= { n: 0, aucW: 0, w: 0 }); perWave[wv].n += xs.length; perWave[wv].aucW += ww * mw.auc; perWave[wv].w += ww;
  }
  return { replies: lab.length, passRateByThinkingQuartile: quart.map(([p, n], i) => ({ quartile: i + 1, n, passRate: n ? r4(p / n) : null })), stratifiedAucThinkingForPass: w ? r4(aucW / w) : null,
    byWave: Object.fromEntries(Object.entries(perWave).map(([k, x]) => [k, { n: x.n, auc: r4(x.aucW / x.w) }])) };
}
const memberAssoc = { stigwait80: assoc(ok.filter((q) => sw80.includes(q.dir) && q.arm === 'stigwait' && q.role === 'member')),
  stigwaitAllHaikuDefault: assoc(haikuDefault.filter((q) => q.arm === 'stigwait' && q.role === 'member')), allMembersHaikuDefault: assoc(haikuDefault.filter((q) => q.role === 'member')) };
// case level: member thinking per case against act rounds (stigwait, 80 modules)
const c80 = caseList.filter((c) => sw80.includes(c.dir) && c.arm === 'stigwait'); memberAssoc.caseLevel80 = { n: c80.length, rMemberThinkVsActRounds: r4(pearson(c80.map((c) => c.memberThink), c80.map((c) => c.actRoundsToZero ?? c.censoredAt))) };

const out = { id: 'AU-R2', label: 'exploratory reanalysis, not a registered test', generatedBy: 'observatory/autonomy/au-r2/thinking.mjs', dirs: DIRS, skipped: { LI37: 'Colony study, no batch wave files and no thinking split' },
  studies: studyInfo, replies: { total: replies.length, failedOrMissing: replies.filter((q) => q.failed).length },
  thinkingByRole: byRole, e2: { reply: e2Reply, caseLevel: e2Case, caseLevelSummary: e2CaseSummary, armLevel: e2Arm, armLevelCorrSolvedVsShare: r4(rho) }, truncation, li35: li35Check, au1, memberThinkingVsSuccess: memberAssoc };
fs.mkdirSync(path.join(RES, 'au-r2'), { recursive: true });
fs.writeFileSync(path.join(RES, 'au-r2/analysis.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ replies: out.replies, e2member: e2Reply.memberModule.stratified, au1mdd: au1.mdd.logOut }, null, 1));
