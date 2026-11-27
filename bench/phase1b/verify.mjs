// External verifier for Phase 1b. Between waves, the runner (never an agent) executes each module the agents wrote,
// compares it with the reference, publishes the failing checks with a revision derived from the observed
// discrepancy, then composes balances.csv and exceptions.csv from the agents' modules and scores the delivery with
// the Phase 1a scorer. The reference itself is never written to the task folder or shown to an agent.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, lstatSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { score } from '../case.mjs';
import { checkMap } from './case.mjs';

const harness = join(import.meta.dirname, 'harness.mjs');
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);

// tool: optional isolation launcher (on BenchHost /usr/local/bin/svc-tool, which runs the command as the separate
// svc-wk user, without network, in the same cgroup). The Node permission flags, the sanitized environment and the
// timeout apply in both cases.
export function runModule(taskDir, place, input, { timeoutMs = 60000, tool } = {}) {
  const file = join(taskDir, place);
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) return { error: 'missing' };
  if (tool) chmodSync(file, 0o640); // readable by the tool user through the task folder's group, nothing more
  const node = [process.execPath, '--permission', '--allow-fs-read=' + realpathSync(file), '--allow-fs-read=' + harness, harness, realpathSync(file)];
  const [command, ...args] = tool ? [tool, '--', ...node] : node;
  const r = spawnSync(command, args, {
    input: JSON.stringify(input),
    cwd: taskDir,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' },
  });
  if (r.error?.code === 'ETIMEDOUT' || r.signal) return { error: 'timeout' };
  if (r.status !== 0) return { error: 'error' };
  try {
    return { result: JSON.parse(r.stdout).result };
  } catch {
    return { error: 'format' };
  }
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function compareObjects(expected, actual, same) {
  if (!isObject(actual)) return null;
  const divergent = [];
  for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (!(k in expected) || !(k in actual) || !same(expected[k], actual[k])) divergent.push(k);
  }
  return divergent;
}
const num = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number(v) : NaN);
const nonZero = (obj, pick) => (isObject(obj) ? Object.fromEntries(Object.entries(obj).filter(([, v]) => num(pick(v)) !== 0 && !Number.isNaN(num(pick(v))))) : obj);
function compareTable(text, header, keys, expected) {
  if (typeof text !== 'string') return null;
  const [head, ...lines] = text.trimEnd().split(/\r?\n/);
  if (head !== header) return null;
  const divergent = new Set(),
    seen = new Set();
  for (const line of lines) {
    const cols = line.split(','),
      id = cols.slice(0, keys).join(':'),
      value = expected.get(id);
    if (seen.has(id) || !value || cols.slice(keys).join(',') !== value.join(',')) divergent.add(id);
    seen.add(id);
  }
  for (const id of expected.keys()) if (!seen.has(id)) divergent.add(id);
  return [...divergent];
}

const balancesHeader = 'month,shop,grossCents,refundCents,paidCents,differenceCents';
const exceptionsHeader = 'order,reason,differenceCents';
const judge = {
  orders: (r, o) => compareObjects(o.orders, r, (e, a) => isObject(a) && a.month === e.month && a.shop === e.shop && num(a.grossCents) === e.grossCents),
  refunds: (r, o) => compareObjects(o.refunds, nonZero(r, (v) => v), (e, a) => num(a) === e),
  payouts: (r, o) => compareObjects(o.payouts, nonZero(r, (v) => v?.deposits), (e, a) => isObject(a) && num(a.paidCents) === e.paidCents && num(a.deposits) === e.deposits),
  balances: (r, o) => compareTable(r, balancesHeader, 2, o.balances),
  exceptions: (r, o) => compareTable(r, exceptionsHeader, 1, o.exceptions),
};
const expectedSize = { orders: (o) => Object.keys(o.orders).length, refunds: (o) => Object.keys(o.refunds).length, payouts: (o) => Object.keys(o.payouts).length, balances: (o) => o.balances.size, exceptions: (o) => o.exceptions.size };

