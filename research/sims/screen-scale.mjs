// screen-scale: free simulation screen of two genome traits at scale (SIG-06 local reading of k = 6 neighbours,
// ACT-06 teams sized to their component). GN-S2 of Shared/unfold/genoma/GN-PLAN.md, section 3, with the parameters the
// plan fixed on 2026-11-21 before any code. Level L0 of the evidence ladder: it only says whether a trait is worth a
// paid study, never that it works. No model calls, no spend.
// Usage: node sims/screen-scale.mjs            writes results/sims/screen-scale.json and .md
//        node sims/screen-scale.mjs --check    exits 1 if the committed files differ from a fresh run (CI)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Rng, hashSeed, BASE_SEED, RESULTS_DIR, stableStringify, r, meanCI } from './lib.mjs';

export const ID = 'screen-scale';
export const VERSION = '1.0.0';

// Decision rule, fixed in GN-PLAN.md (GN-S2) before any code. Headcount is equal across arms (the manager counts in N).
export const RULE = {
  runs: 400,
  premiseM: 400, confirmM: 1000, exploratoryM: [160], controlM: 40,
  advance: 'A trait advances to a paid study only if, at M = 400, the mechanism beats the strongest baseline by at least +0.05 in the final solved-and-correct share (95% CI of the paired difference above 0); at M = 1000 the mean paired difference against the strongest baseline does not change sign (stays above 0); and in the control (M = 40) it does not lose more than 0.05 to the strongest baseline (lower 95% CI of the paired difference at or above -0.05). The strongest baseline is the arm with the highest mean share in that cell. For SIG-06 the baselines are the global board and the manager; for ACT-06 they also include spreading agents evenly and one agent per component. Seeds paired across arms; 400 runs per cell. M = 160 and every other table are exploratory.',
  // How the fixed parameters became code. These are the bench's reading of GN-PLAN, fixed before the first run.
  interpretation: [
    'World: the ring is cut into contiguous components with sizes drawn uniformly from 4 to 24 (a last piece under 4 joins the previous component). Inside a component every module except the first depends on one earlier module of the same component at ring distance 1 to 3 (so the component is connected), and with probability 0.5 on a second distinct one; dependencies never cross components. A module counts as correct only once it is solved and all its dependencies are correct (as in S1).',
    'Knowledge: an agent may attempt a module only if it read the module and all its dependencies in this round or the previous one, and it saw the dependencies solved. Reads are made at the start of the round, before any attempt. A read costs one module; the read limit is C = 8 per agent per round.',
    'Global board: each agent reads C modules drawn at random among the M; the read-cost secondary counts M per agent per round, as the plan says.',
    'Manager: one agent (counted in N) reads a window of C consecutive modules per round, sweeping the ring from module 0, and hands each ready module it found to an idle worker (at most C per round); a handed module counts as read by that worker. Workers without a hand-off behave as on the global board.',
    'SIG-06: agents start evenly spread on the ring; each round an agent reads its current module and the 6 neighbours at ring distance 1 to 3 (7 reads), attempts its current module if ready, else a ready module among those read (nearest first), and moves its current module there; with nothing ready and its current module solved, it moves 7 modules clockwise.',
    'ACT-06: components are taken in ring order; a component of size s gets a team of ceil(s/C) free agents and is worked only once that whole team is formed. A team shares its reads: each member reads up to C modules of its component (the team covers it whole), and each member attempts a different ready module. When a component is correct its team is released to the next unteamed component. Agents that cannot complete a team wait.',
    'Spread evenly (ACT-06 baseline): each agent owns a contiguous slice of M/N = 4 modules and reads the modules of its slice that are not yet correct, each preceded by its dependencies, up to C reads; when its slice is correct it takes the next slice clockwise that is not correct.',
    'One agent per component (ACT-06 baseline): components in ring order get one agent each while agents last; the agent reads the modules of its component that are not yet correct in ring order, each preceded by its dependencies, up to C reads, and attempts one ready module; when the component is correct it takes the next unassigned component. Spare agents wait.',
    'Success: an attempt succeeds with min(1, pBase * skill), skill 1.0 on the agent type (agent index mod T) and 0.35 otherwise, as in S1. Rounds to zero is the first round with every module correct, R + 1 if never.',
  ],
};
export const HYPOTHESIS = 'At M = 400 modules with a context limit of C = 8 modules per agent per round (N = M/4 agents, 16 rounds), reading only the k = 6 neighbours of the current module (SIG-06), or teams of ceil(s/C) agents formed per component before it is attacked (ACT-06), raises the final solved-and-correct share over the strongest baseline by >= +0.05 (paired 95% CI > 0), keeps the sign at M = 1000, and loses no more than 0.05 at M = 40. A screen (L0), not evidence that any trait works.';

