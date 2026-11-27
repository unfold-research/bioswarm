// Per-wave telemetry for Phase 1b-r: numbers, IDs and instants only (no text, no path). Pure functions.
// Sources: the driver's tool calls (tool, place, accepted, ran, instants), the connector 0.3 local events
// (type 'decision' with wave, check, class, outcome, rule; marks with wave/check/class) and the verifier's waves.
// Intervals after a refusal are intervals, not proof that an agent waited because of it.

const writes = new Set(['write', 'edit']);

// placeOf(path) → check ID or null (maps a tool path to the place of a check; the path never leaves this function).
// Each write or edit is classified by the driver's tool events and the connector's own decision log, never by text:
//   written    — the tool ran and succeeded;
//   toolError  — the tool ran and failed (a real tool error, e.g. an edit that did not match), after an allowed decision;
//   refused    — blocked before running, with a connector decision (refused or yielded) logged during the call;
//   blocked    — blocked before running with no connector decision (sandbox, budget or study ceiling; all of B);
//   ambiguous  — a connector refusal fits more than one blocked call (same tool, check and instant); none is chosen.
// Intervals start when the refused call ended and run to the next accepted call that started after it, so they are
// never negative; parallel calls of the same response do not count as "after".
export function agentWave({ turn, waveStart, waveEnd, placeOf, decisions = [] }) {
  const t0 = Date.parse(turn.startedAt),
    t1 = Date.parse(turn.completedAt);
  const calls = [...(turn.toolCalls ?? [])].sort((a, b) => a.t0 - b.t0).map((c) => ({ tool: c.tool, check: c.path ? placeOf(c.path) : null, accepted: c.accepted === true, ran: c.ran === true, t0: c.t0, t1: c.t1 ?? c.t0 }));
  // A refusal decision belongs to the one blocked call with the same tool, the same check and the decision instant
  // inside the call. Two or more such calls are ambiguous and stay so: none of them counts as a refusal.
  for (const c of calls) if (writes.has(c.tool)) c.kind = c.ran ? (c.accepted ? 'written' : 'toolError') : 'blocked';
  let ambiguous = 0,
    unmatched = 0;
  for (const d of decisions.filter((d) => d.outcome === 'refused' || d.outcome === 'yielded')) {
    const fits = calls.filter((c) => c.kind === 'blocked' && !c.decision && c.tool === d.tool && c.check === (d.check ?? null) && d.at >= c.t0 && d.at <= c.t1);
    if (fits.length === 1) {
      fits[0].kind = 'refused';
      fits[0].decision = d;
    } else if (fits.length > 1) {
      ambiguous++;
      for (const c of fits) c.kind = 'ambiguous';
    } else unmatched++;
  }
  const refused = calls.filter((c) => c.kind === 'refused');
  const refusedByRule = {};
  for (const c of refused) refusedByRule[c.decision.rule ?? c.decision.outcome] = (refusedByRule[c.decision.rule ?? c.decision.outcome] ?? 0) + 1;
  const after = new Set();
  const gaps = refused.map((r) => {
    for (const c of calls) if (c.kind === 'written' && c.t0 >= r.t1 && c.check !== r.check) after.add(c);
    const next = calls.find((c) => c.accepted && c.ran && c.t0 >= r.t1);
    return next ? next.t0 - r.t1 : null;
  });
  const last = calls.at(-1);
  const count = (pred) => calls.filter(pred).reduce((acc, c) => ((acc[c.tool] = (acc[c.tool] ?? 0) + 1), acc), {});
  return {
    startOffsetMs: t0 - waveStart,
    endOffsetMs: t1 - waveStart,
    busyMs: t1 - t0,
    idleMs: Math.max(0, waveEnd - waveStart - (t1 - t0)),
    attempted: count(() => true),
    accepted: count((c) => c.accepted),
    refusedWrites: refused.length,
    refusedByRule,
    blockedWrites: calls.filter((c) => c.kind === 'blocked').length,
    toolErrors: calls.filter((c) => c.kind === 'toolError').length,
    ambiguousRefusals: ambiguous,
    unmatchedDecisions: unmatched,
    writesAfterRefusal: after.size,
    endedAfterRefusal: Boolean(last && last.kind === 'refused'),
    msRefusalToNextAccepted: gaps,
  };
}

