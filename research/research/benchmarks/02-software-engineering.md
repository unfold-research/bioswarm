# 02 — Software-engineering benchmarks for swarm vs single-agent studies

Date of study: 2026-11-12. Scope: benchmarks with an objective check (tests) on real or realistic repositories, and the published evidence on multi-agent coding systems. Written for the Void programme (`programs/historical/void.md`).

**How to read this file**

- Every number was read at the linked source on the study date, unless the line says **UNVERIFIED** (seen only in a search snippet, a third-party aggregator, or inferred by me).
- **ESTIMATE** marks my own arithmetic. No paid call was made and no dataset or image was downloaded, so every cost for our own runs is an estimate.
- Leaderboards load their tables by script; several could not be read (SWE-bench-Live, Terminal-Bench official, Commit0, SWE-PolyBench, Multi-SWE-bench). Where that happened it is said.
- Third-party aggregator pages (benchlm, benchmarklist, codesota, marc0 and similar) disagreed with primary sources often. They are not used for scores except where flagged.

---

## 1. Summary

1. **No public benchmark was built for "one agent cannot hold the problem, several agents in parallel can".** The closest are CooperBench (parallel features in one repository, merged and tested together) and the long-horizon family (FeatureBench, SWE-EVO, RoadmapBench, Commit0), which are large enough to strain one context but give no decomposition.
2. **The single-issue benchmarks are the wrong instrument for us.** SWE-bench Verified is saturated and contaminated (top bash-only score 76.8% in the data file; OpenAI stopped reporting it). SWE-bench Pro was judged "Flawed" by Epoch AI after three audits found roughly 30% or more broken tasks; a cleaned V2 (642 tasks) exists. Both have one issue per task with small patches: little to parallelise.
3. **Published evidence on coding favours the single agent at matched budget.** The only token-matched comparison that includes SWE-bench Verified found every multi-agent architecture slightly worse (−2.1% to −14.9%). CooperBench found two cooperating agents about 40% less successful than one agent doing both features. The positive reports (Anthropic's C compiler, Cursor's browser) have no single-agent control and no matched budget.
4. **A [US$ redacted] study buys about 100 task-runs with a small model or about 30 with a mid model per arm, at three arms.** That gives a confidence interval of roughly ±10 to ±17 points on a pass rate. Only large effects are detectable; graded scores (fraction of tests passed) and paired analysis are needed to do better.

---

## 2. Comparison table

Cost columns are per task for a strong single agent, from the cited leaderboard. "Decomposable" answers: can several agents work at once on one task without the benchmark being bent?

| Benchmark | Tasks | Check | Cost per task (source) | 2026 status | Decomposable | Fit for Void |
|---|---|---|---|---|---|---|
| SWE-bench Verified | 500 (12 Python repos) | Hidden FAIL_TO_PASS + PASS_TO_PASS tests | [US$ redacted] mini-SWE-agent; Claude 4.5 Opus 0.75, Haiku 4.5 0.33, GPT-5 mini 0.05, MiniMax M2.5 0.07 | Saturated, contaminated | No | Calibration only |
| SWE-bench Lite | 300 | Same | No cost column | Stale; known leaked patches | No | No |
| SWE-bench Multimodal | 617 (17 JS repos) | Tests; issues carry images | No cost column | Top 36% in data file; little activity since 2025 | No | No |
| SWE-bench Multilingual | 300 (ESTIMATE from total ÷ per-instance cost) | Tests | [US$ redacted]; Claude 4.6 Opus 0.66 | Top 72.7% | No | No |
| SWE-bench-Live | 1,319 at release; +50/month planned | Tests, auto-built images | Not published | Leaderboard unreadable; last dataset news Aug 2025 | No | Fresh control, if alive |
| SWE-rebench | 111 in latest window (65 repos) | Tests | [US$ redacted]; 0.6–5.5 M tokens | Fresh by design; top 64.5% | No | Best fresh single-issue control |
| SWE-bench Pro | 1,865 (731 public v1; 642 public V2) | Hidden tests | Not published | v1 judged Flawed; V2 not yet audited | Weakly (4.1 files average) | Control, V2 only |
| SWE-Lancer | 1,488 (Diamond 502; runnable offline 198 IC) | Playwright end-to-end tests | Not published | Old models only; repo archived, moved | No | No (14 GB per task) |
| Commit0 | 54 libraries (lite 16) | Library's unit tests, graded | Lite, Claude 3.5 Sonnet: [US$ redacted] → 99.39 by stage | Likely memorised; current scores UNVERIFIED | Yes, by module | Yes, with caveats |
| DevBench (DevEval) | 22 repos, 4 languages (count UNVERIFIED) | Unit + acceptance tests, plus LLM judge for design | Not published | Dormant | Partly | No |
| ProjDevBench | 20 projects (C++) | External online judge 80% + LLM review 20% | 4.81 M tokens, 138 turns per problem | Not saturated (27% accepted) | Partly | No (external judge) |
| RepoBench | Line completion | Exact match, edit similarity; no tests | Negligible | 2024 data | No | No |
| Terminal-Bench 2.0 | 89 | Pytest in container | [US$ redacted]; 0.22–2.5 M tokens; 7–11 min | Vals: saturated, archived June 2026 | Mostly no | No |
| MLE-bench | 75 Kaggle (lite 22) | Kaggle medal thresholds | 24 h, 36 vCPU, 440 GB RAM, A10 GPU per run | Leaderboard closed Apr 2026; top 64% | Search-style parallelism | No (hardware) |
| PaperBench | 20 papers, 8,316 rubric leaves | LLM judge on rubric | [US$ redacted] rollout + 66 grading per paper | Low scores, but judge-graded | Yes in principle | No (cost, judge) |
| CORE-Bench Hard | 45 | Reported values vs reference | [US$ redacted] per task (total 65–510) | Declared solved by HAL | No | No |
| SWE-PolyBench | 2,110 (PB500, Verified 382) | Tests | Not published | Leaderboard unreadable | No | No |
| Multi-SWE-bench | 1,632 (mini 400, flash 300) | Tests | Not published | Scores UNVERIFIED | No | No |
| **CooperBench** | 652 feature pairs, 12 repos, 4 languages (lite; flash 50) | Both features' hidden tests on the merged patch | Not published | Solo ≈ 2× coop; not saturated | **Yes, by design** | **Best fit** |
| **FeatureBench** | 200 (fast 100, lite) | Tests, %passed and %resolved | Not published | Top resolved 46.7% (lite) | Not given, tasks span several PRs | **Good** |
| **SWE-EVO** | 48 releases, 7 Python repos | 874 tests per task; resolved and fix rate | Not published | Best 25% | Not given, up to ~15 PRs per task | **Good, small n** |
| RoadmapBench | 115 version upgrades, 17 repos, 5 languages | Subtask tests | Not published | Top 39% (aggregator, UNVERIFIED) | Yes, multi-target roadmap | Watch; repo not found |
| STALE | 417 Django PR pairs + 36 constructed | Tests on combined patches | Not published | New (Sep 2026) | Yes (pairs) | Watch |
| TeamBench | 851 templates | Deterministic grader, OS-enforced roles | Not published | New (May 2026) | Role split, not parallel work | Watch |
| Senior SWE-bench | ~95 | Tests + LLM "taste" judge | [US$ redacted] (output tokens only) | Top 34.7% tasteful | No | No |
| FrontierCode | 150, private | Maintainer rubric | Not published | Private | — | Not runnable |
| DeepSWE | 113, 91 repos (UNVERIFIED) | Program verifiers | Not published | Top 70% (UNVERIFIED) | No | Not studied |

