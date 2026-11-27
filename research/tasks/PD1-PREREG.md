# PD1 preregistration: policy discovery (2026-11-12)

Registered before any paid call of this study. Owner instruction of 2026-11-12 ("Sim, segue", to the proposal of running policy discovery after D6 and T1), within the standing authorisation for the shared ledger.

Code: `observatory/batch2/pd1-policy/protocol.mjs`, studies `pd1-plan-haiku` and `pd1-plan-sonnet`, analysis `observatory/batch2/pd1-policy/analyze.mjs`.

## Question
RD found that a larger model planned a search no rule of ours had, and that the plan written in code ran for nothing. D6 and T1 found that a model choosing step by step does not reach such a policy. PD1 tests the method those results suggest: a model plans once, from a few examples; the plan is a rule; the rule is checked by simulation. It is tested on a field whose structure is not the ring.

## Setting
- Field: 24 parts, each with a ring position and three labels (source: 6 values of 4 parts; shelf: 4 of 6; batch: 8 of 3), assigned independently at random in every field. Three parts were edited. Four domains, never named to the planner: **ring** (three neighbours), **source** (three of the four parts of one source), **shelf** (three of the six of one shelf), **batch** (the three of one batch).
- Budget: 8 re-counts, 4 rounds of 2. A field is right when two of the three edited parts are re-counted. Readers are simulated with exact counts.
- A policy is three settings: what to follow after a changed part (none, ring, source, shelf, batch), how many related parts at most (1, 2, 3, 6), and where to probe otherwise (in order, spread over the ring, or one part per value of a label first). 85 distinct policies. The planner returns the three settings in a schema, so no person translates a plan.
- Planning cells: 4 domains × K examples (1 or 4) × 10 replicates, plus 10 replicates with no example: 90 calls per model, one call each. An example is a past field of the domain with its labels and the three edited parts marked. Models: Claude Haiku 5.5 (thinking disabled) and Claude Sonnet 5.5 (effort low).
- Scoring: each policy on 1,000 test fields of its domain (seeds from 810001). A plan with no example is scored as the mean over the four domains. An invalid plan is scored as the default sweep (follow nothing, in order).
- Comparisons on the same cells: **fit**, the policy of the 85 that does best on the same examples by simulation (most examples right, then fewest re-counts to the second edited part, then list order); **ring rule**, the planned search of RD carried over unchanged (follow ring, limit 2, spread over the ring); **best**, the best of the 85 chosen on 1,000 other fields (seeds from 410001).

Known before any call, from simulation on those other fields: best policy 0.76 (ring), 0.76 (source), 0.62 (shelf), 0.76 (batch); the ring rule 0.76, 0.25, 0.24, 0.26; the fit 0.42 to 0.49 with one example except shelf 0.34, and 0.52 to 0.66 with four.

Leak probe: on the test fields and on the examples, the edited parts cannot be located from a part's number or label values. The probe's hypergeometric variance is wrong when the targets share the ranked feature (hits are all or nothing per field), which gave |z| up to 4.2 on the label that defines the domain; with the variance taken from the spread of hits per field, the largest |z| is 2.5. The option is now in `observatory/batch2/kernel/leak-probe.mjs`.

## Predictions
Unit: the planning cell. Bootstrap over cells (4,000 draws), paired except P4.
- **P1, a plan from four examples beats the rule carried over from the ring**: Sonnet with K = 4 minus the ring rule, on the 30 cells of the three domains that are not the ring; interval above zero.
- **P2, and is close to the best rule of the family**: best minus Sonnet with K = 4 over the 40 cells; *supported* if the upper end of the interval is below 0.10.
- **P3, the model against a fit by simulation on the same examples**: Sonnet minus fit, at K = 1 and at K = 4. Expected above zero at K = 1 (one example leaves the fit undetermined) and no different at K = 4; reported in whichever direction it falls.
- **P4, the examples carry the information**: Sonnet with K = 4 (40 cells) minus Sonnet with no example (10 plans); interval above zero.
- **P5, the larger model plans better**: Sonnet minus Haiku at K = 1 and at K = 4, paired by cell; reported in whichever direction it falls.
P1 to P4 are also reported for Haiku. Reported per domain and K: share right of each arm, and the share of plans that name the right relation to follow and the right probe.

## Stopping, budget
More than 10% invalid plans stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]).

## Limits stated in advance
The policy family gives the planner the hypotheses: it names the four relations. Finding a relation that nobody listed is not tested. The fit is given the same family. Readers are simulated and exact; edits always touch exactly three parts under one relation; one wording; ten replicates per cell, so a share per cell moves in steps of 0.1 of a plan. The planner is told the task and the budget. Results of the simulation for every policy were known to the author before the calls; the model's choices were not.
