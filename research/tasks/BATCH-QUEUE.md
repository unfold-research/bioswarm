# Batch queue (opened 2026-11-11)

Rules for every batch: preregister cases, seeds, endpoints, stopping rules and a spending cap before the first paid call; reserve the cap in the ledger; never resend an uncertain request; do not pool with earlier data; report the conventional baseline at matched cost.

## Done

| Batch | Scope | Cost | Result |
|---|---|---|---|
| S2 | Simulations for H-24, H-25, H-26 (`sim-branching`, `sim-router-decay`, `sim-reserve`) | free | 13 of 13 predictions supported in the model; cards in `results/sims/` |
| B1 | Abracadabra endpoint calibration, 144 calls | [US$ redacted] | Instrument sound (24/24). Factuality attack observable: one unverified record turns 12/12 verdicts into `unsure`, none into the attacker's label. Authority order futile (0/12). `results/batch2-b1-endpoints/REPORT.md` |
| B2 | Murmur relay format, H-M01, 240 calls | [US$ redacted] | H-M01 refuted on this instrument: prose and structured relay both exact in 24/24 through three hops. `results/batch2-b2-relay/REPORT.md` |

## Done on 2026-11-11 (second and third rounds)

| Batch | Result | Report |
|---|---|---|
| V1 vote correlation | floor effect, mostly uninformative; redesign as V1b | `results/batch2-v1-vote/REPORT.md` |
| M3 verifier | grounded 48/48 and 48/48 on both models; blind near useless | `results/batch2-m3-verifier/REPORT.md` |
| B4 attack dose | factuality saturated at the weakest dose; authority futile at every strength | `results/batch2-b4-dose/REPORT.md` |
| B5 relay under load | prose and structured both exact at every hop (H-M01 refuted again) | `results/batch2-b5-load/REPORT.md` |
| I1 instinct transplant | transplant equals native on both models; a peer note is never formally adopted but moves Haiku's verdict in about half the cases | `results/batch2-i1-transplant/REPORT.md` |
| I2 interference | no interference up to 12 installed instincts | `results/batch2-i2-interference/REPORT.md` |
| I3 peer pressure | formal adoption 0 of 32; verdict moved in 17 of 32 | `results/batch2-i3-peer-pressure/REPORT.md` |
| D1 defence comparison | Sonnet executes each policy as written (no policy dominates); Haiku blurs them into one cautious behaviour | `results/batch2-d1-defence/REPORT.md` |
| R1 Sonnet replications | B1, M3, D1, I1 on Sonnet 5.5 | `results/batch2-r1-sonnet/REPORT.md` |

## Done on 2026-11-11 (fourth round)

| Batch | Result | Report |
|---|---|---|
| I4 covert uptake | registered test not supported on Haiku (uplift 8, 2, 0 of 16 by family), refuted on Sonnet; formal adoption 0 of 96; a note proposing a rule suppressed spontaneous quarantine on both models (unregistered) | `results/batch2-i4-covert/REPORT.md` |
| I5 rival instincts | a colliding instinct breaks the target on both models; Sonnet obeys an explicit priority, Haiku does not | `results/batch2-i5-rivals/REPORT.md` |
| M4 verifier or searcher | no gain from either: five samples gave one answer in 82 of 90 tasks; verifier specificity 0.71, sensitivity 0.75 on real errors | `results/batch2-m4-budget/REPORT.md` |
| V1b voting ladder | error correlation 0.79; five votes add 0.01; rewording lowers correlation, prescribed strategies do not; one sample with working space right on 96 of 96 | `results/batch2-v1b-vote/REPORT.md` |

## Done on 2026-11-11 (fifth round)

| Batch | Result | Report |
|---|---|---|
| I6 advice suppression | any rule in the context, from a peer or the operator, removed unprompted quarantine on both models (9 and 11 of 16 to 0); a note with no rule halved it | `results/batch2-i6-advice/REPORT.md` |
| I7 partial overlap | interference stays inside the overlap; an exclusion clause at admission works on Sonnet (16) and not on Haiku (4) | `results/batch2-i7-overlap/REPORT.md` |
| M5 second searcher | rewording no gain, told-of-rejection worse, diverse vote no gain; escalating to Sonnet 0.68 to 0.83 against 1.00 for Sonnet alone | `results/batch2-m5-second/REPORT.md` |
| V2 working-space dose | about twenty words of working: 0.97 against 0.58 for a vote of three, at lower cost | `results/batch2-v2-working/REPORT.md` |

## Done on 2026-11-11 (sixth round)

| Batch | Result | Report |
|---|---|---|
| M6 verifier with working space | verifier 38 of 38 and 50 of 52; cascade 0.79 to 0.94 against 0.97 for Sonnet alone; one small-model call with working reaches 0.93 | `results/batch2-m6-verifier/REPORT.md` |
| V3 reasoning collective | vote of three +0.09 over one agent, verify3 +0.07 over the vote; one agent with more working 0.86, not separable from the collectives | `results/batch2-v3-collective/REPORT.md` |
| I8 merge | a merged card, a refused rival and a card with a branch all work on both models | `results/batch2-i8-merge/REPORT.md` |
| I9 operator rules | an installed instinct removes unprompted quarantine; a style sentence does not; a preserving sentence does not restore it | `results/batch2-i9-rules/REPORT.md` |

## Done on 2026-11-11 (seventh round)

