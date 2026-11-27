# 03 — Deep research and information-seeking benchmarks

Study date: 2026-11-12. Scope: benchmarks for searching, reading and synthesising over a corpus larger than one context window, and the published evidence on single-agent versus multi-agent research systems. Programme: Murmur.

**How to read this file.** Every number was taken from the page cited next to it during this pass (arXiv HTML, project page, repository, dataset card or vendor post). Anything I could not confirm at a primary source is marked **UNVERIFIED**. Leaderboard figures for 2026 come mostly from third-party aggregators that disagree with each other on dates and model names; they are marked as such and should not be cited. No dataset was downloaded and no paid call was made, so "runs with the Anthropic API" is read from repositories and papers, not tested.

## 1. Summary

1. Only a few benchmarks ship a **fixed corpus**. Most deep-research benchmarks (WideSearch, DeepWideSearch, Mind2Web 2, DeepResearch Bench, GAIA, xbench-DeepSearch, DeepSearchQA) need the live web, so two runs a week apart are not the same experiment. The reproducible ones are BrowseComp-Plus, Oolong, Loong, LongBench v2, MoNaCo (evidence annotations), LitSearch, ALCE, AVeriTeC, and the hosted frozen-web services (DeepResearchGym, FutureSearch Deep Research Bench).
2. **Wide and reproducible rarely coincide.** The wide benchmarks (table filling over tens to hundreds of entities) are live-web; the reproducible ones are mostly deep (one hard-to-find answer). The exceptions are Oolong (aggregation over long inputs, synthetic) and anything we build ourselves.
3. **Nobody has published a matched-budget single-agent vs multi-agent comparison on a wide research benchmark.** The matched-budget studies that exist are on multi-hop QA (Tran and Kiela) or match a small reasoning-token budget on BrowseComp-Plus (Google's scaling study). On both, multi-agent is flat or worse except in specific conditions. WideSearch and DeepWideSearch report multi-agent gains in item-level F1 without reporting or matching tokens.
4. Anthropic's write-up is explicit that its multi-agent gain comes with more tokens: token usage "by itself explains 80% of the variance" on BrowseComp, and multi-agent systems use "about 15× more tokens than chats". The 15× is relative to chat, not to a single agent (single agents are "about 4×"), and the "90.2%" improvement is on an internal eval with no budget matching.
5. Saturation: original BrowseComp is near ceiling for frontier systems (aggregators report 85–93%, UNVERIFIED; Anthropic's own Opus 4.6 page reports 86.8% with a multi-agent harness). BrowseComp-Plus is at 83.1% for the best published agent with BM25, but mid-tier models sit at 55–70%, which leaves headroom if we use a cheaper model. WideSearch strict success was about 5% in the paper; item-level F1 was 41–62%.

## 2. Benchmarks, one by one

Abbreviations: EM = exact match; SR = success rate; "wide" = many independent look-ups whose results are merged; "deep" = a chain where each step depends on the last.

### 2.1 BrowseComp (OpenAI, 2025)

| Field | Value |
|---|---|
| Task | Short-answer questions whose answer is hard to find but easy to verify; needs persistent browsing |
| Size | 1,266 questions ([arXiv 2504.12516](https://arxiv.org/abs/2504.12516)) |
| Scoring | Short reference answer, graded by an LLM grader prompt; simple because answers are short |
| Corpus | Live web. Not reproducible; pages and search rankings drift, and answers have leaked onto the web |
| Cost | Anthropic's Opus 4.6 run allowed "up to 10M total tokens" per question with compaction at 50k ([Anthropic](https://www.anthropic.com/news/claude-opus-4-6)); that is far outside our budget |
| Saturation | High. Opus 4.6 multi-agent 86.8% (later corrected to 86.57%, single-agent best 83.73%, per the system-card changelog as returned by search; **UNVERIFIED** at the PDF, which was too large to open). Aggregators list 2026 models at 85–93% (**UNVERIFIED**) |
| Wide or deep | Deep |
| Licence | Distributed through `openai/simple-evals`; data licence **UNVERIFIED** |
| Anthropic API + local retriever | Anthropic API yes; local retriever no (that is what BrowseComp-Plus is for) |

Human baseline (about 29% solved, most abandoned within two hours) and the paper's best-of-N/majority-vote aggregation gains are **UNVERIFIED**: the OpenAI page returned HTTP 403 and the arXiv abstract page does not contain them.

Relevance: Anthropic's "token usage explains 80% of the variance" claim was measured here. The Opus 4.6 numbers are the only vendor-published single-vs-multi pair I found on a public benchmark: about +2.8 points for multi-agent, with no token figures for either arm.

### 2.2 BrowseComp-Plus (Waterloo et al., 2025; ACL 2026)

| Field | Value |
|---|---|
| Task | BrowseComp questions answered against a fixed, human-verified corpus through a local search tool |
| Size | 830 queries (from 1,266; 1,005 survived scraping, 830 survived human verification) over 100,195 documents averaging about 5,179 words. Per query: 6.1 evidence documents, 2.9 gold documents, 76.3 mined hard negatives ([arXiv 2508.06600](https://arxiv.org/html/2508.06600v1)) |
| Scoring | Answer accuracy by LLM judge with the BrowseComp prompt (gpt-4.1 in the paper; the repository's `evaluate_run.py` uses Qwen3-32B so the judge stays available). Also evidence recall against human qrels, number of search calls, calibration error. Judge–human agreement for this benchmark is not reported in the text I read (**UNVERIFIED**); answers are short, so judge error should be small |
| Corpus | Fixed. Queries, answers and document lists are obfuscated (XOR with a key derived from a canary string) and decrypted locally. Pre-built BM25 and Qwen3-Embedding indexes are downloadable ([dataset card](https://huggingface.co/datasets/Tevatron/browsecomp-plus), [repo](https://github.com/texttron/BrowseComp-Plus)) |
| Cost | Whole-benchmark cost in the paper (830 queries, top-5 results truncated to 512 tokens): Sonnet 4 [US$ redacted] with BM25, Opus 4 [US$ redacted] gpt-5 [US$ redacted] gpt-4.1 [US$ redacted] Gemini 2.5 Flash [US$ redacted] That is [US$ redacted] per query. Pi-Serini (2026, three tools, BM25): gpt-5.5 [US$ redacted] Opus 4.7 [US$ redacted] Haiku 4.5 [US$ redacted] for 830 queries, i.e. [US$ redacted] per query; median about 271k total tokens per query for gpt-5.4, about 84% cached ([arXiv 2605.10848](https://arxiv.org/html/2605.10848)) |
| Saturation | Paper (2025): gpt-5 55.9% with BM25, 70.1% with Qwen3-Embed-8B; Opus 4 15.5% / 36.1%; Sonnet 4 14.3% / 36.8%. Oracle (all positives given): gpt-4.1 93.5%. Pi-Serini (2026): gpt-5.5 83.1%, gpt-5 74.6%, Opus 4.7 69.8%, Haiku 4.5 54.8%. Headroom is shrinking at the top and adequate in the middle. The live leaderboard page did not render (**UNVERIFIED** current top) |
| Wide or deep | Deep. Mean 9–26 search calls per query, sequential refinement. A swarm can parallelise hypotheses, not the chain |
| Licence | MIT on the dataset card and repository; the paper's HTML page states CC BY 4.0. Treat as permissive but check the LICENSE file before redistribution |
| Anthropic API + local retriever | Yes. The repository documents an Anthropic client and a custom-retriever interface. BM25 needs Java 21 and no GPU. The Qwen3-32B judge needs GPUs; using a Claude or gpt-4.1 judge is a deviation that must be stated |

Notes. (a) The retriever matters as much as the agent: BM25 evidence Recall@100 is 4.7% in the paper against 47.7% for Qwen3-Embed-8B, yet Pi-Serini reaches 94.7% surfaced-evidence recall with tuned BM25 and deeper lists, so "BM25" is not one condition. (b) The questions derive from a 2025 public benchmark; frontier models may know some answers. A closed-book arm is required. (c) The hard negatives make this the closest public analogue to Murmur's "sources that may be wrong", although the negatives are distractors, not planted falsehoods.

### 2.3 WideSearch (ByteDance Seed, 2025; ICLR 2026)

| Field | Value |
|---|---|
| Task | Collect many atomic facts from the web and return one table with fixed columns |
| Size | 200 tasks, 100 English and 100 Chinese, 18 topics. Mean human completion time 2.33 h, 44.1 unique pages consulted ([arXiv 2508.07999](https://arxiv.org/html/2508.07999v2)). Gold tables: median 37 rows and 200 cells, mean 73 rows and 450 cells, largest 8,748 cells (count by a vendor, [Parallel](https://parallel.ai/articles/widesearch-benchmark.md), not by the authors) |
| Scoring | Rows joined on primary keys, cells checked per column by EM, numeric tolerance, date or URL normalisation, or LLM judge (gpt-4.1 default). Judge–human agreement 97.8–98.3% on 200 item-level responses. Metrics: success rate (whole table correct), row F1, item F1; four runs per task reported as Avg@4, Pass@4, Max@4 |
| Corpus | Live web; the user must plug in a search tool. Gold tables have been public since August 2025 (contamination) and can age |
| Cost | Not reported in the paper. Vendor runs (Sept 2026, 100-task sample, partial-credit score): [US$ redacted] per task depending on model tier. Not comparable to the paper's metrics |
| Saturation | Low on strict success: best 5.1% Avg@4 (o3, multi-agent); one human alone 20% on 20 tasks. Item F1 41–62% Avg@4. A paper note lists multi-agent GPT-5 at 7.3% SR and 74.5 item F1 Max@4 (**UNVERIFIED**). No authoritative 2026 leaderboard found |
| Wide or deep | Wide. This is the clearest parallelisable benchmark in the set |
| Licence | MIT (repository) |
| Anthropic API + local retriever | Anthropic API yes (model config is pluggable). Local retriever no: there is no corpus |

Single vs multi-agent in the paper (Avg@4, same model in both arms):

| Model | Single SR | Multi SR | Single item F1 | Multi item F1 |
|---|---:|---:|---:|---:|
| Claude Sonnet 4 (Thinking) | 2.3 | 3.6 | 57.9 | 62.2 |
| Gemini 2.5 Pro | 1.5 | 2.0 | 51.0 | 57.4 |
| OpenAI o3 | 4.5 | 5.1 | 52.6 | 57.3 |
| Kimi K2 | 1.1 | 3.0 | 54.4 | 61.2 |
| DeepSeek-R1 | 0.4 | 0.8 | 41.3 | 44.3 |

Multi-agent gains are 3–7 points of item F1. The paper reports no token or cost figures and does not match budgets, so the table cannot tell us whether the gain is architecture or spend. With Kimi K2 and test-time scaling, item F1 approached 80% while success stayed under 20% at 128 attempts: more compute keeps paying on recall and does not fix whole-table correctness.

### 2.4 DeepWideSearch (Alibaba, 2025)

220 questions (85 built by widening BrowseComp-style questions, 135 by deepening WideSearch queries), 15 domains, English and Chinese, mean 414 information units per table ([arXiv 2510.20168](https://arxiv.org/html/2510.20168v1)). Scoring against human tables: success rate, row F1, item F1, column F1, core-entity accuracy; four runs. No LLM judge is described. Live web. Best success 2.39% (WebSailor with Claude Sonnet 4); item F1 14–33%. Cost per question is reported for a few systems: about [US$ redacted] (WebSailor, GPT-5), [US$ redacted] (WebSailor, Sonnet 4), [US$ redacted] (OWL, GPT-5; above [US$ redacted] with retries). Context overflow occurred in 24.96% of cases. Agent frameworks improved core-entity accuracy and often scored below the bare model on width metrics. Wide and deep. Dataset licence not stated in the paper (**UNVERIFIED**). Useful as a harder follow-up to WideSearch; the same live-web problem applies.

A-MapReduce ([arXiv 2602.01331](https://arxiv.org/abs/2602.01331)) reports state of the art on WideSearch and DeepWideSearch with 5–17.5 points of item F1 over strong baselines and 45.8% less running time than other multi-agent baselines. The abstract does not describe a single-agent arm or budget matching (**UNVERIFIED** beyond the abstract).

### 2.5 DeepResearch Bench (USTC, 2025; ICLR 2026)

100 PhD-level report tasks, 22 domains, 50 Chinese and 50 English ([arXiv 2506.11763](https://arxiv.org/html/2506.11763v1)). Scoring: RACE (Gemini-2.5-Pro judge, task-specific criteria, scored relative to a reference report; comprehensiveness, insight, instruction following, readability) and FACT (statement–URL pairs extracted and checked against the fetched page; citation accuracy and effective citations). Validation: pairwise agreement with humans 71.33% against 68.44% between humans, on 50 Chinese tasks and about 600 reports; filtered per-task Pearson 60.2. Results cluster tightly: Gemini Deep Research 48.9, OpenAI Deep Research 47.0, Perplexity 42.3, Claude 3.7 Sonnet with search 40.7. Judge cost about [US$ redacted] per report. Live web, and FACT re-fetches pages at evaluation time. Open-ended; neither clearly wide nor deep. Licence CC BY 4.0 as stated on the paper page. LangChain's Open Deep Research reported 0.4344 at about 207M total tokens and [US$ redacted] for the 100 tasks (table scraped with misaligned columns; **UNVERIFIED**), which gives an order of magnitude of 2M tokens and [US$ redacted] per task.

Assessment: the whole range between a search-enabled chat model and the best deep-research product is about 8 RACE points, and the judge agrees with humans about as often as humans agree with each other (roughly 70% pairwise). An architecture effect of a few points would not be distinguishable from judge noise at our sample sizes. Not recommended as a primary outcome.

### 2.6 DeepResearchGym (CMU, 2025)

A hosted, free search API over frozen web snapshots: ClueWeb22-B (about 200M pages, 87M English), ClueWeb22-A (about 1B) and FineWeb CC-MAIN-2024-51 (over 180M documents), dense retrieval with MiniCPM-Embedding-Light and DiskANN ([arXiv 2505.19253](https://arxiv.org/html/2505.19253v3)). Evaluation: top 1,000 Researchy Questions by clicks; key-point recall and contradiction, citation precision and recall, clarity and insight; judge gpt-4.1-mini. Human study on 210 queries: annotator κ 0.87; judge–human κ 0.72 (key-point recall), 0.86 (citations), 0.89 (clarity), 0.84 (insight). FineWeb is open; ClueWeb22 needs a research licence. It works with any model that can call an HTTP tool.

Assessment: this is the cheapest way to make a live-web benchmark reproducible, because the index does not change. Two caveats: it is a third-party service that can disappear or be rate-limited, and a 2024 snapshot will not contain answers to questions written against the 2025 web, so WideSearch tasks cannot simply be redirected to it. Its own evaluation set is report-style with LLM-judged key points, weaker than a table or short answer.

### 2.7 FutureSearch Deep Research Bench

169 tasks (the 2025 paper had 89 in 8 categories), each with 10k–100k offline web pages served by "RetroSearch", which emulates the Serper search API over frozen pages ([arXiv 2506.06287](https://arxiv.org/abs/2506.06287), [leaderboard](https://drb.futuresearch.ai/)). Top scores on 2026-06-10: Opus 4.6 (high) 0.553, Sonnet 4.6 (high) 0.549, GPT-5.5 (high) 0.540; cost per run [US$ redacted] The design is what we want (frozen web, curated answers, cheap). The obstacle is access: the page says to contact the company to run on the benchmark, and neither the tasks nor RetroSearch appear to be downloadable (**UNVERIFIED**). The top of the leaderboard is also compressed into 1.3 points, which suggests the benchmark no longer separates systems, or that the remaining tasks are unanswerable from the frozen pages.

### 2.8 Mind2Web 2 (OSU, 2025; NeurIPS 2025)

130 long-horizon tasks needing real-time browsing and synthesis, 6 domains, 24 sub-domains; 10 public, 120 private; 57 explicitly time-varying ([arXiv 2506.21506](https://arxiv.org/html/2506.21506v2), [project](https://osu-nlp-group.github.io/Mind2Web-2/)). Scoring by task-specific judge agents over a tree rubric with binary leaves, covering correctness and attribution; a human audit of 15 tasks and 720 leaf verifications found 99.03% node-level correctness. Results (private set, three runs): OpenAI Deep Research partial completion 0.54 and SR 28%; humans on 30 tasks 0.79 and 54%. Live web by design; private test set evaluated by the authors. Mixed wide and deep. Licence for data and judge code not stated on the pages read (**UNVERIFIED**).

Assessment: the best-validated rubric judge in this list, but only 10 tasks are public and the web is live. The tree-rubric method is worth copying for a home-grown benchmark; the benchmark itself is not usable for a matched-budget study.

### 2.9 GAIA (Meta/HF, 2023)

466 questions; answers to 300 are withheld for the leaderboard ([arXiv 2311.12983](https://arxiv.org/abs/2311.12983)). Humans 92%, GPT-4 with plugins 15% at release. Three difficulty levels, short answers scored by normalised exact match, validation split of 165 with public answers (levels, EM and split sizes are from memory; **UNVERIFIED** in this pass). Live web plus files and tools. 2026 scores reported by secondary sources range from 74.6% (HAL, Claude Sonnet 4.5) to a vendor's 93.4% claim (**UNVERIFIED**). Deep and tool-heavy rather than wide; many tasks are single-document or computation tasks. Assessment: near saturation, validation answers are public and widely trained on, and breadth does not exceed one context. Not suitable for Murmur.

### 2.10 Humanity's Last Exam

Closed-ended expert questions (about 2,500; **UNVERIFIED** in this pass). Anthropic reports Opus 4.6 "with tools" at 53.0% with web search, fetch, code execution, compaction at 50k and up to 3M total tokens per question, with a domain blocklist for decontamination ([Anthropic](https://www.anthropic.com/news/claude-opus-4-6)). Aggregators list 2026 tool-assisted scores up to about 64% (**UNVERIFIED**). It measures expert reasoning, not breadth of reading; search helps mainly through leakage, which is why a blocklist is needed. Not relevant to Murmur except as a warning about contamination and about per-question budgets in the millions of tokens.

### 2.11 xbench-DeepSearch

100 questions per release (2505 and 2510), Chinese, answers encrypted, MIT licence on the dataset card ([HF](https://huggingface.co/datasets/xbench/DeepSearch-2510)). The card's leaderboard (evaluated 2025-08) lists ChatGPT-5-Pro at "75+" and most products at 30–40+, with cost per task [US$ redacted] Scoring procedure is not on the card (**UNVERIFIED**). Live web, deep, small, coarse score bands. Low priority.

### 2.12 DeepSearchQA (Google, 2025–2026)

900 prompts in 17 fields, 65% with set answers; F1 over answer sets with an LLM judging item equivalence (Gemini 2.5 Flash in the starter code), plus a "fully correct" rate; Apache 2.0 ([arXiv 2601.20975](https://arxiv.org/abs/2601.20975), details via a vendor explainer, so second-hand). Gemini Deep Research: 66.1% fully correct, 81.9 F1. Live web; grading ignores the trajectory; gold answers can go stale. Set answers make it partly wide. Anthropic's Opus 4.6 system card has a "multi-agent DeepSearchQA" section whose numbers I could not open (**UNVERIFIED**).

### 2.13 Scholarly search, synthesis and citation faithfulness

| Benchmark | What it measures | Size | Scoring and validation | Corpus | Notes |
|---|---|---|---|---|---|
| LitSearch (Princeton, EMNLP 2024) | Retrieval for literature-search questions | 597 queries over about 64K ACL Anthology and ICLR papers | Recall@k against expert-checked relevant papers; objective | Fixed | BM25 about 50% recall@5, best dense about 75% (alphaXiv summary). Retrieval only, no synthesis. Licence **UNVERIFIED** ([ACL](https://aclanthology.org/2024.emnlp-main.840/)) |
| ScholarQABench (OpenScholar, 2024; Nature 2026) | Literature QA and synthesis with citations | 2,967 expert-written queries, 208 long-form answers, four fields | Correctness rubrics and citation precision/recall; expert study with 16 scientists on 108 questions | Open-access paper datastore (tens of millions of papers), heavy to host | Licence reported as Apache-2.0 by a third party (**UNVERIFIED**) ([arXiv 2411.14199](https://arxiv.org/abs/2411.14199v1)) |
| ALCE (Princeton, 2023) | Answering with citations to passages | ASQA, QAMPARI, ELI5 subsets | Citation recall/precision by an NLI model (TRUE); automatic vs human accuracy 85.1% (recall) and 77.6% (precision) | Fixed (Wikipedia, Sphere) | QAMPARI is list-answer and therefore wide. Old and probably easy for 2026 models (**UNVERIFIED**) ([arXiv 2305.14627](https://arxiv.org/abs/2305.14627)) |
| CiteEval / CiteBench (AWS, ACL 2025) | A metric: citation quality judged against the full retrieved context, not just the cited passage | Human statement-level judgments on RAG outputs | CiteEval-Auto correlates with humans better than AutoAIS, AttrScore, LQAC; coefficients not read (**UNVERIFIED**) | n/a | A scorer to reuse, not a task set ([arXiv 2506.01829](https://arxiv.org/abs/2506.01829)) |
| SummHay (Salesforce, 2024) | Summarise about 100 documents (about 100k tokens) with citations | 10 haystacks, 92 tasks | Coverage and citation scores against planted insights; human joint score 56.1 | Fixed, synthetic | Fits in one context today, so breadth no longer exceeds a single agent ([arXiv 2407.01370](https://arxiv.org/abs/2407.01370)) |

For Murmur these matter less as tasks and more as measurement instruments: ALCE-style or CiteEval-style citation checks can be applied to any corpus we control, including ours, where each claim must cite a document identifier and the check is whether that document contains the claim.

### 2.14 Long-document and multi-document QA

| Benchmark | Size and length | Scoring | 2026 status | Fit |
|---|---|---|---|---|
| Loong (EMNLP 2024) | 1,600 instances, English and Chinese; financial reports, legal cases, papers; about 11 documents each, 10–250K tokens; every document is needed ([arXiv 2406.17419](https://arxiv.org/html/2406.17419v2)) | GPT-4 judge 0–100, average and perfect rate; no separate judge validation in the paper | 2024 best: Gemini 1.5 Pro 55.4 average, 0.27 perfect rate. RAG was worse than long context (GPT-4o 46.5 vs 53.5). 2026 scores **UNVERIFIED** | Fixed, comparison and clustering are wide-ish, but 250K tokens now fits one context window. Licence not stated in the paper (**UNVERIFIED**) |
| LongBench v2 (Tsinghua, 2024) | 503 multiple-choice questions, 8k–2M words, most under 128k ([site](https://longbench2.github.io)) | Multiple-choice accuracy (objective) | Human experts 53.7% in 15 minutes; official board (last updated 2025-05) tops at 63.3%; aggregators report 66.3% in Sept 2026 with the top models within 2.4 points (**UNVERIFIED**) | Fixed, objective, but mostly single-document and mostly within one context. Four-way multiple choice has a 25% floor and a narrow useful range |
| NovelQA (ICLR 2025) | Questions over full novels above 200K tokens ([site](https://novelqa.github.io)); counts not on the page (**UNVERIFIED**) | Multiple choice and generative | Site board is stale (Claude 3 Sonnet 71% multiple choice; human 97%). Apache-2.0 | One long document, sequential reading. Deep, not wide |
| FRAMES (Google, 2024) | 824 multi-hop questions needing 2–15 Wikipedia articles | LLM-judged accuracy | Oracle 72.9% with Gemini 1.5 Pro at release; no 2026 primary numbers found. Used by Tran and Kiela for the matched-budget study, who found signs of memorisation | Wikipedia, small evidence sets, fits one context. Not broad enough |
| MoNaCo (TACL 2026) | 1,315 natural questions; evidence from 43.3 Wikipedia pages on average (median 12); 36K distinct pages; list answers average 16.2 items ([arXiv 2508.11133](https://arxiv.org/html/2508.11133v2)) | Precision/recall/F1 with a GPT-4.1 judge | Closed-book o3 61.2 F1; oracle evidence GPT-4o 58.7; BM25 top-20 RAG GPT-4o 37.3 | Genuinely wide and has gold reasoning chains. But closed-book is as good as oracle, i.e. frontier models answer from memory of Wikipedia. Any retrieval arm is measuring recall of training data unless the closed-book score is subtracted |
| Oolong (CMU, 2025) | Synth: 400 test questions per context length, lengths at every power of two from 1K to 4M tokens. Real: D&D transcripts, 55K–1.3M tokens ([arXiv 2511.02817](https://arxiv.org/html/2511.02817v2)) | EM for labels, dates, users; numeric answers get 0.75^abs(error). Fully objective | At 128K: GPT-5 46.4, Claude Sonnet 4 48.0, Gemini 3 Pro 62.4 (synth). An iterative BM25 agent with GPT-5 scored 16–18 points below plain GPT-5 on Oolong-real | The task is "classify every item, then count or compare", which is the definition of a wide aggregation task, and lengths go beyond any context window. Data on Hugging Face (`oolongbench`); licence **UNVERIFIED** |

Oolong deserves attention for a specific reason. The authors found that giving the model gold labels for each item improved scores only slightly, so the bottleneck is aggregation, not per-item judgement, and that a retrieval agent did worse than reading everything. Both findings argue against the naive version of the swarm thesis: parallel readers do not help if the merge step is where errors arise, and retrieval is the wrong tool when every item counts.

### 2.15 Fact-checking with evidence retrieval

AVeriTeC ships a per-claim knowledge store of scraped web documents, so retrieval is reproducible; the 2025 shared task scored with Ev2R (an LLM judge of evidence adequacy) and imposed one minute per claim on a fixed machine; the winning system scored 0.33 ([Ev2R, arXiv 2411.05375](https://arxiv.org/abs/2411.05375); results via search summaries, **UNVERIFIED** at the overview paper). Each claim needs a handful of documents, so it is not broad, but it is the one public task where sources are unreliable and contradict each other by construction. FEVER and SciFact are saturated or too small for our purpose (**UNVERIFIED**, not re-checked). Use AVeriTeC only if Murmur needs a "sources may be wrong" stressor with public ground truth; cost per claim was not found.

### 2.16 Other 2026 entries seen but not studied

DR³-Eval (static per-task sandbox corpus with distractors, five rubric dimensions, multi-agent reference system; task count and judge agreement not on the abstract page; [arXiv 2604.14683](https://arxiv.org/abs/2604.14683)), DRBench (self-hosted, enterprise files plus web; [arXiv 2510.00172](https://arxiv.org/abs/2510.00172)), TaxoBench (in our library: retrieval and taxonomy building against expert taxonomies), DeepWeb-Bench, MMDeepResearch-Bench. All **UNVERIFIED** beyond their abstracts. DR³-Eval is the one to read next because it is fixed-corpus and report-style.

## 3. Evidence on single-agent versus multi-agent research systems

| Source | What was compared | Budget matching | Result |
|---|---|---|---|
| Anthropic, "How we built our multi-agent research system" (June 2025) ([link](https://www.anthropic.com/engineering/multi-agent-research-system)) | Opus 4 lead with Sonnet 4 subagents vs single-agent Opus 4, internal research eval | None | "outperformed single-agent Claude Opus 4 by 90.2% on our internal research eval". No task list, no confidence interval, no token count per arm |
| Same | Variance analysis on BrowseComp | n/a | Three factors explained 95% of variance; "token usage by itself explains 80% of the variance"; the others were number of tool calls and model choice |
| Same | Token cost | n/a | "agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats". So multi-agent is roughly 3.75× a single agent by their own figures. Parallel tool calling "cut research time by up to 90% for complex queries" |
| Same | Evaluation method | n/a | Started with "about 20 queries"; one LLM-judge call scoring factual accuracy, citation accuracy, completeness, source quality, tool efficiency on 0.0–1.0 plus pass/fail. They state multi-agent is a poor fit where agents must share context or have many dependencies |
| Anthropic, Opus 4.6 release (2026) ([link](https://www.anthropic.com/news/claude-opus-4-6)) | BrowseComp, single agent vs multi-agent harness | Not stated. Budget cap of 10M total tokens per question | 86.8% multi-agent; single-agent about 84% per the system card (**UNVERIFIED**). About +3 points near ceiling |
| WideSearch paper | Same model as single agent and as lead with parallel sub-agents, 200 tasks × 4 runs | None; tokens not reported | Multi better by 0.5–1.9 points SR and 3–7 points item F1 (table in 2.3) |
| DeepWideSearch paper | Bare LLMs with search vs agent frameworks (WebSailor, OWL, Smolagents) | None; cost reported for a few systems | Frameworks help core-entity accuracy, often hurt width metrics; best SR 2.39% |
| Google/MIT, "Towards a Science of Scaling Agent Systems" (Dec 2025) ([arXiv 2512.08296](https://arxiv.org/html/2512.08296v2)) | Single agent vs independent, centralised, decentralised, hybrid; 180 configurations; BrowseComp-Plus is one of four benchmarks | Matched total reasoning tokens, mean 4,800 per trial; multi-agent arms get fewer iterations per agent | BrowseComp-Plus: single 0.318; decentralised 0.347 (+9.2%); centralised +0.2%; independent about −35%. Overhead 58–515%; error amplification 17.2× for independent agents, 4.4× with an orchestrator. Multi-agent stops paying once the single agent is above about 45% |
| Tran and Kiela (Apr 2026) ([arXiv 2604.02460](https://arxiv.org/html/2604.02460v1)) | Single agent vs sequential, parallel-subtask, parallel-roles, debate, ensemble on 4-hop FRAMES and MuSiQue | Matched thinking tokens (100–10,000), excluding prompts and answers | Single agent matches or beats multi-agent at every budget except 100 tokens (0.418 vs 0.379 at 1k). Multi-agent wins only when the single agent's context is corrupted (masking, substitution). API thinking-token accounting is unreliable for Gemini |
| "The Illusion of Multi-Agent Advantage" (June 2026) ([arXiv 2606.13003](https://arxiv.org/abs/2606.13003)) | Automatically generated multi-agent systems vs chain-of-thought with self-consistency, including BrowseComp-Plus | Cost reported, matching not stated in the abstract | Automatic multi-agent systems underperform self-consistency while costing up to 10× more; expert-designed ones do better on a synthetic set built for decomposition and parallelism (**UNVERIFIED** beyond the abstract) |
| Oolong | GPT-5 reading everything vs a GPT-5 iterative retrieval agent | None | Agent 16–18 points worse |
| Open-source systems (GPT-Researcher, Open Deep Research, WebThinker) | Report quality or QA accuracy vs other systems | None found | Open Deep Research: 0.4344 RACE at about 207M tokens (**UNVERIFIED**). WebThinker: 48.5% GAIA (103 text-only dev questions), 46.5% WebWalkerQA with a 32B model, compared against other single-model search methods, not against a matched single agent. GPT-Researcher in DeepResearchGym: key-point recall 60.6 with its commercial API and 64.7 with the frozen index. None isolates the multi-agent structure |
| OpenAI and Google deep research products | Product vs product on HLE, GAIA, DeepSearchQA, Mind2Web 2 | None | No published single-vs-multi ablation found |

Reading of the evidence. (1) Every positive multi-agent result on research tasks is unmatched on tokens, and the one group that analysed its own data (Anthropic) attributes most of the variance to tokens. (2) Where tokens were matched, the budgets were tiny (hundreds to a few thousand reasoning tokens) and the tasks were deep, which is the regime where splitting context should hurt; this does not test a swarm on a corpus that does not fit in one window. (3) The specific condition under which theory and data both favour multiple agents is degraded or overflowing single-agent context. That is exactly Murmur's premise, and it has not been tested at matched total tokens on a wide task with objective scoring. That gap is real and is where a small lab can contribute.

## 4. Home-grown option: a benchmark on the library

What exists (read from `library/README.md`, `library/enrichment/AUDIT.md`, `library/evidence/README.md`, and counted from the files): `catalog.csv` has 7,594 records, 6,381 with abstracts totalling 8.84M characters (roughly 2.2M tokens); the 2026-11-11 enrichment adds 2,076 records, giving about 9,670 records and something near 3M tokens of abstracts. `evidence/evidence.jsonl` has 3,043 cards (990 from full text) with closed-vocabulary fields; the enrichment folder holds 2,046 more abstract-level cards. The corpus skews to 2025–2026 preprints.

Why it is attractive: fixed, local, free to query, larger than one context window, and the records are too recent to be in model training data in bulk. Why it is dangerous: every label was written by a model.

Measured reliability of the labels (from the evidence README): Haiku vs Sonnet agreement on abstracts is 0.94 for `llm_based`, 0.98 for `bio_inspired`, 0.93 for `reports_tokens_or_cost`, but 0.78 for `compute_matched`, 0.77 for `system_type` and 0.65 for `coordination`; full text changed `compute_matched` in 45% of cases and `baseline_single_agent` in 38%; against an Opus/Sonnet consensus on 35 random cards, `compute_matched` was 59% accurate. No human has checked any card.

### 4.1 Designs that could be valid

| Design | Question type | Ground truth | Validity |
|---|---|---|---|
| A. Metadata census | "How many 2025 records from arXiv mention both 'stigmergy' and 'LLM' in the abstract?", "List every record whose abstract reports a result on SWE-bench" | Computed by a deterministic script over the text (regex or exact field) | Fully objective and free. But a competent single agent will write the script, which is the right answer and makes agent count irrelevant unless code execution is withheld. Good as a control task, not as the main one |
| B. Semantic census with adjudicated ground truth | "Which papers in this 600-record slice report a single-agent baseline at matched compute, and what direction is the result?" Answer is a set plus a count | Built once by exhaustive reading: two different model families label every record in the slice independently, disagreements go to a third model and then to a human, and a human audits a random sample of the agreed labels to estimate residual error | Valid if the audit error rate is published with the benchmark and items with unresolved disagreement are dropped. Scored by set precision/recall/F1 against record identifiers, no judge needed |
| C. Planted-needle aggregation | Insert synthetic records (or edit numeric facts in copies of real abstracts) with known values; ask for aggregates that depend on them: "sum the reported token overheads across the 40 papers in family X" | Known by construction | Fully objective, immune to label noise and to training-data leakage, and lets us inject wrong or changed sources on purpose (Murmur's stated condition). The cost is realism: models can sometimes spot synthetic text |
| D. Evidence-table filling | "For each of these 150 papers, fill: single-agent baseline (y/n), budget unit, direction of result" | As in B, per cell | WideSearch-style item F1 with the row key given, so the task is purely reading and judging. Needs full text, which lives on the server, not in git |

The recommended combination is C for the headline number (objective, controllable, supports perturbations) with a B or D slice of 300–600 records as the realism check.

### 4.2 Traps

1. **Machine-label ground truth is circular.** If Haiku wrote the labels, the benchmark measures agreement with Haiku. An arm built on the same model family will be favoured and the ceiling is the label accuracy (59–97% depending on the field). Never score against the existing cards directly; use them only to choose slices.
2. **Leakage through the repository.** The cards, `by-program/*.csv`, shortlists and `compute-matched.md` contain the answers. Agents with file access must be sandboxed to the abstracts only, and record identifiers in the benchmark should be re-keyed so that cached cards cannot be joined.
3. **Leakage through the model.** Abstracts of well-known papers are memorised. Run a closed-book arm (question only, no corpus) and report scores net of it. MoNaCo shows how bad this can be: closed-book equals oracle.
4. **Abstracts under-determine the answer.** `compute_matched` and `baseline_single_agent` are mostly not stated in abstracts. Questions on those fields from abstracts alone have no stable truth. Restrict semantic questions to what the given text contains, or use full text.
5. **A script beats a swarm.** For any question reducible to keyword matching, the best system is one agent with `grep`. Decide in advance whether tools are allowed and give every arm the same ones.
6. **Context windows move.** About 3M tokens of abstracts exceeds a 1M window today; a 600-record slice (about 200K tokens) does not. Either use the whole catalogue or state that the single agent is run both with the slice in context and with retrieval only.
7. **Construct validity.** A benchmark we wrote, on our corpus, scored by our scripts, with our hypothesis, has every degree of freedom pointing our way. Pre-register the questions, the scoring script and the arms; freeze them by hash before the first run; hold out half the questions.
8. **Small n.** With 30–50 aggregate questions the confidence interval on a mean F1 difference is wide. Use per-item scoring (hundreds of cells) and paired tests across questions and seeds.

Cost to build: label pass over a 600-record slice with two model families via batch API is a few dollars at the rates the card pipeline recorded ([US$ redacted] for 3,043 abstract cards plus 200 full-text cards); the human audit of about 100 items is the real cost.

## 5. Shortlist for a small lab

Costs are estimates built from the per-query and per-task costs cited above, not measured by us. They assume a mid-tier Anthropic model, prompt caching, and three seeds where stated. Confirm current prices before running.

| Rank | Benchmark and subset | Why | Smallest useful subset | Estimated cost |
|---|---|---|---|---|
| 1 | **BrowseComp-Plus**, BM25, mid-tier model | Only public deep-research benchmark with a fixed corpus, human qrels, a documented Anthropic client and existing matched-budget numbers to compare with (Google: single 0.318, decentralised +9.2%). Objective enough (short answers). Evidence recall gives a second, judge-free outcome | 100 queries stratified by number of gold documents, fixed seed list; 3 arms × 1 run plus a 100-query closed-book arm | At [US$ redacted] per query per arm (Haiku 4.5 to Sonnet-class single agent): [US$ redacted] for three matched arms. 60 queries brings it to [US$ redacted] |
| 2 | **Oolong-synth** at lengths beyond one window (512K–4M), plus 128K as the in-window control | Objective scoring, fixed data, pure wide aggregation, and the published result that agents did worse than reading. If a swarm cannot beat a single agent plus a map-reduce script here, the thesis has a problem; if it can, the result is clean | 50 questions at each of 3 lengths, 4 arms | Input-dominated: a full read of 1M tokens per question per arm. With a small model and caching, roughly [US$ redacted] (**UNVERIFIED**; depends on price and on whether arms share cached shards) |
| 3 | **Home-grown planted-needle and census benchmark on the library** (design C with a B slice) | The only option where breadth clearly exceeds the window, sources can be corrupted on purpose, and the corpus is unlikely to be memorised. Zero data cost | 40 aggregate questions over the full abstract set, 600-record adjudicated slice | Build about [US$ redacted] plus human audit; each study [US$ redacted] |
| 4 | **WideSearch English**, with a record-and-replay web cache | The reference wide benchmark, with published single vs multi numbers to replicate under matched tokens. Not reproducible unless every arm reads from the same cached search and fetch results | 30 English tasks with gold tables under 300 cells, 2 runs, item F1 as primary and success rate as secondary | [US$ redacted] per task per arm in tokens plus search API fees: [US$ redacted] for three arms |

Not shortlisted and why: DeepResearch Bench and DeepResearchGym's report set (judge noise larger than plausible effects); Mind2Web 2 (private test, live web); GAIA, FRAMES, LongBench v2, SummHay, Loong (fit one context or near saturation); MoNaCo (closed-book equals oracle); FutureSearch DRB (no public access); DeepWideSearch (harder WideSearch with the same live-web problem; use it after WideSearch, not before).

## 6. Arms and budget matching

Arms a fair study needs:

1. **Closed-book**: the model with no corpus or tools. Measures memorisation; subtract or report alongside.
2. **Single strong agent**: one loop, same tools, context compaction allowed, total budget B.
3. **Single agent, self-consistency**: k independent single-agent runs at B/k each, merged by majority vote or union. This is the baseline that most often erases multi-agent gains in the matched-compute literature (Wang et al. 2024; "Illusion of Multi-Agent Advantage"), and the cheapest to implement.
4. **Scripted map-reduce**: no agent autonomy; shard the corpus, apply one prompt per shard, merge with a fixed reducer. On wide tasks this is the conventional engineering answer and the real competitor.
5. **Conventional orchestrator–workers**: lead plans, spawns workers in parallel, synthesises (the Anthropic and WideSearch design), at B.
6. **Swarm**: the bio-inspired arm, at B.
7. **Oracle retrieval** (where gold documents exist): upper bound that separates retrieval failure from reading failure.

How others matched budgets, and the weakness of each:

| Study | Unit matched | Weakness |
|---|---|---|
| Tran and Kiela | Thinking tokens only, as a cap | Prompts, tool results and re-read context are free, which favours multi-agent arms that duplicate context; caps were often not reached |
| Google scaling study | Mean total reasoning tokens per trial (4,800) | Very small budget; tool-result tokens and coordination messages are accounted separately as "overhead" (58–515%), so the arms are not equal in total tokens |
| Anthropic | None; a hard cap per question (10M total tokens on BrowseComp, 3M on HLE) | A cap is not a match |
| WideSearch, DeepWideSearch | None; DeepWideSearch reports cost for some systems | Gains cannot be attributed |
| Budget-aware evaluations of reasoning (Wang et al.) | Total tokens or number of calls | The closest to what we need, but on reasoning tasks |

Recommended accounting for our runs: fix **total billed tokens** per task (input + output + thinking, with cached input counted at its billed weight and also reported raw), fix the model and the tool set across arms, log wall-clock with a stated concurrency limit, and report two views: equal total tokens, and equal wall-clock with tokens free. Enforce the budget in the harness (stop the arm at B) and report how much each arm actually used. Report accuracy as a function of budget at three or more points, since a single budget can favour either side.

## 7. Pitfalls

1. **Tokens masquerading as architecture.** The default explanation for any multi-agent gain is spend. Anthropic's own analysis says so.
2. **Live web.** Search ranking, page content and anti-bot behaviour change between arms run minutes apart. Without a shared cache, arm differences below about 5 points are not interpretable.
3. **Contamination.** BrowseComp answers, WideSearch gold tables and GAIA validation answers are public. Anthropic applies a domain blocklist and a cheating-detection pipeline and still revised scores twice. Always run closed-book.
4. **Judge noise.** RACE-style report judges agree with humans about 70% pairwise. Prefer short answers, sets and tables scored by rules. Where a judge is unavoidable, use a judge from a different model family than the arms and re-validate on 50 items by hand.
5. **Judge substitution.** BrowseComp-Plus numbers with a Claude judge are not comparable to published numbers with gpt-4.1 or Qwen3-32B. State the judge and re-score a sample both ways.
6. **Retriever as hidden variable.** On BrowseComp-Plus the retriever moves accuracy by 15–20 points and tuning BM25 alone by 18%. Fix the retriever, its parameters and the result truncation for all arms.
7. **Strict success is uninformative at our scale.** WideSearch success is 0–7%; on 30 tasks that is zero to two tasks. Use item F1 as primary and pre-register it.
8. **Uneven task size.** A few tables with thousands of cells dominate a micro-average. Report macro and micro.
9. **Too few items and seeds.** Run-to-run variance for agents is large (WideSearch reports four runs for that reason). Use paired comparisons on the same items, at least three seeds, and bootstrap intervals; state the minimum detectable effect before running.
10. **Subset selection after the fact.** Choose subsets by a seeded rule before any run and record the list by hash.
11. **Capability threshold.** Google's fit puts the point where coordination stops paying at about 45% single-agent accuracy. Choosing a strong model on an easy subset guarantees a null result; choosing a weak model on a hard subset inflates multi-agent gains. Report results for two model tiers.
12. **Parallelism cap.** API rate limits make the wall-clock advantage of a swarm depend on the account's concurrency. Report the limit used.
13. **Aggregation is the bottleneck, not reading.** Oolong (gold labels barely help) and WideSearch (item F1 rises with compute, table success does not) both show errors concentrating in the merge. A swarm design that only adds readers will not move the outcome that matters.
14. **Home-grown circularity.** See section 4.2; the benchmark is only as good as the human audit behind its labels.

## 8. Claims not verified at the source

- BrowseComp human solve rate and aggregation-strategy gains (OpenAI page returned 403).
- Opus 4.6 single-agent BrowseComp figure and the multi-agent DeepSearchQA figures (system-card PDF too large to open; values come from a search summary of its changelog).
- All 2026 leaderboard positions for BrowseComp, GAIA, HLE, LongBench v2 and WideSearch (aggregator sites; several list model names that conflict across sources).
- Current BrowseComp-Plus leaderboard top (page did not render); the 83.1% figure is from the Pi-Serini paper.
- GAIA levels, scoring rule and split sizes; HLE question count (not re-read in this pass).
- Licences of Oolong, Loong, LitSearch, DeepWideSearch data, Mind2Web 2 data, ScholarQABench, FRAMES.
- Open Deep Research token and cost figures on DeepResearch Bench (scraped table with misaligned columns).
- AVeriTeC 2025 results and time limit (from search summaries of participant papers).
- A-MapReduce, "Illusion of Multi-Agent Advantage", DR³-Eval and DRBench details beyond their abstracts.
- Oolong-synth cost estimate in the shortlist (no published cost).
- Whether FutureSearch's tasks and RetroSearch can be obtained.

## 9. Sources

- BrowseComp: https://arxiv.org/abs/2504.12516
- BrowseComp-Plus: https://arxiv.org/html/2508.06600v1 · https://github.com/texttron/BrowseComp-Plus · https://huggingface.co/datasets/Tevatron/browsecomp-plus · https://aclanthology.org/2026.acl-long.1023/
- Pi-Serini on BrowseComp-Plus: https://arxiv.org/html/2605.10848
- WideSearch: https://arxiv.org/html/2508.07999v2 · https://github.com/ByteDance-Seed/WideSearch · https://widesearch-seed.github.io/ · vendor explainer https://parallel.ai/articles/widesearch-benchmark.md
- DeepWideSearch: https://arxiv.org/html/2510.20168v1 · A-MapReduce: https://arxiv.org/abs/2602.01331
- DeepResearch Bench: https://arxiv.org/html/2506.11763v1 · Open Deep Research: https://github.com/langchain-ai/open_deep_research
- DeepResearchGym: https://arxiv.org/html/2505.19253v3
- FutureSearch Deep Research Bench: https://arxiv.org/abs/2506.06287 · https://drb.futuresearch.ai/
- Mind2Web 2: https://arxiv.org/html/2506.21506v2 · https://osu-nlp-group.github.io/Mind2Web-2/
- GAIA: https://arxiv.org/abs/2311.12983
- xbench-DeepSearch: https://huggingface.co/datasets/xbench/DeepSearch-2510
- DeepSearchQA: https://arxiv.org/abs/2601.20975
- LitSearch: https://aclanthology.org/2024.emnlp-main.840/ · ScholarQABench/OpenScholar: https://arxiv.org/abs/2411.14199v1 · ALCE: https://arxiv.org/abs/2305.14627 · CiteEval: https://arxiv.org/abs/2506.01829 · SummHay: https://arxiv.org/abs/2407.01370
- Loong: https://arxiv.org/html/2406.17419v2 · LongBench v2: https://longbench2.github.io · NovelQA: https://novelqa.github.io · FRAMES: https://arxiv.org/abs/2409.12941 · MoNaCo: https://arxiv.org/html/2508.11133v2 · Oolong: https://arxiv.org/html/2511.02817v2
- Ev2R / AVeriTeC: https://arxiv.org/abs/2411.05375
- DR³-Eval: https://arxiv.org/abs/2604.14683 · DRBench: https://arxiv.org/abs/2510.00172
- Anthropic multi-agent research system: https://www.anthropic.com/engineering/multi-agent-research-system · Opus 4.6: https://www.anthropic.com/news/claude-opus-4-6
- Scaling agent systems: https://arxiv.org/html/2512.08296v2 · Tran and Kiela: https://arxiv.org/html/2604.02460v1 · Illusion of Multi-Agent Advantage: https://arxiv.org/abs/2606.13003 · WebThinker: https://arxiv.org/abs/2504.21776
- Internal: `library/README.md`, `library/enrichment/AUDIT.md`, `library/evidence/README.md`
