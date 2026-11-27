import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reserveWaves } from './global-budget.mjs';
import { round0Rows, round1WorstCaseRows, validateRows, deterministicAudit } from './protocol.mjs';
import { reserveFor } from '../lab007-economy/batch.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lab007-instrument-audit-'));
function budgetFile(dir) {
  const file = path.join(dir, 'budget.json');
  fs.writeFileSync(file, JSON.stringify({ schema: 1, capUsd: 100, commitments: { base: { committedUsd: 5.04647645, status: 'complete' } }, history: [] }));
  return file;
}
const child = (args) => new Promise((resolve) => {
  const p = spawn(process.execPath, [path.join(HERE, 'budget-worker.mjs'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = ''; p.stdout.on('data', (x) => out += x); p.stderr.on('data', (x) => err += x);
  p.on('close', (code) => resolve({ code, out, err }));
});

test('exact synthetic instrument design and request manifests pass offline audit', () => {
  const audit = deterministicAudit(), r0 = round0Rows(), r1 = round1WorstCaseRows();
  assert.equal(audit.distinctTruthVectors, 8); assert.equal(audit.repeatsPerVector, 3);
  assert.deepEqual(validateRows(r0, 288), { count: 288, uniqueIds: 288, uniquePromptHashes: 288 });
  assert.deepEqual(validateRows(r1, 144), { count: 144, uniqueIds: 144, uniquePromptHashes: 144 });
  assert.ok(r0.reduce((s, q) => s + reserveFor(q.params).usd, 0) > 0);
  assert.ok(r1.reduce((s, q) => s + reserveFor(q.params).usd, 0) > 0);
});

test('total-only policy accepts a wave reserve above $5 under the shared $50 ceiling', async () => {
  const dir = temp(), file = budgetFile(dir);
  try {
    const r = await reserveWaves({ file, studyHash: 's1', waves: [{ name: 'large-wave', manifestHash: 'h1', reserveUsd: 8, requestCount: 2 }] });
    assert.equal(r.committedUsd, 13.04647645);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('concurrent reservations serialize against one cumulative cap', async () => {
  const dir = temp(), file = budgetFile(dir);
  try {
    const results = await Promise.all(Array.from({ length: 2 }, (_, i) => child([file, `wave-${i}`, `h-${i}`, '60'])));
    assert.equal(results.filter((x) => x.code === 0).length, 1);
    assert.equal(results.filter((x) => x.code === 1).length, 1);
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    const committed = Object.values(state.commitments).reduce((s, x) => s + x.committedUsd, 0);
    assert.ok(committed <= 100);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('whole study waves reserve atomically and changed frozen manifests are rejected', async () => {
  const dir = temp(), file = budgetFile(dir), waves = [
    { name: 'r0', manifestHash: 'r0-h', reserveUsd: 1, requestCount: 288 },
    { name: 'r1', manifestHash: 'r1-h', reserveUsd: 2, requestCount: 144 },
  ];
  try {
    const first = await reserveWaves({ file, studyHash: 'frozen', waves });
    assert.equal(first.addedUsd, 3); assert.equal(first.waves.length, 2);
    assert.equal((await reserveWaves({ file, studyHash: 'frozen', waves })).addedUsd, 0);
    await assert.rejects(() => reserveWaves({ file, studyHash: 'frozen', waves: [{ ...waves[0], manifestHash: 'changed' }, waves[1]] }), /identity mismatch/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
