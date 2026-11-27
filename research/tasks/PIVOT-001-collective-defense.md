# PIVOT-001 — Re-scope Norevia to collective defense (social immunity) · 2026-11-09
Requested by the user: rewrite the LP, projects, references, filters and searches for defense systems. Step back and review all material: do not discard, **categorise** what stays useful, what needs adapting, and what must come in.

## Working thesis (draft, lead owns it)
**Norevia — Social Immunity for Agentic Systems** (working title; final name decided with the user).
How do collectives detect threats, mobilise defence, stop the spread of damage and keep working — and which of these mechanisms make swarms of AI agents more efficient at **cyber defence** and at **protecting their own integrity**?
- Primary objective: agent swarms that defend infrastructure (detection, triage, investigation, authorised response, recovery verification).
- Operating condition: the swarm preserves its own integrity — a local failure (poisoned evidence, prompt injection, compromised component, unverified memory) must not become collective compromise. Isolation is enforced by external technical controls, not by the compromised agent's cooperation.
- New variable: **defensive plasticity** — reorganising who interacts with whom, who receives which information, and who stops acting, in response to threat evidence (not only how many agents and how much effort).
- Biological sources: social immunity in insect colonies (primary), collective defence against intruders (alarm, recruitment, inhibitory signals, risk-adjusted recognition), individual immunity as a complementary source (danger theory, clonal expansion, resolution).
- Scope: defensive and authorised testing only (detection, triage, incident response, vulnerability discovery in owned or isolated environments, CTF-style labs). No offensive tooling against third-party targets.
- Evidence discipline unchanged: phenomenon / author-reported / observed implementation / hypothesis / local validation / gap. Baselines must include well-implemented conventional security engineering (zero trust, provenance tracking, quarantine, rate limits), not naive "share everything" systems.

## Categories (use these exact labels everywhere)
- `keep` — directly useful to the defence thesis as is.
- `adapt` — useful after reframing (new hypothesis, new metric or new task family).
- `foundation` — general method/evidence that still underpins the work (evidence discipline, verifier dominance, correlated errors, split-by-size, Allocator) but is not defence-specific.
- `archive` — not useful for the pivot; kept, no longer shown prominently.
- `gap` — missing material that must come in.

## Owners and deliverables
| Part | Owner | Deliverable |
|---|---|---|
| Thesis, hypotheses (H-01…H-27), nature cards (56), flags (FLAGS.md), theory model | Norevia (lead) | `PIVOT-AUDIT-research.md` with a category per item + new defence hypotheses + new nature cards to write |
| Literature catalogue, evidence cards, OSS cards, new searches and filters, source verification of the user's social-immunity text | Norevia Library | LIB-003 (see its brief) |
| Experiments LAB-001…006, Observatory, Allocator, sims, OpenBot case study, defence benchmarks survey, LAB-007 design | Norevia Lab | LAB-007-PLAN (see its brief) |
| LP rewrite (all pages, navigation, filters, Journal framing) | Norevia (lead), after the three audits | site rebuild, reviewed before publishing |

Shared output: each owner appends its table to `/data/OpenBot/Shared/Norevia/PIVOT-AUDIT.md` (sections per owner). Pointer messages only.
