import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initialize, reserveBatch, readBudget, MAX_BATCH_USD } from './budget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lab007-global-budget-'));
const child = (args) => new Promise((resolve) => {
  const p = spawn(process.execPath, [path.join(HERE, 'budget-worker.mjs'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = ''; p.stdout.on('data', (x) => out += x); p.stderr.on('data', (x) => err += x);
  p.on('close', (code) => resolve({ code, out, err }));
});

test('each batch has a hard $5 reservation ceiling', async () => {
  const dir = tmpdir(), file = path.join(dir, 'global.json');
  try {
    await initialize(file);
    await assert.rejects(() => reserveBatch({ file, name: 'too-large', manifestHash: 'x', reserveUsd: MAX_BATCH_USD + 0.01, requestCount: 1 }), /per-batch/);
    assert.equal((await readBudget(file)).committedUsd, 5);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('concurrent reservations serialize; excess waves cannot cross the $50 ceiling', async () => {
  const dir = tmpdir(), file = path.join(dir, 'global.json');
  try {
    await initialize(file);
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => child([file, `batch-${i}`, `hash-${i}`, '4.6'])));
    assert.equal(results.filter((x) => x.code === 0).length, 9);
    assert.equal(results.filter((x) => x.code === 1).length, 1);
    const state = await readBudget(file);
    assert.ok(state.committedUsd <= 50);
    assert.equal(Object.values(state.commitments).filter((x) => x.status === 'intent').length, 9);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('same reservation can resume, changed manifest cannot replace an intent', async () => {
  const dir = tmpdir(), file = path.join(dir, 'global.json');
  try {
    await initialize(file);
    const args = { file, name: 'wave-a', manifestHash: 'hash-a', reserveUsd: 1.25, requestCount: 40 };
    assert.equal((await reserveBatch(args)).entry.status, 'intent');
    assert.equal((await reserveBatch(args)).entry.manifestHash, 'hash-a');
    await assert.rejects(() => reserveBatch({ ...args, manifestHash: 'hash-b' }), /identity mismatch/);
    assert.ok((await readBudget(file)).committedUsd <= 50);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
