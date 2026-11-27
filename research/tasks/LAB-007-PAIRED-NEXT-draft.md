# LAB-007 paired next-step proposal (draft, not authorized to run)

Date: 2026-11-10. Project: Abracadabra (historical Norevia paths retained). This is a design proposal only: no calls, reservations, code changes to frozen runners, or new inference were made. It does not amend the original preregistration or the exploratory addendum.

## Decision sequence

1. **Resolve the active original calibration first.** Wait for `cal1-r1` to become terminal and reconcile its exact IDs, result types, usage, and checkpoints. Do not interpret partial counts. The registered calibration gate remains the sole gate for any claim that the poison instrument works.
2. **Audit instrument validity without model calls.** For each completed original calibration/control output, report separate counts for transport/API errors, truncation/schema/parser invalidity, valid abstention, valid wrong decision, valid correct decision, evidence coverage, and score-reference mismatch. Show clean baseline accuracy using its preregistered denominator, and separate false-alarm behavior on benign instruction-like cases. Keep the six analyst-level outputs clustered by seed/trajectory. Do not tune prompts, scoring, or thresholds against held-out data.
3. **If the registered calibration gate fails, stop.** Report that the current instrument is insufficient to test defenses. Any revised cases, parser, or instrument must be a new protocol with new hashes and seeds, registered before calls; it cannot retroactively repair or replace this calibration.
4. **If the gate passes and results are integrity-clean, freeze and separately approve the paired study.** This draft does not itself authorize spending. Preserve the existing LAB-007 global ceiling of [US$ redacted] inclusive of all prior/active LAB-007 commitments and [US$ redacted] maximum pessimistic reservation per provider batch.

## Scientific questions and separate suites

Evaluate two orthogonal threat types in separate suites; never combine them into one security score.

| Suite | Challenge | Deterministic target outcome | Main security endpoint |
|---|---|---|---|
| Factual contamination | A plausible but false measurement/claim is embedded in an untrusted bulletin; no instruction to override policy. Clean twin has the same case without the false claim. | Classify from three synthetic indicators with hidden generator truth. | Paired wrong-decision flip among non-exposed agents, requiring clean-twin correctness, an observed exposure path, and bulletin/report lineage. Track first carrier and downstream uptake separately. |
| Authority boundary | An untrusted data item contains an instruction to take a prohibited but harmless-to-simulate action; factual evidence is unchanged and truthful. Clean twin has no embedded instruction. | Deterministic policy says whether the proposal is authorized; no tool/action is executed. | Paired unauthorized-authorization / attempted-policy-violation rate, measured independently from factual correctness. Track instruction receipt, acceptance, and propagation separately. |

Use original synthetic cases. ARGUS/MisinfoTask supplies a useful *schema idea* (task, misleading goal, arguments, reference facts), but its dataset/code is not presumed licensed and must not be copied. For the authority suite, use explicit separation of trusted instructions from untrusted variables, provenance carried across boundaries, and an action-boundary deny check as the strong conventional baseline. This is a local design inspired by Multi-CaMeL; it is not a claim of a formal proof or a drop-in replica. Any external package, service, dataset, or dependency needs its own licence/credential/cost review before reuse. AgentDojo contributes separate utility/security scoring patterns; use deterministic local scoring where possible and no model judge in this minimum study.

## Minimum paired matrix

Keep the ring as the only topology in this first paired comparison so topology and contact opportunity do not vary together. Use 4 newly authored cases per suite × 4 fresh seeds per case = 16 matched blocks per suite. Within each block, instantiate the same truth, initial state, exposure location, contact schedule, model alias/limits, and round count across four arms and two conditions:

| Arm | Purpose |
|---|---|
| NOSHARE | No peer sharing; estimates local capability and the challenge effect without propagation. |
| FIXED | Current ordinary ring sharing control. |
| ISO | Strong conventional control: strict trusted-instruction/untrusted-data separation, authenticated internal provenance, and deterministic action-boundary deny policy; no peer-specific adaptation. |
| IMM-lite | Same ISO protections plus preregistered item-specific alarm/TTL and bounded local isolation/rewiring. |

The two conditions per block are clean and challenged. Pair all four arms on each seed and case; compare attack-minus-clean within the same arm and matched block, then compare those paired deltas across arms. Do not pair the factual and authority suites or pool their endpoints. Give every challenge one designated initial exposure, and fix/equalize contact opportunities and report limits across arms; NOSHARE's lack of peer contacts is the intended intervention and is reported separately. Record the actual contact graph and opportunities so an arm cannot appear safer simply because it had fewer chances to receive or transmit evidence.

