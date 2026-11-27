// Adjudicate a closed, masked batch. Never load the private mapping from UUID to arm.
import assert from 'node:assert/strict';
import { blindManifest } from './blind-manifest.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const [binary, blindDirectory, privateOutput, retryId] = process.argv.slice(2);
if (![binary, blindDirectory, privateOutput].every((x) => x && isAbsolute(x)))
  throw Error('Supply absolute paths for the managed Claude CLI, masked batch, and private output');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const writePrivate = (file, data) => writeFileSync(file, JSON.stringify(data), { mode: 0o600, flag: 'wx' });
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const numericKeys = ['grossCents', 'refundCents', 'paidCents', 'differenceCents', 'exceptions'];
const decisions = [...numericKeys, 'missing', 'over', 'under'];
const gate = json(new URL('../results/phase1/JUDGE-CALIBRATION.json', import.meta.url));
const prompt = readFileSync(new URL('./memo-review-v2.pt.md', import.meta.url), 'utf8');
assert.ok(gate.passed === true && gate.correctItems === 64 && gate.validMemos === 8);
assert.equal(hash(prompt), '318a7b7f51d251f51c8418c9fb38574e6229e57c64ac7af49f2fc4e71e425467');
const model = 'claude-opus-5-5', effort = 'medium';
const home = homedir();
assert.ok(realpathSync(binary).startsWith(realpathSync(join(home, 'Library/Application Support/OpenBot/provider-runtimes/claude')) + '/'));
const accountDirectory = realpathSync(process.env.CLAUDE_CONFIG_DIR);
assert.ok(accountDirectory.endsWith('/provider-accounts/a045bac1398afd976'));
const env = { HOME: home, USER: process.env.USER, PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8', TMPDIR: tmpdir(), CLAUDE_CONFIG_DIR: accountDirectory };
const auth = spawnSync(binary, ['auth', 'status', '--json'], { env, encoding: 'utf8' });
const account = JSON.parse(auth.stdout);
assert.ok(auth.status === 0 && account.loggedIn && account.authMethod === 'claude.ai' && account.apiProvider === 'firstParty' && account.subscriptionType === 'team');
if (!existsSync(privateOutput)) mkdirSync(privateOutput, { mode: 0o700 });
assert.ok(lstatSync(privateOutput).isDirectory() && (lstatSync(privateOutput).mode & 0o077) === 0);
const originFile = process.env.BLIND_ORIGIN_MANIFEST;
assert.ok(originFile && isAbsolute(originFile), 'Supply BLIND_ORIGIN_MANIFEST from the closed source batch');
const sourceManifest = json(originFile);
const receivedManifest = blindManifest(blindDirectory);
assert.deepEqual(receivedManifest, sourceManifest, 'Blind transfer verification failed');
const receiptFile = join(privateOutput, 'received-manifest.json');
if (existsSync(receiptFile)) assert.deepEqual(json(receiptFile), receivedManifest);
else writePrivate(receiptFile, receivedManifest);
const expected = new Map(receivedManifest.map(({ name, sha256 }) => [name, sha256]));
const readPacket = (id) => {
  const refFile = join(blindDirectory, id + '.json'), memoFile = join(blindDirectory, id + '.md');
  assert.ok(lstatSync(refFile).isFile() && lstatSync(memoFile).isFile());
  const refs = readFileSync(refFile), memo = readFileSync(memoFile);
  assert.equal(hash(refs), expected.get(id + '.json'));
  assert.equal(hash(memo), expected.get(id + '.md'));
  const referencia = JSON.parse(refs);
  assert.deepEqual(Object.keys(referencia).sort(), [...numericKeys].sort());
  assert.ok(numericKeys.every((k) => Number.isSafeInteger(referencia[k])));
  return JSON.stringify({ uuid: id, referencia, memorando: memo.toString('utf8') });
};
const names = readdirSync(blindDirectory);
const ids = names.filter((p) => p.endsWith('.md')).map((p) => p.slice(0,-3)).sort();
assert.ok(ids.length > 0 && ids.every((id) => idPattern.test(id)));
assert.ok(names.every((name) => ids.some((id) => name === id+'.md' || name === id+'.json')), 'Unexpected blind packet file');
if (retryId) assert.ok(ids.includes(retryId));
for (const id of ids) {
  if (retryId && id !== retryId) continue;
  const packet = readPacket(id);
  const record = { uuid: id, packetHash: hash(packet), model, effort };
  const prefix = join(privateOutput,id);
  if (existsSync(prefix+'.decision.json')) {
    assert.equal(json(prefix+'.decision.json').packetHash,record.packetHash);
    continue;
  }
  const attempt = prefix + (retryId ? '.2' : '.1');
  if (retryId) {
    assert.equal(json(prefix+'.1.dispatch.json').packetHash,record.packetHash);
    const old = json(prefix+'.1.receipt.json');
    assert.ok(old.is_error && old.api_error_status === 429 && old.usage?.input_tokens === 0 && old.usage?.output_tokens === 0,
      'Automatic retry requires a documented rejection before any model response');
  }
  // Exclusive dispatch receipt prevents duplicate requests following a crash or concurrent invocation.
  writePrivate(attempt+'.dispatch.json', { ...record, ordinal:retryId ? 2 : 1 });
  const cwd = mkdtempSync(join(tmpdir(),'blind-memo-'));
  const args = ['--print','--safe-mode','--tools','','--strict-mcp-config','--no-session-persistence',
    '--model',model,'--effort',effort,'--system-prompt',prompt,'--output-format','json'];
  const result = spawnSync(binary,args,{env,cwd,encoding:'utf8',input:packet,timeout:180000});
  writeFileSync(attempt+'.receipt.json',result.stdout || '',{mode:0o600,flag:'wx'});
  writeFileSync(attempt+'.incident.log',result.stderr || '',{mode:0o600,flag:'wx'});
  const receipt=JSON.parse(result.stdout || '{}');
  const models=Object.keys(receipt.modelUsage || {});
  if (result.status !== 0 || receipt.is_error || models.length !== 1 || models[0] !== model) {
    if (retryId) writePrivate(prefix+'.decision.json',{...record,verdict:null});
    throw Error('Technical incident; retain the receipt before a uniform decision');
  }
  let bits;
  try { bits = JSON.parse(receipt.result); } catch { /* Delivered invalid JSON is indeterminate. */ }
  const valid = bits && Object.keys(bits).length === decisions.length && decisions.every((k)=>typeof bits[k]==='boolean');
  writePrivate(prefix+'.decision.json',{...record,verdict:valid ? decisions.every((k)=>bits[k]) : null});
}
