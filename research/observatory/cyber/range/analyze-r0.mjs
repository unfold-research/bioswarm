// R0 registered analysis (M3; tasks/R0-PILOT-PREREG.md "Pilot gate" and "Reported"). Reads the episode records written
// by drive.mjs and prints the pilot gate and the described arm means as JSON on stdout (the bench's analyse stage
// redirects it to results/r0-pilot/analysis.json). It changes no registered verdict; it reports whether each gate item
// holds from the data. Pure of Docker; run as `node observatory/cyber/range/analyze-r0.mjs` from the repo root.
// Gate items as in the prereg, made strict after Cyber Research's review of PR #164: a missing field or a missing
// episode fails its item, it never passes by default.
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.env.R0_OUT || 'results/r0-pilot';
const EP = path.join(DIR, 'episodes');
const load = () => { try { return fs.readdirSync(EP).filter((f) => /-s\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(EP, f), 'utf8'))); } catch { return []; } };
export const STAGES = ['none', 'discovery', 'lateral', 'escalation', 'persistence', 'impact'];
export const PILOT = { arms: ['sleep', 'react', 'disinfect-cd10'], seeds: [76001, 76002, 76003], repeats: 3, steps: 300, maxHarnessFailures: 1, maxOverrunRate: 0.02 };
const anyImpact = (e) => Object.values(e.red?.impacted || {}).some(Boolean);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

// Item 1, per episode: both canaries tested at least one target and reached none, the run day's positive control was
// detected, and the teardown left nothing. A record with no containment block fails.
export function containmentOf(e) {
  const c = e.containment;
  if (!c) return { ok: false, why: 'no containment record' };
  const canaryOk = (x) => x && x.targets > 0 && x.reached === 0;
  if (!canaryOk(c.canaryStart)) return { ok: false, why: 'start canary missing, tested nothing, or reached a target' };
  if (!canaryOk(c.canaryEnd)) return { ok: false, why: 'end canary missing, tested nothing, or reached a target' };
  if (c.control?.detected !== true) return { ok: false, why: 'positive control of the day not recorded as detected' };
  if (!(c.leftovers?.checked === true && c.leftovers.containers === 0 && c.leftovers.networks === 0)) return { ok: false, why: 'leftover check missing or objects left' };
  return { ok: true };
}

