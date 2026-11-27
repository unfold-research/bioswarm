// I14 with Claude Sonnet 5.5 as the admission agent (see ../remodel.mjs). The executor of wave 1 stays Claude Haiku 5.5.
import * as base from '../i14-partition/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'i14-partition-sonnet';
export const TITLE = base.TITLE + ' — admission by Claude Sonnet 5.5';
export const PREREG = base.PREREG;
export const WAVES = 2;
export const wave = (k, outputs) => (k === 0 ? toSonnet(base.wave(0)) : base.wave(1, outputs));
export const ceiling = base.ceiling;
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
