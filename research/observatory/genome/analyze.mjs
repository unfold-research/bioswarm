// G1 analysis: consensus matrix, reliability, the preregistered tests H-G01..07, and the exploratory tables.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, TRAITS, SPECIES, TRAIT_IDS, CODERS, consensus, collapse, cohenKappa, fisherGreater, jaccard, mulberry32 } from './lib.mjs';
import { parseResults } from './parse.mjs';

const OUT = (process.env.G1_OUT || path.join(ROOT, 'results/genome-g1'));
const A = parseResults('A'), B = parseResults('B');
const cites = fs.existsSync(path.join(OUT, 'citations.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'citations.json'), 'utf8')).summary : null;
const refStatus = new Map();
if (fs.existsSync(path.join(OUT, 'citations-by-cell.jsonl')))
  for (const l of fs.readFileSync(path.join(OUT, 'citations-by-cell.jsonl'), 'utf8').split('\n').filter(Boolean)) {
    const x = JSON.parse(l), k = `${x.coder}|${x.sp}|${x.trait}`; (refStatus.get(k) || refStatus.set(k, []).get(k)).push(x);
  }

// ---- matrix ----
const species = SPECIES.map((sp) => {
  const a = A[sp.id]?.ok ? A[sp.id].data : null, b = B[sp.id]?.ok ? B[sp.id].data : null;
  const cells = Object.fromEntries(TRAIT_IDS.map((id) => {
    const ca = a?.traits[id], cb = b?.traits[id];
    const refs = [...(refStatus.get(`A|${sp.id}|${id}`) || []), ...(refStatus.get(`B|${sp.id}|${id}`) || [])]
      .map((r) => ({ coder: r.coder, authors: r.authors, year: r.year, title: r.title, doi: r.doi, status: r.status, foundDoi: r.foundDoi }));
    return [id, { c: consensus(ca, cb), a: ca?.state ?? null, b: cb?.state ?? null,
      s: ca && cb ? (ca.strength + cb.strength) / 2 : (ca ?? cb)?.strength ?? 0,
      ea: ca?.evidence || '', eb: cb?.evidence || '', refs }];
  }));
  return { ...sp, coded: { A: !!a, B: !!b }, conditions: a?.conditions ?? b?.conditions ?? null, conditionsB: b?.conditions ?? null, noteA: a?.note || '', noteB: b?.note || '', cells };
});
const coded = species.filter((s) => s.coded.A && s.coded.B);

// ---- H-G01 reliability ----
const pairs = coded.flatMap((s) => TRAIT_IDS.map((id) => [collapse(s.cells[id].a), collapse(s.cells[id].b)]));
const kappa = cohenKappa(pairs);
const kappaByTrait = Object.fromEntries(TRAIT_IDS.map((id) => [id, cohenKappa(coded.map((s) => [collapse(s.cells[id].a), collapse(s.cells[id].b)]))]));
const agreeRate = pairs.filter(([x, y]) => x === y).length / pairs.length;
const doiShare = cites ? cites.withDoi.verified / Math.max(1, cites.withDoi.n) : null;
const counts = { P: 0, A: 0, U: 0, C: 0 }; for (const s of species) for (const id of TRAIT_IDS) counts[s.cells[id].c]++;

// ---- tests ----
const cond = (s, k) => s.conditions?.[k];
const inGroup = {
  'H-G02': (s) => (cond(s, 'C-PROB') || []).includes('site-choice'),
  'H-G03': (s) => cond(s, 'C-PERM') === 'permanent' && ['clonal', 'high'].includes(cond(s, 'C-REL')),
  'H-G04': (s) => cond(s, 'C-SIZE') >= 3,
  'H-G05': (s) => cond(s, 'C-SIZE') < 2 && ['medium', 'high'].includes(cond(s, 'C-COG')),
  'H-G06': (s) => ['fast', 'medium'].includes(cond(s, 'C-VAR')),
};
function fisherFor(set, trait, g) {
  const rows = set.filter((s) => ['P', 'A'].includes(s.cells[trait].c));
  const a = rows.filter((s) => g(s) && s.cells[trait].c === 'P').length, b = rows.filter((s) => g(s) && s.cells[trait].c === 'A').length;
  const c = rows.filter((s) => !g(s) && s.cells[trait].c === 'P').length, d = rows.filter((s) => !g(s) && s.cells[trait].c === 'A').length;
  const rIn = a + b ? a / (a + b) : null, rOut = c + d ? c / (c + d) : null;
  return { table: [[a, b], [c, d]], n: rows.length, rateIn: rIn, rateOut: rOut, p: fisherGreater(a, b, c, d), absentCells: b + d, noPower: b + d === 0 };
}
const rnd = mulberry32(20261113);
function oneperGroup(set) { const by = {}; for (const s of set) (by[s.group] ||= []).push(s); return Object.values(by).map((xs) => xs[Math.floor(rnd() * xs.length)]); }
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
function sensitivity(set, trait, g) { const ps = []; for (let i = 0; i < 1000; i++) ps.push(fisherFor(oneperGroup(set), trait, g).p); return median(ps); }
const verdict = (r) => r.rateIn === null || r.rateOut === null ? 'untestable' : r.p < 0.05 && r.rateIn > r.rateOut ? 'supported' : 'refuted';

const H = {};
H['H-G01'] = { kappa, agreeRate, doiShare, verdict: kappa === null || doiShare === null ? 'incomplete' : kappa >= 0.6 && doiShare >= 0.8 ? 'supported' : 'refuted' };
for (const [h, trait] of [['H-G02', 'DEC-01'], ['H-G03', 'DEF-03'], ['H-G05', 'DOL-04']]) {
  const r = fisherFor(coded, trait, inGroup[h]); H[h] = { trait, ...r, sensitivityMedianP: sensitivity(coded, trait, inGroup[h]), verdict: verdict(r) };
}
{ const r1 = fisherFor(coded, 'DOL-01', inGroup['H-G04']), r2 = fisherFor(coded, 'ACT-04', inGroup['H-G04']);
  H['H-G04'] = { 'DOL-01': { ...r1, sensitivityMedianP: sensitivity(coded, 'DOL-01', inGroup['H-G04']) }, 'ACT-04': { ...r2, sensitivityMedianP: sensitivity(coded, 'ACT-04', inGroup['H-G04']) },
    verdict: verdict(r1) === 'supported' && verdict(r2) === 'supported' ? 'supported' : [r1, r2].some((r) => verdict(r) === 'untestable') ? 'untestable' : 'refuted' }; }
{ const sub = coded.filter((s) => s.cells['FLD-01'].c === 'P'); const r = fisherFor(sub, 'FLD-02', inGroup['H-G06']);
  H['H-G06'] = { trait: 'FLD-02', within: 'FLD-01 = P', systems: sub.length, ...r, sensitivityMedianP: sub.length >= 8 ? sensitivity(sub, 'FLD-02', inGroup['H-G06']) : null,
    verdict: sub.length < 8 ? 'untestable' : verdict(r) }; }
// H-G07
const Pset = (s) => new Set(TRAIT_IDS.filter((id) => s.cells[id].c === 'P'));
const isInsect = (s) => ['hymenoptera', 'termite'].includes(s.group), isVert = (s) => ['fish', 'bird', 'mammal'].includes(s.group), isUnseen = (s) => s.realm === 'unseen';
function g7(set, label) {
  const U = set.filter((s) => label(s) === 'U'), I = set.filter((s) => label(s) === 'I'), V = set.filter((s) => label(s) === 'V');
  const mean = (X, Y) => { let t = 0, n = 0; for (const x of X) for (const y of Y) { t += jaccard(Pset(x), Pset(y)); n++; } return n ? t / n : 0; };
  return mean(U, I) - mean(U, V);
}
{ const set = coded.filter((s) => isUnseen(s) || isInsect(s) || isVert(s)); const lab0 = (s) => (isUnseen(s) ? 'U' : isInsect(s) ? 'I' : 'V');
  const obs = g7(set, lab0); const labels = set.map(lab0); let ge = 0;
  for (let i = 0; i < 10000; i++) { const sh = [...labels]; for (let j = sh.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [sh[j], sh[k]] = [sh[k], sh[j]]; }
    const m = new Map(set.map((s, j) => [s.id, sh[j]])); if (g7(set, (s) => m.get(s.id)) >= obs) ge++; }
  const mean = (X, Y) => { let t = 0, n = 0; for (const x of X) for (const y of Y) { t += jaccard(Pset(x), Pset(y)); n++; } return t / n; };
  const U = set.filter(isUnseen), I = set.filter(isInsect), V = set.filter(isVert);
  H['H-G07'] = { unseenInsects: mean(U, I), unseenVertebrates: mean(U, V), difference: obs, permutationP: (ge + 1) / 10001, verdict: obs > 0 && (ge + 1) / 10001 < 0.05 ? 'supported' : 'refuted' }; }

// ---- exploratory ----
const prevalence = Object.fromEntries(TRAIT_IDS.map((id) => {
  const c = species.map((s) => s.cells[id].c);
  return [id, { P: c.filter((x) => x === 'P').length, A: c.filter((x) => x === 'A').length, U: c.filter((x) => x === 'U').length, C: c.filter((x) => x === 'C').length,
    seenP: species.filter((s) => s.realm === 'seen' && s.cells[id].c === 'P').length, unseenP: species.filter((s) => s.realm === 'unseen' && s.cells[id].c === 'P').length }];
}));
// trait co-occurrence (phi over systems where both cells are P or A)
const cooc = [];
for (let i = 0; i < TRAIT_IDS.length; i++) for (let j = i + 1; j < TRAIT_IDS.length; j++) {
  const x = TRAIT_IDS[i], y = TRAIT_IDS[j]; let n11 = 0, n10 = 0, n01 = 0, n00 = 0;
  for (const s of coded) { const a = s.cells[x].c, b = s.cells[y].c; if (!['P', 'A'].includes(a) || !['P', 'A'].includes(b)) continue;
    if (a === 'P' && b === 'P') n11++; else if (a === 'P') n10++; else if (b === 'P') n01++; else n00++; }
  const n = n11 + n10 + n01 + n00, den = Math.sqrt((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00));
  if (n >= 15 && den > 0) cooc.push({ x, y, n, phi: (n11 * n00 - n10 * n01) / den, both: n11 });
}
cooc.sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));
// species clustering: average linkage on 1 - Jaccard of P sets; leaf order for the atlas
function cluster(items, dist) {
  let C = items.map((x, i) => ({ ids: [i], order: [i] }));
  const d = (a, b) => { let t = 0; for (const i of a.ids) for (const j of b.ids) t += dist(i, j); return t / (a.ids.length * b.ids.length); };
  const merges = [];
  while (C.length > 1) { let best = [0, 1, Infinity]; for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) { const v = d(C[i], C[j]); if (v < best[2]) best = [i, j, v]; }
    const [i, j, v] = best, m = { ids: [...C[i].ids, ...C[j].ids], order: [...C[i].order, ...C[j].order] }; merges.push({ size: m.ids.length, height: v, members: m.ids });
    C = C.filter((_, k) => k !== i && k !== j).concat([m]); }
  return { order: C[0].order, merges };
}
const sets = species.map(Pset);
const sp = cluster(species, (i, j) => 1 - jaccard(sets[i], sets[j]));
const tsets = TRAIT_IDS.map((id) => new Set(species.filter((s) => s.cells[id].c === 'P').map((s) => s.id)));
const tr = cluster(TRAIT_IDS, (i, j) => 1 - jaccard(tsets[i], tsets[j]));
// cut the species tree into k groups for the atlas
function cut(merges, n, k) { const label = Array.from({ length: n }, (_, i) => i); const find = (x) => (label[x] === x ? x : (label[x] = find(label[x])));
  for (const m of merges.slice(0, n - k)) { const r = find(m.members[0]); for (const x of m.members) label[find(x)] = r; }
  const roots = [...new Set(Array.from({ length: n }, (_, i) => find(i)))]; return Array.from({ length: n }, (_, i) => roots.indexOf(find(i))); }
