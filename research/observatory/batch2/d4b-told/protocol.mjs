// D4b, variant "told". The cross-study, preregistered analysis is ../d4b-choice/analyze.mjs.
import * as base from '../d4b-choice/protocol.mjs';
export const ID = 'd4b-told';
export const TITLE = base.TITLE + ' — marks';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('told', k, outputs);
export const ceiling = (k) => base.ceilingOf('told', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeVariant('told', scoredByWave);
