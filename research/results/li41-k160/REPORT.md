# LI41 report: waiting for the trace against a manager at 160 modules (2026-11-23)

Preregistration: `tasks/LI41-REPLICATION-PREREG.md`; Code: `observatory/batch2/rc/sweeps/LI41.json`; Data: `results/li41-k160/`; Analysis: `results/li41/verdicts.json`; Review: `docs/reviews/LI41-REVIEW-LUNA-2026-11-23.md`. LI41 replicates LI38 on fresh seeds (41400 to 41411), keeping the instrument, model (Haiku 5.5), size, density, rounds, and limits the same and changing only seeds and the [US$ redacted] cap. H-LI123 to H-LI126 are LI38's H-LI115 to H-LI118 unchanged; `stigwait` and `manager` were compared on 12 paired 160-module synthetic code cases with strict checks. LI38 and LI41 are reported side by side below, with pooled 24-case counts descriptive only; LI41 closes only the fresh-seed replication half of CONVENTIONS rule 5, not transfer across model families (only Haiku 5.5 was tested).

| Arm | LI38 solved | LI38 waves to solve (stigwait better) | LI38 output tokens (stigwait better) | LI41 solved | LI41 output tokens/case | LI41 mean cost/case |
|---|---:|---:|---:|---:|---:|---:|
| `stigwait` | 12/12 | 12/12 pairs | 11/12 pairs | 12/12 | 609,969 | [US$ redacted] |
| `manager` | 12/12 | — | — | 12/12 | 685,747 | [US$ redacted] |

## Verdicts

Verdicts below are copied from `results/li41/verdicts.json`. With 12 cases, H-LI123 requires stigwait to win at least 10 cases: 10–2 gives exact sign-test p=0.039, while 9–3 gives p=0.146. A 9–3 split is not a partial replication. Holm adjustment applies only to secondary H-LI124–H-LI126; the primary is unadjusted, as preregistered.

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI123 (primary): fewer waves to solve | supported | 12 to 0, p = 0.00048828125 |
| H-LI124: fewer final failing checks | inconclusive | 0 to 0, p = 1; Holm p = 1 |
| H-LI125: fewer holdout failures | inconclusive | 0 to 0, p = 1; Holm p = 1 |
| H-LI126: fewer output tokens | supported | 11 to 1, p = 0.00634765625; Holm p = 0.01904296875 |

## What it shows

1. Both arms solved all 12 cases and passed fresh-input checks on all 12. Their final strict failing-check totals were zero. The primary difference is speed by the registered wave metric: stigwait reached zero failures in fewer waves in all 12 pairs; the independently reproduced seed-level wave counts were 3–4 for stigwait and 8–16 for manager. Manager planning waves count in this metric, so it compares full protocols, not an isolated mechanism.
2. Mean output was 609,969 tokens per stigwait case versus 685,747 for manager; mean estimated cost was [US$ redacted] versus [US$ redacted] Token wins were 11–1, supporting H-LI126 after Holm correction. LI38 also favored stigwait on tokens in 11/12 pairs. Across the 24 studies' cases, descriptive paired counts are 24–0 for waves and 22–2 for tokens; pooling is not a new registered test.
3. Trajectories from the saved analysis show mean failures falling to zero by wave 4 for stigwait, while manager reaches zero by wave 16, with plateaus at alternating plan waves. This is consistent with trace-driven parallel action and centralized planning taking time, but does not establish that mechanism as the sole cause.

## Limits

The independent review found the shared initial wave, fixed instances and round-0 state, and the expected trace/peer activity in stigwait requests versus centralized plan waves in manager requests. Request manifests reconcile; both arms completed with no apparent cap or ledger violation, and the registered sign tests and Holm treatment were correctly applied. The review cautions that waves-to-solve includes manager plan waves and therefore measures protocol-level latency, not an isolated mechanism effect; the paired binary tests have only 12 cases. The tasks are synthetic, the seeds/design repeat a known LI38 result, and there is no one-agent reference. These results concern one model family only and make no transfer claim.

The reproduction check matched H-LI123 exactly by re-deriving first all-pass waves from saved state histories (12 wins, 0 losses; p=0.00048828125). It could not rerun the analysis command (`node undefined` is not an analysis entry point) or independently verify elapsed-minute results: per-case records and poll-level timelines were absent. Thus this is a wave-metric cross-check, not a full reproduction. The registered cap rule remains: a cap-stopped wave makes the run incomplete, with no verdicts and no cases removed; resumption requires the owner's approval through the Research Leader. The run artifacts and review report complete status and no apparent cap stop; no partial-case inference is made.

Scope (required by the Research Leader at approval; added after publication because the drafted report left it out): LI41 closes only the replication half of CONVENTIONS rule 5, a new set of seeds with the same instrument. One model family was tested (Haiku 5.5), so nothing here shows that the result transfers to other model families.

## Economy

Computed by `bench/economy.mjs` from the raw data (batch study, claude-haiku-5-5).

| Arm | Requests | Input | Output | Thinking | Cost | Solved | Cost/solved | >[redacted]k (extra) | Truncated (wasted) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| start | 1,920 | 2,794,949 | 2,418,203 | 1,771,504 | [US$ redacted] | n/d | n/d | 0 ([US$ redacted]) | 1 ([US$ redacted]) |
| stigwait | 4,069 | 15,542,026 | 4,901,422 | 2,896,803 | [US$ redacted] | 12 | [US$ redacted] | 0 ([US$ redacted]) | 1 ([US$ redacted]) |
| manager | 3,149 | 20,673,183 | 5,810,764 | 4,077,373 | [US$ redacted] | 12 | [US$ redacted] | 69 ([US$ redacted]) | 0 ([US$ redacted]) |
| **total** | 9,138 | 39,010,158 | 13,130,389 | 8,745,680 | [US$ redacted] | | | 69 | 2 ([US$ redacted]) |

n/d: shared start wave, not an arm.

Thinking is 67% of output tokens. Reserved [US$ redacted] actual [US$ redacted]