| Batch | Result | Report |
|---|---|---|
| M7 selection among five | verifier selection 0.87 against 0.79 for the vote; one deep agent 0.91 in one call | `results/batch2-m7-select/REPORT.md` |
| V4 different agents | different wordings add nothing to copies; a better member does; Sonnet answer-only at low effort (0.74) below Haiku with 60 words of working (0.79) | `results/batch2-v4-diverse/REPORT.md` |
| I10 explicit behaviour | written as an instinct the behaviour fires 16 of 16 and survives other instincts, on both models | `results/batch2-i10-explicit/REPORT.md` |
| I11 admission by an agent | collisions detected; resolution fails on the narrower newcomer for both admission models | `results/batch2-i11-admission/REPORT.md` |

## Done on 2026-11-11 (eighth round)

| Batch | Result | Report |
|---|---|---|
| I12 admission gate | inconclusive as registered (baseline 11 of 16, needed 12); template repairs the broad merge, not the narrow one; the newcomer's residual action is mostly lost | `results/batch2-i12-gate/REPORT.md` |
| V5 working budget against model | Haiku with working 0.83 to 0.87, Sonnet direct 0.70, Sonnet with working 1.00; working is about twenty times cheaper per correct answer than the larger model | `results/batch2-v5-budget/REPORT.md` |
| M8 verifier behind a deep agent | deep agent 0.94 alone; verifier adds 0.01 to 0.02, not separable from zero | `results/batch2-m8-deep/REPORT.md` |

## Done on 2026-11-11 (ninth round)

| Batch | Result | Report |
|---|---|---|
| V6 a second task | working space and verification carry over; the vote gain and the small-model advantage over a large model answering directly do not | `results/batch2-v6-second/REPORT.md` |
| I13 branch cards in both directions | followed in both directions by the small model; a statement in the I12 report was wrong and is amended | `results/batch2-i13-branch/REPORT.md` |

## Done on 2026-11-11 (tenth round)

| Batch | Result | Report |
|---|---|---|
| R1 five coordination regimes | fixed sweep, deep readers and an orchestrator model all right on 30 of 30 with and without a silent edit; undirected stigmergy 17 to 18 of 30 under the edit; decay made no difference | `results/batch2-r1-regimes/REPORT.md` |
| V7 deep agents on a harder task | deep agent 0.64; vote 0.63, verified selection 0.67; escalation to Sonnet 0.87 | `results/batch2-v7-hard/REPORT.md` |
| I14 admission as a partition | the gate admits rival and broad merges, refuses every narrow one and holds on unseen cases; the newcomer's residual action is mostly lost | `results/batch2-i14-partition/REPORT.md` |

## Done on 2026-11-11 (eleventh round)

| Batch | Result | Report |
|---|---|---|
| R2 partial coverage | alarm rule 0.72 against 0.53 for the best fixed schedule; the orchestrator's 1.00 is confounded by a flaw in the collection | `results/batch2-r2-regimes/REPORT.md` |
| R2b the same without the leak | alarm rule 0.70 against 0.48; orchestrator 0.75, not different from the rule, at 16% more cost | `results/batch2-r2b-regimes/REPORT.md` |

## Done on 2026-11-11 (twelfth round)

| Batch | Result | Report |
|---|---|---|
| kernel (free) | leak probe, field log, control check | `observatory/batch2/kernel/README.md` |
| C1 typed traces against a note | Sonnet: a note suppresses unprompted quarantine, typed traces do not; on both models traces raise it. Haiku inconclusive as registered | `results/batch2-c1-typed/REPORT.md` |
| S3 instinct injected on trigger | protects the cases no card touches; on cases where the card fires unprompted behaviour still goes to zero | `results/batch2-s3-trigger/REPORT.md` |

## Done on 2026-11-11 (thirteenth round)

| Batch | Result | Report |
|---|---|---|
| C1b label, authorship, subject | operator-attributed state leaves behaviour unchanged; peer or unattributed content raises unprompted quarantine; on Haiku one sentence about untrusted traces lowers it | `results/batch2-c1b-label/REPORT.md` |
| D4 agents choose from the marks | they follow the signal (90%) and do not explore; 0.58 against 0.70 for the harness rule and 0.75 for the orchestrator | `results/batch2-d4-choice/REPORT.md` |

## Done on 2026-11-11 (fourteenth round)

| Batch | Result | Report |
|---|---|---|
| R3 boundaries | scattered edits: sweep 0.47, alarm rule 0.28, orchestrator 0.20. False count: sweep 0.38, alarm rule 0.17, verify 0.37, orchestrator 0.27 | `results/batch2-r3-bounds/REPORT.md` |
| D4b exploration in the agent | told the trade, workers explore (61%) and reach 0.63; a wider view and an offer do nothing; none separable from D4 | `results/batch2-d4b-choice/REPORT.md` |

## Done on 2026-11-11 (fifteenth round)

