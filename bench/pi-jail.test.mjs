// Containment of the direct Pi smoke, checked on real files without a model call.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { piArgs, smokeTools } from './direct-1a-core.mjs';
import installJail, { allowedPath } from './pi-jail/index.js';

const repo = resolve(import.meta.dirname, '..');

function attempt() {
  const root = mkdtempSync(join(tmpdir(), 'jail-'));
  const work = join(root, 'work'), folder = join(work, 'case'), field = join(work, 'field');
  const agent = join(work, 'agents', 'agent-a'), results = join(root, 'results'), secret = join(root, 'secret');
  for (const d of [folder, field, agent, results, secret]) mkdirSync(d, { recursive: true });
  writeFileSync(join(folder, 'orders.csv'), 'o\n');
  writeFileSync(join(folder, 'it’s.txt'), 'x');
  writeFileSync(join(field, 'field.jsonl'), '');
  writeFileSync(join(work, 'queue.sqlite'), '');
  writeFileSync(join(agent, '.phase1-bridge'), '{}');
  writeFileSync(join(results, 'blind-key.jsonl'), '{}');
  writeFileSync(join(secret, 'auth.json'), '{}');
  symlinkSync(join(secret, 'auth.json'), join(folder, 'link.json'));
  symlinkSync(secret, join(folder, 'dlink'));
  symlinkSync(join(secret, 'planted.txt'), join(folder, 'dangling.txt'));
  symlinkSync(join(secret, 'nowhere'), join(folder, 'ddir'));
  symlinkSync(folder, join(folder, 'self'));
  symlinkSync(join(folder, 'orders.csv'), join(folder, 'inner.csv'));
  writeFileSync(join(agent, '.phase1-jail'), JSON.stringify({ tools: smokeTools, read: [folder, field], write: [folder] }));
  const handlers = [];
  installJail({ on: (name, h) => name === 'tool_call' && handlers.push(h) }, agent);
  assert.equal(handlers.length, 1);
  const call = (toolName, input = {}) => handlers[0]({ toolName, input });
  return { root, folder, field, agent, results, secret, call };
}
const blocked = (r) => r?.block === true;

test('the smoke flow passes: case reads, field, marks, bridge and the progress file', () => {
  const a = attempt();
  try {
    for (const path of [
      join(a.folder, 'orders.csv'), '../../case/orders.csv', '@' + join(a.folder, 'orders.csv'),
      pathToFileURL(join(a.folder, 'orders.csv')).href, join(a.field, 'field.jsonl'), join(a.folder, "it's.txt"),
      join(a.folder, 'self', 'orders.csv'), a.folder,
    ])
      assert.equal(a.call('read', { path }), undefined, path);
    for (const path of [join(a.folder, 'progress.ok'), '../../case/progress.ok', join(a.folder, 'new', 'deep.txt')])
      assert.equal(a.call('write', { path, content: 'OK' }), undefined, path);
    for (const tool of ['leave_mark', 'read_marks', 'send_message']) assert.equal(a.call(tool, { place: 'x' }), undefined);
  } finally {
    rmSync(a.root, { recursive: true, force: true });
  }
});

test('shell and every tool outside the smoke list are refused', () => {
  const a = attempt();
  try {
    for (const tool of ['bash', 'edit', 'ls', 'find', 'grep', 'powershell', 'coordination_status', 'mcp__x__y'])
      assert.ok(blocked(a.call(tool, { command: 'cat ~/.pi/agent/auth.json', path: a.folder })), tool);
  } finally {
    rmSync(a.root, { recursive: true, force: true });
  }
});

test('results, repo, credentials, runner state and escapes are refused for reading', () => {
  const a = attempt();
  try {
    for (const path of [
      join(a.results, 'blind-key.jsonl'), a.results, join(repo, 'bench', 'direct-1a.mjs'), repo,
      '~/.pi/agent/auth.json', join(homedir(), '.ssh', 'config'), '.phase1-bridge', '.phase1-jail', '.',
      '../../queue.sqlite', '../../sessions/agent-a/x.jsonl', join(a.folder, '..', '..', 'secret', 'auth.json'),
      '@../../queue.sqlite', pathToFileURL(join(a.secret, 'auth.json')).href, join(a.folder, 'link.json'),
      join(a.folder, 'dlink', 'auth.json'), join(a.folder, 'ddir', 'x'), join(a.folder, 'inner.csv'), '/etc/passwd', '', '   ', 'a\0b',
    ])
      assert.ok(blocked(a.call('read', { path })), JSON.stringify(path));
    assert.ok(blocked(a.call('read', {})));
    assert.ok(blocked(a.call('read', { path: 42 })));
  } finally {
    rmSync(a.root, { recursive: true, force: true });
  }
});

test('writes outside the case folder, through symlinks or into the field are refused', () => {
  const a = attempt();
  try {
    for (const path of [
      join(a.field, 'field.jsonl'), join(a.results, 'smoke.json'), join(repo, 'x.txt'), '.phase1-jail',
      '../../queue.sqlite', '~/x.txt', join(a.folder, 'dangling.txt'), join(a.folder, 'ddir', 'new.txt'),
      join(a.folder, 'dlink', 'new.txt'), join(a.folder, 'link.json'), join(a.folder, '..', 'escape.txt'),
    ])
      assert.ok(blocked(a.call('write', { path, content: 'x' })), path);
  } finally {
    rmSync(a.root, { recursive: true, force: true });
  }
});

test('the jail only acts with its marker and allowedPath follows real paths', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jail-off-')));
  try {
    let registered = 0;
    installJail({ on: () => registered++ }, root);
    assert.equal(registered, 0);
    assert.equal(allowedPath('a/b.txt', root, [root]), true);
    assert.equal(allowedPath('../b.txt', root, [root]), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('smoke Pi arguments carry only the smoke toolset', () => {
  const a = piArgs({ sessionDir: '/s', sessionId: 'u', extensions: ['/jail.js'], system: 's', prompt: 'p', tools: smokeTools });
  assert.equal(a[a.indexOf('--tools') + 1], 'read,write,leave_mark,read_marks,send_message');
  assert.ok(!/bash|edit|find|grep|ls/.test(a[a.indexOf('--tools') + 1]));
  assert.ok(!piArgs({ sessionDir: '/s', sessionId: 'u', extensions: [], system: 's', prompt: 'p' }).includes('--tools'));
});
