---
id: "H-LI17"
title: "On code, one side acting resolves symmetric edges"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-support"
registered: "supported"
tags: ["coordination","field","conversation","llm-swarm","code"]
sources: ["Unfold research (2026-11-17), LI studies."]
related: []
updated: "2026-11-17"
summary: "When an encoder and a decoder owned by different members must agree on a free format, letting one side act resolves more failing edges than letting both act."
---

# On code, one side acting resolves symmetric edges

**Status: preliminary support.** Registered in `tasks/LI7-REAL-CODE-PREREG.md`.

## Result
LI7 (Sonnet 5.5): inhibit resolved 43 symmetric edges that sync left failing, sync 1 that inhibit left (p < 0.0001). Under sync both sides changed in the same round 219 times and the edge stayed failing all 219 times.

## Statement
When an encoder and a decoder owned by different members must agree on a free format, letting one side act resolves more failing edges than letting both act.
