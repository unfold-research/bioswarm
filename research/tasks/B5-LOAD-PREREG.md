# B5 preregistration: relay format across hops under higher load (Murmur, H-M01)

Registered 2026-11-11, before any paid call and before the results of B2 were read. Code: `observatory/batch2/b5-load/protocol.mjs`. Frozen config hash in `results/batch2-b5-load/frozen-lock.json`.

## Question
Does the comparison of B2 (structured relay vs prose relay) change when there is more evidence to carry?

## Design
- 24 cases (seeds 7001–7024) with four indicators and three sources, 6 to 9 records each, opaque ids. Per indicator one of five shapes: all agree, one source silent, one dissenter, nobody reports, two sources silent.
- Arms and scoring as in B2. Hop 0: three source agents per case (144 calls); hop 1: one merge (48); hops 2 and 3: relay (48 each). 288 calls.
- Model `claude-haiku-5-5`, batch API, thinking disabled, JSON schema output, 512 output tokens.

## Endpoints
As in B2: exact claims per arm at hops 1, 2 and 3 (primary); supported citations, unsupported claims, missing pairs, missing ids, truncated or invalid outputs.

## Gates and stopping
Hop 0: each arm needs at least 66 of 72 exact extractions, otherwise stop as `instrument-insufficient`. Any wave with more than 10% invalid outputs stops the study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted.

## Decision rule
Same as B2: **supported** if STRUCT is exact in at least 23 of 24 at hop 3 and PROSE in at most 16 of 24 at hop 2; **refuted** if PROSE is within one case of STRUCT at hops 1, 2 and 3; **inconclusive** otherwise. The comparison with B2 is descriptive.

## Budget
Study cap [US$ redacted] reserved wave by wave in the shared cumulative ledger (cap [US$ redacted]). Approved by the owner on 2026-11-11 (request to launch as many independent batches as possible).

## Limits stated in advance
Same as B2. The output cap of 512 tokens is closer to binding here; truncations are counted and reported, and count as failures.