export const PAR = { pBase: 0.55, skillHi: 1.0, skillLo: 0.35, T: 4, R: 16, C: 8, k: 6, sMin: 4, sMax: 24, secondDep: 0.5, maxDist: 3 };
export const SIZES = [40, 160, 400, 1000];
export const TRAITS = {
  'SIG-06': { arm: 'local', baselines: ['board', 'manager'] },
  'ACT-06': { arm: 'teams', baselines: ['board', 'manager', 'spread', 'percomp'] },
};
const ARMS = ['board', 'manager', 'local', 'teams', 'spread', 'percomp'];

export function world(M, seedKey) {
  const w = new Rng(hashSeed(BASE_SEED, 'screen-scale-world', M, seedKey));
  const comp = Array(M).fill(0), comps = [];
  let start = 0;
  while (start < M) { let s = PAR.sMin + w.int(PAR.sMax - PAR.sMin + 1); if (start + s > M) s = M - start; comps.push({ start, s }); start += s; }
  if (comps.length > 1 && comps[comps.length - 1].s < PAR.sMin) { const last = comps.pop(); comps[comps.length - 1].s += last.s; }
  const deps = Array.from({ length: M }, () => []);
  comps.forEach((c, ci) => {
    for (let m = c.start; m < c.start + c.s; m++) {
      comp[m] = ci;
      const lo = Math.max(c.start, m - PAR.maxDist), cand = []; for (let d = lo; d < m; d++) cand.push(d);
      if (!cand.length) continue;
      const a = cand[w.int(cand.length)]; deps[m].push(a);
      const rest = cand.filter((x) => x !== a); if (rest.length && w.bern(PAR.secondDep)) deps[m].push(rest[w.int(rest.length)]);
    }
  });
  const typ = Array.from({ length: M }, () => w.int(PAR.T));
  return { comp, comps, deps, typ };
}

