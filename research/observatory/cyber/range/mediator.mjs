// R0 mediator: blue's deterministic actions with measured durations (M2; tasks/R0-PILOT-PREREG.md, "Blue actions" and
// "Change before any episode"). Blue never runs free commands; the arms (react, disinfect-cd10) choose from these.
//   Analyse  : log a host's process tree and whether its maintenance script/dir differ from the frozen baseline.
//   Remove   : diff the maintenance script and directory against the frozen baseline (hash changed, or an extra uid-0
//              process) and restore the baseline script; kill the extra uid-0 processes. This undoes stage 3/4 without
//              recreating the host. Replaces the prereg's earlier "remove red's cron entries" (there is no cron).
//   Restore  : recreate the host's service and maintenance containers in the SAME holder (routes stay), from the clean
//              image and a clean maintenance snapshot; the host is down meanwhile. Undoes any red change on that host.
//   Block/Allow : a router FORWARD drop/undrop between two segments (one step).
//   Sleep    : nothing.
// The mediator's OWN processes and connections must never enter an allow-list: every exec it runs carries the episode's
// harness token (R0_HARNESS) and uses sh/bash (on the sensor's fixed exclusion list), so the sensor excludes them; and
// the baseline episodes (which feed the frozen lists) run arm `sleep` with no blue action at all, so the mediator never
// runs while a list is being learned.
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { docker, netName, SUBNET, SEGMENTS, LABEL } from './net.mjs';
import { HOSTS } from './range.mjs';

