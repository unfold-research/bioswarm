// screen-noflag: free simulation screen of the six genome traits that have no flag (FLD-04, DOL-02, DOL-03, DOL-04, DEF-03, DEF-05).
// A screen is level L0 of the evidence ladder (programs/coordination.md): it says whether a trait is worth a paid study, never that it works.
// Usage: node sims/screen-noflag.mjs            writes results/sims/screen-noflag.json and .md
//        node sims/screen-noflag.mjs --check    fails if the committed files differ from a fresh run (CI)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Rng, hashSeed, BASE_SEED, ROOT, RESULTS_DIR, stableStringify, r } from './lib.mjs';

export const ID = 'screen-noflag';
export const VERSION = '1.0.0';

// Decision rule, fixed before the first run. Baseline settings were calibrated only so that the plain baseline is not at a ceiling
// (solved share between 0.3 and 0.8 in the premise scenario); no mechanism parameter was tuned.
export const RULE = {
  runs: 400,
  advance: 'A trait advances to a paid study only if, in its premise scenario, the mechanism beats the stronger of the plain baseline and the matched audit baseline by at least +0.05 in the final share of modules solved and correct (95% CI of the paired difference above 0), and in its control scenario, where the premise is absent, it does not lose more than 0.05 to the plain baseline (lower 95% bound of the paired difference at or above -0.05).',
  baselines: 'plain: every agent fixes a random open module. audit: same, but two agents verify a random solved module each round (the generic "add a checker" baseline, matched in headcount to the checking mechanisms).',
};

export const PAR = { v: 0.8, badRate: 0.6, eps: 0.25, E: 2, K: 2, S: 2, g: 0.25, f: 0.1, G: 2, L: 99, stale: 0.2, auditN: 2, cpr: 1, kappa: 0 };

const base = { N: 8, M: 40, T: 4, R: 12, skillHet: false, diffHet: false, poison: 0 };
export const SCENARIOS = {
  'FLD-04': { arm: 'learn', premise: { ...base, R: 14, skillHet: true }, control: { ...base, R: 14 }, sweep: ['eps', [0.1, 0.25, 0.5]] },
  'DOL-02': { arm: 'poly', premise: { ...base, diffHet: true, poison: 0.25 }, control: { ...base }, sweep: ['E', [1, 2, 3]], audit: true },
  'DOL-03': { arm: 'germ', premise: { ...base, poison: 0.25 }, control: { ...base }, sweep: ['K', [1, 2, 3]], audit: true },
  'DOL-04': { arm: 'leader', premise: { ...base, N: 16, M: 24, R: 3 }, control: { ...base, R: 10, M: 60 }, sweep: ['L', [4, 8, 15]] },
  'DEF-03': { arm: 'quarantine', premise: { ...base, poison: 0.25 }, control: { ...base }, sweep: ['S', [1, 2, 3]], audit: true },
  'DEF-05': { arm: 'sacrifice', premise: { ...base, poison: 0.25 }, control: { ...base }, sweep: ['G', [1, 2, 3]], audit: true },
};