const groups = cut(sp.merges, species.length, 6);

// flags never tested on LLM agents, ranked by how common their trait is in nature
const flagsMd = fs.readFileSync(path.join(ROOT, 'research/FLAGS.md'), 'utf8');
// a row can carry several statuses; keep the strongest evidence: positive-eng > null-llm > sim-support > untested > lens
const RANK = ['lens', 'untested', 'sim-support', 'null-llm', 'positive-eng'];
const flagStatus = {}; for (const line of flagsMd.split('\n')) { const m = line.match(/^\| `([a-z_]+)`(?: \/ `([a-z_]+)`)?/); if (!m) continue;
  const cellsMd = line.split('|'), statusCell = cellsMd[cellsMd.length - 2] || '';
  const found = [...statusCell.matchAll(/`([a-z-]+)`/g)].map((x) => x[1]).filter((x) => RANK.includes(x));
  const best = found.sort((a, b) => RANK.indexOf(b) - RANK.indexOf(a))[0] || 'untested';
  for (const f of [m[1], m[2]].filter(Boolean)) flagStatus[f] = best; }
const backlog = TRAITS.traits.map((t) => ({ id: t.id, name: t.name, P: prevalence[t.id].P, flags: t.flags.map((f) => ({ f, status: flagStatus[f] || 'no-flag' })) }))
  .map((t) => ({ ...t, tested: t.flags.some((x) => ['null-llm', 'positive-eng'].includes(x.status)) })).sort((a, b) => b.P - a.P);

