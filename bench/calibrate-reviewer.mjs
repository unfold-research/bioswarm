// Run once per frozen set. Keep receipts and gold labels outside the model's working directory.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { blindMemo } from './blind.mjs';

const [binary, destination, mode] = process.argv.slice(2);
if (!binary || !destination || !isAbsolute(binary) || !isAbsolute(destination))
  throw Error('Supply the OpenBot-managed Claude binary and a new absolute private receipt directory');
const model = 'claude-opus-5-5';
const effort = 'medium';
const secondSet = mode === '--calibrate-v2';
const promptFile = secondSet ? './memo-review-v2.pt.md' : './memo-review.pt.md';
const fixtureFile = secondSet ? './memo-calibration-v2.json' : './memo-calibration-v1.json';
const prompt = readFileSync(new URL(promptFile, import.meta.url), 'utf8');
const digest = (s) => createHash('sha256').update(s).digest('hex');
assert.equal(digest(prompt), secondSet ? '318a7b7f51d251f51c8418c9fb38574e6229e57c64ac7af49f2fc4e71e425467' : 'b5e3a5788021a7a96612760eb7a6aac226c8a318db66de976df3521fda7570ad');
const { referencia, cases } = JSON.parse(readFileSync(new URL(fixtureFile, import.meta.url)));
assert.equal(cases.length, 8);
assert.equal(new Set(cases.map((c) => c.uuid)).size, 8);
const home = process.env.HOME;
const managedRoot = realpathSync(join(home, 'Library/Application Support/OpenBot/provider-runtimes/claude'));
assert.ok(realpathSync(binary).startsWith(managedRoot + '/'));
const env = { HOME: home, USER: process.env.USER, PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8', TMPDIR: tmpdir() };
const selectedAccount = 'a045bac1398afd976';
if (secondSet || mode === '--resume-on-selected-account') {
  const directory = process.env.CLAUDE_CONFIG_DIR;
  if (!directory || !realpathSync(directory).endsWith('/provider-accounts/' + selectedAccount))
    throw Error('The registered OpenBot account directory is required');
  env.CLAUDE_CONFIG_DIR = realpathSync(directory);
}
const auth = spawnSync(binary, ['auth', 'status', '--json'], { env, encoding: 'utf8' });
assert.equal(auth.status, 0);
const account = JSON.parse(auth.stdout);
assert.ok(account.loggedIn && account.authMethod === 'claude.ai' && account.apiProvider === 'firstParty' && account.subscriptionType === 'team');
if (mode && !secondSet && !['--resume-after-quota-reset', '--resume-on-selected-account'].includes(mode)) throw Error('Unexpected resume option');
const resuming = Boolean(mode && !secondSet);
if (!resuming) mkdirSync(destination, { mode: 0o700 });
const summary = join(destination, 'summary.json');
const rows = resuming ? JSON.parse(readFileSync(summary, 'utf8')) : [];
let resumeId;
if (resuming) {
  const last = rows.at(-1);
  assert.ok(last && last.status === 'indeterminate' && !last.retry, 'Only one documented technical retry is allowed');
  const receipt = JSON.parse(readFileSync(join(destination, last.uuid + '.receipt.json')));
  assert.ok(receipt.api_error_status === 429 && receipt.api_error === 'usage_limit_reached' &&
    receipt.is_error && receipt.usage?.input_tokens === 0 && receipt.usage?.output_tokens === 0);
  resumeId = last.uuid;
}
for (const item of cases.sort((a, b) => a.uuid.localeCompare(b.uuid))) {
  const { text, removals } = blindMemo(item.memorando, []);
  assert.ok(removals.length > 0 && !/\bcampo\b/i.test(text));
  const packet = JSON.stringify({ uuid: item.uuid, referencia, memorando: text });
  const previous = rows.find((r) => r.uuid === item.uuid);
  if (previous) {
    assert.equal(previous.packetHash, digest(packet));
    if (item.uuid !== resumeId) continue;
  }
  const retry = item.uuid === resumeId;
  const prefix = resolve(destination, item.uuid + (retry ? '.retry' : ''));
  writeFileSync(prefix + '.dispatch.json', JSON.stringify({ uuid: item.uuid, ordinal: retry ? 2 : 1,
    packetHash: digest(packet), model, effort }), { mode: 0o600, flag: 'wx' });
  const cwd = mkdtempSync(join(tmpdir(), 'blind-memo-'));
  const options = ['--print', '--safe-mode', '--tools', '', '--strict-mcp-config', '--no-session-persistence',
    '--model', model, '--effort', effort, '--system-prompt', prompt, '--output-format', 'json'];
  const result = spawnSync(binary, options, { env, cwd, encoding: 'utf8', input: packet, timeout: 180000 });
  writeFileSync(prefix + '.receipt.json', result.stdout || '', { mode: 0o600, flag: 'wx' });
  writeFileSync(prefix + '.incident.log', result.stderr || '', { mode: 0o600, flag: 'wx' });
  const receipt = JSON.parse(result.stdout || '{}');
  const models = Object.keys(receipt.modelUsage || {});
  const row = { uuid: item.uuid, account: env.CLAUDE_CONFIG_DIR ? selectedAccount : 'default', retry, packetHash: digest(packet), models, effort, status: 'indeterminate', correct: 0 };
  if (result.status === 0 && !receipt.is_error && models.length === 1 && models[0] === model) {
    let verdict;
    try { verdict = JSON.parse(receipt.result); } catch { /* A delivered malformed judgment stays indeterminate. */ }
    const keys = Object.keys(item.expected);
    if (verdict && Object.keys(verdict).length === keys.length && keys.every((k) => typeof verdict[k] === 'boolean')) {
      row.mismatches = keys.filter((k) => verdict[k] !== item.expected[k]);
      row.correct = keys.length - row.mismatches.length;
      row.status = 'valid';
    }
  }
  if (retry) rows[rows.indexOf(previous)] = row;
  else rows.push(row);
  writeFileSync(summary, JSON.stringify(rows, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ count: rows.length, status: row.status, correct: row.correct }));
  if (result.status !== 0 || receipt.is_error || !models.includes(model))
    throw Error('Transport, account or model mismatch; inspect private receipt before further calls');
}
process.exitCode = rows.every((r) => r.correct === 8) ? 0 : 1;
