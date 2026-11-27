// R2, regime "random". One submission per regime; the cross-regime, preregistered analysis is ../r2-regimes/analyze.mjs.
import * as base from '../r2-regimes/protocol.mjs';
export const ID = 'r2-random';
export const TITLE = base.TITLE + ' — random';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['random'];
export const wave = (k, outputs) => base.waveOf('random', k, outputs);
export const ceiling = (k) => base.ceilingOf('random', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('random', scoredByWave);
