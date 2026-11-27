// I4, research family, on Claude Sonnet 5.5 (see ../remodel.mjs for what changes in the request). Same cases, prompts and scoring.
import * as base from '../i4-covert-research/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'i4-covert-research-sonnet';
export const TITLE = base.TITLE + ' — Claude Sonnet 5.5';
export const PREREG = base.PREREG;
export const WAVES = 1;
export const wave = () => toSonnet(base.wave());
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
