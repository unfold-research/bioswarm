// R3, scenario "scatter", regime "router". The cross-regime, preregistered analysis is ../r3-bounds/analyze.mjs.
import * as base from '../r3-bounds/protocol.mjs';
export const ID = 'r3-scatter-router';
export const TITLE = base.TITLE + ' — scatter, router';
export const PREREG = base.PREREG;
export const WAVES = base.WAVES['router'];
export const CONTROLS = { exempt: 'the fixed-schedule control is the sweep regime of the same scenario; one agent cannot hold the field, which exceeds the request size ceiling' };
export const wave = (k, outputs) => base.waveOf('scatter', 'router', k, outputs);
export const ceiling = (k) => base.ceilingOf('scatter', 'router', k);
export const score = base.score;
export const gate = base.gate;
export const summarize = (scoredByWave) => base.summarizeRegime('scatter', 'router', scoredByWave);
