// screen-scale-n: AU-R3 of programs/autonomy.md (agenda item 3). Free simulation screen of team size against load:
// N varies at fixed M, from M/N = 2 to 16 modules per agent, under GN-S2's context limit (C = 8 reads per agent per round).
// It screens AU-S1 (capacity threshold) and AU-S2 (load per agent) before any paid size arm. Level L0 of the evidence
// ladder: it only says whether a paid size arm is worth running, never that a rule works. No model calls, no spend.
//
// Source of the model (Genome Research's condition 2, agreed 2026-11-22). The world, the knowledge rule, the success rule and
// the SIG-06 `local`, even-split `spread`, `board` and `manager` arms are GN-S2's (`sims/screen-scale.mjs` v1.0.0, code
// sha256 71e3c2f1eb30c594125b597b10505ccff22a1060dfb7de79eae111a3df2983c9, registered in results/sims/PREREGISTRATION.jsonl
// on 2026-11-22 with "the 9 interpretation choices in RULE.interpretation and the GN-S2 rule were confirmed by Genome
// Research"). `world` and `PAR` are imported unchanged from that file; `simulate` is not exported there, so it is copied
// below with only these changes: N and R are parameters (GN-S2 fixed N = M/4 and R = 16), the spread slice is M/N (GN-S2: 4),
// and one reference arm is added (`single`). The nine confirmed choices therefore hold here unchanged: SIG-06 reads the
// neighbourhood of 3 on each side (k = 6), a module is ready only with its dependencies read and seen correct, C = 8, and the
// rest as in GN-S2's RULE.interpretation. sims/screen-scale.mjs is not modified; this file checks its hash at run time.
// What AU-R3 shows about SIG-06 is N data for the AU programme and does not change GN-S2's verdict (condition 3).
//
// Usage: node sims/screen-scale-n.mjs            writes results/au-r3/analysis.json
//        node sims/screen-scale-n.mjs --check    exits 1 if the committed analysis.json differs from a fresh run
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Rng, hashSeed, BASE_SEED, ROOT, stableStringify, r, meanCI, sha256File } from './lib.mjs';
import { world, PAR, VERSION as GN_S2_VERSION } from './screen-scale.mjs';

export const ID = 'screen-scale-n';
export const VERSION = '1.0.0';
export const GN_S2_SHA256 = '71e3c2f1eb30c594125b597b10505ccff22a1060dfb7de79eae111a3df2983c9';
export const OUT_DIR = join(ROOT, 'results', 'au-r3');

export const PRIMARY_M = 400;
export const EXPLORATORY_M = [160];
export const LOADS = [2, 4, 5, 8, 10, 16]; // modules per agent, M/N; N = M / load is an integer for M = 400 and M = 160
export const REGIMES = {
  fixed: { label: 'fixed time', rounds: () => PAR.R }, // R = 16 for every N, as GN-S2 (a fixed time cap, like the Colony's)
  matched: { label: 'matched attempts', rounds: (load) => 4 * load }, // N * R = 4M: the total attempt budget of GN-S2 at M/N = 4
};
export const ARMS = ['spread', 'local', 'single', 'board', 'manager'];
export const RUNS = 400;
// GN-S2's published M = 400 table (results/sims/screen-scale.md), for the fidelity check of the copied code at M/N = 4, R = 16
export const GN_S2_M400 = { local: 0.334, spread: 0.310, board: 0.109, manager: 0.116 };

export const HYPOTHESIS = 'AU-R3 (free screen, L0). In GN-S2\'s free model at M = 400 with C = 8, varying N so that M/N runs from 2 to 16: (AU-R3a, AU-S2 screen) at a fixed time of 16 rounds the unsolved module share of the even split and of SIG-06 local rises from M/N = 2 to 16 by at least 0.05 without falling by more than 0.01 between neighbouring loads; (AU-R3b, AU-S1 screen) at matched attempts (N x R = 4M) adding agents raises the solved-and-correct share only while the load is above C (8 to 16 modules per agent: +0.03 or more, CI above 0) and not below it (2 versus 8: at most +0.02), and no team arm beats the single agent with everything; (AU-R3c) the SIG-06 local gain over the even split is reported at every load, with where it shrinks to under half its M/N = 4 value and where it reverses. Rules in tasks/AU-R3-SCALE-N-SCREEN-PREREG.md.';

