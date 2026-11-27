// The mechanism registry: one entry per coordination mechanism an arm can use. A study names arms by these ids, or
// defines its own combinations in `cfg.mechanisms` ({ name: { rule, chat, clones } }), so a new mechanism or a
// combination is configuration, not runner code. `rule` is a plan rule of code.mjs; `chat` lets members message each
// other; `clones` makes a helper owner acting on a directed check produce that many variants, the strict check keeping
// the best (clonal selection). `kind` marks the two arms that are not member rules: the manager and one agent.
// Map of mechanisms to their natural counterparts: docs/NATURE-MECHANISMS.md.
export const MECHANISMS = {
  sync: { rule: 'sync', about: 'every member touched acts (no coordination)' },
  chat: { rule: 'sync', chat: true, about: 'market: leaderless group chat' },
  manager: { kind: 'manager', about: 'market: a lead agent assigns work' },
  solo: { kind: 'solo', about: 'reference: one agent with everything' },
  inhibit: { rule: 'inhibit', about: 'lateral inhibition: one side per conflict' },
  routed: { rule: 'routed', chat: true, about: 'geometry router: one side on symmetric, both on directed, messages' },
  threshold: { rule: 'threshold', about: 'response threshold with noise' },
  polarity: { rule: 'polarity', about: 'directed failures to the helper owner only, no trace' },
  oracle: { rule: 'oracle', about: 'the harness writes the requirement on the check (reference)' },
  pheromone: { rule: 'oracle', about: 'alias of oracle (LI11 name)' },
  stig: { rule: 'stig', about: 'stigmergy: the caller writes a persistent trace for the helper owner' },
  clonal: { rule: 'stig', clones: 3, about: 'stig + clonal selection of helper variants' },
  stigwait: { rule: 'stigwait', about: 'stig, and the helper owner acts on a directed check only once a trace is on it (signal, not symptom)' },
  clonalwait: { rule: 'stigwait', clones: 3, about: 'stigwait + clonal selection' },
  stigwait_both: { rule: 'stigwaitboth', about: 'stigwait, but both sides of a failing symmetric check act (no tie-break): isolates the trace from the tie-break (LI26 review)' },
  stigwait_evap1: { rule: 'stigwait', evaporate: 1, about: 'stigwait, and a trace evaporates one wave after it was written unless rewritten (pheromone decay)' },
  stigwait_evap3: { rule: 'stigwait', evaporate: 3, about: 'stigwait with traces lasting three waves' },
};
export const mechanismOf = (cfg, arm) => cfg.mechanisms?.[arm] || MECHANISMS[arm] || (() => { throw Error(`unknown mechanism ${arm}`); })();
export const PLAN_RULES = ['sync', 'inhibit', 'routed', 'threshold', 'pheromone', 'polarity', 'oracle', 'stig', 'stigwait', 'stigwaitboth'];
