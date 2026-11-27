import assert from 'node:assert/strict';
import test from 'node:test';
import { teamPolicySnapshot } from './team-policy.mjs';
import { assignTeam } from './phase1b/policy.mjs';

const team = ['lia', 'rui', 'teo'];
function control() {
  let revision = 3;
  const assigned = {};
  return {
    async assign(agent, strategy, overrides) {
      revision++;
      assigned[agent] = { strategy, rules: { runBudgetUsd: 3, messagesPerRun: 1, messagesPerSession: 4,
        messageChars: 400, gate: null, waitForTrace: true, tieBreak: 'hash', ...overrides } };
      return this.get(agent);
    },
    async get(agent) {
      const { strategy, rules } = assigned[agent];
      return { id: strategy + '@' + revision, rules: { ...rules } };
    },
  };
}
test('all agents compare against the final workspace revision fetched by the connector', async () => {
  const api = control();
  const snapshot = await assignTeam(api, 'C', team);
  assert.deepEqual(Object.values(snapshot.ids), Array(3).fill('stigwait-tiebreak@6'));
  for (const agent of team) assert.equal(snapshot.ids[agent], (await api.get(agent)).id);
});
test('a matching strategy and revision cannot hide changed rules after assignment', async () => {
  const api = control();
  await assert.rejects(teamPolicySnapshot(team, (agent) => api.assign(agent, 'stigmergy'),
    async (agent) => { const p = await api.get(agent); p.rules.messageChars = 999; return p; },
    (p) => p), /read-back differs/);
});
