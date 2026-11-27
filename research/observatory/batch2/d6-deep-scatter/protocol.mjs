// D6, scenario "scatter". See ../d6-deep/protocol.mjs; cross-study analysis in ../d6-deep/analyze.mjs.
import * as base from '../d6-deep/protocol.mjs';
export const ID = 'd6-deep-scatter';
export const TITLE = base.TITLE + ' — scatter';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('scatter', k, outputs);
export const ceiling = (k) => base.ceilingOf('scatter', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeScenario('scatter', scoredByWave);
