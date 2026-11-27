// T1, central trigger decided by Claude Sonnet 5.5. See ../t1-trigger/protocol.mjs; analysis in ../t1-trigger/analyze.mjs.
import * as base from '../t1-trigger/protocol.mjs';
export const ID = 't1-central-sonnet';
export const TITLE = base.TITLE + ' — central trigger, sonnet';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = (k, outputs) => base.decideRows('sonnet', k, outputs);
export const ceiling = (k) => base.ceilingRows('sonnet', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeCentral(scoredByWave);
