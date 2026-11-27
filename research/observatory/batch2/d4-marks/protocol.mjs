// D4, variant "marks". The cross-study, preregistered analysis is ../d4-choice/analyze.mjs.
import * as base from '../d4-choice/protocol.mjs';
export const ID = 'd4-marks';
export const TITLE = base.TITLE + ' — marks';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('marks', k, outputs);
export const ceiling = (k) => base.ceilingOf('marks', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeVariant('marks', scoredByWave);
