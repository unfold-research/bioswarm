// R0 episode runner (M2/M3; tasks/R0-PILOT-PREREG.md). One episode = a fixed number of wall-clock steps. Each step, in
// a fixed order: red acts, the sensor reads the pod state, green launches its due actions (after the read since
// Cyber Research's decision of 2026-11-23; at most one in flight per workstation), cues are computed against the frozen
// lists, and blue (the arm) acts on those cues. Green's actions run asynchronously (Cyber Research, 2026-11-23,
// pre-data deviation): the step clock does not wait for them; each result is logged with the step it was launched in,
// and every step records how many green actions were in flight and how long red's (synchronous) exec took. Everything is logged. The runner reads the sensor through the interface the sensors
// module exports (the Sensors class, freeze() and cues(); README "sensors.mjs"), imported dynamically so the pure
// helpers below load without Docker or the sensors file present.
//
// Arms (prereg "Blue arms"):
//   sleep          : no action.
//   react          : Restore a host showing a SUSPICIOUS PROCESS; servers first; not the same host within the react
//                    cooldown (1 x the Restore time in steps).
//   disinfect-cd10 : Restore a host showing a suspicious process OR connection; servers first; not the same host within
//                    the disinfect cooldown (2 x the Restore time in steps).
// One blue agent per segment acts only on its own hosts, so at most one Restore per segment per step.
import fs from 'node:fs';
import os from 'node:os';
import { Green } from './green/green.mjs';
import { Red } from './red/red.mjs';
import { Mediator } from './mediator.mjs';
import { HOSTS, SERVICE_PORTS } from './range.mjs';

export const SERVERS = ['web', 'db', 'files'];
export const SEGMENT_OF = Object.fromEntries(HOSTS.map((h) => [h.host, h.segment]));
// servers first, then workstations; a stable order so "servers first" is deterministic
export const PRIORITY = (host) => (SERVERS.includes(host) ? SERVERS.indexOf(host) : 100 + host.charCodeAt(host.length - 1));

// restore time in steps = ceil(median restore ms / step ms); cooldowns are multiples of it. Pure, unit-tested.
export const restoreSteps = (medianMs, stepMs) => Math.max(1, Math.ceil(medianMs / stepMs));
export const cooldownFor = (arm, rs) => (arm === 'disinfect-cd10' ? 2 * rs : arm === 'react' ? 1 * rs : 0);
export const median = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[a.length >> 1] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : 0; };
// a step overruns if it took more than 110% of the step length (prereg "Timing")
export const OVERRUN_FACTOR = 1.1;
export const isOverrun = (ms, stepMs) => ms > OVERRUN_FACTOR * stepMs;

// The arm's decision for one step. Pure, unit-tested.
//   arm, cuesByHost: { host: {suspiciousProcess, suspiciousConnection} }, downHosts: Set (hosts being restored),
//   lastRestore: { host: step }, step, cfg: { cooldownSteps, segmentOf, priority }
// Returns the hosts to Restore this step (at most one per segment).
export function decideBlue(arm, cuesByHost, { downHosts = new Set(), lastRestore = {}, step, cooldownSteps }) {
  if (arm === 'sleep') return [];
  const wantConn = arm === 'disinfect-cd10';
  const eligible = [];
  for (const [host, c] of Object.entries(cuesByHost)) {
    if (host === 'router' || downHosts.has(host)) continue;
    const cue = c.suspiciousProcess || (wantConn && c.suspiciousConnection);
    if (!cue) continue;
    const last = lastRestore[host];
    if (last != null && step - last < cooldownSteps) continue; // within cooldown of this host
    eligible.push(host);
  }
  const bySeg = {};
  for (const h of eligible.sort((a, b) => PRIORITY(a) - PRIORITY(b))) { const s = SEGMENT_OF[h]; if (!(s in bySeg)) bySeg[s] = h; }
  return Object.values(bySeg);
}


// ---- Cyber Research decision of 2026-11-22 (instrument rules; the prereg is unchanged) ----
// 1. A step whose sensor read took more than SENSOR_LATE_MS (benchhost stalled), or where a host's stream replied late, is
//    marked `sensor-late`. Late hosts are 'sensor-late', never 'down': they show no cues, so no Restore or other action
//    is triggered by a false down, and sensor-late steps are left out of time-to-detect (the delay is not charged to
//    the defender).
// 2. Availability and green success come from the range's services and the canary, not from the sensor (green.mjs).
// 3. An episode with more than MAX_LATE_FRAC of its steps sensor-late is invalid; the driver reruns the same seed and
//    records a deviation (never dropped silently).
// 4. The 1-minute load is recorded per step, and an episode does not start while it is above MAX_LOAD1.
export const SENSOR_LATE_MS = 1500;
export const MAX_LATE_FRAC = 0.05;
export const MAX_LOAD1 = 2;
// sensors.mjs: a late reply rejects the ask with 'timeout'; 'stream ended' / 'stream stopped' mean the container is gone
const LATE_ERRORS = new Set(['timeout']);

