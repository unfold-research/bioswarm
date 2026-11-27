// R2, regime "sweep". One submission per regime; the cross-regime, preregistered analysis is ../r2-regimes/analyze.mjs.
import * as base from '../r2-regimes/protocol.mjs';
export const ID = 'r2-sweep';
export const TITLE = base.TITLE + ' — sweep';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['sweep'];
export const wave = (k, outputs) => base.waveOf('sweep', k, outputs);
export const ceiling = (k) => base.ceilingOf('sweep', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('sweep', scoredByWave);
