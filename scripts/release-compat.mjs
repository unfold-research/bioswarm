// The bench endpoint runs a forced command for just the two version/revision fields.
// Trust its SSH host key provisioned by the operator. No Docker socket in CI.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir = mkdtempSync(join(tmpdir(), 'bioswarm-release-'));
try {
  for (const [name, env] of [
    ['key', 'BENCH_SSH_KEY'],
    ['known_hosts', 'BENCH_KNOWN_HOSTS'],
  ]) {
    if (!process.env[env]) throw Error('Missing release credential ' + env);
    writeFileSync(join(dir, name), process.env[env].trim() + '\n', { mode: 0o600 });
  }
  const target = process.env.BENCH_SSH_TARGET,
    rev = process.env.CI_COMMIT_SHA;
  if (!/^[a-z0-9_]+@[a-z0-9.-]+$/i.test(target ?? '') || !/^([0-9a-f]{40})$/.test(rev ?? ''))
    throw Error('Invalid bench target or revision');
  const latest = await fetch('https://api.github.com/repos/nightly-labs/openbot/releases/latest');
  if (!latest.ok) throw Error('OpenBot release lookup failed');
  const versions = new Set([
    readFileSync('docker/OPENBOT_VERSION', 'utf8').trim(),
    (await latest.json()).tag_name.replace(/^v/, ''),
  ]);
  for (const version of versions) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Invalid OpenBot version');
    const receipt = execFileSync(
      'ssh',
      [
        '-o',
        'BatchMode=yes',
        '-o',
        'IdentitiesOnly=yes',
        '-o',
        'StrictHostKeyChecking=yes',
        '-o',
        'UserKnownHostsFile=' + join(dir, 'known_hosts'),
        '-i',
        join(dir, 'key'),
        target,
        'smoke',
        version,
        rev,
      ],
      { encoding: 'utf8' },
    );
    const row = JSON.parse(receipt);
    if (!row.pass || row.treatment.connectorRevision !== rev || row.treatment.hostVersion !== version)
      throw Error('Failed or mismatched host receipt');
    writeFileSync(join(dir, 'openbot-' + version + '.json'), receipt, { mode: 0o600 });
  }
  execFileSync('node', ['scripts/compat.mjs', '--release'], {
    stdio: 'inherit',
    env: { ...process.env, BIOSWARM_RECEIPTS: dir },
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
