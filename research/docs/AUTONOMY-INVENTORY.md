# Autonomy programme: what the lab already has (inventory, 2026-11-22)

Data already paid for, or free, that bears on the three fronts of `programs/autonomy.md` (scale, effort, persistence), and what recent literature says. Written by Autonomy Research. Every number below is copied from the report or economy file named next to it; the thinking shares were computed on benchhost from the `economy.json` files that `bench/economy.mjs` wrote (thinking tokens divided by output tokens, per arm). Nothing here is a new claim: cross-study comparisons are confounded and marked exploratory.

## 1. Scale

**What "k" means in our data.** In the batch instrument (`observatory/batch2/rc/`) every module has one member, so a study at k modules has k members: team size and task size move together and cannot be separated. In the Colony studies the team is 4 ants whatever the size (LI39: "4 ants of 40 modules each"), so only the load per ant moves. No study has yet varied N at a fixed task.

| Source | What varied | Result | Bears on |
|---|---|---|---|
| LI7, LI8, LI10 (FINDINGS belief 6) | modules 5 to 80, one agent with every specification as an arm | one agent as good as any team up to 80 modules, while its reply fits its output limit | AU-S1 |
| T2 map (`results/batch2-t2-map/REPORT.md`, 3,888 calls, [US$ redacted]) | 1, 2, 4 or 8 agents splitting a Silo-Bench map | splitting never beat one agent and cost 1.2 to 13 times more; the registered "four agents help at 16 shards" refuted (−0.23) | AU-S1 |
| T2 gates (`results/batch2-t2-gate/REPORT.md`, `-gate-small`, `-gate-think`) | shards 1 to 1,024, thinking off and on | one Haiku without thinking: 0.79 to 0.27 from 1 to 16 shards; with thinking 1.00 to 0.77; from 64 shards up it declares an estimate instead of working | AU-S1, AU-E, AU-P (an early give-up on record) |
| T2R (`results/batch2-t2r/REPORT.md`, [US$ redacted]) | fixed 1, 3, 5 attempts against "repeat until two agree" | adaptive: 277 of 288 right with 2.24 attempts; fixed: 251, 267, 271; judge of the first reply 255 | AU-S3 |
| D6 (`results/batch2-d6-deep/REPORT.md`) | one deep agent against an orchestrator with two workers | 0.75 each under local change; one agent 0.35 under scattered change, below the schedule | AU-S1 |
| V4 (`results/batch2-v4-diverse/REPORT.md`) | copies against different wordings against a better member | wordings add nothing to copies; a better member does | AU-S4 |
| LI32, LI37, LI39 (Colony, 4 ants) | 40, 80, 160 modules (10, 20, 40 per ant) | default team (`market`) unsolved: 0 of 12 (LI32, 60-minute cap), 2 of 12, both at the cap (LI37, 90 minutes), 7 of 12 (LI39, 180 minutes, gpt-6-luna); field arms 0, 0 and 2 of 12. Exploratory: shape, cap, model and Colony commit differ between studies | AU-S2 |
| LI34, LI36, LI38 (batch, N = k) | 80, 120, 160 modules | both arms solve everything at 120 and 160 (LI36, LI38); cost per solved case `stigwait` against `manager`: [US$ redacted] against 0.57 (LI34), 0.13 against 0.29 (LI36), 0.17 against 0.45 (LI38) | scale of cost, not of quality |
| GN-S2 (`results/sims/screen-scale.md`, free) | M = 40 to 1,000 modules, N = M/4, context limit 8 | reading only neighbours (SIG-06) +0.218 over the manager at M = 400; team sizing per component (ACT-06) +0.043, under its bar, stopped | AU-S1, AU-S2 (owned by Genome) |

**Gap.** No cell with N varied at fixed size; no task family where one agent with everything clearly fails (the T2 gates come closest: one agent falls with shards, but splitting did not help either).

## 2. Effort

**Thinking share of output, default effort, Haiku 5.5, batch instrument** (`results/<study>/economy.json`):

| Study | Start wave | `stigwait` | `manager` arm | Other |
|---|---:|---:|---:|---|
| LI33 | 0.74 | 0.60 (28 solved) | 0.69 (20) | `polarity` 0.82 (0 solved, 87 truncated); `oracle` 0.67 |
| LI34 | 0.74 | 0.59 (23) | 0.69 (11) | |
| LI36 | 0.74 | 0.59 (12) | 0.70 (12) | |
| LI38 | 0.73 | 0.59 (12) | 0.70 (12) | |
| LI35 | 0.05 | 0.11 (12) | 0.22 (11) | not comparable: Sonnet 5.5 at low effort (every reply and request in the raw files); the economy file's top-level label says Haiku 5.5 by a default in `bench/economy.mjs`, but its costs are priced at Sonnet and the shares are real (AU-R2, `results/au-r2/REPORT.md`) |

