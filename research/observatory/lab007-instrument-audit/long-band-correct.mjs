// Applies the long-band price corrections recomputed by long-band-recompute.mjs: one correctStudyCost per study whose
// banded cost is above what its wave entries recorded, through the ledger's own lock. Only studies where the old flat
// price reproduces the ledger are corrected. Owner approval: "Recalcular e corrigir" (2026-11-20, relayed by the
// Research Leader). The cap is not touched.
//   node observatory/lab007-instrument-audit/long-band-correct.mjs <recompute.json> [ledger.json]   (default: UNFOLD_LEDGER or the repo copy)
import fs from 'node:fs';
import { correctStudyCost, DEFAULT_FILE } from './global-budget.mjs';
const rec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), file = process.argv[3] || DEFAULT_FILE;
const APPROVAL = 'Owner, 2026-11-20: "Recalcular e corrigir" (relayed by the Research Leader, message 1437df12)';
const REASON = 'run-rc priced every batch request at Haiku 5.5 short-band rates; requests with more than 100,000 prompt tokens are billed at the long band (5x). Recomputed from the raw batch results with pricing.mjs.';
for (const s of rec.studies) {
  if (!s.flatMatchesLedger || s.missingFiles.length || !s.longRequests || s.deltaUsd <= 0.0001) continue; // rounding is not a correction
  const r = await correctStudyCost({ file, study: s.out, oldUsd: s.oldUsd, newUsd: s.bandedUsd, reason: REASON, approval: APPROVAL, evidence: `results/lab007-economy-explore/long-band-correction-2026-11-20.json (${s.longRequests} of ${s.requests} requests above 100k prompt tokens; raw: ${s.source})` });
  console.log(JSON.stringify({ study: s.out, oldUsd: s.oldUsd, newUsd: s.bandedUsd, deltaUsd: r.deltaUsd, new: r.isNew, committedUsd: +r.committedUsd.toFixed(4) }));
}