// One run of one arm on one world. Returns the final share, rounds to zero and mean reads per agent per round.
function simulate(arm, M, seedKey) {
  const { comps, deps, typ } = world(M, seedKey);
  const N = Math.max(1, Math.round(M / 4)), { R, C, T } = PAR;
  const rng = new Rng(hashSeed(BASE_SEED, 'screen-scale-act', M, seedKey, arm));
  const solved = Array(M).fill(false), done = Array(M).fill(false);
  const lastRead = Array.from({ length: N }, () => new Map()); // module -> round last read (and solved state seen)
  const skill = (a, t) => (t === a % T ? PAR.skillHi : PAR.skillLo);
  const ring = (m) => ((m % M) + M) % M;
  let reads = 0, roundsToZero = R + 1;

  const recompute = () => { for (let m = 0; m < M; m++) done[m] = solved[m] && deps[m].every((d) => done[d]); }; // deps have lower index
  const read = (a, m, round) => { lastRead[a].set(m, { round, solved: solved[m], done: done[m] }); reads++; };
  const known = (a, m, round) => { const x = lastRead[a].get(m); return x && x.round >= round - 1 ? x : null; };
  // attemptable: read recently, seen unsolved, every dependency read recently and seen correct
  const canTry = (a, m, round) => { const x = known(a, m, round); if (!x || x.solved || solved[m]) return false; return deps[m].every((d) => { const y = known(a, d, round); return y && y.done; }); };
  const attempt = (a, m) => { if (rng.bern(Math.min(1, PAR.pBase * skill(a, typ[m])))) solved[m] = true; };
  const readRandom = (a, round) => { for (let i = 0; i < C; i++) read(a, rng.int(M), round); };
  // read set for a list of target modules: each target's dependencies, then the target, until C reads
  const plan = (targets) => { const out = []; for (const m of targets) { const need = [...deps[m], m].filter((x) => !out.includes(x)); if (out.length + need.length > C) break; out.push(...need); } return out; };
  const tryAmong = (a, ms, round, taken) => { const c = ms.filter((m) => !taken.has(m) && canTry(a, m, round)); if (!c.length) return -1; const m = c[rng.int(c.length)]; taken.add(m); attempt(a, m); return m; };

  // arm state
  const pos = Array.from({ length: N }, (_, i) => Math.floor((i * M) / N)); // local and spread
  let sweep = 0; // manager
  const teamOf = Array(N).fill(-1), compTaken = Array(comps.length).fill(false); // teams and percomp
  const compDone = (ci) => { const c = comps[ci]; for (let m = c.start; m < c.start + c.s; m++) if (!done[m]) return false; return true; };
  let nextComp = 0;

  for (let round = 0; round < R; round++) {
    const taken = new Set();
    if (arm === 'board') {
      for (let a = 0; a < N; a++) readRandom(a, round);
      for (let a = 0; a < N; a++) tryAmong(a, [...lastRead[a].keys()], round, taken);
      reads += N * (M - C); // the board's read cost counts M per agent per round
    } else if (arm === 'manager') {
      const mgr = 0, found = [];
      for (let i = 0; i < C; i++) { const m = ring(sweep + i); read(mgr, m, round); }
      sweep = ring(sweep + C);
      for (let i = 0; i < C; i++) { const m = ring(sweep - C + i); if (canTry(mgr, m, round)) found.push(m); }
      const handed = new Map();
      for (let a = 1; a < N && found.length; a++) { const m = found.shift(); handed.set(a, m); }
      for (let a = 1; a < N; a++) {
        if (handed.has(a)) { const m = handed.get(a); for (const x of [m, ...deps[m]]) lastRead[a].set(x, lastRead[mgr].get(x)); if (!taken.has(m)) { taken.add(m); attempt(a, m); } }
        else { readRandom(a, round); tryAmong(a, [...lastRead[a].keys()], round, taken); }
      }
    } else if (arm === 'local') {
      for (let a = 0; a < N; a++) {
        const win = []; for (let d = -PAR.k / 2; d <= PAR.k / 2; d++) win.push(ring(pos[a] + d));
        for (const m of win) read(a, m, round);
        let m = -1;
        if (!taken.has(pos[a]) && canTry(a, pos[a], round)) m = pos[a];
        else { const c = win.filter((x) => !taken.has(x) && canTry(a, x, round)).sort((x, y) => Math.abs(x - pos[a]) - Math.abs(y - pos[a])); if (c.length) m = c[0]; }
        if (m >= 0) { taken.add(m); attempt(a, m); pos[a] = m; } else if (solved[pos[a]]) pos[a] = ring(pos[a] + PAR.k + 1);
      }
    } else if (arm === 'spread') {
      const slice = M / N;
      for (let a = 0; a < N; a++) {
        const own = []; for (let i = 0; i < slice; i++) own.push(ring(pos[a] + i));
        if (own.every((m) => done[m])) { // take the next slice clockwise that is not correct
          for (let j = 1; j <= N; j++) { const p = ring(pos[a] + j * slice); let ok = true; for (let i = 0; i < slice; i++) if (!done[ring(p + i)]) { ok = false; break; } if (!ok) { pos[a] = p; break; } }
          own.length = 0; for (let i = 0; i < slice; i++) own.push(ring(pos[a] + i));
        }
        for (const m of plan(own.filter((x) => !done[x]))) read(a, m, round);
        tryAmong(a, own, round, taken);
      }
    } else if (arm === 'teams' || arm === 'percomp') {
      // release teams of correct components, then form new ones in ring order
      for (let a = 0; a < N; a++) if (teamOf[a] >= 0 && compDone(teamOf[a])) teamOf[a] = -1;
      for (;;) {
        while (nextComp < comps.length && (compTaken[nextComp] || compDone(nextComp))) nextComp++;
        if (nextComp >= comps.length) break;
        const need = arm === 'teams' ? Math.ceil(comps[nextComp].s / C) : 1;
        const free = []; for (let a = 0; a < N && free.length < need; a++) if (teamOf[a] < 0) free.push(a);
        if (free.length < need) break; // the team is not formed: wait
        for (const a of free) teamOf[a] = nextComp; compTaken[nextComp] = true; nextComp++;
      }
      const byComp = new Map(); for (let a = 0; a < N; a++) if (teamOf[a] >= 0) (byComp.get(teamOf[a]) || byComp.set(teamOf[a], []).get(teamOf[a])).push(a);
      for (const [ci, team] of byComp) {
        const c = comps[ci], mods = []; for (let m = c.start; m < c.start + c.s; m++) if (!done[m]) mods.push(m);
        if (arm === 'teams') {
          // each member reads up to C modules of the component; the team shares what it read
          const all = []; for (let m = c.start; m < c.start + c.s; m++) all.push(m);
          team.forEach((a, i) => { for (const m of all.slice(i * C, (i + 1) * C)) read(a, m, round); });
          const shared = new Map(); for (const a of team) for (const [m, v] of lastRead[a]) if (v.round === round) shared.set(m, v);
          for (const a of team) { for (const [m, v] of shared) lastRead[a].set(m, v); tryAmong(a, mods, round, taken); }
        } else {
          const a = team[0], view = plan(mods);
          for (const m of view) read(a, m, round);
          tryAmong(a, view, round, taken);
        }
      }
    }
    recompute();
    if (roundsToZero > R && done.every(Boolean)) roundsToZero = round + 1;
  }
  let ok = 0; for (let m = 0; m < M; m++) if (done[m]) ok++;
  return { share: ok / M, rounds: roundsToZero, readsPerAgentRound: reads / (N * R) };
}

