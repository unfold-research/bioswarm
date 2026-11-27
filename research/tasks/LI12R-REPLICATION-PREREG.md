# LI12R preregistration: replication of LI12 on fresh seeds (2026-11-17)

**Status:** registered 2026-11-17, while LI12 (k = 80) was still running and before any LI12 analysis; LI12's k = 40 run had finished and its raw counts had been seen. Method rule 5 (`docs/CONVENTIONS.md`): no status beyond preliminary without a rerun on fresh seeds. Runs in parallel with LI13 and LI14 (rule 9).

Same domain, runner, arms, prompts and strict live check as `tasks/LI12-POLARITY-TRACE-PREREG.md`, at 40 modules only: config `observatory/batch2/rc/li12r-k40.json`, seeds 12900 to 12907 (never used), study cap [US$ redacted]

**Verdicts.** The LI12 verdict script on this run: `node observatory/batch2/rc/analyze-li12.mjs results/li12r-replication 40`. With one size (8 cases) its absolute thresholds (4, 3 and 2 cases) are halved and rounded up (2, 2 and 1); the script was changed only to take the directory, sizes and this scaling, and gives identical output on LI12. A hypothesis of LI12 (H-LI36 to H-LI40) **replicates** if its verdict here equals its LI12 verdict; otherwise the replication fails and its status stays preliminary with the disagreement recorded.


## Amendment before any LI12R data (2026-11-17): trace parser bug

The LI13/LI14 pilot found that the runner dropped every agent-written trace whose check id the agent copied with its square brackets (the prompt shows ids as `[D:...]`). In LI12 about 55% of the traces written in the `stig` arm were dropped this way (692 written at 40 modules, 381 with brackets, 178 exact). The parser now strips the brackets; the prompt is unchanged. LI12R therefore replicates `routed`, `manager`, `polarity` and `oracle` exactly, and runs `stig` as intended for the first time: for H-LI37 to H-LI40 it is a **corrected rerun**, not a replication, and its verdicts replace LI12's for those hypotheses only if both are reported.