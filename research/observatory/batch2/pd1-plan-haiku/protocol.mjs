// PD1, plans written by haiku. See ../pd1-policy/protocol.mjs; analysis in ../pd1-policy/analyze.mjs.
import * as base from '../pd1-policy/protocol.mjs';
export const ID = 'pd1-plan-haiku';
export const TITLE = base.TITLE + ' — plans by haiku';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = () => base.rows('haiku');
export const ceiling = () => base.rows('haiku');
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