const cell = (arm, M, key, runs) => { const s = [], rr = [], rd = []; for (let i = 0; i < runs; i++) { const o = simulate(arm, M, `${key}|${i}`); s.push(o.share); rr.push(o.rounds); rd.push(o.readsPerAgentRound); } return { s, rr, rd }; };
const diff = (a, b) => a.map((x, i) => x - b[i]);

export function run() {
  const cells = {}, rows = [];
  for (const M of SIZES) {
    const key = `M${M}`; cells[M] = {};
    for (const arm of ARMS) cells[M][arm] = cell(arm, M, key, RULE.runs); // same world seeds for every arm of a size
    for (const arm of ARMS) rows.push({ M, arm, share: meanCI(cells[M][arm].s), rounds: meanCI(cells[M][arm].rr), reads: meanCI(cells[M][arm].rd) });
  }
  const vsBest = (trait, M) => {
    const t = TRAITS[trait], best = t.baselines.reduce((b, x) => (meanCI(cells[M][x].s).mean > meanCI(cells[M][b].s).mean ? x : b));
    return { M, bestIs: best, ...meanCI(diff(cells[M][t.arm].s, cells[M][best].s)) };
  };
  const decisions = Object.entries(TRAITS).map(([trait, t]) => {
    const p = vsBest(trait, RULE.premiseM), q = vsBest(trait, RULE.confirmM), c = vsBest(trait, RULE.controlM), x = vsBest(trait, 160);
    const gain = p.mean >= 0.05 && p.lo > 0, keeps = q.mean > 0, safe = c.lo >= -0.05;
    return { trait, arm: t.arm, advance: gain && keeps && safe, gain, keeps, safe, premise: p, confirm: q, control: c, exploratory160: x,
      reason: gain && keeps && safe ? 'beats the strongest baseline at M = 400, keeps the sign at M = 1000 and costs little at M = 40'
        : !gain ? 'no gain of +0.05 over the strongest baseline at M = 400' : !keeps ? 'the sign does not hold at M = 1000' : 'loses too much at M = 40' };
  });
  const headline = decisions.map((d) => `${d.trait} (${d.arm}): ${d.advance ? 'advance' : 'stop'} — M=400 ${(d.premise.mean >= 0 ? '+' : '') + d.premise.mean.toFixed(3)} vs ${d.premise.bestIs}, M=1000 ${(d.confirm.mean >= 0 ? '+' : '') + d.confirm.mean.toFixed(3)}, M=40 ${(d.control.mean >= 0 ? '+' : '') + d.control.mean.toFixed(3)}`);
  const out = { id: ID, version: VERSION, rule: RULE, params: PAR, sizes: SIZES, traits: TRAITS, rows, decisions, headline };
  return JSON.parse(stableStringify(out), (k, v) => (typeof v === 'number' ? r(v, 4) : v));
}

