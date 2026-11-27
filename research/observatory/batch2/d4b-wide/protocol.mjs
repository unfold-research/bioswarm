// D4b, variant "wide". The cross-study, preregistered analysis is ../d4b-choice/analyze.mjs.
import * as base from '../d4b-choice/protocol.mjs';
export const ID = 'd4b-wide';
export const TITLE = base.TITLE + ' — marks';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('wide', k, outputs);
export const ceiling = (k) => base.ceilingOf('wide', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeVariant('wide', scoredByWave);
