import assert from 'node:assert/strict';
import { linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { blindManifest } from './blind-manifest.mjs';

const id = '162856fe-6b85-4814-b9bf-e35caf91ba53';
const reference = { grossCents: 10, refundCents: 2, paidCents: 8, differenceCents: 0, exceptions: 1 };
function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'blind-transfer-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'blind');
  mkdirSync(dir);
  const ref = join(dir, id + '.json'), memo = join(dir, id + '.md');
  writeFileSync(ref, JSON.stringify(reference));
  writeFileSync(memo, 'Memorando mascarado.');
  return { root, dir, ref, memo };
}
test('both hosts hash exact file bytes and list only the paired UUID filenames', (t) => {
  const source = setup(t), destination = setup(t);
  const manifest = blindManifest(source.dir);
  assert.deepEqual(manifest.map((x) => x.name), [id + '.json', id + '.md']);
  assert.deepEqual(blindManifest(destination.dir), manifest);
  writeFileSync(destination.memo, 'Entrega alterada.');
  assert.notDeepEqual(blindManifest(destination.dir), manifest);
});
test('a mapping, additional reference field, or missing counterpart closes the batch', (t) => {
  for (const alter of [
    (p) => writeFileSync(join(p.dir, 'blind-key.jsonl'), 'private'),
    (p) => writeFileSync(p.ref, JSON.stringify({ ...reference, arm: 'C' })),
    (p) => rmSync(p.ref),
  ]) {
    const packet = setup(t);
    alter(packet);
    assert.throws(() => blindManifest(packet.dir));
  }
});
test('linked files are ineligible even with a valid UUID name', (t) => {
  for (const link of [symlinkSync, linkSync]) {
    const packet = setup(t);
    const privateFile = join(packet.root, 'private');
    writeFileSync(privateFile, 'private');
    rmSync(packet.memo);
    link(privateFile, packet.memo);
    assert.throws(() => blindManifest(packet.dir));
  }
});
