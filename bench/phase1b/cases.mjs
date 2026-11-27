// Case selection (PHASE1B_CASE): v1 stays the default and frozen; v2 (results/phase1b/CASO-V2.md) runs only when
// selected and, live, only after its approval file exists. Each case brings its fixtures, map, verifier, private
// paths (manifest and test-only solution) and its own pre-sample thresholds.
import { join } from 'node:path';
import * as v1 from './case.mjs';
import * as v1verify from './verify.mjs';
import * as v2 from './v2/case.mjs';
import * as v2verify from './v2/verify.mjs';

const here = import.meta.dirname;
export const cases = {
  v1: {
    version: 'v1',
    ...pick(v1),
    verifyAttempt: v1verify.verifyAttempt,
    describe: v1verify.describe,
    memoFigures: (o) => {
      const t = [...o.balances.values()].reduce((s, r) => s.map((v, i) => v + r[i]), [0, 0, 0, 0]);
      return { grossCents: t[0], refundCents: t[1], paidCents: t[2], differenceCents: t[3], exceptions: o.exceptions.size };
    },
    manifestPath: join(here, 'manifest.json'),
    solutionDir: join(here, 'fixtures', 'solution'),
    gate: { mapDirected: 2, mapDispute: 2, directed: 2, dispute: 2, costShare: null, longRunSeconds: null },
  },
  v2: {
    version: 'v2',
    ...pick(v2),
    verifyAttempt: v2verify.verifyAttempt,
    describe: v2verify.describe,
    memoFigures: v2verify.memoFigures,
    manifestPath: join(here, 'v2', 'manifest.json'),
    solutionDir: join(here, 'v2', 'fixtures', 'solution'),
    // Research review of 26/11 (714fe625): map ≥5 active directed and ≥5 symmetric per seed; ≥4 of each observed from
    // wave 1 in calibration and in every sample seed; A's median cost ≤ 50% of the US$ 9 brake; any calibration
    // attempt above 75 min reported to the Research Leader before the sample.
    gate: { mapDirected: 5, mapDispute: 5, directed: 4, dispute: 4, costShare: 0.5, longRunSeconds: 75 * 60 },
  },
  // Phase 1b-r (Research Leader orders ea18aa73 and 34c72464): B against C with connector 0.3 on the same v2 case,
  // new seeds disjoint from v1, v2 calibration and the 1b sample; no A arm. The 1b revision stays as it was.
  v2r: {
    version: 'v2r',
    ...pick(v2),
    sampleSeeds: [5011, 5023, 5039, 5051],
    calibrationSeeds: [],
    sequences: ['BC', 'CB', 'BC', 'CB'],
    coordination: 'scoped-v1', // published in every wave header with each check's class; only C's connector acts on it
    verifyAttempt: v2verify.verifyAttempt,
    describe: v2verify.describe,
    memoFigures: v2verify.memoFigures,
    manifestPath: join(here, '..', 'phase1b-r', 'manifest.json'),
    solutionDir: join(here, 'v2', 'fixtures', 'solution'),
    gate: { mapDirected: 5, mapDispute: 5, directed: 4, dispute: 4, costShare: null, longRunSeconds: 75 * 60 },
    // Study-level brake: no attempt starts unless the spent estimate plus the costliest 1b attempt (US$ 1,05) stays
    // within US$ 7,50. The per-turn (US$ 3) and per-attempt (US$ 9) brakes are unchanged.
    studyBrakeUsd: 7.5,
    attemptReserveUsd: 1.05,
    // Judge reserve per memo not yet judged: ~10× the fixed-table equivalent of the Luna calibration receipts (8 memos,
    // 4.450 input and 1.013 output tokens: US$ 0,0024 per memo). Integrity and facts run on the local provider (US$ 0).
    judgeReservePerMemoUsd: 0.025,
  },
};
function pick(m) {
  const { sampleSeeds, calibrationSeeds, team, roles, checkMap, opportunityTotals, prepareCase, inputHashes, inputFiles, brief, stub, design } = m;
  return { sampleSeeds, calibrationSeeds, team, roles, checkMap, opportunityTotals, prepareCase, inputHashes, inputFiles, brief, stub, design };
}
export function selectCase(name = process.env.PHASE1B_CASE || 'v1') {
  if (!cases[name]) throw Error('Unknown case ' + name + ' (v1, v2 or v2r)');
  return cases[name];
}
