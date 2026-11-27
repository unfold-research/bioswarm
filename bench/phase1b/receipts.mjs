// Numbered, immutable receipts: every live gate run keeps its own file (0001.json, 0002.json, ...), created with
// O_EXCL and then made read-only, so a later run can never overwrite an earlier one, failed runs included.
import { chmodSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function writeReceipt(dir, data) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (;;) {
    const n = readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).length + 1;
    const file = join(dir, String(n).padStart(4, '0') + '.json');
    try {
      writeFileSync(file, JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 });
    } catch (err) {
      if (err.code === 'EEXIST') continue;
      throw err;
    }
    chmodSync(file, 0o400);
    return file;
  }
}
