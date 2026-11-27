// Worker-module isolation on the study host (BenchHost launcher, Shared/bioswarm/phase1b/BENCHHOST-PROVISIONAMENTO.md).
// The runner stays the operator (svc-op). Agent-written modules run through the tool launcher as svc-wk: another
// UID, no network, same cgroup. This module sets the folder modes the tool user needs and takes the receipt.
import { spawnSync } from 'node:child_process';
import { chmodSync, readFileSync } from 'node:fs';

// Group traversal only for the attempt; group read for the task folder (setgid keeps the group); nothing else.
export function prepareModes(attemptDir, taskDir) {
  chmodSync(attemptDir, 0o710);
  chmodSync(taskDir, 0o2750);
}

const probe = "const s=require('net').connect({host:'1.1.1.1',port:443,timeout:3000});s.on('connect',()=>process.exit(0));s.on('error',()=>process.exit(7));s.on('timeout',()=>process.exit(7))";
const own = (read) => {
  try {
    return read().trim();
  } catch {
    return null; // no cgroup v2 view: the receipt fails
  }
};
// Booleans only: no UID numbers, cgroup paths or addresses leave the receipt.
export function isolationReceipt(tool, { ownCgroup = () => readFileSync('/proc/self/cgroup', 'utf8'), timeoutMs = 10000 } = {}) {
  const run = (...cmd) => spawnSync(tool, ['--', ...cmd], { encoding: 'utf8', timeout: timeoutMs, env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' } });
  const uid = run('/usr/bin/id', '-u');
  const cgroup = run('/bin/cat', '/proc/self/cgroup');
  const net = run(process.execPath, '-e', probe);
  const receipt = {
    separateUser: uid.status === 0 && /^\d+$/.test(uid.stdout.trim()) && Number(uid.stdout.trim()) !== process.getuid(),
    sameCgroup: cgroup.status === 0 && cgroup.stdout.trim() !== '' && cgroup.stdout.trim() === own(ownCgroup),
    networkDenied: !net.error && net.status !== 0 && net.status !== null,
  };
  return { ...receipt, pass: Object.values(receipt).every(Boolean) };
}
