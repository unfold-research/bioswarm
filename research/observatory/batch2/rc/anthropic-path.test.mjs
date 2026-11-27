// LI41's Anthropic path is unchanged by the openai-litellm adapter (LI42): run-rc3.mjs, driven by LI41's spec (fake
// Message Batches through a module hook, no network), sends the same requests byte for byte as the pre-adapter runner
// (origin/main at 938ff5e): the sha256 of every wave's requests.jsonl (custom_id + params, exactly the createBatch input)
// must equal li41-golden.json, written by the pre-adapter runner with this same harness.
//   ci    LI41's spec (arms, base, rounds cut to 2) on k = 16 (32 directed, 8 symmetric, 16 tests), seeds 41400-41402: fast
//   full  LI41's own size (k = 160, 320 directed, 80 symmetric, 16 tests), seeds 41400-41401, rounds cut to 2; about 15
//         minutes, so it runs only with RC_GOLDEN_FULL=1 (it was run on benchhost for the adapter PR)
// Run: node --test observatory/batch2/rc/anthropic-path.test.mjs
// Regenerate (only from a pre-adapter runner): RC_GOLDEN_RUNNER=<runner.mjs> RC_GOLDEN_WRITE=1 [RC_GOLDEN_FULL=1] node --test ...
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const GOLDEN = path.join(HERE, 'li41-golden.json');
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'sweeps/LI41.json'), 'utf8')), z = spec.sizes[0];
const CASES = {
  ci: { k: 16, cases: 3, shape: { local: 2, directed: 32, symmetric: 8, tests: z.tests, shown: 3 } },
  full: { k: z.k, cases: 2, shape: { local: 2, directed: z.directed, symmetric: z.symmetric, tests: z.tests, shown: 3 } },
};

function run(name) {
  const c = CASES[name], out = `zz-li41-golden-${name}-${process.pid}`, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'li41-golden-')), cfgFile = path.join(tmp, 'cfg.json'), ledger = path.join(tmp, 'ledger.json');
  // the config sweep.mjs writes for LI41 (same arms, base, seeds from 41400, cap), with the size above and two rounds
  const cfg = { out, k: c.k, cases: c.cases, seed0: z.seed0, shape: c.shape, studyCapUsd: z.cap, arms: spec.arms, ...spec.base, rounds: 2 };
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 1) + '\n');
  fs.writeFileSync(ledger, JSON.stringify({ schema: 'test', capUsd: 300, perBatchCapUsd: 5, commitments: {}, history: [] }));
  const runner = process.env.RC_GOLDEN_RUNNER || path.join(HERE, 'run-rc3.mjs'), dir = path.join(ROOT, 'results', out);
  try {
    const r = spawnSync(process.execPath, ['--import', path.join(HERE, 'anthropic-fake-hooks.mjs'), runner, cfgFile], { cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, RC_COUNT_STUB: 'YES', UNFOLD_LEDGER: ledger, ANTHROPIC_API_KEY_FILE: path.join(tmp, 'no-key') }, maxBuffer: 64 << 20 });
    assert.equal(r.status, 0, r.stderr.slice(-2000));
    const files = fs.readdirSync(dir).filter((f) => /^wave-\d+-p\d+\.requests\.jsonl$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
    const got = Object.fromEntries(files.map((f) => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex')]));
    const requests = files.reduce((n, f) => n + fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).length, 0);
    return { got, requests, cfg };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(tmp, { recursive: true, force: true }); }
}

for (const name of Object.keys(CASES)) {
  test(`LI41 (Anthropic, ${name}) requests are byte-identical to the pre-adapter runner`, { skip: name === 'full' && !process.env.RC_GOLDEN_FULL && 'set RC_GOLDEN_FULL=1 (about 15 minutes)' }, () => {
    const { got, requests, cfg } = run(name);
    if (process.env.RC_GOLDEN_WRITE) {
      const g = fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) : {};
      g[name] = { spec: 'sweeps/LI41.json', k: cfg.k, cases: cfg.cases, seeds: Array.from({ length: cfg.cases }, (_, i) => cfg.seed0 + i), rounds: cfg.rounds, runner: path.basename(process.env.RC_GOLDEN_RUNNER || 'run-rc3.mjs'), requests, files: got };
      fs.writeFileSync(GOLDEN, JSON.stringify(g, null, 1) + '\n'); return;
    }
    const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'))[name];
    assert.ok(Object.keys(got).length >= 4, 'several waves ran'); assert.equal(requests, golden.requests);
    assert.deepEqual(got, golden.files);
  });
}
