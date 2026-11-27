# 04 — Security and robustness benchmarks for LLM agents and multi-agent systems

Study date: 2026-11-12. Scope: public benchmarks a defender can use to evaluate
defences for single agents and for collectives (programme "Abracadabra").
Framing is defensive throughout: no attack construction is described here, only
what each suite measures and what a defence result on it does and does not show.

**How to read this file**

- Every number was read at the linked source during this study unless tagged.
- `UNVERIFIED` = I could not confirm it at a primary source (paper, repo, official
  page). It may come from a secondary summary or from my own inference.
- `ESTIMATE` = my own arithmetic (mostly cost), not a published figure.
- Sources were read through an automated page reader that truncates long papers
  (roughly the first 100k characters). Appendix tables were often not reached.
  Where a table mattered and was not reached, the cell says so.
- Nothing was run. No dataset was downloaded. No API call was made.

Abbreviations: BU = benign utility (task success with no attack); UA = utility
under attack; ASR = attack success rate; IPI = indirect prompt injection;
MAS = multi-agent system.

---

## 1. Summary table

| Benchmark | Year | Agents | Size | Scoring | Utility metric | Adaptive-aware | Licence | Anthropic API |
|---|---|---|---|---|---|---|---|---|
| AgentDojo | 2024 | single | 97 user tasks × 27 injection tasks = 629 cases (v1); 949 in the version CaMeL used | code (state checks) | yes (BU, UA) | partly (extensible; default attacks are static) | MIT | yes |
| InjecAgent | 2024 | single | 1,054 cases × 2 settings | code (output parsing) | no | no | MIT | yes (`--model_type Claude`) |
| ASB | 2024/25 | single | 10 scenarios, 400 attack tasks, ~90k cases in the paper | tool-call check; refusal by LLM | partial (PNA, BP) | no | MIT | Claude 3.5 Sonnet listed; setup undocumented |
| WASP | 2025 | single (web) | 84 attack cases, 37 utility tasks | rules (end-to-end); GPT-4o judge (intermediate) | yes | no | CC-BY-NC 4.0 | via AWS Bedrock; OpenAI key needed for evaluators |
| BIPIA | 2023 | none (LLM app) | 5 tasks, 250 attacker goals | LLM judge | output quality only | no | "see LICENSE" (UNVERIFIED type); repo archived | not documented |
| LLMail-Inject | 2025 | single (email) | 208,095 unique submissions, 4 levels | code (API flags) | no | yes (human adaptive) | MIT | n/a (dataset + challenge code) |
| AgentHarm (context) | 2024 | single | 110 behaviours (440 augmented); 176+32 public | LLM judge | benign split | no | MIT + safety-use clause | yes (Inspect) |
| AgentDyn | 2026 | single | 60 tasks, 560 injection cases | UNVERIFIED (AgentDojo-style) | yes | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| TAMAS | 2025 | **multi** | 300 adversarial + 100 benign, 5 domains | GPT-4o judge + tool parsing | yes (PNA, ERS) | no | UNVERIFIED (code) | not tested by authors |
| ACIArena | 2026 | **multi** | 1,356 cases, 6 MAS, 28 attacks | string match (771) + GPT-4o judge (585) | yes (BU, UA) | one adaptive test on the authors' own defence | UNVERIFIED | not tested by authors |
| Prompt Infection | 2024 | **multi** | 360 pairs; societies of 10–50 agents | criteria-based | no | handcrafted only | no code confirmed | n/a |
| Multi-Agent Security Tax | 2025 | **multi** | 7 agents, 12 prompts × 3 runs | GPT-4o judge | yes (cooperation proxy) | no | UNVERIFIED | not tested by authors |
| Kill-Chain Canaries | 2026 | **multi** (2-agent relay) | 950 runs | code (canary regex) | clean-control success | no | UNVERIFIED | yes (Claude Haiku/Sonnet 4.5 tested) |
| MAS-Resilience | 2024/25 | **multi** | 4 tasks (HumanEval 164, CIAR 50, CommonMT 100, FairEval 80), 6 MAS | task metrics (code/BLEURT/labels) | yes (drop vs baseline) | n/a (faults, not attacks) | UNVERIFIED | not tested by authors |
| MAS-FIRE | 2026 | **multi** | 15 fault types, 3 MAS, 164+400+251 tasks | task success | yes (robustness score) | n/a | UNVERIFIED | not tested by authors |
| Tool-fault suites (ReliabilityBench, ToolMaze, ToolBench-X, AgentCheck) | 2026 | single | varies | mostly code | yes | n/a | UNVERIFIED | UNVERIFIED |

---

## 2. Single-agent prompt-injection benchmarks

### 2.1 AgentDojo

- Paper: https://arxiv.org/abs/2406.13352 · Repo: https://github.com/ethz-spylab/agentdojo
  · Results page: https://agentdojo.spylab.ai/results/
- **Task and threat model.** A tool-calling agent does a user task in one of four
  simulated environments (workspace, Slack, travel, banking). The attacker
  controls some data returned by tools (an email body, a web page, a transaction
  note) and wants the agent to carry out a separate "injection task". The user
  prompt is trusted.
- **Size.** 97 user tasks, 27 injection tasks, 629 security cases (workspace
  40×6, Slack 21×5, travel 20×7, banking 16×9). The paper gives the tool count
  as 70 in one place and 74 in another. Later versions are larger: the CaMeL
  paper reports results "out of 949 attacks", which I read as benchmark v1.2
  (version label UNVERIFIED).
- **Metrics.** BU, UA, targeted ASR. All three are deterministic Python checks
  on the final environment state and the agent output. The authors avoid an LLM
  judge on purpose, because the judge could be hijacked by the same content.
- **Baselines (paper, v1, `important_instructions` attack, %).**

  | Model | BU | UA | ASR |
  |---|---|---|---|
  | GPT-4o | 69.0 | 50.1 | 47.7 (57.7 in the defence table) |
  | Claude 3.5 Sonnet (June 2024) | 78.2 | 51.2 | 33.9 |
  | Claude 3 Opus | 66.6 | 52.5 | 11.3 |
  | GPT-4 Turbo | 63.4 | 54.1 | 28.6 |
  | Llama 3 70B | 34.5 | 18.3 | 20.0 |

  Results page (same attack, no defence): Claude 3.5 Sonnet (Oct 2024) BU 79.4 /
  UA 72.5 / ASR 1.1; Claude 3.7 Sonnet BU 88.7 / UA 77.3 / ASR 7.3. I found no
  rows for 2026 models on that page.
- **Defences in the paper (GPT-4o, %).**

  | Defence | BU | UA | ASR |
  |---|---|---|---|
  | none | 69.0 | 50.0 | 57.7 |
  | data delimiting (spotlighting-style) | 72.7 | 55.6 | 41.7 |
  | PI detector (BERT classifier) | 41.5 | 21.1 | 8.0 |
  | repeat user prompt (sandwich) | 85.5 | 67.3 | 27.8 |
  | tool filter | 73.1 | 56.3 | 6.8 |

  The paper's text says 7.5% for the tool filter; the table says 6.84%.
