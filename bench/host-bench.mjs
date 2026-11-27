// BenchHost host rules for the direct Pi studies (results/phase1b/PROPOSTA-BENCH-HOST.md). Pure functions over an injectable
// `sys`, so thresholds, window and fail-closed paths are tested without the server. Nothing here starts a process,
// touches Docker or reads another unit's data; it only reads statfs, /proc and the cgroup v2 tree.
import { lstatSync, readFileSync, readdirSync, statfsSync } from 'node:fs';
import { loadavg } from 'node:os';
import { isAbsolute, relative } from 'node:path';

export const name = 'BenchHost';
export const startUsedPercent = 70;
export const stopUsedPercent = 75;
export const window = { fromHourUtc: 4, toHourUtc: 8 };
export const attemptTimeoutMs = 90 * 60 * 1000;
export const receiptMaxAgeMs = 15 * 60 * 1000;
export const expectedLimits = { cpuMax: '150000 100000', memoryMax: '4294967296' };
// Active study (Bench Engineer, 26/11): a bioswarm-study-* service or scope in any slice, or a running bench-*
// service of the research bench (every LI, GN, CY and R0 stage runs in one). Not a study: bench-snapshot (hourly
// backup), research-bench (orchestrator), r0 slices, containers and CI (wp_*, ci-governor), which is recorded
// as a covariate. A cgroup folder exists only while its unit has processes.
export const studyUnits = [/^bioswarm-study-[\w.@-]+\.(?:service|scope)$/, /^bench-[\w.@-]+\.service$/];
export const notStudies = ['bench-snapshot.service'];
const maxDepth = 8;

export const realSys = {
  now: () => Date.now(),
  statfs: (p) => statfsSync(p),
  read: (p) => readFileSync(p, 'utf8'),
  list: (p) => readdirSync(p),
  mode: (p) => lstatSync(p).mode,
  load: () => loadavg(),
  env: process.env,
};

const inside = (child, root) => {
  const r = relative(root, child);
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
};

// df's view of a filesystem: used = blocks − free, percent = used / (used + available to unprivileged users).
export function usage(stat) {
  const used = (stat.blocks - stat.bfree) * stat.bsize, avail = stat.bavail * stat.bsize;
  return { sizeBytes: stat.blocks * stat.bsize, usedBytes: used, availBytes: avail, usedPercent: (100 * used) / (used + avail) };
}
// Bytes that can still be written before the root filesystem reaches the stop percentage.
export const rootHeadroom = (u) => Math.floor((stopUsedPercent / 100) * (u.usedBytes + u.availBytes) - u.usedBytes);

// True when [start, start + duration] touches any 04:00–08:00 UTC interval.
export function overlapsWindow(startMs, durationMs = attemptTimeoutMs) {
  const day = 86400000, endMs = startMs + durationMs;
  for (let d = Math.floor(startMs / day) * day - day; d <= endMs; d += day) {
    const from = d + window.fromHourUtc * 3600000, to = d + window.toHourUtc * 3600000;
    if (startMs < to && endMs > from) return true;
  }
  return false;
}

export function ownCgroup(sys) {
  const line = sys.read('/proc/self/cgroup').split('\n').find((l) => l.startsWith('0::'));
  if (!line) throw Error('cgroup v2 path not found');
  return line.slice(3).trim();
}

const cg = (path, file) => '/sys/fs/cgroup' + path + '/' + file;
const num = (s) => Number(String(s).trim());
const keyed = (text) => Object.fromEntries(text.trim().split('\n').map((l) => l.split(' ')).map(([k, v]) => [k, num(v)]));

// Effective limits and pressure of the runner's own cgroup, which also holds Pi, verifier and scripts.
export function cgroupState(sys, path) {
  const opt = (file, parse) => { try { return parse(sys.read(cg(path, file))); } catch { return null; } };
  // Other users' processes are hidden in /proc inside the unit, so concurrency comes from the own cgroup.
  const procs = opt('cgroup.procs', (t) => t.split('\n').filter(Boolean).length);
  const cpu = opt('cpu.stat', keyed);
  return {
    cgroup: path,
    cpuMax: opt('cpu.max', (t) => t.trim()),
    memoryMax: opt('memory.max', (t) => t.trim()),
    memoryCurrent: opt('memory.current', num),
    memoryPeak: opt('memory.peak', num),
    processes: procs,
    pidsCurrent: opt('pids.current', num),
    pidsMax: opt('pids.max', (t) => t.trim()),
    memorySwapMax: opt('memory.swap.max', (t) => t.trim()),
    cpuThrottledUsec: cpu?.throttled_usec ?? null,
    cpuThrottledPeriods: cpu?.nr_throttled ?? null,
  };
}

