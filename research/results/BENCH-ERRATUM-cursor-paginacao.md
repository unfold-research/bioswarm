# Benchmark erratum: one hidden assertion in `cursor-paginacao` is outside the specification (2026-11-13)

**Where:** OpenBot-Bench tasks cx02 and cx07 (`internal/openbot-case/bench/tasks/`), file `final/cursor-paginacao__paginacao.test.mjs`, test "cursor: tokens dourados e validação", line 33:

```js
assert.throws(() => decodeCursor(encodeCursor({ id: '', score: 1 })), SyntaxError);
```

**The problem.** The statement specifies the token format, golden examples and that `decodeCursor` throws `SyntaxError` on an invalid token. It does not say that `encodeCursor` must accept an item with an empty id. An implementation that validates in `encodeCursor` and throws `TypeError` meets the statement but fails this assertion.

**How it was found.** Study 4 (`results/harness-study-4-2026-11/REPORT.md`). It is the only failing hidden assertion behind every false success in the Harness studies 2, 3 and 4.

**What is done about it.**
- The task files are left unchanged, so that past studies stay reproducible.
- Reports keep their preregistered outcome and add a sensitivity analysis that counts a run as accepted when this assertion is its only failure.
- A future study that uses these tasks must either drop the assertion or add one sentence to the statement ("`encodeCursor` does not validate; validation happens in `decodeCursor`"), and say which it did in its preregistration.
