# B2 preregistration: relay format across hops (Murmur, H-M01)

Registered 2026-11-11, before any paid call. Code: `observatory/batch2/b2-relay/protocol.mjs`, runner `observatory/batch2/run.mjs`. The frozen config hash in `results/batch2-b2-relay/frozen-lock.json` covers this file, the code and the wave-0 manifest.

## Question
Do findings passed between agents as structured facts with fixed source ids keep their citations across hops better than findings passed as prose?

## Design
- 24 synthetic cases: 8 authored archetypes × 3 repeats, seeds 4001–4024, never used before. Each case has up to six evidence records about three indicators from two sources.
- Two arms, paired on the same cases. STRUCT forwards a `claims` array. PROSE forwards only a prose briefing of at most 90 words. Every agent in both arms also returns `claims`, which is what is scored, so both arms make the same calls.
- Four dependent waves: hop 0, two source agents per case (96 calls); hop 1, one agent merges both reports (48); hops 2 and 3, one agent relays the single upstream report (48 each). 240 calls.
- Model `claude-haiku-5-5`, batch API, thinking disabled, JSON schema output, 512 output tokens. Same request shape as the LAB-007 clean screens.

## Endpoints (deterministic, no judge model)
Primary: cases whose claims at a hop equal the expected claims exactly (every indicator/value pair and every evidence id), per arm, at hops 1, 2 and 3.
Secondary: claims whose cited ids all support the exact value; unsupported claims; missing pairs; missing ids; truncated or invalid outputs. Invalid output counts as a failure of that case.

## Gates and stopping
- Hop 0: each arm needs at least 44 of 48 exact extractions; otherwise stop as `instrument-insufficient` and run no later wave.
- Any wave with more than 10% invalid outputs stops the study.
- Any missing, duplicated, failed or unpriced provider result stops the study with the reservation kept. No request is ever resubmitted.

## Decision rule for H-M01
- **supported**: STRUCT exact in at least 23 of 24 cases at hop 3 and PROSE exact in at most 16 of 24 at hop 2;
- **refuted**: PROSE within one case of STRUCT at hops 1, 2 and 3;
- **inconclusive**: anything else.

## Budget
Study cap [US$ redacted] reserved wave by wave in the shared cumulative ledger (`results/lab007-economy-explore/global-budget.json`, cap [US$ redacted]). Approved by the owner on 2026-11-11 ("Sim, B1 e B2").

## Limits stated in advance
Synthetic facts, one model, one prompt per role, 24 cases. PROSE agents write a briefing in addition to claims, so the arms differ in output length as well as in what is forwarded. A result here is about this instrument, not about research on real documents.
