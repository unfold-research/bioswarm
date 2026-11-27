// V7, second model: Claude Sonnet 5.5 with at most 60 words of working on the same 90 tasks (see ../remodel.mjs).
// ../v7-hard/analyze.mjs uses it for the cascade: d0 if the verifier accepts it, otherwise the Sonnet answer.
import * as base from '../v7-hard/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'v7-hard-sonnet';
export const TITLE = base.TITLE + ' — second model, Claude Sonnet 5.5';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => toSonnet(base.tasks().map((t) => ({ custom_id: `v7-${t.seed}-sonnet`, params: base.deepParams(t, 60), meta: { kind: 'answer', sample: 0, seed: t.seed, level: t.level, answer: t.answer, authors: t.authors } })));
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => ({ tasks: scored.length, correct: scored.filter((x) => x.correct).length, byLevel: Object.fromEntries(base.LEVELS.map((L) => [L, scored.filter((x) => x.level === L && x.correct).length])), truncated: scored.filter((x) => x.truncated).length });
