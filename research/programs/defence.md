# Collective defence in AI swarms

> **Paused on 2026-11-17.** The active programme is [coordination](coordination.md) (mechanisms from nature against market coordination). This page, its threat model and its studies (D1 to D6) stay valid and can resume.

Research focus adopted by the owner on 2026-11-13. Unfold is the laboratory; Fold is the swarm harness. This replaces the Void / Murmur / Abracadabra division architecture.

## Question

Which collective defence mechanisms help agents detect compromised members or signals, contain harm and recover while preserving the legitimate task?

## Candidate mechanisms

Provenance and independent verification; local alarm signals; quarantine and selective isolation; admission rules; redundancy and repair. Inspiration from social immunity is a hypothesis source, not evidence of efficacy in AI.

## Before the next defence experiment

Write the threat model, authorised environment, attacker capabilities, protected assets, compromise budget, failure criteria and stopping rule. Compare with strong conventional controls and a single agent at matched cost. Measure task integrity, false alarms, detection, containment, recovery, cost and latency.

Defence of external systems by a swarm is now its own active programme, [cyber](cyber.md) (2026-11-20, TM-002); this page keeps defence of the swarm itself. Previous coding and harness studies keep their original scope and findings.

## Threat models and experiments

| Date | What | Evidence |
|---|---|---|
| 2026-11-15 | TM-001: one compromised member of a lead-and-two-workers team; defence of the swarm itself, taken as a reversible default | `docs/THREAT-MODEL-001.md` |
| 2026-11-15 | D2: a lead without the source returns the attacker's answer 6 of 6; a lead that can see the source, instructed to check or not, is right 6 of 6; one agent is right 6 of 6 at a quarter of the cost (H-D15 preliminary support) | `results/d2-insider-2026-11/REPORT.md` |

Next: D3, a task too large for the lead to redo, where a provenance check must be selective; then an adaptive attacker and two colluding members.
