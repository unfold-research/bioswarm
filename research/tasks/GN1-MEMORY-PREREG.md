# GN1 preregistration: does memory carried between cases (FLD-04 notebook, FLD-03 team library) make a team solve the next case of the same family with fewer first-pass failures? (2026-11-22)

**Status:** registered when this page is merged to `main`, before any GN1 data (stage 0 included). The owner approved GN1 with a
**cap of [US$ redacted]** (2026-11-22, relayed by the Research Leader); the Research Leader reviews this page before merge. Programme:
Genome Research (series GN, `Shared/unfold/genoma/GN-PLAN.md`). Haiku 5.5, Message Batches API, strict live check, runner rc
extended by the bench (build B3) and run on benchhost. Verdicts: `observatory/batch2/rc/verdict.mjs` rule (per-unit exact sign test,
one-sided, Holm on secondaries). Review: `docs/reviews/REVIEW-PROMPT.md`.

**Why.** FLD-04 (individual learning) is the only genome trait with a free screen that advanced and no real-agent test
(`results/sims/screen-noflag.md`, +0.144). FLD-03 (persistent shared structure) was never tested and came to this programme from
Coordination (GN-PLAN note of 2026-11-21). Every LI study runs each case from a blank start; no study has asked whether a team that
has solved one case of a family does the next one better. Nature's version: colonies and individuals that keep what they learned
about a recurring environment. The thesis question is open work over time, not one isolated case.

**Existing data checked first (FRENTES rule 6).** (1) No LI or Colony run has related consecutive cases: every case is a fresh
seed of `makeInstance`, so no raw data answers this. (2) LAB-003 Q3 (`results/charts/lab003-q3-memory.json`) tested request-type
memory for **one** agent on a sequence of package tasks: first-pass failure rose from 0.140 without memory to 0.193 with it, cost
per accepted task 0.0062 against 0.0065 US$. It is disclosed as a prior against the trait. It does not answer GN1: no team, no
module ownership, no hidden requirement held by another member, and the memory was examples of solutions, not notes on partners.

## Instrument (build B3, free until the pilot)

**Family generator** (new file `observatory/batch2/rc/family.mjs`; `makeInstance` and every earlier instance unchanged). A
*related sequence* has three cases on the same 80 modules, member *m* owns module *m* in every case. Case 1 is
`makeInstance(80, seed, shape)`. Cases 2 and 3 are generated from case 1 with the same rng discipline:
- **Directed edges:** a fraction **f = 0.5** (chosen by hash of sequence and edge, the same for cases 2 and 3) repeats a case-1
  edge: same caller and helper modules, same helper requirement (same `LIB` entry and parameter); fresh function names, fresh
  combination, fresh test inputs. The other half are new edges drawn as in `makeInstance`.
- **Symmetric edges:** the same fraction f repeats a case-1 edge: same producer and consumer, same record name, fields and both
  house styles; fresh test records. The rest are new.
- **Local checks:** all new.
- Same shape in every case: 2 local per module, **160 directed, 53 symmetric**, 16 tests, 3 shown (LI36 density at k80).
A *control sequence* has three unrelated cases (f = 0: three fresh `makeInstance` seeds).

f = 0.5 is fixed here and is not changed after stage 0 or the pilot, whatever they show.

**Memory.** At the end of a case (after its last wave), each member gets one extra request: its specification, its final code and
the checks it saw fail during the case, and the instruction to write notes for the next case of the same codebase.
- **`notebook` (FLD-04):** each member writes at most **300 tokens** for itself; in the next case its own notes are shown in every
  member request under "Your notes from the previous case".
- **`library` (FLD-03):** each member writes at most 300 tokens for the team, each line tagged with the module it is about
  (e.g. `M12: ...`). In the next case a member is shown the lines about its own module written by anyone, in a fixed order
  (author module ascending), cut at **300 tokens**. So both arms read at most 300 tokens; they differ in who writes for whom.
- **`none`:** no notes.
Notes longer than 300 tokens are cut by the runner (token-counted), and the cut is recorded. Notes are carried only along a
sequence; case 3 gets the notes written at the end of case 2 in the same arm.

**Protocol.** Every arm uses `stigwait` (wait for the trace, with the tie-break), the best LI protocol (LI33, LI34, LI38), so only
memory varies. 12 act rounds, strict feedback, member output up to 8,000 tokens, `effort` default (thinking on), as LI38. Case 1
runs **once** per sequence and is shared by the three arms (its end state feeds both note-writing requests). Cases 2 and 3 run per
arm.

## Stage 0, run after registration and before any paid call (free, bench, no model)

An oracle without LLM writes, for every member of case 1 of the six related sequences, the ideal notes: the resolved requirement
of every directed edge it was on (as caller or helper owner) and the agreed format of every symmetric edge it was on, cut at 300
tokens (token count by the free counting endpoint, or bytes/3 if offline). It then counts, over the checks that fail in case 2
at the start (empty code, strict check), the share whose fix is in the notes the owner would read: in the member's own notes
(`notebook`) and in the lines about its module (`library`).

**Gate:** if the `notebook` share is **below 20%**, GN1 stops before any spend; the result is published as "premise not met by
this family generator" and f is not raised to pass the gate. The `library` share is reported; if it alone is below 20%, the
`library` arm is dropped and GN1-H2 is not run (recorded before the pilot).

## Sample, pilot and cost (FRENTES rule 5)

- **Sequences:** 6 related (seeds 51000 to 51005) and 3 control (seeds 51100 to 51102, three cases each). Pilot: 1 related
  sequence, seed 50990, cases 1 and 2 only, all three arms (excluded from analysis).
