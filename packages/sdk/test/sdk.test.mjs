import test from 'node:test';
import assert from 'node:assert/strict';
import { BioSwarm, BioSwarmError, PROTOCOL } from '../src/index.js';

test('requests carry the key and the protocol, and errors are typed', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push({ url: String(url), init }); return url.pathname === '/v1/runs/x' ? { ok: false, status: 404, json: async () => ({ error: 'not found' }) } : { ok: true, status: 200, json: async () => ({ id: 'r1' }) }; };
  const bs = new BioSwarm({ apiKey: 'k', baseUrl: 'https://api.example', fetchImpl });
  assert.deepEqual(await bs.runs.create({ goal: 'g', agents: ['a', 'b'], strategy: 'stigwait' }), { id: 'r1' });
  assert.equal(seen[0].init.headers.authorization, 'Bearer k'); assert.equal(seen[0].init.headers['x-bioswarm-protocol'], PROTOCOL);
  await assert.rejects(bs.runs.get('x'), BioSwarmError);
  assert.throws(() => new BioSwarm({ apiKey: '', fetchImpl }));
});
