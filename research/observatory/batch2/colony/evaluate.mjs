// LI15 scoring of a team's final code: the strict check on the test inputs (what the agents' own runner showed) and on
// 40 fresh inputs per check (hold-out, never in the repository).
import * as W from '../rc/code.mjs';
import { rng } from '../ne/tasks.mjs';

export function score(inst, code, k, seed, shape) {
  const vs = W.check(inst, code, { strict: true });
  const hold = W.makeInstance(k, seed, shape), r = rng(`li15-holdout:${k}:${seed}`);
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), word = (lo, hi) => Array.from({ length: int(lo, hi) }, () => String.fromCharCode(97 + int(0, 25))).join('');
  for (const c of hold.checks) c.inputs = c.kind === 'symmetric'
    ? Array.from({ length: 40 }, () => Object.fromEntries(Object.entries(c.inputs[0]).map(([n, v]) => [n, typeof v === 'number' ? int(0, 999) : typeof v === 'boolean' ? r() < 0.5 : Array.isArray(v) ? Array.from({ length: int(0, 3) }, () => word(2, 6)) : word(3, 8)])))
    : Array.from({ length: 40 }, () => word(4, 9));
  const hv = W.check(hold, code, { strict: true });
  return { solved: vs.length === 0, failing: vs.length, failingByKind: W.counts(vs), holdout: vs.length === 0 && hv.length === 0, holdoutFailing: hv.length, of: inst.checks.length };
}
