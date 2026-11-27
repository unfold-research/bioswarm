// PD1, plans written by sonnet. See ../pd1-policy/protocol.mjs; analysis in ../pd1-policy/analyze.mjs.
import * as base from '../pd1-policy/protocol.mjs';
export const ID = 'pd1-plan-sonnet';
export const TITLE = base.TITLE + ' — plans by sonnet';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES;
export const CONTROLS = base.CONTROLS;
export const wave = () => base.rows('sonnet');
export const ceiling = () => base.rows('sonnet');
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