function simulate(arm, cfg, par, seedKey) {
  const { N, M, T, R } = cfg;
  const w = new Rng(hashSeed(BASE_SEED, 'screen-world', seedKey)); // same world for every arm
  const rng = new Rng(hashSeed(BASE_SEED, 'screen-act', seedKey, arm));
  const typ = Array.from({ length: M }, () => w.int(T));
  const p0 = Array.from({ length: M }, () => (cfg.diffHet ? (w.bern(0.5) ? 0.8 : 0.25) : 0.5));
  const perm = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = w.int(i + 1); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const nPoison = Math.round(cfg.poison * N);
  const poisoned = Array(N).fill(false);
  for (let i = 0; i < nPoison; i++) poisoned[perm[i]] = true;
  const skill = (a, t) => (cfg.skillHet ? (t === a % T ? 1 : 0.3) : 0.65);

  const solved = Array(M).fill(false), broken = Array(M).fill(false), cand = Array(M).fill(null), author = Array(M).fill(-1);
  const revealed = Array(M).fill(false);
  const alive = Array(N).fill(true), strikes = Array(N).fill(0);
  const att = Array.from({ length: N }, () => Array(T).fill(0)), suc = Array.from({ length: N }, () => Array(T).fill(0));
  const open = () => { const o = []; for (let m = 0; m < M; m++) if (!solved[m] && !cand[m]) o.push(m); return o; };
  const pick = (arr) => (arr.length ? arr[rng.int(arr.length)] : -1);
  let writes = [];

  const attempt = (a, m) => {
    if (m < 0 || solved[m] || cand[m]) return;
    const t = typ[m];
    att[a][t]++;
    if (!rng.bern(Math.min(1, p0[m] * skill(a, t)))) return;
    suc[a][t]++;
    const bad = poisoned[a] && rng.bern(par.badRate);
    if (arm === 'germ') { cand[m] = { a, bad }; return; }
    solved[m] = true; broken[m] = bad; author[m] = a; writes.push(m);
  };
  const verifyN = (a, falseAlarm) => { const out = []; for (let i = 0; i < par.cpr; i++) out.push(verify(a, falseAlarm)); return out; };
  const verify = (a, falseAlarm) => {
    const s = []; for (let m = 0; m < M; m++) if (solved[m]) s.push(m);
    const m = pick(s); if (m < 0) return null;
    if (broken[m] && rng.bern(par.v)) { const au = author[m]; solved[m] = false; broken[m] = false; return au; }
    if (falseAlarm && !broken[m] && rng.bern(par.f)) { const au = author[m]; solved[m] = false; return au; }
    return null;
  };

  for (let round = 0; round < R; round++) {
    writes = [];
    const act = []; for (let a = 0; a < N; a++) if (alive[a]) act.push(a);
    if (arm === 'plain' || arm === 'audit') {
      for (const a of act) { if (arm === 'audit' && a < par.auditN) verifyN(a, false); else attempt(a, pick(open())); }
    } else if (arm === 'learn') {
      for (const a of act) {
        const o = open(); if (!o.length) continue;
        if (rng.bern(par.eps)) { attempt(a, pick(o)); continue; }
        let best = -1, bt = 0;
        for (let t = 0; t < T; t++) { const q = (suc[a][t] + 1) / (att[a][t] + 2); if (q > best && o.some((m) => typ[m] === t)) { best = q; bt = t; } }
        attempt(a, pick(o.filter((m) => typ[m] === bt)));
      }
    } else if (arm === 'poly') {
      for (const a of act) {
        if (round < par.E) { const u = []; for (let m = 0; m < M; m++) if (!revealed[m]) u.push(m); const m = pick(u); if (m >= 0) revealed[m] = true; }
        else if (round >= R - 2 && a % 2 === 1) verifyN(a, false);
        else { const o = open(); const easy = o.filter((m) => revealed[m] && p0[m] >= 0.5); attempt(a, pick(easy.length ? easy : o)); }
      }
    } else if (arm === 'germ') {
      for (const a of act) if (a >= par.K) attempt(a, pick(open()));
      const pending = []; for (let m = 0; m < M; m++) if (cand[m]) pending.push(m);
      for (let i = 0; i < Math.min(par.K * par.cpr, pending.length); i++) {
        const m = pending[i], c = cand[m]; cand[m] = null;
        if (c.bad && rng.bern(par.v)) continue; // rejected, module reopens
        solved[m] = true; broken[m] = c.bad; author[m] = c.a;
      }
    } else if (arm === 'quarantine') {
      for (const a of act) {
        if (rng.bern(par.g)) {
          for (const au of verifyN(a, true)) {
            if (au === null || au < 0) continue;
            strikes[au]++;
            if (strikes[au] >= par.S && alive[au]) { alive[au] = false; for (let m = 0; m < M; m++) if (solved[m] && author[m] === au) { solved[m] = false; broken[m] = false; } }
          }
        } else attempt(a, pick(open()));
      }
    } else if (arm === 'sacrifice') {
      for (const a of act) attempt(a, pick(open()));
      for (const g of act) {
        if (g >= par.G || !alive[g]) continue;
        const theirs = writes.filter((m) => author[m] !== g && solved[m]);
        for (const m of theirs) if (broken[m] && rng.bern(par.v)) { solved[m] = false; broken[m] = false; alive[g] = false; break; }
      }
    } else if (arm === 'leader') {
      const workers = act.filter((a) => a !== 0);
      const o = open();
      for (let i = o.length - 1; i > 0; i--) { const j = rng.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; }
      for (let i = 0; i < Math.min(par.L, workers.length); i++) {
        let m = o[i] ?? -1;
        if (rng.bern(par.stale)) m = rng.int(M);
        attempt(workers[i], m);
      }
    }
    if (par.kappa > 0) { // contagion: a broken module silently breaks another solved one
      const s = []; for (let m = 0; m < M; m++) if (solved[m]) s.push(m);
      for (let m = 0; m < M; m++) if (solved[m] && broken[m] && rng.bern(par.kappa)) { const m2 = pick(s); if (m2 >= 0) broken[m2] = true; }
    }
  }
  let ok = 0; for (let m = 0; m < M; m++) if (solved[m] && !broken[m]) ok++;
  return ok / M;
}

