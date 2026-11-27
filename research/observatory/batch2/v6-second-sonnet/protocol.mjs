// V6 on Claude Sonnet 5.5 (see ../remodel.mjs): the direct and w60 agents on the same 90 tasks.
import * as base from '../v6-second/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'v6-second-sonnet';
export const TITLE = base.TITLE + ' — Claude Sonnet 5.5';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => toSonnet(base.rowsFor(['direct', 'w60']));
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => Object.fromEntries(['direct', 'w60'].map((a) => { const r = scored.filter((x) => x.agent === a); return [a, { correct: r.filter((x) => x.correct).length, of: r.length, byLevel: Object.fromEntries(base.LEVELS.map((L) => [L, r.filter((x) => x.level === L && x.correct).length])) }]; }));
