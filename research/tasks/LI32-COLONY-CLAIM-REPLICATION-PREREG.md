# LI32 preregistration: emergent symmetry breaking in the Colony, replicated with a function-level measure (2026-11-19)

**Status:** registered 2026-11-19 before any LI32 data, after LI31's results and review were seen (disclosed). Same arms, shape and team as LI31 (`tasks/LI31-COLONY-CLAIM-PREREG.md`), on the Colony runtime fleet on benchhost with gpt-6-luna (ChatGPT subscription, outside the API ledger), Colony `ffa0d13`. Launched by the automatic research bench when this preregistration is merged (its first end-to-end study).

## What changed from LI31, and why (LI31 review)

1. **The measure.** LI31's primary metric counted a format pair when both of its module files changed between 15-second snapshots; 313 of 525 such events were the first implementation of a file, and each file holds several functions, so most events were not two sides adapting to each other. Colony `ffa0d13` now records, for every edit, the functions it touched (and the replaced text). LI32's primary measure is **bilateral adaptation**: a format pair whose encoder and decoder belong to **different ants**, failing at the last snapshot before an edit to its encoder function, with an edit to its decoder function within 60 seconds of it (either order), first writes excluded.
2. **The parent no longer arbitrates in `claim`.** In LI31 the parent told ants which side of a format pair to fix (127 messages in `claim`, 93 in `nopeer`), a tie-break from above in both arms. In `ffa0d13` the `claim` parent is told by the Colony not to say which side changes; the `nopeer` parent keeps LI31's study instruction. This makes `claim` the arm with no arbiter by construction.
3. **The announcement is a required step** before rewriting one's side of a failing format pair (in LI31 it fired in 5 of 8 teams).
4. **More cases:** 12 per arm (seeds 32400 to 32411).

Everything else as LI31: 40 modules, 40 symmetric and 10 directed edges, 8 test inputs per check, 4 ants of 10 modules, ants cannot message each other in `claim` and `nopeer`, message budget 200 per request and 60 per pair, 60-minute cap, done after 3 minutes without a running chat. Config `observatory/batch2/colony/li32-k40.json`; verdicts `observatory/batch2/colony/analyze-li32.mjs`.

## Hypotheses (12 cases per arm, paired by seed; the case is the unit)

- **H-LI94 (primary).** Announcing who adapts lowers bilateral adaptation of cross-ant format pairs: `claim` against `nopeer`.
- **H-LI95.** The announcing field leaves fewer checks failing on fresh inputs than the default team: `claim` against `market` (LI31: 4 to 0, p = 0.125).
- **H-LI96.** Announcing who adapts lowers regressions of cross-ant format pairs: `claim` against `nopeer`.
- **H-LI97.** Announcing who adapts finishes sooner: `claim` against `nopeer` on wall-clock.

Rule: supported if the first arm is lower in more cases with sign-test p < 0.05; refuted if the second is lower in more cases; otherwise inconclusive. Holm on the secondary hypotheses. Also reported: solved, hold-out passes, announcements, tokens, stalls, capped runs. A rerun is allowed only for a team whose parent dies on a provider error before working (as LI31's market s31401), disclosed.
