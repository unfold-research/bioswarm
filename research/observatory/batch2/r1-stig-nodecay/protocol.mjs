// R1, regime "stig-nodecay". One submission per regime; the cross-regime, preregistered analysis is ../r1-regimes/analyze.mjs.
import * as base from '../r1-regimes/protocol.mjs';
export const ID = 'r1-stig-nodecay';
export const TITLE = base.TITLE + ' — stig-nodecay';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => base.scheduledRows('stig-nodecay');
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => base.summarizeScheduled('stig-nodecay', scored);
