// Replication of b1-endpoints on Claude Sonnet 5.5 (see ../remodel.mjs for what changes in the request). Same cases, prompts and scoring.
import * as base from '../b1-endpoints/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'b1-endpoints-sonnet';
export const TITLE = base.TITLE + ' — replication on Claude Sonnet 5.5';
export const PREREG = 'tasks/R1-SONNET-REPLICATION-PREREG.md';
export const WAVES = 2;
export const wave = (k, outputs) => toSonnet(base.wave(k, outputs));
export const ceiling = (k) => toSonnet(base.ceiling(k));
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
