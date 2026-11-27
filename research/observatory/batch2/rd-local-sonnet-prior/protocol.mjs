// rd-local-sonnet-prior: orchestrator "sonnet", locality prior given, scenario "local", collections 28001 to 28060.
// Built on ../ring/engine.mjs. Cross-study, preregistered analysis: ../ring/analyze-routers.mjs.
import { study, range } from '../ring/engine.mjs';
const s = study('rd-local-sonnet-prior', 'RD orchestrator model and locality prior under partial coverage — local, sonnet, prior true', 'tasks/R4-D2-PREREG.md', { prefix: 'rdls1', scenario: 'local', seeds: range(28001, 60), regime: 'router', prior: true, orchestrator: 'sonnet' });
export const ID = s.ID, TITLE = s.TITLE, PREREG = s.PREREG, WAVES = s.WAVES, CONTROLS = s.CONTROLS, SPEC = s.SPEC;
export const wave = s.wave, ceiling = s.ceiling, score = s.score, gate = s.gate, summarize = s.summarize;
