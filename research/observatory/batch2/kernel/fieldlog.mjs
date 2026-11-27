// Field log: one append-only event format for everything that happens on a field, and a fold that recomputes a run's
// outcome from the log alone. Proposed in research/architecture/README.md (06, "What to build first"; 03, the five
// operators). This first version covers the regime studies R1, R2 and R2b; the acceptance test is that their published
// accuracy tables are reproduced from the log (kernel/fieldlog.test.mjs).
//
// Event: { seq, run, round, actor, kind, place, payload }
//   kind  'deposit'  a count left on a place by a worker            payload { counts }
//         'edit'     a change of the artefact by the environment     payload { parts }      (the perturbation)
//         'assign'   an orchestrator's assignment                    payload { places }
//         'answer'   an answer given by a model instead of by fold   payload { author }
//   run   one collection in one condition; place is a part or a unit of parts ("3" or "0+1")
// Agents, harness rules, the operator and perturbations all write the same kind of row; nothing else is state.
export const event = (seq, run, round, actor, kind, place, payload) => ({ seq, run, round, actor, kind, place, payload });
// Fold a run's deposits into an answer. rule: 'latest' (the latest count of each place wins) or { decay, rounds }
// (the mean of a place's counts weighted by decay^(rounds - round)). Returns the author with the largest total, or null on a tie.
export function fold(events, authors, rule = 'latest') {
  const byPlace = new Map(); for (const e of events) if (e.kind === 'deposit' && e.payload.counts) { if (!byPlace.has(e.place)) byPlace.set(e.place, []); byPlace.get(e.place).push(e); }
  const total = Object.fromEntries(authors.map((a) => [a, 0]));
  for (const ds of byPlace.values()) {
    if (rule === 'latest') { const last = ds.reduce((a, b) => (b.round > a.round || (b.round === a.round && b.seq > a.seq) ? b : a)); for (const a of authors) total[a] += last.payload.counts[a]; }
    else { const w = ds.map((d) => rule.decay ** (rule.rounds - d.round)), sw = w.reduce((x, y) => x + y, 0); for (const a of authors) total[a] += ds.reduce((n, d, i) => n + w[i] * d.payload.counts[a], 0) / sw; }
  }
  const sorted = Object.entries(total).sort((x, y) => y[1] - x[1]); return sorted[0][1] - sorted[1][1] > 1e-9 ? sorted[0][0] : null;
}
// A model's own answer, when the regime has one, overrides the fold.
export const outcome = (events, authors, rule) => { const a = events.filter((e) => e.kind === 'answer'); return a.length ? a[a.length - 1].payload.author : fold(events, authors, rule); };
