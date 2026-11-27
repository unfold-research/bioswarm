// D6, scenario "local". See ../d6-deep/protocol.mjs; cross-study analysis in ../d6-deep/analyze.mjs.
import * as base from '../d6-deep/protocol.mjs';
export const ID = 'd6-deep-local';
export const TITLE = base.TITLE + ' — local';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.waveOf('local', k, outputs);
export const ceiling = (k) => base.ceilingOf('local', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeScenario('local', scoredByWave);
