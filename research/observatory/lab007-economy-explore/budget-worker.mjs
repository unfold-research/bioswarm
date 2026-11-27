import { reserveBatch } from './budget.mjs';
const [file, name, hash, amount] = process.argv.slice(2);
try {
  await reserveBatch({ file, name, manifestHash: hash, reserveUsd: Number(amount), requestCount: 1 });
  process.stdout.write('reserved');
} catch (e) {
  process.stderr.write(String(e.message || e));
  process.exitCode = 1;
}
