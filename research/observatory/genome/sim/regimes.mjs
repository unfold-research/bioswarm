// G2 regimes: the archetypes are compiled from the G1 matrix (a trait enters when at least half the systems of the cluster
// have it present by consensus), restricted to the traits the simulator implements. Baselines are engineering controls.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib.mjs';
import { FLAGS } from './engine.mjs';

const G1 = path.join(ROOT, 'results/genome-g1');
export const ANCHORS = { colony: 'apis-mellifera', flock: 'sturnus-vulgaris', school: 'clupea-harengus', team: 'papio-anubis', chemical: 'vibrio-fischeri' };
export const MIN_SHARE = 0.5;

export function archetypes() {
  const m = JSON.parse(fs.readFileSync(path.join(G1, 'matrix.json'), 'utf8'));
  const a = JSON.parse(fs.readFileSync(path.join(G1, 'analysis.json'), 'utf8'));
  const sp = Object.fromEntries(m.species.map((s) => [s.id, s]));
  const members = (g) => Object.entries(a.speciesGroups).filter(([, v]) => v === g).map(([k]) => k);
  return Object.fromEntries(Object.entries(ANCHORS).map(([name, anchor]) => {
    const ids = members(a.speciesGroups[anchor]);
    const traits = m.traits.traits.map((t) => [t.id, ids.filter((i) => sp[i].cells[t.id].c === 'P').length / ids.length])
      .filter(([, x]) => x >= MIN_SHARE).sort((x, y) => y[1] - x[1]);
    return [name, { members: ids, traits: traits.map(([id, share]) => ({ id, share: +share.toFixed(2) })),
      flags: traits.map(([id]) => id).filter((id) => FLAGS.includes(id)), notCompiled: traits.map(([id]) => id).filter((id) => !FLAGS.includes(id)) }];
  }));
}

export const BASELINES = {
  independent: { flags: [] },
  schedule: { flags: [], sched: true },
  orchestrator: { flags: ['DOL-04'] },
  board: { flags: ['FLD-01', 'FLD-02'] },
};

export const DEFENCE = ['DEF-01', 'DEF-04'];
