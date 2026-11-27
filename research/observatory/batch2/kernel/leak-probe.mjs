// Leak probe: before a paid run, check that the target of a perturbation cannot be read off the view an agent is shown.
// Free, no model call. Motivation: results/batch2-r2-regimes/REPORT.md, "The flaw" (an orchestrator located the edited
// block from the first counts, 88 of 120 picks against 30 by chance, because the generator had put the leader's
// largest counts there).
//
// A case is { candidates: [{ id, features: { name: number } }], targets: [id] }. For every feature and both directions,
// the probe picks as many candidates as there are targets, by rank, and counts hits. It reports the share of hits, the
// share expected by chance and a z score over all cases; |z| >= 3 on any feature is a leak.
// It finds only leaks that a single ranked feature exposes. It is a gate against the obvious, not a proof of absence.
// `variance: 'empirical'` uses the spread of hits per case over the cases in place of the hypergeometric variance. Use it
// when targets are clustered on a feature (all targets of a case share one value of it): hits are then all or nothing
// per case and the hypergeometric variance is too small, which inflates z (seen in PD1, where the edited parts share a label).
export function probe(cases, { zLimit = 3, variance: mode = 'hypergeometric' } = {}) {
  const names = [...new Set(cases.flatMap((c) => c.candidates.flatMap((x) => Object.keys(x.features))))], out = [];
  for (const name of names) for (const dir of ['max', 'min']) {
    let hits = 0, expected = 0, variance = 0, picks = 0; const per = [];
    for (const c of cases) { const k = c.targets.length, n = c.candidates.length, t = new Set(c.targets);
      // ties are broken by id so that the probe is deterministic and does not depend on candidate order
      const ranked = [...c.candidates].sort((a, b) => (dir === 'max' ? b.features[name] - a.features[name] : a.features[name] - b.features[name]) || String(a.id).localeCompare(String(b.id)));
      const h = ranked.slice(0, k).filter((x) => t.has(x.id)).length; per.push(h - k * k / n); hits += h; picks += k; expected += k * k / n; variance += k * (k / n) * (1 - k / n) * (n - k) / Math.max(1, n - 1); }
    if (mode === 'empirical' && per.length > 1) { const m = per.reduce((x, y) => x + y, 0) / per.length; variance = per.length * per.reduce((x, y) => x + (y - m) ** 2, 0) / (per.length - 1); }
    const z = variance > 0 ? (hits - expected) / Math.sqrt(variance) : 0; out.push({ feature: name, direction: dir, hits, picks, share: hits / picks, chance: expected / picks, z });
  }
  out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return { leak: out.some((x) => Math.abs(x.z) >= zLimit), zLimit, worst: out[0] || null, features: out };
}
