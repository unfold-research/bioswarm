# Consolidated results of 2026-11-11

One table of everything run that day, written the same evening. It replaces nothing: every row points to a report with a preregistration. Read with these facts in mind:

- All tasks are **synthetic**. All runs are **single runs**. Models: Claude Haiku 5.5 (thinking disabled) and, where marked, Claude Sonnet 5.5 (adaptive thinking, low effort). Sample sizes are small: 8 to 32 cases per cell in the instinct line, 60 to 90 tasks or collections elsewhere. A paired difference on 60 collections carries about ±0.15.
- "Supported" means a preregistered rule was met once. It does not mean established.
- Six statements made during the day were later corrected by further runs. They are listed at the end. That rate of correction is itself a result: single small runs in this programme are wrong or over-read about one time in eight.
- Spend: [US$ redacted] on the shared ledger for about 75,000 calls, plus [US$ redacted] on library cards.

Status key: **S** supported as registered · **N** not supported · **R** refuted · **I** inconclusive as registered · **D** descriptive only (not a registered test) · **×k** replicated in k independent runs.

## A. One agent, a collective, and a larger model (Void, Murmur)

Front (`programs/historical/fronts.md`): intelligence, question I3; V2 and V5 are agent controls.

| Study | What was compared | Result | n | Status |
|---|---|---|---|---|
| V1 | 5 votes, answer-only, hard arithmetic | 8% correct; floor | 48 tasks | I |
| V1b | 5 votes against 1 agent with 60 words of working, arithmetic | error correlation 0.79; votes 0.51 → 0.52; working 96 of 96 | 96 tasks | S |
| M4 | verifier with fallback, vote, single; answer-only; search task | all 0.44 to 0.46; 5 samples identical in 82 of 90 tasks | 90 tasks | N |
| M5 | reworded, told-rejected, diverse vote, escalation | rewording 0.63, told 0.55, vote 0.68, single 0.68; escalate to Sonnet 0.83 | 60 tasks | N, N, N |
| V2 | working of 20, 60, 150 words against a vote of 3 | 0.97, 0.98, 1.00 against 0.58 | 60 tasks | S |
| V3 | collectives of agents with working | single 0.67, vote3 0.76, verify3 0.82, deep 0.86 | 90 tasks | S (vote, verify), N (deep > vote) |
| V4 | copies, different wordings, mixed budgets, second model | 0.69, 0.70, 0.79, 0.77 | 90 tasks | N (diversity), S (copies > one) |
| M6 | verifier with working; cascade to Sonnet | verifier 38 of 38 and 50 of 52; cascade 0.79 → 0.94; one agent with working 0.93 | 90 tasks | S |
| M7 | verifier selects among 5; deep agent | vote5 0.79, select5 0.87, deep 0.91, deepvote3 0.94 | 90 tasks | S (select > vote), N (deep > select) |
| M8 | verifier behind a deep agent | 0.94 → 0.96 to 0.97 | 90 tasks | N (ceiling) |
| V5 | working budget × model, search task | Haiku direct 0.10, w60 0.83, w150 0.87; Sonnet direct 0.70, w60 1.00 | 60 tasks | S, S, S |
| V6 | the same contrasts on a second task (counting) | direct 0.52, w20 0.69, vote3 0.64, verify3 0.70, w60 0.80, w150 0.94; Sonnet direct 0.97 | 90 tasks | S (working), **N (vote)**, S (verify > vote), **N (small+working > large direct)** |
| V7 | deep agents below ceiling, counting | deep 0.64, vote 0.63, select 0.67, escalate 0.87, Sonnet 0.90 | 90 tasks | N, N, N, S (escalation) |

What holds across this block (REP1 = replication on 300 new tasks per task family, `results/batch2-rep1/REPORT.md`):
1. **Working space for the agent is the largest gain** (V1b, V2, V5, V6: ×4, two tasks, both models; **REP1: +0.62 and +0.11 over a vote of three without it**).
2. **A collective of agents without working space adds nothing** (V1b, M4, M5: ×3; **REP1: −0.01 in both families**).
3. **A verifier beats a vote at the same calls** (V3, M7, V6: ×3, two tasks; **REP1: +0.04 and +0.03, intervals above zero: real and small**), and the verifier needs working space (M6).
4. **Among deep agents of one model a collective adds nothing measurable** (M8 at ceiling, V7 at 0.64: ×2); a larger model does (M5, V7: ×2).
5. **One deeper agent beats the verified collective of shallower ones** (not separable in V3 and M7; **REP1: +0.07 and +0.24, in one call against two or three**).
6. **Withdrawn**: the gain of a vote among reasoning agents. V3 and V4 gave +0.09 and +0.10 on 90 tasks with intervals above zero; V6 did not show it; REP1 gives +0.02 and +0.01 on 300 tasks with intervals that include zero.
7. Did **not** generalise: the advantage of a small reasoning model over a large direct one (V5 yes; V6 no).

## B. Instincts (rules installed in an agent)

Front: harness, question H2.