// distance of each system to the P1 presets (dominant primitives)
const primitivesOf = (s) => { const m = {}; for (const t of TRAITS.traits) if (s.cells[t.id].c === 'P') for (const p of t.primitives) m[p] = (m[p] || 0) + 1; return m; };

const analysis = {
  version: 'G1', generated: new Date().toISOString(),
  coverage: { systems: species.length, codedBoth: coded.length, failures: { A: Object.entries(A).filter(([, r]) => !r.ok).map(([k, r]) => [k, r.error, r.stop]), B: Object.entries(B).filter(([, r]) => !r.ok).map(([k, r]) => [k, r.error, r.stop]) } },
  cells: counts, reliability: { kappa, agreeRate, kappaByTrait }, citations: cites, hypotheses: H,
  prevalence, cooccurrence: cooc.slice(0, 40), backlog,
  speciesOrder: sp.order.map((i) => species[i].id), speciesGroups: Object.fromEntries(species.map((s, i) => [s.id, groups[i]])),
  traitOrder: tr.order.map((i) => TRAIT_IDS[i]),
  primitives: Object.fromEntries(species.map((s) => [s.id, primitivesOf(s)])),
};
fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(analysis, null, 1));
fs.writeFileSync(path.join(OUT, 'matrix.json'), JSON.stringify({ version: 'G1', traits: TRAITS, species, order: { species: analysis.speciesOrder, traits: analysis.traitOrder, groups: analysis.speciesGroups } }));
console.log(JSON.stringify({ coverage: analysis.coverage, cells: counts, kappa, agreeRate, doiShare, H: Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.verdict])) }, null, 1));
