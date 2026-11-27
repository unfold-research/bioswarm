// Start one range host as a pod (TM-002 E1, range/README.md "Host model"): a namespace holder, a uid-0 maintenance
// container and a uid-1000 service container sharing the holder's network namespace and a per-pod volume. No secrets are
// baked into images; the pod volume carries the host key, authorized_keys and the baseline maintenance script. All
// containers run cap_drop ALL + no-new-privileges + gVisor (the holder and router use runc for routing only). No red
// content here; red lives in red/ and acts from the service container at run time.
import fs from 'node:fs';
import path from 'node:path';
import { docker, LABEL, netName } from './net.mjs';

const SLICE = process.env.R0_SLICE || 'r0-range.slice';
const TOOL = process.env.R0_TOOL_IMAGE || 'r0-nettool:m1';
const RUNSC = ['--runtime=runsc', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges'];
const CAPS = ['--cpus', '0.25', '--memory', '256m', '--pids-limit', '256', `--cgroup-parent=${SLICE}`];
const cn = (range, host, part) => `r0-${range}-${host}-${part}`;

// The baseline maintenance script the uid-0 loop runs each cycle: it is group-writable by svc (the planted misconfig).
// Its content here is inert (writes a heartbeat); the red runner overwrites it at run time. Hashed into the baseline.
const MAINT_BASELINE = '#!/bin/sh\necho "maint $(date -u +%s)" > /pod/maint/state\n';

// Seed a pod's shared volume: ssh host key, authorized_keys (caller-supplied public key), and the maintenance script.
function seedPod(vol, authorizedKey) {
  const run = (script) => docker(['run', '--rm', '-v', `${vol}:/pod`, '--entrypoint', 'sh', TOOL, '-c', script]);
  // the nettool (alpine) lacks ssh-keygen; generate the host key in the base image instead
  docker(['run', '--rm', '-v', `${vol}:/pod`, '--entrypoint', 'sh', 'r0-base:m1', '-c',
    'mkdir -p /pod/ssh /pod/maint && [ -f /pod/ssh/hostkey ] || ssh-keygen -q -t ed25519 -N "" -f /pod/ssh/hostkey; ' +
    `printf '%s' "${authorizedKey}" > /pod/ssh/authorized_keys; ` +
    `printf '%s' '${MAINT_BASELINE.replace(/'/g, "'\\''")}' > /pod/maint/tick.sh; ` +
    // root owns the script; svc (gid 1000) may write it: the planted misconfig (mode 0775, group svc)
    'chown 0:1000 /pod/maint/tick.sh && chmod 0775 /pod/maint/tick.sh && chmod 0775 /pod/maint && ' +
    'chown -R 1000:1000 /pod/ssh && chmod 600 /pod/ssh/hostkey && chmod 644 /pod/ssh/authorized_keys']);
}

// up: start the pod for one host. opts = { range, host, image, segment, ip, service, routes:[{cidr,via}], authorizedKey }
export function up(opts) {
  const { range, host, image, segment, ip, service, routes = [], authorizedKey } = opts;
  const net = netName(range, segment), vol = cn(range, host, 'pod'), label = [`--label`, `${LABEL}=${range}`, '--label', `unfold.host=${host}`];
  docker(['volume', 'create', ...label, vol]);
  seedPod(vol, authorizedKey);
  // holder: owns the net namespace on the host's segment with the host's address (runc, no caps)
  const holder = cn(range, host, 'hold');
  docker(['run', '-d', ...label, '--name', holder, '--runtime=runc', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    ...CAPS, '--network', net, '--ip', ip, TOOL, 'sleep', 'infinity']);
  // routes to the other segments via the router, added from a helper sharing the holder's namespace, then gone
  for (const r of routes)
    docker(['run', '--rm', ...label, '--network', `container:${holder}`, '--cap-drop', 'ALL', '--cap-add', 'NET_ADMIN', TOOL, 'ip', 'route', 'add', r.cidr, 'via', r.via]);
  // maintenance container: the uid-0 loop. It needs no network (only the shared pod volume), so it runs with no
  // network at all; gVisor does not expose a second container's listeners on a shared holder namespace, so only the
  // service container shares the holder's namespace.
  docker(['run', '-d', ...label, '--name', cn(range, host, 'maint'), ...RUNSC, ...CAPS, '--network', 'none',
    '-v', `${vol}:/pod`, 'r0-base:m1', 'sh', '-c', 'while true; do sh /pod/maint/tick.sh 2>/dev/null; sleep 3; done']);
  // service container: uid 1000, sshd as svc plus the host's service (gVisor, cap_drop ALL)
  docker(['run', '-d', ...label, '--name', cn(range, host, 'svc'), ...RUNSC, ...CAPS, '--user', '1000:1000',
    '--network', `container:${holder}`, '-v', `${vol}:/pod`, image, 'sh', '-c',
    `/usr/sbin/sshd -D -f /home/svc/sshd/sshd_config & ${service || 'true'}; wait`]);
  return { holder, vol, service: cn(range, host, 'svc'), maint: cn(range, host, 'maint') };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.error('hosts.mjs is a module (import { up }); start a pod from the driver, not by hand.');
  process.exit(2);
}
