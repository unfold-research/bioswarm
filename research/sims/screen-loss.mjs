// screen-loss: free simulation screen of three genome traits against permanent member loss (ACT-04 cold reserve,
// DEF-06 second owner, REG-05 recruit-and-release). GN-S1 of Shared/unfold/genoma/GN-PLAN.md, section 3.
// A screen is level L0 of the evidence ladder (programs/coordination.md): it only says whether a trait is worth a paid
// study, never that it works. No model calls, no spend.
// Usage: node sims/screen-loss.mjs            writes results/sims/screen-loss.json and .md
//        node sims/screen-loss.mjs --check    exits 1 if the committed files differ from a fresh run (CI)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Rng, hashSeed, BASE_SEED, RESULTS_DIR, stableStringify, r, meanCI } from './lib.mjs';

export const ID = 'screen-loss';
export const VERSION = '1.0.0';

// Decision rule, fixed before the first run (GN-S1). Headcount is equal across arms (reserve and manager count in N).
// Baselines were sized only so the plain baseline is not at a ceiling in the premise; no mechanism parameter was tuned.
export const RULE = {
  runs: 400,
  advance: 'A trait advances to a paid study only if, in the loss premise, the mechanism beats the stronger of the plain and manager baselines by at least +0.05 in the final solved-and-correct share (the 95% CI of the paired difference above 0) and, in the control (no loss), does not lose more than 0.05 to the plain baseline (lower 95% CI of the paired difference at or above -0.05). Seeds are paired across arms; 400 runs per cell; the number of agents is equal across arms (reserve and manager count in the total).',
  baselines: 'plain: a survivor with no ready owned module takes a random open module, orphaned modules included; orphans wait until someone takes them. manager: one agent never writes and reassigns orphaned modules to idle survivors each round, with a 20% stale view (it may reassign a non-orphan or miss).',
};
export const HYPOTHESIS = 'Against 30% permanent member loss in the first third of a run, at least one of a cold reserve (ACT-04), a second owner per module (DEF-06) and a recruit-and-release team (REG-05) raises the final solved-and-correct share over the stronger of the plain and manager baselines by >= +0.05 (paired 95% CI > 0), while not losing more than 0.05 when nobody leaves. A screen (L0), not evidence that any trait works.';

// Tuning knobs (not swept by the rule). v: a coupled dependency must be in place for a module to count.
export const PAR = { pBase: 0.55, skillHi: 1.0, skillLo: 0.35, reserveN: 2, wakeThr: 3, stale: 0.2, silentRounds: 1 };

const base = { N: 10, M: 40, T: 4, R: 16, coupled: 0.5, lossShare: 0, lossBy: 0 };
// Three traits, each a mechanism against the same loss premise; the control removes the loss.
export const SCENARIOS = {
  'ACT-04': { arm: 'reserve', premise: { ...base, lossShare: 0.3, lossBy: 1 / 3 }, control: { ...base }, sweep: ['wakeThr', [1, 3, 6]] },
  'DEF-06': { arm: 'twoowner', premise: { ...base, lossShare: 0.3, lossBy: 1 / 3 }, control: { ...base }, sweep: ['silentRounds', [1, 2, 3]] },
  'REG-05': { arm: 'recruit', premise: { ...base, lossShare: 0.3, lossBy: 1 / 3 }, control: { ...base }, sweep: ['lossShare', [0.2, 0.3, 0.45]] },
};

