# External cyber swarms: Blackbit and Global AI Federation

Reviewed 2026-11-09. Scope: public documentation and source checking, not a product evaluation. No paid account, model inference, target assessment, or operational deployment was initiated. Web pages are mutable; no public implementation commit was identified for either claimed swarm system. Local LAB-007 protocol remains unchanged.

## Finding

Blackbit is relevant adjacent product work: agents investigate security weaknesses and support remediation. Norevia investigates a different property: whether distributed agents can preserve information integrity when one participant or input is compromised. These can overlap in a future integration, but neither a marketing demonstration nor the word swarm establishes adaptive biological defence or superiority over conventional controls.

The Global AI Federation article is an editorial lead with unsupported assertions, not an engineering implementation or an authoritative legal standard. Its proposed containment and audit mechanisms can motivate requirements after independent verification.

## Blackbit: what the public material establishes

[ZERO landing page](https://www.blackbit.sh/) describes Recon, Scout and Hunter roles, authorized scope, concurrent investigations, forensic records and patch retesting. It advertises 188 tools; that inventory is a vendor claim, not 188 independently validated capabilities. The advertised subscription prices were [US$ redacted]/month Pro and Enterprise from [US$ redacted]/month when reviewed. Pricing was not checked through checkout. No subscription is needed for this research.

[ZERO overview](https://docs.blackbit.sh/docs/zero) documents Discover, Attack and Fix views. [Investigation controls](https://docs.blackbit.sh/docs/zero/attack/investigations) document selectable models, depth, worker-wave approval, phase progression and resumed sessions. These are useful patterns for bounded orchestration; documentation is not a test of their enforcement.

[Findings and reports](https://docs.blackbit.sh/docs/zero/attack/findings) separates severity, review state, proof files and remediation proposals. It explicitly cautions that a recorded confirmation is not independent proof, and that a proposed correction is not an applied or validated fix. This is a useful evidence model to study.

[VOID security boundaries](https://docs.blackbit.sh/docs/void/security/security-model) explicitly excludes prompt injection, malicious prompts and unsafe model behaviour from its protection scope. It says no catalog route is TEE-attested. Zero data retention is described as a provider commitment; it is different from proving execution integrity or preventing poisoned information from spreading.

There is a material documentation discrepancy: [VOID overview](https://docs.blackbit.sh/docs/void) describes encrypted tunnels and a confidential-compute Intel TDX router, whereas [architecture](https://docs.blackbit.sh/docs/void/architecture) says inference occurs upstream, prompts and completions reach the upstream in plaintext over TLS, and no model has an attested execution receipt. A TDX router and unattested upstream inference could coexist; the overview must not be read as end-to-end attested confidential inference. Clarification and an independently verifiable attestation chain would be needed to rely on the broader claim.

No public licensed source repository for the ZERO orchestrator, reproducible defence-against-agent-contamination experiment, or independent evaluation of that property was located in this review. This is bounded search absence, not proof that such material does not exist. No public biological defence mechanism was established. VOID is an inference gateway, distinct from ZERO's tool and workspace security.

## Global AI Federation: what survives source checking

[Article](https://globalaifederation.org/news/autonomous-cyber-defense-swarms-geneva-protocols-verification-2026), attributed to Yuvraj and dated 2026-10-18, proposes internal segmentation, credential revocation, rollback, deception, deterministic boundaries and cryptographic auditing. Its rendered HTML was retrieved directly after the web reader failed. The inspected HTML has no supporting outbound links to the asserted deployments, draft rules, working-group specifications or implementations. No circuit, verifier, threat model, benchmark or operational trace is supplied. Treat all those assertions as unverified author claims.

[CCDCOE's own description](https://ccdcoe.org/research/tallinn-manual/index.html) describes Tallinn 3.0 as a revision project and explicitly says the Manual is nonbinding scholarship, not the doctrine or legal position of any state or international organization. That page does not substantiate the article's claimed new swarm-specific draft requirements or multilateral consensus.

[Cambridge's official contents for Tallinn 2.0](https://assets.cambridge.org/97811071/77222/toc/9781107177222_toc.pdf) places applicability of armed-conflict law at Rule 80 and the definition of cyber attack at Rule 92. The article attributes the latter to Rule 80 of an unsourced 3.0 draft. This is not a verified 3.0 quotation: do not import its numbering into Norevia.

[Additional Protocol I, Article 36](https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-36) concerns a High Contracting Party's review of a new weapon, means or method of warfare. It does not itself mandate a universal certification regime for every commercial defensive agent. [Article 57](https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-57) calls for feasible precautions and an assessment of expected incidental harm relative to anticipated military advantage; a harmful outcome alone is not the full legal test. These are source corrections, not an operational legal clearance.

Engineering assessment: a zero-knowledge proof establishes a precisely encoded predicate under assumptions. It does not automatically establish lawful behaviour, complete event capture, truthful sensors or safety under every future input. An append-only or hardware-backed log can make alteration detectable; it does not establish that the logged observation was true. Blockchain is optional for distributing commitments and supplies neither semantic truth nor containment on its own. Any candidate design must specify what is proven, about which execution, under which trust assumptions.

## Consequences for Norevia

1. Keep the research question narrow: can adaptive contact restriction, item quarantine and controlled recovery reduce downstream contamination while retaining useful work, at comparable cost?
2. Borrow Blackbit's separation of observation, claim, proof, proposed correction and verified recovery. Borrow explicit scope, worker budgets and phase boundaries as conventional engineering controls, not biological contributions.
3. A future interoperability test could consume exported investigation artifacts as untrusted evidence. No Blackbit integration, API entitlement or export compatibility has been verified.
4. Future tests should measure downstream wrong decisions, benign-work loss, containment delay, recovery, false quarantine and total cost. Counterfactual clean runs and independent seeds remain necessary.
5. Enforce action authorization outside the model, with least privilege and a deterministic mediator. Compare that same mediator across experimental arms; attribute only incremental adaptive policy effects to the biological hypothesis.
6. Do not modify a running preregistered LAB-007 because of these links. Record a subsequent protocol version if this review motivates an additional experiment. Do not add cryptographic infrastructure until a concrete multi-party verification need justifies its cost.

Evidence classification: Blackbit = adjacent vendor-described implementation with public user documentation, not locally validated; Global AI Federation = editorial claims requiring corroboration; biological transfer and an immune layer for third-party swarms = Norevia engineering hypotheses, not demonstrated results.
