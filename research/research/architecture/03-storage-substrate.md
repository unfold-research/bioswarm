# 03 — The storage substrate under a swarm

Design study, 2026-11-11. Question: what must a store provide so that many cooperating LLM agents can coordinate through it, and which existing systems provide it?

How to read this document. Three kinds of statement are kept apart:

- **Reported**: what a primary source says. Each has a link in *Sources*, with a note on what was actually read on 2026-11-11.
- **Inferred**: my reading of what follows from the sources or from our own harness.
- **Proposed**: design choices for the lab.

A capability I could not confirm in the docs in this pass is marked `?` (unverified). Nothing here was run; no model was called.

Vocabulary follows `papers/P1-bio-inspired-agentic-swarms/VOCABULARY.md`: the **field** is the shared state, a **trace** is a write with author, time and weight, a **regime** is a parameter vector plus a rule.

## 0. What our own runs constrain

Single runs on synthetic tasks (`results/batch2-r1-regimes`, `results/batch2-r2-regimes`); they are constraints to design for, not established facts.

| Constraint | Consequence for the store |
|---|---|
| Coverage and freshness decided the outcome; the answer is "latest count of each part, summed" | The store must hold *current estimate per part* and *when it was last read* as first-class state, not something each agent rebuilds |
| The alarm (new reading differs from the previous by 3 or more) was computed by code and was enough to direct attention | Change detection belongs in the substrate |
| Decay made no measurable difference in one small run | Decay must be a parameter that can be set to "off", and cheap to vary |
| Context tokens are scarce | Reads return aggregates and neighbourhoods, with a known token cost |
| The orchestrator found the edit from a regularity in the first counts (R2, "The flaw") | What the model is shown is an experimental variable; the store must record it exactly |
| Reserve before spending, never retry an uncertain write, reconcile afterwards (`global-budget.mjs`) | Budget accounts and idempotent writes are store primitives |

Inferred: the harness is already a small log-plus-fold store. In `r2-regimes/protocol.mjs`, `outputs` (a map keyed by `custom_id`) is the append-only log, and `replay()` folds it into the board `{ first, later }`, the alarms and the next picks. The weight `SEEN = 0.05` on parts already re-read is a soft claim. The design question is which parts of that fold become store features.

## 1. The primitives, one by one

**1. Append-only trace log with author, time, weight.** Needed because every other item is derived from it and because experiments must be replayed. Two times are required: a logical time (round or sequence number, which the rules use) and wall time (for audit only). Proposed: rules never read wall time.

**2. Derived views maintained by the store.** Current estimate, staleness, disagreement and coverage per part. Argument: R1 and R2 were decided by exactly these quantities, and an agent that derives them from the log pays tokens for arithmetic that code does exactly. The view must be updated in the same transaction as the write, or a reader can see a new trace with an old estimate.

**3. TTL and decay as a store feature.** Two different things. TTL removes a row at a deadline; decay lowers a weight continuously. Evidence here for decay is one null result (R1 P1: −0.03, interval −0.27 to 0.17) in a field that changed once. Proposed: decay is computed at read time from `weight`, `round` and `half_life`; nothing is deleted, so the log stays replayable and decay stays a free parameter.

**4. Claims and leases on work.** Without a coordinator, two agents that read the same alarm go to the same part. A claim says "someone is on this, until round r". It must expire by itself, because an agent that fails does not release. Two semantics are worth separating: a *hard lease* excludes others; a *soft claim* is a repellent mark that lowers the chance others pick the place. R2's `SEEN` weight is the soft kind.

**5. Optimistic concurrency and visible conflicts.** For state transitions (taking a claim, editing the artefact) a write should carry the version it was based on and fail visibly if the version moved. For observations (readings) the opposite holds: both readings are kept, and their disagreement is a derived quantity. Last-write-wins that discards the loser hides exactly the signal R2 used.

**6. Change feeds by place or topic.** An agent or the harness subscribes to "alarms in my neighbourhood" instead of polling the board. In a batch instrument the feed is consumed by the harness between waves, so durability and resume position matter more than latency.

**7. Provenance and trust on every row.** Author, role, what the row was derived from, and a trust level. Reason from our runs: Abracadabra found that one unverified record forces abstention, and Murmur found that a verifier which reads sources catches planted errors while one that reads only the report does not (`STATE.md`). Both need the store to say where a row came from. A derived row (an alarm) must name the rows it was computed from.

