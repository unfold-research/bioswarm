# L2: closest related work on LLM agents and stigmergy (read 2026-11-11)

Status: first reading done. The owner passed on a note from another conversation with six sources. What was read: the full HTML of the first; the alphaXiv pages of the second and third; the arXiv abstracts of the last two. SwarmAgentic (a blog post, a different topic) was not read. Summaries below are from those pages through a fetch-and-summarise tool, not from the PDFs; numbers should be checked against the papers before being cited.

Still open from the note: no paper titled "Bio-Inspired Agentic Swarms" was found in a quick web search; repeat on Google Scholar.

## In the catalogue?
Pressure Fields (2601.08129), SwarmWorld (2608.26081), Emergent Culture (2606.30668) and SwarmAgentic are already in `library/catalog.csv`. MusicSwarm (2509.11973) and Towards a Science of Collective AI (2602.05289) are not; add them in the next library pass.

## What each one did

| Source | Mechanism | Task and models | Baselines | Matched cost? | Result as reported |
|---|---|---|---|---|---|
| Rodriguez, *Emergent Coordination via Pressure Fields and Temporal Decay*, arXiv 2601.08129v2 | agents patch high-pressure regions of a shared artefact; no messages or roles; fitness decays; patched regions are inhibited | meeting-room scheduling at three sizes; qwen2.5 0.5b to 3b; 1, 2 and 4 agents; 1,350 trials | conversation (coordinator, proposer, validator), hierarchical (one agent, one patch per tick), sequential, random | **No.** Tokens were recorded for the pressure-field arm only; arms differ in parallelism by design | solved 48.5% against 12.6% (conversation) and 1.5% (hierarchical). Without decay 86.7% against 96.7% on easy problems, 30 trials each, intervals overlap |
| Pal, Wang, Buehler, *SwarmWorld*, arXiv 2608.26081 | stigmergy through persistent artefacts in a simulated world; with and without explicit cultural channels | open-ended technology building; one unnamed model; 100 agents; four seeds | isolated one-agent worlds, best of 100 | matched on decision opportunities, not tokens | shared worlds give broader, more resilient portfolios (0.25 against 0.18); **the best single artefact came from isolated search** (0.35 against 0.24). Removing explicit culture gave more validated inventions (7.0 against 5.75) |
| Jones, Hauert, *Emergent Culture in Minimal LLM Systems*, arXiv 2606.30668 | three stateless agents, a shared key-value store whose entries corrupt with age | no task ("explore and play"); Claude Sonnet 4.5, Kimi K2, Gemini 3 Flash; ten runs of 100 cycles | human texts | no | text statistics show persistent structure beyond the decay horizon; decay is not isolated as the cause (the authors say so) |
| Buehler, *MusicSwarm*, arXiv 2509.11973 (abstract only) | bar-wise agents deposit and sense cues | long-form composition; frozen models, unnamed | a centralised system with a global critic | not stated | swarm reported better on quality and diversity |
| Fan et al., *Towards a Science of Collective AI*, arXiv 2602.05289 (abstract only) | position paper | — | — | — | argues that gains from collaboration are not separated from gains from more resources, and proposes a collaboration-gain metric for that |

## How this sits against our results

1. **None of the three empirical papers compares against one agent at the same cost.** Pressure Fields has no single agent with the whole budget and no token accounting across arms; its "hierarchical" baseline is one agent limited to one patch per tick. SwarmWorld's control is best-of-100 isolated agents matched on decisions. The Collective AI paper names exactly this gap. Our library audit found the same: 16 of 200 full-text cards compare at matched compute.
2. **Our own runs say that control is the one that matters.** On two synthetic tasks, a collective of agents without working space added nothing; working space for one agent was the largest gain; on top of it a verifier added a little and a vote did not generalise (V1b to V6, M4 to M8). A paper that claims a swarm advantage without a deep single agent at matched tokens would be open to the objection we have just measured.
3. **SwarmWorld's own result points the same way**: the collective wins on breadth and resilience, the isolated agent on the best single result. That is a claim about portfolios, not about solving a task better.
4. **Decay is weakly supported everywhere.** Ten points on thirty trials with overlapping intervals (Pressure Fields); not isolated (Emergent Culture). Our H-07 and H-25 have support in simulation only. An honest decay ablation with enough trials would be new.
5. **Small models.** Pressure Fields used 0.5b to 3b models. Whether the advantage survives a model that can reason in one call is untested; our V5 and V6 suggest it is the first thing to check.

## What the note proposed, and what follows from the reading

The note's gap (several regimes against each other and against a router; the human as a perturbation of the field) is real: no source compares regimes on one task at matched cost. The reading adds one condition: the comparison needs a third arm, one agent with the whole budget, or it repeats the weakness of the existing papers.

Proposed experiment, not yet designed in detail or preregistered:
- one task with a shared artefact that is too large for one context but has a checkable answer;
- three regimes at the same total tokens: one deep agent (sequential over the artefact), a router that assigns parts to workers, and a stigmergic regime where workers choose parts from traces left on the artefact, with and without decay;
- endpoints: accuracy, tokens, coverage and redundancy, and behaviour when a part is perturbed mid-run (the human-as-perturbation idea).

It does not fit the current runner as it stands: the request size ceiling is 20,000 bytes and a stigmergic regime needs several rounds, each a batch wave. It needs its own runner settings and its own preregistration.
