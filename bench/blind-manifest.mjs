// Run on the trusted operator's closed blind directory, then on the judge's received directory.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const fileName = /^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.(md|json)$/;
const totals = ['differenceCents', 'exceptions', 'grossCents', 'paidCents', 'refundCents'];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function blindManifest(directory) {
  assert.ok(lstatSync(directory).isDirectory(), 'Expected a closed blind directory');
  const names = readdirSync(directory).sort();
  const listed = new Set(names);
  assert.ok(listed.size > 0, 'Empty blind directory');
  return names.map((name) => {
    const match = name.match(fileName);
    assert.ok(match, 'Unexpected file in blind directory');
    const [, id, extension] = match;
    assert.ok(listed.has(id + (extension === 'md' ? '.json' : '.md')), 'Incomplete packet');
    const fd = openSync(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = fstatSync(fd);
      assert.ok(stat.isFile() && stat.nlink === 1, 'Expected an independent regular file');
      const data = readFileSync(fd);
      if (extension === 'json') {
        const reference = JSON.parse(data);
        assert.deepEqual(Object.keys(reference).sort(), totals, 'Unexpected reference fields');
        assert.ok(totals.every((key) => Number.isSafeInteger(reference[key])), 'Invalid reference totals');
      }
      return { name, sha256: digest(data) };
    } finally {
      closeSync(fd);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dir, mode] = process.argv.slice(2);
  assert.ok(dir && (!mode || mode === '--files'), 'Supply the blind directory and optionally --files');
  const manifest = blindManifest(dir);
  console.log(mode ? manifest.map((file) => file.name).join('\n') : JSON.stringify(manifest));
}