// One run. Modules have a type, a base success chance and at most one coupled dependency (a module counts as correct only
// once its dependency is also correct). Each round every alive, non-reserved agent works one ready module from its queue;
// a success marks the module done. Permanent loss kills lossShare*N agents at seeded rounds in the first lossBy of the run.
function simulate(arm, cfg, par, seedKey) {
  const { N, M, T, R } = cfg;
  const w = new Rng(hashSeed(BASE_SEED, 'screen-loss-world', seedKey)); // the world (types, deps, owners, who dies) is shared across arms
  const rng = new Rng(hashSeed(BASE_SEED, 'screen-loss-act', seedKey, arm));
  const typ = Array.from({ length: M }, () => w.int(T));
  // coupled dependencies: a fraction of modules depend on one other (acyclic: only on a lower index)
  const dep = Array(M).fill(-1);
  for (let m = 1; m < M; m++) if (w.bern(cfg.coupled)) dep[m] = w.int(m);
  // primary and secondary owner per module (round-robin over a shuffled agent list)
  const perm = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = w.int(i + 1); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const primary = Array.from({ length: M }, (_, m) => perm[m % N]);
  const secondary = Array.from({ length: M }, (_, m) => perm[(m + 1) % N]);
  const skill = (a, t) => (t === a % T ? par.skillHi : par.skillLo);

  // who dies and when (premise only); reserve agents (ACT-04) are the last reserveN of perm and never die
  const reserved = new Set(arm === 'reserve' ? perm.slice(N - par.reserveN) : []);
  const deathRound = Array(N).fill(Infinity);
  if (cfg.lossShare > 0) {
    const pool = perm.filter((a) => !reserved.has(a)); // reserve is not eligible to die
    const nDie = Math.round(cfg.lossShare * N), horizon = Math.max(1, Math.floor(R * cfg.lossBy));
    for (let i = 0; i < nDie && i < pool.length; i++) deathRound[pool[i]] = w.int(horizon);
  }
  // the manager (baseline) is one fixed agent that never writes; it counts in N
  const manager = arm === 'manager' ? perm[0] : -1;

  const solved = Array(M).fill(false), done = Array(M).fill(false); // done = solved and its dependency done
  const alive = Array(N).fill(true);
  const woken = Array(N).fill(false); // reserve wakes when orphan pressure is high
  const actedLast = Array(N).fill(true);
  let owner = primary.slice();
  const depOk = (m) => dep[m] < 0 || done[dep[m]];
  const ready = (m) => !solved[m] && depOk(m);
  const recompute = () => { for (let m = 0; m < M; m++) done[m] = solved[m] && depOk(m); let ch = true; while (ch) { ch = false; for (let m = 0; m < M; m++) { const nd = solved[m] && (dep[m] < 0 || done[dep[m]]); if (nd !== done[m]) { done[m] = nd; ch = true; } } } };
  const orphanOpen = () => { let n = 0; for (let m = 0; m < M; m++) if (!solved[m] && !alive[owner[m]]) n++; return n; };
  const openFor = (a) => { const o = []; for (let m = 0; m < M; m++) if (owner[m] === a && ready(m)) o.push(m); return o; };
  const anyOpen = () => { const o = []; for (let m = 0; m < M; m++) if (ready(m)) o.push(m); return o; };
  const orphanReady = () => { const o = []; for (let m = 0; m < M; m++) if (ready(m) && !alive[owner[m]]) o.push(m); return o; };
  const pick = (arr) => (arr.length ? arr[rng.int(arr.length)] : -1);
  const attempt = (a, m) => { if (m < 0 || solved[m] || !depOk(m)) return false; if (rng.bern(Math.min(1, par.pBase * skill(a, typ[m])))) { solved[m] = true; return true; } return false; };

  let roundsToZero = R + 1;
  for (let round = 0; round < R; round++) {
    for (let a = 0; a < N; a++) if (round >= deathRound[a]) alive[a] = false;
    const acted = Array(N).fill(false);
    // reserve wakes once orphan pressure crosses the threshold
    if (arm === 'reserve' && orphanOpen() >= par.wakeThr) for (const a of reserved) woken[a] = true;
    for (let a = 0; a < N; a++) {
      if (!alive[a] || a === manager) continue;
      if (reserved.has(a) && !woken[a]) continue;
      let m = -1;
      if (reserved.has(a)) m = pick(orphanReady().length ? orphanReady() : anyOpen());
      else if (arm === 'recruit') { const own = openFor(a); m = own.length ? pick(own) : pick(orphanReady().length ? orphanReady() : anyOpen()); }
      else if (arm === 'twoowner') { const own = openFor(a); if (own.length) m = pick(own); else { const sec = []; for (let x = 0; x < M; x++) if (secondary[x] === a && ready(x) && (!alive[primary[x]] || !actedLast[primary[x]])) sec.push(x); m = sec.length ? pick(sec) : pick(anyOpen()); } }
      else { const own = openFor(a); m = own.length ? pick(own) : pick(anyOpen()); } // plain / manager survivors
      if (m >= 0) { attempt(a, m); acted[a] = true; }
    }
    // manager reassigns orphaned modules to idle survivors, with a stale view
    if (arm === 'manager' && alive[manager]) {
      const idle = []; for (let a = 0; a < N; a++) if (alive[a] && a !== manager && !acted[a]) idle.push(a);
      const orph = orphanReady();
      for (const a of idle) { if (!orph.length) break; let m = orph.shift(); if (rng.bern(par.stale)) { m = rng.int(M); if (solved[m] || !depOk(m)) continue; } owner[m] = a; attempt(a, m); acted[a] = true; }
    }
    recompute();
    for (let a = 0; a < N; a++) actedLast[a] = acted[a];
    let ok = 0; for (let m = 0; m < M; m++) if (done[m]) ok++;
    if (ok === M && roundsToZero > R) roundsToZero = round + 1;
  }
  recompute();
  let ok = 0; for (let m = 0; m < M; m++) if (done[m]) ok++;
  return { share: ok / M, rounds: roundsToZero };
}

