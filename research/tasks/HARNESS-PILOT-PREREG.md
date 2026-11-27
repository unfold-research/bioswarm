# Harness pilot: three arms on one OpenBot agent (preregistration, 2026-11-12)

Division: Harness (`programs/harness.md`). Hypotheses touched: H-H01 and H-H03. H-H02 only qualitatively. Written before any run.

## Purpose

This pilot checks the machinery of the paired comparison before the 10 to 15 task study in `experiments/openbot-unfold-mode/README.md`:
- switching arms through OpenBot's Local scripts API;
- fresh fixtures per run;
- acceptance checks the agent never sees;
- cost read from OpenBot's own usage records.

It is **not** a test of the hypotheses. Three tasks with one run per arm cannot support a claim.

## Agent and arms

One OpenBot agent, "Void Local" (`agent-…`), on the owner's Mac. Model `gpt-6.1-sol`, reasoning effort medium, the owner's ChatGPT sign-in. The arms:

| Arm | Provider | Unfold marker |
|---|---|---|
| C | `codex`, model `gpt-6.1-sol` | n/a |
| P | `pi`, model `openai/gpt-6.1-sol` | absent |
| U | `pi`, model `openai/gpt-6.1-sol` | present, defaults ([US$ redacted] per request, 1 message, 600 characters) |

Before each run: set the provider through the API, set or remove the marker, then "New chat". The new chat restarts the agent's process, so the marker is read again.

## Tasks (real gaps in the lab's own repositories)

Each run gets a fresh copy of the repository at a fixed commit, in `<agent folder>/work/<task>-<arm>`, as its own git repository. The prompt names that folder, asks the agent to work only there and not to message other agents, and asks for a short summary at the end. The acceptance checks live in `experiments/openbot-unfold-mode/pilot/checks/` and are never copied into the fixture.

| Task | Source (commit) | Prompt, in short | Accepted when |
|---|---|---|---|
| T1 docker | `unfold-ai-labs/unfold` `0cd9a55` | The two Dockerfiles do not copy every script that `index.html` loads. Fix them | Every local script in `index.html` (outside `node_modules/`) is copied by both `Dockerfile` and `deploy/Dockerfile.runtime`, by name, by glob or by its folder. `node scripts/check.cjs` passes |
| T2 decline | `unfold-ai-labs/unfold` `0cd9a55` | The router should treat the short replies "Agora não." and "Depois." to a pending proposal as a decline, locally, without a model | `pendingReply` returns `decline` for "Agora não.", "agora não", "Depois." and "depois". It returns null for "Agora não, mas como funciona?" and "Depois eu vejo, mas antes me explica". `node --test tests/decision-router.test.cjs` passes |
| T3 byAgent | `unfold-ai-labs/research` `08b76fc` | `internal/openbot-case/f1-analyze.cjs` should add a `byAgent` section: per agent, turns and cost | Run on a fixed copy of the owner's OpenBot database, the report has `byAgent`, an array or object with one entry per agent. Its turns sum to `coverage.turns` and its costs to `coverage.totalCostUsd` within [US$ redacted] The script still writes `f1-report.json` |

## Order

The order was drawn before the runs, one permutation per task: T1 U, C, P; T2 P, U, C; T3 C, P, U.

## Measures per run

- Accepted (the check script).
- Cost: OpenBot's `estimated_cost_usd` summed over the run's usage records, plus the extension's own run cost in arm U.
- Wall time.
- Tool calls: the extension's log in arm U, and OpenBot's turn record.
- Rule firings in arm U.
- Whether the agent messaged another agent.

## Stopping and spending

- One run per arm per task, nine runs in all.
- A run that waits more than 15 minutes is stopped and counted as not accepted.
- The model calls go through the owner's ChatGPT subscription, so there is no API spend.
- If a run needs a person (a question or an approval), it is answered "proceed only inside the work folder". Anything outside the folder is declined.

## What would change the plan

- **The machinery fails** (the switch, the marker, the cost reading): fix it before the study.
- **Every arm accepts every task:** the tasks are too easy to separate arms, and the study needs larger ones.
- **Arm U's rules never fire:** the study needs tasks where they can, such as long tasks for the ceiling and tasks with a second agent for the messages.
