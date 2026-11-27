# Autonomy: how many agents, how much effort, how long to keep going

How many agents should a task get, how much reasoning effort should each role spend, and how long should a swarm keep working before it says it is done, it cannot, or it does not know? Active programme since 2026-11-22 (series AU), created by the owner: "pesquisar, testar e validar as frentes de scaling, effort etc pra agentes de IA. Ir puxando as boundaries de quando se escala mais agentes e qual melhor effort pra cada tarefa [...]. Também deverá cobrir como mantemos enxames ativos até que tudo sobre uma tarefa seja surfaced a partir de um mínimo de informação (é a máxima da tese da unfold). Se o usuário pede algo, pro enxame dizer que não consegue, não sabe etc, todas as opções óbvias e não óbvias devem ser consideradas e o harness não pode ser restrict pra isso." [research, test and validate scaling, effort and related fronts for AI agents; push the boundaries of when to scale to more agents and which effort is best for each task (...). It must also cover how we keep swarms active until everything about a task has been surfaced from a minimum of information (the maxim of the Unfold thesis). If the user asks for something, before the swarm says it cannot or does not know, every obvious and non-obvious option must have been considered, and the harness must not restrict that.]

## Boundary with the other programmes

- **Coordination (LI series)** studies *how* agents coordinate (manager, chat, stigmergy, waiting for the trace, markets). This programme studies *how many*, *how much* and *for how long*: team size, effort and budget per role, and the stopping rule. Where LI studies already varied size (LI32, LI37, LI38 and LI39, 40 to 160 modules), this programme reuses their data and agrees any new arm with Coordination Research instead of repeating a study.
- **Genome (GN series)** owns the 39 biological traits. Two touch this programme: SIG-06 (neighbours, which grows with scale) and ACT-06 (team size). GN-S2 (`results/sims/screen-scale.md`) screened both; any AU work on team size is agreed with Genome Research first.
- **Colony** changes go as written requirements (`docs/AUTONOMY-HARNESS-REQUIREMENTS.md`) to the Unfold Bancada, which takes them to the App Engineer. This programme does not change the Colony or the instrument that measures it.

What the lab already has on these questions, paid for and free: `docs/AUTONOMY-INVENTORY.md`.

## Three fronts and their first hypotheses

Ids below (AU-S*, AU-E*, AU-P*) are working names. A hypothesis gets an `H-AU*` page only when a preregistration registers it.

### 1. Scale: when more agents help, stop helping, or hurt

The lab's data so far never separates team size from task size: in the batch instrument (`rc`) there is one member per module, so N = k; in the Colony the team is fixed at 4 ants and only the modules per ant grow. The first job is to pull these apart.

