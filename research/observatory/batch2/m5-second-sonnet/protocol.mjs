// M5, second model: Claude Sonnet 5.5 answers the base prompt of the same 90 tasks (see ../remodel.mjs for what changes in
// the request). Used by ../m5-second/analyze.mjs for the escalation strategy: s0 if the verifier accepts it, otherwise Sonnet.
import * as base from '../m5-second/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'm5-second-sonnet';
export const TITLE = base.TITLE + ' — second model, Claude Sonnet 5.5';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => toSonnet(base.wave(0).filter((q) => q.meta.variant === 's0').map((q) => ({ ...q, custom_id: q.custom_id.replace('-s0', '-sonnet'), meta: { ...q.meta, variant: 'sonnet' } })));
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = ([scored]) => ({ tasks: scored.length, correct: scored.filter((x) => x.correct).length, byLevel: Object.fromEntries([12, 24, 48].map((L) => [L, scored.filter((x) => x.level === L && x.correct).length])) });
