// Which classifier answers a Colony lab run's small decisions (goal first pass, chat assist). Leader decision 2026-11-22:
// the bench sends jev:{enabled:false} by default, so the LI, GN and CY series keep the model fallback of their earlier
// studies; Jev is on only when the spec asks (bench.jev, or armSpecs.<arm>.jev for a Jev arm), with its version pinned.
// Colony images before ba2ce00 ignore the field and record no classifier block; the lab boxes had no Jev key then, so
// those runs used the model fallback.
export const JEV_OFF = Object.freeze({ enabled: false });

export function jevFor(cfg, arm) {
  const want = (cfg.armSpecs || {})[arm]?.jev ?? cfg.bench?.jev ?? JEV_OFF;
  if (typeof want !== 'object' || want === null) throw Error(`jev for ${arm} must be an object`);
  if (want.enabled === false) return JEV_OFF;
  if (!/^jev-\d+\.\d+\.\d+$/.test(String(want.version || ''))) throw Error(`jev for ${arm} is on but its version is not pinned (e.g. "jev-1.14.0")`);
  return { enabled: true, version: want.version };
}

// The run record's classifier field: what the bench asked for, the run-level block of the export (null on Colony before
// ba2ce00), and who answered each goal first pass, with the Jev versions seen.
export function classifierSummary(exported, requested) {
  const decisions = (exported?.agents || []).flatMap((a) => (a.tasks || []).flatMap((t) => t.classifier || []));
  const first = decisions.filter((d) => d.decision === 'goal-first-pass'), by = {};
  for (const d of first) by[d.provider || 'none'] = (by[d.provider || 'none'] || 0) + 1;
  return { requested, run: exported?.classifier ?? null, recorded: !!exported?.classifier, firstPass: { decisions: first.length, byProvider: by,
    jevVersions: [...new Set(first.filter((d) => d.provider === 'jev').map((d) => d.version).filter(Boolean))],
    models: [...new Set(first.filter((d) => d.provider === 'model' && d.model).map((d) => `${d.model.provider}/${d.model.id}@${d.model.effort ?? 'default'}`))] } };
}
