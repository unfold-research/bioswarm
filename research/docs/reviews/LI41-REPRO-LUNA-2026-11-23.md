# LI41 reproduction check

## Command and registered verdict comparison

Ran exactly `node undefined` from this directory. Captured output with:

```sh
node undefined >/tmp/li41.stdout 2>/tmp/li41.stderr; rc=$?
printf 'node undefined exit=%s\nstdout bytes=%s\n' "$rc" "$(wc -c </tmp/li41.stdout)"
grep 'Cannot find module' /tmp/li41.stderr
```

Observed `exit=1`, `stdout bytes=0`, and `Error: Cannot find module '/srv/bench/rt-2/work/bench/LI41-report/undefined'` (Node.js v24.22.2). I compared the captured stdout directly with `results/li41/verdicts.json` using `cmp -s`; it returned 1 (not identical). The stdout SHA-256 was `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty file); verdict JSON SHA-256 was `08ae0178ea32bab87d46d6d74e851dd11808241f6b9c77f7e1b48f150bc0c245`. Thus the expected output match does not occur: the supplied command is not an analysis invocation and emits no result. `results/li41/verdicts.json` primary H-LI123 says metric `wavesToSolve`, stigwait better 12, manager better 0, p `0.00048828125`, verdict `supported`.

## Stored per-seed wave data: independent cross-check

The available `results/li41-k160/state.json` stores `history` indexed by wave for each arm/seed, not the described poll-level `timeline` with millisecond `t`. I extracted the first history entry with `counts.total === 0`. First-all-pass waves are:

| Seed | stigwait wave | manager wave |
|---|---:|---:|
| 41400 | 3 | 8 |
| 41401 | 3 | 10 |
| 41402 | 4 | 10 |
| 41403 | 4 | 16 |
| 41404 | 3 | 12 |
| 41405 | 4 | 10 |
| 41406 | 3 | 12 |
| 41407 | 4 | 10 |
| 41408 | 3 | 10 |
| 41409 | 3 | 10 |
| 41410 | 3 | 16 |
| 41411 | 4 | 14 |

Each of the 12 paired cases favors stigwait on wave count; losses = 0, ties = 0. Two-sided exact sign-test p = `2 / 2^12 = 0.00048828125`. This exactly matches H-LI123 in `verdicts.json` (`aBetter=12`, `bBetter=0`, same p and supported verdict). This is an independent check of the wave metric only.

## Requested minute re-derivation and concrete input search

The expected records are missing. I directly checked the first three preregistered seeds for each arm; the shell reported every exact input missing:

| Arm | Seed 41400 | Seed 41401 | Seed 41402 |
|---|---|---|---|
| stigwait | `stigwait-s41400.json`: MISSING | `stigwait-s41401.json`: MISSING | `stigwait-s41402.json`: MISSING |
| manager | `manager-s41400.json`: MISSING | `manager-s41401.json`: MISSING | `manager-s41402.json`: MISSING |

The command tested `test -f results/li41-k160/<arm>-s<seed>.json` for each of these six paths. `find results/li41-k160 -maxdepth 1 -type f \( -name 'stigwait-s*.json' -o -name 'manager-s*.json' \) -print` returns no output; `find . -type f \( -name 'stigwait-s*.json' -o -name 'manager-s*.json' \) -print` and `find .. -type f \( -name 'stigwait-s*.json' -o -name 'manager-s*.json' \) -print` also return no output. `find . -type f \( -name 'sweep.mjs' -o -name 'verdict.mjs' \) -print` returns no output. `grep -RIl 'timeline' results/li41-k160 --include='*.json' --include='*.jsonl'` returns zero files; the project-wide search `grep -RIl 'timeline' . --exclude=REVIEW.md` likewise returned no output. The directory instead has aggregate/state JSON, wave request/result JSONL, status files and logs. The existing JSONL batch records are API calls/results, not per-run poll timeline records; state histories have wave numbers without poll timestamps. Thus there are no raw poll `t` values or `fails` arrays to use, and I cannot honestly report minute values for even one run, compare them with timeline-derived values, or compute the time metric's sign test. No minute-level matches or mismatches can be concluded from the available files.

## Concerns and limits

The instruction's advertised minute metric is distinct from the registered primary metric (`wavesToSolve`) in the supplied verdict. The literal command is not a runnable analysis entry point. The cap-plus-one handling, timestamp parsing, ties, and timestamp non-determinism cannot be checked without the absent per-run timelines. The wave metric shows no ties in the available records; this says nothing about possible ties in elapsed minutes.
