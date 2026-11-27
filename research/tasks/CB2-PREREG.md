# CB2 preregistration: a shared field against messaging on CooperBench (2026-11-12)

Registered before any paid call of this study. Owner approval of 2026-11-12 ("Sim, CooperBench") for the 50-pair subset at an estimated [US$ redacted] to 8, outside the batch ledger because the calls are interactive. Follows the pilot CB1 (`results/cb1-cooperbench/REPORT.md`).

## Question
On real repositories two agents that each implement one feature fail far more often than one agent implementing both, and messaging does not help (CooperBench, arXiv 2601.13295, Fig. 4 and Table 6; reproduced at small scale in CB1, where all three failures were merge conflicts). The P1 paper says that a collective can coordinate through a shared field instead of messages, and its atlas lists "building one artefact without assigning parts" (termites: the work product as the trace) with no evidence. CB2 tests that row: does letting each agent see the other's work as it is produced remove the loss that messaging does not?

## Design change against the proposal
The proposal was a claim board written by us. The benchmark's current harness already has a shared-artefact mode (`--git`: a shared remote to which each agent pushes and from which it can fetch and merge the other's branch) and a switch for messaging (`--no-messaging`). Using them makes the study a 2 × 2 of the harness's own settings with no code of ours, which others can rerun. A board of declared intentions, as distinct from visible work, is not tested.

## Setting
- CooperBench at commit `63b9d44`, unmodified code, agent `mini_swe_agent`, Docker backend. The maintainers' `flash` subset: 50 feature pairs, 20 tasks, 11 repositories, four languages.
- Model: Claude Haiku 5.5 through the Anthropic API, harness defaults. One deviation carried over from CB1: history compaction is moved out of reach (`compaction_token_trigger: 800000`) through the harness's `--agent-config`, because compaction makes the API reject long trajectories of Claude 5.5 models.
- Arms, one run per pair each:
  - **solo**: one agent implements both features.
  - **none**: two agents, one feature each, no messaging and no shared remote. The no-communication control.
  - **messages**: two agents with messaging (the benchmark's default coop).
  - **field**: two agents with the shared remote and no messaging. Each can see and merge what the other has pushed.
  The fourth cell of the 2 × 2 (messages and shared remote) is run only if the spend allows, and is then reported as exploratory.
- Outcome: the harness's own evaluation (`cooperbench eval`): both features' hidden tests pass on the merged result. Also reported: merge status, each feature, steps, tokens summed from the trajectories, cost as the harness reports it, wall-clock, exit status.

## Predictions
Paired by feature pair, n = 50. Pairs of the same task share a repository, so the primary interval is a bootstrap that resamples the 20 tasks (4,000 draws); the bootstrap over pairs is reported beside it.
- **H1, a shared field does what messaging does not**: field minus messages in the share of pairs with both features passing; interval above zero.
- **H2, messaging adds nothing over no communication**: *supported* unless the interval of messages minus none is above zero.
- **H3, the shared field beats no communication**: field minus none; interval above zero.
- **H4, no cooperating arm is above one agent**: *supported* unless the interval of the best coop arm minus solo is above zero.
Reported with them: the share of failures that are merge conflicts in each arm, and tokens and cost per arm. The arms are not token-matched: coop arms are two agents, each with its own step limit. A coop arm that is ahead of solo would be ahead at a higher spend; one that is behind is behind at a higher spend.

## Spend control
Hard ceiling [US$ redacted] as reported by the harness (which prices Haiku 5.5 at [US$ redacted] and 0.50 per million tokens). Order: solo, messages, none, field. After each arm the cumulative cost is read; an arm is not started if the projection (the cost of the dearest arm so far) would pass the ceiling. One smoke run of the field arm on a single pair comes first, under a separate run name; it is engineering, is excluded from the analysis and counts toward the ceiling. Infrastructure failures (container, git server, API errors) are reported per arm and the affected pairs are rerun once with `--force`; a pair that fails twice is scored as failed and listed.

## Limits stated in advance
One run per pair, one small model. Fifty pairs give an interval of about ±0.13 on a difference. The field arm is the harness's git mode with its own prompt, written by the benchmark's maintainers to make agents merge; a gain would show that seeing and merging the other's work removes the loss, not that agents coordinate spontaneously. Wall-clock on a shared build server is indicative only. Solo was at ceiling on five easy pairs in CB1; on the 50 it may not be, and a coop arm cannot exceed a solo arm that is near ceiling.
