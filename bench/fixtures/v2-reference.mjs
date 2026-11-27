import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cases } from '../phase1b/cases.mjs';
import { memoFigures } from '../phase1b/v2/verify.mjs';

const v2 = cases.v2;
const solutionDir = join(import.meta.dirname, '..', 'phase1b', 'v2', 'fixtures', 'solution');
export const solution = (seed, place) => readFileSync(join(solutionDir, place), 'utf8').replace('__DESIGN__', JSON.stringify(v2.design(seed)));
export const memo = (o) => `Totais: ${Object.values(memoFigures(o)).join(' ')}.\n`;
export const install = (dir, seed, o) => {
  for (const f of readdirSync(solutionDir)) writeFileSync(join(dir, f), solution(seed, f));
  writeFileSync(join(dir, 'close.md'), memo(o));
};

