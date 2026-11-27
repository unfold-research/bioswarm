// D4, variant "blind". The cross-study, preregistered analysis is ../d4-choice/analyze.mjs.
import * as base from '../d4-choice/protocol.mjs';
export const ID = 'd4-blind';
export const TITLE = base.TITLE + ' — blind';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('blind', k, outputs);
export const ceiling = (k) => base.ceilingOf('blind', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeVariant('blind', scoredByWave);
