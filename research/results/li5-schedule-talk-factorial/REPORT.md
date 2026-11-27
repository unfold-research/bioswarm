# LI5 report: what conversation adds on a shared schedule, and whether a typed request carries it (2026-11-17)

Preregistration: `tasks/LI5-TALK-FACTORIAL-PREREG.md`. Analysis: `analysis.json` (corrected script, with sign tests). Haiku 5.5, 9 waves, 0 failed requests. **Cost [US$ redacted] against a registered study cap of [US$ redacted]**: the runner enforced the per-wave and global caps but not the study cap; the overrun ([US$ redacted]) is disclosed here and LI6 is watched per wave.

24 cases (96 and 192 items, 12 each), shared round 0, 8 rounds; no arm solved a case.

| Arm | Median final violations (96 / 192) | Mean violations by round (0→8) | Output tokens per case | Messages or requests per case |
|---|---|---|---|---|
| sync | 29.5 / 41.5 | 91.5 → 36.0 | 412,027 | — |
| inhibit | 17 / 49 | 91.5 → 38.2 | 314,469 | — |
| chat | **14.5 / 33** | 91.5 → **25.3** | 517,877 | 228 messages |
| chatinhibit | 25 / 41.5 | 91.5 → 33.9 | 425,871 | 218 messages |
| ask | 18.5 / 51.5 | 91.5 → 32.1 | 411,536 | 188 typed requests |

Paired final violations, wins/losses for the first arm (sign test): chat vs sync 20/3 (p = 0.0005); inhibit vs sync 11/12 (p = 1); inhibit vs chat 5/19 (p = 0.007); chatinhibit vs chat 4/20 (p = 0.002); chatinhibit vs inhibit 14/9 (p = 0.40); ask vs chat 9/14 (p = 0.40); ask vs inhibit 17/7 (p = 0.064).

## Verdicts (as registered)

| Hypothesis | Verdict |
|---|---|
| H-LI11 talk helps on a schedule (chat below sync in at least 16 of 24) | **supported** (20 of 24); replicates LI2 (18 of 24) |
| H-LI12 talk and inhibition add | **refuted**: messaging with inhibition is worse than messaging alone in 20 of 24 |
| H-LI13 a typed request carries what talk carries | **inconclusive**: `ask` at or below `chat` in 10 of 24 (12 needed), at 0.79 times its tokens (0.75 needed) |

## Reading

- On directed dependencies, both sides acting and talking is the best of the five. Telling one side to hold while still letting it talk loses most of the gain: what the conversation buys here is two parties moving toward each other, which inhibition forbids.
- Typed requests left on the field ("W90: start at or after week 32") recovered part of the gain over silent inhibition (17 of 24, p = 0.064) but did not reach free messaging; they were combined with inhibition, which LI5 itself shows is the wrong rule for directed conflicts. A typed request without inhibition was not tested.
- With LI3 (colouring), the pattern across studies is that the right protocol depends on the geometry of the conflict. LI6 tests a router built on that.
