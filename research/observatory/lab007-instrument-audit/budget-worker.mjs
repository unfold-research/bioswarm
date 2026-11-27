import { reserveWaves } from './global-budget.mjs';
const [file, name, hash, amount] = process.argv.slice(2);
try {
  await reserveWaves({ file, studyHash: `study-${hash}`, waves: [{ name, manifestHash: hash, reserveUsd: Number(amount), requestCount: 1 }] });
  process.stdout.write('reserved');
} catch (e) { process.stderr.write(String(e.message || e)); process.exitCode = 1; }
