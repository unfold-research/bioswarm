// Unit tests of the icmpsock build plumbing (Cyber Research conditions, 2026-11-23; no Docker): node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureIcmpsock, icmpsockInfo } from './canary.mjs';

const SRC = new URL('./images/icmpsock.c', import.meta.url).pathname;
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-icmp-')); fs.copyFileSync(SRC, path.join(d, 'icmpsock.c')); return d; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

test('an existing binary is used as is: hash recorded, not rebuilt, nothing logged', () => {
  const d = tmp(); const file = path.join(d, 'icmpsock'), log = path.join(d, 'builds.jsonl');
  try {
    fs.writeFileSync(file, 'prebuilt');
    const i = ensureIcmpsock({ file, log, cc: 'false' });
    assert.equal(i.builtOnTheSpot, false); assert.equal(i.sha256, sha(file)); assert.ok(!fs.existsSync(log));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('(1) fail-closed: a missing binary that cannot be built throws a final error', () => {
  const d = tmp(); const file = path.join(d, 'icmpsock'), log = path.join(d, 'builds.jsonl');
  try {
    assert.throws(() => ensureIcmpsock({ file, log, cc: 'false' }), (e) => e.final === true && /could not be built/.test(e.message));
    assert.ok(!fs.existsSync(file)); assert.ok(!fs.existsSync(log));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('(2) a missing binary is built on the spot and logged with its sha256', { skip: !fs.existsSync('/usr/bin/gcc') && 'no gcc here' }, () => {
  const d = tmp(); const file = path.join(d, 'icmpsock'), log = path.join(d, 'builds.jsonl');
  try {
    const i = ensureIcmpsock({ file, log });
    assert.equal(i.builtOnTheSpot, true); assert.ok(i.builtAt); assert.equal(i.sha256, sha(file));
    const entries = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(entries.length, 1); assert.equal(entries[0].sha256, i.sha256); assert.equal(entries[0].sourceSha256, sha(path.join(d, 'icmpsock.c')));
    assert.deepEqual(icmpsockInfo(), i, 'the episode record reads the same info');
    const again = ensureIcmpsock({ file, log }); assert.equal(again.builtOnTheSpot, true, 'the record keeps saying it was built on the spot');
    assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 1, 'built once');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