| Batch | Result | Report |
|---|---|---|
| R4 a rule that hedges (free, simulation) | no rule is above the schedule under both local and scattered change; the alarm rule's advantage is 0.15 at 2,000 collections | `results/ring-rules/REPORT.md` |
| RD orchestrator model by prior (D2) | Sonnet with the locality prior 0.98 under local change, by planning a search; no orchestrator above the schedule under scattered change; the plan written in code gives 1.00 | `results/ring-routers/REPORT.md` |
| REP1 replication at 300 tasks | working space, no gain from direct votes, verifier over vote and one deeper agent over the verified collective replicate; the vote gain among reasoning agents does not; planned search 60 of 60 | `results/batch2-rep1/REPORT.md` |
| D6 one deep agent at partial coverage | one Haiku agent with the whole budget 0.75 under local change, equal to the Haiku orchestrator with two workers, below the planned search; 0.35 under scattered change, below the schedule | `results/batch2-d6-deep/REPORT.md` |
| T1 the trigger as a decision | a model deciding when to stop stops early: 0.40 to 0.50 on locally edited fields where a threshold of eight re-counts gets 1.00; equals threshold 4 at fewer re-counts; Sonnet no better than Haiku | `results/batch2-t1-trigger/REPORT.md` |
| PD1 policy discovery | Sonnet plans the right rule for a hidden structure from one example (0.69 against 0.71 for the best rule and 0.37 for the ring rule carried over) and beats a fit by simulation on the same examples; Haiku without thinking does not use the examples | `results/batch2-pd1-policy/REPORT.md` |
| D5 decay with power | decay helps under a silent edit (0.67 against 0.41, 150 paired collections); the whole effect is the discount on old counts, none is the fading of visit marks; forgetting costs 0.05 when nothing changed | `results/batch2-d5-decay/REPORT.md` |
| Q1 quorum as a stopping rule | a quorum of 2 gives the accuracy of seven votes with 2.2 agents; seven votes are +0.04 over one agent; one agent with 60 words is above the quorum at a third of the tokens | `results/batch2-q1-quorum/REPORT.md` |

## Done on 2026-11-13 (genome)

| Batch | Result | Report |
|---|---|---|
| G1 swarm genome, two coders | 51 systems × 39 traits, κ 0.69; H-G01, H-G05 and H-G07 supported; H-G02, H-G03 and H-G06 without power; H-G04 partial (castes yes, reserve no power); [US$ redacted] | `results/genome-g1/REPORT.md` |

| G2 archetypes as simulated swarms (free) | home field refuted; no universal archetype; readers lose most under threat; defence can push members onto an unattributed channel; per-task flag selection wins under threat; no general hybrid | `results/genome-g2/REPORT.md` |
| G3a charging for the informed minority (free, 2026-11-15) | `DEC-04` now pays for its channel; school falls on 3 of 4 tasks (H-G15 supported); per-task selection beats the best preset on only 1 of 4 at threat 0, so H-G13 does not survive (H-G17 refuted); no general hybrid (3 of 8, H-G18 supported); the `mass` hybrid is untouched, which makes H-G16 trivially satisfied and is recorded as an erratum. G2 superseded on every `DEC-04` cell | `results/genome-g3a/REPORT.md` `tasks/G3-DEC04-PREREG.md` |
| G3b what carries the track hybrid (free, 2026-11-15) | centralisation does: `DOL-04` alone reproduces 0.916 of the `track` hybrid and removing it costs 0.466, while the free perception edge is worth 0.041 (H-G21 supported, H-G19 refuted). Survey-cap sensitivity is invariant on 7 of 8 cells and 0.0224 on `pipeline`/school (H-G20 refuted). H-G22 is satisfied only by the fixed schedule and by members with no flags, so no leaderless collective beats a centralised one here. `track` drops out as evidence for distributed coordination | `results/genome-g3b/REPORT.md` `tasks/G3B-TRACK-PREREG.md` |

## Defence under TM-001 (2026-11-15)

| Batch | Result | Report |
|---|---|---|
| D2 a compromised member in a DeepSeek trio on OpenBot | one worker of three reports a falsified figure: a lead without the source returns the attacker's answer 6 of 6 and never notices; a lead told to check cited records is right 6 of 6 and names the invoice, and so is an uninstructed lead; one agent is right 6 of 6 at a quarter of the cost (H-D15 preliminary support, all six predictions hold). Pilots: honest DeepSeek refuses the falsification order; OpenBot shows profiles to teammates; [US$ redacted] | `docs/THREAT-MODEL-001.md` `tasks/D2-INSIDER-PREREG.md` `results/d2-insider-2026-11/REPORT.md` `results/d2-insider-2026-11/REVIEW.md` |

## Coordination through the field (2026-11-17)

