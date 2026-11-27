// Strict re-check (deviation after the independent review, docs/reviews/LI7-REVIEW-2026-11-17.md): the registered directed
// check passes a caller that is right with the reference helper and changes when the helper is perturbed, so a caller can
// special-case the real helper's wrong output and hide it. Here a directed edge passes only if, in addition, the helper itself
// returns the required value on the test inputs. Rewrites every wave's failing set and counts from the stored code and writes
// <dir>/strict/state.json, which analyze-rc.mjs reads unchanged.
// Usage: node observatory/batch2/rc/recheck-strict.mjs results/<out> [config.json]
import fs from 'node:fs';
import path from 'node:path';
import * as C from './code.mjs';
if (!process.argv[3]) console.error('warning: no config given, using the default instance shape (right only for LI7 and LI8; pass the config for LI9 on)');
const dir = process.argv[2], shape = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).shape : undefined;
const st = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
const strictCheck = (inst, code) => { const extra = inst.checks.filter((c) => c.kind === 'directed').map((c) => ({ id: c.id, kind: 'local', owner: c.impl, fn: c.helper, ref: c.hRef, inputs: c.inputs }));
  const vs = C.check({ ...inst, checks: inst.checks.concat(extra) }, code), seen = new Map(); for (const v of vs) if (!seen.has(v.id)) seen.set(v.id, v); return [...seen.values()]; };
const kind = (id) => (id.startsWith('S:') ? 'symmetric' : id.startsWith('D:') ? 'directed' : 'local');
let changed = 0;
for (const arm of Object.keys(st.arms)) for (const [key, s] of Object.entries(st.arms[arm])) { const inst = C.makeInstance(Number(key.match(/^k(\d+)/)[1]), Number(key.split('s')[1]), shape); let code = null;
  for (const h of s.history) { if (h.code) code = h.code; if (!code) continue; const vs = strictCheck(inst, code), ids = vs.map((v) => v.id);
    if (ids.length !== h.failing.length) changed++; h.failing = ids; h.counts = { local: ids.filter((i) => kind(i) === 'local').length, directed: ids.filter((i) => kind(i) === 'directed').length, symmetric: ids.filter((i) => kind(i) === 'symmetric').length, total: ids.length }; }
  s.solved = s.history.at(-1).failing.length === 0; }
fs.mkdirSync(path.join(dir, 'strict'), { recursive: true }); fs.writeFileSync(path.join(dir, 'strict', 'state.json'), JSON.stringify(st));
console.error(`rounds whose failing set changed: ${changed}`);