- The share is stable across sizes (0.59 to 0.60 for `stigwait`, 0.69 to 0.70 for the manager arm), so thinking is a fixed fraction of output, not a size effect. The arm that failed everything (`polarity`) had the highest share.
- **LI24** (review): adaptive thinking was 92% of plan output at 120 modules, so plans hit the output limit and re-planned. **LI30** ran the manager's plans at low effort (`managerEffort: low`, members unchanged) to fix it; the manager solved 4 of 12, but the comparison is confounded by the tie-break (FINDINGS belief 12). These are the only two places effort was touched, and neither varied it as the factor.
- **V5** (`results/batch2-v5-budget/REPORT.md`): Haiku with working 0.83 to 0.87, Sonnet direct 0.70, Sonnet with working 1.00; working is about twenty times cheaper per correct answer than the larger model. **V4**: Sonnet answer-only at low effort (0.74) below Haiku with 60 words of working (0.79). **PD1**: Haiku without thinking does not use the examples.
- **Colony studies** record no thinking split (LI37 and LI39 economy: thinking 0, "thinking is not split out"). The Colony's effort is `medium` by default for agents (requirement R5 in `docs/AUTONOMY-HARNESS-REQUIREMENTS.md` asks for the split).
- **CY2** ran with thinking 0.
- **`Shared/unfold/effort-log.jsonl`** has 5 entries, all from 2026-11-15, about the lab's own team agents (model and effort per role at start, one switch of reviewer family). It records no outcomes against effort and answers nothing yet.
- The token audit of 2026-11-21 (FRENTES rule 6) put about 52% of `rc` spend on reasoning, about 19% on returned code, about 29% on input.

**Gap.** Effort has never been the varied factor of a study. The runner already takes `effort` per study and `managerEffort` for plans (`observatory/batch2/rc/code.mjs:161`, `run-rc3.mjs:77`), so an effort study needs no new instrument.

## 3. Persistence

| Source | What happened | Bears on |
|---|---|---|
| LI15 (Colony, review) | the gap between arms was mostly default teams stalling after the ant message budget ran out; the parent asked the person and stopped | AU-P1 |
| LI29 (Colony) | the 200-message cap bound in 6 of 16 runs and caused the only failed run, a stall the detector missed | AU-P1 |
| LI37 (Colony) | both default-team failures ran to the 90-minute cap (121 and 154 failing checks) | AU-P1, AU-S2 |
| LI39 (Colony) | default team solved 5 of 12; 5 of `wait`'s 7 wins are seeds where `market` stalled and never reached an all-pass | AU-P1 |
| T2 gate | one agent at 64 shards and up "declares an estimate instead of working" | AU-P (a give-up on record, single agent) |
| LI24, LI27, LI28 | a hidden wave-13 limit starved the manager; LI27 and LI28 stopped at the study cap (instrument stops, not model stops) | stop reasons must be recorded |

**Gap.** No study measures recall of hidden items from a minimal statement, premature give-up or correct abstention. The Colony does not record why a run ended (requirement R3). AU-R1 classifies the ends of the runs we have.

## 4. Literature (checked 2026-11-22)

Every arXiv id below appeared in search results; † marks those whose abstract page was read. 2026 items without peer review are preprints. Numbers from search snippets are marked.

