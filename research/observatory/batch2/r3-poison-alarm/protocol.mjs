// R3, scenario "poison", regime "alarm". The cross-regime, preregistered analysis is ../r3-bounds/analyze.mjs.
import * as base from '../r3-bounds/protocol.mjs';
export const ID = 'r3-poison-alarm';
export const TITLE = base.TITLE + ' — poison, alarm';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['alarm'];
export const CONTROLS = { exempt: 'the fixed-schedule control is the sweep regime of the same scenario; one agent cannot hold the field, which exceeds the request size ceiling' };
export const wave = (k, outputs) => base.waveOf('poison', 'alarm', k, outputs);
export const ceiling = (k) => base.ceilingOf('poison', 'alarm', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('poison', 'alarm', scoredByWave);