**8. Budget and reservation accounts.** `global-budget.mjs` already implements the right state machine in a JSON file under a lock: `intent → submitted → complete | needs-reconcile | released`, identity checks on re-reservation, cap checked at reserve and at reconcile. It is a ledger with idempotent reservation; it belongs beside the traces so that spend and work share one clock.

**9. Versioning of the artefact.** A reading is a reading *of a version*. R1 and R2 edited the collection in silence; a store that versions the artefact can say "this estimate describes version 1, the part is now at version 2", which is staleness without any re-read. Whether to reveal that to agents is a regime choice (it removes the detection problem).

**10. Deterministic replay.** Given the log and the seeds, the board, alarms and picks must be reproducible bit for bit. This requires a total order on writes, logical time in rules, seeded randomness, and a record of every view that was rendered to a model.

## 2. What existing systems give

`Y` documented; `P` partial or must be assembled; `N` absent in what I read; `?` not verified in this pass. Letters in brackets point to *Sources*.

| Primitive | PostgreSQL | Redis | NATS JetStream | Kafka | etcd / Consul | FoundationDB | CRDT stores | KurrentDB (event store) | XTDB / Datomic | Materialize / RisingWave / Flink | Agent-memory products |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Append-only log | P: a table; append-only is by grants, not by default (inferred) | Y streams [R1] | Y [N1] | Y [K1] | P: revisions until compaction [E1] | P: build it; versionstamps `?` | P: change history `?` | Y [EV1] | Y: immutable, history kept [X1][D1] | N: views over sources | P: Mem0 "ADD-only; memories accumulate" [M1] |
| 2 Derived views kept by the store | P: triggers; materialised views need `REFRESH` [P5] | N | P: KV = last value per key [N2] | P: compaction keeps last value per key [K1] | N | N | N | `?` projections | N | Y [MZ1][RW1] | P: Zep builds entity and community graphs with an LLM [Z1] |
| 3 TTL / decay | N | P: key TTL; no per-entry TTL seen for streams [R1][R2] | P: `MaxAge`, per-message `Nats-TTL` since 2.11 [N3][N4] | P: retention by time or size on segments; no per-record TTL [K1] | P: lease TTL deletes attached keys [E1] | N [F1] | N | P: `$maxAge` [EV1] | `?` | P: temporal filters retract rows at a deadline [MZ2][RW1]; Flink state TTL, processing time only [FL1] | P: Mem0 `expiration_date` [M1] |
| 4 Claims / leases | P: `SKIP LOCKED` for queues [P2]; a lease table is hand-built | P: `XAUTOCLAIM` after `min-idle-time` [R3] | P: KV create plus per-key TTL [N2] | P: one consumer per partition per group [K1] | Y: leases [E1]; sessions with lock-delay, advisory [C1] | N: build it | N | `?` | N | N | N |
| 5 Optimistic concurrency, conflict shown | P: version column or serialisable isolation (inferred) | `?` | Y: expected-last-subject-sequence [N4] | N | Y: compare-then transactions [E1] | Y: conflict fails at commit, client retries [F1] | Automerge Y: losers kept, `getConflicts` [A1]; Yjs N: merged silently [Y1]; Riak P: fixed rules [RK1] | Y: expected revision [EV1] | `?` | N | Letta P: `memory_replace` fails if text changed, `memory_rethink` is last-writer-wins [L1]; Mem0 N |
| 6 Change feed by place / topic | P: `NOTIFY` (payload under 8000 bytes, at commit) [P1]; logical decoding (durable, duplicates after crash, one receiver per slot) [P3] | P: `XREAD BLOCK` [R1]; keyspace events are fire-and-forget [R2] | Y: subjects with wildcards [N1] | Y: topics [K1] | Y: watch from a past revision [E1] | P: watch says only "changed" [F1] | P: Electric shapes, read path, single table [EL1] | `?` subscriptions | `?` | Y: `SUBSCRIBE` with timestamps and diffs [MZ3] | N |
| 7 Provenance / trust per row | P: columns; row security can bind author to role [P4] | N: by convention | N: by convention | N: by convention | N | N | P: Automerge op ids carry an actor [A1] | `?` metadata | Datomic Y: transactions are entities, docs show a `source/confidence` filter [D1] | N | P: Zep keeps episodes and validity intervals [Z1]; Mem0 metadata is for filtering [M1] |
| 8 Budget / reservation accounts | P: transactions | `?` | P: compare-and-set on KV [N2] | N | P: transactions | P: transactions | N | P | P | N | N |
| 9 Artefact versioning | N: build it | N | P: KV history [N2] | N | P: until compaction [E1] | N | `?` | P: stream revisions | Y: as-of queries [X1][D1] | N | N; Dolt offers branch and merge of tables [DO1] |
| 10 Deterministic replay | P: needs a serialised sequence (see 4A) | P: `XRANGE` [R1] | Y: read back by sequence [N1] | Y: per partition [K1] | P: until compaction | P | P | Y | Y | P: `AS OF` within retained history [MZ3] | N (inferred: an LLM sits in the write path of Mem0 and Zep [M1][Z1]) |

