# Prior-art check for LI1 and LI2 (2026-11-17)

Standard web search by a research subagent (Sonnet 5.5), abstracts and snippets only; 2026 arXiv ids not independently confirmed. To be re-checked against full texts before any public claim.

**Verdict.** Giving each conflict to one side is not a new mechanism. It is the classical remedy for oscillation in distributed constraint satisfaction: asynchronous backtracking with agent priorities (Yokoo et al., IEEE TKDE 1998), distributed breakout (Yokoo and Hirayama 1996), maximum-gain messages (MGM, Maheswaran et al. 2004); random activation with probability p is DSA (Fitzpatrick and Meertens; Zhang et al.). Lateral inhibition has already been framed as a distributed algorithm (Afek et al., Science 331:183, 2011, maximal independent set); the honeybee stop signal is Seeley et al., Science 2012. Human subjects on network colouring: Kearns, Suri and Montfort, Science 2006.

**Closest LLM work.** LoopBench (arXiv:2512.13713): LLM agents colouring odd cycles loop without communication; memory of strategies lets some reasoning models escape. VL-DCOP (arXiv:2501.14189), AgentsNet (arXiv:2507.08616), Picard, Yeoh and Zivan (AAMAS 2026 blue sky) place LLM agents in distributed constraint reasoning. Parallel coding-agent systems (CodeCRDT arXiv:2510.18893 and others found only as summaries) use locks, leases and ownership as engineering fixes without a controlled comparison of oscillation against convergence.

**Not found.** A controlled comparison, with LLM members and an environment that computes conflicts, of one-side-acts against both-act against random activation; nor of coordination through a computed field against coordination by conversation at matched cost. Absence from a thin search, not evidence of absence.

**Consequence for claims.** LI1 can at most show that LLM members inherit the synchronous pathology and that the classical remedy transfers. The `random` arm at p = 0.5 is the DSA baseline at one setting only; a tuned p or MGM would be a stronger baseline. Any public wording must cite the classical sources and LoopBench.