// Per-host state for one sensor step ('up' | 'sensor-late' | 'down') and whether the step is sensor-late. Pure.
export function hostStates(obs, lateMs = SENSOR_LATE_MS) {
  const states = {};
  for (const [h, o] of Object.entries(obs.hosts || {})) states[h] = o.up ? 'up' : LATE_ERRORS.has(o.error) ? 'sensor-late' : 'down';
  const lateHosts = Object.keys(states).filter((h) => states[h] === 'sensor-late');
  return { late: obs.ms > lateMs || lateHosts.length > 0, states, lateHosts };
}
// Cues with the late hosts removed: a late host never triggers an action. Pure.
export function dropLate(c, lateHosts) { const o = { ...c }; for (const h of lateHosts) delete o[h]; return o; }
// Episode validity (rule 3). Pure.
export function validity(stepLog, maxFrac = MAX_LATE_FRAC) {
  const lateSteps = stepLog.filter((s) => s.sensorLate).length, lateFrac = stepLog.length ? lateSteps / stepLog.length : 0;
  return { lateSteps, lateFrac, valid: lateFrac <= maxFrac };
}
// Load gate (rule 4). Pure.
export function loadGate(load1, max = MAX_LOAD1) { return { load1, max, ok: load1 <= max }; }
// Time to detect per host: non-late steps from red's first action on the host to the first cue there. Pure.
export function timeToDetect(stepLog, redLog, target) {
  const first = {};
  for (const r of redLog) { const h = r.host || target; if (['lateral', 'escalation', 'persistence', 'impact'].includes(r.stage) && first[h] == null) first[h] = r.step; }
  const out = {};
  for (const [h, s0] of Object.entries(first)) {
    out[h] = null; let n = 0;
    for (const s of stepLog) {
      if (s.step < s0 || s.sensorLate) continue;
      const c = s.cues?.[h];
      if (c && (c.suspiciousProcess || c.suspiciousConnection)) { out[h] = n; break; }
      n++;
    }
  }
  return out;
}

