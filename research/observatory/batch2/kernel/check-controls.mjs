// Control-arm check, to run before freezing a study that compares a collective with something.
// A study module declares its controls:
//   export const CONTROLS = { deep: '<study>', schedule: '<study>' }   studies that give one agent the whole budget and
//                                                                       a fixed schedule the same budget
//   export const CONTROLS = { exempt: '<reason>' }                      for studies of a single agent's behaviour
// The check fails if CONTROLS is missing, if a named study does not exist, or if its expected reserve is not within a
// factor of two of this study's. It does not write the control arms; the designer does.
// Usage: node observatory/batch2/kernel/check-controls.mjs <study>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
export async function checkControls(name) {
  const study = await import(`../${name}/protocol.mjs`), c = study.CONTROLS;
  if (!c) return { ok: false, reason: 'no CONTROLS export' };
  if (typeof c.exempt === 'string' && c.exempt.length > 20) return { ok: true, exempt: c.exempt };
  const plan = (s) => { const f = path.join(ROOT, `results/batch2-${s}/plan.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; }, mine = plan(study.ID), out = {};
  for (const kind of ['deep', 'schedule']) { if (!c[kind]) return { ok: false, reason: `no ${kind} control named` }; if (!fs.existsSync(path.join(HERE, '..', c[kind], 'protocol.mjs'))) return { ok: false, reason: `${kind} control ${c[kind]} does not exist` };
    const p = plan(c[kind]); if (mine && p) { const ratio = p.expectedReserveUsd / mine.expectedReserveUsd; if (ratio < 0.5 || ratio > 2) return { ok: false, reason: `${kind} control reserve differs by a factor of ${ratio.toFixed(2)}` }; out[kind] = { study: c[kind], reserveRatio: ratio }; } else out[kind] = { study: c[kind], reserveRatio: null }; }
  return { ok: true, controls: out };
}
if (import.meta.url === `file://${process.argv[1]}`) { const r = await checkControls(process.argv[2]); console.log(JSON.stringify(r)); if (!r.ok) process.exitCode = 1; }
