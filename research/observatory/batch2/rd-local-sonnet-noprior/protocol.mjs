// rd-local-sonnet-noprior: orchestrator "sonnet", locality prior not given, scenario "local", collections 28001 to 28060.
// Built on ../ring/engine.mjs. Cross-study, preregistered analysis: ../ring/analyze-routers.mjs.
import { study, range } from '../ring/engine.mjs';
const s = study('rd-local-sonnet-noprior', 'RD orchestrator model and locality prior under partial coverage — local, sonnet, prior false', 'tasks/R4-D2-PREREG.md', { prefix: 'rdls0', scenario: 'local', seeds: range(28001, 60), regime: 'router', prior: false, orchestrator: 'sonnet' });
export const ID = s.ID, TITLE = s.TITLE, PREREG = s.PREREG, WAVES = s.WAVES, CONTROLS = s.CONTROLS, SPEC = s.SPEC;
export const wave = s.wave, ceiling = s.ceiling, score = s.score, gate = s.gate, summarize = s.summarize;