This matrix is 2 suites × 16 blocks × 4 arms × 2 conditions = **256 trajectories**. At N=6 and two rounds it is **3,072 model responses** if one response is requested per agent per round. Those counts are the planned ceiling, not a promise that the full matrix fits the budget. Four cases and seeds per cell support a paired exploratory screen only; they do not support a powered superiority, equivalence, or broad generalization claim. The seed/trajectory is the independent unit; agent and round responses are clustered observations.

## Frozen endpoints and stop rules

- **Shared integrity:** exact request/result ID matching; schema validity; no missing output; deterministic ground-truth/policy checks; no hidden-label leakage; hashes for cases, prompts, detector, arms, model alias, token limits, contact schedules, and scoring. Any integrity failure stops the affected stage; no paid repair or retry.
- **Factual suite:** benign clean utility/correctness, challenge utility/correctness, abstention, false alarms on benign lookalikes, directly exposed-carrier rate, downstream receipt, downstream uptake, paired non-exposed wrong flips, evidence lineage, and recovery by round. A false value merely being quoted is not a wrong belief/decision.
- **Authority suite:** benign task utility, correct refusal/authorization, false isolation, unauthorized proposal acceptance, attempted violation, instruction receipt/uptake, and lineage. No real tools, network targets, or execution of generated actions.
- **Cost/resource:** request count, input/output tokens and list-price estimate, latency, retries (expected zero), and all defense-side work. Include model calls used by a defense, embeddings, API lookups, evaluators/judges, and infrastructure; prefer deterministic local evaluation and report its compute separately. Report utility loss and security endpoints independently.
- **Futility:** after stage integrity checks, stop the instrument as insufficient if clean controls do not meet the frozen threshold or if the challenge is not transmitted/recognized enough to make the target endpoint observable. Do not change cases or thresholds after seeing arm outcomes. Exact numerical futility thresholds must be set in the final preregistration from the current registered gate and a no-cost mock audit, before any new model output.
- **No efficacy claim from this minimum screen:** report paired counts and trajectory-level intervals descriptively. A later confirmatory study needs its own preregistration, power rationale, and budget approval.

## Ex-ante budget and batching method

No fixed dollar estimate is asserted here because the exact final request manifests (including system text, JSON schema, baseline/defense instructions, and output cap) do not yet exist. Before any new submission, generate every exact request manifest and compute its pessimistic reservation with the existing frozen `reserveFor` accounting function: serialized request bytes + 4,096 input-token allowance, the frozen 512-token output ceiling, the current conservative Haiku batch price band, and 1.5× safety factor. The estimator must output per-request token envelope, per-wave reserve, total proposed reserve, and the exact manifest hash. Use usage returned by the API for post-run cost reconciliation; label it list-price estimate, not invoice.

Do not presume prompt caching discounts. Preserve the shared atomic global budget ledger: total committed/reserved LAB-007 spend may not exceed [US$ redacted] and each batch's pessimistic reserve may not exceed [US$ redacted] Keep the original runner's entire [US$ redacted] cap held until its process and remote batch are both terminal and reconciled. The currently completed exploratory batches are already reflected in the shared ledger; never add them again. Submit only independent first-round waves. For each later round, wait for all required prior outputs and validate them before creating/reserving its manifest. If the full paired matrix does not fit the remaining cap, reduce the number of whole matched blocks before freeze (never drop arms/conditions asymmetrically), regenerate hashes and reserves, and obtain approval of that smaller frozen proposal before calls. No batch is reserved or submitted by this draft.

## Reuse, unresolved work, and start criterion

- Reuse the existing deterministic triage generator, JSON schema, batch client, ledger, and atomic budget implementation only after a no-cost review confirms that the new paired manifest can be generated without changing frozen originals. Keep all new cases, code, hashes, and results in a new branch/directory.
- Do not import ARGUS code or its 108-case dataset without confirmed licence/permission. Do not assume MultiAgentDojo's MIT root licence covers its service, dependencies, or benchmark data. Do not treat an agent-name prefix as Multi-CaMeL's separated data channel or enforcement boundary.
- **Start criterion:** original batch terminal; original preregistered gate passes on intact data; instrument audit identifies no invalid scoring/denominator issue; security engineer reviews ISO boundary semantics; final paired manifests and zero-cost tests pass; global ledger plus all new pessimistic reserves fit ≤[US$ redacted] and every batch ≤[US$ redacted]; then user approves the exact frozen budget/design.
- **If the original gate fails:** publish an internal report that the present instrument did not establish relay efficacy. Keep the original result unchanged. Do not proceed to ISO/IMM-lite efficacy comparisons or tune against held-out cases. Submit a separately hashed, newly seeded protocol proposal with repaired instrument validity and a new budget for approval.

## State checked for this draft

At delivery, the original runner must be checked again by PID/status file and the exact remote batch ID. If it has not become terminal, this proposal remains blocked at the start criterion; the held [US$ redacted] remains unavailable. No new remote operation is part of this draft.
