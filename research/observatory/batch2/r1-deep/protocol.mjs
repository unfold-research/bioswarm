// R1, regime "deep". One submission per regime; the cross-regime, preregistered analysis is ../r1-regimes/analyze.mjs.
import * as base from '../r1-regimes/protocol.mjs';
export const ID = 'r1-deep';
export const TITLE = base.TITLE + ' — deep';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => base.scheduledRows('deep');
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => base.summarizeScheduled('deep', scored);
