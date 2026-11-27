// R1, regime "router": an orchestrator model assigns the analysts and names the answer. Five waves: assign, read, assign,
// read, answer. The cross-regime, preregistered analysis is ../r1-regimes/analyze.mjs.
import * as base from '../r1-regimes/protocol.mjs';
export const ID = 'r1-router';
export const TITLE = base.TITLE + ' — router';
export const PREREG = base.PREREG;
export const WAVES = 5;
export const wave = (k, outputs) => base.routerWave(k, outputs);
export const ceiling = (k) => base.routerCeiling(k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRouter(scoredByWave);