// Run one episode on an already-up range. Returns { rec, stepLog, obs } (the driver writes the record).
//   opts: { range, seed, arm, pods, router, routerIps, frozen, cooldownSteps, steps, stepMs, keyPath, token,
//           noRed?, collectObs?, loadException? (a test only: recorded in the record), onStep? }
export async function runEpisode(opts) {
  const { range, seed, arm, pods, router, routerIps, frozen, cooldownSteps, steps, stepMs, keyPath, token, noRed = false, collectObs = false, loadException = null } = opts;
  const startLoad = loadGate(os.loadavg()[0]);
  if (!startLoad.ok && !loadException) throw Object.assign(Error(`1-minute load ${startLoad.load1.toFixed(2)} > ${MAX_LOAD1}: episode not started (rule 4)`), { load: true });
  const { Sensors, cues } = await import('./sensors.mjs');
  const green = new Green({ pods, keyPath, token, seed, steps });
  const red = noRed ? null : new Red({ pods, keyPath, seed });
  const med = new Mediator({ range, pods, router, token });
  green.placeKey(fs); red?.placeKey(fs);
  const sensors = new Sensors({ hosts: pods, router: { name: router, ips: routerIps }, token, servicePorts: SERVICE_PORTS });
  const stepLog = [], lastRestore = {}, downUntil = {}, obsLog = [];
  const blueActions = { Restore: [], Remove: [], Analyse: [], Block: [], Allow: [] };
  let peakRoot = 0, streamStats = null;
  try {
    for (let i = 0; i < steps; i++) {
      const t0 = Date.now(), load1 = os.loadavg()[0];
      const downHosts = new Set(Object.entries(downUntil).filter(([, u]) => i < u).map(([h]) => h));
      const footholdOk = !(red?.pl.target && downHosts.has(red.pl.target));
      const tr = Date.now(); if (red) red.step(i, { footholdOk }); const redMs = red ? Date.now() - tr : null; // red stays synchronous
      const obs = await sensors.step();
      // green after the sensor read (Cyber Research, 2026-11-23): red -> sensor -> green; at most one action in flight per
      // workstation, so a read never waits behind the step's own green work
      green.observe({ down: downHosts, blocked: med.blocked }); // harness state for green's failure causes (no probe)
      const launched = green.step(i, red ? red.impacted : {}).length; // launched, not awaited
      const hs = hostStates(obs);
      if (collectObs && !hs.late) obsLog.push(obs); // the frozen lists learn only from fresh steps
      const c = frozen ? dropLate(cues(obs, frozen), hs.lateHosts) : {};
      const targets = frozen ? decideBlue(arm, c, { downHosts, lastRestore, step: i, cooldownSteps }) : [];
      const acts = [];
      const rekeys = [];
      for (const h of targets) {
        const r = med.restore(h); r.step = i; acts.push(r); blueActions.Restore.push(r); lastRestore[h] = i; downUntil[h] = i + 1;
        const k = green.rekey(h, i, fs); if (k) rekeys.push(k); // same step, right after the Restore (green's key)
      }
      if (targets.length) green.observe({ down: [...downHosts, ...targets], blocked: med.blocked }); // restored in this step
      const asRoot = red ? SERVERS.filter((h) => red.held.has(h) && !downHosts.has(h) && ['escalation', 'persistence', 'impact'].includes(red.stage) && red.pl.target === h).length : 0;
      peakRoot = Math.max(peakRoot, asRoot);
      const ms = Date.now() - t0;
      stepLog.push({ step: i, load1, sensorMs: obs.ms, sensorTiming: obs.timing, procErrors: obs.procErrors ?? null, sensorLate: hs.late, hosts: hs.states, redStage: red ? red.stage : null, redMs,
        green: [], greenLaunched: launched, greenDeferred: green.stepSched.deferred, greenDropped: green.stepSched.dropped, greenInFlight: green.inFlight, greenRekey: rekeys, cues: pickCues(c), blue: acts.map((a) => ({ action: a.action, host: a.host, ms: a.ms })), ms, overrun: isOverrun(ms, stepMs) });
      if (opts.onStep) opts.onStep(stepLog.at(-1));
      const spent = Date.now() - t0; if (spent < stepMs) await sleep(stepMs - spent);
    }
  } finally { green.endSchedule(); await green.drain(); streamStats = sensors.stats?.() ?? null; sensors.close(); }
  for (const s of stepLog) s.green = green.log.filter((g) => g.step === s.step); // by launch step, once all are back
  const v = validity(stepLog), loads = stepLog.map((s) => s.load1);
  const rec = { range, seed, arm, at: new Date().toISOString(), stepMs, steps: stepLog.length,
    green: green.tally,
    red: red ? { furthest: red.furthest, impacted: red.impacted, firstImpactStep: red.firstImpactStep, target: red.pl.target, impact: red.pl.impact, breach: red.pl.ws } : null,
    timeToDetectSteps: red ? timeToDetect(stepLog, red.log, red.pl.target) : null,
    overruns: stepLog.filter((s) => s.overrun).length, overrunRate: stepLog.length ? stepLog.filter((s) => s.overrun).length / stepLog.length : 0,
    sensorLate: v, valid: v.valid,
    load1: { atStart: startLoad.load1, max: loads.length ? Math.max(...loads) : null, median: median(loads) }, loadException,
    streamStats, peakRootHosts: peakRoot, blueDurations: durations(blueActions), redLog: red ? red.log : [], greenLog: green.log,
    greenRekey: { count: green.rekeys.length, failed: green.rekeys.filter((k) => !k.ok).length, list: green.rekeys },
    greenSchedule: green.sched, procErrors: procErrorsSummary(stepLog) };
  return { rec, stepLog, obs: obsLog };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The process reader's dropped error lines per host and step, for the record (Cyber Research, 2026-11-23: does it grow
// with red?): per host the total, the maximum in a step and the steps with any; and the per-step counts by host. Pure.
export function procErrorsSummary(stepLog) {
  const byHost = {};
  const perStep = (stepLog || []).map((s) => s.procErrors?.byHost || {});
  for (const b of perStep) for (const [h, n] of Object.entries(b)) { const H = (byHost[h] ||= { total: 0, max: 0, steps: 0 }); H.total += n; H.max = Math.max(H.max, n); if (n) H.steps++; }
  return { byHost, perStep };
}
const pickCues = (c) => Object.fromEntries(Object.entries(c).map(([h, v]) => [h, { suspiciousProcess: v.suspiciousProcess, suspiciousConnection: v.suspiciousConnection }]));
function durations(ba) {
  const out = {};
  for (const k of Object.keys(ba)) { const ms = ba[k].map((a) => a.ms); out[k] = { count: ms.length, medianMs: ms.length ? median(ms) : null }; }
  return out;
}
