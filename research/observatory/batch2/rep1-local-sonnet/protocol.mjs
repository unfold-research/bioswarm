// REP1, the planned search: a second set of 60 collections for the Sonnet orchestrator given the locality prior under
// local change (RD found 59 of 60 on the first set). Built on ../ring/engine.mjs. The fixed schedule, the alarm rule and
// the planned-search rule on the same collections are computed by simulation with exact readers in ../rep1/analyze.mjs.
import { study, range } from '../ring/engine.mjs';
const s = study('rep1-local-sonnet', 'REP1 replication of the Sonnet orchestrator with the locality prior under local change', 'tasks/REP1-PREREG.md', { prefix: 'rpls', scenario: 'local', seeds: range(33001, 60), regime: 'router', prior: true, orchestrator: 'sonnet' });
export const ID = s.ID, TITLE = s.TITLE, PREREG = s.PREREG, WAVES = s.WAVES, CONTROLS = s.CONTROLS, SPEC = s.SPEC;
export const wave = s.wave, ceiling = s.ceiling, score = s.score, gate = s.gate, summarize = s.summarize;
