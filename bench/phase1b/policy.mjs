// Control assignment for Phase 1b. The runner sends each arm's strategy (and, for C, overrides:{fallbackAfter:3}) to
// every agent with PUT /v1/policy, checks the returned policy, reads it back with GET for all three agents, and
// refuses the attempt on any divergence from the preregistered arm. Only the verified rules are used afterwards.
import { teamPolicySnapshot } from '../team-policy.mjs';
import { perTurnUsd } from '../pi-budget/index.js';

export const armPolicies = {
  B: { strategy: 'stigmergy', overrides: null, expect: { waitForTrace: undefined, tieBreak: undefined, fallbackAfter: undefined } },
  C: { strategy: 'stigwait-tiebreak', overrides: { fallbackAfter: 3 }, expect: { waitForTrace: true, tieBreak: 'hash', fallbackAfter: 3 } },
};
const limits = { runBudgetUsd: perTurnUsd, messagesPerRun: 1, messagesPerSession: 4, messageChars: 400, gate: null };

export function checkPolicy(policy, arm) {
  const { strategy, expect } = armPolicies[arm];
  const r = policy?.rules ?? {};
  const wrong = [];
  if (!String(policy?.id ?? '').startsWith(strategy + '@')) wrong.push('id');
  for (const [k, v] of Object.entries({ ...limits, ...expect })) if (r[k] !== v) wrong.push(k);
  if (wrong.length) throw Error(`Control policy diverges from arm ${arm} (${wrong.join(', ')}); attempt refused`);
  return policy;
}

export async function assignTeam(control, arm, team) {
  const { strategy, overrides } = armPolicies[arm];
  return teamPolicySnapshot(team, (agent) => control.assign(agent, strategy, overrides),
    (agent) => control.get(agent), (policy) => checkPolicy(policy, arm));
}

// The connector's cached copy must carry the same verified rules, so the agents acted on what the runner checked.
export const receivedSame = (cache, ids, rules, agent) => cache?.id === ids[agent] && ['waitForTrace', 'tieBreak', 'fallbackAfter'].every((k) => cache.rules?.[k] === rules[k]);