Points the table compresses:

- **PostgreSQL.** Reported: `NOTIFY` delivers at commit, folds identical payloads within one transaction, and orders across transactions by commit [P1]; the page I read does not say that a session not listening at the time misses the event, so treat `NOTIFY` as a wake-up, not a log. `SKIP LOCKED` is documented as giving "an inconsistent view" that suits "a queue-like table" [P2]; the lock lasts for the transaction, so it is a claim for milliseconds, not a lease across a model call (inferred). Row security is default-deny and bypassed by the table owner unless forced [P4].
- **Redis.** Keyspace `expired` events fire when the key is deleted, not when the TTL reaches zero, "with no guarantees" on timing [R2]. Expiry is therefore not a clock one can build rules on.
- **etcd and Consul** have the best-documented lease semantics. Consul states that its locks are advisory and adds a lock-delay (default 15 s) after invalidation [C1].
- **FoundationDB** documents the uncertain-write case directly: `commit_unknown_result`, and the advice to make transactions idempotent by generating ids before the retry loop [F1]. This is our budget rule stated by a database. Transactions are limited to five seconds [F1].
- **CRDTs.** Automerge is the only system read here that keeps the losing values of a conflict as data an application can query [A1]. Riak fixes the winner by rule (add wins, enable wins, most recent timestamp wins) [RK1].
- **Stream processors.** Materialize and RisingWave are the only systems read here where "a view that changes as time passes" is a documented operator [MZ2][RW1]. It is a cut-off, not a weight.
- **Tuple spaces.** JavaSpaces has `write`, `read`, `take`, `notify`; every `write` returns a lease and "when the lease expires, the entry is removed" [JS1]. Structurally this is the nearest ancestor of a field: associative reads, expiry on every entry, no addressing between agents. It has no aggregates, no weights and no provenance. TOTA (tuples that propagate with maintenance rules such as evaporation) is the closest prior design to a stigmergic store; I saw it only through search summaries, so its details are `?` [T1].
- **Vector databases.** Reported for pgvector: an approximate index trades recall for speed, and filters apply after the index scan, so a condition matching 10% of rows returns about 4 rows with default settings unless iterative scans (0.8.0) are on [V1]. Inferred: similarity retrieval answers "what resembles this text"; none of the quantities that decided R1 and R2 (latest, stale, changed, covered) is a similarity, and an approximate miss is silent. A vector index is an optional secondary index on trace payloads, not the substrate.
- **Products marketed for agents.** Mem0 extracts memories with an LLM and exposes scoping ids and an expiration date; its docs page says nothing on concurrent writers, versions or provenance [M1]. Letta lets agents share a block and documents which edit tools are safe under concurrency; one is last-writer-wins [L1]. Zep/Graphiti keeps four timestamps per fact and invalidates rather than deletes, with an LLM judging contradictions [Z1]; the paper does not address concurrent writers. LangGraph's persistence page describes thread checkpoints and a key-value store, nothing on conflicts or feeds [LG1]. Vendor claims found by search (CockroachDB, SurrealDB, Yugabyte, Turso) were not checked against docs and are not used.

## 3. Where existing stores fall short, and what a swarm store would do differently

Inferred from section 2:

