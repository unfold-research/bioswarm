# BSH2 · Recife distribution under a capacity shock

One synthetic case in Brazilian Portuguese, eight whole orders, three depots, identical model and data across arms. The changed prices distinguish this case from the worked example; its geography, volumes and shock are shared. The R2 protocol reached main at 8d6deac before new calls. Hermes ran with OpenAI gpt-6-luna via the internal gateway on benchhost. Commercial, warehouse and transport roles were common; manager added an explicit coordinating role, while stigwait routed records to transport. Tools were disabled. The arms ran sequentially, stigwait first.

| Arm | Phase | Proposals | Feasible freight (BRL) | Gap to optimum | Time (s) | Gateway spend (USD) |
|---|---|---:|---:|---:|---:|---:|
| stigwait | Initial | 2 | none | undefined | 85.484 to exhaustion | [redacted] |
| manager | Initial | 1 | 122 | 0 | 127.510 | [redacted] |
| stigwait | South capacity 10 → 8 | 1 | 129 | 0 | 96.125 | [redacted] |
| manager | South capacity 10 → 8 | 1 | 129 | 0 | 127.018 | [redacted] |

The exhaustive verifier found 56 feasible plans initially and 16 after the shock. A separate Python dynamic program confirmed both minima and independently checked all four submitted final maps. The initial stigwait repair returned an error object rather than eight assignments. This scores as a planning failure. Both arms then reached the post-event minimum on their first proposal. Their prior submissions differed: only manager had a feasible plan to revise. The post-event result therefore describes time from a common capacity change with each arm's own history. No fixed-arm-order, single-instance result separates protocol effects from variability in inference or retry latency.

## Transport and reconciliation

The original run stopped before a plan on two upstream HTTP 500s ([US$ redacted]). R1 used nonstreaming transport. Its first planner turn spent all 1536 completion tokens on reasoning and returned no content; the Hermes continuation path then aborted without scored output ([US$ redacted]). R2 restarted both arms with equal 8192-token limits and a terminal invalid-answer representation for truncation. No earlier answers were reused.

R2 completed 13 logical calls over 16 HTTP attempts. Wall time includes startup and retries. Six stigwait calls took 181.609 s and cost [US$ redacted] Seven manager calls took 254.528 s and cost [US$ redacted] The proxy receipt on the tenth delivered turn, in the manager arm reported 1090 cache-write tokens. The adapter's preliminary estimate omitted the write premium; the table uses the independently repriced gateway receipts. The successful comparison cost [US$ redacted] All three reservations closed at a combined [US$ redacted] against [US$ redacted] authorized. The private R2 manifests cover each transport run.