const SLICE = process.env.R0_SLICE || 'r0-range.slice';
const TOOL = process.env.R0_TOOL_IMAGE || 'r0-nettool:m1';
const RUNSC = ['--runtime=runsc', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges'];
const CAPS = ['--cpus', '0.25', '--memory', '256m', '--pids-limit', '256', `--cgroup-parent=${SLICE}`];
// the clean (frozen) maintenance script, identical to hosts.mjs MAINT_BASELINE
export const MAINT_BASELINE = '#!/bin/sh\necho "maint $(date -u +%s)" > /pod/maint/state\n';
export const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
export const BASELINE_SHA = sha(MAINT_BASELINE);

const now = () => Number(process.hrtime.bigint() / 1000000n);
const dx = (args, opts = {}) => spawnSync('docker', args, { encoding: 'utf8', timeout: 60000, ...opts });

// host meta (image, service command, segment, ip) from the range table, by host name
const META = Object.fromEntries(HOSTS.map((h) => [h.host, h]));
const cn = (range, host, part) => `r0-${range}-${host}-${part}`;

export class Mediator {
  // opts: { range, pods, router, token, baseline (script content, default MAINT_BASELINE) }
  constructor({ range, pods, router, token, baseline = MAINT_BASELINE }) {
    this.range = range; this.P = Object.fromEntries(pods.map((p) => [p.host, p])); this.router = router;
    this.token = token; this.baseline = baseline; this.baselineSha = sha(baseline);
    this.blocked = new Set(); this.log = [];
  }
  // every mediator exec is tagged with the harness token so the sensor excludes it from the allow-lists
  // input is stdin text only (a string or Buffer); anything else is ignored. allow() once passed { ok: true } here and
  // spawnSync rejected it (stdio[0] must be a string or Buffer), which stopped r0-pilot in its first timing episode.
  exec(container, argv, input) { const stdin = typeof input === 'string' || Buffer.isBuffer(input) ? input : null; return dx(['exec', '-i', '-e', `R0_HARNESS=${this.token}`, container, ...argv], stdin != null ? { input: stdin } : {}); }

  tick(host) { return this.exec(this.P[host].service, ['sh', '-c', 'cat /pod/maint/tick.sh 2>/dev/null']).stdout; }
  changed(host) { return sha(this.tick(host)) !== this.baselineSha; } // maintenance script differs from the frozen baseline

  analyse(host) {
    const t0 = now();
    const procs = this.exec(this.P[host].service, ['sh', '-c', 'ps -eo pid,ppid,user,args 2>/dev/null']).stdout;
    const maintProcs = this.exec(this.P[host].maint, ['sh', '-c', 'ps -eo pid,ppid,user,args 2>/dev/null']).stdout;
    const changed = this.changed(host);
    const rec = { action: 'Analyse', host, step: null, ms: now() - t0, changed, procLines: (procs + maintProcs).split('\n').filter(Boolean).length };
    this.log.push(rec); return rec;
  }
  // Remove: restore the baseline maintenance script if it changed and kill the extra uid-0 processes. Undoes stage 3/4.
  remove(host) {
    const t0 = now();
    const was = this.changed(host);
    if (was) this.exec(this.P[host].service, ['sh', '-c', 'cat > /pod/maint/tick.sh && chmod 0775 /pod/maint/tick.sh'], this.baseline);
    // remove red's root-owned marker and kill its extra uid-0 process from the maintenance container (uid 0), which owns
    // them; the service container (uid 1000) cannot reliably unlink a root-owned file.
    this.exec(this.P[host].maint, ['sh', '-c', 'rm -f /pod/maint/.red 2>/dev/null; for p in /proc/[0-9]*; do e=$(readlink $p/exe 2>/dev/null) || continue; case $e in */tail) kill ${p#/proc/} 2>/dev/null;; esac; done; pkill -f "tail -f /dev/null" 2>/dev/null; true']);
    const rec = { action: 'Remove', host, step: null, ms: now() - t0, scriptWasChanged: was, scriptRestored: this.changed(host) === false };
    this.log.push(rec); return rec;
  }
  // Restore: recreate the service + maintenance containers in the same holder from the clean image and a clean
  // maintenance snapshot. The host is down while the containers are recreated. Routes stay (the holder is untouched).
  restore(host) {
    const t0 = now();
    const p = this.P[host], meta = META[host], vol = p.vol, holder = p.holder;
    const svc = cn(this.range, host, 'svc'), maint = cn(this.range, host, 'maint');
    dx(['rm', '-f', svc, maint], { ok: true });
    // clean maintenance snapshot: baseline script (group-writable misconfig), no red artifacts
    dx(['run', '--rm', '-v', `${vol}:/pod`, '--entrypoint', 'sh', TOOL, '-c',
      `printf '%s' '${this.baseline.replace(/'/g, "'\\''")}' > /pod/maint/tick.sh && chown 0:1000 /pod/maint/tick.sh && chmod 0775 /pod/maint/tick.sh && rm -f /pod/maint/.red`]);
    const label = ['--label', `${LABEL}=${this.range}`, '--label', `unfold.host=${host}`];
    dx(['run', '-d', ...label, '--name', maint, ...RUNSC, ...CAPS, '--network', 'none', '-v', `${vol}:/pod`, 'r0-base:m1', 'sh', '-c', 'while true; do sh /pod/maint/tick.sh 2>/dev/null; sleep 3; done']);
    dx(['run', '-d', ...label, '--name', svc, ...RUNSC, ...CAPS, '--user', '1000:1000', '--network', `container:${holder}`, '-v', `${vol}:/pod`, meta.image, 'sh', '-c',
      `/usr/sbin/sshd -D -f /home/svc/sshd/sshd_config & ${meta.service || 'true'}; wait`]);
    // wait until the host's sshd answers again (down meanwhile); duration includes it (prereg: the Restore time)
    const ip = p.ip, t1 = now();
    while (now() - t1 < 60000) { if (dx(['exec', svc, 'timeout', '2', 'bash', '-c', `echo > /dev/tcp/127.0.0.1/2222`]).status === 0) break; dx(['exec', svc, 'true'], { ok: true }); spawnSync('sleep', ['1']); }
    const rec = { action: 'Restore', host, step: null, ms: now() - t0, svc, maint };
    this.P[host] = { ...p, service: svc, maint };
    this.log.push(rec); return rec;
  }
  // Block / Allow a router FORWARD path between two segments (one step; blue's Block relies on the router being the only
  // path between segments). key is a sorted segment pair.
  block(segA, segB) {
    const t0 = now(), key = [segA, segB].sort().join('-');
    if (!this.blocked.has(key)) {
      for (const [a, b] of [[segA, segB], [segB, segA]]) this.exec(this.router, ['iptables', '-I', 'FORWARD', '1', '-s', SUBNET[a], '-d', SUBNET[b], '-j', 'DROP']);
      this.blocked.add(key);
    }
    const rec = { action: 'Block', pair: key, step: null, ms: now() - t0 }; this.log.push(rec); return rec;
  }
  allow(segA, segB) {
    const t0 = now(), key = [segA, segB].sort().join('-');
    if (this.blocked.has(key)) {
      for (const [a, b] of [[segA, segB], [segB, segA]]) this.exec(this.router, ['iptables', '-D', 'FORWARD', '-s', SUBNET[a], '-d', SUBNET[b], '-j', 'DROP']); // a missing rule just fails; allow() is idempotent
      this.blocked.delete(key);
    }
    const rec = { action: 'Allow', pair: key, step: null, ms: now() - t0 }; this.log.push(rec); return rec;
  }
  sleep() { const rec = { action: 'Sleep', step: null, ms: 0 }; this.log.push(rec); return rec; }
}

if (import.meta.url === `file://${process.argv[1]}`) { console.error('mediator.mjs is a module driven by episode.mjs.'); process.exit(2); }