// Per check and wave: class, whether it was published failing, decisions by outcome and rule, traces and yield marks
// tied to it, accepted writes on its place (from the driver: confirmed by the tool result), and whether it passed after.
export function checkWave({ map, published, decisions = [], marks = [], calls = [], markCheck, passedAfter }) {
  const failing = new Set(published.map((c) => c.id));
  return map.map((c) => {
    const d = decisions.filter((x) => x.check === c.id);
    const byOutcome = d.reduce((acc, x) => ((acc[x.outcome] = (acc[x.outcome] ?? 0) + 1), acc), {});
    const byRule = d.filter((x) => x.rule).reduce((acc, x) => ((acc[x.rule] = (acc[x.rule] ?? 0) + 1), acc), {});
    const m = marks.filter((x) => markCheck(x) === c.id);
    const acceptedWrites = calls.filter((x) => writes.has(x.tool) && x.accepted && x.ran && x.check === c.id).length;
    const toolErrors = calls.filter((x) => writes.has(x.tool) && !x.accepted && x.ran && x.check === c.id).length;
    return {
      check: c.id,
      class: c.class,
      failing: failing.has(c.id),
      decisions: byOutcome,
      refusedByRule: byRule,
      allowedAgents: [...new Set(d.filter((x) => x.outcome === 'allowed').map((x) => x.agent))].length,
      traces: m.filter((x) => x.kind === 'requirement').length,
      yields: m.filter((x) => x.kind === 'yielded').length,
      acceptedWrites,
      toolErrors,
      passedAfter: passedAfter.has(c.id),
    };
  });
}

// One line per class and arm for the report.
export function classSummary(waves) {
  const out = {};
  for (const w of waves)
    for (const c of w.checks) {
      const s = (out[c.class] ??= { checkWaves: 0, failing: 0, refused: 0, yielded: 0, traces: 0, acceptedWrites: 0, resolved: 0 });
      s.checkWaves++;
      if (c.failing) s.failing++;
      s.refused += c.decisions.refused ?? 0;
      s.yielded += c.decisions.yielded ?? 0;
      s.traces += c.traces;
      s.acceptedWrites += c.acceptedWrites;
      if (c.failing && c.passedAfter) s.resolved++;
    }
  return out;
}

// C under v2r: the wave the connector reads carries the header and the map's class on every check, and every logged
// decision on a check names that class.
export function coordinationOk({ wave, header, classOf, decisions }) {
  const published = Boolean(wave) && wave.coordination === header && wave.checks.every((c) => c.class === classOf.get(c.id));
  return published && decisions.filter((d) => d.check).every((d) => d.class === classOf.get(d.check));
}

// The wave barrier (Research review of 1b-r): the share of the wave's work done by the most loaded agent (longest turn
// over the sum of the three turns) and the idle seconds of the other agents until the barrier (the wave's end).
export function barrierWave(turns, waveEnd) {
  const spans = turns.map((t) => ({ agent: t.agent, busy: Date.parse(t.completedAt) - Date.parse(t.startedAt), end: Date.parse(t.completedAt) }));
  const total = spans.reduce((n, x) => n + x.busy, 0);
  const top = spans.reduce((a, b) => (b.busy > a.busy ? b : a));
  const others = spans.filter((x) => x !== top);
  return { loadShare: total > 0 ? top.busy / total : null, idleToBarrierSeconds: Object.fromEntries(others.map((x) => [x.agent, (waveEnd - x.end) / 1000])) };
}
export function barrierSummary(waves) {
  const shares = waves.map((w) => w.barrier.loadShare).filter(Number.isFinite);
  const idle = waves.flatMap((w) => Object.values(w.barrier.idleToBarrierSeconds));
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { waves: waves.length, meanLoadShare: mean(shares), meanIdleOthersSeconds: mean(idle) };
}
