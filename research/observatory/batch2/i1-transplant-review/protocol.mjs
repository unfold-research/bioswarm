// I1, review family. Thin wrapper over ../i1-transplant/protocol.mjs so that each family is one submission under the study cap.
// Combined, preregistered analysis: node observatory/batch2/i1-transplant/analyze.mjs
import * as base from '../i1-transplant/protocol.mjs';
export const ID = 'i1-transplant-review';
export const TITLE = base.TITLE + ' — review family';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => base.wave('review');
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => ({ family: 'review', arms: base.familySummary(scored) });