function stats(d) {
  const n = d.length; const mean = d.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  const h = 1.96 * sd / Math.sqrt(n);
  return { mean, lo: mean - h, hi: mean + h };
}
function cell(arm, cfg, par, key, runs) { const out = []; for (let i = 0; i < runs; i++) out.push(simulate(arm, cfg, par, `${key}|${i}`)); return out; }
const diff = (a, b) => a.map((x, i) => x - b[i]);

export function run() {
  const rows = [], decisions = [], sweeps = [];
  for (const [trait, sc] of Object.entries(SCENARIOS)) {
    const res = {};
    for (const [name, cfg] of [['premise', sc.premise], ['control', sc.control]]) {
      const key = `${trait}|${name}`;
      const plain = cell('plain', cfg, PAR, key, RULE.runs);
      const mech = cell(sc.arm, cfg, PAR, key, RULE.runs);
      const aud = sc.audit ? cell('audit', cfg, PAR, key, RULE.runs) : null;
      const mp = stats(plain).mean, ma = aud ? stats(aud).mean : -Infinity;
      const strongest = aud && ma > mp ? aud : plain;
      res[name] = { plain: stats(plain), audit: aud && stats(aud), mech: stats(mech), vsPlain: stats(diff(mech, plain)), vsBest: stats(diff(mech, strongest)), bestIs: strongest === plain ? 'plain' : 'audit' };
      rows.push({ trait, arm: sc.arm, scenario: name, cfg, ...res[name] });
    }
    const p = res.premise.vsBest, c = res.control.vsPlain;
    const gain = p.mean >= 0.05 && p.lo > 0, safe = c.lo >= -0.05;
    decisions.push({ trait, arm: sc.arm, advance: gain && safe, gain, safe, premiseDiff: p.mean, controlDiff: c.mean, reason: gain && safe ? 'beats the strongest baseline where the premise holds and costs little where it does not' : !gain ? `does not beat the ${res.premise.bestIs} baseline by 0.05 where the premise holds (diff ${p.mean.toFixed(3)}, CI ${p.lo.toFixed(3)} to ${p.hi.toFixed(3)})` : `loses more than 0.05 where the premise is absent (lower bound ${c.lo.toFixed(3)})` });
    const [pk, vals] = sc.sweep;
    for (const v of vals) {
      const par = { ...PAR, [pk]: v };
      const key = `${trait}|premise`;
      const plain = cell('plain', sc.premise, PAR, key, RULE.runs);
      const mech = cell(sc.arm, sc.premise, par, key, RULE.runs);
      sweeps.push({ trait, param: pk, value: v, diffVsPlain: stats(diff(mech, plain)) });
    }
  }
  const map = [];
  for (const trait of ['DOL-02', 'DOL-03', 'DEF-03', 'DEF-05']) {
    const sc = SCENARIOS[trait];
    for (const cpr of trait === 'DEF-05' ? [1] : [1, 4]) for (const share of [0.125, 0.25, 0.5, 0.75]) {
      const par = { ...PAR, cpr }, cfg = { ...sc.premise, poison: share }, key = `${trait}|map|${share}|${cpr}`;
      const plain = cell('plain', cfg, par, key, RULE.runs), aud = cell('audit', cfg, par, key, RULE.runs), mech = cell(sc.arm, cfg, par, key, RULE.runs);
      const strongest = stats(aud).mean > stats(plain).mean ? aud : plain;
      map.push({ trait, cpr, share, plain: stats(plain).mean, audit: stats(aud).mean, mech: stats(mech).mean, vsBest: stats(diff(mech, strongest)) });
    }
  }
  const spread = [];
  for (const trait of ['DOL-03', 'DEF-03', 'DEF-05']) {
    const sc = SCENARIOS[trait];
    for (const cpr of [1, 4]) for (const kappa of [0.1, 0.3, 0.6]) {
      const par = { ...PAR, cpr, kappa }, key = `${trait}|spread|${kappa}|${cpr}`;
      const plain = cell('plain', sc.premise, par, key, RULE.runs), aud = cell('audit', sc.premise, par, key, RULE.runs), mech = cell(sc.arm, sc.premise, par, key, RULE.runs);
      const strongest = stats(aud).mean > stats(plain).mean ? aud : plain;
      spread.push({ trait, cpr, kappa, plain: stats(plain).mean, audit: stats(aud).mean, mech: stats(mech).mean, vsBest: stats(diff(mech, strongest)) });
    }
  }
  const out = { id: ID, version: VERSION, rule: RULE, params: PAR, scenarios: SCENARIOS, rows, decisions, sweeps, map, spread };
  return JSON.parse(stableStringify(out), (k, v) => (typeof v === 'number' ? r(v, 4) : v));
}

