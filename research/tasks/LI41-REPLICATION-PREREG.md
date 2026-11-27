# LI41 preregistration: does LI38 replicate on fresh seeds? Waiting for the trace against a manager at 160 modules (2026-11-22)

**Status:** registered 2026-11-22 before any LI41 data, after the LI38 and LI39 reports and reviews were seen (disclosed).
Requested by the Research Leader on the owner's decision of 2026-11-22, cap **[US$ redacted]** (owner). Haiku 5.5, Message Batches
API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` on the research bench (benchhost).
Verdicts: `observatory/batch2/rc/verdict.mjs` (per-case exact sign test, Holm on secondary hypotheses). Review:
`docs/reviews/REVIEW-PROMPT.md`, by a reviewer outside the Claude family (the tested model is Haiku). Spec:
`observatory/batch2/rc/sweeps/LI41.json`.

**Why.** Before any claim leaves the lab, `docs/CONVENTIONS.md` (rule 5) asks for a rerun on fresh seeds and, for transfer,
a second model family. LI38 (`results/li38-k160/REPORT.md`) is the programme's strongest registered result: at 160 modules
`stigwait` reached zero failing checks in fewer waves than the manager in 12 of 12 cases (H-LI115, p = 0.0005) and used fewer
output tokens in 11 of 12 (H-LI118), with final quality tied. It has not been rerun. LI39 tried the second family in the
Colony (gpt-6-luna) and was inconclusive (primary 7 to 3, p = 0.34); its wins came from seeds where the managed team stalled,
and the Colony mixes the mechanism with its environment. LI41 is the replication half of the gate: the same instrument and
protocol as LI38, on 12 new seeds. The second family in the batch instrument is not part of this study (see Scope).

**Design.** Identical to LI38 (`tasks/LI38-LATENCY-SCALE-PREREG.md`, `observatory/batch2/rc/sweeps/LI38.json`) except the
seeds and the cap: 160 modules, 320 directed and 80 symmetric edges, 16 test inputs per check; Haiku 5.5 at default effort
(thinking on), 12 act rounds for each arm, `managerSlack` on (plan waves do not consume act rounds), member output up to
8,000 tokens, plan output up to 128,000, strict feedback. The runner (`run-rc3.mjs`, `code.mjs`, `mechanisms.mjs`, the
pricing table) has not changed since LI38: its last change (d3a9822) predates LI38's first wave.

**Arms.** `stigwait`, `manager`. 12 new cases, seeds **41400 to 41411**. Cap [US$ redacted]

## Hypotheses (12 cases; the case is the unit)

- **H-LI123 (primary).** `stigwait` against `manager` on `wavesToSolve` (lockstep waves until zero failing checks on the
  strict check; manager plan waves count, as in LI38; an unsolved case is worst).
- **H-LI124.** `stigwait` against `manager` on `final` (failing checks after the last wave).
- **H-LI125.** `stigwait` against `manager` on `holdoutFailing` (fresh inputs).
- **H-LI126.** `stigwait` against `manager` on `tokens` (output tokens per case).

Rule (as `verdict.mjs`): supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more
cases; otherwise inconclusive. Holm across H-LI124 to H-LI126. These are LI38's four hypotheses unchanged, so a supported
H-LI123 is a replication of H-LI115 and a supported H-LI126 of H-LI118.

**Reported without a verdict:** `actRounds` per arm (plan waves excluded); failing checks per wave for each arm; truncated plans
and member replies per arm; plan output tokens; the pooled LI38 + LI41 counts (24 cases), labelled descriptive.

## Gates, run before this registration (free)

- **G1, cost (2026-11-22).** LI38 spent [US$ redacted] on the same design (`results/li38/economy.json`). Replaying the runner's cap
  check (spend so far plus the wave's reserve times 1.5 × this run's spend-to-reserve ratio, `run-rc3.mjs`) over LI38's real
  batch journal (`results/li38-k160/batches.json`, on benchhost) gives a peak of [US$ redacted] against a [US$ redacted] cap, with no stop (a
  [US$ redacted] cap would stop at wave 9). Waves 1 and 2 carry [US$ redacted] of the 8.10 and include every case, so an expensive case shows
  early. This is a replay of LI38's spend, not a forecast for new seeds.
- **G2, budget.** The shared ledger on benchhost records [US$ redacted] spent of [US$ redacted] (checked 2026-11-22), so [US$ redacted] fits.
- **G3, existing data.** No raw data answers the question: it is a rerun on seeds no study has used.
- **Cap stop.** If the runner's cap check stops a wave, the run is incomplete (exit 3) and gets no verdicts. The bench tells
  the Research Leader; a resume with a higher cap needs the owner's approval (the cap is outside the config hash, so a resume
  continues the same run). No verdict is computed on a partial run, and the number of cases is not cut after a wave has run.

## Economy (FRENTES rule 6)

- **Effort:** default (thinking on), as in LI38. A replication must keep the protocol; lowering effort would change both arms.
- **Cost per probe and per solved case (measured in LI38):** shared start wave [US$ redacted] in total; `stigwait` [US$ redacted] per
  solved case; `manager` [US$ redacted] per solved case; about [US$ redacted] per case for both arms together.
- **Prompts above 100,000 tokens:** in LI38, 68 manager plan prompts (none in `stigwait`), [US$ redacted] of the manager's
  [US$ redacted] They are part of the manager arm at this size (the plan sees the whole 160-module state), so they are unavoidable
  in a replication; changing them would make the manager a different arm.

## What the result decides

- **H-LI123 supported:** LI38's latency result replicates on fresh seeds (Haiku, batch). The `stigwait`-against-manager cell
  "faster and cheaper, final quality not separated" can move beyond `preliminary-*` for Haiku in the batch instrument. What
  remains before it leaves the lab is the second family: LI42 in the batch instrument with a model outside the Claude family,
  which needs a new provider adapter in the runner (bench build and API key; cost to be estimated before registration).
- **H-LI123 refuted or inconclusive:** LI38 does not replicate. The cell stays preliminary with both studies reported side by
  side; no second-family study is sought for latency. If H-LI126 is supported, the cell is recorded as "tokens, not speed".
- **H-LI124 refuted (the manager ends with fewer failing checks):** recorded as a trade-off, `stigwait` faster and the manager
  better at the end, regardless of H-LI123. An inconclusive H-LI124 is not evidence of equal quality.
- **H-LI126:** supported replicates the token result (H-LI118); refuted means the manager used fewer output tokens on these
  seeds, which would contradict LI38 and is reported as such.

## Scope and limits (known at registration)

One model family (Haiku 5.5); this study does not test transfer across models. Synthetic coupled code tasks; 12 cases; the
same limits as LI38: symmetric density 0.5 per module because of the name pools; no one-agent reference; manager plan waves
make `wavesToSolve` partly a measure of protocol design (`actRounds` is reported beside it). The outcome of LI38 is known, so
the hypotheses are LI38's, unchanged, and nothing in the design was chosen from LI38's per-case data.
