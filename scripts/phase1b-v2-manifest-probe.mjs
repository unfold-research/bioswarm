// Emit the previously validated isolation probe for use on stdin in the frozen BenchHost checkout.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const original = readFileSync(new URL('../bench/phase1b/manifest-access.mjs', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(original).digest('hex'), 'f759f2ee5eb39f66ad0dd7e0775e5a1e20c3737422921ba5c4851de2ae5a0b5f');
const target = "'bench/phase1b/manifest.json'";
assert.equal(original.split(target).length, 2);
process.stdout.write(original.replace(target, "'bench/phase1b/v2/manifest.json'"));
