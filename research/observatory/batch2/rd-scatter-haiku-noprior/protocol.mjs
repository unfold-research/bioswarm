// rd-scatter-haiku-noprior: orchestrator "haiku", locality prior not given, scenario "scatter", collections 29001 to 29060.
// Built on ../ring/engine.mjs. Cross-study, preregistered analysis: ../ring/analyze-routers.mjs.
import { study, range } from '../ring/engine.mjs';
const s = study('rd-scatter-haiku-noprior', 'RD orchestrator model and locality prior under partial coverage — scatter, haiku, prior false', 'tasks/R4-D2-PREREG.md', { prefix: 'rdsh0', scenario: 'scatter', seeds: range(29001, 60), regime: 'router', prior: false, orchestrator: 'haiku' });
export const ID = s.ID, TITLE = s.TITLE, PREREG = s.PREREG, WAVES = s.WAVES, CONTROLS = s.CONTROLS, SPEC = s.SPEC;
export const wave = s.wave, ceiling = s.ceiling, score = s.score, gate = s.gate, summarize = s.summarize;
