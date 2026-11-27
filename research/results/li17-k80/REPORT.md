# LI17 report: clonal selection on top of waiting for the trace (2026-11-18)

Preregistration: `tasks/LI17-CLONAL-WAIT-PREREG.md`; spec `sweeps/LI17.json`. Data: `results/li17-k40/`, `-k80/`. Verdicts: `results/li17/verdicts.json`. Review: `docs/reviews/LI17-REVIEW-2026-11-18.md`. Haiku 5.5, 16 cases, [US$ redacted]

All three arms (`clonalwait`, `stigwait`, `manager`) solved 16 of 16 and passed the hold-out 16 of 16. H-LI54 and H-LI55 **inconclusive** (0 to 0: ceiling). Clonal selection cost about 1.6 times stigwait's output tokens. **Replication:** `stigwait` again solved 16 of 16 with 0 hold-out failures on fresh seeds, confirming LI16; against the manager (exploratory) fewer tokens in 16 of 16 and fewer act waves 14 to 1.