const f3 = (x) => (x >= 0 ? '+' : '') + x.toFixed(3);
export function card(o) {
  const L = [];
  L.push('---', `id: ${ID}`, 'title: Free simulation screen of the six genome traits without a flag', 'area: simulation', 'evidence: local-validation', `summary: ${o.decisions.filter((d) => d.advance).length} of ${o.decisions.length} traits (${o.decisions.filter((d) => d.advance).map((d) => d.trait).join(', ') || 'none'}) clear the preregistered screen; a screen is L0, not a result.`, '---', '');
  L.push(`# Free simulation screen of the six traits without a flag (v${o.version})`, '');
  L.push('Level L0 of the evidence ladder in `programs/coordination.md`. An abstract repair task: 40 modules, 8 agents, a fixed number of rounds, one attempt per agent per round. Each trait is turned into the smallest mechanism that expresses it and compared with the strongest generic baseline. The abstraction decides what a trait can do, so a pass means "worth a paid study with real agents", and a fail means "this simulation gives no reason to spend".', '');
  L.push('**Rule (fixed before the first run).** ' + o.rule.advance, '', '**Baselines.** ' + o.rule.baselines, '');
  L.push('| Trait | Mechanism | Premise scenario | Plain | Audit | Mechanism | Diff vs strongest baseline (95% CI) | Control diff vs plain (95% CI) | Screen |', '|---|---|---|---|---|---|---|---|---|');
  for (const d of o.decisions) {
    const pr = o.rows.find((x) => x.trait === d.trait && x.scenario === 'premise'), co = o.rows.find((x) => x.trait === d.trait && x.scenario === 'control');
    const c = pr.cfg, desc = `N=${c.N}, M=${c.M}, R=${c.R}${c.skillHet ? ', specialist skills' : ''}${c.diffHet ? ', uneven difficulty' : ''}${c.poison ? `, ${c.poison * 100}% faulty writers` : ''}`;
    L.push(`| ${d.trait} | ${d.arm} | ${desc} | ${pr.plain.mean.toFixed(3)} | ${pr.audit ? pr.audit.mean.toFixed(3) : '-'} | ${pr.mech.mean.toFixed(3)} | ${f3(pr.vsBest.mean)} (${f3(pr.vsBest.lo)} to ${f3(pr.vsBest.hi)}) | ${f3(co.vsPlain.mean)} (${f3(co.vsPlain.lo)} to ${f3(co.vsPlain.hi)}) | **${d.advance ? 'advance' : 'stop'}** |`);
  }
  L.push('', '## Why', '');
  for (const d of o.decisions) L.push(`- ${d.trait} (${d.arm}): ${d.advance ? 'advance' : 'stop'}, ${d.reason}.`);
  L.push('', '## Reading', '', 'Registered rule: only FLD-04 (individual learning) advances. Specialists that remember what they are good at beat random assignment by a wide margin where skills differ, and cost nothing where they do not. The other five stop under the rule: in this model a check, a scout or a gatekeeper uses an agent that could have fixed a module, and a faulty writer only ruins its own module, so the checking traits cannot pay. That is a property of the model, not of the traits. The exploratory contagion table adds spread (a broken module breaks others); with spread of 0.3 or more, the gate of DOL-03 and the sacrificial guards of DEF-05 start to beat the strongest baseline, and the lead is clearest when checks cost a full round. Quarantine (DEF-03) never does, because inspection false alarms bench healthy members. DOL-02 never does. DOL-04 loses by the cost of its idle leader and stale view (see the sweep), which matches the real-agent result that a manager is a strong but not a cheaper arm. So: FLD-04 is worth a paid study now; DOL-03 and DEF-05 are worth one only on tasks where a bad edit spreads (a bad fix that breaks its callers does); DOL-02, DOL-04 and DEF-03 are not supported by this screen. Run history: the first run used a leader capped at six assignments per round and a three-times longer leader scenario at a ceiling; both were changed after that run (leader uncapped, scenario shortened until the plain baseline was between 0.3 and 0.8), and the contagion and cheap-check tables were added after the first results showed the model could not value defence. The decisions in the first table come from the rule above and were not altered.', '');
  L.push('', '## Cost parameter sweep (premise scenario, diff vs plain baseline)', '', '| Trait | Parameter | Value | Diff vs plain (95% CI) |', '|---|---|---|---|');
  for (const s of o.sweeps) L.push(`| ${s.trait} | ${s.param} | ${s.value} | ${f3(s.diffVsPlain.mean)} (${f3(s.diffVsPlain.lo)} to ${f3(s.diffVsPlain.hi)}) |`);
  L.push('', '## Where the faulty-writer premise starts to pay, and what a cheap check does (exploratory, not part of the rule)', '', '| Trait | Checks per round | Faulty writers | Plain | Audit | Mechanism | Diff vs strongest baseline (95% CI) |', '|---|---|---|---|---|---|---|');
  for (const m of o.map) L.push(`| ${m.trait} | ${m.cpr} | ${m.share * 100}% | ${m.plain.toFixed(3)} | ${m.audit.toFixed(3)} | ${m.mech.toFixed(3)} | ${f3(m.vsBest.mean)} (${f3(m.vsBest.lo)} to ${f3(m.vsBest.hi)}) |`);
  L.push('', '## With contagion (exploratory, 25% faulty writers; each broken module breaks another solved module with chance kappa per round)', '', '| Trait | Checks per round | kappa | Plain | Audit | Mechanism | Diff vs strongest baseline (95% CI) |', '|---|---|---|---|---|---|---|');
  for (const m of o.spread) L.push(`| ${m.trait} | ${m.cpr} | ${m.kappa} | ${m.plain.toFixed(3)} | ${m.audit.toFixed(3)} | ${m.mech.toFixed(3)} | ${f3(m.vsBest.mean)} (${f3(m.vsBest.lo)} to ${f3(m.vsBest.hi)}) |`);
  L.push('', 'Model: modules have a type and a base success chance; an attempt succeeds with base chance times the agent\'s skill; a faulty writer\'s success is silently broken with chance 0.6 and does not count at the end; a check finds a broken module with chance 0.8. `learn` remembers success per type (FLD-04); `poly` scouts, then fixes easy first, then verifies (DOL-02); `germ` lets only 2 agents commit after checking candidates (DOL-03); `leader` has one non-working agent assigning distinct modules with 20% stale view (DOL-04); `quarantine` has agents inspect each other, strike authors and bench them at two strikes (DEF-03); `sacrifice` has two guards that each block one bad write and are then lost (DEF-05). Seeds are paired across arms; 400 runs per cell. Reproduce with `node sims/screen-noflag.mjs`.', '');
  return L.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('screen-noflag.mjs')) {
  const out = run();
  const json = stableStringify(out) + '\n', md = card(out) + '\n';
  const jp = join(RESULTS_DIR, `${ID}.json`), mp = join(RESULTS_DIR, `${ID}.md`);
  if (process.argv.includes('--check')) {
    const same = existsSync(jp) && readFileSync(jp, 'utf8') === json && existsSync(mp) && readFileSync(mp, 'utf8') === md;
    console.log(same ? 'screen-noflag: committed results match a fresh run' : 'screen-noflag: committed results differ from a fresh run');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(jp, json); writeFileSync(mp, md);
  for (const d of out.decisions) console.log(`${d.trait} ${d.arm}: ${d.advance ? 'ADVANCE' : 'stop'} premise ${d.premiseDiff.toFixed(3)} control ${d.controlDiff.toFixed(3)} | ${d.reason}`);
  for (const row of out.rows) console.log(row.trait, row.scenario, 'plain', row.plain.mean.toFixed(3), row.audit ? 'audit ' + row.audit.mean.toFixed(3) : '', 'mech', row.mech.mean.toFixed(3));
}