export function gate(eps, controls = [], P = PILOT) {
  const pilot = eps.filter((e) => e.kind === 'pilot');
  const expectedNames = []; for (const arm of P.arms) for (const seed of P.seeds) for (let rep = 1; rep <= P.repeats; rep++) expectedNames.push(`${arm}|${seed}|${rep}`);
  const byName = new Map(pilot.map((e) => [`${e.arm}|${e.seed}|${e.repeat}`, e]));

  // 1 containment: every recorded episode (baseline, timing, pilot) and every run day's control
  // a recorded harness failure carries no containment block: containment errors never become harness failures (the
  // driver stops on them with STOP), so those records are left out here and counted in completion instead
  const failed1 = eps.filter((e) => !e.harnessFailure).map((e) => ({ e, c: containmentOf(e) })).filter((x) => !x.c.ok).map((x) => ({ episode: `${x.e.kind}|${x.e.arm ?? ''}|${x.e.seed}|${x.e.repeat ?? ''}`, why: x.c.why }));
  const controlsOk = controls.length > 0 && controls.every((c) => c.detected === true);
  const containment = { pass: eps.length > 0 && failed1.length === 0 && controlsOk, episodes: eps.length, failures: failed1, controlDays: controls.length, controlsDetected: controlsOk };

  // 2 completion: all 27 pilot episodes recorded; a harness failure (or an episode short of 300 steps) is excluded with
  // its cause, at most 1 of 27; every other pilot episode reached exactly 300 steps and is valid (sensor-late rule).
  const missing = expectedNames.filter((n) => !byName.has(n));
  const harness = pilot.filter((e) => e.harnessFailure || e.steps !== P.steps).map((e) => ({ episode: `${e.arm}|${e.seed}|${e.repeat}`, steps: e.steps ?? null, cause: e.harnessFailure?.cause || `reached ${e.steps ?? 'no'} steps of ${P.steps}` }));
  const excluded = [...missing.map((n) => ({ episode: n, steps: null, cause: 'episode record missing' })), ...harness];
  const good = pilot.filter((e) => !e.harnessFailure && e.steps === P.steps && e.valid === true);
  const invalidOther = pilot.filter((e) => !e.harnessFailure && e.steps === P.steps && e.valid !== true).length;
  // a missing record has no recorded cause: it fails item 2 by itself (Cyber Research, 2026-11-23)
  const completion = { pass: missing.length === 0 && excluded.length <= P.maxHarnessFailures && invalidOther === 0 && excluded.every((x) => x.cause), missing: missing.length, expected: expectedNames.length, recorded: pilot.length, validComplete: good.length, excluded, invalidNotExcluded: invalidOther };

  // 3 red works: impact in >= 8 of the 9 expected sleep slots (fixed denominator, Cyber Research 2026-11-23): a slot with
  // a harness failure or no valid complete record counts as "no impact", so a failure never shrinks the sample
  const sleepSlots = expectedNames.filter((n) => n.startsWith('sleep|'));
  const goodByName = new Map(good.map((e) => [`${e.arm}|${e.seed}|${e.repeat}`, e]));
  const redImpacts = sleepSlots.filter((n) => goodByName.get(n)?.red?.furthest === 'impact').length;
  const redWorks = { pass: redImpacts >= 8, impacts: redImpacts, of: sleepSlots.length, slotsWithoutValidRecord: sleepSlots.filter((n) => !goodByName.has(n)).length };

  // 4 repeatability: cells keyed by (arm, seed) only, always 9; a cell missing a valid repeat (a harness failure in any
  // repeat) is a failed cell, so the rule stays "at least 8 of 9". Same furthest stage, same impact (yes
  // or no) and green successes within +/-5% of their mean; the same red target and impact kind are part of the test.
  const cells = {};
  for (const e of good) (cells[`${e.arm}|${e.seed}`] ||= []).push(e);
  const cellOut = [];
  for (const arm of P.arms) for (const seed of P.seeds) {
    const reps = cells[`${arm}|${seed}`] || [];
    const same = (f) => new Set(reps.map(f)).size === 1;
    const succ = reps.map((e) => e.green?.ok), mean = succ.every(isNum) ? succ.reduce((a, b) => a + b, 0) / succ.length : NaN;
    const greenOk = succ.length > 0 && succ.every(isNum) && (mean === 0 ? succ.every((x) => x === 0) : succ.every((x) => Math.abs(x - mean) <= 0.05 * mean));
    const r = { cell: `${arm}|${seed}`, repeats: reps.length, sameStage: same((e) => e.red?.furthest), sameImpact: same(anyImpact), sameTarget: same((e) => e.red?.target ?? null), sameImpactKind: same((e) => e.red?.impact ?? null), greenOk };
    r.ok = reps.length === P.repeats && r.sameStage && r.sameImpact && r.sameTarget && r.sameImpactKind && r.greenOk;
    cellOut.push(r);
  }
  const cellsOk = cellOut.filter((c) => c.ok).length;
  const repeatability = { pass: cellOut.length === 9 && cellsOk >= 8, cellsOk, cellsTotal: cellOut.length, cells: cellOut };

  // 5 timing: every pilot episode's overrun rate present and <= 2%; a missing rate fails
  const rates = pilot.filter((e) => !e.harnessFailure).map((e) => e.overrunRate);
  const missingRate = rates.filter((x) => !isNum(x)).length;
  const timing = { pass: rates.length > 0 && missingRate === 0 && rates.every((x) => x <= P.maxOverrunRate), episodes: rates.length, missingRate, maxRate: rates.filter(isNum).length ? Math.max(...rates.filter(isNum)) : null, exclusionThresholdP99: pct(rates.filter(isNum), 0.99) };

  return { containment, completion, redWorks, repeatability, timing };
}
// Green's schedule per arm (Cyber Research, 2026-11-23): planned, executed, deferred and dropped actions, summed over
// the episodes of each pilot arm, and the baseline as its own group; the rate is (deferred + dropped) / planned. Pure.
const groupOf = (e) => (e.kind === 'pilot' ? e.arm : e.kind || 'other');
export function scheduleByGroup(eps) {
  const out = {};
  for (const e of eps) {
    const s = e.greenSchedule; if (!s) continue;
    const g = (out[groupOf(e)] ||= { episodes: 0, planned: 0, executed: 0, deferred: 0, dropped: 0 });
    g.episodes++; for (const k of ['planned', 'executed', 'deferred', 'dropped']) g[k] += s[k] || 0;
  }
  for (const g of Object.values(out)) g.deferredDroppedRate = g.planned ? (g.deferred + g.dropped) / g.planned : null;
  return out;
}
// The process reader's dropped error lines per arm and host (does it grow with red?): total, mean per episode, the
// largest count in one step. A limit of the instrument: the files sshd sessions are invisible to the sensor, and a red
// shell under one appears with parent "?". Pure.
export function procErrorsByGroup(eps) {
  const out = {};
  for (const e of eps) {
    const b = e.procErrors?.byHost; if (!b) continue;
    const g = (out[groupOf(e)] ||= { episodes: 0, hosts: {} }); g.episodes++;
    for (const [h, v] of Object.entries(b)) { const H = (g.hosts[h] ||= { total: 0, maxInStep: 0 }); H.total += v.total || 0; H.maxInStep = Math.max(H.maxInStep, v.max || 0); }
  }
  for (const g of Object.values(out)) for (const H of Object.values(g.hosts)) H.meanPerEpisode = H.total / g.episodes;
  return out;
}
// green's key re-placements after a Restore (Cyber Research, 2026-11-23): totals and every failure with its episode. Pure.
export function rekeySummary(eps) {
  return { count: eps.reduce((n, e) => n + (e.greenRekey?.count || 0), 0), failed: eps.reduce((n, e) => n + (e.greenRekey?.failed || 0), 0),
    failures: eps.flatMap((e) => (e.greenRekey?.list || []).filter((k) => !k.ok).map((k) => ({ arm: e.arm, seed: e.seed, repeat: e.repeat ?? null, ...k }))) };
}
const pct = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : null; };

