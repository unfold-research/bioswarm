// fold-field: coordination through a computed field, for agents that each own part of a coupled piece of work.
// The members never message each other. Each round the environment checks the work and returns its violations; a rule
// decides who acts on which violation; the chosen members run in parallel and write only what they own.
// Rules (see tasks/LI1-LATERAL-INHIBITION-PREREG.md and tasks/LI2-FIELD-VS-CHAT-PREREG.md for the evidence behind them):
//   'inhibit'  a violation inside one owner goes to it; a violation between two owners goes to ONE of them, by a priority
//              that alternates with the round (lateral inhibition / stop signal; distributed breakout in DCSP terms)
//   'patch'    stimulus-centred recruitment: each violation recruits its parts and their neighbours, overlapping groups
//              merge, one member works each group, whatever the static owners are
//   'sync'     every owner touched by a violation acts on all of them (the oscillating baseline)
//   'random'   as 'sync', each owner acting with probability p (DSA)
// Model-agnostic: the caller supplies check() and act(); this module only decides who acts and merges what they return.
import crypto from 'node:crypto';

const hash = (x) => crypto.createHash('sha256').update(String(x)).digest().readUInt32LE(0);

/**
 * @param {object} o
 * @param {string[]} o.parts                       ids of the parts of the work
 * @param {(part:string)=>string} o.ownerOf        static owner of each part
 * @param {(part:string)=>string[]} [o.neighbours] parts coupled to a part (needed for 'patch')
 * @param {(state:Map)=>Array<{parts:string[], note?:string}>} o.check   violations of the current state
 * @param {(job:{member:string, parts:string[], violations:Array, state:Map, round:number})=>Promise<Map>} o.act
 *        runs one member on its job; returns new values for (a subset of) job.parts
 * @param {'inhibit'|'patch'|'sync'|'random'|'routed'} [o.rule]   violations may carry kind: 'directed' | 'symmetric'
 * @param {number} [o.rounds] [o.p] [o.patchCap]
 */
export async function coordinate({ parts, ownerOf, neighbours = () => [], check, act, state = new Map(), rule = 'inhibit', rounds = 8, p = 0.5, patchCap = 40, seed = 'fold', onRound } = {}) {
  const trace = [];
  for (let round = 1; round <= rounds; round++) {
    const violations = check(state);
    if (!violations.length) return { solved: true, state, rounds: round - 1, trace };
    const jobs = assign({ violations, ownerOf, neighbours, rule, round, p, patchCap, seed }).map((j) => ({ ...j, parts: j.parts || parts.filter((x) => ownerOf(x) === j.member) }));
    const results = await Promise.all(jobs.map((job) => act({ ...job, state, round }).then((m) => [job, m], () => [job, new Map()])));
    for (const [job, update] of results) { const allowed = new Set(job.parts); for (const [part, value] of update || []) if (allowed.has(part)) state.set(part, value); }
    const after = check(state).length; trace.push({ round, violations: violations.length, jobs: jobs.length, after }); onRound?.(trace.at(-1));
  }
  const left = check(state);
  return { solved: left.length === 0, state, rounds, trace, left };
}

/** Who acts on what this round. Exported so a harness can show or audit the decision. */
export function assign({ violations, ownerOf, neighbours = () => [], rule = 'inhibit', round = 1, p = 0.5, patchCap = 40, seed = 'fold' }) {
  if (rule === 'patch') return patches(violations, neighbours, patchCap).map((g, i) => ({ member: `patch-${round}-${i}`, parts: g.parts, violations: g.violations }));
  const byOwner = new Map(), add = (o, v) => { if (!byOwner.has(o)) byOwner.set(o, []); byOwner.get(o).push(v); };
  for (const v of violations) {
    const owners = [...new Set(v.parts.map(ownerOf))];
    if (owners.length === 1 || rule === 'sync' || rule === 'random' || (rule === 'routed' && v.kind === 'directed')) owners.forEach((o) => add(o, v));
    else add(owners.reduce((best, o) => (hash(`${seed}:${o}:${round}`) > hash(`${seed}:${best}:${round}`) ? o : best)), v);
  }
  let jobs = [...byOwner.entries()].map(([member, vs]) => ({ member, violations: vs, parts: null }));
  if (rule === 'random') jobs = jobs.filter((j) => hash(`${seed}:${j.member}:${round}:p`) / 4294967296 < p);
  return jobs; // parts: null means "everything this member owns"; the caller resolves it
}

function patches(violations, neighbours, cap) {
  const groups = [];
  for (const v of violations) {
    const ball = new Set(v.parts); for (const x of v.parts) for (const y of neighbours(x)) ball.add(y);
    const hit = groups.filter((g) => [...ball].some((x) => g.parts.has(x)));
    const merged = { parts: new Set(ball), violations: [v] };
    for (const g of hit) { g.parts.forEach((x) => merged.parts.add(x)); merged.violations.push(...g.violations); groups.splice(groups.indexOf(g), 1); }
    groups.push(merged);
  }
  return groups.map((g) => { const core = new Set(g.violations.flatMap((v) => v.parts)); const parts = [...core, ...[...g.parts].filter((x) => !core.has(x))].slice(0, Math.max(cap, core.size)); return { parts, violations: g.violations }; });
}
