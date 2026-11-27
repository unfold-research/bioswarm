// BioSwarm SDK: drive coordination remotely through the BioSwarm Control API (protocol bioswarm.v1).
// Open source (Apache-2.0). The API it talks to is Unfold's private service.
export const PROTOCOL = 'bioswarm.v1';

export class BioSwarmError extends Error {
  constructor(status, body) { super(`BioSwarm API ${status}: ${body?.error || 'error'}`); this.status = status; this.body = body; }
}

export class BioSwarm {
  constructor({ apiKey = process.env.BIOSWARM_API_KEY, baseUrl = process.env.BIOSWARM_API_URL || 'https://bioswarm.unfold.host', fetchImpl = globalThis.fetch } = {}) {
    if (!apiKey) throw new Error('BioSwarm: apiKey is required (or set BIOSWARM_API_KEY)');
    this.apiKey = apiKey; this.baseUrl = baseUrl; this.fetch = fetchImpl;
  }

  async request(method, path, body) {
    const res = await this.fetch(new URL(path, this.baseUrl), {
      method, headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json', 'x-bioswarm-protocol': PROTOCOL },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new BioSwarmError(res.status, data);
    return data;
  }

  // Policies: which coordination rules the connectors of a workspace run.
  policies = {
    current: (query = {}) => this.request('GET', `/v1/policy?${new URLSearchParams({ protocol: PROTOCOL, ...query })}`),
    list: () => this.request('GET', '/v1/policies'),
    // Assign a named strategy ('community', 'stigwait', 'stigwait-tiebreak', ...) to the whole workspace or one agent.
    assign: ({ strategy, agent, overrides } = {}) => this.request('PUT', '/v1/policy', { strategy, agent, overrides }),
  };

  // Runs: a long task driven by a swarm of agents, with the policy chosen for it.
  runs = {
    create: ({ goal, agents, strategy, budgetUsd } = {}) => this.request('POST', '/v1/runs', { goal, agents, strategy, budgetUsd }),
    get: id => this.request('GET', `/v1/runs/${encodeURIComponent(id)}`),
    stop: id => this.request('POST', `/v1/runs/${encodeURIComponent(id)}/stop`),
  };

  // Metrics: cost, time, messages and quality per strategy, from connector telemetry.
  metrics = {
    summary: (query = {}) => this.request('GET', `/v1/metrics?${new URLSearchParams(query)}`),
  };
}
