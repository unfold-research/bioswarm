// C1 on Claude Sonnet 5.5 (see ../remodel.mjs), on half of the cases (16 exposed per arm) to stay under the study cap.
import * as base from '../c1-typed/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'c1-typed-sonnet';
export const TITLE = base.TITLE + ' — Claude Sonnet 5.5';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const CONTROLS = base.CONTROLS;
export const wave = () => toSonnet(base.rowsFor(base.OFFSETS.slice(0, 2)));
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
