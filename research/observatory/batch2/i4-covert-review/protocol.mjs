// I4, review family. Thin wrapper over ../i4-covert/protocol.mjs so that each family is one submission under the study cap.
// Combined, preregistered analysis: node observatory/batch2/i4-covert/analyze.mjs
import * as base from '../i4-covert/protocol.mjs';
export const ID = 'i4-covert-review';
export const TITLE = base.TITLE + ' — review family';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => base.wave('review');
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => ({ family: 'review', arms: base.familySummary(scored) });
