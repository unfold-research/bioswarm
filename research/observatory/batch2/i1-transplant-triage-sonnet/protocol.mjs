// Replication of i1-transplant-triage on Claude Sonnet 5.5 (see ../remodel.mjs for what changes in the request). Same cases, prompts and scoring.
import * as base from '../i1-transplant-triage/protocol.mjs';
import { toSonnet } from '../remodel.mjs';
export const ID = 'i1-transplant-triage-sonnet';
export const TITLE = base.TITLE + ' — replication on Claude Sonnet 5.5';
export const PREREG = 'tasks/R1-SONNET-REPLICATION-PREREG.md';
export const WAVES = 1;
export const wave = (k, outputs) => toSonnet(base.wave());
export const ceiling = (k) => toSonnet(base.wave());
export const score = base.score;
export const gate = base.gate;
export const summarize = base.summarize;
