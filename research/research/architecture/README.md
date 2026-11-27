# Architecture for cooperation between agents in a swarm

Opened 2026-11-11 at the owner's request: memory, skills, storage and communication channels were designed for one assistant or for a fixed pipeline; what would they be if designed for a swarm, even from scratch?

Six design studies, each written by a research sub-agent with the lab's results as constraints. They are **design studies, not evidence**: sources were mostly read through a summarising fetch, not from PDFs; every token cost in them is an estimate; every proposal is untested. Each file says what was read and marks what was not verified. They were not reviewed line by line before being committed.

| File | Layer | Its main recommendation |
|---|---|---|
| `01-field-shared-memory.md` | the field | an append-only trace table and a small card per cell computed by the harness; an artefact-version column from the start; time decay off by default |
| `02-channels-protocols.md` | channels | make the field the channel: typed traces addressed to a place, no imperative type, no free text in the default view, at most one trigger per turn |
| `03-storage-substrate.md` | storage | the harness already is a small log-plus-fold store; extract five operators (`deposit`, `sense`, `claim`, `reserve`, `settle`) and a read log; no server yet |
| `04-skills-instincts.md` | skills | a registry with an admission pipeline (collision check, regression gate in the weakest executor, admission per model tier, expiry); peer exchange only as a transport into it |
| `05-allocation-budget-verification.md` | allocation | a ladder per unit of work (one deep small-model agent, a verifier that reads the sources, escalation of rejects) inside a board of claims and leases; coordination in code |
| `06-runtimes-observability-operator.md` | runtimes, observability, operator | do not build a general runtime; build a field log, a control-arm generator and a perturbation kit on the conventions of `observatory/batch2/run2.mjs` |

## Where the six agree

They were written independently and converge on one shape.

1. **One substrate, not four.** Memory, channel, store and work queue are the same object seen from four sides: an append-only log of typed traces with author, time, place and provenance, and views folded from it by code. An agent never reads the log. It reads a small card about a place.
2. **The substrate computes; the model reasons.** Aggregates, alarms, staleness, claims, quotas, expiry and admission are computed by code. Every token an agent reads about coordination is taken from the task, and in our runs working space per agent was the largest gain.
3. **The card states facts, not instructions.** In our runs any rule placed in an agent's context displaced behaviour it had unprompted. So the field shows "readings disagree here", never "re-count this".
4. **Addressing by place.** A trace is left on a part of the artefact, not sent to an agent. This is what keeps cost flat as the number of agents grows, and it removes the peer-to-peer text channel that our runs found hard to control.
5. **Disagreement is data.** Existing stores are built to make conflicts disappear; for a swarm the conflict is the signal (it is what the R2 alarm used). Keep losing values and surface them.
6. **What a reader is shown is an experimental variable.** The R2 flaw came from a regularity in the view given to the orchestrator. Views get a name and a hash, and a free code probe checks before a paid run that the answer cannot be read off the view.
7. **Schedules first.** Where the parts are known and the budget covers them, a fixed schedule in code is the control to beat, and the strongest existing competitor is a script that fans out agents, not a chat framework.

## Where they differ, or leave open

- Whether a model should ever choose its next place of work (studies 01 and 05 allow it only as an experimental arm).
- Decay: 01 turns it off by default and binds traces to artefact versions; 03 predicts decay matters once the field changes more than once.
- How much of the skill system belongs in the harness: 04's third design evaluates triggers in code and injects a card only when it fires, which might avoid the displacement effect altogether. Untested.

## What to do first, in order

Free, no model call:
1. The read log and the leak probe (03 §S5, 06 §B.6), applied to R2b before anything else is frozen.
2. The field log with R1 and R2 reproduced from it (06, "What to build first" 1).
3. The control-arm generator: a study does not freeze without a deep-agent arm and a fixed-schedule arm at the same reserved budget (06, 2).

Paid, on the batch instrument, the tests that decide between designs:
4. **C1** (02): peer content as a typed table against a free-text note of equal length. If the table also suppresses unprompted behaviour, structure does not solve the control problem and the lever left is to show less.
5. **S3** (04): a card always in context against a card injected only when its trigger holds.
6. **H1 and H5** (01): a cell's card against the whole board; a card that states a fact against one that gives an instruction.
7. **A1** (05): what should trigger escalation to the larger model: a verifier, a size rule in code, disagreement between two samples, or chance at the same share.
8. **H7** (01) and **H-O3, H-O4** (06): the boundaries of the R2 result: scattered edits, false alarms, and the failure of the coordinator.

None of these is preregistered yet. The numbering is each study's own.

## First results (2026-11-11)

- Free steps 1 to 3 are in `observatory/batch2/kernel/`: the leak probe flags R2 and clears R2b; the field log reproduces the 13 accuracy tables of R1, R2 and R2b; the control check exists but does not generate control arms.
- **C1** (`results/batch2-c1-typed/REPORT.md`): on Sonnet, typed traces did not suppress unprompted behaviour where a note did. But on both models the traces raised it, more with nine traces than with three. Point 3 above ("the card states facts, not instructions") therefore needs a caveat: facts shown in a typed field move decisions too. The field is a control surface whatever its form.
- **S3** (`results/batch2-s3-trigger/REPORT.md`): a card injected only where its trigger holds leaves other cases untouched and keeps its effect; on the cases where it fires it still removes unprompted behaviour.
- **C1b** (`results/batch2-c1b-label/REPORT.md`): attribution is the lever. The same facts leave behaviour unchanged when presented as a status board kept by the operator, and raise unprompted quarantine when attributed to a peer or to nobody. Who is said to have written the card is part of the interface.
- **D4** (`results/batch2-d4-choice/REPORT.md`): on the open question of whether a model should choose its next place of work: workers shown local marks followed the signal in 90% of choices and almost never explored; they did worse than the harness rule (0.58 against 0.70). The response to a trace can live in the agent; search belongs in the substrate.
- **R3** (`results/batch2-r3-bounds/REPORT.md`): the boundaries. Without locality, or with one false count on the board, a trace-following rule falls below the fixed schedule, and so does a model orchestrator given the same prior. Re-reading an alarmed part before acting on it repairs the false-count case. Trace verification belongs in the substrate from the start.
- **D4b** (`results/batch2-d4b-choice/REPORT.md`): agents explore when told why it matters (61% of choices leave the neighbourhood, against almost none), not when shown more or offered a place. The gain in accuracy is inside the noise.
