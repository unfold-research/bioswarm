// Pilot cost accounting (LI42, decision B: Research Leader and Coordination Research, 2026-11-23).
// Two sums over the pilot's journal (results/<id>-pilot/batches.json):
//   cap total    every entry (applied waves, discarded parts, mirrored ledger entries): what run-rc3's cap check counts
//                (its spent-so-far sums every journal entry outside the current wave), so the pilot cap sees everything
//   projection   only the waves the run actually applied: what stop rule (a) projects (cases x the cost of one normal
//                pilot case). Cap-only entries are excluded.
// Cap-only entries are fixed here BY LEDGER NAME, not chosen later: a journal entry is cap-only if and only if its
// ledgerName is listed below. An entry flagged capOnly whose name is not listed is an error. Not a run-rc3 config source.
// Both projections are recorded: (B) as used by the gate, (A) as it would be with the incidents. The margin (the gate
// passed on (B) while (A) is above the study cap of the spec, sizes[0].cap) is settled by marginOutcome:
//   - spec.pilot.marginDecision present ({ proceedIfProjectionBAtMostUsd, approvedBy, at, source, text }, written in
//     advance; LI42 Amendment 4): within the margin, (B) at most the threshold -> the study proceeds, (B) above it -> final
//     stop for the Research Leader; the decision and outcome are recorded
//   - absent: the margin stops the study before its first wave (final), the Research Leader decides.
export const CAP_ONLY = Object.freeze({
  'li42-pilot-wave-1-p0': 'LI42 Amendment 3: the first pilot wave 1 was run from an incomplete wave 0 and discarded (never applied); its cost counts against the pilot cap, not in rule (a)',
  'li42-pilot-wave-1-p0-r2-cut524': 'LI42: 8 flex calls of the wave-1 manager plan request cut by HTTP 524 on the public endpoint, counted at full reserve; a pilot incident, counted against the pilot cap, not in rule (a)',
});
export const COST_ACCOUNTING = Object.freeze({
  decision: 'B',
  decidedBy: 'Research Leader and Coordination Research, 2026-11-23',
  reason: 'rule (a) projects the cost of a normal case; the discarded wave 1 and the 8 x 524 cut calls are pilot incidents; the cap counts everything',
  capOnly: Object.keys(CAP_ONLY),
});
export const MARGIN_LINE = 'margin: projection with incidents > cap; Research Leader decides before study wave 1';

export function validMarginDecision(d) {
  if (d == null) return null;
  const ok = d && typeof d === 'object' && Number.isFinite(d.proceedIfProjectionBAtMostUsd) && d.proceedIfProjectionBAtMostUsd > 0 && ['approvedBy', 'at', 'text'].every((k) => typeof d[k] === 'string' && d[k].trim());
  if (!ok) throw Error('spec pilot.marginDecision must be { proceedIfProjectionBAtMostUsd: number, approvedBy: string, at: string, text: string }');
  return d;
}
// what the sweep does after a passing gate: { action: 'continue' | 'stop', reason, line (for a stop), decision, outcome }.
// The margin is (A) above the study cap while (B) is not (rule (a) already stopped (B) above it). LI42 Amendment 4:
// (B) <= threshold -> proceed even when (A) > the study cap; (B) > threshold and (A) > the study cap -> final stop for the
// Research Leader; no margin -> proceed. Without a decision in the spec, the margin is a final stop.
export function marginOutcome(ca, decision) {
  const d = validMarginDecision(decision), A = ca.A.projectedUsd, B = ca.B.projectedUsd, cap = ca.studyCapUsd, margin = A > cap && B <= cap;
  const thr = d ? d.proceedIfProjectionBAtMostUsd : null, base = { projectionB: B, projectionA: A, studyCapUsd: cap, threshold: thr, margin };
  if (!margin) return { action: 'continue', reason: `no margin: (A) US$ ${A} is not above the study cap US$ ${cap}`, line: null, decision: d, outcome: { ...base, action: 'continue', reason: 'no margin' } };
  if (!d) return { action: 'stop', reason: `(A) US$ ${A} > study cap US$ ${cap} >= (B) US$ ${B}, no marginDecision in the spec`, line: MARGIN_LINE, decision: null, outcome: { ...base, action: 'stop' } };
  const go = B <= thr, reason = go ? `projection (B) US$ ${B} is at most US$ ${thr}: proceed to the study although (A) US$ ${A} is above the study cap US$ ${cap} (marginDecision, ${d.approvedBy})`
    : `projection (B) US$ ${B} is above US$ ${thr} and (A) US$ ${A} is above the study cap US$ ${cap} (marginDecision, ${d.approvedBy})`;
  return { action: go ? 'continue' : 'stop', reason, line: go ? null : `margin decision: projection (B) US$ ${B} > US$ ${thr} and (A) US$ ${A} > study cap US$ ${cap}; final stop, the Research Leader decides before study wave 1`, decision: d, outcome: { ...base, action: go ? 'continue' : 'stop', reason } };
}

const usdOf = (e) => (e.status === 'complete' || e.actualUsd != null ? e.actualUsd || 0 : e.reserveUsd || 0);
export const isCapOnly = (e) => Object.prototype.hasOwnProperty.call(CAP_ONLY, e?.ledgerName ?? '');

export function pilotCosts(journal) {
  const entries = Object.entries(journal || {});
  for (const [k, e] of entries) if (e?.capOnly && !isCapOnly(e)) throw Error(`journal ${k} is flagged capOnly but its ledger name ${e.ledgerName} is not a cap-only name (pilot-accounting.mjs)`);
  const applied = entries.filter(([, e]) => !isCapOnly(e)), sum = (xs) => xs.reduce((n, [, e]) => n + usdOf(e), 0);
  return { capTotalUsd: sum(entries), projectionUsd: sum(applied), startWaveUsd: sum(applied.filter(([k]) => k.startsWith('0.'))),
    capOnly: entries.filter(([, e]) => isCapOnly(e)).map(([key, e]) => ({ key, ledgerName: e.ledgerName, usd: usdOf(e), reason: CAP_ONLY[e.ledgerName] })) };
}

export function projections({ costs, cases, studyCapUsd }) {
  const A = +(cases * costs.capTotalUsd).toFixed(6), B = +(cases * costs.projectionUsd).toFixed(6);
  const marginStop = A > studyCapUsd && B <= studyCapUsd;
  return { studyCapUsd, cases, capTotalUsd: +costs.capTotalUsd.toFixed(6),
    B: { projectedUsd: B, perCaseUsd: +costs.projectionUsd.toFixed(6), usedByGate: true, note: 'applied waves only (decision B)' },
    A: { projectedUsd: A, perCaseUsd: +costs.capTotalUsd.toFixed(6), usedByGate: false, note: 'with the cap-only incidents' },
    capOnly: costs.capOnly, marginStop,
    marginNote: marginStop ? `The projection with the incidents (A) is US$ ${A}, above the study cap US$ ${studyCapUsd}, while the gate's projection (B) is US$ ${B}: the study does not start until the Research Leader decides (${MARGIN_LINE})` : null };
}
