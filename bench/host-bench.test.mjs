// BenchHost host adapter: thresholds, maintenance window, launcher receipt and fail-closed paths, on a fake host.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { controlRoute, piBaseEnv } from './direct-1a-core.mjs';
import {
  activeStudies, headroom, overlapsWindow, receiptMaxAgeMs, requireStart, rootHeadroom, snapshot, usage,
} from './host-bench.mjs';

const GB = 1e9;
const at = (iso) => Date.parse(iso);
const own = '/bioswarm.slice/bioswarm-study-a1.service';
const data = '/srv/bench/data';
// Filesystem of `size` bytes with `usedPct` used and nothing reserved, in 4 KiB blocks.
const fs = (size, usedPct) => {
  const blocks = Math.round(size / 4096), used = Math.ceil((blocks * usedPct) / 100);
  return { bsize: 4096, blocks, bfree: blocks - used, bavail: blocks - used };
};

function host(over = {}) {
  const o = {
    now: at('2026-11-26T12:00:00Z'), rootPct: 66, dataAvail: 3 * GB, cpuMax: '150000 100000', memoryMax: '4294967296',
    // cgroup v2 tree: folder -> children. Default: BenchHost at rest with this study running.
    tree: {
      '/sys/fs/cgroup': ['cgroup.procs', 'cpu.max', 'bioswarm.slice', 'system.slice', 'user.slice', 'r0.slice', 'r0-range.slice'],
      '/sys/fs/cgroup/bioswarm.slice': ['bioswarm-study-a1.service', 'memory.max'],
      '/sys/fs/cgroup/bioswarm.slice/bioswarm-study-a1.service': ['cgroup.procs', 'cpu.max'],
      '/sys/fs/cgroup/system.slice': ['research-bench.service', 'ci-governor.service', 'docker-ab12.scope', 'ci-docker-hygiene.service'],
      '/sys/fs/cgroup/user.slice': ['user-1000.slice'],
      '/sys/fs/cgroup/user.slice/user-1000.slice': ['user@1000.service', 'session-1.scope'],
      '/sys/fs/cgroup/user.slice/user-1000.slice/user@1000.service': ['app.slice', 'init.scope'],
      '/sys/fs/cgroup/user.slice/user-1000.slice/user@1000.service/app.slice': ['bench-snapshot.service'],
    },
    receipt: {}, receiptMode: 0o100600, cgroupLine: '0::' + own, bootId: 'boot-1', ...over,
  };
  const receipt = {
    version: 1, host: 'benchhost', createdAt: new Date(o.now - 60000).toISOString(), bootId: 'boot-1', unit: 'bioswarm-study-a1.service',
    cgroup: own, limits: { cpuQuotaPercent: 150, memoryMaxBytes: 4294967296 }, dataFs: { path: data, fsType: 'ext4', sizeBytes: 4278190080 },
    activeStudies: 0, ciActiveJobs: 2, network: { pass: true }, pass: true, ...o.receipt,
  };
  const files = {
    '/proc/self/cgroup': o.cgroupLine + '\n', '/proc/sys/kernel/random/boot_id': o.bootId + '\n',
    ['/sys/fs/cgroup' + own + '/cpu.max']: o.cpuMax + '\n', ['/sys/fs/cgroup' + own + '/memory.max']: o.memoryMax + '\n',
    ['/sys/fs/cgroup' + own + '/memory.current']: '1000\n', ['/sys/fs/cgroup' + own + '/memory.peak']: '2000\n',
    ['/sys/fs/cgroup' + own + '/cgroup.procs']: '10\n11\n12\n', ['/sys/fs/cgroup' + own + '/pids.current']: '7\n',
    ['/sys/fs/cgroup' + own + '/pids.max']: '512\n', ['/sys/fs/cgroup' + own + '/memory.swap.max']: '0\n',
    ['/sys/fs/cgroup' + own + '/cpu.stat']: 'usage_usec 5\nnr_throttled 3\nthrottled_usec 700\n',
    '/run/receipt.json': JSON.stringify(receipt),
  };
  return {
    now: () => o.now,
    statfs: (p) => {
      if (o.statfsFails) throw Error('EIO');
      return p === '/' ? fs(206.9 * GB, o.rootPct) : { bsize: 4096, blocks: 2 ** 20, bfree: o.dataAvail / 4096, bavail: o.dataAvail / 4096 };
    },
    read: (p) => { if (!(p in files)) throw Error('ENOENT ' + p); return files[p]; },
    list: (p) => { const t = { ...o.tree, ...o.extraTree }; if (o.cgroupRootFails && p === '/sys/fs/cgroup') throw Error('EACCES'); if (p in t) return t[p]; throw Error('ENOENT'); },
    mode: () => o.receiptMode,
    load: () => [0.5, 0.4, 0.3],
    env: { BIOSWARM_PREFLIGHT_RECEIPT: '/run/receipt.json', ...o.env },
  };
}
const dir = join(data, 'work');
const refused = (sys, reason) => assert.throws(() => requireStart(sys, dir), new RegExp('refused: .*\\b' + reason + '\\b'));