const cell = (arm, cfg, par, key, runs) => { const s = [], rr = []; for (let i = 0; i < runs; i++) { const o = simulate(arm, cfg, par, `${key}|${i}`); s.push(o.share); rr.push(o.rounds); } return { s, rr }; };
const diff = (a, b) => a.map((x, i) => x - b[i]);

export function run() {
  const rows = [], decisions = [], sweeps = [];
  for (const [trait, sc] of Object.entries(SCENARIOS)) {
    const res = {};
    for (const [name, cfg] of [['premise', sc.premise], ['control', sc.control]]) {
      const key = `${trait}|${name}`;
      const plain = cell('plain', cfg, PAR, key, RULE.runs), mgr = cell('manager', cfg, PAR, key, RULE.runs), mech = cell(sc.arm, cfg, PAR, key, RULE.runs);
      const mp = meanCI(plain.s).mean, mm = meanCI(mgr.s).mean, strongest = mm > mp ? mgr : plain;
      res[name] = { plain: meanCI(plain.s), manager: meanCI(mgr.s), mech: meanCI(mech.s), rounds: meanCI(mech.rr),
        vsPlain: meanCI(diff(mech.s, plain.s)), vsBest: meanCI(diff(mech.s, strongest.s)), bestIs: strongest === plain ? 'plain' : 'manager' };
      rows.push({ trait, arm: sc.arm, scenario: name, cfg, ...res[name] });
    }
    const p = res.premise.vsBest, c = res.control.vsPlain;
    const gain = p.mean >= 0.05 && p.lo > 0, safe = c.lo >= -0.05;
    decisions.push({ trait, arm: sc.arm, advance: gain && safe, gain, safe, premiseDiff: p.mean, controlDiff: c.mean,
      reason: gain && safe ? 'beats the strongest baseline under loss and costs little without it' : !gain ? 'no gain over the strongest baseline under loss' : 'loses too much without loss' });
    const [pk, vals] = sc.sweep;
    for (const v of vals) { const par = { ...PAR, [pk]: v }; const key = `${trait}|premise`; const premise = pk === 'lossShare' ? { ...sc.premise, lossShare: v } : sc.premise;
      const plain = cell('plain', premise, PAR, key, RULE.runs), mech = cell(sc.arm, premise, par, key, RULE.runs); sweeps.push({ trait, param: pk, value: v, diffVsPlain: meanCI(diff(mech.s, plain.s)) }); }
  }
  const headline = decisions.map((d) => `${d.trait} (${d.arm}): ${d.advance ? 'advance' : 'stop'} — premise ${(d.premiseDiff >= 0 ? '+' : '') + d.premiseDiff.toFixed(3)}, control ${(d.controlDiff >= 0 ? '+' : '') + d.controlDiff.toFixed(3)}`);
  const out = { id: ID, version: VERSION, rule: RULE, params: PAR, scenarios: SCENARIOS, rows, decisions, sweeps, headline };
  return JSON.parse(stableStringify(out), (k, v) => (typeof v === 'number' ? r(v, 4) : v));
}

