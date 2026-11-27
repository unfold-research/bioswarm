// GN1 case families (tasks/GN1-MEMORY-PREREG.md, build B3). A related sequence is three cases on the same k modules
// (member m owns module m in every case). Case 1 is makeInstance(k, seed, shape) itself. Cases 2 and 3 are drawn from case 1
// with the same rng discipline as makeInstance (own rng stream per case):
//   directed   a fraction f of case 1's directed edges repeats (same caller and helper modules, same helper requirement:
//              the same LIB entry and parameter); fresh function names, fresh combination, fresh test inputs. The rest
//              are new edges drawn as in makeInstance, on module pairs that carried no directed edge earlier in the sequence.
//   symmetric  the same fraction f repeats (same producer and consumer, record name, fields and both house styles, so the
//              same specification lines); fresh test records. The rest are new, on fresh pairs with fresh record names.
//   local      all new.
// Which edges repeat is chosen by a hash of the sequence seed and the edge id, exactly round(f * n) edges, the same set in
// cases 2 and 3. A control sequence is three unrelated cases: makeInstance with three fresh seeds.
// makeInstance and every earlier instance are unchanged (family.test.mjs pins their fingerprints).
import crypto from 'node:crypto';
import { makeInstance, POOLS } from './code.mjs';
import { rng } from '../ne/tasks.mjs';

const { LIB, COMBINE, VERBS, NOUNS, VERBS2, NOUNS2, RECS, RECS2, FIELDS, SEPS, LSEPS, BOOLS, int, pick, shuffle, word, wordRun, mod } = POOLS;
export const GN1_SHAPE = Object.freeze({ local: 2, directed: 160, symmetric: 53, tests: 16, shown: 3 });
export const GN1_F = 0.5;
// Pools used only by family cases 2 and 3: three cases of 480 fresh function names (k80) exceed VERBS x NOUNS plus
// VERBS2 x NOUNS2, and fresh record names for two cases of new symmetric edges exceed RECS plus RECS2.
const VERBS3 = ['poll', 'quote', 'rate', 'sort', 'test', 'vet', 'wrap', 'yield', 'bind', 'cast', 'dock', 'emit', 'fuse', 'grip', 'hone', 'jot', 'keep', 'link', 'map', 'pin'];
const NOUNS3 = ['Atom', 'Chip', 'Digit', 'Echo', 'Flag', 'Glyph', 'Index', 'Kernel', 'Layer', 'Motif', 'Nib', 'Pixel', 'Quill', 'Rune', 'Shard', 'Tile'];
const RECS3 = ['Kiosk', 'Bundle', 'Coupon', 'Rebate', 'Tariff', 'Toll', 'Fare', 'Ballot', 'Census', 'Charter', 'Dossier', 'Errand', 'Festival', 'Gallery', 'Harvest', 'Itinerary', 'Journal', 'Kitchen', 'Lottery', 'Mission', 'Nursery', 'Outlet', 'Pantry', 'Quarry', 'Raffle', 'Studio', 'Tenant', 'Utility', 'Vessel', 'Warrant', 'Yard', 'Zoning', 'Anthem', 'Bakery', 'Canteen', 'Depot', 'Estate', 'Fleet', 'Garage', 'Hostel', 'Inbox', 'Jetty', 'Kennel', 'Lab', 'Market', 'Notary', 'Office', 'Pier', 'Quota', 'Relay', 'Siding', 'Tavern', 'Upload', 'Vault', 'Wharf', 'Arcade', 'Bazaar', 'Cellar', 'Diner', 'Forum'];
const ALL_VERBS = VERBS.concat(VERBS2, VERBS3), ALL_NOUNS = NOUNS.concat(NOUNS2, NOUNS3), ALL_RECS = RECS.concat(RECS2, RECS3);

const hash32 = (x) => crypto.createHash('sha256').update(String(x)).digest().readUInt32LE(0);
// the edges of case 1 that repeat: exactly round(f * n), lowest hash of (sequence, edge id) first; same for cases 2 and 3
export function repeatSet(seed, ids, f = GN1_F) {
  const n = Math.round(f * ids.length), h = new Map(ids.map((id) => [id, hash32(`gn1:${seed}:${id}`)]));
  return new Set(ids.slice().sort((a, b) => h.get(a) - h.get(b) || (a < b ? -1 : 1)).slice(0, n));
}
const recName = (c) => c.enc.slice('encode'.length);
const fieldType = (v) => (typeof v === 'number' ? 'int' : typeof v === 'boolean' ? 'bool' : Array.isArray(v) ? 'words' : 'word');
const record = (r, fields) => Object.fromEntries(fields.map(([n, t]) => [n, t === 'int' ? int(r, 0, 999) : t === 'word' ? word(r) : t === 'words' ? Array.from({ length: int(r, 0, 3) }, () => word(r, 2, 6)) : r() < 0.5]));
// names and module pairs a case of the sequence has used (later cases avoid them for new edges and new names)
function usage(inst) {
  return { names: new Set([...inst.names.flat(), ...inst.checks.filter((c) => c.kind === 'symmetric').map(recName)]),
    dpairs: new Set(inst.checks.filter((c) => c.kind === 'directed').map((c) => `${c.holder}>${c.impl}`)),
    spairs: new Set(inst.checks.filter((c) => c.kind === 'symmetric').map((c) => `${Math.min(c.prod, c.cons)}-${Math.max(c.prod, c.cons)}`)) };
}
const join = (a, b) => ({ names: new Set([...a.names, ...b.names]), dpairs: new Set([...a.dpairs, ...b.dpairs]), spairs: new Set([...a.spairs, ...b.spairs]) });

