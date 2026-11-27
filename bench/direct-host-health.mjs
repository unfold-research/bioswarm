// Shared instrumentation for 1a/1b. No process arguments or provider error text leave the host.
// Host adapter: BIOSWARM_STUDY_HOST=benchhost applies results/phase1b/PROPOSTA-BENCH-HOST.md (bench/host-bench.mjs);
// 'mac' (default only on macOS) keeps the 25/11 rule of 20 GB to start and a pause below 10 GB. On any other
// platform without an explicit host, every live preflight refuses (fail closed).
import { execFileSync } from 'node:child_process';
import { statfsSync } from 'node:fs';
import { loadavg } from 'node:os';
import * as benchhost from './host-bench.mjs';

export const studyHost = process.env.BIOSWARM_STUDY_HOST || (process.platform === 'darwin' ? 'mac' : null);
if (studyHost && !['mac', 'benchhost'].includes(studyHost)) throw Error('BIOSWARM_STUDY_HOST must be mac or benchhost');
export const hostName = studyHost === 'benchhost' ? 'BenchHost' : 'the study Mac';
const onBenchHost = studyHost === 'benchhost';

export const startBytes = 20_000_000_000;
// On BenchHost availableBytes is the headroom before the first stop limit, so a sampler pauses when it reaches zero.
export const pauseBytes = onBenchHost ? 1 : 10_000_000_000;
export function availableBytes(directory) {
  if (onBenchHost) return benchhost.headroom(benchhost.realSys, directory);
  const stat = statfsSync(directory);
  return stat.bavail * stat.bsize;
}
function providerProcesses() {
  try {
    const commands = execFileSync('ps', ['-A', '-o', 'comm='], { encoding: 'utf8' });
    return commands.split('\n').filter((s) => /(?:^|\/)(?:claude|codex|pi|opencode)$/.test(s.trim())).length;
  } catch {
    return null;
  }
}
export function hostSnapshot(directory) {
  // Inside the BenchHost unit other users' processes are hidden: the count comes from the own cgroup instead.
  if (onBenchHost) return { ...benchhost.snapshot(benchhost.realSys, directory), providerProcesses: null };
  return { at: new Date().toISOString(), availableBytes: availableBytes(directory),
    loadAverage: loadavg(), providerProcesses: providerProcesses() };
}
export function requireStartSpace(directory) {
  if (!studyHost) throw Error('Set BIOSWARM_STUDY_HOST (mac or benchhost) before a live run');
  if (onBenchHost) return { ...benchhost.requireStart(benchhost.realSys, directory), providerProcesses: null };
  const snap = hostSnapshot(directory);
  if (snap.availableBytes < startBytes) throw Error('Disk preflight below 20 GB: ' + snap.availableBytes + ' bytes available');
  return snap;
}
// Feed every raw Pi event to this local counter. Persist only counters; avoid counting a retried 429 twice.
export function countProviderEvent(counts, event) {
  if (event.type === 'auto_retry_start') counts.retries++;
  if (event.type !== 'message_end' || event.message?.role !== 'assistant' || event.message.stopReason !== 'error') return;
  const message = event.message;
  if ([message.status, message.statusCode, message.error?.status].includes(429) ||
      /\b429\b/.test(String(message.errorMessage ?? ''))) counts.http429++;
}
