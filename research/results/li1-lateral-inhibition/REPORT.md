# LI1 report: lateral inhibition in parallel repair of a coupled task (2026-11-17)

Preregistration: `tasks/LI1-LATERAL-INHIBITION-PREREG.md`. Pilots: `PILOTS.md`. Prior art: `PRIOR-ART.md`. Analysis: `analysis.json` (from `observatory/batch2/ne/analyze-li.mjs`, committed before results were read). Raw: `wave-*.requests.jsonl`, `wave-*.results.jsonl`, `state.json`, `batches.json`. Model Claude Haiku 5.5 (adaptive thinking), Message Batches API, 9 waves, 0 failed requests. Cost from returned usage: see `batches.json` (about [US$ redacted] for the study).

## Verdicts (as registered)

| Hypothesis | Verdict | Why |
|---|---|---|
| H-LI1 inhibition beats simultaneous repair (solved cases) | **refuted** | neither arm solved any of 36 cases |
| H-LI2 targeting beats random activation | **refuted** | neither solved any; final conflicts lower for inhibit in 20 cases, for random in 15 |
| H-LI3 a swarm solves more than the central agent at 240 nodes | **refuted** | nobody solved any 240-node case |
| H-LI4 patch at least as many solved as inhibit, at fewer tokens | **supported** | 2 against 0 solved, 59k against 168k output tokens per case |

The primary endpoint (zero conflicts within 8 rounds) was too demanding for every swarm arm: only `patch` solved any case (2 of 12 at 60 nodes). The central agent solved 7 of 12 at 60 nodes and none at 120 or 240; the agent that started from its own colouring (`solo`) solved 12 of 12 at 60, 1 of 12 at 120 and none at 240.

## What the secondary outcomes show

Final conflicts (median over cases), output tokens per case (mean, shared start included), all 36 cases:

| Arm | Median final conflicts | Output tokens per case | Mean conflicts by round (0→8) |
|---|---|---|---|
| sync | 56 | 204,775 | 79.5, 88.4, 76.1, 80.6, 72.0, 75.1, 69.8, 70.4, 67.8 |
| inhibit | 18 | 167,888 | 79.5, 57.6, 41.1, 34.6, 30.8, 27.9, 25.3, 24.2, 23.4 |
| random (p = 0.5) | 18.5 | 116,946 | 79.5, 51.6, 40.1, 34.3, 32.0, 30.7, 27.3, 25.1, 23.4 |
| patch | 12 | 59,260 | 79.5, 49.6, 34.9, 29.8, 25.2, 22.1, 20.6, 18.5, 16.9 |
| central | 7.5 | 58,853 | 79.5, 53.4, 47.0, 44.6, 42.1, 40.1, 38.9, 36.1, 35.4 |

1. **LLM members inherit the synchronous pathology.** When every member touched by a conflict acts at once, conflicts do not fall: 79.5 after round 0, 67.8 after eight rounds. Inhibition ended lower than sync in **36 of 36** paired cases.
2. **Any symmetry breaking cures it; the targeting adds nothing measurable (inhibit against random: 20 lower, 15 higher, sign test p = 0.50).** Random activation at p = 0.5 reached the same level as inhibition (23.4 against 23.4 mean after round 8) at 70% of its tokens. This is what distributed constraint satisfaction predicts (DSA against distributed breakout, `PRIOR-ART.md`). The bio framing of "lateral inhibition" is not supported over plain random activation here.
3. **A local window beats the whole problem at scale (corrected after review: `patch` is effectively one agent per round, see `docs/reviews/LI-REVIEW-2026-11-17.md`).** At 240 nodes `patch` ended below `central` in **12 of 12** paired cases (median ratio 0.36; median final 38.5 against 98) at 54k against 45k output tokens per case. `inhibit` also ended below `central` in 12 of 12 (ratio 0.48) but at 6.6 times its tokens. At 120 nodes the central agent was level with `patch` (5 lower, 7 higher); at 60 nodes it was better.
4. **Correction.** `patch` averaged 0.98 calls per round: its groups merge into one component capped at 40 nodes. It is one agent working a window around conflicts, not recruitment of many members, and the central agent it beat at 240 nodes returned nothing in 22 of 96 calls and was anchored on the swarm's start (`solo` beat `central` in 11 of 12 there). Read point 3 as: an agent given a local window beat an agent given the whole graph and a bad start. Its latency proxy is higher (53k against 32k), because merged patches are large and reason longer.

## Limits

One model, one synthetic family, eight rounds; a classical min-conflicts heuristic solves these graphs, so the finding concerns coordination of LLM members, not colouring. Points 2 to 4 rest on secondary outcomes; the registered primary endpoint refuted H-LI1 to H-LI3. Point 3 was not registered as a final-conflicts comparison; LI4 registers it (H-LI9) on fresh cases.
