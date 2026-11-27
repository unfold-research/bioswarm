# D6 one agent with the whole budget at partial coverage: it matches the small orchestrator and nothing more

Preregistration `tasks/D6-T1-PREREG.md`. Run 2026-11-11: `d6-deep-local` (the R2b collections) and `d6-deep-scatter` (the R3 scattered-edit collections), `claude-haiku-5-5`, thinking disabled, eight waves each. All requests succeeded, none truncated, no unusable choice of next part. Usage estimate [US$ redacted] each. Analysis: `node observatory/batch2/d6-deep/analyze.mjs` → `summary.json` here.

One agent makes all six re-counts in sequence. At each step it sees the board, counts the part it asked for and names the next. The other arms are the earlier studies on the same collections; the probe rule is simulated with exact readers.

Share of collections right, 60 per cell. All arms are 1.00 when nothing changed (P4 supported).

| Arm | Local edit | Edited parts re-read | Scattered edits | Edited parts re-read | US$ (local) |
|---|---|---|---|---|---|
| **one agent, six sequential re-counts** | **0.75** | 2.2 | **0.35** | 1.2 | [redacted] |
| fixed schedule | 0.48 | 1.4 | 0.47 | 1.5 | [redacted] |
| alarm rule | 0.70 | 1.8 | 0.28 | 1.2 | [redacted] |
| Haiku orchestrator, two workers | 0.75 | 2.2 | 0.20 | 1.1 | [redacted] |
| Sonnet orchestrator with the locality prior | 0.98 | 2.7 | 0.23 | 1.1 | [redacted] |
| planned search in code (simulated) | 1.00 | 2.6 | 0.27 | 1.1 | [redacted] |

| Test | Result |
|---|---|
| P1 one agent beats the schedule under local change | **supported**: +0.27 (0.12 to 0.42) |
| P2 one agent against the Haiku orchestrator | **equal**: 0.00 (−0.15 to 0.15) |
| P3 under scattered change it is not above the schedule | **supported**: −0.12 (−0.27 to 0.03) |
| P4 at least 0.9 right when nothing changed | **supported**: 1.00 in both |

Other differences, not preregistered as tests: against the alarm rule +0.05 (−0.10 to 0.20) local and +0.07 (−0.08 to 0.22) scattered; against the Sonnet orchestrator −0.23 (−0.35 to −0.12) local and +0.12 (−0.05 to 0.28) scattered; against the Haiku orchestrator under scattered change +0.15 (0.00 to 0.30).

The agent's own re-counts were exact in 0.90 and 0.91 of steps, and it re-read a part it had already re-read 0.22 and 0.31 times per run.

## Reading

- **The single-agent arm that R2, R2b and R3 lacked is now there, and it changes nothing in the ordering.** One Haiku agent holding the whole budget gets 0.75 under local change, the same as a Haiku orchestrator directing two workers, and both follow the trace about as far as the alarm rule does. The orchestrated collective bought nothing over one agent on this task, and one agent bought nothing over a rule that costs no decision calls.
- **Depth of one small agent does not find the planned search.** The Sonnet orchestrator and the search written in code stay 0.23 to 0.25 above it. What separates them is the policy, not whether it is carried by one agent or several.
- **Under scattered edits it is below the schedule like every other trace-follower**, 0.35 against 0.47, with an interval that still includes zero. It is nominally the least bad of them; no test was registered for that and the interval against the Haiku orchestrator touches zero.
- The earlier exemption ("the field does not fit in one request") was wrong as a reason to skip this arm: stepwise, it fits. It cost 0.30 against 0.26 for the orchestrated arm.

Limits: 60 collections per cell, one model, one field shape; the agent's counting is less exact (0.90) than a fresh reader's (0.99), which may cost it a few collections.