- **Later defences evaluated on it.**
  - MELON (https://arxiv.org/abs/2502.05174), GPT-4o, averaged over four static
    attacks: no defence BU 80.4 / UA 69.1 / ASR 16.1; tool filter 66.0 / 65.5 /
    2.3; MELON 68.0 / 58.8 / 0.24; MELON-Aug 76.3 / 68.7 / 0.32. Roughly 2× API
    cost. No adaptive evaluation in the paper.
  - CaMeL (https://arxiv.org/abs/2503.18813): 77% of tasks solved "with provable
    security" versus 84% undefended. 0 successful attacks for Claude 3.5 Sonnet
    (next best, tool filter: 8) and for Gemini 2.5 Pro (300 without CaMeL, out
    of 949). Median token overhead about 2.82× input and 2.73× output against
    native tool calling; spotlighting is about 1.06× / 0.98×. Out of scope by
    design: text-to-text manipulation that does not change data flow, and side
    channels. Utility falls most on the travel suite.
  - Meta SecAlign: 2% ASR under static attacks according to "The Attacker Moves
    Second" (below). Original paper not opened.
- **Adaptive attacks — what is known.**
  - The AgentDojo authors say the default attacks are not sufficient and that
    the repeat-prompt defence is "unlikely to withstand adaptive attacks". The
    data card lists default-attack-only use as unsuitable.
  - US AISI / CAISI with UK AISI
    (https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations):
    against Claude 3.5 Sonnet (Oct 2024), red-team attacks raised ASR from 11%
    (best baseline attack) to 81% on held-out workspace tasks. Repeating five
    injection tasks 25 times each raised average success from 57% to 80%. Their
    fork is public (https://github.com/usnistgov/agentdojo-inspect, archived;
    superseded by the `inspect_evals` AgentDojo port). The strongest attacks are
    not public.
  - "The Attacker Moves Second" (https://arxiv.org/abs/2510.09023, USENIX
    Security 2026): on AgentDojo, spotlighting and prompt sandwiching go from
    about 1% static ASR to above 95%; Meta SecAlign from 2% to 96%; Protect AI
    detector, PromptGuard and Model Armor above 90%; PIGuard 71%; MELON 76%
    without knowledge of the defence and 95% with it. A public competition
    (500+ participants, [US$ redacted]) defeated every challenge. CaMeL was not
    evaluated in that paper.
- **Cost.** Paper: about [US$ redacted] for the 629 security cases and [US$ redacted] for the 97
  utility cases on GPT-4o at 2024 prices. ESTIMATE at current Anthropic list
  prices (Sonnet 5.5 [US$ redacted]/10 per MTok, Haiku 5.5 [US$ redacted]/0.50, Opus 5.5
  [US$ redacted]/20), scaling the paper's token volume: v1 full run about [US$ redacted] on
  Sonnet 5.5, [US$ redacted] on Haiku 5.5, [US$ redacted] on Opus 5.5. Add 50% for the
  949-case version. Thinking tokens on current models can push this up; a
  defence such as MELON doubles it and CaMeL nearly triples it.
- **Licence.** MIT.
- **Anthropic API.** Yes. Claude rows exist on the results page and the Inspect
  ports take `--model anthropic/...`. Risk: current Claude models reject some
  legacy request parameters (non-default sampling parameters, forced
  `tool_choice`); whether the upstream harness needs a patch for 2026 models is
  UNVERIFIED.
- **Assessment.** The best-engineered suite in this study and the standard
  reference. Its weakness for 2026 work: with a strong model and the default
  attack, the undefended ASR is already in single digits, so a defence has
  almost no measurable headroom. AgentDyn (2.6) makes the same point and adds
  that only 6 of 97 AgentDojo tasks need dynamic planning (claim from a
  secondary summary of the AgentDyn paper, UNVERIFIED at source).

### 2.2 InjecAgent

- Paper: https://arxiv.org/abs/2403.02691 · Repo: https://github.com/uiuc-kang-lab/InjecAgent
- **Task and threat model.** A ReAct-style agent calls one user tool; the tool
  response carries an attacker instruction. Two harm classes: direct harm (30
  attacker cases) and data stealing (32, two-stage). 17 user tools, 62 attacker
  tools, 1,054 cases, each in a "base" and an "enhanced" setting.
- **Metrics.** ASR-valid (over well-formed outputs) and ASR-all, computed by
  parsing the agent output. No task-utility metric. For the second stage of data
  stealing the tool response is simulated with GPT-4.
- **Baselines (ASR-valid, base / enhanced).** Prompted GPT-4 about 24% / 47%;
  prompted Llama2-70B above 80% in both; prompted Claude-2 11.4% / 3.4%;
  fine-tuned GPT-4 6.6% / 7.1%. All 2023–24 models. No current-model numbers
  found.
- **Defences.** None in the paper. A follow-up by the same group
  (https://arxiv.org/abs/2503.00061, NAACL Findings 2025) reports that eight
  defences were all bypassed by adaptive attacks with ASR above 50%, on a
  Vicuna-7B prompted agent and a Llama3-8B fine-tuned agent. That it used
  InjecAgent as the test bed is UNVERIFIED (not confirmed in the pages I read).
- **Single-step.** One user turn, at most two attacker steps. No environment
  state.
- **Cost.** Not reported. ESTIMATE: 2,108 short single-turn calls, a few
  dollars on Sonnet 5.5, cents on Haiku 5.5.
- **Licence.** MIT. **Anthropic API:** supported by flag.
- **Assessment.** Cheap and fully code-scored, but no utility metric and no
  multi-step state. A defence that refuses everything scores perfectly. Use
  only as a smoke test, never as the headline.

### 2.3 Agent Security Bench (ASB)

- Paper: https://arxiv.org/abs/2410.02644 (ICLR 2025) · Repo: https://github.com/agiresearch/ASB
- **Task and threat model.** Ten scenario agents (finance, IT, e-commerce,
  driving, etc.). Attack families: direct prompt injection (user prompt is
  attacker-controlled), observation/indirect injection, memory poisoning,
  a planning backdoor in the system prompt, and mixtures. This is a broader and
  more permissive attacker than AgentDojo's: several families assume the
  attacker writes the user prompt or the system prompt.
- **Size.** 10 scenarios, 10 agents, 400+ attack tools, 20 normal tools, 400
  attack tasks, 50 agent tasks; 13 attack methods, 10–11 defences, 13
  backbones, about 90,000 cases in the paper. The abstract and body disagree on
  the count of defences and of metrics (7 versus 8).
- **Metrics.** ASR, refusal rate (judged by the backbone LLM), performance with
  no attack (PNA), benign performance, false positive / negative rates. ASR is
  defined by whether the attacker's tool was called, so it is effectively
  code-checked; the paper did not state this as plainly as AgentDojo does.
- **Baselines (average ASR across backbones).** Mixed 84.3%, direct injection
  72.7%, planning backdoor 42.1%, observation injection 27.6%, memory poisoning
  7.9%. Claude 3.5 Sonnet: direct 90.8%, observation 59.7%, memory 19.8%, mixed
  94.5%.
- **Defences.** For direct injection only paraphrasing helps (78.4% → 56.9%
  average). For observation injection: delimiters 28.0% → 25.0%, instructional
  prevention −1.7 points, sandwich no change. For Claude 3.5 Sonnet the
  observation-injection ASR did not fall under any of the three. Utility cost
  is said to exist but the main text gives no numbers (appendix not reached).
- **Adaptive.** No.
- **Cost.** Not reported. ESTIMATE: one attack family × one model = 400 short
  agent runs, roughly [US$ redacted] on Sonnet 5.5.
- **Licence.** MIT. **Anthropic API:** Claude 3.5 Sonnet is in the supported
  list; how to configure it is not documented in the README, and the README has
  stale paths (clone URL points to a personal fork; quickstart names a script
  that is not in the root listing).
- **Assessment.** Wide coverage, shallow tasks. The agents are simulated tool
  pickers rather than stateful environments, and "attack succeeds if the
  attacker tool is called" is a weak harm criterion. Its memory-poisoning
  family is the only part directly relevant to shared-state defences.

### 2.4 WASP

- Paper: https://arxiv.org/abs/2504.18575 · Repo: https://github.com/facebookresearch/wasp
- **Task and threat model.** A browser agent works in self-hosted GitLab and
  Reddit clones (from VisualWebArena). The attacker is an ordinary site user who
  can post issues and comments, not the site owner, and does not know the agent.
  This is the most realistic attacker in the single-agent group.
- **Size.** 21 attacker goals × 2 user goals × 2 injection formats = 84 cases;
  37 utility tasks.
- **Metrics.** ASR-end-to-end by rule-based checks on the final site state;
  ASR-intermediate (was the agent diverted at all) by a GPT-4o judge; utility on
  the 37 tasks.
- **Baselines.** Diverted in 17–86% of cases; attacker goal completed in 0–17%.
  Claude 3.7 Sonnet (computer use, extended thinking): intermediate 53.6%,
  end-to-end 3.6%, utility 48.6%; with a defensive system prompt 50.0% / 3.6% /
  43.2%. o1 with tool calling: 85.7% / 16.7% / 48.6%. The authors call the gap
  "security by incompetence": agents are hijacked but then fail to finish the
  attacker's multi-step goal.
- **Defences.** Only a defensive system prompt and instruction-hierarchy
  placement. Both weak; the system prompt costs utility (GPT-4o 59.5% → 45.9%).
- **Adaptive.** No. Attacks are hand-written.
- **Cost.** Not reported. A full run takes 4–6 hours and needs the two web apps
  hosted (the authors used EC2). ESTIMATE: screenshot-driven runs are
  token-heavy; assume tens of dollars per agent configuration plus hosting.
- **Licence.** CC-BY-NC 4.0 for most of the repo (non-commercial).
- **Anthropic API.** Claude is wired through AWS Bedrock, and the evaluators
  need an OpenAI or Azure key even when testing Claude.
- **Assessment.** Small (84 cases, wide confidence intervals), heavy to set up,
  non-commercial. Valuable for its attacker model and for separating "diverted"
  from "harm done". Not a small-lab first choice.

### 2.5 BIPIA, TaskTracker and LLMail-Inject

- **BIPIA** (https://arxiv.org/abs/2312.14197, KDD 2025; repo
  https://github.com/microsoft/BIPIA, archived). Five non-agentic application
  tasks (web QA, email QA, table QA, summarisation, code QA), 250 attacker
  goals, 25 LLMs. ASR is judged by an LLM (default GPT-3.5). Defences: border
  strings, in-context examples, multi-turn dialogue (black-box) and fine-tuning
  with special tokens (white-box, reported near-zero ASR). Two of five datasets
  must be rebuilt by the user for licence reasons. No tools, no agent loop.
  Mostly of historical interest; it is where "boundary awareness" comes from.
- **TaskTracker** is a detector, not a benchmark: a linear probe on activation
  deltas that flags task drift. It needs model internals, so it cannot be
  applied to Claude through the API.
- **LLMail-Inject** (https://arxiv.org/abs/2506.09956; data
  https://huggingface.co/datasets/microsoft/llmail-inject-challenge, MIT).
  A public challenge: an email assistant (Phi-3-medium or GPT-4o-mini) with a
  `send_email` tool; the attacker sends one email. Defences deployed and known
  to participants: spotlighting, Prompt Shield, an LLM judge, TaskTracker, and
  all combined. 461,640 raw submissions, 208,095 unique, 839 participants.
  End-to-end success: 3,018 in phase 1 (0.8%) and 306 in phase 2 (0.3%). Team
  success rate on the hardest level: Prompt Shield 0.60, spotlighting 0.53,
  TaskTracker 0.44, LLM judge 0.32, all combined 0.17. Scoring is by code (five
  boolean flags). Detector thresholds were tuned for under 5% false positives,
  but no systematic utility metric is reported.
  **Why it matters to us:** it is the only large public corpus of *human
  adaptive* injections written against known defences, and it shows that
  stacking detectors helps but does not close the gap. It is a dataset for
  testing a detector's recall offline, not an agent harness.

### 2.6 Newer single-agent suites (not studied in depth)

- **AgentDyn** (https://arxiv.org/abs/2602.03117, repo
  https://github.com/leolee99/AgentDyn): 60 open-ended tasks, 560 injection
  cases, three suites (shopping, GitHub, daily life), and benign third-party
  instructions that a correct agent *should* follow. Ten defences tested; the
  abstract says nearly all are either insecure or over-defend. A secondary
  summary says Meta SecAlign 70B has about 9% residual ASR, four times its
  AgentDojo figure (UNVERIFIED). The "helpful third-party instruction" design is
  directly relevant to quarantine defences, which tend to over-block.
- **ART** (https://arxiv.org/abs/2507.20526): curated from a public competition
  with 1.8M attack attempts, 60k+ policy violations, 22 agents, 44 scenarios.
  Nearly all agents violated policy within 10–100 queries. Repository and access
  terms UNVERIFIED.

### 2.7 AgentHarm (context only)

- Paper: ICLR 2025; data https://huggingface.co/datasets/ai-safety-institute/AgentHarm
- Measures whether an agent *complies with a malicious user*, not whether it
  resists third-party content. 110 behaviours (440 augmented) in the paper; the
  public release has 176 harmful + 176 benign + chat rows in `test_public` and
  32 in validation. Scored by an LLM judge (default GPT-4o) that also detects
  refusals. MIT with an added safety-use clause; runs on Inspect, including
  Anthropic models. Reported for Claude 3.5 Sonnet: harm score 13.5% without and
  68.7% with a jailbreak template (from a search summary, UNVERIFIED at the
  paper). Not a test of collective defence. Its only use for us is as a
  misuse-side sanity check that a defence does not lower refusal behaviour.

---

## 3. Multi-agent attack surface and propagation

### 3.1 TAMAS

- Paper: https://arxiv.org/abs/2511.05269 · Repo: https://github.com/microsoft/TAMAS
- **Task and threat model.** Multi-agent teams in five domains (news,
  education, finance, healthcare, legal). Six threat types: direct injection,
  impersonation, indirect injection, Byzantine agent, colluding agents,
  contradicting agents. The attacker knows roles and tools, not model internals,
  and may compromise an agent's system prompt or add a tool.
- **Size.** 300 adversarial instances (60 per domain, 10 per threat), 100
  benign tasks, 211 tools (abstract).
- **Configurations.** AutoGen: Magentic-One (orchestrator), round robin,
  swarm. CrewAI: centralised, sequential.
- **Metrics.** ARIA (four outcome levels), a derived safety score, PNA (share
  of required tools invoked on benign tasks), and ERS, the harmonic mean of
  safety and PNA. Judged by GPT-4o at temperature 0 plus tool-call parsing.
  Judge agreement with 140 human-labelled logs: mean F1 89.2%, from 75%
  (contradicting agents) to 100% (direct and indirect injection).
- **Baselines.** Ten models, none from Anthropic. Impersonation reaches 82% in
  swarm; direct injection 81% in Magentic-One; indirect injection averages
  27.4% in Magentic-One and 56.4% in round robin; colluding agents 2–16%.
  CrewAI configurations score safer than AutoGen ones.
- **Defences.** None evaluated.
- **Adaptive.** No.
- **Cost.** Not reported; budget limited the model × framework grid.
  ESTIMATE: 400 multi-agent runs per configuration at 20–60k tokens each is
  8–24M tokens, about [US$ redacted] per configuration on Sonnet 5.5, plus the GPT-4o
  judge.
- **Licence.** Paper CC BY-SA 4.0; code licence UNVERIFIED.
- **Anthropic API.** Not used by the authors. AutoGen and CrewAI both have
  Anthropic clients, so it should be possible; UNVERIFIED in practice.
- **Assessment.** The closest public match to our threat model: it includes a
  compromised peer (Byzantine, colluding, contradicting, impersonation), not
  only poisoned tool output, and it compares an orchestrator against a swarm
  topology. Weak points: 10 instances per threat per domain, an LLM judge whose
  F1 is lowest (75%) on exactly the peer-conflict category, PNA that counts
  tool invocations and not task outcomes, and no defence baselines to compare
  against.

### 3.2 ACIArena

- Paper: https://arxiv.org/abs/2604.07775 (ACL 2026) · Repo: https://github.com/Greysahy/aciarena
- The name "MASpi" does not appear as a benchmark name in anything I could
  open; the string occurs only inside an example in this paper. I treat "MASpi"
  as UNVERIFIED and ACIArena as the nearest real artefact.
- **Task and threat model.** "Agent cascading injection": a compromised input,
  agent profile or inter-agent message spreads through a MAS. Three surfaces
  (adversarial input, malicious agent, message poisoning) × three objectives
  (hijacking, disruption, exfiltration).
- **Size.** 1,356 cases from 28 attacks over six MAS implementations (MetaGPT,
  AutoGen, CAMEL, Self-Consistency, LLM Debate, AgentVerse).
- **Metrics.** BU, UA, ASR, and a Propagation Vulnerability Index that weights
  each agent's ASR by its distance to the final answer. ASR by strict string
  match on 771 cases and by a GPT-4o judge on 585 disruption cases.
- **Baselines.** GPT-4o, GPT-4o-mini, Qwen2.5-7B. In code tasks many MAS reach
  90–100% ASR for hijacking or disruption. CAMEL has the lowest ASR, partly
  because its utility is low. Per-system table not reliably extracted.
- **Defences.** BERT detector and delimiters underperform; sandwich helps in
  places and worsens exfiltration; AGrail and G-Safeguard lose utility
  ("complete loss" in some cases for AGrail) for limited gain. The authors'
  own ACI-Sentinel does best, with a utility cost on complex tasks.
- **Adaptive.** One test: optimised attacks against ACI-Sentinel restore ASR to
  36.7% (AutoGen), 13.3% (AgentVerse), 10.0% (MetaGPT).
- **Cost.** Not reported; the authors say query cost limited scale.
- **Licence.** UNVERIFIED. **Anthropic API:** not used.
- **Assessment.** The only suite found that reports BU, UA and ASR for
  multi-agent systems *and* has a propagation-specific metric *and* compares
  several defences. Two findings matter for us: defences built in simplified
  settings fail here, and narrow defences can open new holes. Maturity is
  unknown: I could not check the repository, its licence, or how hard it is to
  plug in a custom MAS.

### 3.3 Prompt Infection

- Paper: https://arxiv.org/abs/2410.07283
- **Setup.** A pipeline of reader, database, coder and writer agents; injected
  content in an external document is passed on agent to agent. 120 user
  instructions × 3 tool types = 360 pairs; GPT-4o and GPT-3.5. A second
  experiment uses societies of 10–50 agents with pairwise chats and memory.
- **Results.** With shared global history the self-replicating form beats the
  non-replicating one for most goals; with local messaging its success is about
  20% lower. GPT-4o ignored 66% of attempts against 9% for GPT-3.5, but executed
  more precisely once compromised. In societies, full spread took about 47% of
  turns for 10 agents and 21–24% for 30–50, on a logistic curve.
- **Defence relevant to us: "LLM Tagging".** Prefixing each inter-agent message
  with the sender's identity, so a downstream agent can tell peer output from
  user input. Alone: about 5% ASR reduction. Tagging + marking: all tested
  attacks blocked. Tagging + instruction defence: about 3% ASR. Tagging +
  sandwich: about 16%. Marking alone still let 76% through.
- **Limits.** GPT-only; handcrafted attacks; the authors state that generated
  attacks may bypass tagging; no utility metric; no code release confirmed.
- **Assessment.** A method paper, not a reusable benchmark. It is the nearest
  prior result to our "attribution to a peer changes behaviour" finding, and it
  says attribution by itself is weak and only works combined with content
  marking. Our claim will be compared with this one.

### 3.4 Agent Smith

- Paper: https://arxiv.org/abs/2402.08567 · Project: https://sail-sg.github.io/Agent-Smith/
- An adversarial *image* placed in one agent's memory spreads through pairwise
  chats among LLaVA-1.5 agents; simulations up to one million agents; spread is
  exponential. No practical defence; the authors give a condition a defence
  would have to meet to bound the spread and leave the design open.
- Open-weight multimodal models only; not runnable against an API model. Use it
  as the epidemic-model reference (a defence must push the effective
  reproduction rate below one), not as a test bed.

### 3.5 Multi-Agent Security Tax

- Paper: https://arxiv.org/abs/2502.19145 (AAAI 2025) · Repo: https://github.com/apartresearch/prompt-worms
- **Setup.** Seven AutoGPT-style agents in a simulated chemistry lab. One
  non-privileged agent receives a malicious instruction that then spreads by
  paraphrase. 12 prompts × 3 runs = 36 simulations per condition. GPT-3.5,
  GPT-4 Turbo, GPT-4o variants. Claude not tested.
- **Defences.** Safety instructions in the system prompt (passive, active) and
  "memory vaccines": a fabricated earlier memory of having handled an unrelated
  malicious request (passive = refuse; active = also warn peers).
- **Results (average across models).**

  | Defence | Robustness | Cooperation |
  |---|---|---|
  | none | 76.7% | 87.1% |
  | passive instructions | 87.2% | 52.3% |
  | active instructions | 87.8% | 60.7% |
  | passive vaccines | 83.3% | 87.5% |
  | active vaccines | 90.0% | 87.6% |

  One model went from 80.6% to 100% robustness under passive instructions while
  cooperation fell from 91.7% to 26.1%.
- **Scoring.** GPT-4o judge for behaviour and for "explosion" events.
  Cooperation is acceptance of six harmless but unusual instructions (5,400
  trials), a proxy and not task success.
- **Assessment.** The most important prior art for Abracadabra. It is
  immune-inspired (vaccines, peer warnings = danger signals), it already names
  the cost ("security tax": suspicious agents cooperate less), and it reports a
  defence that keeps cooperation. Any claim we make has to be positioned
  against active vaccines. Its weaknesses are ours to avoid: one environment,
  one harm, 36 runs per cell, LLM-judged, no adaptive attacker.

### 3.6 Kill-Chain Canaries

- Paper: https://arxiv.org/abs/2603.28013 · Repo: https://github.com/KevinChunye/prompt_injection
- **Setup.** Two agents that communicate only through a shared memory store.
  A unique canary token is tracked across four stages: exposed, persisted,
  relayed, executed. 950 runs; GPT-4o-mini, GPT-5-mini, DeepSeek, Claude Haiku
  4.5, Claude Sonnet 4.5.
- **Scoring.** By code: a regex on every tool call, stage-labelled logs, Wilson
  intervals. A provenance heuristic reconstructed 22 of 22 paths in the first
  batch.
- **Results.** Text relay, no defence: GPT-4o-mini 53% (41–65), DeepSeek 25%,
  GPT-5-mini 3%, Claude Haiku 4.5 0% (0–5), Claude Sonnet 4.5 0% (0–4). Claude
  never wrote the token to memory. Cross-model: Claude Haiku as the *reader*
  executed 2 of 3 payloads that a weaker writer had already persisted (n=3,
  interval 21–94%).
- **Defences.** Write filter, PI detector, spotlighting, all three: none
  reduced success for the vulnerable models on the text relay, mostly because
  they inspected the wrong channel.
- **Limits.** One task family; explicit unobfuscated payloads; tiny cells in
  the cross-model part; code licence UNVERIFIED.
- **Assessment.** Small, but methodologically the cleanest multi-agent result
  here: stage-wise, code-scored, with clean controls and intervals. Two lessons
  carry over. Report *where* in the chain a defence acts, not only the final
  ASR. And content a model would refuse from a tool may be accepted once a peer
  has laundered it into shared state, which is exactly the path our
  peer-attribution quarantine is meant to cut.

### 3.7 Other multi-agent attack and defence papers

- **Agent-in-the-Middle** (https://arxiv.org/abs/2502.14847). The adversary
  intercepts messages to one victim agent. AutoGen, CAMEL, MetaGPT, ChatDev on
  MMLU subsets, HumanEval (164), MBPP (974), SoftwareDev. Success above 40% in
  all settings and above 70% in most; chains are the most exposed; MetaGPT
  75.7–100%; ChatDev 0% when the top roles are intercepted, 45–70% otherwise.
  No defence evaluated. The authors note that strict message formats (ChatDev)
  reduce risk at the cost of flexibility. Code "to be released" (UNVERIFIED).
- **G-Safeguard** (https://arxiv.org/abs/2502.11127, repo
  https://github.com/wslong20/G-safeguard). A supervised graph neural network
  over agent utterances flags compromised agents and prunes their edges.
  Reported ASR reductions of 12–22 points across injection, tool and memory
  attacks; topologies chain, tree, star, random; scaling to 80 agents. Claude
  3.5 Haiku was among the backbones. Needs labelled attack data for training;
  compared only against no defence; no adaptive test. ACIArena later found it
  loses utility for limited gain. **BlindGuard**
  (https://arxiv.org/abs/2508.08127) is an unsupervised variant on the same
  suite (details not read).
- **Byzantine-agent studies** (abstract level only, UNVERIFIED beyond that):
  a confidence-weighted consensus protocol reported robust at 85.7% faulty
  agents (https://arxiv.org/abs/2511.10400); an ETH study in which a single
  Byzantine agent sharply reduced valid consensus among eight honest small
  models, mostly by stalling and not by wrong agreement
  (https://arxiv.org/abs/2603.01213); a later paper arguing that self-reported
  confidence is a fragile trust signal (https://arxiv.org/abs/2605.09076).
  These contradict each other enough that none should be cited as settled.
- Not opened in this study (so no claims made): NetSafe, AgentSafe, AgentPoison,
  "Flooding Spread of Manipulated Knowledge", debate-attack papers, PsySafe.

---

## 4. Non-adversarial robustness of collectives

### 4.1 MAS-Resilience (faulty agents)

- Paper: https://arxiv.org/abs/2408.00989 (ICML 2025) · Repo: https://github.com/CUHK-ARISE/MAS-Resilience
- **Setup.** Six systems in three structures: linear (MetaGPT,
  Self-collaboration), flat (CAMEL, SPP), hierarchical (MAD, AgentVerse). Four
  tasks: HumanEval (164, pass@1), CIAR maths (50), CommonMT translation (100,
  BLEURT), FairEval (80). Two fault injectors: AutoTransform rewrites one
  agent's profile so it makes stealthy errors; AutoInject corrupts a share of
  its messages (default: every message, 20% of lines). One faulty agent at a
  time. GPT-3.5 and GPT-4o.
- **Results.** Average performance drop: hierarchical 5.5, flat 10.5, linear
  23.7 points. By task: translation 4.7, text evaluation 5.4, maths 9.9, code
  22.6. Semantic errors hurt more than syntactic ones. A faulty agent in a
  distributor role hurts more than in an executor role. Injected errors
  sometimes *improve* results (MAD, CAMEL). The paper's conclusion quotes
  different headline numbers from its abstract; the appendix supports 5.5.
- **Mitigations.** "Challenger" (each agent may dispute a message) and
  "Inspector" (an extra reviewing agent) recover up to 96.4% of lost
  performance in the best case.
- **Cost.** Not reported. ESTIMATE: HumanEval on one MAS with and without a
  faulty agent, about [US$ redacted] on Sonnet 5.5.
- **Licence.** UNVERIFIED. **Anthropic API:** not used; would need adapters.
- **Assessment.** The reference for "one bad agent, measure the drop", with
  code-scored tasks. Two caveats: HumanEval is saturated for 2026 models, and
  GPT-3.5-era baselines make the absolute drops out of date. Challenger and
  Inspector are the conventional baselines any quarantine mechanism must beat.

### 4.2 MAS-FIRE

- Paper: https://arxiv.org/abs/2602.19843 · Data: https://github.com/wxhhxn/MASFIRE
- **Setup.** 15 fault types: eight intra-agent (bad plan, information loss,
  memory loss, context overflow, hallucination, three tool-call errors) and
  seven inter-agent (role ambiguity, blind trust, conflicting or ambiguous
  instructions, message storm, message cycle, broadcast amplification). Three
  injection mechanisms, one of them purely programmatic (message routing).
  MetaGPT on HumanEval (164), Table-Critic on WikiTableQuestions (400), CAMEL on
  WebShop (251). GPT-5 and DeepSeek-V3.
- **Metric.** Robustness score = successes under a fault ÷ fault-free
  successes, plus process-level occurrence and recovery rates.
- **Results.** MetaGPT under blind trust: 0.0%. Table-Critic under blind trust:
  GPT-5 6.3% against DeepSeek-V3 70.6%, so the stronger instruction follower was
  the more fragile. Communication faults leave MetaGPT above 93%. Closed-loop
  designs neutralise over 40% of faults that break linear pipelines (abstract).
- **Assessment.** Best current taxonomy for non-adversarial faults, and its
  communication faults (storms, cycles, amplification) map onto what a swarm
  without central control is likely to do to itself. Licence and Anthropic
  support UNVERIFIED.

### 4.3 Failure taxonomies and attribution

- **MAST** (https://arxiv.org/abs/2503.13657): 14 failure modes in three groups,
  1,600+ annotated traces from seven frameworks. A labelling scheme and trace
  set, not a fault-injection harness. Dataset licence UNVERIFIED.
- **Who&When** (ICML 2025; repo `mingyin1/Agents_Failure_Attribution`): failure
  logs from 127 MAS annotated with the responsible agent and step. Best method
  about 53.5% at naming the agent and 14.2% at naming the step (secondary
  source, UNVERIFIED). Relevant because quarantine presupposes attribution, and
  post-hoc attribution by an LLM is currently poor.

### 4.4 Tool and environment faults (single agent)

All four from search summaries only; details UNVERIFIED.

- **ReliabilityBench** (https://arxiv.org/abs/2601.06112): timeouts, rate
  limits, partial responses, schema drift; success falls from 96.9% to 88.1%
  at perturbation level 0.2.
- **ToolMaze**: explicit failures (HTTP errors, timeouts) and implicit ones
  (plausible but corrupted output).
- **ToolBench-X / "Beyond Function Calling"**: five recoverable hazard types.
- **AgentCheck** (https://arxiv.org/abs/2607.11098): replay-based, 12 fault
  types for MCP agents; best agent 105/120, worst 77/120; failures are mostly
  silent use of wrong output.
- **τ-bench** (https://arxiv.org/abs/2406.12045): not fault injection, but its
  pass^k metric (success on all of k repeated trials) is the standard way to
  report run-to-run reliability, scored on final database state.

None of these has a multi-agent mode. **I found no public benchmark for agent
drop-out** (an agent removed mid-task, with recovery measured). That is a gap,
and for the swarm programmes it is one we would have to build ourselves on top
of an existing task suite.

---

## 5. What is known about defences

| Defence family | Static-attack result | Adaptive result | Utility / cost |
|---|---|---|---|
| Spotlighting, delimiters | AgentDojo GPT-4o ASR 57.7 → 41.7; ~1% on newer models | >95% ASR (Attacker Moves Second); 265 human breaks | ~1.06× tokens; small utility change |
| Repeat prompt / sandwich | 57.7 → 27.8; raises BU | >95% ASR; can worsen exfiltration in MAS (ACIArena) | cheap |
| Tool filter | 57.7 → 6.8 | not tested in that paper; fails when user and attacker tasks need the same tools (AgentDojo authors) | blocks most tool use on some models (MELON paper) |
| Classifier detectors (Protect AI, PromptGuard, Model Armor, PIGuard) | low ASR | 71% to >90% ASR | BERT detector: BU 69 → 41 on AgentDojo |
| LLM-judge detector | ASR 1.3% (MELON paper) | hardest single detector in LLMail-Inject, still broken by 32% of teams at the top level | UA 20.8% in MELON's table; most expensive |
| MELON (masked re-execution) | ASR 0.24–0.32% | 76% (no knowledge) to 95% (full knowledge) | ~2× API cost; BU 80 → 68–76 |
| Fine-tuned models (SecAlign, StruQ) | ~2% | 96%; broken in every case | needs weights; not applicable to API models |
| CaMeL / dual-LLM with capability tracking | 0 in-scope successes | not tested by a strong third party in what I read | 77% vs 84% utility; ~2.8× tokens; policies to write; text-only manipulation out of scope |
| MAS: sender tagging | −5% ASR alone; near 0 with marking | handcrafted attacks only | no utility metric reported |
| MAS: memory vaccines | robustness 76.7 → 90.0 | not tested | cooperation unchanged (proxy metric) |
| MAS: safety instructions | 76.7 → 87–88 | not tested | cooperation 87 → 52–61 |
| MAS: graph anomaly detection (G-Safeguard) | −12 to −22 points | not tested | needs training data; utility loss in ACIArena |
| MAS: Challenger / Inspector | recovers up to 96% of fault-induced loss | n/a (faults) | extra agent or extra turns |

Two readings follow. First, every *heuristic* defence that has been tested by a
well-resourced adaptive attacker has fallen; the only family with a
by-construction argument is information-flow control (CaMeL and similar), and
it buys that with utility and token cost and a narrower threat model. Second,
in the multi-agent literature almost nothing has faced an adaptive attacker at
all, so published multi-agent defence numbers are upper bounds on robustness.

---

## 6. (a) Shortlist for a small lab ([US$ redacted] per study)

Costs are ESTIMATES at Anthropic list prices as of this study; halve them with
the batch API where the harness allows, and expect prompt caching to help on
long system prompts. Model for the agent under test: Sonnet 5.5 unless noted.

| Rank | Benchmark / subset | Why | Smallest useful subset | Est. cost |
|---|---|---|---|---|
| 1 | **AgentDojo** (latest version via upstream or `inspect_evals`) | Code-scored BU / UA / ASR; standard reference; MIT; Anthropic works; conventional defences are built in | Two suites (workspace + Slack ≈ 345 cases in v1) plus all 97 utility tasks, × {no defence, spotlighting, tool filter, ours}, 1 run each. Use a mid-strength model (Haiku 5.5 or an older Sonnet) as well, so undefended ASR is far enough from zero to measure anything | [US$ redacted] per arm on Sonnet 5.5; [US$ redacted] per arm on Haiku 5.5. Four arms: [US$ redacted] / [US$ redacted] |
| 2 | **TAMAS**, peer-compromise slice | Only public suite with Byzantine, colluding, contradicting and impersonating peers, and an orchestrator-vs-swarm contrast | Two domains × four peer-level threats = 80 adversarial + 40 benign, one orchestrator and one swarm configuration, 3 seeds | [US$ redacted] incl. judge |
| 3 | **MAS-Resilience** protocol (AutoInject on one flat and one hierarchical system) | Non-adversarial faulty-agent test with code-scored tasks; gives the Challenger / Inspector baselines | CIAR (50) + a 50-problem code subset that is *not* HumanEval-easy, one faulty agent, 3 seeds, {none, Inspector, ours} | [US$ redacted] |
| 4 | **Kill-Chain Canaries** harness (or ACIArena if its repo proves usable) | Stage-wise, code-scored propagation metric; small; Claude already supported | Text relay, 3 attack types × 2 models × {none, spotlighting, ours}, n ≥ 30 per cell | [US$ redacted] |

Not shortlisted and why: InjecAgent (no utility; fine as a free smoke test);
ASB (shallow harm criterion, permissive attacker); WASP (hosting burden,
non-commercial, 84 cases); BIPIA (archived, LLM-judged, non-agentic);
LLMail-Inject (dataset, not a harness; worth using offline to measure a
quarantine detector's recall at a fixed false-positive rate, at near-zero cost);
AgentHarm (different question).

Before spending on rank 2 or 4, one hour of reading the repository should
confirm licence, the judge model dependency, and whether a custom agent
topology can be plugged in. None of that was verified here.

---

## 7. (b) What a credible evaluation of an immune-style collective defence needs

The mechanism under test has three parts: quarantine of suspicious content,
attribution of content to peer or operator, and danger signals passed between
peers. Each needs its own evidence.

**1. State the threat model in one paragraph.** Who can write where (tool
output, shared memory, a peer's messages, a peer's profile), what the attacker
knows about the defence, and what is out of scope. Without this the result
cannot be compared with CaMeL (trusted user, untrusted data) or TAMAS
(compromised peer).

**2. Attribution must be enforced by code, not asserted in text.** Our finding
that peer-attributed content raises quarantine is only a defence if the
attacker cannot choose the label. If the label is a string the model reads,
content can claim any origin. The provenance tag has to be set by the harness
from the actual channel and be unforgeable from inside the content. The
evaluation must include a condition where content *claims* a more trusted
origin than its channel gives it, and report that separately. Prior art: sender
tagging alone gave about 5% in Prompt Infection.

**3. Conventional baselines it must beat, at matched tokens and wall-clock.**
- No defence, same topology.
- The single strong agent and the conventional orchestrator, undefended and
  with the cheap defences. If an orchestrator with strict message schemas is
  already robust (ChatDev's 0% for intercepted top roles suggests it can be),
  the collective defence has to justify the collective.
- Spotlighting / delimiting and repeat-prompt (cheap, the usual floor).
- Tool filter or least-privilege tool allocation per agent.
- A detector at the same insertion point (off-the-shelf classifier and an
  LLM-judge detector) tuned to the *same false-positive rate* as our quarantine.
- An extra-verification baseline that spends the same extra tokens: Inspector
  agent or Challenger prompts (MAS-Resilience), or MELON-style re-execution.
- Memory vaccines, passive and active (Security Tax): the direct
  immune-inspired competitor.
- A **random-quarantine control**: quarantine the same fraction of messages
  chosen at random. If random quarantine at rate r gives a similar ASR drop,
  the mechanism is just reducing communication.
- Where the task permits, an information-flow-control design (dual-LLM or
  CaMeL-style) as the upper reference for security, with its utility cost.

**4. Metrics to report, all with intervals.**
- BU, UA, ASR, computed by code wherever the suite allows.
- False-quarantine rate on benign content, including benign third-party
  instructions that the task requires following (AgentDyn's point). This is the
  utility cost at its source.
- Collaboration cost: task success on benign multi-agent tasks, not a
  compliance proxy. The Security Tax paper measured compliance with odd
  requests; a reviewer will ask for real task utility.
- Propagation: number of agents reached, hops, time to containment, and the
  stage at which the chain was cut (exposed / persisted / relayed / executed).
  A final-ASR-only number hides whether quarantine or the model's own refusal
  did the work.
- Tokens, wall-clock, and number of model calls per task, for every arm.
- Run-to-run reliability (pass^k or at least 3–5 seeds), because multi-agent
  runs are high-variance.
- Danger-signal quality: precision and recall of peer alarms, and the cost of
  false alarms (an alarm that spreads is itself a cascade). Include a
  "false-alarm storm" stress condition.

**5. Adaptive evaluation, at a level a small lab can afford.**
- State plainly that static-attack results are an upper bound.
- Give an independent red-teamer (a colleague, not the defence's author) the
  full defence description and a fixed budget, and report results before and
  after. Human adaptive effort was the strongest attacker in both LLMail-Inject
  and "The Attacker Moves Second".
- Use held-out attacks: tune thresholds on one split or suite and report on
  another. LLMail-Inject data is a ready held-out set for the detector part.
- Test the obvious adaptive targets of this mechanism: forged attribution
  (item 2), abuse of the alarm channel to quarantine honest agents (a
  denial-of-service on the collective), and slow or split content that stays
  under the quarantine threshold. Report whether each was tried, not how.
- Follow the repeated-attempt lesson from CAISI: report success over several
  attempts per case, not a single attempt.

**6. Separate the model's contribution from the mechanism's.** With current
Claude models the undefended ASR on public static attacks is often near zero
(AgentDojo results page; Kill-Chain Canaries). Run at least one weaker model
where the undefended baseline is clearly above zero, and one mixed-model
collective, since the cross-model relay result suggests the weakest member sets
the exposure.

**7. Minimum sample sizes.** With ASR near 5%, telling 5% from 2% needs on the
order of 600 cases per arm. Cells of 10–36 runs, as in several multi-agent
papers above, cannot support the comparisons they draw. Pre-register the
primary comparison and the subset before running.

**8. Our own negative result is worth keeping.** "Operator-attributed field
state leaves behaviour unchanged" should be tested on a public suite too. If it
holds, it bounds what attribution can do and is publishable as such.

---

## 8. (c) Pitfalls

1. **Non-adaptive attacks.** Twelve defences that reported near-zero ASR went to
   above 90% (most) under adaptive attack. A new defence evaluated only on a
   suite's default attacks will be read as unproven. Multi-agent defences have
   barely been tested this way at all.
2. **Saturated suites.** AgentDojo's default attack gives 1–7% ASR on 2024–25
   Claude models; HumanEval is near ceiling; WASP's end-to-end ASR is 0–17% on
   84 cases. A defence cannot show an effect where there is no headroom. Fix:
   weaker models, newer versions, stronger public attack sets, or suites built
   for over-defence (AgentDyn).
3. **Security by incompetence.** Low end-to-end ASR may mean the agent failed
   the attacker's task, not that it resisted. Report diversion separately from
   completed harm, and expect ASR to rise with capability.
4. **Judge noise and judge hijacking.** LLM judges score TAMAS, BIPIA,
   AgentHarm, the Security Tax paper, part of ACIArena and WASP's intermediate
   metric. TAMAS's judge F1 is 75% on the category closest to our work. An LLM
   judge reading attacked transcripts can be influenced by them. Prefer
   code-scored suites for headline numbers; where a judge is unavoidable,
   hand-label a sample and report agreement.
5. **Utility-free security scores.** InjecAgent and Prompt Infection have no
   utility metric. Refusing everything wins. Always pair ASR with BU and UA,
   and with the false-quarantine rate.
6. **ASR definitions differ.** "Attacker tool was called" (ASB), "final state
   changed" (AgentDojo, WASP), "agent was diverted" (WASP intermediate),
   "judge says harmful" (TAMAS). Numbers are not comparable across suites, and
   InjecAgent's ASR-valid drops malformed outputs from the denominator.
7. **Small cells.** 36 simulations per condition, n=3 cross-model cells, 10
   instances per threat per domain. Report intervals; do not rank defences on
   differences inside them.
8. **Single attempt versus repeated attempts.** Average success rose from 57%
   to 80% over 25 attempts in the CAISI study. One-shot ASR understates risk
   for any attacker who can retry.
9. **Benchmark versions drift.** AgentDojo has 629 cases in the paper and 949
   in later work; ASB and InjecAgent have several arXiv versions with changed
   numbers; MAS-Resilience's abstract and conclusion disagree. Pin the commit
   and the version in every result.
10. **Stale baselines.** Most published numbers are for GPT-3.5/4o or Claude 3.x.
    They cannot be quoted as the state of current models. Re-run the baselines
    in the same session as the defence.
11. **Topology confounded with defence.** Hierarchical systems lose 5.5 points
    to a faulty agent where linear ones lose 23.7; CrewAI scores safer than
    AutoGen. A swarm with a defence compared against a chain without one
    measures topology. Hold topology fixed or cross it.
12. **The security tax.** Suspicious agents cooperate less. Faulty agents
    sometimes improve results by forcing double-checks. Both mean that a
    defence's net effect on task success can go either way and must be measured
    on benign tasks, not assumed.
13. **Defence adds attack surface.** Sandwiching worsened exfiltration in
    ACIArena. A quarantine or alarm channel is new shared state that can itself
    be targeted. Evaluate it as such.
14. **Harness and provider friction.** Several suites need an OpenAI key for
    the judge even when the agent is Claude (WASP, TAMAS, AgentHarm default).
    Older harnesses may send request parameters that current Claude models
    reject. Budget a day of adapter work per suite and keep the judge model
    fixed across arms.
15. **Licence.** WASP is non-commercial; BIPIA's licence type and the code
    licences of TAMAS, ACIArena, MAS-Resilience, MAS-FIRE and Kill-Chain
    Canaries were not verified. Check before redistributing derived data.
16. **Training-set contamination.** Public attack strings from 2024 suites are
    likely in the training data of 2026 models, which would lower measured ASR
    for reasons unrelated to any defence. This is my inference, not a measured
    result (UNVERIFIED).

---

## 9. Sources

Primary pages opened in this study:

- AgentDojo: https://arxiv.org/abs/2406.13352 · https://github.com/ethz-spylab/agentdojo · https://agentdojo.spylab.ai/results/
- CAISI/NIST blog: https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations · https://github.com/usnistgov/agentdojo-inspect
- InjecAgent: https://arxiv.org/abs/2403.02691 · https://github.com/uiuc-kang-lab/InjecAgent
- ASB: https://arxiv.org/abs/2410.02644 · https://github.com/agiresearch/ASB
- WASP: https://arxiv.org/abs/2504.18575 · https://github.com/facebookresearch/wasp
- BIPIA: https://github.com/microsoft/BIPIA (paper https://arxiv.org/abs/2312.14197 via search only)
- LLMail-Inject: https://arxiv.org/abs/2506.09956
- AgentHarm dataset card: https://huggingface.co/datasets/ai-safety-institute/AgentHarm
- The Attacker Moves Second: https://arxiv.org/abs/2510.09023
- MELON: https://arxiv.org/abs/2502.05174
- CaMeL: https://arxiv.org/abs/2503.18813
- TAMAS: https://arxiv.org/abs/2511.05269
- ACIArena: https://arxiv.org/abs/2604.07775
- Prompt Infection: https://arxiv.org/abs/2410.07283
- Agent Smith: https://arxiv.org/abs/2402.08567
- Multi-Agent Security Tax: https://arxiv.org/abs/2502.19145
- Kill-Chain Canaries: https://arxiv.org/abs/2603.28013
- Agent-in-the-Middle: https://arxiv.org/abs/2502.14847
- G-Safeguard: https://arxiv.org/abs/2502.11127
- MAS-Resilience: https://arxiv.org/abs/2408.00989
- MAS-FIRE: https://arxiv.org/abs/2602.19843
- AgentDyn (abstract): https://arxiv.org/abs/2602.03117
- ART (abstract): https://arxiv.org/abs/2507.20526

Search-summary level only (treat every detail as UNVERIFIED): adaptive attacks
on IPI defences https://arxiv.org/abs/2503.00061; BlindGuard
https://arxiv.org/abs/2508.08127; Byzantine studies
https://arxiv.org/abs/2511.10400, https://arxiv.org/abs/2603.01213,
https://arxiv.org/abs/2605.09076; MAST https://arxiv.org/abs/2503.13657;
Who&When (ICML 2025); ReliabilityBench https://arxiv.org/abs/2601.06112;
AgentCheck https://arxiv.org/abs/2607.11098; ToolMaze; ToolBench-X; τ-bench
https://arxiv.org/abs/2406.12045.

Could not be opened: the `inspect_evals` AgentDojo documentation page (redirect
loop), so its task counts and options are not reported here.
