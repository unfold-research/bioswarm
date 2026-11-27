# LI16 preregistration: act on the signal, not on the symptom (2026-11-17)

**Status:** registered 2026-11-17 before any LI16 data. Haiku 5.5, Message Batches API, strict live check for feedback and scoring, 8 act rounds, sizes 40 and 80 modules (8 cases each), run with the other studies of the same sweep at the same time (rule 9) by `observatory/batch2/rc/sweep.mjs`. Spec (arms, seeds, caps, hypotheses): `observatory/batch2/rc/sweeps/LI16.json`. Verdicts: the generic `observatory/batch2/rc/verdict.mjs` (per-case sign test, Holm on secondary hypotheses). Mechanisms: `observatory/batch2/rc/mechanisms.mjs`. An independent review follows the standard prompt `docs/reviews/REVIEW-PROMPT.md`.

**Why.** The LI12R and LI13 reviews found that agent-written traces carry the requirement (8 of 8 and 16 of 16 solved), but every check that failed on fresh inputs had been fixed by the helper owner before the trace arrived, by reverse-engineering the failing examples; 0 of 483 checks fixed after a delivered trace failed on fresh inputs. An ant follows the trail, not the noise. The new mechanism `stigwait` is `stig` with one change: the helper owner acts on a failing directed check only once the caller's trace is on it.

**Arms.** `stigwait`, `stig`, `oracle` (harness-written trace, reference), `manager` (market). Seeds 16400 to 16407 and 16800 to 16807.

## Hypotheses (16 cases pooled; the case is the unit)

- **H-LI50 (primary).** Waiting for the trace generalises better than acting on the symptom: `stigwait` against `stig` on `holdoutFailing`.
- **H-LI51.** Waiting for the trace generalises at least as well as a manager agent: `stigwait` against `manager` on `holdoutFailing`.
- **H-LI52.** Waiting for the trace still finishes in fewer act rounds than a manager agent: `stigwait` against `manager` on `actRounds`.
- **H-LI53.** Waiting for the trace uses fewer tokens than a manager agent: `stigwait` against `manager` on `tokens`.

Rule (all hypotheses): supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
