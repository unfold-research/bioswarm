// R2b, regime "alarm". One submission per regime; the cross-regime, preregistered analysis is ../r2b-regimes/analyze.mjs.
import * as base from '../r2b-regimes/protocol.mjs';
export const ID = 'r2b-alarm';
export const TITLE = base.TITLE + ' — alarm';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['alarm'];
export const wave = (k, outputs) => base.waveOf('alarm', k, outputs);
export const ceiling = (k) => base.ceilingOf('alarm', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('alarm', scoredByWave);
