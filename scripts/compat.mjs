// Probe the installed Pi package in an isolated workspace. A real OpenBot smoke receipt comes
// from the release bench. Missing, failed or stale receipts can never produce a pass.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'packages/connector-pi/package.json')));
const pi = '@earendil-works/pi-coding-agent';
const mode = process.argv[2] ?? '--report';
if (!['--report', '--release', '--pi'].includes(mode)) throw Error('Use --report, --pi or --release');
const npm = (args, cwd) =>
  execFileSync('npm', args, { cwd, encoding: 'utf8', maxBuffer: 8388608, stdio: ['ignore', 'pipe', 'pipe'] });
const latestPi = npm(['view', pi + '@latest', 'version'], root).trim();
const hostRes = await fetch('https://api.github.com/repos/nightly-labs/openbot/releases/latest');
if (!hostRes.ok) throw Error('OpenBot release lookup returned ' + hostRes.status);
const latestOpenBot = (await hostRes.json()).tag_name.replace(/^v/, '');
const pinOpenBot = readFileSync(join(root, 'docker/OPENBOT_VERSION'), 'utf8').trim();
const specs = { Pi: [pkg.devDependencies[pi], latestPi], OpenBot: [pinOpenBot, latestOpenBot] };
const revision =
  process.env.CI_COMMIT_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const rows = [],
  computed = new Map();
let failed = false;
for (const [host, versions] of Object.entries(specs)) {
  for (const [i, version] of versions.entries()) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Invalid upstream version');
    const key = host + '@' + version;
    if (!computed.has(key)) {
      let outcome = 'pending real Docker smoke';
      if (host === 'Pi') {
        const dir = mkdtempSync(join(tmpdir(), 'bioswarm-compat-'));
        try {
          for (const f of ['package-lock.json', 'package.json', 'packages'])
            cpSync(join(root, f), join(dir, f), {
              recursive: true,
              filter: (p) => !p.split('/').includes('node_modules'),
            });
          if (i === 0) npm(['ci', '--ignore-scripts', '--no-audit', '--no-fund'], dir);
          else
            npm(
              [
                'install',
                '--save-exact',
                '--ignore-scripts',
                '--no-audit',
                '--no-fund',
                '-w',
                'packages/connector-pi',
                pi + '@' + version,
              ],
              dir,
            );
          const installed = npm(['ls', pi, '--json', '-w', 'packages/connector-pi'], dir);
          if (!installed.includes('"version": "' + version + '"')) throw Error('Installed version mismatch');
          npm(['test', '-w', 'packages/connector-pi'], dir);
          outcome = 'passed Pi session and policy suite';
        } catch (err) {
          console.error('Pi ' + version + ' failed: ' + (err.stderr?.toString() || err.message).slice(-900));
          outcome = 'failed Pi suite';
          failed = true;
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      } else if (process.env.BIOSWARM_RECEIPTS) {
        const p = join(process.env.BIOSWARM_RECEIPTS, 'openbot-' + version + '.json');
        if (existsSync(p)) {
          const r = JSON.parse(readFileSync(p));
          if (
            r.pass === true &&
            r.treatment?.hostVersion === version &&
            r.treatment.connectorRevision === revision &&
            r.writers === 3 &&
            r.crossRead === true &&
            r.continued === true &&
            r.budget?.agents === 3 &&
            r.budget?.unpriced === 0 &&
            r.remote?.length === 3 &&
            r.remote.every((v) => v === true) &&
            r.bridge?.length &&
            r.metrics?.agentMessages > 0
          )
            outcome = 'passed three-agent Docker smoke';
        }
      }
      computed.set(key, outcome);
    }
    const outcome = computed.get(key);
    if (mode === '--release' && !outcome.startsWith('passed')) failed = true;
    rows.push('| ' + [host, i === 0 ? 'pinned' : 'latest', version, outcome].join(' | ') + ' |');
  }
}
const report = [
  '# Compatibility',
  '',
  'Connector ' +
    pkg.version +
    ' · ' +
    pkg.bioswarm.protocol +
    ' · checked ' +
    new Date().toISOString().slice(0, 10) +
    ' UTC.',
  '',
  '| Host | Channel | Version | Observed result |',
  '|---|---|---|---|',
  ...rows,
  '',
  'Pi uses real sessions with a fixture model. OpenBot requires a live Docker run with three agents and the current connector revision.',
  '',
].join('\n');
console.log(report);
if (mode !== '--pi') writeFileSync(join(root, 'COMPAT.md'), report);
if (failed) process.exitCode = 1;