// Case c (2 or 3) of the related sequence whose case 1 is inst1; prior = what earlier cases of the sequence used.
function relatedCase(inst1, c, shape, f, prior) {
  const { k } = inst1, { local, directed, symmetric, tests } = shape, r = rng(`rcfam:${k}:${inst1.seed}:${c}`), used = new Set(prior.names);
  const fname = () => { for (;;) { const n = pick(r, ALL_VERBS) + pick(r, ALL_NOUNS); if (!used.has(n)) { used.add(n); return n; } } };
  const lib = () => { const L = pick(r, LIB), p = L.p ? L.p(r) : undefined; return { t: L.t, spec: L.spec(p), ref: L.ref(p) }; };
  const inputs = () => Array.from({ length: tests }, () => wordRun(r));
  const checks = [], specs = Array.from({ length: k }, () => []);
  for (let m = 0; m < k; m++) for (let j = 0; j < local; j++) { const fn = fname(), L = lib(); specs[m].push(`${fn}(s): returns ${L.spec}.`); checks.push({ id: `L:${mod(m)}.${fn}`, kind: 'local', owner: m, fn, ref: L.ref, inputs: inputs(), repeat: false }); }
  // directed: the repeated case-1 edges keep their modules and requirement; new edges on pairs never used for one before
  const d1 = inst1.checks.filter((x) => x.kind === 'directed'), rd = repeatSet(inst1.seed, d1.map((x) => x.id), f);
  const rep = d1.filter((x) => rd.has(x.id)).map((x) => ({ a: x.holder, b: x.impl, L: { t: typeof x.hRef('abc') === 'number' ? 'int' : 'str', spec: x.need, ref: x.hRef }, from: x.id }));
  const fresh = shuffle(r, Array.from({ length: k * k }, (_, i) => [Math.floor(i / k), i % k]).filter(([a, b]) => a !== b && !prior.dpairs.has(`${a}>${b}`))).slice(0, directed - rep.length);
  if (rep.length + fresh.length !== directed) throw Error(`family case ${c}: not enough fresh directed pairs`);
  const edges = shuffle(r, rep.concat(fresh.map(([a, b]) => ({ a, b, L: lib(), from: null }))));
  for (const { a, b, L, from } of edges) {
    const fn = fname(), h = fname(), C = L.t === 'int' ? COMBINE.int[0](int(r, 2, 4), int(r, 1, 9)) : pick(r, COMBINE.str)();
    // the same specification lines as makeInstance (code.mjs)
    specs[a].push(`${fn}(s): returns ${C.spec(`${mod(b)}.${h}`)}. It must call ${mod(b)}.${h} (owned by the developer of ${mod(b)}) rather than reimplement it. What ${h}(s) must return (your team's requirement; the developer of ${mod(b)} does not have this specification): ${L.spec}.`);
    specs[b].push(`${h}(s): a helper used by the developer of ${mod(a)}. Its required behaviour is defined by that developer's team; you do not have its specification.`);
    checks.push({ id: `D:${mod(a)}.${fn}>${mod(b)}.${h}`, kind: 'directed', holder: a, impl: b, fn, helper: h, need: L.spec, hRef: L.ref, comb: C.ref, ref: (s) => C.ref(L.ref(s), s), inputs: inputs(), repeat: !!from, from });
  }
  // symmetric: repeated edges copy case 1's two specification lines (same names, fields and house styles), fresh records
  const s1 = inst1.checks.filter((x) => x.kind === 'symmetric'), rs = repeatSet(inst1.seed, s1.map((x) => x.id), f);
  const srep = s1.filter((x) => rs.has(x.id));
  const sfresh = shuffle(r, Array.from({ length: k * k }, (_, i) => [Math.floor(i / k), i % k]).filter(([a, b]) => a < b && !prior.spairs.has(`${a}-${b}`))).slice(0, symmetric - srep.length);
  if (srep.length + sfresh.length !== symmetric) throw Error(`family case ${c}: not enough fresh symmetric pairs`);
  const rule = `The string may contain only lowercase letters, digits and the characters | ; , / ~ # + . _ = - (so not JSON).`;
  for (const e of shuffle(r, srep.map((x) => ({ x })).concat(sfresh.map((p) => ({ p }))))) {
    if (e.x) {
      const x = e.x, la = inst1.specs[x.prod].find((l) => l.startsWith(`${x.enc}(rec):`)), lb = inst1.specs[x.cons].find((l) => l.startsWith(`${x.dec}(str):`));
      const fields = Object.entries(x.inputs[0]).map(([n, v]) => [n, fieldType(v)]);
      specs[x.prod].push(la); specs[x.cons].push(lb);
      checks.push({ id: x.id, kind: 'symmetric', prod: x.prod, cons: x.cons, enc: x.enc, dec: x.dec, inputs: Array.from({ length: tests }, () => record(r, fields)), repeat: true, from: x.id });
      continue;
    }
    // a new edge: as in makeInstance, with a record name no earlier case of the sequence used
    const [x, y] = e.p, [a, b] = r() < 0.5 ? [x, y] : [y, x], R = pick(r, ALL_RECS.filter((n) => !used.has(n))); used.add(R);
    const fields = shuffle(r, FIELDS).slice(0, 3), style = () => ({ sep: pick(r, SEPS), lsep: pick(r, LSEPS), bool: pick(r, BOOLS), order: shuffle(r, fields.map((q) => q[0])) });
    let sa = style(), sb = style(); while (sb.sep === sa.sep && sb.order.join() === sa.order.join()) sb = style();
    const shp = fields.map(([n, t]) => `${n} (${t === 'int' ? 'integer 0-999' : t === 'word' ? 'lowercase word' : t === 'words' ? 'array of 0 to 3 lowercase words' : 'boolean'})`).join(', ');
    const house = (s) => `your team's house style is to put the fields in the order ${s.order.join(', ')}, separated by "${s.sep}"${fields.some((q) => q[1] === 'words') ? `, list items joined by "${s.lsep}"` : ''}${fields.some((q) => q[1] === 'bool') ? `, booleans as "${s.bool[0]}"/"${s.bool[1]}"` : ''}. The house style is a preference, not a requirement: what matters is that the two functions agree.`;
    const enc = `encode${R}`, dec = `decode${R}`;
    specs[a].push(`${enc}(rec): turns a ${R} record {${shp}} into a string that ${mod(b)}.${dec} (owned by the developer of ${mod(b)}) turns back into an equal record. ${rule} The exact format is not fixed by anyone; ${house(sa)}`);
    specs[b].push(`${dec}(str): turns a string produced by ${mod(a)}.${enc} (owned by the developer of ${mod(a)}) back into the ${R} record {${shp}} it came from (same field names and types; arrays in the same order). ${rule.replace('The string may', 'Such strings')} The exact format is not fixed by anyone; ${house(sb)}`);
    checks.push({ id: `S:${mod(a)}.${enc}~${mod(b)}.${dec}`, kind: 'symmetric', prod: a, cons: b, enc, dec, inputs: Array.from({ length: tests }, () => record(r, fields)), repeat: false, from: null });
  }
  const names = specs.map((_, m) => [...new Set([...checks.filter((x) => x.owner === m).map((x) => x.fn), ...checks.filter((x) => x.holder === m).map((x) => x.fn), ...checks.filter((x) => x.impl === m).map((x) => x.helper), ...checks.filter((x) => x.prod === m).map((x) => x.enc), ...checks.filter((x) => x.cons === m).map((x) => x.dec)])]);
  return { k, seed: `${inst1.seed}.${c}`, case: c, family: 'related', specs, checks, names, shown: shape.shown, hash: crypto.createHash('sha256').update(JSON.stringify(specs)).digest('hex').slice(0, 12) };
}