function main() {
  const eps = load();
  const readJsonl = (f) => { try { return fs.readFileSync(path.join(DIR, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
  const controls = readJsonl('controls.jsonl');
  const g = eps.length ? gate(eps, controls) : null;
  // the pilot runs on the v3 lists (baseline redone, 2026-11-23); the v1 and v2 lists are archived with the first
  // baseline in archive-baseline-v2/ (older layouts kept them at the top level)
  const readFrozen = (...fs_) => { for (const f of fs_) { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch {} } return null; };
  const frozenV1 = readFrozen('archive-baseline-v2/frozen.json', 'frozen.json'), frozenV2 = readFrozen('archive-baseline-v2/frozen-v2.json', 'frozen-v2.json');
  const frozen = readFrozen('frozen-v3.json') || frozenV2 || frozenV1, redo = readFrozen('baseline-redo-v3.json');
  const timing = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'timing.json'), 'utf8')); } catch { return null; } })();
  const deviations = readJsonl('deviations.jsonl');
  const gatePass = g ? Object.values(g).every((x) => x.pass === true) : false;
  const out = {
    study: 'r0-pilot', at: new Date().toISOString(), episodes: eps.length,
    greenRekey: rekeySummary(eps),
    deviations: { count: deviations.length, sensorLateReruns: deviations.filter((d) => /sensor-late/.test(d.kind)).length, harnessFailures: deviations.filter((d) => /harness failure/.test(d.kind)).length, list: deviations },
    sensorLate: { maxLateFrac: eps.length ? Math.max(...eps.map((e) => e.sensorLate?.lateFrac ?? 0)) : null },
    load1: { maxAtStart: eps.length ? Math.max(...eps.map((e) => e.load1?.atStart ?? 0)) : null, loadExceptions: eps.filter((e) => e.loadException).length },
    controls, frozenSha256: frozen?.sha256 || null, frozenVersion: frozen?.version || (frozen ? 1 : null), frozenV1Sha256: frozenV1?.sha256 || null, frozenV2Sha256: frozenV2?.sha256 || null,
    refreeze: frozenV2?.refreeze ? { droppedByHost: frozenV2.refreeze.droppedByHost, v1Sha256: frozenV2.refreeze.v1Sha256, v2Sha256: frozenV2.refreeze.v2Sha256 } : null,
    baselineRedo: redo ? { state: redo.state, archive: redo.archive, archivedAt: redo.archivedAt ?? null, files: redo.plan?.length ?? null } : null,
    greenSchedule: scheduleByGroup(eps), procErrors: procErrorsByGroup(eps), excludeSha256: frozen?.excludeSha256 || null, timing,
    gate: g, gatePass,
    hypotheses: [{ id: 'R0-PILOT', registered: gatePass ? 'supported' : 'pending', verdict: null, note: 'Instrument pilot: the gate is descriptive; the screen is a separate preregistration.' }],
  };
  console.log(JSON.stringify(out, null, 1));
}
if (import.meta.url === `file://${process.argv[1]}`) main();