- **Runs:** per sequence 1 shared case-1 run + 2 cases × 3 arms = 7 case runs, 63 in all, plus 4 note-writing rounds per sequence
  (2 after case 1, 2 after case 2).
- **Cost estimate (not a count):** LI38 `stigwait` at k160 cost [US$ redacted] per case; at k80 with the same per-module density,
  about **[US$ redacted] per case run**, so about [US$ redacted] for the case runs; a note-writing round is one request per member, about
  [US$ redacted] to 0.04, so about [US$ redacted] to 1.4 in all. **Pilot: about [US$ redacted]** Expected cost per solved case: about [US$ redacted]
  (LI38: every `stigwait` case solved).
- **Cap rule:** study cap **[US$ redacted]** including the pilot, enforced by the runner (`studyCapUsd`) before every wave. If the pilot's
  measured cost projects more than [US$ redacted] for the study, the study runs with **2 control sequences** (51100, 51101); if that still
  projects more than [US$ redacted] with 5 related sequences (51000 to 51004). This choice is recorded on this page before the first
  study wave and depends only on cost.
- **Cost-rule choice (recorded 2026-11-23, after the pilot and before the first study wave; from `results/gn1/plan.json`,
  2026-11-23T02:30:50Z):** pilot actual spend [US$ redacted]; measured [US$ redacted] per case run and [US$ redacted] per note round.
  Study projection without the pilot: full [US$ redacted]; 2 control sequences [US$ redacted]; 5 related sequences (51000 to 51004) with 2
  control sequences (51100, 51101) [US$ redacted] under [US$ redacted] and under [US$ redacted] − 0.5895 = [US$ redacted] **Chosen: 5 related + 2 control
  sequences**, so 10 primary units (the primary needs at least 9 of 10 wins: 9/10 gives one-sided p = 0.011, 8/10 gives 0.055)
  and a control guard of 4 units (weak, to be said in the report). Library arm kept (stage 0: notebook 0.2225, library 0.2270,
  both at least 0.20). Projected total [US$ redacted] of 8: if the real cost runs about 1% above the projection, the runner stops with
  no units cut (exit 4), and that is reported as such.
- **Effort:** default, as LI38, so `stigwait` is the protocol whose behaviour is known; there is no evidence that lower effort
  keeps quality for rc members.
- **Prompts above 100k tokens:** not expected. Member prompts at k80 are a few thousand tokens and notes add at most 300; there is
  no manager. The runner prices any request above the band at the long-context rate.

## Hypotheses (unit: a case of a related sequence, cases 2 and 3, so 12 units; paired across arms on the same case)

- **GN1-H1 (primary, FLD-04).** `notebook` against `none` on **firstPassFailing**: failing checks on the strict check after the
  first act wave. Lower is better.
- **GN1-H2 (FLD-03).** `library` against `none` on firstPassFailing.
- **GN1-H3.** `notebook` against `none` on `wavesToSolve` (waves until zero failing checks; unsolved is worst).
- **GN1-H4.** `notebook` against `none` on output tokens per case, **including** the note-writing request that fed it.
- **GN1-H5.** `notebook` against `none` on `holdoutFailing` (fresh inputs): notes must not buy live passes that fail fresh
  inputs. Here the hypothesis is one of no harm: refuted if `none` is better in more units with p < 0.05.

Rule: supported if the first arm is better in more units with exact one-sided sign test p < 0.05 (ties dropped); refuted if the
second is better in more units; otherwise inconclusive. Holm across GN1-H2 to GN1-H5. The 12 units are not independent (case 3
follows case 2 in the same arm and sequence); disclosed, and the sequence-level count (6 sequences, sum over cases 2 and 3) is
reported beside it.

**Control guard (not a hypothesis, 6 units, or 4 under the cap rule):** on control sequences `notebook` must not raise median
firstPassFailing by more than 10% over `none`, nor median `wavesToSolve` by more than 1 wave. Breaking the guard is reported as
"notes hurt on unrelated work".

**Reported without a verdict:** `notebook` against `library` on every measure; firstPassFailing split into directed, symmetric
and local checks, and into repeated against new edges (the mechanism check: the gain should sit on repeated edges); notes cut at
300 tokens per arm; note-writing cost; failing checks per wave; stage-0 shares against the observed gain.

## What the result decides (card for the Colony)

- **GN1-H1 supported, GN1-H5 not refuted, guard holds:** FLD-04 reaches L1 on Haiku for related work: **"adopt, test more"**:
  the Colony keeps a per-agent notebook between tasks of the same project; next step a second family (Colony, another model).
- **GN1-H2 supported and GN1-H1 not:** the shared library (FLD-03) is the mechanism: same card for FLD-03, FLD-04 recorded as
  not supported.
- **GN1-H1 supported but guard broken:** "adopt only for tasks known to be related"; the Colony needs a relatedness test.
- **GN1-H1 inconclusive or refuted:** FLD-04 recorded as **not supported in agents** at this scale, in line with LAB-003; no
  further paid memory study without a new mechanism.
- **Stage 0 below 20%:** no card; GN-PLAN records that the generator could not create the premise.

## Limits (known at registration)

One model; synthetic coupled code tasks; f = 0.5 is a design choice, and with f higher memory helps by construction; 12
correlated units; case 1 shared, so the arms do not differ in the notes' starting state, only in how they are written and read;
the notes are written by the same model that reads them; a 300-token limit for 80 members is not the library a real team keeps;
no manager arm (a manager with notes would cost about [US$ redacted] more, out of the cap).