function memoNumbers(taskDir, oracle) {
  const totals = [...oracle.balances.values()].reduce((s, row) => s.map((v, i) => v + row[i]), [0, 0, 0, 0]);
  let memo = '';
  try {
    if (lstatSync(join(taskDir, 'close.md')).isFile()) memo = readFileSync(join(taskDir, 'close.md'), 'utf8');
  } catch {
    return { kind: 'missing' };
  }
  const numbers = new Set([...memo.matchAll(/-?\d+/g)].map((m) => m[0]));
  const absent = [...totals, oracle.exceptions.size].map((v, i) => (numbers.has(String(v)) ? null : i)).filter((i) => i !== null);
  return absent.length ? { kind: 'absent-numbers', absent } : null;
}

function check(entry, outcome, oracle) {
  if (outcome.error) return { ...entry, pass: false, revision: digest([outcome.error]), symptom: { kind: outcome.error } };
  const divergent = judge[entry.id](outcome.result, oracle);
  if (divergent === null) return { ...entry, pass: false, revision: digest(['format']), symptom: { kind: 'format' } };
  if (!divergent.length) return { ...entry, pass: true, revision: 'pass', symptom: null };
  divergent.sort();
  return { ...entry, pass: false, revision: digest(['diverge', divergent]), symptom: { kind: 'diverge', divergent: divergent.length, expected: expectedSize[entry.id](oracle) } };
}

// Returns every check of the frozen map with its status, plus the composed delivery and its 1a acceptance.
export function verifyAttempt(taskDir, oracle, { timeoutMs, tool } = {}) {
  const map = checkMap(oracle.seed);
  const csvText = (name) => readFileSync(join(taskDir, name + '.csv'), 'utf8');
  const outcomes = {};
  for (const id of ['orders', 'refunds', 'payouts']) outcomes[id] = runModule(taskDir, id + '.mjs', csvText(id), { timeoutMs, tool });
  const reference = { orders: oracle.orders, refunds: oracle.refunds, payouts: oracle.payouts };
  for (const id of ['balances', 'exceptions']) outcomes[id] = runModule(taskDir, id + '.mjs', reference, { timeoutMs, tool });
  const checks = map.map((entry) => {
    if (entry.id !== 'memo') return check(entry, outcomes[entry.id], oracle);
    const memo = memoNumbers(taskDir, oracle);
    if (!memo) return { ...entry, pass: true, revision: 'pass', symptom: null };
    return { ...entry, pass: false, revision: digest([memo.kind, memo.absent ?? []]), symptom: memo.absent ? { kind: memo.kind, divergent: memo.absent.length, expected: 5 } : { kind: memo.kind } };
  });
  // Compose the delivery from the agents' own modules, so a delivery is only as good as the whole chain.
  for (const f of ['balances.csv', 'exceptions.csv']) rmSync(join(taskDir, f), { force: true });
  const sourcesOk = ['orders', 'refunds', 'payouts'].every((id) => !outcomes[id].error);
  let composed = false;
  if (sourcesOk) {
    const actual = { orders: outcomes.orders.result, refunds: outcomes.refunds.result, payouts: outcomes.payouts.result };
    const outputs = { balances: runModule(taskDir, 'balances.mjs', actual, { timeoutMs, tool }), exceptions: runModule(taskDir, 'exceptions.mjs', actual, { timeoutMs, tool }) };
    for (const [id, out] of Object.entries(outputs)) if (typeof out.result === 'string') writeFileSync(join(taskDir, id + '.csv'), out.result);
    composed = Object.values(outputs).every((o) => typeof o.result === 'string');
  }
  const acceptance = score(taskDir, oracle);
  return { checks, failing: checks.filter((c) => !c.pass), composed, acceptance };
}

// What every arm is shown about one failing check: identity, eligibles, revision and a count-only symptom.
export function describe(check, taskDir) {
  const s = check.symptom;
  const symptom =
    s.kind === 'diverge'
      ? `${s.divergent} de ${s.expected} chaves divergentes`
      : s.kind === 'absent-numbers'
        ? `${s.divergent} de ${s.expected} números de controle ausentes`
        : { missing: 'arquivo ausente', error: 'o módulo falhou ao carregar ou executar', timeout: 'o módulo excedeu o tempo', format: 'formato de retorno inválido' }[s.kind];
  return `- check ${check.id} · arquivo ${join(taskDir, check.place)} · elegíveis: ${check.owners.join(', ')} · revisão ${check.revision} · ${symptom}`;
}