// Copied from sims/screen-scale.mjs v1.0.0 `simulate` (GN-S2); see the header for the only changes.
function simulate(arm, M, N, R, seedKey, regime) {
  const { comps, deps, typ } = world(M, seedKey);
  const { C, T } = PAR;
  const rng = new Rng(hashSeed(BASE_SEED, 'screen-scale-n-act', M, N, R, regime, seedKey, arm));
  const solved = Array(M).fill(false), done = Array(M).fill(false);
  const lastRead = Array.from({ length: N }, () => new Map());
  const skill = (a, t) => (t === a % T ? PAR.skillHi : PAR.skillLo);
  const ring = (m) => ((m % M) + M) % M;
  let reads = 0, attempts = 0, roundsToZero = R + 1;

  const recompute = () => { for (let m = 0; m < M; m++) done[m] = solved[m] && deps[m].every((d) => done[d]); };
  const read = (a, m, round) => { lastRead[a].set(m, { round, solved: solved[m], done: done[m] }); reads++; };
  const known = (a, m, round) => { const x = lastRead[a].get(m); return x && x.round >= round - 1 ? x : null; };
  const canTry = (a, m, round) => { const x = known(a, m, round); if (!x || x.solved || solved[m]) return false; return deps[m].every((d) => { const y = known(a, d, round); return y && y.done; }); };
  const attempt = (a, m) => { attempts++; if (rng.bern(Math.min(1, PAR.pBase * skill(a, typ[m])))) solved[m] = true; };
  const readRandom = (a, round) => { for (let i = 0; i < C; i++) read(a, rng.int(M), round); };
  const plan = (targets) => { const out = []; for (const m of targets) { const need = [...deps[m], m].filter((x) => !out.includes(x)); if (out.length + need.length > C) break; out.push(...need); } return out; };
  const tryAmong = (a, ms, round, taken) => { const c = ms.filter((m) => !taken.has(m) && canTry(a, m, round)); if (!c.length) return -1; const m = c[rng.int(c.length)]; taken.add(m); attempt(a, m); return m; };

  const pos = Array.from({ length: N }, (_, i) => Math.floor((i * M) / N));
  let sweep = 0;

  for (let round = 0; round < R; round++) {
    const taken = new Set();
    if (arm === 'board') {
      for (let a = 0; a < N; a++) readRandom(a, round);
      for (let a = 0; a < N; a++) tryAmong(a, [...lastRead[a].keys()], round, taken);
      reads += N * (M - C);
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
        if (own.every((m) => done[m])) {
          for (let j = 1; j <= N; j++) { const p = ring(pos[a] + j * slice); let ok = true; for (let i = 0; i < slice; i++) if (!done[ring(p + i)]) { ok = false; break; } if (!ok) { pos[a] = p; break; } }
          own.length = 0; for (let i = 0; i < slice; i++) own.push(ring(pos[a] + i));
        }
        for (const m of plan(own.filter((x) => !done[x]))) read(a, m, round);
        tryAmong(a, own, round, taken);
      }
    } else if (arm === 'single') {
      // AU-R3 reference, not in GN-S2: one agent with everything. It reads all M modules every round (no context limit) and
      // makes N attempts per round on distinct ready modules chosen at random (the team's attempt budget). Attempt slot j
      // uses the skill of agent index j (type j mod T), so its skill mix equals the team's.
      for (let m = 0; m < M; m++) read(0, m, round);
      const ready = []; for (let m = 0; m < M; m++) if (canTry(0, m, round)) ready.push(m);
      const n = Math.min(N, ready.length);
      for (let j = 0; j < n; j++) { const i = j + rng.int(ready.length - j); const m = ready[i]; ready[i] = ready[j]; ready[j] = m; attempt(j, m); }
    }
    recompute();
    if (roundsToZero > R && done.every(Boolean)) roundsToZero = round + 1;
  }
  let ok = 0; for (let m = 0; m < M; m++) if (done[m]) ok++;
  const agents = arm === 'single' ? 1 : N;
  return { share: ok / M, full: ok === M ? 1 : 0, rounds: roundsToZero, readsPerAgentRound: reads / (agents * R), attempts };
}