- **AU-S1 (capacity threshold).** Adding agents to a task raises quality only once the work per agent exceeds what one agent holds (its context or its output limit). While one agent with everything solves at least 80% of cases, a team of 2 to 8 does not beat it at matched cost. *Falsified by* a team beating the one agent on cases where the one agent's reply is not truncated and its prompt fits. Prior: up to 80 modules one agent with every specification matched every team (FINDINGS belief 6); splitting a Silo-Bench map among 2, 4 or 8 agents never beat one agent (T2 map).
- **AU-S2 (load per agent).** At a fixed team (the Colony's 4 ants), the share of runs that end unsolved rises with modules per ant. *Falsified by* a flat or falling unsolved share from 10 to 40 modules per ant with the same arm and limits. Prior, cross-study and confounded: the default team left 0 of 12 unsolved at 40 modules (LI32), 2 of 12 at 80 (LI37), 7 of 12 at 160 (LI39).
- **AU-S3 (adaptive size beats fixed size).** For tasks with a checkable answer, adding members until two independent attempts agree beats any fixed number of members at equal or lower cost. *Falsified by* a fixed N that is better at no higher cost on the same instances. Prior: T2R, 277 of 288 right with 2.24 attempts, against 251 for one, 267 for three and 271 for five.
- **AU-S4 (diversity over headcount).** Past a small team, a different member (another model, or the same model at another effort) raises quality more than another copy. *Falsified by* copies matching mixed teams at equal N and cost. Prior: V4 ("different wordings add nothing to copies; a better member does").

### 2. Effort: how much reasoning each role and task needs

At default effort, thinking is 59% to 74% of all output tokens in the batch instrument (LI33 to LI38), and the lab's token audit of 2026-11-21 put about 52% of `rc` spend on reasoning. Effort is the largest controllable cost and has never been the varied factor in a study.

- **AU-E1 (members can think less).** In the batch instrument, members (who edit one module against visible checks) at low or medium effort solve as many cases and pass as many fresh inputs as at default effort, with at least 30% fewer output tokens. Planners (a manager who plans for the whole codebase) lose quality at low effort once plans are large. *Falsified by* low-effort members solving fewer cases, or failing more fresh inputs, at equal act rounds.
- **AU-E2 (thinking flags trouble).** Within a study, replies and arms that fail spend a larger share of their output on thinking than those that succeed (overthinking as a symptom, not a remedy). *Falsified by* equal or lower thinking share in failing replies. Prior: LI33's `polarity` arm solved 0 of 28 with a thinking share of 0.82 and 87 truncated replies, against 0.60 for `stigwait` (28 of 28); LI24 found 92% of plan output was thinking at 120 modules, which truncated plans.
- **AU-E3 (start low, escalate on a failed check).** When a strict check exists, running each member at low effort and raising effort only for members whose check still fails matches default-effort quality at lower cost per solved case. *Falsified by* lower solved share, or no saving in cost per solved case.

### 3. Persistence: keep the swarm going until everything is surfaced

The maxim of the thesis: from a minimal statement, the swarm keeps working until everything relevant about the task has surfaced, and it says "I cannot" or "I do not know" only after the obvious and non-obvious options are exhausted. Today the Colony has several soft stops that can end a run before that (`docs/AUTONOMY-HARNESS-REQUIREMENTS.md`), and LI15, LI29 and LI39 all lost runs to stalls.

- **AU-P1 (most early stops are the harness's).** In the Colony studies already run (LI15 to LI39), most runs that ended unsolved ended on a harness rule (message budget, goal turns or minutes, the idle detector after a question to the person, the cap) and not after the model had run out of moves. *Falsified by* a majority of unsolved runs whose last turns still show untried, named options absent any limit message. Free, from existing exports.
- **AU-P2 (lifting soft stops buys recall without false claims).** On a surfacing task, removing the soft stops (keeping only a hard spend or time cap and a real "exhausted" check) raises recall of hidden facts and options by at least 0.15 at most 2 times the cost, without raising unsupported claims by more than 0.05. *Falsified by* no recall gain, or the gain coming with that many more false claims.
- **AU-P3 (an alternatives gate before "can't").** Requiring the swarm to list the options it tried, and to try untried ones, before a "cannot" or "do not know" is accepted lowers premature give-up on solvable tasks without lowering correct abstention on truly impossible controls. *Falsified by* no drop in premature give-up, or a drop in correct abstention of more than 0.1.
- **AU-P4 (the stop leaves residue).** When a swarm says it is done, a fresh swarm given its output and the same minimal statement still surfaces hidden items it missed. Residual recall greater than zero measures what the stopping rule leaves on the table; its trend over harness versions is the programme's headline persistence number. *Falsified by* residual recall indistinguishable from zero at the current harness, in which case the stopping rule is already good enough on that task family.

## What is measured in persistence

A **surfacing task** is a minimal statement (one to three sentences) with a hidden key the swarm never sees: the facts, constraints and options a complete answer contains. Keys come from tasks whose full answer is known: the hidden checks and fresh inputs of the synthetic code tasks (13 of 16 test inputs per check are hidden today), the hidden structure of the PD1 policy-discovery tasks, list-everything research questions with a closed list, and "can this be done?" questions that are solvable only by a non-obvious route, mixed with truly impossible controls. Each key item is tagged **obvious** or **non-obvious** by a pilot: obvious if at least half of independent single-agent runs find it.

| Measure | Definition |
|---|---|
| Recall | share of key items surfaced (with evidence), overall and for non-obvious items alone |
| Precision / false claims | share of surfaced items not supported by the key or by checkable evidence |
| Premature give-up | share of solvable tasks that end with "cannot", "do not know" or "done" while recall is below the key's threshold |
| Correct abstention | share of impossible controls that end with a grounded "cannot" (measured with premature give-up, as a pair, so persistence does not become acting when it should not) |
| Cost per new item | marginal spend for each additional key item; the recall-against-spend curve and its knee |
| Residual recall | items a fresh swarm still surfaces after the first one said it was done (AU-P4) |
| Stop reason | why each run ended: solved, exhausted (alternatives listed), budget, goal turns, time, idle, question to the person, error. Needs the harness to record it (requirement R3 in `docs/AUTONOMY-HARNESS-REQUIREMENTS.md`) |

## Cross-cutting front: fast classifiers as the swarm's decision layer

Added 2026-11-22 at the owner's request: "pegar pesado no uso de motores de classificação tipo JEV, Decisions API e outros, pois para tomada de decisão e julgamento rápido será a tecnologia melhor aliada" [go hard on classification engines such as Jev, Decisions API and others, because for decision-making and quick judgement they will be the best allied technology]. Details, the label inventory and what access to Jev needs: the classifier design note (internal, not published).

**Central question.** Does a cheap, fast classifier decide as well as an LLM at default effort, at a fraction of the cost and latency, and where does it fail? Applied to the three fronts: (a) scale, how many agents a task deserves before any spend; (b) effort, which effort and model per task and role; (c) persistence, whether a "cannot", "do not know" or "done" is premature, whether untried options remain, and when the swarm may stop.

**Candidates.** TypeSafe Jev and OpenAI's Decisions API (`POST /v1/decisions`, gpt-6-luna only, generally available, input [US$ redacted] per million tokens and output not charged, by its public documentation), each against an LLM at default effort on the same typed questions; others from the literature (routers, light judges, stop probes) as they become testable.

**Why it matters now.** The Colony already uses one in the product: TypeSafe Jev (`POST https://api.typesafe.ai/v1/systemone`, about 200 ms) is the first pass of the goal judge, and a sure "done" (confidence at least 0.9) ends the work without the LLM judge (`classifier.cjs`, `goals.cjs` in the `colony` repository). Without a key, the provider's fast model at low effort answers the same typed questions; the lab boxes never had a key, so every lab run so far (LI15 to LI39) used that fallback, and from Colony `ba2ce00` Jev is off in the lab unless a spec turns it on. So the persistence front's stopping decision is, today, partly a classifier decision that has never been measured against ground truth.

- **AU-C1 (stop classifier).** On parent turns of Colony runs labelled by the strict check (work left or not), a fast classifier's (Jev, Decisions) "done / continue" agrees with the truth at least as often as an LLM judge at default effort, at under one tenth of its cost per decision and median latency under 500 ms. *Falsified by* lower balanced accuracy than the LLM judge by more than 0.05, or the cost or latency bar missed.
- **AU-C2 (where it fails).** The classifier's errors concentrate on confident status reports with no request and no "cannot" (the LI39 pattern, where the first pass was the fast-model fallback, not Jev: a parent ends a turn with "A suíte ainda não passou" [the suite has not passed yet] and the team goes idle); its false "done" rate on those turns is above its rate on turns that state evidence. *Falsified by* errors spread evenly across turn types.
- **AU-C3 (calibration buys thresholds).** The classifier's probabilities are calibrated well enough (expected calibration error at most 0.1 on held-out runs) that one threshold transfers across task sizes and model families; a threshold tuned on turns from one model family (today mostly gpt-6-luna, in the Colony fleet studies) keeps its false-"done" rate within 0.05 on turns from another family. *Falsified by* a calibration error above 0.1, or the rate moving by more than 0.05.
- **AU-C4 (routing before spending).** A classifier reading only the task statement predicts which arm of a paid study did better (team against one agent; low against default effort, once AU1 exists) above the majority-class rate, so it could choose team size and effort before the run. *Falsified by* accuracy no better than always picking the majority arm on held-out cases.

| Measure | Definition |
|---|---|
| Agreement | balanced accuracy and false-"done" / false-"continue" rates against the ground truth (strict check, solved arm) and, separately, against an LLM judge at default effort |
| Calibration | expected calibration error and a reliability plot; the threshold that holds a false-"done" rate of 0.05 |
| Latency | median and 95th-percentile time per decision, measured from the caller |
| Cost | US$ per 1,000 decisions, and per decision relative to the LLM judge |
| Transfer | the same measures on turns from another model family, size and task family than the threshold was set on |
| Consequence | for a stop classifier, the runs it would have stopped with work left (premature stops) and the runs it would have kept going after the work was done (wasted spend), in minutes and US$ |

## How a result climbs (evidence ladder)

Same levels as `programs/coordination.md`, with L3 to L5 aimed at a Colony policy instead of a mechanism.

| Level | Meaning |
|---|---|
| L0 | Screened: a reanalysis of paid data, a free simulation, or a cheap pilot says it is worth a paid study. |
| L1 | Preregistered primary hypothesis supported on new seeds, one model. |
| L2 | Same effect, primary supported, in at least 3 models, one of them outside the Claude family. |
| L3 | Holds inside the Colony on the runtime fleet, at matched cost, with the harness requirements it depends on in place. |
| L4 | Holds on real work (a repository benchmark, or open research questions with an external key), not only synthetic tasks. |
| L5 | Turned into a Colony default (a team-size rule, an effort table per role, or a stopping rule) and checked by a paired run against the previous default with no loss of quality. |

A rule is **worth investing in** at L2 with L3 under way; it is **ready to ship as a Colony default** at L5. Each verdict is attached to its cell (task family, size, model, role), never generalised beyond it. A refuted or inconclusive cell is recorded the same way as a supported one.

**Stop or pivot, per cell.** Scale: if one agent with everything keeps matching teams as the task grows, record "no team gain in this family" and move to a task family that overflows one agent. Effort: if lower effort costs quality in a role at two models, that role keeps default effort and the cell closes. Persistence: if a soft stop's removal brings recall only with false claims, the stop stays and the work moves to the gate (AU-P3).

## How the programme is judged

- **Three deliverables to the Colony**, each with its evidence level: (1) a team-size rule that predicts, from task features, whether adding agents helps, measured by the share of held-out cells where it predicts the sign correctly; (2) an effort table per role (parent, ant, planner, member, judge, reviewer) with its cost-quality curve; (3) a stopping rule plus the harness requirements behind it, implemented and checked.
- **Persistence headline:** recall at a fixed budget, premature give-up rate and residual recall on the surfacing tasks, tracked across Colony versions. The owner sets the milestone numbers; this page does not.
- **Economy:** every study reports cost per solved case and the share of spend that is thinking, so the effort front pays for itself in the lab's own budget.
- **Funnel:** reanalysis of paid data and free simulation first; a paid study only where they cannot answer; paid studies run through the research bench and its single ledger, each with a preregistration on `main` and the Research Leader's approval before the first call.

## Agenda (first round, 2026-11-22)

Free (reanalysis on benchhost, in the programme's worktree, raw data restored from R2; no model calls):

1. **AU-R1: why Colony runs stop.** Restore the exports of LI15, LI20, LI29, LI31, LI32, LI37 and LI39 and classify each run's end (solved; cap; idle after a question to the person; message-budget error text present; goal closed with a "could not finish" report; goal turns used; last turns naming untried options). Tests AU-P1 and gives the cross-study unsolved share by modules per ant for AU-S2. Checks one specific suspicion from the harness audit: the implicit goal of 12 turns or 120 minutes cannot be raised through the lab, while LI39 ran with a 180-minute cap.
2. **AU-R2: where thinking goes.** From the raw batch files of LI33 to LI38 (and LI24, LI26, LI27 where usage was recorded), thinking tokens per reply by role (start, member, plan), against the reply's outcome (its module's checks after the wave), truncation and case outcome. Tests AU-E2 and sets the effect size for AU1. Also checks LI35's thinking share (0.11 and 0.22, far below every other study), which may be a model label in its economy file.
3. **AU-R3: team size against load in the free model.** A new file, `sims/screen-scale-n.mjs`, varies N at fixed M (M/N from 2 to 16 modules per agent) under GN-S2's context limit, as a free screen of AU-S1 and AU-S2 before any paid size arm. Agreed with Genome Research on 2026-11-22, on three conditions: (1) its rule is registered on `main` before the first run; (2) the SIG-06 local and even-split arms reuse GN-S2's nine confirmed choices (neighbourhood of 3 on each side, a module is ready only with its dependencies read and correct, C = 8), and the file cites them; (3) what AU-R3 shows about SIG-06 is N data for this programme and does not change GN-S2's verdict. If the local gain reverses at some M/N, Genome Research is told, because it shapes their paid SIG-06 study. `sims/screen-scale.mjs` and GN-S2's preregistration are not touched.
4. **AU-R4: labelled decisions for the classifier front.** Build, from data already paid for, the label sets in the classifier design note (internal, not published): every parent turn of the Colony studies LI15 to LI39 with the strict-check state at that moment (work left or not) and the run's end state; the T2R and M4 instances with their correct answers and the LLM judge's or verifier's call. No model calls. First reading, exploratory, from LI39 alone: of the 9 runs that ended unsolved, 6 ended before the 180-minute cap (31 to 47 minutes, 15 to 156 checks failing), 3 of them at the 200-message budget; the parent's last message in `market` seed 39400 is a status ("A suíte ainda não passou" [the suite has not passed yet]), not a "cannot" or a question.

Paid (at most one pilot; needs a preregistration on `main` and the Research Leader's approval, after AU-R2):

5. **AU1 pilot: effort per member.** Batch instrument, Haiku 5.5, LI34's 80-module shape, strict check, `stigwait`, 6 cases, three runs that differ only in member effort (low, medium, default), each with its own start wave at the same effort. Measures solved, fresh-input pass, act rounds to zero, output and thinking tokens, cost per solved case. Expected cost about [US$ redacted] (LI34 recorded about [US$ redacted] per case for `stigwait` and [US$ redacted] per case for the start wave at default effort, across 80 and 120 modules; lower effort should cost less), proposed cap [US$ redacted] with the review. Expected cost per solved case: at most [US$ redacted] It tests AU-E1 for members only; the planner side waits for the pilot's result.

Classifier comparison (not in this round): scoring AU-C1 on the AU-R4 labels uses the Colony's Jev key (approved by the owner on 2026-11-22 for AU studies, made available by the Bancada) and would need an OpenAI API key, not approved yet, for the Decisions API (see the classifier design note (internal, not published), section 4, requested through the Research Leader), and an LLM judge baseline. All three are paid: at Decisions' stated price, 10,000 decisions on 3,000-token contexts cost about [US$ redacted]; the LLM baseline costs more. It gets its own preregistration and cost estimate once access is settled; until then no key or service from another product is used.

Persistence instrument (design, no spend): the surfacing-task generator and key format, starting from the synthetic code tasks' hidden checks (keys already exist), so the first persistence study can use the batch instrument before the harness requirements land in the Colony.