| Study | Question | Result | n per cell | Status |
|---|---|---|---|---|
| I1 | transplant across task families | transplant = native on both models | 8 | S ×2 models |
| I2 | interference among 12 disjoint instincts | none (6, 6, 6, 5 of 8) | 8 | N (H-I07 for disjoint triggers) |
| I3, I4 | does a peer note install an instinct | formal adoption 0 of 208 across I1, I3, I4; covert shift of the verdict on Haiku in the triage family only | 8 to 16 | S (no formal adoption), N (covert uptake as registered) |
| I5 | two instincts, same trigger | target falls 12 → 3, 0 (Haiku), 16 → 4, 4 (Sonnet); priority obeyed by Sonnet only | 16 | S |
| I6, I9, I10, S3 | an installed rule and unprompted behaviour | unprompted quarantine (about half) → 0 with any installed instinct | 16 | S **×5**, both models |
| I7 | partial overlap | interference local to the overlap; exclusion clause works on Sonnet only | 16 | S |
| I8, I13 | one card with two mutually exclusive conditions | followed: 14 and 16 of 16 (I8); 62 of 64 both directions on Haiku (I13) | 16 to 32 | S ×2 |
| I10 | the behaviour written as an instinct | 16 of 16, survives other instincts | 16 | S, both models |
| I11, I12, I14 | admission by an agent | collisions detected every time; written merges fail for a narrow overlap; a regression gate admits and refuses correctly and holds on unseen cases | 16 | S (detection), N (merge), S (gate), I (I12) |
| S3 | card injected only when its trigger holds | baseline kept on other cases; 0 where the card fires | 16 | S, N |

What holds: **(1)** any installed instinct displaces unprompted behaviour on the actions it names (the most replicated result of the day); **(2)** behaviour written as an instinct is reliable and survives; **(3)** colliding instincts break each other, locally to the overlap; **(4)** a small model holds two actions only as two mutually exclusive stated conditions, not as precedence; **(5)** admission needs a test in the executor, and refusing is the safe fallback.

## C. Content from peers and from the field

Front: harness, question H1; M3 also intelligence I3.

| Study | Question | Result | n per cell | Status |
|---|---|---|---|---|
| B1, B4 | unverified record; injected order | abstention every time, never a wrong verdict; orders futile at every strength (0 of 68 on Haiku) | 12 | S |
| B2, B5 | prose against structured relay | both exact through three hops | 24 | R (H-M01) ×2 |
| D1 | defence policies | Sonnet executes each as written; Haiku blurs three into one | 8 | D |
| M3 | grounded against blind verifier, planted errors | 48 of 48 and 48 of 48 against near useless; both models | 48 | S ×2 models |
| I6 | a note with no rule | halves unprompted quarantine | 16 | N (predicted no effect) |
| C1 | typed traces against a note | Sonnet: note 0.50 → 0.13, traces 0.56 and 0.75; both models: traces raise it | 16 to 32 | S (Sonnet), I (Haiku) |
| C1b | label, author, subject | operator-attributed state leaves behaviour unchanged; peer or unattributed raises it; on Haiku one sentence about untrusted traces lowers it 0.50 → 0.16 | 16 to 32 | S, mixed |

What holds: unverified input forces abstention and never a wrong verdict; a verifier needs the sources. What is new and thin: **whatever is put in an agent's context moves its behaviour, including typed facts; attribution to the operator is the one presentation found that does not.** One behaviour, one family.

## D. Coordination regimes on a field

Front: intelligence, questions I2 (R1 to R4, D5, D4) and I1 (T1); RD, PD1 and D4 also harness H2; D6 is an agent control.