1. **Time is wall-clock and removal is binary.** Every TTL read here deletes at a deadline, on the server's clock, sometimes late [R2][FL1]. A swarm needs graded weights on a logical clock, with the raw row kept.
2. **Aggregation is either absent or generic.** The stores with leases have no views; the stores with views have no leases. The views a field needs are few and fixed (latest, staleness, disagreement, coverage, mark density), and they must be transactional with the write.
3. **Reads are priced in rows or bytes, never in tokens.** No system read here can answer "give me the neighbourhood of part 7 in at most 300 tokens".
4. **Conflict handling is for convergence, not for attention.** CRDTs and last-write-wins aim to make the conflict disappear. For a swarm a disagreement is a stimulus (primitive *threshold* in the vocabulary).
5. **Leases assume a client that keeps a connection alive.** An agent is a sequence of model calls with no heartbeat; "liveness" is "has not exceeded its round".
6. **No store records what a reader was shown.** Databases log writes. The R2 flaw was a property of a read.
7. **Agent-memory products put a model in the write path**, which makes the store non-deterministic and spends tokens on storage.

Proposed, for a store designed for swarms:

- **Decay and aggregation as operators**: `sense(place, radius, now)` returns per-place aggregates with weights already decayed by the half-life in force.
- **Neighbourhood reads priced in tokens**: every read takes a token ceiling and returns the cost it charged; the store degrades by widening aggregation, never by truncating silently.
- **Alarms as derived rows**: an alarm is a trace with author `store`, trust "code", and `based_on` pointing at the two readings. It can be subscribed to, decayed and audited like any trace.
- **Leases with stigmergic semantics**: a claim is a negative-valued mark with a half-life in rounds. A regime chooses hard (exclusive until expiry) or soft (repellent in proportion to its remaining weight). Expiry needs no release and no coordinator.
- **Views as experimental variables**: the store renders what a model sees through a named projection (fields included, order, labelling), logs a hash of each rendering, and can permute or coarsen it. A leak check runs a code policy on the projection before any paid run.
- **One clock for work and money**: reservations and settlements are traces in the same log.

## 4. Candidate designs

### 4A. Thin schema over PostgreSQL (about a week)

```sql
create table place (field_id text, place int, neighbours int[] not null, primary key (field_id, place));

create table trace (                         -- append-only: revoke update, delete
  field_id text, seq bigint,                 -- seq: per-field logical clock
  place int not null,
  kind text not null check (kind in ('reading','mark','claim','alarm','edit','reserve','settle')),
  author text not null, trust smallint not null,   -- 0 code, 1 verified, 2 unverified, 3 external
  round int not null, wall timestamptz not null default now(),
  weight real not null default 1, half_life int,   -- in rounds; null = no decay
  based_on bigint[] not null default '{}',         -- provenance: seqs this row derives from
  artefact_v int, payload jsonb not null,
  idem_key text not null unique,
  primary key (field_id, seq));

create table place_state (                   -- derived, written only by deposit()
  field_id text, place int, version int not null default 0,
  latest_seq bigint, latest jsonb, prev jsonb, last_round int,
  reads int not null default 0, disagreement real not null default 0,
  alarm_seq bigint, artefact_v int, primary key (field_id, place));

create table lease (field_id text, place int, holder text, token bigint, expires_round int,
  primary key (field_id, place));

create table account (id text primary key, cap_usd numeric not null);
create table reservation (id text primary key, account text references account, idem_key text unique,
  reserve_usd numeric, committed_usd numeric, actual_usd numeric,
  status text check (status in ('intent','submitted','complete','needs-reconcile','released')));
```

Key operations:

```sql
-- deposit(): one transaction per write
select pg_advisory_xact_lock(hashtext($field));      -- one writer per field, so seq order = commit order
insert into trace (...) values (...) on conflict (idem_key) do nothing;   -- a repeat is a no-op
update place_state set version = version + 1, prev = latest, latest = $payload, latest_seq = $seq,
       last_round = $round, reads = reads + 1, disagreement = l1($payload, latest)
 where field_id = $field and place = $place;
-- if l1(prev, latest) >= threshold: insert a trace of kind 'alarm', author 'store', trust 0,
-- based_on = {previous seq, this seq}; set alarm_seq; pg_notify('field:' || $field, $place::text)

-- claim: no row returned means the place is held
insert into lease values ($field, $place, $agent, 1, $now + $ttl)
on conflict (field_id, place) do update
   set holder = excluded.holder, token = lease.token + 1, expires_round = excluded.expires_round
 where lease.expires_round <= $now
returning token;                                     -- token fences late writes from an expired holder

-- sense: what an agent sees (aggregates of a neighbourhood, decay applied at read time)
select s.place, s.latest, $now - s.last_round as staleness, s.reads, s.disagreement,
       s.alarm_seq is not null as changed,
       exists (select 1 from lease l where l.field_id = s.field_id and l.place = s.place and l.expires_round > $now) as claimed,
       (select coalesce(sum(t.weight * coalesce(power(0.5, ($now - t.round)::real / t.half_life), 1)), 0)
          from trace t where t.field_id = s.field_id and t.place = s.place and t.kind = 'mark') as mark
  from place_state s
 where s.field_id = $field
   and s.place = any (select unnest(neighbours || place) from place where field_id = $field and place = $place);

-- reserve: cap checked under a row lock; idempotent
select cap_usd from account where id = $acct for update;
insert into reservation (id, account, idem_key, reserve_usd, committed_usd, status)
select $id, $acct, $key, $usd, $usd, 'intent'
 where (select coalesce(sum(committed_usd), 0) from reservation where account = $acct) + $usd <= $cap
on conflict (idem_key) do nothing returning id;

-- replay: select * from trace where field_id = $field order by seq;
```