const f3 = (x) => (x >= 0 ? '+' : '') + x.toFixed(3);
export function card(o) {
  const L = [];
  const adv = o.decisions.filter((d) => d.advance).length;
  L.push('---', `id: ${ID}`, 'title: Free simulation screen of three traits against permanent member loss', 'area: simulation', 'evidence: local-validation',
    `summary: ${adv} of ${o.decisions.length} traits (ACT-04, DEF-06, REG-05) advance past the free screen against 30% permanent member loss.`, '---', '');
  L.push(`# Free screen: traits against permanent member loss (v${o.version})`, '');
  L.push('Level L0 of the evidence ladder (`programs/coordination.md`). An abstract repair task: 40 modules with coupled dependencies and one owner each, 10 agents, a fixed number of rounds, one attempt per acting agent per round. In the premise 30% of the members leave for good in the first third; the control keeps everyone. Each trait is the smallest mechanism that could keep the work going. GN-S1 of `Shared/unfold/genoma/GN-PLAN.md`.', '');
  L.push('**Rule (fixed before the first run).** ' + o.rule.advance, '', '**Baselines.** ' + o.rule.baselines, '');
  L.push('## Decision (premise: 30% permanent loss)', '', '| Trait | Mechanism | Plain | Manager | Mechanism | vs strongest (95% CI) | Control vs plain | Advance |', '|---|---|---|---|---|---|---|---|');
  for (const d of o.decisions) {
    const pr = o.rows.find((x) => x.trait === d.trait && x.scenario === 'premise');
    L.push(`| ${d.trait} | ${d.arm} | ${pr.plain.mean.toFixed(3)} | ${pr.manager.mean.toFixed(3)} | ${pr.mech.mean.toFixed(3)} | ${f3(pr.vsBest.mean)} (${f3(pr.vsBest.lo)} to ${f3(pr.vsBest.hi)}) | ${f3(d.controlDiff)} | ${d.advance ? 'yes' : 'no'} |`);
  }
  L.push('', '## Why', '');
  for (const d of o.decisions) L.push(`- ${d.trait} (${d.arm}): ${d.advance ? 'advance' : 'stop'}, ${d.reason}.`);
  L.push('', '## Parameter sweep (premise, difference vs plain baseline; exploratory, not part of the rule)', '', '| Trait | Parameter | Value | Diff vs plain (95% CI) |', '|---|---|---|---|');
  for (const s of o.sweeps) L.push(`| ${s.trait} | ${s.param} | ${s.value} | ${f3(s.diffVsPlain.mean)} (${f3(s.diffVsPlain.lo)} to ${f3(s.diffVsPlain.hi)}) |`);
  L.push('', 'Model: a module has a type, a base success chance and at most one coupled dependency (it counts as correct only once its dependency is correct). An attempt succeeds with the base chance times the agent\'s skill for the type. In the premise, 30% of agents (never the reserve) die at seeded rounds in the first third; their unfinished modules are orphaned. Headcount is equal across arms. Numbers are solved-and-correct share at the final round over 400 paired runs.', '');
  return L.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('screen-loss.mjs')) {
  const out = run();
  const json = stableStringify(out) + '\n', md = card(out) + '\n';
  const jp = join(RESULTS_DIR, `${ID}.json`), mp = join(RESULTS_DIR, `${ID}.md`);
  if (process.argv.includes('--check')) {
    const same = existsSync(jp) && readFileSync(jp, 'utf8') === json && existsSync(mp) && readFileSync(mp, 'utf8') === md;
    console.log(same ? 'screen-loss: committed results match a fresh run' : 'screen-loss: committed results differ from a fresh run');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(jp, json); writeFileSync(mp, md);
  for (const d of out.decisions) console.log(`${d.trait} ${d.arm}: ${d.advance ? 'ADVANCE' : 'stop'} premise ${d.premiseDiff.toFixed(3)} control ${d.controlDiff.toFixed(3)}`);
}