| Batch | Result | Files |
|---|---|---|
| LI1 lateral inhibition in parallel repair (colouring, Haiku, Batch API) | no swarm arm reaches zero conflicts in 8 rounds (H-LI1 to H-LI3 refuted); simultaneous repair oscillates and any symmetry breaking cuts final conflicts about threefold (36 of 36 paired); targeting adds nothing over random activation; `patch` turned out to be one agent on a 40-node window and ended below the whole-graph agent at 240 nodes in 12 of 12, against an agent that often declined (H-LI4 supported on its rule); [US$ redacted] | `tasks/LI1-LATERAL-INHIBITION-PREREG.md` `results/li1-lateral-inhibition/REPORT.md` `results/li1-lateral-inhibition/PILOTS.md` `results/li1-lateral-inhibition/PRIOR-ART.md` |
| LI2 the field against conversation on a shared schedule | on directed dependencies members that message end below silent inhibition in 21 of 24 cases at 1.7x tokens; inhibition no better than simultaneous repair (H-LI6 refuted); one agent best at 96 items and declining at 192 (H-LI7 refuted; H-LI5 supported only degenerately); [US$ redacted] | `tasks/LI2-FIELD-VS-CHAT-PREREG.md` `results/li2-schedule-field-vs-chat/REPORT.md` |
| LI3 the field against conversation on colouring | on symmetric constraints silent inhibition ends below messaging members in 24 of 24 at 0.65x tokens; members' requests are all "you move" (H-LI5b supported only degenerately); [US$ redacted] | `results/li3-colour-field-vs-chat/REPORT.md` `results/li3-colour-field-vs-chat/chat-paired.json` |
| LI5 talk x inhibition factorial and typed field requests (schedule) | messaging beats simultaneous repair again (20 of 24, H-LI11 supported); adding inhibition to messaging destroys its gain (worse in 20 of 24, H-LI12 refuted); typed requests with inhibition land between inhibition and messaging (H-LI13 inconclusive); [US$ redacted] over its [US$ redacted] cap (disclosed) | `tasks/LI5-TALK-FACTORIAL-PREREG.md` `results/li5-schedule-talk-factorial/REPORT.md` |
| LI4 windowed repair over 16 rounds | nothing solved in 16 rounds (H-LI8 refuted); the windowed repairer beats the whole-graph agent at 240 nodes again, 10 of 12 (H-LI9 supported); radius 2 no better (H-LI10 refuted); [US$ redacted] | `tasks/LI4-RECRUITMENT-TAIL-PREREG.md` `results/li4-recruitment-tail/REPORT.md` |
| LI6 routing conflicts by geometry (schedule with shared machines; stopped at its cost cap after 5 rounds) | the router beats silent inhibition (19 of 24) but not free messaging (13/11; H-LI14 inconclusive); its messages carry its gain (21 of 24 against the silent router, H-LI15 supported) at the same cost as messaging (H-LI16 supported); with symmetric conflicts present inhibition beats simultaneous repair again (18 of 23); [US$ redacted] | `tasks/LI6-GEOMETRY-ROUTING-PREREG.md` `results/li6-mixed-geometry-routing/REPORT.md` `results/li6-mixed-geometry-routing/CAP-STOP.md` |
| LI7 conflict geometry on real code (Sonnet 5.5, executed JavaScript, 5 modules per codebase) | the geometry router (symmetric edge: one side holds the turn; directed: both act; messages) solved 12 of 12 codebases by round 3, free conversation 0 and simultaneous repair 0 (both sides of a format edge swapped formats in 220 of 220 and 219 of 219 occasions), inhibition 3 under the strict check adopted after review; H-LI17, H-LI18, H-LI20 supported, H-LI19 supported only under the strict check; one agent with every specification also solved 12 of 12 at about a quarter of the tokens (H-LI21); [US$ redacted] | `tasks/LI7-REAL-CODE-PREREG.md` `results/li7-real-code-geometry/REPORT.md` `results/li7-pilot/PILOT.md` `docs/reviews/LI7-REVIEW-2026-11-17.md` |
| LI8 the geometry result on Haiku at 5 and 12 modules | the router solved 20 of 20 codebases, conversation and simultaneous repair 0 (symmetric edges swapped in 600 of 600 occasions), inhibition 1 under the strict check; geometry transfers to a second model (H-LI24 supported); one agent with every specification also solved 20 of 20 at a quarter of the tokens, so 12 modules did not need a team (H-LI22 refuted, H-LI23 supported); [US$ redacted] | `tasks/LI8-HAIKU-CAPACITY-PREREG.md` `results/li8-haiku-capacity-k12/REPORT.md` |
| LI9 the router against a manager agent at 5 and 12 modules | a lead agent that sees every specification and assigns work solved 19 of 20 (strict), the router 17, at 72% of the router's output tokens (H-LI25 and H-LI26 refuted); both beat leaderless conversation, 0 of 20 (H-LI27 supported); the router is ahead per wave because the manager needs a planning wave; [US$ redacted] | `tasks/LI9-ORCHESTRATION-PREREG.md` `results/li9-orchestration-k12/REPORT.md` |
| LI10 router against manager, chat and one agent at 40 and 80 modules | strict check: manager 13 of 16, router 5 (its callers worked around wrong helpers; hold-out 4 of 16), chat 0, one agent 14 (H-LI28 refuted, H-LI29 supported, H-LI30 refuted, H-LI31 refuted); the router reached zero failures first under the run's own check; review: feedback used the beatable check; [US$ redacted] | `tasks/LI10-SCALE-BIO-VS-MARKET-PREREG.md` `results/li10-scale-k80/REPORT.md` |
| LI11 response threshold and stigmergy with polarity against router and manager at 40 and 80 modules | strict: pheromone 15 of 16 (hold-out 15), manager 11, router 6, threshold 1; the requirement trace sent only to the helper owner removed caller workarounds (H-LI33 supported, 17 to 0) but was written by the harness, an oracle (review); against the manager inconclusive, 4 to 0 (H-LI34); noise beats simultaneous action, not an arbiter (H-LI32, weak); [US$ redacted] | `tasks/LI11-MECHANISMS-PREREG.md` `results/li11-mechanisms-k80/REPORT.md` |
| LI12 polarity, oracle trace and agent-written traces at 40 and 80 modules | with one strict check for feedback and scoring the router and the manager each solved 16 of 16 and the harness trace 16 of 16 in 1 to 3 rounds at half the cost; polarity alone 0 (H-LI36 refuted, H-LI38 supported); the agent-trace arm was broken by a parser bug that dropped about 55% of traces (H-LI37, 39, 40 invalid per review; delivered traces worked 211 of 211); on fresh inputs the router keeps 8 of 16, the manager 15; [US$ redacted] | `tasks/LI12-POLARITY-TRACE-PREREG.md` `results/li12-polarity-trace-k80/REPORT.md` |
| LI12R replication of LI12 on fresh seeds at 40 modules | polarity alone 0 again (H-LI36 replicates); with the trace parser fixed, agent-written traces solved 8 of 8 like the manager and the oracle, in fewer rounds (H-LI38, H-LI39 supported; H-LI37 tied); but 3 of 8 on fresh inputs: every failure was fixed in wave 1 before a trace arrived, 0 of 102 after one; [US$ redacted] | `tasks/LI12R-REPLICATION-PREREG.md` `results/li12r-replication-k40/REPORT.md` |
| LI13 losing members: bio coordination against a manager with 20% of members down each wave | router 11 of 16 (5 lost to loss, messages to down members vanish), manager 15, agent traces and oracle 16 (H-LI41, H-LI42 refuted, H-LI43 inconclusive); review: lost manager plans were retried at no cost and time was not scored, and the runner ended one case early; traces 2 of 16 on fresh inputs, all fixed before a trace arrived; [US$ redacted] | `tasks/LI13-MEMBER-LOSS-PREREG.md` `results/li13-member-loss-k80/REPORT.md` |
| LI14 clonal selection on top of agent-written traces | clonal and stig both 16 of 16 but 3 of 16 on fresh inputs; clonal costs twice the tokens and adds nothing (H-LI44 refuted, H-LI45 inconclusive, H-LI46 refuted); all 42 hold-out failures were helpers fixed before the trace arrived; [US$ redacted] | `tasks/LI14-CLONAL-PREREG.md` `results/li14-clonal-k80/REPORT.md` |
| LI15 the field inside the Colony on real repositories, against the Colony's manager pattern | field 11 of 12 solved and generalised, market 8 and 6 (H-LI47 inconclusive, 6 to 1); review: the gap is mostly market teams stalling after their ant message budget ran out, ownership never blocked an edit, traces are an uncapped channel; market cheaper (H-LI49 refuted); gpt-6-luna on the subscription | `tasks/LI15-COLONY-FIELD-PREREG.md` `results/li15-colony-k40/REPORT.md` |
| LI16 act on the signal, not on the symptom: helper owners wait for the trace | waiting for the trace: 16 of 16 solved and 16 of 16 on fresh inputs, against 7 of 16 when acting on the symptom (H-LI50 supported, 9 to 0); against the manager a tie on fresh inputs, fewer act waves (10 to 1) and fewer tokens (16 to 0) (H-LI52, H-LI53 supported); replicated in LI17; [US$ redacted] | `tasks/LI16-SIGNAL-NOT-SYMPTOM-PREREG.md` `results/li16-k80/REPORT.md` |
| LI17 clonal selection on top of waiting for the trace | every arm 16 of 16 and 16 of 16 on fresh inputs (ceiling; H-LI54, H-LI55 inconclusive); clonal costs 1.6 times the tokens; stigwait replicates LI16 on fresh seeds; [US$ redacted] | `tasks/LI17-CLONAL-WAIT-PREREG.md` `results/li17-k80/REPORT.md` |
| LI18 do weak test suites explain the generalisation gap? (16 inputs per check) | with 16 inputs per check, traces pass fresh inputs 13 of 16 (3 of 16 with 8 inputs the same day), manager 16, router 14 (H-LI56, H-LI57 inconclusive); weak tests were the main cause of the gap; [US$ redacted] | `tasks/LI18-STRONGER-TESTS-PREREG.md` `results/li18-k80/REPORT.md` |
| LI19 harder tasks (80 and 120 modules, 2k directed edges, 6 waves, equal wave budget) | waiting for the trace 16 of 16 and 16 of 16 on fresh inputs, manager 0 of 16 (H-LI58, H-LI59 supported, 16 to 0), but a design result: the wave budget gave the manager at most 3 act rounds and 21 of 62 plans were truncated (LI24 is the control); the router solved 15 but only 8 hold on fresh inputs (blind wave-1 guesses; H-LI60 inconclusive); [US$ redacted] | `tasks/LI19-HARDER-TASKS-PREREG.md` `results/li19-k80/REPORT.md` `docs/reviews/LI19-REVIEW-2026-11-18.md` |
| LI20 waiting for the trace inside the Colony on the runtime fleet, gpt-6-luna (second model family) | no stalls or caps; field 16 of 16 on fresh inputs against 13 of 16 (H-LI68 inconclusive, 3 to 0); the market finished sooner (H-LI69 refuted, 5 to 11) and, on total tokens as registered, used fewer (3 to 13, p = 0.021; H-LI70 refuted); runner/scorer mismatch fixed for LI29; ChatGPT subscription, outside the ledger | `tasks/LI20-COLONY-WAIT-PREREG.md` `results/li20-colony-wait-k40/REPORT.md` `docs/reviews/LI20-REVIEW-2026-11-18.md` |
| LI21 the LI16 comparison with Sonnet 5.5 | aborted at the study cap after wave 1 (the gate counted reserved, not spent, cost); no verdict interpretable (H-LI61 to H-LI63 aborted); cap stops now end a run as incomplete; [US$ redacted] | `tasks/LI21-SONNET-PREREG.md` `results/li21-k40/REPORT.md` `docs/reviews/LI21-REVIEW-2026-11-18.md` |
| LI22 do traces need to persist? (evaporation) | manipulation not engaged: traces were refreshed every wave, so evaporation removed nothing; every arm 8 of 8 (H-LI64, H-LI65 inconclusive); untested, not a null; [US$ redacted] | `tasks/LI22-EVAPORATION-PREREG.md` `results/li22-k40/REPORT.md` `docs/reviews/LI22-REVIEW-2026-11-18.md` |
| LI23 losing members with an equal wave budget | waiting for the trace 15 of 16, all holding on fresh inputs; manager 0 of 16 (H-LI66 supported, 16 to 0) but a design result of the wave budget and truncated plans (13 to 2 for the manager at matched act rounds, exploratory); router 12 in the run, 4 on fresh inputs (H-LI67 inconclusive, 4 to 1); [US$ redacted] | `tasks/LI23-LOSS-TIME-PREREG.md` `results/li23-k80/REPORT.md` `docs/reviews/LI23-REVIEW-2026-11-18.md` |
| LI24 harder tasks with equal act rounds (control for LI19 and LI23) | waiting for the trace 16 of 16 and 16 of 16 on fresh inputs, manager 7 of 16 (H-LI71, H-LI72, H-LI73 supported: 9 to 0, 16 to 0, 14 to 2), but the control held only at 80 modules, where the primary is 5 to 0 (inconclusive); at 120 thinking-truncated plans and a hidden wave-13 limit starved the manager of act rounds; its remaining failures are symmetric collisions (LI26 tie-break confound); runner died once, resumed cleanly; [US$ redacted] | `tasks/LI24-ACT-ROUNDS-CONTROL-PREREG.md` `results/li24-k80/REPORT.md` `docs/reviews/LI24-REVIEW-2026-11-18.md` |
| LI26 160 modules | equal act rounds: waiting for the trace 8 of 8 (8 on fresh inputs), manager 4 (3) (H-LI74 inconclusive, 4 to 0; H-LI75 inconclusive, 5 to 0); the gap is the harness one-side tie-break on symmetric checks, not traces; tokens about 1.2 times per case; follow-up LI27; [US$ redacted] | `tasks/LI26-SCALE-160-PREREG.md` `results/li26-k160/REPORT.md` `docs/reviews/LI26-REVIEW-2026-11-18.md` |
| LI27 the trace or the tie-break? waiting for the trace without the one-side tie-break, 80 and 160 modules | incomplete: 80 modules stopped at the study cap at wave 6 (cap checked on reserve), so H-LI76 to H-LI78 are aborted; post hoc at 160 modules, without the tie-break waiting solved 0 of 12 (both sides swap formats every wave; 0 to 12 against the manager), with it 12 of 12 against the manager's 11, at fewer tokens (10 to 2); the trace's value on top of a tie-break is open; [US$ redacted] | `tasks/LI27-TRACE-OR-TIEBREAK-PREREG.md` `results/li27-k160/REPORT.md` `docs/reviews/LI27-REVIEW-2026-11-19.md` |
| LI28 other mechanisms from nature (thresholds, inhibition) against a group chat on harder tasks | aborted at its study cap before wave 2 (cap checked on reserve); no verdicts, wave 0 and 1 data not analysed; hypotheses moved to LI28R; [US$ redacted] | `tasks/LI28-NATURE-BREADTH-HARD-PREREG.md` `results/li28-k80-aborted/` |
| LI28R rerun of LI28 on fresh seeds with the cap checked on expected spend | waiting for the trace 12 of 12 (11 on fresh inputs), chat, thresholds, inhibition and sync 0 of 12 (H-LI79 to H-LI83 supported, all 12 to 0); thresholds and inhibition only end with fewer failing checks than chat; chat and sync swap formats, inhibition hands directed checks to the caller half the time, thresholds are a coin flip; stigwait's edge is the tie-break plus the trace on directed checks (no polarity arm); one false cap stop, resumed cleanly; [US$ redacted] | `tasks/LI28R-NATURE-BREADTH-RERUN-PREREG.md` `results/li28r-k80/REPORT.md` `docs/reviews/LI28R-REVIEW-2026-11-19.md` |
| LI30 the trace or the tie-break, against a manager that plans at low effort and gets its act rounds | waiting for the trace 12 of 12 (12 on fresh inputs), without the tie-break 0 of 12, manager 4 of 12 (H-LI87 refuted, 0 to 12; H-LI88 supported, 12 to 0; H-LI89 supported, 8 to 0); without a tie-break both sides swap formats every wave, and the manager's leftover failures are the same swap; its 4 of 12 is mostly task density, low effort made plans worse, `managerSlack` unused; [US$ redacted] | `tasks/LI30-TIEBREAK-FAIR-MANAGER-PREREG.md` `results/li30-k80/REPORT.md` `docs/reviews/LI30-REVIEW-2026-11-19.md` |
| LI32 emergent symmetry breaking in the Colony, replicated with a function-level measure (12 cases; first study of the automatic bench) | registered | `tasks/LI32-COLONY-CLAIM-REPLICATION-PREREG.md` |
| LI33 does the trace add anything beyond the tie-break? (`polarity` control, 80 and 160 modules) | registered (sweep 6) | `tasks/LI33-TRACE-BEYOND-TIEBREAK-PREREG.md` |
| LI34 waiting for the trace against a manager that gets its plans and act rounds (LI24 rerun with fixes) | registered (sweep 6) | `tasks/LI34-MANAGER-FAIR-RERUN-PREREG.md` |
| LI35 the LI16 comparison with Sonnet, with a cap that lets it finish | registered (sweep 6) | `tasks/LI35-SONNET-RERUN-PREREG.md` |
| LI31 emergent symmetry breaking inside the Colony: ants announce who adapts in a format pair, with no arbiter (gpt-6-luna, fleet) | all three arms 8 of 8 solved; on fresh inputs claim 8, nopeer 7, market 4 of 8; simultaneous changes 142 against 194 (H-LI90 inconclusive, 6 to 2); H-LI91 (1 to 0), H-LI92 (5 to 3), H-LI93 (4 to 0, p = 0.125) inconclusive; reviews: the metric mostly counted first implementations (without them claim lower in 7 of 8, p = 0.07, exploratory), announcements in 5 of 8 claim teams, the parent named the side to fix in both field arms; market s31401 rerun after a provider error; claim about 2x market tokens, mostly cached; ChatGPT subscription, outside the ledger | `tasks/LI31-COLONY-CLAIM-PREREG.md` `results/li31-colony-claim-k40/REPORT.md` `docs/reviews/LI31-REVIEW-2026-11-19.md` `docs/reviews/LI31-REVIEW-LUNA-2026-11-19.md` |
| LI29 the waiting field inside the Colony at 80 modules (gpt-6-luna, fleet) | field 8 solved and 7 of 8 on fresh inputs, market 7 and 7 (H-LI84 inconclusive, 1 to 1); both hold-out losses from weak test inputs; the 200-message cap bound in 6 of 16 runs and caused the only failed run (a market stall the detector missed); the field was slower (H-LI85 refuted, 2 to 6) and cost about 1.5x (H-LI86 refuted, 1 to 7, not significant); ChatGPT subscription, outside the ledger | `tasks/LI29-COLONY-K80-PREREG.md` `results/li29-colony-k80/REPORT.md` `docs/reviews/LI29-REVIEW-2026-11-19.md` |
| LI synthesis | what holds across LI1 to LI6: the geometry of the coupling decides the protocol (arbiter for symmetric conflicts, conversation for directed ones); a windowed repairer beats a whole-problem agent past its capacity; no swarm arm finishes; one agent wins where the task fits | `results/li-synthesis/REPORT.md` |
| LI review and classical reference | independent methodology and positioning review of LI1 to LI3 (analysis script corrected, reports amended); greedy non-LLM members and central min-conflicts on the same cases: simultaneous repair does not converge in 100 rounds, min-conflicts solves 35 of 36 | `docs/reviews/LI-REVIEW-2026-11-17.md` `results/li-classical-reference/REPORT.md` |

