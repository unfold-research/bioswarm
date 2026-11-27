# CB1 CooperBench pilot: the harness runs after one fix; one agent passes 5 of 5, two cooperating agents 2 of 5

Preregistration `tasks/CB1-PREREG.md`. Run 2026-11-12 on the lab's build server, Docker backend, concurrency 1. CooperBench at commit `63b9d44`, agent `mini_swe_agent`, Claude Haiku 5.5. Five Python pairs fixed in advance. Per-pair data in `summary.json` here; trajectories and patches stay on the server (`~/cooperbench/CooperBench/logs/`). A pilot: the counts below are not a test of anything.

## What happened

| Run | Both features pass | Cost (harness) | Input / output tokens | Agent time | Infrastructure failures |
|---|---|---|---|---|---|
| solo, unmodified harness | 3 of 5 | [US$ redacted] | not recorded | 15 min | **2 of 5 died on an API error** |
| solo, compaction moved out of reach | **5 of 5** | [US$ redacted] | 0.96 M / 0.06 M | 7.5 min | 0 |
| coop (two agents, messaging) | **2 of 5** | [US$ redacted] | 1.77 M / 0.07 M | 9.4 min | 0 |

Per pair (solo without compaction / coop): outlines pass / pass; tiktoken pass / fail; click pass / fail; jinja pass / pass; dspy pass / fail. The three coop failures are all merge conflicts: both agents submitted a patch, the two patches did not merge, and neither feature's tests could run. The agents exchanged 3 to 10 messages per pair.

Total spent on the pilot: [US$ redacted] against a ceiling of [US$ redacted]

## Findings about the instrument

1. **The published harness does not run unmodified on Claude 5.5 models once a trajectory is long.** Its history compaction (triggered at 28,000 tokens, sized for 32K-context models) rewrites earlier turns; the API rejects the request because thinking blocks are bound to the conversation that produced them. Two of five solo runs died this way after 7 and 14 steps and were scored as failures. A leaderboard number produced without noticing this would understate the model. Deviation from the preregistration: for the second solo run and for coop the trigger was set to 800,000 tokens through the harness's own `--agent-config` (Haiku 5.5 has a 1M context). The harness code is untouched.
2. **The harness's cost equals [US$ redacted] and [US$ redacted] per million input and output tokens**, the price the lab's runner assumes. It is litellm's table, a second source, not an invoice. Prompt caching is not used by the harness (zero cached tokens), so input is paid in full at every step.
3. **Token counts in `result.json` are zero**; they have to be summed from the trajectories.
4. **Cost per pair with this model: about [US$ redacted] solo and [US$ redacted] coop.** Extrapolated, 50 pairs × three arms × one run is [US$ redacted] to 8 with Haiku 5.5, and five seeds [US$ redacted] to 40. With a model twenty times the price it would be [US$ redacted] to 160 per seed. Range, not a quote: five pairs, and long trajectories are where cost concentrates.
5. **Wall-clock**: 26 to 183 seconds per pair solo, 50 to 188 coop, sequential, on a shared 4-core server.

## What this says about using CooperBench for our question

- **Solo is at ceiling on these pairs** (5 of 5 with the smallest current model). Two of the five were chosen by the maintainers as easy anchors, but the two "discriminators" passed too. A benchmark where one small agent already passes leaves a collective nothing to gain; it can only measure how much coordination loses.
- **That loss is real and has one cause here: merging.** The same model that implements both features alone cannot deliver them as two patches that merge, with messaging available. This is the paper's result (pairs about 30% below solo), reproduced in miniature.
- **So CooperBench is an instrument for coordination cost, not for swarm advantage.** It fits a narrower question that is still ours: does a shared medium (marks on the files being edited, a claim board, a merge-aware protocol) remove the conflict loss that messaging does not? The benchmark's `team` setting and `--git` flag are existing baselines for that.
- For "a collective beats one agent" the task must exceed one agent. On this benchmark that would mean many features at once, which the 3-agent subsets (`team3_*`) begin to offer, or the larger instruments of `research/benchmarks/README.md` (SWE-EVO, Silo-Bench).

## Limits

Five pairs, one run each, one small model, sequential on a shared server. The arms are not token-matched: coop used 1.8 times the input tokens of solo. Solo "without compaction" is a second sample of the three pairs that had passed, not a paired repeat. Nothing here tests a biological mechanism.

## State left on the server

Checkout, logs and five task images (21 GB) are kept on the build server for a next stage; the Redis container was removed and the API key file was deleted after each stage.
