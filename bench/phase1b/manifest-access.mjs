// Supplemental pre-sample gate. Run with the working directory set to the frozen study checkout.
// A separately versioned copy of this test may be supplied on stdin without changing the treatment.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const load = (path) => import(pathToFileURL(join(root, path)).href);
const { requireStartSpace } = await load('bench/direct-host-health.mjs');
const { initializeBudget } = await load('bench/budget.mjs');
const { team } = await load('bench/phase1b/case.mjs');
const { localDriver } = await load('bench/phase1b/localdriver.mjs');
const { assignTeam, receivedSame } = await load('bench/phase1b/policy.mjs');

const work = process.env.PHASE1B_WORK;
const tool = process.env.BIOSWARM_TOOL;
if (process.env.BIOSWARM_STUDY_HOST !== 'benchhost' || tool !== '/usr/local/bin/svc-tool') throw Error('BenchHost study launcher required');
requireStartSpace(work);
const manifest = realpathSync(join(root, 'bench/phase1b/manifest.json'));
if (!statSync(manifest).isFile()) throw Error('Study manifest missing');
const url = process.env.BIOSWARM_CONTROL_URL;
const key = readFileSync(process.env.CONTROL_KEY_FILE, 'utf8').trim();
async function controlCall(method, path, body) {
  const res = await fetch(new URL(path, url), {
    method, headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: body && JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw Error('Control assignment failed');
  return res.json();
}
const control = {
  assign: (agent, strategy, overrides) => controlCall('PUT', '/v1/policy', { agent, strategy, ...(overrides && { overrides }) }),
  get: (agent) => controlCall('GET', '/v1/policy?agent=' + encodeURIComponent(agent)),
};

// Open and close only. Distinguish permission denial from a missing file or launcher failure.
const probe = `const fs = require('node:fs');
try { fs.closeSync(fs.openSync(process.argv[1], 'r')); }
catch (e) { process.exit(e.code === 'EACCES' ? 73 : 74); }`;
function worker(cwd, args) {
  return spawnSync(tool, ['--', ...args], { cwd, timeout: 10000, encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LANG: 'C' } });
}
function paths(cwd, link) {
  return { absolute: manifest, relative: relative(cwd, manifest), symlink: link };
}

const driver = await localDriver({ connectorEnv: { BIOSWARM_API_URL: url, BIOSWARM_API_KEY: key } });
const receipt = {};
try {
  for (const arm of ['A', 'B', 'C']) {
    const dir = realpathSync(mkdtempSync(join(work, 'manifest-access-')));
    try {
      chmodSync(dir, 0o2710);
      const agent = team[0];
      const task = join(dir, 'task'), cwd = join(dir, agent), inbox = join(dir, 'inbox');
      for (const d of [task, cwd, inbox]) mkdirSync(d, { mode: 0o700 });
      chmodSync(task, 0o2750);
      const note = join(task, 'control.txt');
      writeFileSync(note, 'ok\n');
      chmodSync(note, 0o640);
      const link = join(task, 'manifest-link');
      symlinkSync(manifest, link);
      const ledger = join(dir, 'ledger.sqlite');
      initializeBudget(ledger);
      writeFileSync(join(cwd, '.phase1-budget'), JSON.stringify({ ledger }));
      let assigned;
      if (arm !== 'A') {
        assigned = await assignTeam(control, arm, team);
        const field = join(dir, 'field'), waveDir = join(dir, 'waves');
        for (const d of [field, waveDir]) mkdirSync(d);
        writeFileSync(join(cwd, '.bioswarm'), JSON.stringify({ field, waveDir, gate: null }));
      }
      const id = worker(task, ['/usr/bin/id', '-un']);
      const unix = { workerIdentity: id.status === 0 && id.stdout.trim() === 'svc-wk',
        taskRead: worker(task, [process.execPath, '-e', probe, note]).status === 0 };
      for (const [form, path] of Object.entries(paths(task, link))) {
        unix[form] = worker(task, [process.execPath, '-e', probe, path]).status === 73;
      }
      const handle = await driver.open({ agent, cwd, arm, roots: [task, cwd], bridge: { self: agent, team, inbox, counts: { accepted: 0, refused: 0, chars: 0 } } });
      const read = (path) => handle.turn('Checagem local de leitura.', { deadline: Date.now() + 60000, provider: { http429: 0, retries: 0 }, calls: [{ tool: 'read', args: { path } }] });
      const pi = {};
      try {
        const positive = await read(note);
        pi.taskRead = positive.accepted.read === 1 && positive.readDenials === 0;
        for (const [form, path] of Object.entries(paths(cwd, link))) {
          const result = await read(path);
          pi[form] = result.readDenials === 1 && result.deniedPaths[0] === manifest && (result.accepted.read ?? 0) === 0;
        }
      } finally { await handle.close(); }
      if (assigned) {
        const cache = JSON.parse(readFileSync(join(cwd, '.bioswarm-policy.json'), 'utf8'));
        const events = readFileSync(join(cwd, '.bioswarm-events.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
        pi.remotePolicy = receivedSame(cache, assigned.ids, assigned.rules, agent) && events.some((e) => e.type === 'policy' && e.kind === 'remote');
      }
      receipt[arm] = { unix, pi, pass: [...Object.values(unix), ...Object.values(pi)].every(Boolean) };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
} finally { driver.dispose(); }
receipt.pass = Object.values(receipt).every((arm) => arm.pass);
console.log(JSON.stringify(receipt));
if (!receipt.pass) process.exitCode = 1;