**Scale.**
- Li et al., "More Agents Is All You Need", TMLR 2024, arXiv:2402.05120: sampling and voting accuracy rises with ensemble size; the baseline any swarm must beat.
- Chen et al., "Are More LLM Calls All You Need?", NeurIPS 2024, arXiv:2403.02419v2: with voting, accuracy can rise then fall with more calls; more calls help easy queries and hurt hard ones.
- Qian et al., MacNet, ICLR 2025, arXiv:2406.07155v3: past 1,000 agents in a DAG, a logistic "collaborative scaling law" that saturates; irregular topologies beat regular ones.
- Kim et al., "Towards a Science of Scaling Agent Systems", arXiv:2512.08296 (v3, Apr 2026): 180 configurations; coordination gives diminishing or negative returns once the single-agent baseline is above about 45%; +81% on a parallel task, −70% on a sequential one; independent agents amplify errors 17.2 times, centralised 4.4 times. Figures differ between versions.
- Cemri et al., MAST, NeurIPS 2025, arXiv:2503.13657v3: 14 failure modes; gains over single agents often minimal.
- Choi et al., "Debate or Vote", NeurIPS 2025, arXiv:2508.17536v2: voting explains most gains credited to debate.
- † Tran and Kiela, arXiv:2604.02460v2 (preprint): at equal thinking-token budgets a single agent matches or beats multi-agent systems on multi-hop reasoning; teams compete only when one context degrades.
- † Bertalanič and Fortuna, "The Ringelmann Effect in Multi-Agent LLM Systems", arXiv:2606.02646v1 (preprint): effective team size saturates; a pilot with 5 or fewer agents predicts the ceiling at 30; only heterogeneous models escape it.
- Anthropic engineering blog on its multi-agent research system (2025, not a paper): token usage explained about 80% of BrowseComp variance (from secondary sources, not read directly).

**Effort.**
- Snell et al., ICLR 2025, arXiv:2408.03314: test-time compute chosen per prompt is more than 4 times as efficient as best-of-N; helps where the small model already has some success.
- Muennighoff et al., s1, arXiv:2501.19393v3: budget forcing; forcing longer thinking lifts AIME24 from 50% to 57%.
- Chen et al., overthinking, ICML 2025, arXiv:2412.21187v2; Wang et al., underthinking, NeurIPS 2025, arXiv:2501.18585v2: wrong answers use 225% more tokens with many more thought switches.
- Gema et al., "Inverse Scaling in Test-Time Compute", arXiv:2507.14417v2: longer reasoning lowers accuracy on some tasks.
- Cuadron et al., arXiv:2502.08235v1: on SWE-bench Verified, more overthinking goes with lower resolution; patterns include premature disengagement; the better of two low-effort runs about matches high effort at 43% lower cost.
- † Yang et al., Ares, arXiv:2603.07915v1 (preprint): effort chosen per step cuts reasoning tokens by up to 52.7% against fixed high effort with minimal loss (snippet).
- † Sun et al., "What Effort Level Should I Choose?", arXiv:2610.34491v1 (preprint, Oct 2026): higher effort often fails tasks lower effort solved; starting low and escalating after a verified failure matches or beats fixed top effort on every model and benchmark tested (one run per task and level). Direct prior for AU-E3.
- No head-to-head study of separate effort per role was found; the closest (a planner-executor hand-off under a shared budget, NeurIPS 2026) has no confirmed arXiv id.

**Persistence.**
- Kwa et al., METR time horizon, arXiv:2503.14499v3: the 50% time horizon doubles about every 7 months.
- Wei et al., BrowseComp, arXiv:2504.12516v1: accuracy scales smoothly with test-time compute, so persistence buys recall.
- Du et al., DeepResearch Bench, arXiv:2506.11763v1; WideSearch, arXiv:2508.07999v2: on collect-every-fact tasks the best system succeeds about 5% of the time; exhaustive coverage is the bottleneck.
- † Yen et al., "Lost in the Maze", arXiv:2510.18939v2: long-horizon search agents fail on context limits, tool budgets and stopping early.
- arXiv:2602.03304v1 (preprint, authors not recorded): defines under-search; gains from more search rounds shrink after about 3.
- Krishnamurthy et al., NeurIPS 2024, arXiv:2403.15371v3: LLMs do not explore robustly in bandits without help.
- † Toh et al., ScrambleToolBench, arXiv:2608.02358v1 (preprint): more reasoning mostly amplifies brute-force search instead of working out what changed.
- Agentic abstention benchmarks, arXiv:2606.28733 and arXiv:2607.10059 (preprints): most agents under 50% abstention recall; abstaining well is separate from solving well, so over- and under-abstention must be measured as a pair (the reason `programs/autonomy.md` pairs premature give-up with correct abstention).
- Zhang et al., Darwin Gödel Machine, arXiv:2505.22954v3: an archive of everything found sustains open-ended exploration.

**What the literature and our data agree on, as expectations to test:** one agent is hard to beat while the work fits it (our LI7 to LI10 and T2 map; Kim et al.; Tran and Kiela); adaptive redundancy beats fixed headcount (our T2R; Chen et al.); thinking share is not a quality lever by itself and rises in failures (our LI33 `polarity`; overthinking literature); start-low-escalate is the cheapest effort policy where a check exists (Sun et al.; our strict check makes it testable); and stopping is better decided outside the agent, with abstention measured beside persistence.
