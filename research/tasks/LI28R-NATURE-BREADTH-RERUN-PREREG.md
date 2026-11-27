# LI28R preregistration: LI28 rerun on fresh seeds with a working study cap (2026-11-19)

**Status:** registered 2026-11-19 before any LI28R data. Same design, arms and hypotheses (H-LI79 to H-LI83) as `tasks/LI28-NATURE-BREADTH-HARD-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI28R.json`; sweep 5, in parallel with LI30 (rule 9).

**Why a rerun.** LI28 stopped at its study cap before wave 2 (exit 3, incomplete, no verdicts): the cap was checked on the full reserve of a wave, which runs about 6 times above actual spend, so a [US$ redacted] cap refused a wave expected to cost under [US$ redacted] Its wave 0 and 1 data were not analysed. The runner now checks the cap on expected spend (the reserve times the run's own spend-to-reserve ratio so far, with a 1.5 margin), and the cap is no longer part of the configuration hash, so it can be raised on resume. LI28's hypotheses move to LI28R unchanged; LI28 is recorded as aborted.

**Changes from LI28.** Seeds 28900 to 28911 (12 cases, 80 modules); cap [US$ redacted] Nothing else.

**Amendment (2026-11-19, after the run):** the run stopped once before wave 6 on a false cap alarm (expected [US$ redacted] actual 1.27); the cap in the spec was raised from 14 to 16 to resume the last wave. The resume was clean (LI28R review) and total spend was [US$ redacted] under the registered 14.
