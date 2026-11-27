// R3, scenario "poison", regime "verify". The cross-regime, preregistered analysis is ../r3-bounds/analyze.mjs.
import * as base from '../r3-bounds/protocol.mjs';
export const ID = 'r3-poison-verify';
export const TITLE = base.TITLE + ' — poison, verify';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['verify'];
export const CONTROLS = { exempt: 'the fixed-schedule control is the sweep regime of the same scenario; one agent cannot hold the field, which exceeds the request size ceiling' };
export const wave = (k, outputs) => base.waveOf('poison', 'verify', k, outputs);
export const ceiling = (k) => base.ceilingOf('poison', 'verify', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('poison', 'verify', scoredByWave);
