import { isDeepStrictEqual } from 'node:util';

// Control can advance the workspace revision on any assignment, including another teammate's PUT.
// Check the treatment at both ends and save the IDs that the agents will actually fetch.
export async function teamPolicySnapshot(team, put, get, validate) {
  const assigned = new Map();
  for (const agent of team) assigned.set(agent, validate(await put(agent)));
  const ids = {};
  const rules = assigned.get(team[0]).rules;
  for (const agent of team) {
    const current = validate(await get(agent));
    if (!isDeepStrictEqual(current.rules, assigned.get(agent).rules) || !isDeepStrictEqual(current.rules, rules)) {
      throw Error('Control read-back differs from the assigned team rules; attempt refused');
    }
    ids[agent] = current.id;
  }
  return { ids, rules };
}
