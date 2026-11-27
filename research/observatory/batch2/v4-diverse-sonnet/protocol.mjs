// V4, second model: Claude Sonnet 5.5 on the base answer-only prompt of the same 90 tasks (see ../remodel.mjs).
// ../v4-diverse/analyze.mjs uses it for models3 (a0, b, sonnet) and for the comparison with the Haiku collectives.
import * as base from '../v4-diverse/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'v4-diverse-sonnet';
export const TITLE = base.TITLE + ' — second model, Claude Sonnet 5.5';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => toSonnet(base.rowsFor(['sonnet']));
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => ({ tasks: scored.length, correct: scored.filter((x) => x.correct).length, byLevel: Object.fromEntries(base.LEVELS.map((L) => [L, scored.filter((x) => x.level === L && x.correct).length])), truncated: scored.filter((x) => x.truncated).length });