Optimistic concurrency applies to `edit` and `claim` (compare `place_state.version`, or the lease token); readings always append.

*Harness computes*: seq, views, alarms, decay, lease expiry, budget, the rendered projection. *Model sees*: the rows of `sense` rendered through a named projection, plus its own task. Never `trace`.

Failure modes. (a) Sequences are not transactional, so without the per-field lock a higher `seq` can commit first and replay order differs from commit order (inferred; `pg_advisory_xact_lock` is from memory, not re-read). The lock makes each field single-writer, which is fine at batch scale and a ceiling later. (b) `NOTIFY` is a wake-up only [P1]; consumers must read `trace` from their last `seq`. (c) Triggers hide logic; keep `deposit()` as one explicit function. (d) A crash between a provider call and the `settle` row leaves an `intent`: by design it stays reserved until reconciled.

### 4B. Log plus materialised views

The log is the only thing written; everything else is a fold.

- *Log*: NATS JetStream stream with subjects `field.<id>.<place>.<kind>`. `Nats-Msg-Id` gives idempotent append inside the duplicate window (default 2 minutes [N1]); `Nats-Expected-Last-Subject-Sequence` gives per-place optimistic concurrency [N4]; a KV bucket with per-key TTL holds leases [N2].
- *Views*, two options: (i) a deterministic reducer in Node, which is `replay()` generalised, snapshotting to SQLite; (ii) Materialize or RisingWave, where the views are SQL, a temporal filter gives a hard cut-off [MZ2][RW1] and `SUBSCRIBE` emits alarm rows as diffs [MZ3].

*Harness computes*: the reducer and the projection. *Model sees*: the same `sense` result as in 4A.

Failure modes. (a) The view lags the log; a reader can act on an old board. Mitigation: each view row carries the log sequence it reflects, and a write names the sequence it was based on. (b) Lease expiry in NATS KV and view expiry in a stream processor run on wall or processing time [FL1], which breaks replay; expiry must be recomputed from logical rounds in the reducer. (c) The dedup window is finite, so a late repeat can be stored twice; the reducer must also deduplicate on `idem_key`. (d) Option (ii) adds two services to operate for a lab that runs batches. Inferred: option (i) is the honest version of what the harness already does and costs days, not weeks.

### 4C. From scratch: a field store

A single process, single writer per field, embedded (a library over an append file, with SQLite for snapshots). No server until it is needed.

- *Data model*: fields, places with an explicit topology (ring, grid, graph), traces as in 4A.
- *Clock*: logical ticks only. Wall time is recorded, never read by a rule.
- *Operators*: `deposit`, `sense(place, radius, token_ceiling, projection)`, `claim(place, half_life, hard|soft)`, `reserve` / `settle`, `subscribe(place set, kinds)`, `as_of(seq)`.
- *Kernels as configuration*: decay (none, exponential, step), aggregation (latest, weighted mean, quorum of k independent authors), alarm rule (distance and threshold). A regime is a kernel configuration plus a choice rule, matching the vocabulary's "parameter vector plus the rule".
- *Read log*: every `sense` appends a row with reader, projection, token cost and content hash.
- *Testing*: deterministic simulation with injected faults (lost acknowledgement, duplicate delivery, late writer with an expired token).

*Harness computes*: everything above. *Model sees*: only projections.

