# LI30 report: the trace or the tie-break, against a manager that gets its act rounds (2026-11-19)

Preregistration: `tasks/LI30-TIEBREAK-FAIR-MANAGER-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI30.json` (sweep 5, run in parallel with LI28R). Data: `results/li30-k80/` (raw in releases). Verdicts: `results/li30/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI30-REVIEW-2026-11-19.md`. Haiku 5.5, 12 cases at 80 modules (160 directed and 80 symmetric edges), 6 act rounds per arm, manager plans at low effort with room for extra plan waves, [US$ redacted] (cap [US$ redacted] no cap stop).

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean, solved cases) | Final failing checks (sum) | Output tokens (per case) |
|---|---|---|---|---|---|
| `stigwait` (helper owner acts once the caller's trace is on the check; one side acts on a failing symmetric check) | 12 | **12 of 12** | 3.92 | 0 | 367k |
| `stigwait_both` (both sides act on a failing symmetric check: no tie-break) | 0 | 0 | — | 956 | 724k |
| `manager` (market, low-effort plans, plan waves extra) | 4 | 4 of 12 | 10.00 | 48, all symmetric | 457k |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI87 (primary) without the tie-break, waiting still ends with fewer failing checks than the fair manager | **refuted** | 0 to 12, p = 0.0005 |
| H-LI88 the tie-break lowers failing checks when waiting for the trace | **supported** (close to automatic, see 1) | 12 to 0, Holm p = 0.001 |
| H-LI89 waiting ends with fewer failing checks than the fair manager | **supported** | 8 to 0, 4 ties, Holm p = 0.0078 |

## What it shows

1. **Without a tie-break, both sides swap formats every wave.** `stigwait_both` sends each failing symmetric check to both sides (about 1,910 assignments per wave against 955 for `stigwait`); each side adopts the other's format, so the formats trade places (`encodeSketch`/`decodeSketch` flips between `id|flag|name` and `t#id#name` for all 13 waves). Both sides changed 5,737 times; the check still failed after 5,736. It ends with 78 to 80 of 80 symmetric checks failing in every case.
2. **The manager's leftover failures are the same swap.** All 48 are symmetric. It assigned both sides on 60% of failing symmetric checks, and those were still failing after 1,496 of 1,623 double changes. H-LI87 comes down to the manager sometimes assigning only one side.
3. **With the tie-break, waiting for the trace beats this manager** (12 of 12 against 4, at 0.80x the output tokens per case). Every manager case got its 6 act rounds; the manager was still converging, roughly halving its failing checks each round (126, 60, 26, 12, 7, 4), when they ran out.
4. **The manager's 4 of 12 is mostly task density, not fairness.** LI27-k160 (11 of 12) spread the same edges over 160 modules; here they sit on 80, about twice the checks per module. Low effort also made plans worse: first plans assigned a median of 56.5 of 80 modules against about 76 at default effort (LI27-k80), and after round 1 the manager had 126 failing checks against 88. The fairness fix had nothing to fix: no plan hit `max_tokens`, and `managerSlack` was never used (the run ended at wave 12 of 19 allowed).

## Limits

One model family (Haiku 5.5), synthetic string-function tasks, 12 cases at one size, a Claude reviewer. The comparison with LI27 uses different seeds. The manager at low effort is weaker than at default effort, so H-LI89 is against a handicapped manager. The trace's value on top of a tie-break is not tested here (no tie-break-only arm); LI28R addresses part of it.
