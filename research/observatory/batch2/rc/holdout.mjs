// LI7 hold-out check (added after the run, not registered): re-run every check of each arm's final code on 40 fresh random
// inputs per check (new seed), to catch code fitted to the examples shown in failure messages.
// Usage: node observatory/batch2/rc/holdout.mjs results/<out> <config.json> [--strict]  (--strict: LI12 on, the live strict check)
import fs from 'node:fs';
import path from 'node:path';
import * as C from './code.mjs';
import { rng } from '../ne/tasks.mjs';
if (!process.argv[3]) console.error('warning: no config given, using the default instance shape (right only for LI7 and LI8; pass the config for LI9 on)');
const dir = process.argv[2], shape = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")).shape : undefined, st = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const word = (r, lo, hi) => Array.from({ length: int(r, lo, hi) }, () => String.fromCharCode(97 + int(r, 0, 25))).join('');
const out = {};
for (const arm of Object.keys(st.arms)) { out[arm] = { solvedInRun: 0, passHoldout: 0, failing: [], perCase: {} };
  for (const [key, s] of Object.entries(st.arms[arm])) { const seed = Number(key.split('s')[1]), inst = C.makeInstance(Number(key.match(/^k(\d+)/)[1]), seed, shape), r = rng(`holdout:${key}`);
    for (const c of inst.checks) c.inputs = c.kind === 'symmetric' ? Array.from({ length: 40 }, () => Object.fromEntries(Object.entries(c.inputs[0]).map(([n, v]) => [n, typeof v === 'number' ? int(r, 0, 999) : typeof v === 'boolean' ? r() < 0.5 : Array.isArray(v) ? Array.from({ length: int(r, 0, 3) }, () => word(r, 2, 6)) : word(r, 3, 8)]))) : Array.from({ length: 40 }, () => { const w = word(r, 4, 9); return r() < 0.5 ? w : w.replace(/(.)(.)/, (_, a) => a + a); });
    const vs = C.check(inst, s.code, { strict: process.argv.includes('--strict') }); out[arm].perCase[key] = vs.length; if (s.solved) { out[arm].solvedInRun++; if (!vs.length) out[arm].passHoldout++; else out[arm].failing.push(...vs.map((v) => `${key} ${v.id}`)); } } }
console.log(JSON.stringify(out, null, 2));