Failure modes. (a) It is a database, and the lab would own durability, recovery and compaction; single-writer and append-only keep that small but not zero. (b) Risk of fitting the store to two synthetic tasks. (c) Token pricing depends on a tokenizer; counts should come from the provider's reported usage after the fact, with an estimate before.

**Recommendation (proposed).** Build 4B option (i) as a library whose interface is 4C's operators, and keep 4A as the persistence layer when runs must outlive a process or be shared. In practice: extract `replay()` and `global-budget.mjs` into one module with `deposit / sense / claim / reserve / settle`, add the read log, and run the hypotheses below before writing any server.

## 5. Hypotheses for the batch instrument

Each is a comparison at matched cost on the R2 ring unless stated. Numbering is local to this document.

- **S1 Soft claim against hard lease against none.** With concurrent workers per round and alarms, hard leases reduce duplicate reads of one part; soft claims do as well when the budget is half the field. Measure: duplicate reads, edited parts re-read, accuracy.
- **S2 Aggregates against raw log.** An orchestrator shown `sense` output is as accurate as one shown the full list of readings, at lower input tokens; the gap in tokens grows with rounds.
- **S3 Alarm by code against alarm by model.** A worker asked to compare two readings itself raises more false alarms, and costs more, than the store's rule. R2 had no false alarm in the stable condition with the code rule.
- **S4 Visible disagreement.** With noisy readers (R1's larger parts: 0.84 exact), showing per-part disagreement between independent readings directs re-reads to wrong counts better than latest-wins.
- **S5 Projection leak.** The orchestrator's advantage over the alarm rule in R2 falls towards zero when the projection hides or coarsens first counts. A code probe that predicts the edited block from the projection should score at chance before the paid run. This is R2b seen from the store.
- **S6 Decay when the field changes more than once.** With two edits in sequence at different blocks, alarms without decay keep recruiting to the first block; a half-life of about one round removes that. Predicts where the R1 null stops holding.
- **S7 Uncertain writes.** Inject "result unknown" on a share of deposits in the harness (free, no model). Retry without an idempotency key produces duplicate traces and wrong `reads`; with a key, none.
- **S8 Radius priced in tokens.** At equal input tokens, radius 1 beats both radius 0 and the whole board when edits are local, and loses when edits are scattered.
- **S9 Revealed artefact version.** If the store reveals that a part's version moved, every regime reaches the coverage ceiling. Marks the boundary between a detection task and a scheduling task.

S7 and the probe in S5 cost nothing and can run first.

## 6. What is unknown

- Whether any of this matters beyond counting on a ring. Every constraint in section 0 comes from one task family and one small model.
- Whether real swarms contend enough for leases to matter. In batch waves, contention is created by the harness; with live concurrent agents it is real and unmeasured here.
- Whether hard cut-offs are sufficient, so that graded decay never needs to exist. One null result does not decide it.
- How to price a read in tokens before making it, across providers.
- Scale: a per-field single writer is assumed. The OpenBot case and LAB-001…006 (saturation near N≈300) suggest fields stay small, but that is not shown.
- Trust levels: what the scale should be and who assigns it. The store can carry a level; it cannot decide it.
- Capabilities marked `?` in the table: FoundationDB versionstamps, KurrentDB projections and subscriptions, Redis `WATCH` and `SET NX PX`, XTDB conflict and feed behaviour, Automerge history, PostgreSQL advisory locks and whether `NOTIFY` reaches late listeners. Also unread: Linda's original paper, TOTA and SwarmLinda primary texts, Kafka Streams, Consul watches, and any incremental-view extension for PostgreSQL.
- Whether an agent-memory product has since added multi-writer semantics; only the pages listed were read.

## Sources

All accessed 2026-11-11 through a fetch tool that returns a model-made summary with quotations; I read those summaries, not the full pages, except where the page came back verbatim (Redis R2, R3).

- [P1] PostgreSQL, NOTIFY: https://www.postgresql.org/docs/current/sql-notify.html — payload limit, delivery at commit, folding, ordering, 8 GB queue.
- [P2] PostgreSQL, SELECT, locking clause: https://www.postgresql.org/docs/current/sql-select.html — `SKIP LOCKED` paragraph.
- [P3] PostgreSQL, logical decoding concepts: https://www.postgresql.org/docs/current/logicaldecoding-explanation.html — slots, repeats after a crash, one receiver per slot, WAL retention.
- [P4] PostgreSQL, row security policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html — default deny, `USING` / `WITH CHECK`, bypass rules.
- [P5] PostgreSQL, materialized views: https://www.postgresql.org/docs/current/rules-materializedviews.html — refresh is explicit.
- [R1] Redis streams: https://redis.io/docs/latest/develop/data-types/streams/ — first 100,000 characters only: ids, ranges, `XREAD`, trimming.
- [R2] Redis keyspace notifications: https://redis.io/docs/latest/develop/pubsub/keyspace-notifications/ — full page.
- [R3] Redis XAUTOCLAIM: https://redis.io/docs/latest/commands/xautoclaim/ — full page.
- [N1] NATS JetStream streams: https://docs.nats.io/nats-concepts/jetstream/streams — limits, duplicate window, subjects, discard.
- [N2] NATS key-value store: https://docs.nats.io/nats-concepts/jetstream/key-value-store — put, get, watch, create, update, compare-and-swap, per-key TTL.
- [N3] NATS 2.11 release notes and per-message TTL: https://docs.nats.io/release-notes/whats_new/whats_new_211 and https://docs.nats.io/learn/jetstream/message-ttl — seen through search results only.
- [N4] NATS JetStream headers: https://docs.nats.io/reference/jetstream/api/headers.md — `Nats-Msg-Id`, expected-sequence headers, `Nats-TTL`.
- [K1] Apache Kafka design: https://kafka.apache.org/41/design/design/ — compaction, consumer groups, ordering, idempotent producer, transactions.
- [E1] etcd API: https://etcd.io/docs/v3.5/learning/api/ — revisions, transactions, watch, leases.
- [C1] Consul sessions: https://developer.hashicorp.com/consul/docs/dynamic-app-config/sessions — TTL, lock-delay, advisory locks.
- [F1] FoundationDB developer guide: https://apple.github.io/foundationdb/developer-guide.html — conflicts, watches, five-second limit, `commit_unknown_result`.
- [A1] Automerge, conflicts: https://automerge.org/docs/reference/documents/conflicts/
- [Y1] Yjs docs, front page: https://docs.yjs.dev/
- [EL1] Electric, shapes: https://electric.ax/docs/guides/shapes (redirected from electric-sql.com).
- [RK1] Riak KV data types: https://docs.riak.com/riak/kv/latest/learn/concepts/crdts/index.html — convergence rules.
- [EV1] KurrentDB: https://docs.kurrent.io/server/v25.0/features/streams and client "appending events" pages — seen through search results only; the page I tried to fetch returned 404.
- [X1] XTDB, what is XTDB: https://docs.xtdb.com/intro/what-is-xtdb.html
- [D1] Datomic, filters: https://docs.datomic.com/reference/filters.html — `as-of`, `since`, `history`, the confidence example.
- [MZ1][MZ2] Materialize, temporal filters: https://materialize.com/docs/transform-data/patterns/temporal-filters/
- [MZ3] Materialize, SUBSCRIBE: https://materialize.com/docs/sql/subscribe/
- [RW1] RisingWave, temporal filters: https://docs.risingwave.com/processing/sql/temporal-filters
- [FL1] Apache Flink, working with state (State TTL): https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/
- [JS1] JavaSpaces service specification (Apache River): https://river.apache.org/release-doc/current/specs/html/js-spec.html
- [T1] TOTA middleware: https://sourceforge.net/projects/tota/ — search summary only.
- [V1] pgvector README: https://github.com/pgvector/pgvector
- [M1] Mem0, add memory: https://docs.mem0.ai/core-concepts/memory-operations/add
- [L1] Letta, shared memory between agents: https://docs.letta.com/guides/agents/multi-agent-shared-memory
- [Z1] Rasmussen et al., "Zep: A Temporal Knowledge Graph Architecture for Agent Memory", arXiv 2501.13956: https://arxiv.org/html/2501.13956
- [LG1] LangGraph persistence: https://docs.langchain.com/oss/python/langgraph/persistence
- [DO1] Dolt, what is Dolt: https://www.dolthub.com/docs/introduction/what-is-dolt — conflict handling not described on that page.

Internal: `papers/P1-bio-inspired-agentic-swarms/VOCABULARY.md`, `STATE.md`, `results/batch2-r1-regimes/REPORT.md`, `results/batch2-r2-regimes/REPORT.md`, `observatory/batch2/r2-regimes/protocol.mjs`, `observatory/lab007-instrument-audit/global-budget.mjs`.
