# LI2 report: the field against conversation on a shared project schedule (2026-11-17)

Preregistration: `tasks/LI2-FIELD-VS-CHAT-PREREG.md`. Analysis: `analysis.json` (registered script) and the paired counts below. Haiku 5.5, 9 waves, 0 failed requests, about [US$ redacted]

24 cases (96 and 192 work items, 12 each), shared round 0 except `solo`, 8 rounds:

| Arm | Solved | Median final violations (96 / 192) | Output tokens per case |
|---|---|---|---|
| sync | 0 | 22 / 48.5 | 432,743 |
| inhibit | 0 | 26.5 / 49 | 325,262 |
| random | 0 | 27.5 / 68 | 226,159 |
| chat | 0 | **17.5 / 34** | 546,299 |
| patch | 0 | 62.5 / 126 | 43,946 |
| central | 4 (all at 96) | 44 / 120 | 73,847 |
| solo | 6 (all at 96) | **1** / 192 | 55,544 |

## Verdicts (as registered)

| Hypothesis | Verdict | Note |
|---|---|---|
| H-LI5 the field beats conversation | **supported on the registered rule, but only degenerately; the substantive result is the reverse** | both solved 0; `inhibit` used 0.60x the tokens. On final violations `chat` ended below `inhibit` in **21 of 24** paired cases (median ratio 1.50 in favour of `chat`) |
| H-LI6 inhibition transfers to the schedule | **refuted** | `inhibit` against `sync`: lower in 10, higher in 13; against `random`: lower in 14, higher in 9 |
| H-LI7 a swarm solves more than the central agent | **refuted** | central 4, every swarm arm 0 |

## What it shows

1. **Conversation helps when a request carries a direction.** On the schedule, messages such as "end W12 by week 17" give the other team a target the field does not hold; `chat` ended below `sync` in 18 of 24 cases (median ratio 0.67). On colouring (LI3) the same arm barely beat `sync`. Members sent 232 messages per case here, which is why `chat` costs 1.7 times `inhibit`.
2. **Inhibition matters only where constraints are symmetric.** On the schedule, both sides moving at once did not oscillate (`sync` fell from 60.6 to 22 violations at 96 items), and inhibition added nothing.
3. **One agent is best below its capacity and declines above it** (review: at 192 items the central agent returned no plan in 91 of 96 calls, saying it could not build a verified schedule; a swarm win there is a win against a near no-op). At 96 items the agent planning from scratch solved 6 of 12, with a median of 1 violation; no swarm came close. At 192 items it returned no usable plan in 12 of 12 cases, and the central repairer ended at a median of 120 violations. Every swarm arm ended below it: `chat` in 12 of 12 (median ratio 0.28), `inhibit` in 12 of 12 (0.40).
4. **Instrument fault in `patch` on this domain.** A team's items are mutually adjacent (one at a time), so a radius-1 patch around any violation recruits the whole team plus its dependencies; patches merge into one group capped at 40 items per case and round. `patch` here measures that cap, not recruitment. It is not interpreted.
5. Starting the central agent from the swarm's territorial round 0 (`central`, median 44 at 96 items) did much worse than letting it plan from scratch (`solo`, median 1).

## Limits

One model, synthetic schedules, 8 rounds, no case solved by any swarm arm. The reversal between domains is a post-hoc reading of two studies; LI5 tests it with a factorial design on fresh cases.