const f3 = (x) => (x >= 0 ? '+' : '') + x.toFixed(3);
export function card(o) {
  const L = [], adv = o.decisions.filter((d) => d.advance).length;
  L.push('---', `id: ${ID}`, 'title: Free simulation screen of two traits at scale (context limit)', 'area: simulation', 'evidence: local-validation',
    `summary: ${adv} of ${o.decisions.length} traits (SIG-06, ACT-06) advance past the free screen at M = 400 with a context limit of C = 8.`, '---', '');
  L.push(`# Free screen: traits at scale with a context limit (v${o.version})`, '');
  L.push('Level L0 of the evidence ladder (`programs/coordination.md`). An abstract repair task on a ring of M modules in connected components of 4 to 24, with dependencies at distance up to 3; N = M/4 agents, 16 rounds, one attempt per agent per round, and each agent may read at most C = 8 modules per round. GN-S2 of `Shared/unfold/genoma/GN-PLAN.md`, parameters fixed there before any code.', '');
  L.push('**Rule (fixed before the first run).** ' + o.rule.advance, '');
  L.push('## Decision', '', '| Trait | Mechanism | M = 400 vs strongest (95% CI) | Strongest | M = 1000 vs strongest | M = 40 vs strongest (95% CI) | Advance |', '|---|---|---|---|---|---|---|');
  for (const d of o.decisions) L.push(`| ${d.trait} | ${d.arm} | ${f3(d.premise.mean)} (${f3(d.premise.lo)} to ${f3(d.premise.hi)}) | ${d.premise.bestIs} | ${f3(d.confirm.mean)} (vs ${d.confirm.bestIs}) | ${f3(d.control.mean)} (${f3(d.control.lo)} to ${f3(d.control.hi)}) | ${d.advance ? 'yes' : 'no'} |`);
  L.push('', '## Why', ''); for (const d of o.decisions) L.push(`- ${d.trait} (${d.arm}): ${d.advance ? 'advance' : 'stop'}, ${d.reason}. Exploratory M = 160: ${f3(d.exploratory160.mean)} vs ${d.exploratory160.bestIs}.`);
  L.push('', '## All arms (exploratory tables; the decision uses only the cells above)', '', '| M | Arm | Share (95% CI) | Rounds to zero | Modules read per agent per round |', '|---|---|---|---|---|');
  for (const x of o.rows) L.push(`| ${x.M} | ${x.arm} | ${x.share.mean.toFixed(3)} (${x.share.lo.toFixed(3)} to ${x.share.hi.toFixed(3)}) | ${x.rounds.mean.toFixed(1)} | ${x.reads.mean.toFixed(1)} |`);
  L.push('', '## How the parameters became code (fixed before the first run)', ''); for (const s of o.rule.interpretation) L.push(`- ${s}`);
  L.push('');
  return L.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('screen-scale.mjs')) {
  const out = run();
  const json = stableStringify(out) + '\n', md = card(out) + '\n';
  const jp = join(RESULTS_DIR, `${ID}.json`), mp = join(RESULTS_DIR, `${ID}.md`);
  if (process.argv.includes('--check')) {
    const same = existsSync(jp) && readFileSync(jp, 'utf8') === json && existsSync(mp) && readFileSync(mp, 'utf8') === md;
    console.log(same ? 'screen-scale: committed results match a fresh run' : 'screen-scale: committed results differ from a fresh run');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(jp, json); writeFileSync(mp, md);
  for (const h of out.headline) console.log(h);
}
