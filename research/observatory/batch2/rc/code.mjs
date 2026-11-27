// LI7 domain: a small JavaScript codebase written by k developers, each owning one module (tasks/LI7-REAL-CODE-PREREG.md).
// The field is the executed test suite. Three kinds of check:
//   local      a function specified entirely inside its owner's module
//   directed   caller A's function uses helper h from module B; only A's team holds h's requirement, only B can change h
//   symmetric  A encodes a record to a string, B decodes it; the format is free, so either side can adapt (house styles differ)
// Model output runs in node:vm with a timeout per test. vm is not a security boundary; members are our own model calls.
import vm from 'node:vm';
import crypto from 'node:crypto';
import { rng } from '../ne/tasks.mjs';

const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const V = new Set('aeiou');
const pos = (c) => c.charCodeAt(0) - 96;

// Library of string functions (input: a lowercase word). Each: spec(param) prose, ref(param) implementation.
const LIB = [
  { t: 'int', spec: () => 'the number of vowels (a, e, i, o, u) in s', ref: () => (s) => [...s].filter((c) => V.has(c)).length },
  { t: 'int', spec: () => 'the number of distinct letters in s', ref: () => (s) => new Set(s).size },
  { t: 'int', spec: () => 'the sum of the alphabet positions of the letters of s (a=1, b=2, ..., z=26)', ref: () => (s) => [...s].reduce((n, c) => n + pos(c), 0) },
  { t: 'int', spec: () => 'the length of the longest run of identical consecutive letters in s', ref: () => (s) => { let b = 0, c = 0; for (let i = 0; i < s.length; i++) { c = i && s[i] === s[i - 1] ? c + 1 : 1; b = Math.max(b, c); } return b; } },
  { t: 'int', spec: () => 'the number of positions i where s[i] comes strictly before s[i+1] in the alphabet', ref: () => (s) => { let n = 0; for (let i = 0; i + 1 < s.length; i++) if (s[i] < s[i + 1]) n++; return n; } },
  { t: 'int', spec: () => 'the number of distinct letters that occur more than once in s', ref: () => (s) => { const m = {}; for (const c of s) m[c] = (m[c] || 0) + 1; return Object.values(m).filter((x) => x > 1).length; } },
  { t: 'int', spec: (p) => `the number of times the letter "${p}" occurs in s`, ref: (p) => (s) => [...s].filter((c) => c === p).length, p: (r) => pick(r, [...'aeiorstn']) },
  { t: 'int', spec: (p) => `(the alphabet position of the last letter of s, a=1) multiplied by the length of s, modulo ${p}`, ref: (p) => (s) => (pos(s.at(-1)) * s.length) % p, p: (r) => pick(r, [7, 11, 13, 17]) },
  { t: 'int', spec: () => 'the number of consonants (letters other than a, e, i, o, u) at even indices of s (index 0 is even)', ref: () => (s) => [...s].filter((c, i) => i % 2 === 0 && !V.has(c)).length },
  { t: 'str', spec: () => 's reversed', ref: () => (s) => [...s].reverse().join('') },
  { t: 'str', spec: (p) => `s with every letter shifted ${p} places forward in the alphabet, wrapping from z to a`, ref: (p) => (s) => [...s].map((c) => String.fromCharCode(97 + ((pos(c) - 1 + p) % 26))).join(''), p: (r) => int(r, 1, 5) },
  { t: 'str', spec: () => 's with all vowels (a, e, i, o, u) removed', ref: () => (s) => [...s].filter((c) => !V.has(c)).join('') },
  { t: 'str', spec: () => 'the letters of s sorted alphabetically', ref: () => (s) => [...s].sort().join('') },
  { t: 'str', spec: () => 's keeping only the first occurrence of each letter, in order', ref: () => (s) => [...new Set(s)].join('') },
  { t: 'str', spec: () => 'the letters of s at even indices (0, 2, 4, ...), in order', ref: () => (s) => [...s].filter((_, i) => i % 2 === 0).join('') },
  { t: 'str', spec: () => 'the run-length encoding of s: each run of identical letters as the letter followed by the run length, e.g. "aabccc" gives "a2b1c3"', ref: () => (s) => s.replace(/(.)\1*/g, (m) => m[0] + m.length) },
  { t: 'str', spec: () => 's with each pair of letters at indices (0,1), (2,3), ... swapped; a final unpaired letter stays', ref: () => (s) => { const a = [...s]; for (let i = 0; i + 1 < a.length; i += 2) [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.join(''); } },
];
const COMBINE = {
  int: [(a, b) => ({ spec: (h) => `${h}(s) * ${a} + ${b}`, ref: (x) => x * a + b })],
  str: [() => ({ spec: (h) => `${h}(s) converted to upper case`, ref: (x) => x.toUpperCase() }), () => ({ spec: (h) => `${h}(s) followed by a dash and the length of s, e.g. "xyz-5"`, ref: (x, s) => `${x}-${s.length}` })],
};
const VERBS = ['score', 'tally', 'rank', 'grade', 'probe', 'gauge', 'weigh', 'label', 'stamp', 'brand', 'tag', 'mark', 'scan', 'trace', 'shape', 'fold', 'pack', 'sift', 'mint', 'tune'];
const NOUNS = ['Word', 'Name', 'Code', 'Token', 'Key', 'Slug', 'Handle', 'Title', 'Term', 'Label', 'Sku', 'Alias', 'Ref', 'Hint', 'Seed', 'Note'];
// extended name pools, used only once the base pools run out (LI19)
const VERBS2 = ['merge', 'split', 'count', 'parse', 'clamp', 'pivot', 'route', 'stash', 'blend', 'carve', 'drift', 'flip', 'forge', 'glean', 'hatch', 'knit', 'lift', 'mend', 'nudge'];
const NOUNS2 = ['Field', 'Frame', 'Grain', 'Item', 'Mark', 'Node', 'Path', 'Point', 'Range', 'Scope', 'Span', 'Stamp', 'Track', 'Unit', 'Value', 'Zone'];
const RECS = ['Order', 'Badge', 'Ticket', 'Parcel', 'Visit', 'Lease', 'Shift', 'Claim', 'Route', 'Batch', 'Quote', 'Permit'];
// LI10: more record names, used only when a case needs more than 12 symmetric edges (instances of LI7 to LI9 unchanged)
const RECS2 = ['Invoice', 'Booking', 'Refund', 'Voucher', 'Receipt', 'Contract', 'Account', 'Payment', 'Shipment', 'Rental', 'Session', 'Survey', 'Report', 'Return', 'Deposit', 'Credit', 'Member', 'Device', 'Asset', 'Vendor', 'Lesson', 'Course', 'Event', 'Venue', 'Seat', 'Table', 'Meal', 'Recipe', 'Plant', 'Crate', 'Pallet', 'Trip', 'Flight', 'Cabin', 'Locker', 'Badge2', 'Licence', 'Policy', 'Ledger', 'Budget', 'Grant', 'Award', 'Entry', 'Draft', 'Notice', 'Memo', 'Folder', 'Album', 'Track', 'Clip', 'Frame', 'Sketch', 'Patch', 'Build', 'Release', 'Commit', 'Review', 'Issue', 'Sprint', 'Story', 'Epic', 'Task', 'Job', 'Queue', 'Slot', 'Window', 'Cohort', 'Panel', 'Sample', 'Trial'];
const FIELDS = [['id', 'int'], ['qty', 'int'], ['name', 'word'], ['city', 'word'], ['tags', 'words'], ['active', 'bool'], ['paid', 'bool']];
const SEPS = ['|', ';', ',', '/', '~', '#'], LSEPS = ['+', '.', '_'], BOOLS = [['1', '0'], ['y', 'n'], ['t', 'f']];
export const ALLOWED = /^[a-z0-9|;,/~#+._=-]*$/;

const word = (r, lo = 3, hi = 8) => Array.from({ length: int(r, lo, hi) }, () => String.fromCharCode(97 + int(r, 0, 25))).join('');
const wordRun = (r) => { const w = word(r, 4, 9); return r() < 0.5 ? w : w.replace(/(.)(.)/, (_, a) => a + a); };
const mod = (i) => `M${i + 1}`;

export function makeInstance(k, seed, { local = 2, directed = 5, symmetric = 4, tests = 6, shown = 3 } = {}) {
  const r = rng(`rc:${k}:${seed}`), used = new Set();
  // the base pool (VERBS x NOUNS, 320 names) is used exactly as before; only a case that needs more names than it holds
  // (LI19: 2k directed edges) draws from the extended pool, so every earlier instance is unchanged
  let baseUsed = 0;
  const fname = () => {
    if (baseUsed < VERBS.length * NOUNS.length) for (;;) { const n = pick(r, VERBS) + pick(r, NOUNS); if (!used.has(n)) { used.add(n); baseUsed++; return n; } }
    for (;;) { const n = pick(r, VERBS.concat(VERBS2)) + pick(r, NOUNS.concat(NOUNS2)); if (!used.has(n)) { used.add(n); return n; } }
  };
  const lib = () => { const L = pick(r, LIB), p = L.p ? L.p(r) : undefined; return { t: L.t, spec: L.spec(p), ref: L.ref(p) }; };
  const inputs = () => Array.from({ length: tests }, () => wordRun(r));
  const checks = []; // { id, kind, owner (local) | holder/impl | prod/cons, fn..., inputs }
  const specs = Array.from({ length: k }, () => []); // prose lines per module
  for (let m = 0; m < k; m++) for (let j = 0; j < local; j++) { const f = fname(), L = lib(); specs[m].push(`${f}(s): returns ${L.spec}.`); checks.push({ id: `L:${mod(m)}.${f}`, kind: 'local', owner: m, fn: f, ref: L.ref, inputs: inputs() }); }
  const pairs = shuffle(r, Array.from({ length: k * k }, (_, i) => [Math.floor(i / k), i % k]).filter(([a, b]) => a !== b));
  for (const [a, b] of pairs.slice(0, directed)) {
    const f = fname(), h = fname(), L = lib(), C = L.t === 'int' ? COMBINE.int[0](int(r, 2, 4), int(r, 1, 9)) : pick(r, COMBINE.str)();
    specs[a].push(`${f}(s): returns ${C.spec(`${mod(b)}.${h}`)}. It must call ${mod(b)}.${h} (owned by the developer of ${mod(b)}) rather than reimplement it. What ${h}(s) must return (your team's requirement; the developer of ${mod(b)} does not have this specification): ${L.spec}.`);
    specs[b].push(`${h}(s): a helper used by the developer of ${mod(a)}. Its required behaviour is defined by that developer's team; you do not have its specification.`);
    checks.push({ id: `D:${mod(a)}.${f}>${mod(b)}.${h}`, kind: 'directed', holder: a, impl: b, fn: f, helper: h, need: L.spec, hRef: L.ref, comb: C.ref, ref: (s) => C.ref(L.ref(s), s), inputs: inputs() });
  }
  const und = shuffle(r, pairs.filter(([a, b]) => a < b));
  for (const [x, y] of und.slice(0, symmetric)) {
    const [a, b] = r() < 0.5 ? [x, y] : [y, x], R = pick(r, (symmetric > RECS.length ? RECS.concat(RECS2) : RECS).filter((n) => !used.has(n))); used.add(R);
    const fields = shuffle(r, FIELDS).slice(0, 3), style = () => ({ sep: pick(r, SEPS), lsep: pick(r, LSEPS), bool: pick(r, BOOLS), order: shuffle(r, fields.map((f) => f[0])) });
    let sa = style(), sb = style(); while (sb.sep === sa.sep && sb.order.join() === sa.order.join()) sb = style();
    const shape = fields.map(([n, t]) => `${n} (${t === 'int' ? 'integer 0-999' : t === 'word' ? 'lowercase word' : t === 'words' ? 'array of 0 to 3 lowercase words' : 'boolean'})`).join(', ');
    const house = (s) => `your team's house style is to put the fields in the order ${s.order.join(', ')}, separated by "${s.sep}"${fields.some((f) => f[1] === 'words') ? `, list items joined by "${s.lsep}"` : ''}${fields.some((f) => f[1] === 'bool') ? `, booleans as "${s.bool[0]}"/"${s.bool[1]}"` : ''}. The house style is a preference, not a requirement: what matters is that the two functions agree.`;
    const rule = `The string may contain only lowercase letters, digits and the characters | ; , / ~ # + . _ = - (so not JSON).`;
    const enc = `encode${R}`, dec = `decode${R}`;
    specs[a].push(`${enc}(rec): turns a ${R} record {${shape}} into a string that ${mod(b)}.${dec} (owned by the developer of ${mod(b)}) turns back into an equal record. ${rule} The exact format is not fixed by anyone; ${house(sa)}`);
    specs[b].push(`${dec}(str): turns a string produced by ${mod(a)}.${enc} (owned by the developer of ${mod(a)}) back into the ${R} record {${shape}} it came from (same field names and types; arrays in the same order). ${rule.replace('The string may', 'Such strings')} The exact format is not fixed by anyone; ${house(sb)}`);
    const recs = Array.from({ length: tests }, () => Object.fromEntries(fields.map(([n, t]) => [n, t === 'int' ? int(r, 0, 999) : t === 'word' ? word(r) : t === 'words' ? Array.from({ length: int(r, 0, 3) }, () => word(r, 2, 6)) : r() < 0.5])));
    checks.push({ id: `S:${mod(a)}.${enc}~${mod(b)}.${dec}`, kind: 'symmetric', prod: a, cons: b, enc, dec, inputs: recs });
  }
  const names = specs.map((_, m) => [...new Set([...checks.filter((c) => c.owner === m).map((c) => c.fn), ...checks.filter((c) => c.holder === m).map((c) => c.fn), ...checks.filter((c) => c.impl === m).map((c) => c.helper), ...checks.filter((c) => c.prod === m).map((c) => c.enc), ...checks.filter((c) => c.cons === m).map((c) => c.dec)])]);
  return { k, seed, specs, checks, names, shown, hash: crypto.createHash('sha256').update(JSON.stringify(specs)).digest('hex').slice(0, 12) };
}

// key order of records does not matter (pilot bug: a correct decode with another key order counted as failing)
const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
const eq = (x, y) => JSON.stringify(canon(x)) === JSON.stringify(canon(y));
const show = (x) => (typeof x === 'string' ? JSON.stringify(x) : x === undefined ? 'undefined' : JSON.stringify(x) ?? String(x));

// Load all modules into one harness. Each module gets its own context whose globals M1..Mk are the shared export objects.
function load(inst, code) {
  const ex = Array.from({ length: inst.k }, () => ({})), errs = [];
  const g = Object.fromEntries(ex.map((e, i) => [mod(i), e]));
  code.forEach((src, m) => {
    if (!src) { errs[m] = 'module is empty'; return; }
    const ctx = vm.createContext({ ...g });
    try { const got = new vm.Script(`${src}\n;({${inst.names[m].map((n) => `${n}: typeof ${n} === 'function' ? ${n} : undefined`).join(', ')}})`).runInContext(ctx, { timeout: 200 }); Object.assign(ex[m], got); }
    catch (e) { errs[m] = `module failed to load: ${String(e?.message || e).slice(0, 160)}`; }
  });
  const hctx = vm.createContext({ ...g, __f: null, __a: null });
  const call = (fn, arg) => { hctx.__f = fn; hctx.__a = arg; try { return { v: vm.runInContext('__f(__a)', hctx, { timeout: 200 }) }; } catch (e) { return { err: String(e?.message || e).slice(0, 120) }; } };
  return { ex, errs, call };
}

// Violations of the current code. Each: { id, kind, parts: [module indices], text (shown to members), detail: per side }
// opts.strict (LI12 on): a directed check also fails when the helper itself does not meet the requirement, up to what the
// specified combination can observe (so an upper-casing helper under an upper-case combination passes: no blind spot). The
// text does not reveal what the helper must return; only the caller's team has that.
export function check(inst, code, opts = {}) {
  const { ex, errs, call } = load(inst, code), out = [];
  const fail = (c, parts, kind, text) => out.push({ id: c.id, kind, parts, text });
  for (const c of inst.checks) {
    if (c.kind === 'local') {
      const f = ex[c.owner][c.fn]; if (typeof f !== 'function') { fail(c, [c.owner], 'local', `${mod(c.owner)}.${c.fn} is missing${errs[c.owner] ? ` (${errs[c.owner]})` : ''}`); continue; }
      const bad = c.inputs.map((s) => ({ s, want: c.ref(s), got: call(f, s) })).filter((x) => x.got.err || !eq(x.got.v, x.want));
      if (bad.length) fail(c, [c.owner], 'local', `${mod(c.owner)}.${c.fn} fails ${bad.length} of ${c.inputs.length} tests, e.g. ${bad.slice(0, inst.shown).map((x) => `${c.fn}(${show(x.s)}) should be ${show(x.want)}, got ${x.got.err ? `error ${x.got.err}` : show(x.got.v)}`).join('; ')}`);
    } else if (c.kind === 'directed') {
      const A = ex[c.holder], B = ex[c.impl], f = A[c.fn], hReal = B[c.helper];
      if (typeof f !== 'function') { fail(c, [c.holder], 'local', `${mod(c.holder)}.${c.fn} is missing${errs[c.holder] ? ` (${errs[c.holder]})` : ''}`); continue; }
      // attribution: with the reference helper the caller must pass, and with a wrong helper it must fail (it really uses it)
      B[c.helper] = c.hRef; const own = c.inputs.filter((s) => { const g = call(f, s); return g.err || !eq(g.v, c.ref(s)); });
      B[c.helper] = (s) => (typeof c.hRef(s) === 'number' ? c.hRef(s) + 1 : c.hRef(s) + 'q'); const ignores = c.inputs.every((s) => { const g = call(f, s); return !g.err && eq(g.v, c.ref(s)); });
      B[c.helper] = hReal;
      if (own.length || ignores) { fail(c, [c.holder], 'local', ignores ? `${mod(c.holder)}.${c.fn} does not use the result of ${mod(c.impl)}.${c.helper}; it must call it` : `${mod(c.holder)}.${c.fn} is wrong even when ${mod(c.impl)}.${c.helper} is correct, e.g. ${c.fn}(${show(own[0])}) should be ${show(c.ref(own[0]))}`); continue; }
      const bad = c.inputs.map((s) => { const g = call(f, s), h = typeof hReal === 'function' ? call(hReal, s) : { err: 'missing' }; return { s, want: c.ref(s), got: g, h }; }).filter((x) => x.got.err || !eq(x.got.v, x.want));
      if (!bad.length && opts.strict) {
        const hb = c.inputs.map((s) => ({ s, h: typeof hReal === 'function' ? call(hReal, s) : { err: 'missing' } })).filter((x) => { if (x.h.err) return true; try { return !eq(c.comb(x.h.v, x.s), c.ref(x.s)); } catch { return true; } });
        if (hb.length) { fail(c, [c.holder, c.impl], 'directed', `${mod(c.holder)}.${c.fn} passes its own tests, but ${mod(c.impl)}.${c.helper} does not meet the requirement of ${mod(c.holder)}'s team (only that team has it; a caller that works around the helper does not resolve this check), e.g. ${hb.slice(0, inst.shown).map((x) => `${c.helper}(${show(x.s)}) returned ${x.h.err ? `error ${x.h.err}` : show(x.h.v)}`).join('; ')}`); continue; }
      }
      if (bad.length) fail(c, [c.holder, c.impl], 'directed', `${mod(c.holder)}.${c.fn} uses ${mod(c.impl)}.${c.helper} and fails ${bad.length} of ${c.inputs.length} tests${typeof hReal !== 'function' ? ` (${mod(c.impl)}.${c.helper} is missing${errs[c.impl] ? `: ${errs[c.impl]}` : ''})` : ''}, e.g. ${bad.slice(0, inst.shown).map((x) => `${c.fn}(${show(x.s)}) should be ${show(x.want)}, got ${x.got.err ? `error ${x.got.err}` : show(x.got.v)} (${c.helper} returned ${x.h.err ? `error ${x.h.err}` : show(x.h.v)})`).join('; ')}`);
    } else {
      const e = ex[c.prod][c.enc], d = ex[c.cons][c.dec];
      if (typeof e !== 'function' || typeof d !== 'function') { fail(c, [c.prod, c.cons].filter((m, i) => (i ? typeof d : typeof e) !== 'function'), 'local', `${typeof e !== 'function' ? `${mod(c.prod)}.${c.enc}` : `${mod(c.cons)}.${c.dec}`} is missing`); continue; }
      const bad = c.inputs.map((rec) => { const s = call(e, structuredClone(rec)); const back = s.err ? { err: 'not run' } : call(d, s.v); const okStr = !s.err && typeof s.v === 'string' && ALLOWED.test(s.v); return { rec, s, back, okStr }; }).filter((x) => !x.okStr || x.back.err || !eq(x.back.v, x.rec));
      if (bad.length) fail(c, [c.prod, c.cons], 'symmetric', `round trip ${mod(c.cons)}.${c.dec}(${mod(c.prod)}.${c.enc}(rec)) fails ${bad.length} of ${c.inputs.length} tests, e.g. ${bad.slice(0, Math.min(2, inst.shown)).map((x) => `rec ${JSON.stringify(x.rec)}: ${c.enc} gave ${x.s.err ? `error ${x.s.err}` : show(x.s.v)}${x.okStr ? '' : x.s.err ? '' : ' (not an allowed string)'}, ${c.dec} gave ${x.back.err ? `error ${x.back.err}` : show(x.back.v)}`).join('; ')}`);
    }
  }
  return out;
}

export const counts = (vs) => ({ local: vs.filter((v) => v.kind === 'local').length, directed: vs.filter((v) => v.kind === 'directed').length, symmetric: vs.filter((v) => v.kind === 'symmetric').length, total: vs.length });

// ---- requests
export const CODE_SCHEMA = { type: 'object', properties: { code: { type: 'string' } }, required: ['code'], additionalProperties: false };
export const CODE_CHAT_SCHEMA = { type: 'object', properties: { code: { type: 'string' }, messages: { type: 'array', items: { type: 'object', properties: { to: { type: 'string' }, text: { type: 'string' } }, required: ['to', 'text'], additionalProperties: false } } }, required: ['code', 'messages'], additionalProperties: false };
const TRACES = { type: 'array', items: { type: 'object', properties: { check: { type: 'string' }, text: { type: 'string' } }, required: ['check', 'text'], additionalProperties: false } };
export const TRACE_SCHEMA = { type: 'object', properties: { traces: TRACES }, required: ['traces'], additionalProperties: false };
export const CODE_TRACE_SCHEMA = { type: 'object', properties: { code: { type: 'string' }, traces: TRACES }, required: ['code', 'traces'], additionalProperties: false };
export const SOLO_SCHEMA = { type: 'object', properties: { modules: { type: 'array', items: { type: 'object', properties: { module: { type: 'string' }, code: { type: 'string' } }, required: ['module', 'code'], additionalProperties: false } } }, required: ['modules'], additionalProperties: false };
const req = (model, maxTokens, effort, schema, content) => ({ model, max_tokens: maxTokens, output_config: { format: { type: 'json_schema', schema }, ...(effort ? { effort } : {}) }, messages: [{ role: 'user', content }] });
const RULES = (k) => `Modules are plain JavaScript (no require, import or export). Declare each function of your module at top level with "function name(...)". Other modules are reachable as globals ${Array.from({ length: k }, (_, i) => mod(i)).join(', ')}; call a function of another module as e.g. M2.fnName(x). There is no I/O; tests call your functions directly.`;

export function memberRequest(model, inst, m, code, assigned, maxTokens, { effort = null, chat = false, inbox = [], hold = false, instruction = null } = {}) {
  const partners = [...new Set(assigned.flatMap((v) => v.parts).filter((p) => p !== m))];
  const partnerCode = partners.map((p) => `--- current code of ${mod(p)} (read only) ---\n${code[p] || '(empty)'}`).join('\n');
  let t = `You are the developer of module ${mod(m)} in a small JavaScript codebase written by ${inst.k} developers, one module each. You may change only ${mod(m)}.\n${RULES(inst.k)}\nYour module must provide:\n${inst.specs[m].map((x) => `- ${x}`).join('\n')}\n--- current code of ${mod(m)} ---\n${code[m] || '(empty: write it)'}\n`;
  const own = assigned.filter((v) => !v.traceOnly), tr = assigned.filter((v) => v.traceOnly);
  if (own.length) t += `Failing checks you are asked to resolve now:\n${own.map((v) => `- ${v.text}`).join('\n')}\n${partnerCode}\n`;
  else if (tr.length) t += `${partnerCode}\n`;
  if (tr.length) t += `Failing checks on helpers you use but do not own. You cannot fix them by changing your code (do not work around the helper); only the helper's owner can. Leave a trace on each check for that owner: what the helper must return, at most 40 words. Traces stay on the check; the owner reads them next round.\n${tr.map((v) => `- [${v.id}] ${v.text}`).join('\n')}\n`;
  if (instruction) t += `Instruction from your tech lead for this round: ${instruction}\n`;
  if (hold) t += `This round another developer has the turn on these checks: return your current code unchanged; you may only send messages.\n`;
  if (chat) t += `Messages to you from other developers last round:\n${inbox.map((x) => `from ${mod(x.from)}: ${x.text}`).join('\n') || '(none)'}\nBesides your code you may send short messages (at most 40 words each, at most 3) to other developers by module id (e.g. "M4"); they read them next round.\n`;
  if (tr.length && !own.length) { t += `Return your traces in "traces" as {check: "<id in brackets>", text: "..."}. Your code stays as it is.`; return req(model, maxTokens, effort, TRACE_SCHEMA, t); }
  t += `Return the complete new code of ${mod(m)} in "code".${chat ? ' Put messages in "messages" (may be empty).' : ''}${tr.length ? ' Put your traces in "traces" as {check: "<id in brackets>", text: "..."}.' : ''}`;
  return req(model, maxTokens, effort, tr.length ? CODE_TRACE_SCHEMA : chat ? CODE_CHAT_SCHEMA : CODE_SCHEMA, t);
}

// LI9 'manager' arm: a tech lead with every specification sees the failing checks and assigns who changes what.
export const MANAGER_SCHEMA = { type: 'object', properties: { assignments: { type: 'array', items: { type: 'object', properties: { module: { type: 'string' }, instruction: { type: 'string' } }, required: ['module', 'instruction'], additionalProperties: false } } }, required: ['assignments'], additionalProperties: false };
export function managerRequest(model, inst, vs, maxTokens, effort = null) {
  const t = `You are the tech lead of ${inst.k} developers, each owning one module (${Array.from({ length: inst.k }, (_, i) => mod(i)).join(', ')}) of a small JavaScript codebase. You do not write code. Each developer sees only their own module's specification, the failing checks that involve their module, the code of the partner modules in those checks, and your instruction.\nSpecifications:\n${inst.specs.map((s, m) => `Module ${mod(m)} must provide:\n${s.map((x) => `- ${x}`).join('\n')}`).join('\n')}\nFailing checks now:\n${vs.map((v) => `- ${v.text}`).join('\n')}\nDecide which developers should change their module this round, and give each of them one precise instruction (at most 60 words). Developers you do not assign keep their module unchanged this round. Return "assignments" as {module: "M3", instruction: "..."}.`;
  return req(model, maxTokens, effort, MANAGER_SCHEMA, t);
}

export function soloRequest(model, inst, code, vs, maxTokens, effort = null) {
  let t = `Write a small JavaScript codebase of ${inst.k} modules, ${Array.from({ length: inst.k }, (_, i) => mod(i)).join(', ')}.\n${RULES(inst.k)}\n${inst.specs.map((s, m) => `Module ${mod(m)} must provide:\n${s.map((x) => `- ${x}`).join('\n')}`).join('\n')}\n`;
  if (code) t += `Current code:\n${code.map((c, m) => `--- ${mod(m)} ---\n${c || '(empty)'}`).join('\n')}\nFailing checks:\n${vs.map((v) => `- ${v.text}`).join('\n')}\n`;
  t += `Return every module, complete, in "modules" as {module: "M1", code: "..."}.`;
  return req(model, maxTokens, effort, SOLO_SCHEMA, t);
}

// Who acts this round. rule: 'sync' | 'inhibit' | 'routed'. Cross-module violations go to one side under inhibit, and under
// routed when symmetric; local ones always to their owner. Returns Map(member -> violations).
// LI11 rules, one natural mechanism each, no messages:
//   'threshold' (response threshold with noise, Bonabeau/Theraulaz): each side of a failing symmetric edge responds
//               independently with probability 1/2, so symmetry is broken by chance, not by any coordinator; directed: both.
//   'pheromone' (stigmergy with polarity): the requirement is written into the field: a failing directed check goes only
//               to the helper's owner and carries the caller's requirement as a trace on the check; symmetric: one side.
// LI12 rules (polarity on directed edges: only the helper owner may change code for them; symmetric: one side, hash):
//   'polarity'  no trace: the helper owner sees only the failing check
//   'oracle'    = 'pheromone' (the harness writes the caller's requirement on the check)
//   'stig'      the caller's agent writes the trace: it is woken on the check in trace mode (it may not change code for it),
//               its trace persists on the check and is shown to the helper owner from the next wave
export function plan(inst, vs, round, rule, traces = {}) {
  const h = (x) => crypto.createHash('sha256').update(String(x)).digest().readUInt32LE(0), out = new Map();
  const add = (m, v) => { if (!out.has(m)) out.set(m, []); out.get(m).push(v); };
  if (rule === 'oracle') rule = 'pheromone';
  // LI27 'stigwaitboth': stigwait without the one-side tie-break on symmetric checks (both sides act), to separate the trace from the tie-break
  const both = rule === 'stigwaitboth'; if (both) rule = 'stigwait';
  if (rule === 'threshold' || rule === 'pheromone' || rule === 'polarity' || rule === 'stig' || rule === 'stigwait') {
    for (const v of vs) {
      if (v.parts.length === 1) { add(v.parts[0], v); continue; }
      if (v.kind === 'directed') {
        if (rule === 'threshold') { v.parts.forEach((m) => add(m, v)); continue; }
        const c = inst.checks.find((x) => x.id === v.id);
        if (rule === 'polarity') { add(c.impl, v); continue; }
        // LI16 'stigwait': the helper owner acts on a failing directed check only once the caller's trace is on it
        if (rule === 'stigwait') { add(c.holder, { ...v, traceOnly: true }); if (traces[v.id]) add(c.impl, { ...v, text: `${v.text}. Trace left on this check by the developer of ${mod(c.holder)}: ${traces[v.id]}` }); continue; }
        if (rule === 'stig') { add(c.holder, { ...v, traceOnly: true }); add(c.impl, traces[v.id] ? { ...v, text: `${v.text}. Trace left on this check by the developer of ${mod(c.holder)}: ${traces[v.id]}` } : v); continue; }
        add(c.impl, { ...v, text: `${v.text}. Trace left on this check by the caller's team: ${mod(c.impl)}.${c.helper}(s) must return ${c.need}.` });
        continue;
      }
      if (both) { v.parts.forEach((m) => add(m, v)); continue; }
      if (rule === 'threshold') { const on = v.parts.filter((m) => h(`${inst.seed}:${v.id}:${m}:${round}:t`) % 2 === 0); on.forEach((m) => add(m, v)); continue; }
      add(v.parts.reduce((b, m) => (h(`${inst.seed}:${m}:${round}`) > h(`${inst.seed}:${b}:${round}`) ? m : b)), v);
    }
    return out;
  }
  for (const v of vs) {
    if (v.parts.length === 1 || rule === 'sync' || (rule === 'routed' && v.kind === 'directed')) v.parts.forEach((m) => add(m, v));
    else add(v.parts.reduce((b, m) => (h(`${inst.seed}:${m}:${round}`) > h(`${inst.seed}:${b}:${round}`) ? m : b)), v);
  }
  return out;
}

// GN1 (family.mjs, tasks/GN1-MEMORY-PREREG.md) builds related cases from the same pools and draws. makeInstance does not
// read this export, so every instance above is unchanged (family.test.mjs checks fingerprints of earlier instances).
export const POOLS = Object.freeze({ LIB, COMBINE, VERBS, NOUNS, VERBS2, NOUNS2, RECS, RECS2, FIELDS, SEPS, LSEPS, BOOLS, int, pick, shuffle, word, wordRun, mod });
