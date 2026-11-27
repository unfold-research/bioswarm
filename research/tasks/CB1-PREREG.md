# CB1 preregistration: CooperBench pilot (2026-11-12)

Registered before any paid call. Owner approval of 2026-11-12 ("Sim, piloto") for a pilot of five pairs with a small model, outside the batch ledger because the calls are interactive.

## Purpose
A pilot, not a test. It measures what a matched comparison on a real benchmark costs us and whether the public harness runs as published: tokens, dollars and wall-clock per agent, infrastructure failures, and the share of feature pairs that pass. No hypothesis is tested; five pairs cannot support one. The solo and coop results are reported as counts.

## Setting
- Benchmark: CooperBench (arXiv 2601.13295), repository `cooperbench/CooperBench` at commit `63b9d44`, MIT. Unmodified harness, agent `mini_swe_agent`, default agent configuration (step limit 100).
- Pairs, fixed here: the first five entries of the maintainers' `flash_10` subset that are Python repositories, chosen before any run: `dottxt_ai_outlines_task/1655` features 7,10; `openai_tiktoken_task/0` features 6,8; `pallets_click_task/2800` features 1,7; `pallets_jinja_task/1559` features 4,8; `dspy_task/8394` features 3,4. Two are listed by the maintainers as easy anchors, two as discriminators, one as coverage.
- Arms: `solo` (one agent implements both features) and `coop` (two agents, one feature each, messaging on, no shared git). One run per pair and arm. The arms are not token-matched: solo is one agent with one step limit, coop is two. Tokens are reported per arm so that the mismatch is visible.
- Model: Claude Haiku 5.5 through the Anthropic API, harness defaults for sampling.
- Execution: Docker backend on the lab's Linux build server, concurrency 1, Redis in a local container. Evaluation by the harness (`cooperbench eval`): hidden tests of each feature on the merged patch.

## Spend control
Stage 1 runs solo on the five pairs. Its measured tokens are priced at the standard list price assumed by `observatory/batch2/run2.mjs` (twice its batch price: [US$ redacted] per million input tokens, [US$ redacted] per million output) and reported. Stage 2 (coop) runs only if stage 1 used less than 6 million input tokens and the projected total for both stages is under 30 million input tokens. Hard ceiling for the pilot: [US$ redacted] at that price. The step limit bounds each agent. The price is the repository's assumption and is not an invoice; the token counts are the measurement.

## Reported
Per pair and arm: both features pass or not, each feature, steps, input and output tokens, cost at the assumed price, wall-clock, exit status. Totals per arm. Every infrastructure failure, with its cause. What a 50-pair, three-arm study would cost by extrapolation, with the range.

## Limits stated in advance
Five pairs, one run each, one small model: the pass counts are anecdotes. The benchmark's own coop arm is messaging between two peers; it is not a swarm and tests no biological mechanism. The build server is shared with CI, so wall-clock is indicative only.
