// R2, regime "router". One submission per regime; the cross-regime, preregistered analysis is ../r2-regimes/analyze.mjs.
import * as base from '../r2-regimes/protocol.mjs';
export const ID = 'r2-router';
export const TITLE = base.TITLE + ' — router';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['router'];
export const wave = (k, outputs) => base.waveOf('router', k, outputs);
export const ceiling = (k) => base.ceilingOf('router', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('router', scoredByWave);
