// REP1, task family "search". See ../rep1/protocol.mjs.
import * as base from '../rep1/protocol.mjs';
export const ID = 'rep1-search';
export const TITLE = base.TITLE + ' — search';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('search', k, outputs);
export const ceiling = (k) => base.ceilingOf('search', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeFamily('search', scoredByWave);