| Study | Setting | Result (correct under a silent edit) | n | Status |
|---|---|---|---|---|
| R1 | budget covers the field twice | schedule, deep readers, orchestrator 30 of 30; undirected stigmergy 17 to 18; decay no difference | 30 | S (schedule > stigmergy), N (decay) |
| R2 | budget covers half; edit local | alarm rule 0.72, schedule 0.53. **Orchestrator arm invalid (leak)** | 60 | S; orchestrator result withdrawn |
| R2b | the same, leak closed | alarm rule 0.70, schedule 0.48, Haiku orchestrator 0.75 | 60 | S ×2 with R2 |
| R3 | scattered edits; a false count | scattered: schedule 0.47, rule 0.28, orchestrator 0.20. False count: schedule 0.38, rule 0.17, confirm-first 0.37, orchestrator 0.27 | 60 | S, S, S (confirm) |
| R4 (simulation) | rules on 2,000 collections | local / scattered: schedule 0.52 / 0.50, alarm 0.67 / 0.31, hedge 0.60 / 0.39, adaptive 0.65 / 0.33, planned search 1.00 / 0.29 | 2,000 | no rule safe in both |
| RD | orchestrator model × prior | Sonnet + prior 0.98 local, 0.23 scattered; without prior 0.62, 0.28; Haiku without prior 0.47, 0.23 | 60 | all five predictions N; headline D |
| REP1 part 2 | Sonnet + prior on 60 new collections | 60 of 60 under a local edit | 60 | S (replicates RD's headline) |
| D6 | one Haiku agent makes all six re-counts in sequence | local 0.75 (schedule 0.48, Haiku orchestrator 0.75, Sonnet + prior 0.98); scattered 0.35 (schedule 0.47) | 60 | S (beats schedule locally), equal to the small orchestrator, S (not above schedule when scattered) |
| T1 | when to stop re-reading a field of 24 parts; model decides against threshold rules | central trigger 0.58 (Haiku) and 0.61 (Sonnet) right at 5 re-counts; threshold 4: 0.62 at 6.8; threshold 8 with stop: 0.81 at 8.9 | 90 (rules also on 3,000) | S (central not above the best rule; spends on unchanged fields) |
| PD1 (2026-11-12) | a model plans a search rule from 0, 1 or 4 examples on a field with hidden structure; the rule runs in code | Sonnet 0.69 from one example and 0.71 from four (best rule 0.71, ring rule carried over 0.37, fit on the same examples 0.41 and 0.60); Haiku without thinking 0.49 and 0.36 | 40 plans per cell group, 1,000 fields each | S (Sonnet: beats carried rule, equals best, beats fit); N or refuted for Haiku |
| D5 (2026-11-12) | avoid-stigmergy at three decay rates, 150 paired collections | edited: no decay 0.41, decay 0.67, latest only 0.75; stable 1.00, 0.97, 0.95. By re-estimation: weighting of counts +0.28, visit marks −0.02 | 150 | S (decay helps; forgetting costs when stable). The effect is in how counts are combined, not in where workers go |
| D4, D4b | agents read marks and choose | follow an alarm 90%; explore only when told why; 0.58 to 0.63 against 0.70 for the harness rule | 60 | S (use marks), N (match rule; variants) |

What holds:
1. With coverage, **a fixed schedule is enough** and an orchestrator model reproduces it at higher cost (R1).
2. Without coverage and with local change, **a policy that follows traces beats any fixed schedule** (R2, R2b, simulation). The size depends on the policy: 0.15 for the first rule tried, 0.48 for a planned search.
3. **Every such policy is a bet on how the field changes** and falls below the schedule when the bet is wrong (R3, R4, RD), whether it is a rule, a small orchestrator or a large one. No policy tried is safe in both worlds.
4. **False traces must be confirmed before they recruit** (R3).
5. A larger model **found** the best policy; code **ran** it for nothing (RD).
6. **One agent holding the whole budget equals the small orchestrated collective** and stays below the planned search (D6). The single-agent arm is no longer missing.
7. **A model asked when to stop stops early**: it reads "not found yet" as "not changed", lands at the cheap end of the rule frontier, and a larger model decides no better (T1).
8. **A model that plans once, with reasoning, finds the rule for a new structure from one example**, and the rule then runs as code (PD1); a small model without reasoning does not use the examples. Size and reasoning are confounded in that comparison.
9. **Decay helps when the field changes, and only as a discount on old counts** (D5): R1 was too small to see it. Evaporating visit marks changed nothing.
10. Not supported: an orchestrator adding to a schedule (R1); agents matching a harness rule by choosing for themselves (D4).

## E. Corrections made during the day

| First statement | Corrected by | What changed |
|---|---|---|
| I3: a peer note moves Haiku's verdict in about half the cases | I4 | holds in one of three families; a second, opposite effect (suppression) was found |
| I12: I8's branch result is in doubt; Haiku takes the escalating branch regardless | I13 | false; Haiku follows a conditional card in both directions; what fails is precedence |
| R2: the orchestrator is right on 60 of 60 | leak check, then R2b | an artefact of the collection generator; 0.75 without it |
| Architecture synthesis: a card that states facts does not steer | C1, C1b | typed facts move behaviour; operator attribution is what leaves it unchanged |
| R2b: a rule and an orchestrator are equivalent | RD, R4 | true only for the weak rule and the small model compared; a planned search, by Sonnet or in code, is near perfect |
| V3, V4: a vote of three helps agents that reason (+0.09, +0.10, both supported as registered) | V6, REP1 | did not replicate on 300 tasks in either family (+0.02, +0.01) |

Two further cautions from R4: point estimates on 60 collections moved by up to 0.07 at 2,000, and the alarm rule's advantage is 0.15, not 0.22.

Corrections of 2026-11-12: (7) "decay had no effect" (R1, 30 collections) is replaced by D5: +0.26 at 150 collections, all of it from the weighting of counts. R1's report also understated what the rule predicts with exact readers (0.69 against 0.35 on 3,000 collections, not 0.60 against 0.47). (8) "a vote among reasoning agents adds nothing" (REP1) is softened by Q1: seven votes are +0.04 above one agent in both families, intervals above zero; three votes were +0.02 and +0.01 in REP1 and +0.03 and +0.04 in Q1. The gain is small and costs three to seven times the tokens.

## F. What a paper could lean on today, and what it could not

Could, with scope stated (synthetic tasks, two models, replicated at least three times; A1 to A3 and A5 also at 300 tasks per family): A1, A2, A3, A5, B1, D1 to D3.
Could not: a gain from voting among reasoning agents (withdrawn). Could not yet: anything about decay; anything about diversity; the attribution result of C1b; the claim that agents can carry a regime themselves; any number from a single run of 60.