const cellRuns = (arm, M, N, R, regime) => {
  const s = [], f = [], rr = [], rd = [], at = [];
  // the same worlds (`au-r3|i`) for every arm, load and regime of a size: differences are paired by world
  for (let i = 0; i < RUNS; i++) { const o = simulate(arm, M, N, R, `au-r3|${i}`, regime); s.push(o.share); f.push(o.full); rr.push(o.rounds); rd.push(o.readsPerAgentRound); at.push(o.attempts); }
  return { s, f, rr, rd, at };
};
const diff = (a, b) => a.map((x, i) => x - b[i]);
const ci = (a) => meanCI(a);

export function run() {
  const gnSha = sha256File(join(ROOT, 'sims', 'screen-scale.mjs'));
  if (gnSha !== GN_S2_SHA256) throw new Error(`sims/screen-scale.mjs changed since GN-S2's registration (sha256 ${gnSha})`);
  const raw = {}, rows = [];
  for (const M of [PRIMARY_M, ...EXPLORATORY_M]) for (const [regime, g] of Object.entries(REGIMES)) for (const load of LOADS) {
    const N = M / load, R = g.rounds(load);
    for (const arm of ARMS) {
      const c = cellRuns(arm, M, N, R, regime);
      (raw[`${M}|${regime}|${load}`] ||= {})[arm] = c;
      rows.push({ M, regime, load, N, R, arm, share: ci(c.s), unsolved: ci(c.s.map((x) => 1 - x)), fullySolved: ci(c.f), rounds: ci(c.rr), reads: ci(c.rd), attempts: ci(c.at) });
    }
  }
  const cell = (M, regime, load) => raw[`${M}|${regime}|${load}`];

  // Fidelity of the copied code: M = 400, M/N = 4, R = 16 is GN-S2's own cell on new worlds
  const fidelity = Object.entries(GN_S2_M400).map(([arm, ref]) => { const m = ci(cell(PRIMARY_M, 'fixed', 4)[arm].s).mean; return { arm, gnS2: ref, auR3: m, diff: m - ref, ok: Math.abs(m - ref) <= 0.01 }; });
  const faithful = fidelity.every((x) => x.ok);

  const decide = (M) => {
    // AU-R3a (AU-S2 screen), regime fixed: unsolved share rises from 2 to 16, no fall above 0.01 between neighbouring loads
    const s2 = ['spread', 'local'].map((arm) => {
      const u = (load) => cell(M, 'fixed', load)[arm].s.map((x) => 1 - x);
      const rise = ci(diff(u(16), u(2)));
      const steps = LOADS.slice(1).map((load, i) => ({ from: LOADS[i], to: load, ...ci(diff(u(load), u(LOADS[i]))) }));
      const monotone = steps.every((x) => x.mean >= -0.01);
      const supported = rise.mean >= 0.05 && rise.lo > 0 && monotone;
      const refuted = rise.mean < 0.05 || rise.lo <= 0;
      return { arm, rise2to16: rise, steps, monotone, verdict: supported ? 'supported' : refuted ? 'not supported' : 'partially supported' };
    });
    const s2v = s2.every((x) => x.verdict === 'supported') ? 'supported' : s2.every((x) => x.verdict === 'not supported') ? 'not supported' : 'partially supported';
    // AU-R3b (AU-S1 screen), regime matched: adding agents helps above C (16 -> 8), not below (8 -> 2); no team beats single
    const s1 = ['spread', 'local'].map((arm) => {
      const sh = (load) => cell(M, 'matched', load)[arm].s;
      const above = ci(diff(sh(8), sh(16))), below = ci(diff(sh(2), sh(8)));
      const aboveOk = above.mean >= 0.03 && above.lo > 0, belowOk = below.mean <= 0.02;
      return { arm, gain16to8: above, gain8to2: below, aboveOk, belowOk };
    });
    const beats = [];
    for (const regime of Object.keys(REGIMES)) for (const load of LOADS) for (const arm of ['spread', 'local', 'board', 'manager']) {
      const d = ci(diff(cell(M, regime, load)[arm].s, cell(M, regime, load).single.s));
      if (d.mean > 0.02 && d.lo > 0) beats.push({ regime, load, arm, ...d });
    }
    const allOk = s1.every((x) => x.aboveOk && x.belowOk) && beats.length === 0;
    const s1v = beats.length > 0 || s1.every((x) => !x.belowOk) ? 'not supported' : allOk ? 'supported' : 'partially supported';
    // AU-R3c (SIG-06 N data): local minus spread, and local minus the stronger of board and manager (GN-S2's baselines)
    const sig = [];
    for (const regime of Object.keys(REGIMES)) {
      const anchor = ci(diff(cell(M, regime, 4).local.s, cell(M, regime, 4).spread.s)).mean;
      for (const load of LOADS) {
        const c = cell(M, regime, load);
        const vsSpread = ci(diff(c.local.s, c.spread.s));
        const best = ci(c.board.s).mean >= ci(c.manager.s).mean ? 'board' : 'manager';
        const vsGn = ci(diff(c.local.s, c[best].s));
        const state = vsSpread.hi < 0 ? 'reverses' : vsSpread.mean >= 0.02 && vsSpread.lo > 0 ? (vsSpread.mean < anchor / 2 ? 'holds, shrunk' : 'holds') : (vsSpread.mean < anchor / 2 ? 'shrunk to a tie' : 'tie');
        sig.push({ regime, load, N: M / load, vsSpread, anchorAt4: anchor, state, vsGnS2Baseline: { baseline: best, ...vsGn } });
      }
    }
    const firstOf = (regime, pred) => (sig.find((x) => x.regime === regime && pred(x)) || {}).load ?? null;
    const sigSummary = Object.fromEntries(Object.keys(REGIMES).map((regime) => [regime, {
      reversesAt: sig.filter((x) => x.regime === regime && x.state === 'reverses').map((x) => x.load),
      shrinksBelowHalfAt: sig.filter((x) => x.regime === regime && x.vsSpread.mean < x.anchorAt4 / 2).map((x) => x.load),
      firstReversal: firstOf(regime, (x) => x.state === 'reverses'),
    }]));
    return { M, s2: { verdict: s2v, arms: s2 }, s1: { verdict: s1v, arms: s1, teamBeatsSingle: beats }, sig06: { cells: sig, summary: sigSummary } };
  };

  const primary = decide(PRIMARY_M), exploratory = EXPLORATORY_M.map(decide);
  const rev = Object.entries(primary.sig06.summary).filter(([, v]) => v.reversesAt.length).map(([k, v]) => `${k} at M/N = ${v.reversesAt.join(', ')}`);
  const headline = [
    `fidelity to GN-S2 at M = 400, M/N = 4, R = 16: ${faithful ? 'within 0.01 for all four arms' : 'FAILED'}`,
    `AU-R3a (AU-S2 screen, fixed time): ${primary.s2.verdict}`,
    `AU-R3b (AU-S1 screen, matched attempts): ${primary.s1.verdict}`,
    `AU-R3c (SIG-06 local vs even split): ${rev.length ? 'reverses, ' + rev.join('; ') : 'does not reverse at any M/N from 2 to 16'}`,
  ];
  const out = { id: ID, version: VERSION, gnS2: { file: 'sims/screen-scale.mjs', version: GN_S2_VERSION, sha256: gnSha }, params: PAR, primaryM: PRIMARY_M, exploratoryM: EXPLORATORY_M,
    loads: LOADS, regimes: Object.fromEntries(Object.entries(REGIMES).map(([k, g]) => [k, { label: g.label, rounds: LOADS.map((l) => g.rounds(l)) }])), arms: ARMS, runs: RUNS,
    seeds: { base: BASE_SEED, world: "world(M, 'au-r3|i') from GN-S2, i = 0..399", act: "hashSeed(BASE_SEED, 'screen-scale-n-act', M, N, R, regime, 'au-r3|i', arm)" },
    hypothesis: HYPOTHESIS, fidelity: { faithful, arms: fidelity }, primary, exploratory, rows, headline };
  return JSON.parse(stableStringify(out), (k, v) => (typeof v === 'number' ? r(v, 4) : v));
}

if (process.argv[1] && process.argv[1].endsWith('screen-scale-n.mjs')) {
  const out = run();
  const json = stableStringify(out) + '\n', jp = join(OUT_DIR, 'analysis.json');
  if (process.argv.includes('--check')) {
    const same = existsSync(jp) && readFileSync(jp, 'utf8') === json;
    console.log(same ? 'screen-scale-n: committed analysis matches a fresh run' : 'screen-scale-n: committed analysis differs from a fresh run');
    process.exit(same ? 0 : 1);
  }
  mkdirSync(OUT_DIR, { recursive: true }); writeFileSync(jp, json);
  for (const h of out.headline) console.log(h);
}