test('a healthy BenchHost passes and records CI, load and the cgroup’s effective limits', () => {
  const snap = requireStart(host(), dir);
  assert.equal(snap.host, 'benchhost');
  assert.equal(snap.ciActiveJobsAtStart, 2);
  assert.deepEqual(snap.launcher, { pass: true, unit: 'bioswarm-study-a1.service', activeStudies: 0, ciActiveJobs: 2 });
  assert.doesNotMatch(JSON.stringify(snap.launcher), /\//, 'no paths');
  assert.deepEqual(snap.loadAverage, [0.5, 0.4, 0.3]);
  assert.deepEqual(snap.cgroup, {
    cgroup: own, cpuMax: '150000 100000', memoryMax: '4294967296', memoryCurrent: 1000, memoryPeak: 2000,
    processes: 3, pidsCurrent: 7, pidsMax: '512', memorySwapMax: '0', cpuThrottledUsec: 700, cpuThrottledPeriods: 3,
  });
  assert.ok(Math.abs(snap.rootUsedPercent - 66) < 0.01);
  assert.equal(snap.availableBytes, 3 * GB, 'the 4 GiB data area binds before the root limit');
});

test('root filesystem: start at most 70%, stop at 75%', () => {
  assert.ok(requireStart(host({ rootPct: 70 }), dir));
  refused(host({ rootPct: 70.01 }), 'root_above_70');
  const u = (pct) => usage(fs(206.9 * GB, pct));
  assert.ok(rootHeadroom(u(74.9)) > 0);
  assert.ok(rootHeadroom(u(75)) <= 0);
  assert.ok(rootHeadroom(u(80)) < 0);
  assert.equal(headroom(host({ rootPct: 75, dataAvail: 3 * GB }), dir) < 1, true, 'sampler pauses at 75%');
  assert.equal(headroom(host({ rootPct: 60, dataAvail: 0 }), dir), 0, 'sampler pauses at the data cap');
  assert.equal(headroom(host({ statfsFails: true }), dir), 0, 'unreadable disk pauses');
  refused(host({ dataAvail: 0 }), 'no_headroom');
});

test('the 04–08 UTC window is refused including the 90 min timeout', () => {
  assert.equal(overlapsWindow(at('2026-11-26T02:30:00Z')), false, 'ends exactly at 04:00');
  assert.equal(overlapsWindow(at('2026-11-26T02:30:01Z')), true);
  assert.equal(overlapsWindow(at('2026-11-26T05:00:00Z')), true);
  assert.equal(overlapsWindow(at('2026-11-26T07:59:59Z')), true);
  assert.equal(overlapsWindow(at('2026-11-26T08:00:00Z')), false);
  assert.equal(overlapsWindow(at('2026-11-26T23:30:00Z')), false, 'crossing midnight');
  assert.equal(overlapsWindow(at('2026-11-27T03:00:00Z')), true);
  refused(host({ now: at('2026-11-26T03:00:00Z') }), 'maintenance_window');
  assert.ok(requireStart(host({ now: at('2026-11-26T02:29:00Z') }), dir));
});

test('the launcher receipt must be current, private, passed and bound to this boot and cgroup', () => {
  refused(host({ env: { BIOSWARM_PREFLIGHT_RECEIPT: '' } }), 'receipt_missing');
  refused(host({ env: { BIOSWARM_PREFLIGHT_RECEIPT: '/run/other.json' } }), 'receipt_unreadable');
  refused(host({ receiptMode: 0o100644 }), 'receipt_mode');
  refused(host({ receipt: { createdAt: new Date(at('2026-11-26T12:00:00Z') - receiptMaxAgeMs - 1).toISOString() } }), 'receipt_stale');
  refused(host({ receipt: { createdAt: '2026-11-26T12:05:00Z' } }), 'receipt_stale');
  refused(host({ receipt: { bootId: 'boot-0' } }), 'receipt_boot');
  refused(host({ receipt: { cgroup: '/bioswarm.slice/bioswarm-study-old.service' } }), 'receipt_cgroup');
  refused(host({ receipt: { pass: false } }), 'receipt_not_passed');
  refused(host({ receipt: { network: { pass: false } } }), 'receipt_not_passed');
  refused(host({ receipt: { limits: { cpuQuotaPercent: 200, memoryMaxBytes: 4294967296 } } }), 'receipt_limits');
  refused(host({ receipt: { activeStudies: 1 } }), 'receipt_active_study');
  refused(host({ receipt: { ciActiveJobs: null } }), 'receipt_ci');
  refused(host({ receipt: { dataFs: { path: '/srv/other' } } }), 'receipt_data_fs');
  refused(host({ receipt: { version: 2 } }), 'receipt_version');
});

test('effective cgroup limits are read, not trusted from the receipt', () => {
  refused(host({ cpuMax: 'max 100000' }), 'cgroup_limits');
  refused(host({ memoryMax: 'max' }), 'cgroup_limits');
  refused(host({ cgroupLine: '' }), 'cgroup_unknown');
});

test('active studies: other bioswarm-study units and running bench-* stages block; bench background does not', () => {
  assert.deepEqual(activeStudies(host(), own), [], 'snapshot backup, orchestrator, CI, r0 slices and own unit');
  const app = '/sys/fs/cgroup/user.slice/user-1000.slice/user@1000.service/app.slice';
  const extra = (t) => host({ extraTree: t });
  assert.deepEqual(activeStudies(extra({ [app]: ['bench-snapshot.service', 'bench-li44-run.service'] }), own), ['bench-li44-run.service']);
  assert.deepEqual(activeStudies(extra({ [app]: ['bench-r0-run.service'] }), own), ['bench-r0-run.service']);
  assert.deepEqual(activeStudies(extra({ '/sys/fs/cgroup/bioswarm.slice': ['bioswarm-study-a1.service', 'bioswarm-study-b2.service'] }), own), ['bioswarm-study-b2.service']);
  assert.deepEqual(activeStudies(extra({ '/sys/fs/cgroup/system.slice': ['bioswarm-study-old.scope'] }), own), ['bioswarm-study-old.scope']);
  refused(extra({ [app]: ['bench-gn12-review.service'] }), 'active_study');
  assert.ok(requireStart(extra({ '/sys/fs/cgroup/system.slice': ['bench-snapshot.timer', 'platform-cleanup.timer', 'docker-wp1.scope'] }), dir));
  refused(host({ cgroupRootFails: true }), 'studies_unknown');
});

test('unknown readings fail closed and snapshots never throw', () => {
  refused(host({ statfsFails: true }), 'root_unknown');
  refused(host({ bootId: undefined, receipt: { bootId: undefined } }), 'receipt_boot');
  const snap = snapshot(host({ statfsFails: true }), dir);
  assert.equal(snap.availableBytes, 0);
  assert.equal(snap.rootUsedPercent, null);
});

test('host selection: BenchHost pauses at zero headroom; an unknown host is rejected', () => {
  const probe = (host) =>
    spawnSync(process.execPath, ['--no-warnings', '--input-type=module', '-e',
      "const h = await import('./bench/direct-host-health.mjs'); let start = 'ok'; try { h.requireStartSpace('/') } catch (e) { start = e.message } console.log(JSON.stringify({ name: h.hostName, pause: h.pauseBytes, start }))"],
    { cwd: join(import.meta.dirname, '..'), env: { PATH: process.env.PATH, BIOSWARM_STUDY_HOST: host }, encoding: 'utf8' });
  const m = JSON.parse(probe('benchhost').stdout);
  assert.equal(m.name, 'BenchHost');
  assert.equal(m.pause, 1);
  assert.match(m.start, /BenchHost preflight refused/, 'outside BenchHost, without receipt or cgroup, it refuses');
  assert.notEqual(probe('cloud').status, 0);
});

test('Control route: Mac loopback tunnel; on BenchHost loopback or the Docker bridge, never public', () => {
  assert.equal(controlRoute(undefined, 'mac').href, 'http://127.0.0.1:18787/');
  assert.throws(() => controlRoute('http://172.26.0.2:8787', 'mac'), /loopback tunnel/);
  assert.throws(() => controlRoute(undefined, 'benchhost'), /Set BIOSWARM_CONTROL_URL/);
  assert.equal(controlRoute('http://172.26.0.2:8787', 'benchhost').host, '172.26.0.2:8787');
  assert.equal(controlRoute('http://127.0.0.1:8787', 'benchhost').host, '127.0.0.1:8787');
  for (const bad of ['http://203.0.113.7:8787', 'http://172.32.0.2:8787', 'https://172.26.0.2:8787', 'http://u:p@172.26.0.2:8787', 'http://control:8787'])
    assert.throws(() => controlRoute(bad, 'benchhost'), /Docker bridge/, bad);
});

test('Pi keeps the approved egress proxy and nothing else from the environment', () => {
  const env = piBaseEnv({ PATH: '/bin', HTTPS_PROXY: 'http://127.0.0.1:3128', no_proxy: '172.26.0.2', OPENAI_API_KEY: 'k', BIOSWARM_API_KEY: 'c', AWS_SECRET: 's' }, '/home/op');
  assert.deepEqual(env, { HOME: '/home/op', PATH: '/bin', LANG: 'C.UTF-8', PI_OFFLINE: '1', HTTPS_PROXY: 'http://127.0.0.1:3128', no_proxy: '172.26.0.2' });
});
