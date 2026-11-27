// I4, research family. Thin wrapper over ../i4-covert/protocol.mjs so that each family is one submission under the study cap.
// Combined, preregistered analysis: node observatory/batch2/i4-covert/analyze.mjs
import * as base from '../i4-covert/protocol.mjs';
export const ID = 'i4-covert-research';
export const TITLE = base.TITLE + ' — research family';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => base.wave('research');
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => ({ family: 'research', arms: base.familySummary(scored) });
