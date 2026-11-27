// REP1, task family "count". See ../rep1/protocol.mjs.
import * as base from '../rep1/protocol.mjs';
export const ID = 'rep1-count';
export const TITLE = base.TITLE + ' — count';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('count', k, outputs);
export const ceiling = (k) => base.ceilingOf('count', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeFamily('count', scoredByWave);