## Done on 2026-11-12 and 2026-11-13 (harness division and benchmarks)

| Batch | Result | Report |
|---|---|---|
| HS0 harness pilot, three arms on one OpenBot agent | machinery check, no hypothesis tested: the lab switched provider, set the Unfold marker, opened a chat, sent the task and waited, with no person in the loop | `tasks/HARNESS-PILOT-PREREG.md` `results/harness-pilot-2026-11-12/REPORT.md` |
| HS1 rules in the loop for a pair of OpenBot agents | 27 of 27 accepted; the Unfold rules cut messages by 38% but not cost (H-H01 refuted in this study, H-H02 holds qualitatively) | `tasks/HARNESS-STUDY-PREREG.md` `results/harness-study-2026-11/REPORT.md` |
| HS2 trios on coupled tasks with a message ceiling | H-H01 inconclusive (U at 96% of P's cost); the rules held messages at 4 per task where P ran 4 to 12; Codex accepted 9 of 10, both Pi arms 7 of 10 | `tasks/HARNESS-STUDY-2-PREREG.md` `results/harness-study-2-2026-11/REPORT.md` |
| HS3 an acceptance gate before "done" | the gate fired 10 of 10 but accepted 8 of 10, like U, at 131% of its cost; every false success was one hidden test that the team's own tests shared the error with (H-H04 refuted) | `tasks/HARNESS-STUDY-3-PREREG.md` `results/harness-study-3-2026-11/REPORT.md` |
| HS4 an independent verifier behind the gate | Tests H-H05: a verifier that did not write the code checks it before "done"; run by the harness session | `tasks/HARNESS-STUDY-4-PREREG.md` `results/harness-study-4-2026-11/REPORT.md` |
| CB1 CooperBench pilot | the harness runs after one fix; one agent passes 5 of 5, two cooperating agents 2 of 5; [US$ redacted] | `results/cb1-cooperbench/REPORT.md` |
| CB2 a shared field against messaging on CooperBench | 50 pairs, four arms: solo 29, no communication 8, messaging 10, shared remote 19; the shared remote recovers about half of the loss against one agent; [US$ redacted] | `results/cb2-cooperbench/REPORT.md` |

## Proposed next

Direction changed on 2026-11-12 (owner): the toy-task rounds stop; next work is on real benchmarks where the conditions that favour a collective hold. Survey and shortlist: `research/benchmarks/README.md`. CooperBench pilot returned (`results/cb1-cooperbench/REPORT.md`): solo 5 of 5, coop 2 of 5, [US$ redacted] CB2 returned 2026-11-12 (`results/cb2-cooperbench/REPORT.md`, 50 pairs, four arms, [US$ redacted]): solo 29, no communication 8, messaging 10, shared remote 19; all four registered tests supported; the shared remote recovers about half of the loss against one agent and messaging almost none. Order: shared token and wall-clock harness (free); CooperBench pilot of five pairs (needs approval, interactive calls); a Silo-Bench-style study with faults, change and biological mechanisms as arms.

| Batch | Why |
|---|---|
| consolidation | one table of all results of 2026-11-11 with scope and sample; restate E7 and E8 of the P1 ledger; rerun at larger samples the two or three results the paper leans on |
| T2 the trigger as recruitment | how many agents a task gets: fixed, central or threshold, scored on a map of Silo-Bench with one agent as an arm; folds in A1. Design: `tasks/T2-TRIGGER-DESIGN.md`. Stage 0 written. Stage A returned 2026-11-12: one Haiku agent without thinking is right on 3, 2, 0 and 1 of 60 at 16, 64, 256 and 1,024 shards, and from 64 shards up it declares an estimate instead of working (`results/batch2-t2-gate/REPORT.md`). Second gate, 1 to 16 shards (`results/batch2-t2-gate-small/REPORT.md`): 0.79, 0.65, 0.46, 0.38, 0.27 over four tasks; Global Max never falls, Range Count falls cleanly, XOR Checksum fails at any size. Not at 0.9 on one shard, so the third gate ran the same instances with thinking (`results/batch2-t2-gate-think/REPORT.md`): 1.00, 0.92, 0.96, 0.83, 0.77; Global Max and Global Median are quiet, Range Count and XOR Checksum fall between 4 and 16 shards. **The gate is open.** The map ran (`results/batch2-t2-map/REPORT.md`, 3,888 calls, [US$ redacted]): splitting the task among 2, 4 or 8 agents never beat one agent and cost 1.2 to 13 times more; the registered prediction that four agents help at 16 shards is refuted (−0.23). No fire cell, so a trigger over partition has nothing to win. Found after the run: two independent attempts of one agent agree on 113 of 144 instances and are right on 112 of those; they disagree on 30 of 72 instances of the falling tasks and 1 of 72 of the controls. The redundancy study ran (`results/batch2-t2r/REPORT.md`, [US$ redacted]): repeating until two attempts agree is right on 277 of 288 with 2.24 attempts, against 251 for one attempt, 267 for three, 271 for five and 255 for a judge of the first reply; all five registered predictions hold. The first two attempts agree on 240 instances and are right on 239. Next candidates: the same on a task with free-form answers; a stricter rule after a disagreement; varied wording between attempts. Ledger note: the first gate is under-priced by about [US$ redacted] (requests above 100,000 input tokens) |
| H1, H5 card against board; fact against instruction | the read model of the field, with operator attribution fixed after C1b |

## Not started

| Batch | Programme | Why not yet |
|---|---|---|
| B3 | Void | H-V01 and H-V02 on Observatory coding tasks need multi-turn agents with test execution, not a single batch; [US$ redacted] on Haiku and Sonnet. Needs its own approval. |

## Free, next

| Batch | Scope |
|---|---|
| S3 | Simulations for H-21 (acceptance-coupled launch), H-22 (fixed neighbourhood), H-27 (cross-inhibition by counterexample) |
| T1 | Audit existing Observatory traces for children per job and cancelled fraction (feeds H-24 and H-V05) |
| L1 | Human screening sample of the literature catalogue |
| L2 | Read the closest related work on LLM agents and stigmergy before any paper (`tasks/L2-RELATED-WORK-TO-READ.md`) |

## Hermes connector acceptance

| Batch | Scope | Cost | Result |
|---|---|---|---|
| BSH1 | Brazilian freight handoff with Hermes and Luna, registered in `tasks/BSH1-HERMES-PREREG.md` | [US$ redacted] cap | Stopped on upstream HTTP 500 after two replies. `results/bsh1/REPORT.md` |
| BSH1-R1 | Fresh Hermes/Luna pair under the recovery amendment in `tasks/BSH1-HERMES-PREREG.md` | [US$ redacted] | Both invoices correct after one manager HTTP retry. `results/bsh1-r1/REPORT.md` |
| BSH2 | Recife planning under a capacity shock. `tasks/BSH2-RECIFE-PREREG.md` | [US$ redacted] including incidents | Manager optimal in both phases; stigwait optimal only after the shock. `results/bsh2-r2/REPORT.md` |
| BSH3 | Return missing capacities to the warehouse vs current stigwait and a manager on four new cases. `tasks/BSH3-WAREHOUSE-PREREG.md` | [US$ redacted] | Four exact warehouse repairs, zero feasible plans across twelve case/strategy pairs. `results/bsh3/REPORT.md` |
| BSH4 | Isolated warehouse loss on three new instances with verified commercial volume delivery. `tasks/BSH4-ISOLATED-PREREG.md` | [US$ redacted] | Feasible plans: return 3/3, current Unfold 0/3, manager 1/3. `results/bsh4/REPORT.md` |
| BSH5 | Conditional warehouse returns in 24 new matched instances, two capacity conditions. `tasks/BSH5-SCALE-PREREG.md` | [US$ redacted] | Completed, 144 strategy outcomes. `results/bsh5/REPORT.md` |
| BSH6 | Same warehouse access on Hermes. `tasks/BSH6-EQUAL-ACCESS-PREREG.md` | [US$ redacted] | Completed. `results/bsh6/REPORT.md` |
| BSH7 | Direct JSON versus stigwait. `tasks/BSH7-STIGWAIT-PREREG.md` | [US$ redacted] | Completed. `results/bsh7/REPORT.md` |
| BSH8 | Blinded discovery cue comparison. `tasks/BSH8-DISCOVERY-PREREG.md` | [US$ redacted] | Completed. `results/bsh8/REPORT.md` |