// The cases of one sequence. type 'related': case 1 = makeInstance(k, seed, shape), cases 2.. from it. type 'control':
// unrelated cases, makeInstance(k, seed) then makeInstance(k, '<seed>.<c>') (fresh seeds, f = 0).
export function makeSequence(seed, { type = 'related', cases = 3, k = 80, shape = GN1_SHAPE, f = GN1_F } = {}) {
  const out = [];
  for (let c = 1; c <= cases; c++) {
    if (c === 1 || type === 'control') { const inst = makeInstance(k, c === 1 ? seed : `${seed}.${c}`, shape); out.push(Object.assign(inst, { case: c, family: type })); continue; }
    const prior = out.map(usage).reduce(join);
    out.push(relatedCase(out[0], c, shape, f, prior));
  }
  return out;
}

// firstPassFailing split by check type and, for directed and symmetric checks, by repeated against new edge.
// failingIds: ids of the checks failing after the first act wave (a check counts once whatever the violation kind).
export function firstPassBreakdown(inst, failingIds) {
  const by = new Map(inst.checks.map((c) => [c.id, c])), out = { total: 0, local: 0, directed: 0, symmetric: 0, repeated: 0, new: 0, directedRepeated: 0, directedNew: 0, symmetricRepeated: 0, symmetricNew: 0 };
  for (const id of new Set(failingIds)) {
    const c = by.get(id); if (!c) throw Error(`unknown check ${id}`);
    out.total++; out[c.kind]++;
    if (c.kind === 'local') continue;
    const e = c.repeat ? 'Repeated' : 'New'; out[e === 'Repeated' ? 'repeated' : 'new']++; out[c.kind + e]++;
  }
  return out;
}
