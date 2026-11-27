# LI8 report: the geometry result on a second model, at 5 and 12 modules (2026-11-17)

Preregistration: `tasks/LI8-HAIKU-CAPACITY-PREREG.md` (registered before the LI7 review; its registered scoring is the LI7 checker, and the strict directed check adopted after that review is reported alongside). Data: `results/li8-haiku-capacity-k12/` and `results/li8-haiku-capacity-k5/` (`analysis.json` registered, `strict/analysis.json`, `holdout.json`, raw waves, `state.json`); verdicts `verdicts.json` (`analyze-li8.mjs`). Claude Haiku 5.5, Message Batches API, 0 failed requests, [US$ redacted] for both sizes.

10 cases per size, 6 act rounds, same members and arms as LI7.

| Arm | Solved k = 5 (registered / strict) | Solved k = 12 | Failing symmetric / directed at the end, k = 12 (strict) | Output tokens per case, k = 12 | Hold-out of solved cases |
|---|---|---|---|---|---|
| sync | 0 / 0 | 0 / 0 | 96 / 6 | 106,519 | n/a |
| inhibit | 6 / 1 | 4 / 0 | 4 / 46 | 51,491 | all pass |
| chat | 0 / 0 | 0 / 0 | 100 / 1 | 105,625 | n/a |
| **routed** | **10 / 10** | **10 / 10** | **0 / 0** | 55,097 | 20 of 20 pass |
| solo | 10 / 10 | 10 / 10 | 0 / 0 | 13,290 | 20 of 20 pass |

## Verdicts

| Hypothesis | Verdict | Evidence |
|---|---|---|
| H-LI22 past capacity the router beats one agent | **refuted** | at 12 modules one Haiku with every specification solved 10 of 10 on its first call; 12 modules are not past its capacity on this task |
| H-LI23 below capacity one agent is enough | **supported** | k = 5: solo 10, routed 10 |
| H-LI24 the geometry result transfers to a second model | **supported** | pooled over both sizes, routed resolved 140 symmetric edges that chat left failing, chat 0 that routed left (p < 1e-40); 16 directed edges that inhibit left, the reverse 0 (p < 0.0001) |

Per case, `routed` ended below `chat` in 20 of 20 and below `inhibit` in 19 of 20 (one tie).

## What it shows

1. **The LI7 pattern replicates on Haiku.** Free conversation and simultaneous repair never finish, because a symmetric edge oscillates whenever both sides act: both sides changed and the edge still failed in 600 of 600 (chat) and 590 of 590 (sync) occasions at k = 12, and 240 of 240 and 235 of 235 at k = 5. Silent inhibition leaves directed edges failing (46 at k = 12) because the side holding the turn is often the caller, who cannot change the helper; it worked around wrong helpers, which the registered checker passed and the strict one does not (registered 4 and 6 solved, strict 0 and 1). The router, which gives symmetric edges to one side and directed edges to both with messages, solved every case at both sizes, at the cost of silent inhibition and half the cost of conversation.
2. **One agent with every specification still matches it** at a quarter of the tokens: the task fits one Haiku up to 12 modules. Whether a team is needed, and how bio-inspired coordination compares with the coordination the market ships at the same N, are LI9 (manager agent, 5 and 12 modules) and LI10 (40 and 80 modules).

## Limits

One model family (Claude), planted-coupling code tasks, 10 cases per size. The registered scoring is the LI7 checker; the strict scoring changes only `inhibit`. Edges within a case are not independent; the per-case sign tests carry the same conclusions.
