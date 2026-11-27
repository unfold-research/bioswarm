# LI27 report: the trace or the tie-break? (80 and 160 modules) (2026-11-19)

Preregistration: `tasks/LI27-TRACE-OR-TIEBREAK-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI27.json` (sweep 4). Data: `results/li27-k160/` (complete), `results/li27-k80/` (stopped at the study cap at wave 6; no `summary.json`, no `verdicts.json`). Raw batch files in releases. Review: `docs/reviews/LI27-REVIEW-2026-11-19.md`. Haiku 5.5, 12 cases per size, 6 act rounds per arm (the manager's plan waves on top), [US$ redacted] (6.98 at k160, 5.51 at k80).

**LI27 is incomplete.** The registered unit is 24 cases pooled over both sizes, and the 80-module run stopped at its [US$ redacted] cap before wave 6 (the cap was checked on the full reserve, which ran about 5 times above real spend). H-LI76, H-LI77 and H-LI78 are recorded as aborted, with no registered verdict. A resume is blocked: the configuration hash covers the runner, which changed after the LI27 commit. Everything below is post hoc.

**160 modules (complete, post hoc)**

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean, solved cases) | Final failing checks (sum) | Output tokens (per case, median) |
|---|---|---|---|---|---|
| `stigwait` (helper owner acts once the caller's trace is on the check; one side acts on a failing symmetric check, by a hash tie-break) | 12 | **12 of 12** | 3.67 | 0 | 454k |
| `stigwait_both` (same, but both sides act on a failing symmetric check: no tie-break) | 0 | 0 | — | 947 | 901k |
| `manager` (market, plan waves extra) | 11 | 11 of 12 | 10.36 | 3 | 529k |

At 80 modules, cut at wave 5, `stigwait` had solved 11, `stigwait_both` 0 and the manager 0, but the manager had had only 2 act rounds against 5, so its `final` comparisons there are not usable.

## Verdicts

| Hypothesis | Registered | Post hoc, k160 only (review) |
|---|---|---|
| H-LI76 (primary) without the tie-break, waiting still ends with fewer failing checks than the manager | **aborted** | 0 to 12, p = 0.0005 (refuted direction); k80 at wave 5 also 0 to 12 |
| H-LI77 the tie-break lowers failing checks when waiting for the trace | **aborted** | 12 to 0, Holm p = 0.001; k80 also 12 to 0 |
| H-LI78 waiting uses fewer tokens than the manager | **aborted** | 10 to 2, Holm p = 0.039; k80 11 to 1 (cut-off favours the manager) |

Reference, not a hypothesis: `stigwait` against `manager` on `final` at k160 is 1 to 0 with 11 ties.

## What it shows

1. **Without a tie-break, nothing converges on format pairs.** `stigwait_both` solved 0 of 24. In every wave, both sides of all failing symmetric checks acted; each read the other's current output in the failure text and adopted it, so the pair traded formats every wave (k160s27600, `encodeGrant`/`decodeGrant`: `y/n` and `qty#t/f` swap sides from wave 2 to 6). Over waves 4 to 6, 78% of encoders were byte-identical to two waves before. Directed checks all reach 0; what remains is the about 80 symmetric checks per case.
2. **With the tie-break, waiting for the trace matches the manager at fewer tokens.** At 160 modules it solved 12 of 12 against 11, all passing fresh inputs, at about 0.86x the manager's output tokens per case. LI26's advantage therefore depends on the tie-break.
3. **The manager was not starved at 160 modules.** No plan was truncated (69 of 69 ended normally) and it used 4 to 6 act rounds, so the LI24 problem did not recur here.
4. **What is still open:** whether the trace adds anything on top of a tie-break. That needs a tie-break-only arm (`polarity` against `stigwait`). LI28R addresses part: `inhibit` shares the one-side rule and solves 0 of 12, but it also hands directed checks to the caller half the time, so it is not a clean tie-break-only arm.

## Limits

Incomplete: no registered verdicts, the k80 half is truncated. One model family (Haiku 5.5), synthetic string-function tasks, 12 cases per size, a Claude reviewer. H-LI76 was close to certain to be refuted once the format swap was known. Tokens include the oscillation waste of `stigwait_both`, and `stigwait` stops spending once it solves.
