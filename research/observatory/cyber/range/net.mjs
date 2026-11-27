// Range networks, labels, preflight and teardown (TM-002 E1 revision: "No route out" and "Teardown").
// Every object of a range carries the label unfold.range=<id>. Networks are internal bridges with an isolated IPv4
// gateway, so benchhost has no address on them and they have no default route.
//   node net.mjs up <id>        create the three segments of range <id>
//   node net.mjs down <id>      remove every container and network of range <id>
//   node net.mjs preflight <id> fail on any leftover object of <id> or on a STOP mark
//   node net.mjs check <id>     verify the segments are internal, isolated and have no host address
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const SEGMENTS = ['user', 'dmz', 'internal'];
export const SUBNET = { user: '10.90.1.0/24', dmz: '10.90.2.0/24', internal: '10.90.3.0/24' }; // fixed per segment, so host IPs and routes are deterministic
export const LABEL = 'unfold.range';
export const STATE = process.env.R0_STATE || '/srv/bench/r0';
export const stopFile = () => path.join(STATE, 'STOP');

export function docker(args, { ok = false, input } = {}) {
  const r = spawnSync('docker', args, { encoding: 'utf8', input });
  if (r.status !== 0 && !ok) throw Error(`docker ${args.slice(0, 3).join(' ')}: ${(r.stderr || '').trim().slice(-300)}`);
  return (r.stdout || '').trim();
}
const ids = (kind, id) => docker([kind, 'ls', ...(kind === 'container' ? ['-a'] : []), '-q', '--filter', `label=${LABEL}=${id}`]).split('\n').filter(Boolean);
export const netName = (id, seg) => `r0-${id}-${seg}`;

export function up(id) {
  if (!/^[a-z0-9]{1,12}$/.test(id)) throw Error('range id: 1 to 12 lowercase letters or digits');
  preflight(id);
  for (const seg of SEGMENTS)
    docker(['network', 'create', '--internal', '--driver', 'bridge', '-o', 'com.docker.network.bridge.gateway_mode_ipv4=isolated',
      '--subnet', SUBNET[seg], '--label', `${LABEL}=${id}`, '--label', `unfold.segment=${seg}`, netName(id, seg)]);
  check(id);
  return SEGMENTS.map((s) => netName(id, s));
}

// A segment is accepted only if Docker reports it internal and isolated and the host has no IPv4 address on its bridge.
export function check(id) {
  for (const seg of SEGMENTS) {
    const n = JSON.parse(docker(['network', 'inspect', netName(id, seg)]))[0];
    if (!n.Internal) throw Error(`${n.Name} is not internal`);
    if (n.Options?.['com.docker.network.bridge.gateway_mode_ipv4'] !== 'isolated') throw Error(`${n.Name} gateway is not isolated`);
    if ((n.IPAM?.Config || []).some((c) => c.Gateway)) throw Error(`${n.Name} has a gateway address`);
    const br = 'br-' + n.Id.slice(0, 12), addr = spawnSync('ip', ['-4', '-o', 'addr', 'show', 'dev', br], { encoding: 'utf8' }).stdout.trim();
    if (addr) throw Error(`benchhost has an IPv4 address on ${n.Name} (${br}): ${addr}`);
  }
  return true;
}

export function down(id) {
  const cs = ids('container', id); if (cs.length) docker(['rm', '-f', ...cs]);
  const ns = ids('network', id); if (ns.length) docker(['network', 'rm', ...ns]);
  const left = { containers: ids('container', id).length, networks: ids('network', id).length };
  if (left.containers || left.networks) throw Error(`teardown left objects behind: ${JSON.stringify(left)}`);
  return { removed: { containers: cs.length, networks: ns.length } };
}

export function preflight(id) {
  if (fs.existsSync(stopFile())) throw Error(`STOP is set (${stopFile()}): containment failed earlier; the Research Leader decides before any new episode`);
  const left = { containers: ids('container', id).length, networks: ids('network', id).length };
  if (left.containers || left.networks) throw Error(`leftover objects of range ${id}: ${JSON.stringify(left)}`);
  return true;
}

// Writes the STOP mark (TM stopping rule). Called by the canary on any success or positive-control failure.
export function stop(reason) {
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(stopFile(), JSON.stringify({ at: new Date().toISOString(), reason }, null, 1) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, id] = process.argv.slice(2), fn = { up, down, preflight, check }[cmd];
  if (!fn || !id) { console.error('usage: node net.mjs up|down|preflight|check <range id>'); process.exit(2); }
  try { console.log(JSON.stringify({ [cmd]: id, result: fn(id) })); } catch (e) { console.error(String(e.message || e)); process.exit(1); }
}
