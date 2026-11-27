// LI15: turns one generated case (rc/code.mjs) into a real repository for a Colony team: one file per module, one
// specification per module, and a test runner the agents run themselves (`node test/run.mjs`). The runner applies the
// strict check on the test inputs (a directed helper must itself return what the caller's team requires), so the
// feedback the agents see is the check they are scored by; the hold-out (fresh inputs) stays outside the repository.
// Usage: node observatory/batch2/colony/materialize.mjs <k> <seed> <out-dir>
import fs from 'node:fs';
import path from 'node:path';
import * as W from '../rc/code.mjs';

export function materialize(k, seed, out, shape = { local: 2, directed: k, symmetric: Math.round((k * 10) / 12), tests: 8, shown: 3 }) {
  const inst = W.makeInstance(k, seed, shape), mod = (m) => `M${m + 1}`, file = (m) => `m${m + 1}`;
  fs.mkdirSync(path.join(out, 'src'), { recursive: true }); fs.mkdirSync(path.join(out, 'specs'), { recursive: true }); fs.mkdirSync(path.join(out, 'test'), { recursive: true });
  for (let m = 0; m < k; m++) {
    fs.writeFileSync(path.join(out, 'specs', `${file(m)}.md`), `# Module ${mod(m)} (src/${file(m)}.js)\n\n${inst.specs[m].map((x) => `- ${x}`).join('\n')}\n`);
    fs.writeFileSync(path.join(out, 'src', `${file(m)}.js`), `// Module ${mod(m)}: write it from specs/${file(m)}.md.\n`);
  }
  const fixtures = { k, names: inst.names, checks: inst.checks.map((c) => {
    if (c.kind === 'local') return { id: c.id, kind: c.kind, owner: c.owner, fn: c.fn, cases: c.inputs.map((s) => [s, c.ref(s)]) };
    if (c.kind === 'directed') return { id: c.id, kind: c.kind, holder: c.holder, impl: c.impl, fn: c.fn, helper: c.helper, cases: c.inputs.map((s) => [s, c.ref(s), c.hRef(s)]) };
    return { id: c.id, kind: c.kind, prod: c.prod, cons: c.cons, enc: c.enc, dec: c.dec, records: c.inputs };
  }) };
  fs.writeFileSync(path.join(out, 'test', 'fixtures.json'), JSON.stringify(fixtures));
  fs.writeFileSync(path.join(out, 'test', 'run.mjs'), RUNNER);
  fs.writeFileSync(path.join(out, 'README.md'), `# A ${k}-module JavaScript codebase\n\nEach module lives in \`src/m<N>.js\` and is specified in \`specs/m<N>.md\`. ${RULES(k)}\n\nDone means \`node test/run.mjs\` prints \`all checks pass\`.\n`);
  return inst;
}
const RULES = (k) => `Modules are plain JavaScript (no require, import or export). Declare each function at top level with "function name(...)". Other modules are reachable as globals M1 to M${k}; call a function of another module as e.g. M2.fnName(x). Encoded strings may use only the characters a-z, 0-9 and | ; , / ~ # + . _ = -.`;
const RUNNER = `// Runs every check on the current code. Usage: node test/run.mjs [--json]
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), F = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures.json'), 'utf8'));
const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b)), show = (x) => (x === undefined ? 'undefined' : JSON.stringify(x));
const ALLOWED = /^[a-z0-9|;,/~#+._=-]*$/;
const ex = Array.from({ length: F.k }, () => ({})), errs = [], g = Object.fromEntries(ex.map((e, i) => ['M' + (i + 1), e]));
for (let m = 0; m < F.k; m++) {
  let src = ''; try { src = fs.readFileSync(path.join(root, 'src', 'm' + (m + 1) + '.js'), 'utf8'); } catch { errs[m] = 'file missing'; continue; }
  try { Object.assign(ex[m], new vm.Script(src + '\\n;({' + F.names[m].map((n) => n + ": typeof " + n + " === 'function' ? " + n + ' : undefined').join(', ') + '})').runInContext(vm.createContext({ ...g }), { timeout: 200 })); }
  catch (e) { errs[m] = 'module failed to load: ' + String(e && e.message || e).slice(0, 160); }
}
const ctx = vm.createContext({ ...g, __f: null, __a: null });
const call = (f, a) => { if (typeof f !== 'function') return { err: 'missing' }; ctx.__f = f; ctx.__a = a; try { return { v: vm.runInContext('__f(__a)', ctx, { timeout: 200 }) }; } catch (e) { return { err: String(e && e.message || e).slice(0, 120) }; } };
const fails = [], M = (i) => 'M' + (i + 1);
for (const c of F.checks) {
  if (c.kind === 'local') { const bad = c.cases.filter(([s, w]) => { const r = call(ex[c.owner][c.fn], s); return r.err || !eq(r.v, w); }); if (bad.length || errs[c.owner]) fails.push(M(c.owner) + '.' + c.fn + ': ' + (errs[c.owner] || bad.slice(0, 3).map(([s, w]) => c.fn + '(' + show(s) + ') should be ' + show(w) + ', got ' + show(call(ex[c.owner][c.fn], s).v)).join('; '))); }
  else if (c.kind === 'directed') {
    // LI29 (LI20 review): the caller must really use the helper's result, as the scorer requires; with a wrong helper it must fail
    const H = new Map(c.cases.map(([s, , h]) => [s, h])), real = ex[c.impl][c.helper];
    ex[c.impl][c.helper] = (s) => { const h = H.get(s); return typeof h === 'number' ? h + 1 : String(h) + 'q'; };
    const ignores = typeof ex[c.holder][c.fn] === 'function' && c.cases.every(([s, w]) => { const r = call(ex[c.holder][c.fn], s); return !r.err && eq(r.v, w); });
    ex[c.impl][c.helper] = real;
    if (ignores) { fails.push(M(c.holder) + '.' + c.fn + ' does not use the result of ' + M(c.impl) + '.' + c.helper + '; it must call it and use what it returns (a caller that recomputes it does not count)'); continue; }
    const bad = c.cases.filter(([s, w]) => { const r = call(ex[c.holder][c.fn], s); return r.err || !eq(r.v, w); });
    const hbad = c.cases.filter(([s, , h]) => { const r = call(ex[c.impl][c.helper], s); return r.err || !eq(r.v, h); });
    if (bad.length) fails.push(M(c.holder) + '.' + c.fn + ' (uses ' + M(c.impl) + '.' + c.helper + '): ' + bad.slice(0, 3).map(([s, w]) => c.fn + '(' + show(s) + ') should be ' + show(w) + ', got ' + show(call(ex[c.holder][c.fn], s).v) + ' (' + c.helper + ' returned ' + show(call(ex[c.impl][c.helper], s).v) + ')').join('; '));
    else if (hbad.length) fails.push(M(c.holder) + '.' + c.fn + ' passes, but ' + M(c.impl) + '.' + c.helper + ' does not meet the requirement of ' + M(c.holder) + "'s specification (a caller that works around it does not count)");
  } else {
    const bad = c.records.filter((r) => { const s = call(ex[c.prod][c.enc], structuredClone(r)); if (s.err || typeof s.v !== 'string' || !ALLOWED.test(s.v)) return true; const b = call(ex[c.cons][c.dec], s.v); return b.err || !eq(b.v, r); });
    if (bad.length) fails.push('round trip ' + M(c.cons) + '.' + c.dec + '(' + M(c.prod) + '.' + c.enc + '(rec)) fails ' + bad.length + ' of ' + c.records.length + ', e.g. rec ' + JSON.stringify(bad[0]) + ': ' + c.enc + ' gave ' + show(call(ex[c.prod][c.enc], structuredClone(bad[0])).v));
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ failing: fails.length, of: F.checks.length, fails }));
else { console.log(fails.length ? fails.join('\\n') + '\\n' + fails.length + ' of ' + F.checks.length + ' checks failing' : 'all checks pass'); }
process.exitCode = fails.length ? 1 : 0;
`;
if (process.argv[1] === new URL(import.meta.url).pathname) { const [k, seed, out] = process.argv.slice(2); materialize(Number(k), Number(seed), path.resolve(out)); console.log('wrote', out); }
