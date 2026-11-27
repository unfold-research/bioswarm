// I6, review family, Claude Haiku 5.5. Thin wrapper over ../i6-advice/protocol.mjs.
import * as base from '../i6-advice/protocol.mjs';
export const ID = 'i6-advice-review';
export const TITLE = base.TITLE + ' — review family';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => base.wave('review');
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
