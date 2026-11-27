// R3, scenario "poison", regime "sweep". The cross-regime, preregistered analysis is ../r3-bounds/analyze.mjs.
import * as base from '../r3-bounds/protocol.mjs';
export const ID = 'r3-poison-sweep';
export const TITLE = base.TITLE + ' — poison, sweep';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['sweep'];
export const CONTROLS = { exempt: 'the fixed-schedule control is the sweep regime of the same scenario; one agent cannot hold the field, which exceeds the request size ceiling' };
export const wave = (k, outputs) => base.waveOf('poison', 'sweep', k, outputs);
export const ceiling = (k) => base.ceilingOf('poison', 'sweep', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('poison', 'sweep', scoredByWave);
