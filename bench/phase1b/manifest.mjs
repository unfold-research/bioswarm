// Prints the freeze manifest of a case: per seed, the SHA-256 of its inputs, the check map and the opportunity totals.
// node bench/phase1b/manifest.mjs > bench/phase1b/manifest.json; PHASE1B_CASE=v2 ... > bench/phase1b/v2/manifest.json
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cases, selectCase } from './cases.mjs';

export function manifest(kase = cases.v1) {
  const { calibrationSeeds, checkMap, inputHashes, opportunityTotals, sampleSeeds } = kase;
  const seeds = {};
  for (const seed of [...sampleSeeds, ...calibrationSeeds]) {
    const dir = mkdtempSync(join(tmpdir(), 'phase1b-manifest-'));
    try {
      seeds[seed] = { role: sampleSeeds.includes(seed) ? 'sample' : 'calibration', inputs: inputHashes(seed, dir), map: checkMap(seed), totals: opportunityTotals(seed) };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  if (kase.version === 'v1') return { protocol: 'results/phase1b/PREREG.md', seeds };
  return { protocol: kase.version === 'v2r' ? 'results/phase1b-r/PREREG.md' : 'results/phase1b/PREREG.md', case: kase.version, design: 'results/phase1b/CASO-V2.md', seeds };
}
if (import.meta.url === 'file://' + process.argv[1]) console.log(JSON.stringify(manifest(selectCase()), null, 1));