// Walks the whole cgroup v2 tree; throws when the root cannot be listed, so the preflight fails closed.
export function activeStudies(sys, own) {
  const ownLeaf = own.split('/').filter(Boolean).at(-1);
  const found = [];
  const walk = (dir, depth) => {
    let names;
    try { names = sys.list(dir); } catch (e) { if (depth === 0) throw e; return; }
    for (const n of names) {
      if (!/\.(?:slice|service|scope)$/.test(n)) continue; // control files such as cpu.max are not units
      if (studyUnits.some((r) => r.test(n)) && n !== ownLeaf && !notStudies.includes(n)) found.push(n);
      if (depth < maxDepth) walk(dir + '/' + n, depth + 1);
    }
  };
  walk('/sys/fs/cgroup', 0);
  return found;
}

// The launcher's preflight receipt (contract v1 in bench/BENCH-HOST.md, agreed with Infra on 26/11). Returns the reasons it is not usable.
export function receiptProblems(sys, file, { own, bootId, directory }) {
  if (!file || !isAbsolute(file)) return ['receipt_missing'];
  let r, mode;
  try { mode = sys.mode(file); r = JSON.parse(sys.read(file)); } catch { return ['receipt_unreadable']; }
  const p = [];
  if ((mode & 0o077) !== 0) p.push('receipt_mode');
  if (r.version !== 1 || r.host !== 'benchhost') p.push('receipt_version');
  if (r.pass !== true || r.network?.pass !== true) p.push('receipt_not_passed');
  const age = sys.now() - Date.parse(r.createdAt);
  if (!(age >= 0 && age <= receiptMaxAgeMs)) p.push('receipt_stale');
  if (r.bootId !== bootId) p.push('receipt_boot');
  if (r.cgroup !== own) p.push('receipt_cgroup');
  if (r.limits?.cpuQuotaPercent !== 150 || r.limits?.memoryMaxBytes !== 4294967296) p.push('receipt_limits');
  if (r.activeStudies !== 0) p.push('receipt_active_study');
  if (!Number.isInteger(r.ciActiveJobs) || r.ciActiveJobs < 0) p.push('receipt_ci');
  if (typeof r.dataFs?.path !== 'string' || !isAbsolute(r.dataFs.path) || !inside(directory, r.dataFs.path)) p.push('receipt_data_fs');
  return p.length ? p : { receipt: r };
}

// Everything measured, nothing decided. Never throws: unknown readings are null.
export function snapshot(sys, directory) {
  const tryOr = (f) => { try { return f(); } catch { return null; } };
  const root = tryOr(() => usage(sys.statfs('/')));
  const data = tryOr(() => usage(sys.statfs(directory)));
  const own = tryOr(() => ownCgroup(sys));
  const headroom = root && data ? Math.min(rootHeadroom(root), data.availBytes) : 0;
  return {
    at: new Date(sys.now()).toISOString(),
    host: 'benchhost',
    availableBytes: headroom,
    rootUsedPercent: root ? Number(root.usedPercent.toFixed(3)) : null,
    rootAvailBytes: root?.availBytes ?? null,
    dataAvailBytes: data?.availBytes ?? null,
    loadAverage: tryOr(() => sys.load()),
    providerProcesses: null,
    cgroup: own ? cgroupState(sys, own) : null,
  };
}

// Preflight for every live entry point, before any model call. Throws with the list of reasons (fail closed).
export function requireStart(sys, directory) {
  const problems = [];
  const snap = snapshot(sys, directory);
  let own = null, bootId = null;
  try { own = ownCgroup(sys); } catch { problems.push('cgroup_unknown'); }
  try { bootId = sys.read('/proc/sys/kernel/random/boot_id').trim(); } catch { problems.push('boot_unknown'); }
  if (snap.rootUsedPercent === null) problems.push('root_unknown');
  else if (snap.rootUsedPercent > startUsedPercent) problems.push('root_above_70');
  if (snap.dataAvailBytes === null || snap.availableBytes <= 0) problems.push('no_headroom');
  if (overlapsWindow(sys.now())) problems.push('maintenance_window');
  if (own) {
    const state = snap.cgroup;
    if (state?.cpuMax !== expectedLimits.cpuMax || state?.memoryMax !== expectedLimits.memoryMax) problems.push('cgroup_limits');
    try {
      if (activeStudies(sys, own).length) problems.push('active_study');
    } catch {
      problems.push('studies_unknown');
    }
    const r = receiptProblems(sys, sys.env.BIOSWARM_PREFLIGHT_RECEIPT, { own, bootId, directory });
    if (Array.isArray(r)) problems.push(...r);
    else {
      // The launcher's own preflight, without paths (Bench Engineer, 26/11).
      const { pass, unit, activeStudies: studies, ciActiveJobs } = r.receipt;
      snap.launcher = { pass, unit, activeStudies: studies, ciActiveJobs };
      snap.ciActiveJobsAtStart = ciActiveJobs;
    }
  }
  if (problems.length) throw Error('BenchHost preflight refused: ' + [...new Set(problems)].join(', '));
  return snap;
}

// Sampler view: bytes left before the first stop limit; unreadable means stop.
export function headroom(sys, directory) {
  try {
    return Math.min(rootHeadroom(usage(sys.statfs('/'))), usage(sys.statfs(directory)).availBytes);
  } catch {
    return 0;
  }
}
