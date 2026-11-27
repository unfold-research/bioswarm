# Silo-Bench for T2

Instances of Silo-Bench (Zhang et al., arXiv 2603.01045; `jwyjohn/acl26-silo-bench`, The Unlicense) for the trigger study. Design: `tasks/T2-TRIGGER-DESIGN.md`.

| File | What it does |
|---|---|
| `export.py` | calls the unmodified generators at the pinned commit, reseeding per instance; runs the leak probe; writes one file per cell and the manifest |
| `manifest.json` | pinned commit, probe result, chosen tasks, SHA-256 of every instance file. Committed; the instances are not (11 MB) |
| `tasks.mjs` | loads a cell after checking it against the manifest; splits M shards over k agents; requests, grading, token ledger by run |
| `regimes.mjs` | the two fixed regimes for k above one: reduce then merge (level I), board in three rounds (level III) |

Rebuild the instances (no network, no model call):

```sh
git clone https://github.com/jwyjohn/acl26-silo-bench /tmp/silo && git -C /tmp/silo checkout e74127782ed1c42fff474249961f022c063d76f2
python3 -I observatory/batch2/silo/export.py /tmp/silo/benchmark_generator observatory/batch2/silo/instances
```

The export must reproduce `manifest.json` byte for byte; `tasks.mjs` refuses a file whose hash differs.

Found while writing the export:
- The benchmark has one instance per size, from one fixed seed. Twelve instances per cell need the reseeding done here.
- Global Max can be answered without reading: with enough numbers the maximum is 1000 (modal share 0.90 at 256 shards, 1.00 at 1,024). The leak probe drops it.
- I-08 Set Union Size (level I) and III-26 Global Distinct (level III) are the same computation on the same data; only the shuffle differs. The level names a suggested topology, not a property of the computation. In T2 the two levels differ by the regime given to the collective.
- The generator fixes the length of a shard (20 to 30 items). Input grows only through the number of shards.
