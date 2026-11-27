// V1 split by arm so that each submission stays under the US$ 1 study cap (the pessimistic reservation for all 480
// requests is above it). Same tasks, prompts and scoring as ../v1-vote/protocol.mjs; this half sends the diverse arm only.
// The preregistered analysis of both halves together is ../v1-vote/analyze.mjs.
import * as base from '../v1-vote/protocol.mjs';
export const ID = 'v1-vote-diverse';
export const TITLE = base.TITLE + ' — diverse arm';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => base.wave().filter((q) => q.meta.arm === 'diverse');
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export function summarize([scored]) { const n = scored.length, ok = scored.filter((x) => x.correct).length; return { arm: 'diverse', responses: n, correct: ok, note: 'Combined analysis: node observatory/batch2/v1-vote/analyze.mjs' }; }