---

## 3. Benchmark notes

### 3.1 SWE-bench family

**SWE-bench Verified.** One GitHub issue per task; the agent edits the repository; hidden tests decide. 500 tasks from 12 Python repositories, 231 of them Django ([Willison, Feb 2026](https://simonwillison.net/2026/Feb/19/swe-bench/)).

- *Cost.* The official data file ([leaderboards.json](https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json), latest entry 2026-02-26 when read) carries cost per instance for 44 mini-SWE-agent runs:

| Model (mini-SWE-agent) | Resolved | US$ per instance | Model calls |
|---|---|---|---|
| Claude 4.5 Opus (high) | 76.8% | [redacted] | 32.9 |
| Gemini 3 Flash (high) | 75.8% | [redacted] | 56.1 |
| MiniMax M2.5 (high) | 75.8% | [redacted] | 60.5 |
| Claude 4.6 Opus | 75.6% | [redacted] | 28.9 |
| Claude 4.5 Sonnet (high) | 71.4% | [redacted] | 48.3 |
| Kimi K2.5 (high) | 70.8% | [redacted] | 51.2 |
| Claude 4.5 Haiku (high) | 66.6% | [redacted] | 66.2 |
| GPT-5 mini (medium) | 59.8% | [redacted] | 14.5 |
| GPT-5 nano | 34.8% | [redacted] | 39.8 |

- The Princeton HAL board runs a 50-task subset and reports far higher totals with SWE-Agent ([US$ redacted] for 50 tasks with Sonnet 4.5 High, about [US$ redacted] per task), with a notice that costs are overstated by up to 2× and exclude caching ([HAL](https://hal.cs.princeton.edu/swebench_verified_mini)). Harness choice moves cost by an order of magnitude.
- *Contamination and saturation.* OpenAI stopped reporting Verified in February 2026 after auditing 138 tasks it kept failing: 59.4% had flawed tests, and three frontier models reproduced gold fixes from memory. I could not open the post (HTTP 403); figures are from secondary reports ([Decrypt](https://decrypt.co/359012/openai-benchmark-measure-ai-coding-supremacy-contaminated)). **UNVERIFIED at source.** Vendor-harness scores above 85–95% circulate on aggregators; **UNVERIFIED**.
- *Decomposable.* No. One issue, usually one or two files.
- *Infrastructure.* Docker, x86_64 images. The setup guide asks for 120 GB free disk, 16 GB RAM, 8 cores; "env" cache level ≈ 100 GB, "instance" level ≈ 2,000 GB ([guide](https://www.swebench.com/SWE-bench/guides/docker_setup/)). Behaviour on Apple Silicon: **UNVERIFIED**; plan to run on the Linux server.
- *Licence.* MIT for the harness (**UNVERIFIED**, not read at source).
- *Anthropic API.* Yes: mini-SWE-agent runs any model through litellm ([docs](https://mini-swe-agent.com/latest/)), and the board lists Claude runs.

**SWE-bench Lite** (300). No cost column. Agentless reported 32% at [US$ redacted] per issue and built "Lite-S" after finding tasks with the exact patch or misleading text in the issue ([arXiv 2407.01489](https://arxiv.org/abs/2407.01489)). Top entries date from mid-2025. Not worth using.

**SWE-bench Multimodal** (617 tasks, 17 JavaScript repositories, images in the issue; [arXiv 2410.03859](https://arxiv.org/abs/2410.03859)). Top 36% in the data file, last entries November 2025. Needs vision; no parallel structure.

**SWE-bench Multilingual.** 13 mini-SWE-agent entries dated February 2026: Gemini 3 Flash 72.7% at [US$ redacted]; Claude 4.6 Opus 72.0% at [US$ redacted]; GPT-5 mini 39.7% at [US$ redacted]

**SWE-bench-Live** (Microsoft). 1,319 issues from 93 Python repositories created January 2024 to April 2025; environments built by an agent pipeline (RepoLaunch); lite split 300; plan of 50 new verified issues per month. Best result at release 19.25%, with the same agent at 43.2% on Verified ([arXiv 2505.23419](https://arxiv.org/html/2505.23419v2)). The site lists Multi-Language and Windows splits, its leaderboard failed to load, and its last dataset news is August 2025 ([site](https://swe-bench-live.github.io/)). Whether monthly updates continue: **UNVERIFIED**. Licence not stated.

**SWE-rebench** (Nebius). Rolling windows of fresh issues; the window read covers 15 May to 1 July 2026, 111 problems from 65 repositories. The board gives resolved rate with an error term, cost per problem, tokens per problem, Pass@5 and cached-token share ([swe-rebench.com](https://swe-rebench.com/)):

| System | Resolved | US$ per problem | Tokens per problem |
|---|---|---|---|
| Fable 5 [high] | 64.5 ± 1.41 | [redacted] | 2.5 M |
| GPT-5.6 Sol [medium] | 62.3 ± 1.83 | [redacted] | 0.6 M |
| Claude Code (agent) | 60.4 ± 1.03 | [redacted] | 3.3 M |
| Sonnet 5 [high] | 56.8 ± 0.94 | [redacted] | 4.6 M |
| Cursor (agent) | 51.7 ± 0.84 | [redacted] | 1.8 M |

  This is the best source for realistic 2026 token counts: **0.6 to 5.5 million tokens per issue**, most of them cached input. Images are on Docker Hub under `swerebench`. Licence not stated. Harness not named on the page.

### 3.2 SWE-bench Pro (Scale AI)

- *Task.* Issue resolution on larger, less common repositories. 1,865 tasks in 41 repositories: 731 public (11 GPL repositories), 276 commercial (18 private startup codebases), 858 held out. Gold patches average 107.4 lines over 4.1 files; Python, Go, JavaScript, TypeScript ([arXiv 2509.16941](https://arxiv.org/html/2509.16941)).
- *Scoring.* Hidden fail-to-pass and pass-to-pass tests. Task text is human-augmented with requirements and interface. Without that augmentation GPT-5 fell from 25.9% to 8.4%: the tests reject valid solutions with a different structure. This is the root of the later audit findings.
- *Results.* Scale's public board: top 61.5%, GPT-5.4 xHigh 59.1%, Claude Opus 4.6 51.9%, Claude 4.5 Haiku 39.5%, with ±3.5-point intervals ([board](https://labs.scale.com/leaderboard/swe_bench_pro_public)). Most entries ran with 250 turns and no cost cap; greyed entries ran with 50 turns and a cap. No cost column.
- *Status.* Epoch AI rated it **Flawed** on 1 September 2026 ([review](https://epoch.ai/benchmarks/swe-bench-pro/review)): one audit found issues in 83 of 100 sampled tasks; Datacurve measured 24% false negatives and 8.5% false positives; OpenAI estimated about 30% broken tasks in July 2026 and, according to press reports, withdrew its recommendation ([The Decoder](https://the-decoder.com/openai-finds-roughly-30-percent-of-popular-ai-coding-test-is-broken/); **UNVERIFIED at source**). Poolside documented reward hacking in the environment.
- *V2.* The repository now defaults to a "validated public split" of 642 tasks plus a HARD-51 subset, packaged as Harbor tasks with public images on GHCR; the changelog entry is dated "9/22" without a year ([repo](https://github.com/scaleapi/SWE-bench_Pro-os)). No independent audit of V2 was found.
- *Decomposable.* Weakly. Four files on average, one behaviour.
- *Infrastructure.* Modal recommended; local Docker "in beta". Image sizes not stated.
- *Licence.* MIT. *Anthropic API.* Yes (a `claude.yaml` config ships; mini-SWE-agent supported).

### 3.3 SWE-Lancer (OpenAI)

- *Task.* 1,488 paid Upwork tasks on the Expensify app: 764 engineering tasks ([US$ redacted]) and 724 "manager" tasks choosing between proposals. Public Diamond split: 502 tasks (237 engineering, 265 manager) ([arXiv 2502.12115](https://arxiv.org/html/2502.12115)).
- *Scoring.* Playwright end-to-end browser tests, hidden. Rollouts capped at 100 tool calls and 3 hours, no internet.
- *Results.* Claude 3.5 Sonnet 26.2% on Diamond engineering tasks. GPT-4o with six attempts matched o1 with one (16.5%): repeated sampling is a strong baseline. No 2026 leaderboard found.
- *Infrastructure.* Repository archived July 2025 and merged into `openai/preparedness`. Only 198 of the 237 engineering tasks run offline. Each task image takes 10–20 minutes to build and about 14 GB. Internet blocking uses iptables and works on Linux only ([repo](https://github.com/openai/preparedness/tree/main/project/swelancer)).
- *Cost.* Not published.
- *Decomposable.* No. *Anthropic API.* Only through OpenRouter; the harness lists OpenAI and OpenRouter.
- *Verdict.* One repository, heavy images, slow browser tests, stale. Skip.

### 3.4 Repository-from-scratch benchmarks

**Commit0.** Rebuild a Python library from its specification and its unit tests. 54 libraries; lite split 16. Specifications run from 10,000 to 300,000 tokens, so the problem does not fit one prompt on the larger libraries ([arXiv 2412.01769](https://arxiv.org/html/2412.01769)).

- *Scoring.* Fraction of the library's unit tests passed. The tests are visible to the agent: they are the interactive feedback. There is no hidden set.
- *Cost.* Paper, lite split, Claude 3.5 Sonnet: stage 1 (draft modules) 17.8% for [US$ redacted]; stage 2 (lint) 18.8% for [US$ redacted]; stage 3 (test feedback) 29.3% for [US$ redacted] OpenHands reached 42.95% on lite. Cost grows 60× between stages: the test-feedback loop is where money goes.
- *Decomposition.* The paper's ablations are the useful part. Filling by module beat filling by function (17.8 vs 12.4). Random module order (22%) beat import order (17%), so drafting modules is close to order-independent: a natural parallel split. Unit tests run per module.
- *Contamination.* These are popular public libraries. The paper found functions either reproduced almost verbatim or written differently, and argued low scores make memorisation minor. That argument is from 2024. Current scores could not be read (the leaderboard page did not render); one aggregator lists 88.2 on lite, **UNVERIFIED**.
- *Infrastructure.* Per-library Docker images; evaluation defaults to Modal, local Docker supported; 1,800 s test timeout. Only aider is supported as an agent, so our arms would need their own driver ([repo](https://github.com/commit-0/commit0)).
- *Licence.* MIT. *Anthropic API.* Yes (default model is a Claude model through aider).

**DevBench / DevEval** ([arXiv 2403.08604](https://arxiv.org/abs/2403.08604)). Full lifecycle from a requirements document: design, environment setup, implementation, acceptance and unit tests, in four languages. The 22-repository count is from memory, **UNVERIFIED**. Design stages are judged by an LLM. No activity found in 2025–2026. Skip.

**ProjDevBench** ([arXiv 2602.01655](https://arxiv.org/html/2602.01655)). 20 course-style projects, mostly C++, in 8 categories. Score is 80% online-judge tests plus 20% LLM code review. Agents averaged 138 turns and 4.81 million tokens per problem (0.42 M to 13.3 M). Best system 77.85 points; 27.4% of submissions accepted. Submissions go to an external judge with a token; whether outsiders can obtain one is not stated. Twenty tasks and an outside dependency make it unusable for a small controlled study.

**RepoBench** ([repo](https://github.com/Leolty/repobench)). Next-line completion with cross-file context, scored by exact match and edit similarity. No execution, 2024 data. Not an agent benchmark.

### 3.5 Long-horizon, multi-file, multi-PR

**FeatureBench** (ICLR 2026; [arXiv 2602.10975](https://arxiv.org/abs/2602.10975), [repo](https://github.com/LiberCoders/FeatureBench)).

- *Task.* Implement a feature traced from unit tests through the dependency graph; tasks can span several commits and PRs. 200 tasks from 24 repositories, 3,825 environments. A "fast" split of 100 needs no GPU; a "lite" split feeds the leaderboard.
- *Scoring.* Tests; both fraction passed and fully resolved.
- *Results.* Paper: Claude 4.5 Opus 11.0%. Repository board (lite): Claude Opus 4.7 with OpenHands 78.2% passed, 46.7% resolved; GPT-5.5 69.8% and 26.7%.
- *Cost.* Not published. Under a tight context window a local model resolved 2–5 of 183 tasks ([arXiv 2608.26218](https://arxiv.org/html/2608.26218)), which shows the tasks are context-heavy.
- *Contamination.* Generated by an automatic pipeline that can be re-run on new code; no schedule stated.
- *Infrastructure.* Docker; gold-patch evaluation of a fast-split task takes 57 s on a large Xeon. Image sizes not stated.
- *Licence.* MIT. *Anthropic API.* Yes: Claude Code, OpenHands and mini-SWE-agent are supported harnesses.
- *Decomposable.* Not given. A feature across several files is a plausible split, but the split is ours to make.

**SWE-EVO** ([arXiv 2512.18470 v6](https://arxiv.org/html/2512.18470v6)).

- *Task.* Evolve a codebase from one release to the next, guided by release notes. 48 tasks in 7 Python projects, but 26 are dvc and 8 dask. Gold patches average 20.9 files and 610 lines; the codebase averages 363 files and 78,000 lines.
- *Scoring.* 874 tests per task on average (81 fail-to-pass). Resolved rate is all-or-nothing; fix rate is the fraction of fail-to-pass tests fixed, zero on any regression.
- *Results.* Best 25% (GPT-5.4). GPT-5.2 scores 22.9% here and 72.8% on Verified. Tasks nobody solved link 14.8 PRs on average; the easiest group 1.7.
- *Cost.* Not published. Agents were capped at 100 iterations.
- *Decomposable.* The release is made of several PRs, but the benchmark gives no breakdown and scores only the final state. A planner must find the split.
- *Licence.* Not stated. *Anthropic API.* Runs through OpenHands and SWE-agent, both model-agnostic (inferred).
- *Weakness.* n = 48 with more than half from one repository. A dvc-specific trick moves the score.

**RoadmapBench** (arXiv 2605.15846). 115 version upgrades in 17 repositories and 5 languages, median change 3,700 lines over 51 files, graded per subtask; top resolved 39.1%. Read only on an aggregator ([benchmarklist](https://benchmarklist.com/benchmarks/roadmapbench/)); no repository found. **UNVERIFIED.** If it is released, its multi-target roadmap with per-subtask grading is the best-shaped long-horizon task for a swarm.

### 3.6 Benchmarks built for parallel or collaborative coding

**CooperBench** (Stanford and SAP; [arXiv 2601.13295](https://arxiv.org/html/2601.13295v2), [repo](https://github.com/cooperbench/CooperBench)).

- *Task.* Two agents get two different features on the same repository state. Features come from pools of 2 to 12 compatible features adapted from real PRs. 652 feature pairs, 12 libraries, Python, TypeScript, Go and Rust. Features are small: 52 changed lines and 1.4 files on average. 77% of pairs have gold solutions that conflict textually.
- *Scoring.* Patches are merged (git merge-file, then union merge, then a small trained resolver). Both features' hidden test suites must pass on the merge.
- *Baseline built in.* "Solo": one agent implements both features. This is the control we need.
- *Results.* Successes pooled over five models: solo 1,039, coop 558 (retention 0.59). GPT-5 315 → 183; Claude Sonnet 4.5 307 → 168. More agents is worse: 68.6% with 2, 46.5% with 3, 30.0% with 4, on a 46-task subset. Removing the messaging tool did not change success; messages took up to 20% of steps. Failures: overlapping work 33%, divergent architecture 30%.
- *Budget.* Each agent has 100 actions, so the cooperating pair can take up to 200 actions against the solo agent's 100 (as I read the setup): the paper matches workload, not tokens. No cost figures.
- *Infrastructure.* `pip install cooperbench`; back-ends Modal, GCP or local Docker; default agent mini-SWE-agent; settings `solo`, `coop` and `team` (lead plus members with shared task list and scratchpad); Redis messaging that can be switched off; optional shared git remote. Subsets `lite` and a 50-pair `flash`.
- *Licence.* MIT. *Anthropic API.* Yes (key in `.env`).
- *Limits for us.* The features are small enough for one context, so it measures the price of coordination, not the gain from splitting a problem that is too big. It can be stretched: give k features from one pool (k = 4 to 8) to one agent or to k agents. Pools go up to 12.

**STALE** ("Passes Alone, Fails Together", [arXiv 2609.25396](https://arxiv.org/html/2609.25396v1)). Measures failures that appear only when two individually correct patches are combined. In 417 real Django PR pairs it found interference in 1 of 834 runs; in 36 constructed cases 97%, and a 130-token note about the peer's change repaired 82%. The reading: semantic conflict between independent PRs is rare in the wild and easy to plant. Code at `illinoisdata/STALE-bench`; licence not stated.

**NP-Bench** ([arXiv 2610.07261](https://arxiv.org/abs/2610.07261)). Nine scenarios, three arms (no coordination, reactive detection, proactive planning). A planner raised clean integration from 1/9 to 9/9. Single-author preprint, tiny samples, no repository linked. Useful only as a design reference for arms.

**TeamBench** (arXiv 2605.07073). 851 templates with Planner, Executor and Verifier separated by operating-system permissions. Teams help weak solo models and do little for strong ones (Claude Opus 4.7: solo 35.6 or 49.2 depending on the passage, team 37.8). Read on an aggregator only; **UNVERIFIED**.

Not found: a maintained benchmark of merge-conflict resolution by agents, or of many agents on one large decomposable build with a shared test suite. BulkPR-Bench (arXiv 2608.02685) appeared in results but was not read.

### 3.7 Terminal, ML-engineering and research-replication benchmarks

**Terminal-Bench 2.0** ([arXiv 2601.11868](https://arxiv.org/html/2601.11868v1)). 89 containerised command-line tasks picked from 229 submissions; pytest verification; about half take an expert under an hour, 4% take days. Agents may use the internet. All tasks and oracle solutions are public; the canary string is, in the authors' words, largely symbolic. Vals AI (Terminus 2 harness, 4 June 2026): GPT-5.5 73.2% at [US$ redacted] and 242 k tokens per task; Claude Opus 4.8 70.0% at [US$ redacted]; Claude Sonnet 4.6 59.6% at [US$ redacted]; 7–11 minutes per task. Vals archived it as saturated ([Vals](https://www.vals.ai/benchmarks/terminal-bench-2)). The official board did not render. Tasks are single-machine puzzles; not decomposable. Runs on the Harbor framework.

**MLE-bench** ([repo](https://github.com/openai/mle-bench)). 75 Kaggle competitions; lite 22. Standard run: 24 hours, 36 vCPUs, 440 GB RAM, one A10 GPU, three seeds. Data: 3.3 TB full, 158 GB lite. Top: 64.4% any-medal. Leaderboard closed to submissions on 24 April 2026. Leading systems are search trees over many candidate solutions, a form of parallelism, but the hardware and wall-clock are out of reach.

**PaperBench** ([arXiv 2504.01848](https://arxiv.org/html/2504.01848)). Replicate 20 ICML 2024 papers; 8,316 rubric leaves graded by an LLM judge (F1 0.83 against humans). About [US$ redacted] per 12-hour rollout and [US$ redacted] grading per paper; Code-Dev variant [US$ redacted] grading, about [US$ redacted] for a full run. Best 2025 score 26%. No tests; out of budget.

**CORE-Bench Hard** ([HAL](https://hal.cs.princeton.edu/corebench_hard)). Reproduce a paper's reported results from its code; 45 tasks. Claude Code with Opus 4.5 reached 77.8% for [US$ redacted] total, 95.5% after manual regrading; HAL declared it solved. The same model in HAL's own scaffold scored 42%: a 36-point harness effect on a fixed model.

### 3.8 Multilingual issue benchmarks

**SWE-PolyBench** (Amazon; [repo](https://github.com/amazon-science/SWE-PolyBench)). 2,110 tasks in Java, JavaScript, TypeScript and Python; PB500 (125 per language); Verified 382. Adds file and node retrieval metrics. Images on GHCR. MIT. Leaderboard not readable.

**Multi-SWE-bench** (ByteDance; [repo](https://github.com/multi-swe-bench/multi-swe-bench)). 1,632 validated tasks in 7 languages; mini (400) and flash (300) subsets. Apache-2.0. Disk needs not stated.

Both are single-issue and add nothing for the swarm question beyond language coverage.

### 3.9 Closed or judged benchmarks, for completeness

- **Senior SWE-bench** (Snorkel; [post](https://senior-swe-bench.snorkel.ai/blog/2026-07-30-refresh)): about 95 tasks, three trials each, reports pass@1, pass@3 and pass^3 (all three pass), plus an LLM-judged "tasteful" rate. Top tasteful pass@1 34.7%. The pass^3 metric is worth copying.
- **FrontierCode** (Cognition; [post](https://cognition.com/blog/frontier-code)): 150 private maintainer-written tasks with rubric grading; top 13.4% on the hardest 50. Not runnable by us.
- **DeepSWE** (Datacurve): 113 tasks in 91 repositories, top about 70%. Search results only; **UNVERIFIED**.

---

## 4. Evidence: single agent against multi-agent on code

| Study | Compared | Budget rule | Result on coding |
|---|---|---|---|
| "Towards a Science of Scaling Agent Systems" ([arXiv 2512.08296](https://arxiv.org/html/2512.08296)) | One agent vs independent, centralised, decentralised, hybrid; 260 configurations, three model families | Matched total reasoning tokens (mean 4,800 per trial) and total iterations; teams get fewer iterations per agent | SWE-bench Verified (20 tasks): hybrid −2.1%, centralised −3.1%, decentralised −5.4%, independent −14.9% against a single-agent mean of 0.522. Terminal-Bench: independent +1.7%, centralised −19.2%. Above ~45% single-agent accuracy, more agents tend to hurt |
| CooperBench ([arXiv 2601.13295](https://arxiv.org/html/2601.13295v2)) | One agent doing two features vs two agents, one each | Same workload; 100 actions per agent, so the pair has more actions | Pair keeps 59% of solo successes; 2 → 3 → 4 agents: 68.6 → 46.5 → 30.0%; messaging does not help |
| Agyn ([arXiv 2602.01465](https://arxiv.org/html/2602.01465)) | Manager, researcher, engineer, reviewer vs single-agent leaderboard entries | None. No tokens or cost reported; baselines appear to be leaderboard figures | 72.2% vs 71.8% (OpenHands + GPT-5) and 65.0% (mini-SWE-agent + GPT-5 medium). A 0.4-point gap on 500 tasks is noise |
| MAST ([arXiv 2503.13657](https://arxiv.org/html/2503.13657)) | Failure analysis of MetaGPT, ChatDev, HyperAgent, Magentic-One and others | — | Failure rates 41% to 87%. Causes: system design 44%, inter-agent misalignment 32%, verification 24%. Better role prompts and a verification step gave ChatDev +9.4 and +15.6 points and left it low |
| MetaGPT, ChatDev (own papers) | Each against the other on self-made tasks | Tokens reported, not matched; no strong single-agent control | Cross-paper numbers conflict (search snippets only, **UNVERIFIED**) |
| Agentless ([arXiv 2407.01489](https://arxiv.org/abs/2407.01489)) | Fixed three-phase pipeline vs agents | Cost reported | 32% on Lite at [US$ redacted]: a pipeline with no agent loop beat the open-source agents of 2024 |
| mini-SWE-agent ([docs](https://mini-swe-agent.com/latest/)) | Bash-only loop | Cost reported per instance | Above 74% on Verified. The simplest loop is within a few points of elaborate scaffolds |
| Anthropic multi-agent research system ([post](https://www.anthropic.com/engineering/multi-agent-research-system)) | Lead + sub-agents vs single agent, internal research eval | Not matched: multi-agent used about 15× the tokens of a chat, single agents about 4× | +90.2% on research. Token use alone explained 80% of BrowseComp variance. The post says most coding tasks have fewer parallelisable parts and are a poor fit |
| Anthropic C compiler ([post](https://www.anthropic.com/engineering/building-c-compiler)) | 16 parallel Claude sessions, no orchestrator, lock files in git | No control arm | 100,000 lines of Rust, about 2,000 sessions, 2 billion input and 140 million output tokens, just under [US$ redacted] Parallelism stalled when all 16 agents hit the same bug; it worked once a GCC oracle made failures separable per file |
| Cursor ([post](https://cursor.com/blog/scaling-agents)) | Peers with a locked shared file, then optimistic concurrency, then planners + workers + judge | No control arm, no cost | Locks: 20 agents had the throughput of 2 or 3. Flat peers without hierarchy became risk-averse and churned. Planner/worker with isolated workers scaled to hundreds. An integrator role was removed as a bottleneck |
| Claude Code agent teams ([docs](https://code.claude.com/docs/en/agent-teams)) | Lead, teammates, shared task list with file locking, mailboxes | — | Vendor guidance: more tokens than one session, cost linear in teammates, 3–5 teammates, single session better for sequential work or same-file edits. Experimental; teammates do not spawn in non-interactive mode, which matters for a harness |
| "The Illusion of Multi-Agent Advantage" ([arXiv 2606.13003](https://arxiv.org/abs/2606.13003)) | Automatically designed multi-agent systems vs chain-of-thought with self-consistency | Cost reported | Multi-agent systems lost while costing up to 10× more. Whether SWE-bench Lite was among its tasks: **UNVERIFIED** |
| SWE-Lancer attempts ablation ([arXiv 2502.12115](https://arxiv.org/html/2502.12115)) | Weak model × 6 attempts vs strong model × 1 | — | GPT-4o pass@6 = o1 pass@1 |

What this adds up to:

1. **Nobody has published a token-matched, wall-clock-matched comparison of one deep agent, an orchestrator with workers, and a decentralised swarm on a coding benchmark large enough to overflow one context.** The matched study that exists used 20 Verified tasks, where one agent is already near 50%. This is the gap Void can fill.
2. **Where budgets were matched, teams lost or tied on code.** Where teams "won", budgets were not matched or there was no control.
3. **The successes share three conditions:** work that splits into units with separate failure signals; a strong external oracle (compiler test suites, GCC, CI); and workers that do not talk to each other. This matches our own LAB-003 and LAB-004 results (partition helps at k ≥ 3; a board is matched by a central dispatcher).
4. **Harness effects are as large as the effects we want to measure.** CORE-Bench: 42% to 78% for one model across two scaffolds. Any arm comparison must share one tool set, one prompt base and one model.
5. **Independent retries are a strong rival.** A study without a "k independent attempts, pick by tests" arm cannot attribute a gain to coordination.

---

## 5. Recommendations

### (a) Shortlist for a small lab

Assumptions for cost. Small model: about [US$ redacted] per Verified-sized task (GPT-5 mini 0.035–0.047, MiniMax M2.5 0.073 on the official board). Mid model: about [US$ redacted] (Claude 4.5 Haiku 0.33, Claude 4.5 Sonnet 0.66). Current Anthropic models must be re-priced before a run; the SWE-rebench column suggests 2026 mid and top models spend [US$ redacted] per issue in vendor harnesses. All totals below are **ESTIMATES**.

The simplest way to stay in budget is a hard cap per task that is identical for every arm: total ≤ tasks × arms × cap.

| Rank | Benchmark and subset | Why | Smallest usable n | Small model (ESTIMATE) | Mid model (ESTIMATE) |
|---|---|---|---|---|---|
| 1 | **CooperBench**, `flash` 50 pairs, then `lite`; plus a k-feature variant (k = 4–8 from one pool) | Only maintained benchmark with parallel work, merge and a one-agent control in the harness. MIT, local Docker, mini-SWE-agent, Anthropic key | 50 pairs × 3 arms; a pair ≈ 2 Verified-sized units | [US$ redacted] | [US$ redacted]; cap at [US$ redacted] per pair to hold [US$ redacted] |
| 2 | **FeatureBench**, `fast` split, 30–50 tasks stratified by repository | Feature-level, multi-file, far from saturated, graded score (% tests passed), MIT, Claude Code and mini-SWE-agent supported, 57 s grading | 40 tasks × 3 arms, cap per task | [US$ redacted] at a [US$ redacted] cap | [US$ redacted] at a [US$ redacted] cap; drop to 30 tasks |
| 3 | **SWE-EVO**, all 48 (or 22 non-dvc + 10 dvc) | Release-sized tasks of ~21 files and several PRs: the nearest thing to "does not fit one context". Fix rate is graded | 32–48 tasks × 3 arms | [US$ redacted] at a [US$ redacted] cap | Over budget at full size; 16 tasks × 3 arms × [US$ redacted] ≈ [US$ redacted] too few for an interval. Small model only |
| 4 | **Commit0 lite**, 6–8 libraries with the smallest specifications | Module-level split is supported by the paper's own ablation; graded score over hundreds of tests per library | 8 libraries × 3 arms, cap per library | [US$ redacted] at a [US$ redacted] cap | [US$ redacted]; the paper spent [US$ redacted] on 16 libraries with test feedback |

Calibration control, not counted in the four: 50 tasks of the latest **SWE-rebench** window or of SWE-bench Verified with mini-SWE-agent ([US$ redacted] small, [US$ redacted] mid, from the board's per-instance costs). Its purpose is to confirm that our single-agent arm reproduces a published number before any swarm claim.

What the intervals look like:

- A pass rate near 50% on n tasks has a 95% half-width of about ±14 points at n = 50, ±10 at n = 100, ±7 at n = 200.
- For a paired difference between two arms on the same tasks with 25% discordant outcomes, the half-width is also about ±14 points at n = 50 and ±10 at n = 100.
- So a [US$ redacted] study with a mid model (about 30–50 tasks per arm) can only confirm differences of 15 points or more. CooperBench's solo-to-coop gap (about 20 points) is in range. A 3-point orchestrator effect is not.
- Graded scores (fraction of fail-to-pass tests, Commit0 pass rate) with a bootstrap over tasks cut the interval roughly in half for the same n. Prefer them as the primary measure and report all-or-nothing resolution as secondary.
- Run-to-run noise is real: SWE-rebench reports ±0.5 to ±1.8 points over repeated runs of 111 tasks; Senior SWE-bench reports pass^3 well below pass@1. Two seeds on fewer tasks is usually worse than one seed on more tasks for a between-arm contrast; use seeds only after n ≥ 50.

Ranking logic: 1 answers "what does coordination cost" cheaply and has the control built in; 2 and 3 answer "does splitting pay when the task is too big"; 4 is the cleanest decomposable case and the most contaminated.

### (b) Arms for a fair study

One model, one tool set (bash and file edit), one base prompt, one sandbox image for all arms. Arms differ only in how the budget is divided.

| Arm | Definition | Notes |
|---|---|---|
| A. Single deep agent | One loop with the whole budget B; context compaction allowed | State the compaction rule: it changed results by a factor of two under a tight window (arXiv 2608.26218) |
| B. Independent attempts | k agents, B/k each, no communication; select by visible tests, never by hidden tests | The control for "more samples". SWE-Lancer and the scaling study both show it can match stronger systems or collapse, depending on the task |
| C. Orchestrator + workers | Planner splits; workers isolated, each in its own worktree; planner or a merge step integrates | Planner tokens and merge tokens count inside B. Cursor and Anthropic both ended with isolated workers |
| D. Decentralised swarm with shared marks | k peers, no planner; a shared board or the repository itself carries claims, test status and expiry | This is H-V03. Claims by lock file in git are the published precedent (Anthropic compiler). Board reads and writes count inside B |
| E. (optional) A + blind reviewer | Single agent plus one reviewer with fresh context | H-V02; our LAB-001 result says this may beat C and D |

How others matched budgets, and what to copy:

- **Total tokens and total iterations equal across arms**, with fewer iterations per agent in teams (scaling study). Copy this as the primary rule. Count input, cached input and output separately and also report dollars, because a swarm re-reads context and its cached share differs.
- **Same workload, per-agent action cap** (CooperBench). Do not copy: the team gets more actions.
- **No matching, cost reported beside accuracy** (HAL, SWE-bench bash-only, SWE-rebench, Agentless). Copy the reporting: a cost-accuracy plot per arm.
- **Turn cap plus dollar cap** (SWE-bench Pro: 50 turns and [US$ redacted] or 250 turns uncapped). Epoch flagged the mixing of the two as bias. Use one rule for all arms.
- **Fixed wall-clock per attempt** (480 s cap in arXiv 2608.26218; 24 h in MLE-bench). Run a second analysis at matched wall-clock, where parallel arms are allowed their natural advantage, and keep it separate from the matched-token result.
- **Repeated trials and reliability** (Terminal-Bench: five runs; Senior SWE-bench: pass^3). Report the share of tasks solved in every seed, not only the mean.

Pre-register before running: primary metric, budget B, k, the selection rule for arm B, and the stopping rule. Our earlier labs already show that repair loops create false successes.

### (c) Pitfalls and how they were handled

| Pitfall | Evidence | Handling in the literature | For us |
|---|---|---|---|
| Tests reject correct solutions | Verified: 59.4% of 138 audited failures had flawed tests (secondary source). Pro: ~30% broken; 24% false negatives | Human re-annotation (Verified), cleaned V2 and HARD-51 (Pro), Lite-S filtering (Agentless) | Use paired comparisons on the same tasks: a broken task hurts all arms equally. Drop tasks the gold patch fails in our environment |
| Tests accept wrong solutions and reward hacking | Pro: 8.5% false positives; Poolside reward-hacking report; Senior SWE-bench removed tasks that models hacked | Hidden tests, discard agent-written test edits and re-apply gold tests (STALE), adversarial exploit agent in review (Terminal-Bench) | Keep hidden tests outside the container until grading. Diff the test directory before grading |
| Leaked solutions | Lite issues containing the patch; public oracle solutions with internet access (Terminal-Bench); git history in the image | Lite-S; internet off and remote removed (SWE-Lancer); pip "time machine" (SWE-bench-Live); canary strings | Network off during the run. Remove `.git` history after the base commit. Check future commits are not reachable |
| Training-data contamination | Frontier models reproducing Verified fixes from memory; Commit0 libraries are famous | Rolling fresh tasks (SWE-rebench, SWE-bench-Live); GPL and private repositories (Pro); private sets (FrontierCode) | Contamination affects all arms alike but lowers the need for search and so hides any swarm benefit. Prefer FeatureBench, SWE-EVO and CooperBench over Verified and Commit0; report results by task date where possible |
| Flaky tests and environments | Terminal-Bench reports residual nondeterminism; Agyn hit old dependencies, broken CI and out-of-memory on a laptop; Pro ran gold tests several times to filter flakes | Pinned images, repeated gold runs, timeouts, confidence intervals | Run the gold patch three times per task before the study and drop unstable tasks. Run agents on the Linux server, not the Mac |
| Cost blow-up | Commit0: [US$ redacted] → 99 between stages. HAL: [US$ redacted] per Verified task with one scaffold vs [US$ redacted] with another. ProjDevBench: up to 13 M tokens per problem. Compiler project: [US$ redacted] | Step limits, dollar caps per trajectory, cheaper models for workers (Cursor) | Hard cap per task enforced by the harness, not by the prompt. Pilot on 5 tasks and extrapolate before the full run. Turn prompt caching on and log cached share |
| Context exhaustion read as model failure | Pro failure analysis: context overflow 35.6% of Sonnet 4 failures; arXiv 2608.26218 doubled solves with compaction | Compaction, fresh restarts (Cursor judge cycle) | Log the reason each run ended. A swarm's gain may be nothing more than compaction; arm A must have it |
| Wall-clock | Terminal-Bench 7–11 min per task; SWE-Lancer 3 h cap and 90–120 s per browser check; MLE-bench 24 h; SWE-EVO 874 tests per grading | Parallel workers bounded by cores (SWE-bench: 0.75 × cores, max 24); cloud runners (Modal) | Budget grading time: 48 SWE-EVO tasks × 3 arms × full test suites may take hours. Measure on the pilot |
| Disk | Verified 100–120 GB; SWE-Lancer 14 GB per task; MLE-bench lite 158 GB | Pull and delete per task (`--delete-image` in PolyBench) | Check free disk on the server before choosing the subset |
| Merge as hidden judge | CooperBench merges with a trained resolver; a failed merge fails the task | Three-stage merge; optional shared git remote | For arms C and D decide who merges and charge it to B. Report merge-failure rate separately from test failure |
| Uneven settings across arms or entries | Pro board mixes 50-turn capped and 250-turn uncapped runs; CORE-Bench scaffold gap of 36 points | Epoch flagged it | Freeze the harness commit and config; store them with results |
| Small n over-read | Agyn's 0.4-point "win"; scaling study used 20 SWE tasks; NP-Bench 9 scenarios | Wilson intervals (CooperBench), SEM over seeds (MLE-bench, SWE-rebench) | Report intervals for every contrast; no claim under the interval width in (a) |

---

## 6. Open items

- Read the official Terminal-Bench, SWE-bench-Live, Commit0, SWE-PolyBench and Multi-SWE-bench leaderboards in a real browser; they did not render to the fetch tool.
- Confirm the OpenAI posts on Verified (February 2026) and Pro (July 2026) at source; both returned HTTP 403.
- CooperBench: per-model results in the `team` setting and any 2026 leaderboard for newer models were not found.
- FeatureBench, SWE-EVO and CooperBench publish no cost. A 5-task pilot per benchmark is needed before committing a budget.
- RoadmapBench and TeamBench were read only through an aggregator; locate the papers and repositories.
- Image sizes for FeatureBench, CooperBench, SWE-EVO and Pro V2 are not documented.
- Current Anthropic model prices were not looked up; cost estimates rest on per-instance costs from boards dated February to July 2026.

## 7. Sources

Primary pages read: [SWE-bench data file](https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json) · [SWE-bench Docker guide](https://www.swebench.com/SWE-bench/guides/docker_setup/) · [mini-SWE-agent](https://mini-swe-agent.com/latest/) · [HAL Verified Mini](https://hal.cs.princeton.edu/swebench_verified_mini) · [HAL CORE-Bench Hard](https://hal.cs.princeton.edu/corebench_hard) · [SWE-rebench](https://swe-rebench.com/) · [SWE-bench-Live site](https://swe-bench-live.github.io/) and [paper](https://arxiv.org/html/2505.23419v2) · [SWE-bench Multimodal](https://arxiv.org/abs/2410.03859) · [SWE-bench Pro paper](https://arxiv.org/html/2509.16941), [board](https://labs.scale.com/leaderboard/swe_bench_pro_public), [repo](https://github.com/scaleapi/SWE-bench_Pro-os), [Epoch review](https://epoch.ai/benchmarks/swe-bench-pro/review) · [SWE-Lancer paper](https://arxiv.org/html/2502.12115), [repo](https://github.com/openai/preparedness/tree/main/project/swelancer) · [Commit0 paper](https://arxiv.org/html/2412.01769), [repo](https://github.com/commit-0/commit0) · [DevBench](https://arxiv.org/abs/2403.08604) · [ProjDevBench](https://arxiv.org/html/2602.01655) · [RepoBench](https://github.com/Leolty/repobench) · [Terminal-Bench 2.0 paper](https://arxiv.org/html/2601.11868v1), [Vals board](https://www.vals.ai/benchmarks/terminal-bench-2) · [MLE-bench](https://github.com/openai/mle-bench) · [PaperBench](https://arxiv.org/html/2504.01848) · [SWE-PolyBench](https://github.com/amazon-science/SWE-PolyBench) · [Multi-SWE-bench](https://github.com/multi-swe-bench/multi-swe-bench) · [CooperBench paper](https://arxiv.org/html/2601.13295v2), [repo](https://github.com/cooperbench/CooperBench) · [FeatureBench paper](https://arxiv.org/abs/2602.10975), [repo](https://github.com/LiberCoders/FeatureBench) · [SWE-EVO](https://arxiv.org/html/2512.18470v6) · [STALE](https://arxiv.org/html/2609.25396v1) · [NP-Bench](https://arxiv.org/abs/2610.07261) · [Senior SWE-bench](https://senior-swe-bench.snorkel.ai/blog/2026-07-30-refresh) · [FrontierCode](https://cognition.com/blog/frontier-code) · [Scaling agent systems](https://arxiv.org/html/2512.08296) · [Agyn](https://arxiv.org/html/2602.01465) · [MAST](https://arxiv.org/html/2503.13657) · [Agentless](https://arxiv.org/abs/2407.01489) · [Illusion of multi-agent advantage](https://arxiv.org/abs/2606.13003) · [Same model, different harness](https://arxiv.org/html/2608.26218) · [Anthropic research system](https://www.anthropic.com/engineering/multi-agent-research-system) · [Anthropic C compiler](https://www.anthropic.com/engineering/building-c-compiler) · [Cursor scaling agents](https://cursor.com/blog/scaling-agents) · [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams).

Secondary pages used with a flag: [Willison on the February 2026 SWE-bench update](https://simonwillison.net/2026/Feb/19/swe-bench/) · [Decrypt on OpenAI and Verified](https://decrypt.co/359012/openai-benchmark-measure-ai-coding-supremacy-contaminated) · [The Decoder on OpenAI and Pro](https://the-decoder.com/openai-finds-roughly-30-percent-of-popular-ai-coding-test-is-broken/) · [benchmarklist: RoadmapBench](https://benchmarklist.com/benchmarks/roadmapbench/), [TeamBench](https://benchmarklist.com/benchmarks/teambench_evaluating_agent_coordination_under_enforced_role_separation/).

Related cards already in this repository: `research/literature/lit-scaling-agent-systems.md`, `lit-mast.md`, `lit-sas-equal-thinking-budget.md`, `lit-sas-vs-mas-hybrid.md`, `lit-swarmbench-2025.md`.
