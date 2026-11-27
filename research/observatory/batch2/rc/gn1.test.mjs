// Checks for GN1 build B3 (tasks/GN1-MEMORY-PREREG.md): family structure, earlier instances unchanged, note cutting, the
// stage-0 oracle, the firstPassFailing breakdown, the analysis rule, the cost rule, the bench gate, and the runner end to
// end on a stub model (no network, no ledger). Run: node observatory/batch2/rc/gn1.test.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeInstance, check, memberRequest } from './code.mjs';
import { makeSequence, repeatSet, firstPassBreakdown, GN1_SHAPE } from './family.mjs';
import { cutToTokens, bytesCounter, apiCounter, parseLibrary, libraryRead, withNotes, noteRequest, NOTES_HEAD, SEEN_MAX } from './notes.mjs';
import { idealItems, stage0, stage0Gate } from './gn1-oracle.mjs';
import { runGN1, projectCost, sequencesOf, runConfig, recordName, requireRecord } from './run-gn1.mjs';
import { batchBackend, chooseSample, fits, partRoom, nextPart, journalSpent, capStopReport } from './gn1-batch.mjs';
import { spawnSync } from 'node:child_process';
import { fakeBackend } from './gn1-fake.mjs';
import { signOneSided, compare, analyse, VERDICTS, IMPLEMENTATION_CHOICES, h5Statement } from './analyze-gn1.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'observatory/batch2/gn1/bench.json'), 'utf8'));

// ---- 1. makeInstance and earlier instances unchanged (fingerprints taken on main at 9d2f864, before B3)
const fingerprint = (inst) => sha(JSON.stringify({ k: inst.k, seed: inst.seed, specs: inst.specs, names: inst.names, shown: inst.shown, hash: inst.hash,
  checks: inst.checks.map((c) => ({ ...Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v !== 'function')), src: Object.entries(c).filter(([, v]) => typeof v === 'function').map(([n, v]) => n + ':' + v.toString()),
    out: c.kind === 'symmetric' ? null : c.inputs.map((s) => [c.ref(s), c.hRef ? c.hRef(s) : null]) })) }));
const OLD = [[5, 1, undefined, '31b28d3fb1acc35b2e724cc46a29d12cdd6e745fd36ed2699152cc6f5535f241'], [12, 8, { local: 2, directed: 12, symmetric: 6, tests: 6, shown: 3 }, '356b7f22dae721bfac9083327b53e481d5dd40abb4c10841a60f4ce006e463ff'],
  [40, 7, { local: 2, directed: 40, symmetric: 30, tests: 8, shown: 3 }, 'c12007fdfeafba1b46f01c62559088b74a42cffe39340e2b57cec0145b3416ba'], [80, 19000, { local: 2, directed: 160, symmetric: 60, tests: 8, shown: 3 }, '851bb33cc4d37d3ef1ac1d0985b8315bc26b9f9a0d20c74ae281da3f808337fd'],
  [80, 36000, { local: 2, directed: 160, symmetric: 53, tests: 16, shown: 3 }, '86332630c93b2deae4237b719bf7f62f7224175eb98071e281e1cfbd9b773596'], [160, 38400, { local: 2, directed: 320, symmetric: 80, tests: 16, shown: 3 }, 'f4bbd65a1d63a6538336855a53b9838d4e2e50774436606725950ba17eceb7d9']];
for (const [k, seed, shape, want] of OLD) assert.equal(fingerprint(makeInstance(k, seed, shape)), want, `instance k${k} s${seed} changed`);
assert.equal(sha(makeInstance.toString()), '7b330415487aee7f42860730462e63cc92163a87a81b32ebf973b17be019bcf3', 'makeInstance source changed');

// ---- 2. family structure
const seq = makeSequence(51000), [c1, c2, c3] = seq, kinds = (i, kd) => i.checks.filter((c) => c.kind === kd);
assert.equal(seq.length, 3);
assert.equal(fingerprint(c1), fingerprint(makeInstance(80, 51000, GN1_SHAPE)), 'case 1 is makeInstance itself');
for (const i of seq) {
  assert.equal(i.k, 80); assert.equal(kinds(i, 'local').length, 160); assert.equal(kinds(i, 'directed').length, 160); assert.equal(kinds(i, 'symmetric').length, 53); assert.equal(i.shown, 3);
  for (const c of i.checks) assert.equal(c.inputs.length, 16);
  assert.equal(new Set(kinds(i, 'directed').map((c) => `${c.holder}>${c.impl}`)).size, 160, 'directed pairs distinct');
  assert.equal(new Set(kinds(i, 'symmetric').map((c) => c.enc)).size, 53, 'record names distinct');
  for (let m = 0; m < 80; m++) assert.equal(kinds(i, 'local').filter((c) => c.owner === m).length, 2);
}
assert.equal(fingerprint(makeSequence(51000)[1]), fingerprint(c2), 'deterministic');
const d1 = new Map(kinds(c1, 'directed').map((c) => [c.id, c])), s1 = new Map(kinds(c1, 'symmetric').map((c) => [c.id, c]));
const names1 = new Set(c1.names.flat()), fn = (i) => new Set(i.checks.flatMap((c) => (c.kind === 'local' ? [c.fn] : c.kind === 'directed' ? [c.fn, c.helper] : [])));
for (const [i, earlier] of [[c2, [c1]], [c3, [c1, c2]]]) {
  const rd = kinds(i, 'directed').filter((c) => c.repeat), rs = kinds(i, 'symmetric').filter((c) => c.repeat);
  assert.equal(rd.length, 80, 'f = 0.5 of 160 directed edges repeat'); assert.equal(rs.length, 27, 'f = 0.5 of 53 symmetric edges repeat (round(26.5) = 27)');
  for (const c of rd) { const o = d1.get(c.from); assert.ok(o); assert.equal(c.holder, o.holder); assert.equal(c.impl, o.impl); assert.equal(c.need, o.need);
    for (const s of ['abcde', 'zzyxw', 'hello', 'aabbcc']) assert.deepEqual(c.hRef(s), o.hRef(s), 'same LIB entry and parameter');
    assert.notEqual(c.fn, o.fn); assert.notEqual(c.helper, o.helper); assert.notDeepEqual(c.inputs, o.inputs); }
  for (const c of rs) { const o = s1.get(c.from); assert.equal(c.id, o.id); assert.equal(c.prod, o.prod); assert.equal(c.cons, o.cons);
    assert.ok(i.specs[c.prod].includes(c1.specs[o.prod].find((l) => l.startsWith(`${o.enc}(rec):`))), 'same producer line (fields, house style)');
    assert.ok(i.specs[c.cons].includes(c1.specs[o.cons].find((l) => l.startsWith(`${o.dec}(str):`))), 'same consumer line');
    assert.deepEqual(Object.keys(c.inputs[0]), Object.keys(o.inputs[0])); assert.notDeepEqual(c.inputs, o.inputs, 'fresh records'); }
  const prevD = new Set(earlier.flatMap((e) => kinds(e, 'directed').map((c) => `${c.holder}>${c.impl}`))), prevS = new Set(earlier.flatMap((e) => kinds(e, 'symmetric').map((c) => `${Math.min(c.prod, c.cons)}-${Math.max(c.prod, c.cons)}`)));
  const prevR = new Set(earlier.flatMap((e) => kinds(e, 'symmetric').map((c) => c.enc)));
  for (const c of kinds(i, 'directed').filter((x) => !x.repeat)) assert.ok(!prevD.has(`${c.holder}>${c.impl}`), 'new directed edges on fresh pairs');
  for (const c of kinds(i, 'symmetric').filter((x) => !x.repeat)) { assert.ok(!prevS.has(`${Math.min(c.prod, c.cons)}-${Math.max(c.prod, c.cons)}`)); assert.ok(!prevR.has(c.enc), 'new record names'); }
  for (const c of kinds(i, 'local')) assert.equal(c.repeat, false, 'locals all new');
  const prevNames = new Set(earlier.flatMap((e) => [...fn(e)]));
  for (const n of fn(i)) assert.ok(!prevNames.has(n), `fresh function name ${n}`);
}
assert.deepEqual(kinds(c2, 'directed').filter((c) => c.repeat).map((c) => c.from).sort(), kinds(c3, 'directed').filter((c) => c.repeat).map((c) => c.from).sort(), 'same repeated set in cases 2 and 3');
assert.deepEqual([...repeatSet(51000, [...d1.keys()])].sort(), kinds(c2, 'directed').filter((c) => c.repeat).map((c) => c.from).sort());
assert.notDeepEqual([...repeatSet(51001, [...d1.keys()])].sort(), [...repeatSet(51000, [...d1.keys()])].sort(), 'the hash depends on the sequence');
assert.equal(check(c2, new Array(80).fill(''), { strict: true }).length, 373, 'every check of case 2 fails on empty code');
// control: three fresh makeInstance seeds, nothing repeats beyond chance
const ctl = makeSequence(51100, { type: 'control' });
assert.equal(fingerprint(ctl[0]), fingerprint(makeInstance(80, 51100, GN1_SHAPE))); assert.equal(fingerprint(ctl[1]), fingerprint(makeInstance(80, '51100.2', GN1_SHAPE))); assert.equal(fingerprint(ctl[2]), fingerprint(makeInstance(80, '51100.3', GN1_SHAPE)));
for (const i of ctl) assert.ok(!i.checks.some((c) => c.repeat));
const triple = (i) => new Set(kinds(i, 'directed').map((c) => `${c.holder}>${c.impl}:${c.need}`));
const overlap = (a, b) => [...triple(a)].filter((t) => triple(b).has(t)).length;
assert.ok(overlap(ctl[0], ctl[1]) <= 3 && overlap(ctl[0], ctl[2]) <= 3, 'control cases independent');
assert.equal(overlap(c1, c2), 80);
assert.notEqual(ctl[1].hash, c2.hash);

// ---- 3. note cutting
const words = Object.assign(async (t) => (String(t).trim() ? String(t).trim().split(/\s+/).length : 0), { label: 'words' });
const shortCut = await cutToTokens('M3: keep this short.', 300, bytesCounter);
assert.deepEqual(shortCut, { text: 'M3: keep this short.', tokens: 7, rawTokens: 7, cut: false, counter: 'bytes/3' });
const long = Array.from({ length: 400 }, (_, i) => `w${i}`).join(' ');
const lc = await cutToTokens(long, 300, words);
assert.equal(lc.cut, true); assert.equal(lc.rawTokens, 400); assert.equal(lc.tokens, 300); assert.equal(lc.counter, 'words'); assert.ok(long.startsWith(lc.text)); assert.ok(lc.text.endsWith('w299'));
const bc = await cutToTokens(long, 300, bytesCounter);
assert.ok(bc.cut && bc.tokens <= 300 && bc.rawTokens > 300 && long.startsWith(bc.text) && long[bc.text.length] === ' ', 'cut at a word boundary');
assert.ok(await bytesCounter(long.slice(0, long.indexOf(' ', bc.text.length + 1))) > 300, 'the longest prefix that fits');
// count_tokens counter (stubbed: no network): the text's tokens are its message count minus a one-character message's, plus one
const calls = []; const ac = apiCounter(async (p) => { calls.push(p); return 10 + p.messages[0].content.length; }, 'claude-haiku-5-5');
assert.equal(await ac('abcd'), 4); assert.equal(await ac('abcd'), 4); assert.equal(ac.label, 'count_tokens'); assert.equal(calls.length, 2, 'cached'); assert.equal(calls[0].model, 'claude-haiku-5-5');
// library lines: tags, filtering by module, author order, cut recorded
const P = parseLibrary('M2: a\n- M10: b\n[M3] c\nnot tagged\nM99: unknown module\nM1 - d', 10);
assert.deepEqual(P.lines.map((l) => [l.about, l.text]), [[1, 'M2: a'], [9, '- M10: b'], [2, '[M3] c'], [0, 'M1 - d']]); assert.equal(P.dropped.length, 2);
const written = { 4: { text: 'M1: from five\nM2: other' }, 0: { text: 'M1: from one, first line\nM1: from one, second line' }, 2: { text: 'M1: from three' } };
const v = await libraryRead(written, 0, 6, 300, bytesCounter);
assert.equal(v.text, 'M1: from one, first line\nM1: from one, second line\nM1: from three\nM1: from five'); assert.deepEqual(v.authors, [0, 2, 4]); assert.equal(v.cut, false);
const vc = await libraryRead(written, 0, 6, 10, words);
assert.equal(vc.cut, true); assert.equal(vc.tokens, 10); assert.equal(vc.rawTokens, 16); assert.ok(vc.text.startsWith('M1: from one, first line'));
assert.equal((await libraryRead(written, 1, 6, 300, bytesCounter)).text, 'M2: other');
// prompts: notes shown before the member's code; the note request carries spec, code, failures and the limit
const base = { model: 'm', messages: [{ role: 'user', content: 'spec\n--- current code of M2 ---\ncode' }] };
assert.equal(withNotes(base, 1, 'notebook', 'n1').messages[0].content, `spec\n${NOTES_HEAD.notebook}:\nn1\n--- current code of M2 ---\ncode`);
assert.ok(withNotes(base, 1, 'library', '').messages[0].content.includes(`${NOTES_HEAD.library}:\n(none)\n`));
assert.equal(withNotes(base, 1, 'none', 'x'), base);
const nr = noteRequest('claude-haiku-5-5', c1, 4, new Array(80).fill('function x() {}'), ['M5.f fails'], 'library', 8000, null);
assert.ok(nr.output_config.format.schema.properties.notes && !nr.output_config.effort && nr.max_tokens === 8000);
assert.ok(nr.messages[0].content.includes(c1.specs[4][0]) && nr.messages[0].content.includes('- M5.f fails') && nr.messages[0].content.includes('"M12: ..."') && nr.messages[0].content.includes('At most 300 tokens'));
assert.throws(() => noteRequest('m', c1, 0, [], [], 'none', 10));
// 6b: after case 2 the note request shows the notes the member read, in the same block as its member requests
const nrPrior = noteRequest('claude-haiku-5-5', c1, 4, new Array(80).fill('function x() {}'), [], 'notebook', 8000, null, 'my case-1 notes');
assert.ok(nrPrior.messages[0].content.includes(`${NOTES_HEAD.notebook}:\nmy case-1 notes\n--- your final code of M5 ---`));
const blk = withNotes({ messages: [{ content: '--- current code of M5 ---\n' }] }, 4, 'notebook', 'my case-1 notes').messages[0].content.split('--- current')[0];
assert.ok(nrPrior.messages[0].content.includes(blk + '--- your final code of M5 ---'), 'the same block as in the member requests');
assert.ok(noteRequest('m', c1, 4, [], [], 'library', 10, null, '').messages[0].content.includes(`${NOTES_HEAD.library}:\n(none)\n--- your final code`));
assert.ok(!noteRequest('m', c1, 4, [], [], 'notebook', 10, null, null).messages[0].content.includes(NOTES_HEAD.notebook), 'no block after case 1');
assert.equal(SEEN_MAX, 40);

// ---- 4. stage-0 oracle
const items = idealItems(c1, 0), mine = c1.checks.filter((c) => (c.kind === 'directed' && (c.holder === 0 || c.impl === 0)) || (c.kind === 'symmetric' && (c.prod === 0 || c.cons === 0)));
assert.equal(items.length, mine.length);
const s0 = await stage0({ seeds: [51000] });
assert.equal(s0.failing, 373); const bk = s0.perSeq[0].byKind;
assert.equal(bk.local.notebook, 0); assert.equal(bk.local.library, 0);
assert.ok(bk.directed.notebook <= bk.directed.repeated && bk.symmetric.notebook <= bk.symmetric.repeated, 'only repeated edges can be in the notes');
assert.ok(s0.notebook.share > 0 && s0.notebook.share <= 107 / 373 && s0.library.share > 0 && s0.library.share <= 107 / 373);
assert.equal(s0.counter, 'bytes/3');
// with no cut the oracle finds every repeated directed edge in the helper owner's notes
const s0all = await stage0({ seeds: [51000], max: 1e9 });
assert.equal(s0all.perSeq[0].byKind.directed.notebook, 80); assert.equal(s0all.perSeq[0].byKind.symmetric.notebook, 27); assert.equal(s0all.perSeq[0].byKind.directed.library, 80);
assert.deepEqual(stage0Gate({ notebook: { share: 0.19 }, library: { share: 0.5 } }), { stop: true, dropLibrary: false, notebookShare: 0.19, libraryShare: 0.5, gate: 0.2 });
assert.equal(stage0Gate({ notebook: { share: 0.2 }, library: { share: 0.1 } }).stop, false); assert.equal(stage0Gate({ notebook: { share: 0.2 }, library: { share: 0.1 } }).dropLibrary, true);

// ---- 5. firstPassFailing breakdown
const allIds = c2.checks.map((c) => c.id);
assert.deepEqual(firstPassBreakdown(c2, allIds), { total: 373, local: 160, directed: 160, symmetric: 53, repeated: 107, new: 106, directedRepeated: 80, directedNew: 80, symmetricRepeated: 27, symmetricNew: 26 });
const someD = kinds(c2, 'directed').filter((c) => c.repeat).slice(0, 3).map((c) => c.id).concat(kinds(c2, 'symmetric').filter((c) => !c.repeat).slice(0, 2).map((c) => c.id), kinds(c2, 'local')[0].id);
assert.deepEqual(firstPassBreakdown(c2, someD.concat(someD[0])), { total: 6, local: 1, directed: 3, symmetric: 2, repeated: 3, new: 2, directedRepeated: 3, directedNew: 0, symmetricRepeated: 0, symmetricNew: 2 });
assert.throws(() => firstPassBreakdown(c2, ['nope']));

// ---- 6. analysis rule
assert.equal(+signOneSided(10, 2).toFixed(3), 0.019); assert.equal(+signOneSided(9, 3).toFixed(3), 0.073);
assert.equal(compare(Array.from({ length: 12 }, (_, i) => (i < 10 ? [1, 2] : [2, 1]))).verdict, 'supported');
assert.equal(compare(Array.from({ length: 12 }, (_, i) => (i < 9 ? [1, 2] : [2, 1]))).verdict, 'inconclusive', '9 to 3 is not an effect');
assert.equal(compare([[2, 1], [2, 1], [1, 2]]).verdict, 'refuted');
// one-sided exact sign test (prereg), through compare: 10/12 -> 0.019, 9/12 -> 0.073
const split = (w, n = 12) => Array.from({ length: n }, (_, i) => (i < w ? [1, 2] : [2, 1]));
assert.equal(+compare(split(10)).p.toFixed(3), 0.019); assert.equal(+compare(split(9)).p.toFixed(3), 0.073);
// GN1-H5 (H-G27), no harm, direction "none better", two outcomes only: refuted, or inconclusive; never supported
assert.equal(compare(Array.from({ length: 12 }, () => [2, 1]), true).verdict, 'refuted'); assert.equal(compare(split(2), true).verdict, 'refuted'); assert.equal(+compare(split(2), true).p.toFixed(3), 0.019, 'p in the harm direction');
{ const nb = compare(split(10), true); assert.equal(nb.verdict, 'inconclusive', 'notebook significantly better: still inconclusive'); assert.equal(nb.aBetterDescriptive, true); assert.equal(+nb.pAgainst.toFixed(3), 0.019);
  const st = h5Statement({ id: 'H-G27', verdict: nb.verdict, reading: 'not refuted (no harm detected)', h5NotebookBetterDescriptive: true, aBetter: 10, bBetter: 2, pAgainst: nb.pAgainst });
  assert.match(st, /recorded inconclusive, read as "not refuted \(no harm detected\)"; it is never recorded as supported\. Descriptive observation only \(not a verdict\): notebook had fewer hold-out failures than none in 10 units against 2 \(one-sided p = 0\.019\)/); }
assert.equal(compare(split(9), true).aBetterDescriptive, false); assert.equal(compare(split(9), true).verdict, 'inconclusive');
assert.equal(compare([[2, 1], [1, 2]], true).verdict, 'inconclusive'); assert.equal(compare(split(3), true).verdict, 'inconclusive', '9 to 3 in the harm direction is not a refutation');
for (let w = 0; w <= 12; w++) assert.notEqual(compare(split(w), true).verdict, 'supported');
for (const w of [0, 3, 6, 9, 12]) for (const nh of [false, true]) assert.ok(VERDICTS.has(compare(split(w), nh).verdict));
{ // synthetic records: notebook better on every related unit, 2 control sequences (guard weak)
  const rec = (type, seq, c, arm, fp) => ({ study: 'GN1', seq, type, case: c, arm, firstPassFailing: fp, firstPass: { total: fp, local: 0, directed: fp, symmetric: 0, repeated: fp, new: 0, directedRepeated: fp, directedNew: 0, symmetricRepeated: 0, symmetricNew: 0 }, solved: true, wavesToSolve: 3, tokens: 100, noteWriteOutTokens: arm === 'none' ? 0 : 10, history: [{ counts: { total: fp } }], notesRead: arm === 'none' ? null : { writeCut: 1, readCut: 0, written: 80, writeUsage: { usd: 0.01, outSum: 10 } } });
  const rs = []; for (const s of [51000, 51001, 51002, 51003, 51004, 51005]) for (const c of [2, 3]) rs.push(rec('related', s, c, 'none', 20), rec('related', s, c, 'notebook', 10), rec('related', s, c, 'library', 15));
  for (const s of [51100, 51101]) for (const c of [2, 3]) rs.push(rec('control', s, c, 'none', 20), rec('control', s, c, 'notebook', 20), rec('control', s, c, 'library', 20));
  rs.push({ study: 'GN1', seq: 51102, type: 'control', case: 2, arm: 'none', dropped: true, reason: 'cost rule' });
  const a = analyse(spec, rs, { holdout: false });
  assert.equal(a.units, 12); assert.equal(a.dropped, 1);
  const h = Object.fromEntries(a.hypotheses.map((x) => [x.label, x]));
  assert.deepEqual(a.hypotheses.map((x) => [x.id, x.label]), [['H-G23', 'GN1-H1'], ['H-G24', 'GN1-H2'], ['H-G25', 'GN1-H3'], ['H-G26', 'GN1-H4'], ['H-G27', 'GN1-H5']]);
  // every verdict is a word the registry (scripts/verdicts.mjs) accepts
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'results/li-verdicts.json'), 'utf8'));
  for (const x of a.hypotheses) { assert.ok(reg.statusOf[x.verdict], `${x.id} ${x.verdict}`); assert.equal(reg.hypotheses.find((y) => y.id === x.id)?.study, 'GN1'); }
  assert.equal(h['GN1-H5'].verdict, 'inconclusive'); assert.equal(h['GN1-H5'].reading, 'not refuted (no harm detected)'); assert.equal(h['GN1-H5'].h5NotebookBetterDescriptive, false); assert.equal(a.h5NotebookBetterDescriptive, false); assert.equal(h['GN1-H5'].aBetterDescriptive, undefined);
  assert.match(a.requiredStatements[3], /^GN1-H5 \(H-G27, no harm on fresh inputs\): recorded inconclusive, read as "not refuted \(no harm detected\)"; it is never recorded as supported\.$/);
  assert.equal(a.requiredStatements[2], IMPLEMENTATION_CHOICES); assert.match(IMPLEMENTATION_CHOICES, /fixed before the data, 2026-11-23/);
  // stage 0 dropped the library arm: GN1-H2 is aborted
  const noLib = analyse(spec, rs.filter((x) => x.arm !== 'library'), { holdout: false }), h2 = noLib.hypotheses.find((x) => x.label === 'GN1-H2');
  assert.equal(h2.verdict, 'aborted'); assert.equal(h2.id, 'H-G24'); assert.equal(noLib.notebookVsLibrary, null);
  assert.equal(h['GN1-H1'].verdict, 'supported'); assert.equal(h['GN1-H1'].aBetter, 12); assert.equal(h['GN1-H1'].sequenceLevel.aBetter, 6); assert.equal(h['GN1-H1'].pHolm, undefined);
  assert.equal(h['GN1-H2'].verdict, 'supported'); assert.ok(h['GN1-H2'].pHolm >= h['GN1-H2'].p);
  assert.equal(h['GN1-H4'].verdict, 'refuted', 'tokens include the note-writing request');
  assert.equal(a.guard.units, 4); assert.equal(a.guard.weak, true); assert.equal(a.guard.holds, true); assert.match(a.reading.guardWeak, /4 units: weak/);
  assert.equal(a.notebookVsLibrary.firstPassFailing.notebookBetter, 12); assert.equal(a.notebookVsLibrary.firstPassFailing.sequenceLevel.notebookBetter, 6); assert.equal(a.notebookVsLibrary.tokens.ties, 12);
  assert.equal(a.perArm.notebook.firstPassFailing.median, 10); assert.equal(a.perArm.none.units, 12);
  assert.equal(a.requiredStatements.length, 4); assert.match(a.requiredStatements[0], /4 units and is therefore weak/); assert.match(a.requiredStatements[1], /9 to 3 split is not an effect/);
  assert.equal(a.firstPassBreakdown.notebook.directedRepeated, 120); assert.equal(a.notes.notebook.noteWritingUsd, 0.16, "12 related + 4 control note rounds");
}

// ---- 7. cost rule
const proj = (x) => projectCost({ pilotSpentUsd: 0.55, perCaseRunUsd: 0.115, perNoteRoundUsd: 0.03, cases: 3, arms: ['none', 'notebook', 'library'], ...x });
assert.equal(+proj({ related: 6, control: 3 }).toFixed(4), +(0.55 + 9 * (7 * 0.115 + 4 * 0.03)).toFixed(4));
assert.equal(+proj({ related: 6, control: 2, arms: ['none', 'notebook'] }).toFixed(4), +(0.55 + 8 * (5 * 0.115 + 2 * 0.03)).toFixed(4));
assert.deepEqual(sequencesOf(spec, 'pilot'), [{ seed: 50990, type: 'related', cases: 2 }]);
assert.equal(sequencesOf(spec, 'study').length, 9); assert.equal(sequencesOf(spec, 'study', '2-controls').filter((s) => s.type === 'control').length, 2);
assert.deepEqual(sequencesOf(spec, 'study', '5-related').map((s) => s.seed), [51000, 51001, 51002, 51003, 51004, 51100, 51101]);
{ // the cost rule (prereg + Genome Research's reading, no extra margin): study projection WITHOUT the pilot <= 7.4 and <= 8 - pilot actual
  const arms = ['none', 'notebook', 'library'], x = { spec, arms, perCaseRunUsd: 0.115, perNoteRoundUsd: 0.03 };
  assert.equal(spec.partMaxUsd, 0.5);
  const a = chooseSample({ ...x, pilotSpentUsd: 0.55 }); // 8.325, 7.4, 6.475 against headroom 8 - 0.55 = 7.45
  assert.deepEqual(a.steps.map((s) => s.studyProjectedUsd), [8.325, 7.4, 6.475]); assert.equal(a.headroomUsd, 7.45); assert.equal(a.partMaxUsd, 0.5);
  assert.equal(a.pick.sample, '2-controls'); assert.equal(a.steps[1].withPilotUsd, 7.95); assert.equal(a.steps[1].withPilotAndPartUsd, undefined, 'no margin term');
  assert.equal(chooseSample({ ...x, pilotSpentUsd: 0.7 }).pick.sample, '5-related', '7.4 > 8 - 0.7');
  assert.equal(chooseSample({ ...x, pilotSpentUsd: 0.55, perCaseRunUsd: 0.1 }).pick.sample, 'full', 'full 7.38 <= 7.4 and <= 7.45');
  assert.equal(chooseSample({ ...x, pilotSpentUsd: 0.1, perCaseRunUsd: 0.08 }).pick.sample, 'full', '9 x 0.68 = 6.12 <= 7.4 and <= 7.4');
  assert.equal(chooseSample({ ...x, pilotSpentUsd: 0.55, perCaseRunUsd: 0.2 }).pick, null, 'nothing fits: the study does not start');
}
{ // the study cap against FULL reservations (gn1-batch.mjs): a part goes out only if spent so far + its full reservation <= 8
  assert.equal(fits({ spentUsd: 7.5, reserveUsd: 0.5, capUsd: 8 }), true); assert.equal(fits({ spentUsd: 7.5, reserveUsd: 0.5001, capUsd: 8 }), false);
  assert.equal(journalSpent({ a: { reserveUsd: 2, actualUsd: 0.4 }, b: { reserveUsd: 1 } }), 1.4, 'reconciled at actual, in flight at full reservation');
  // adaptive parts: room = min(0.5, 8 - committed); the longest prefix that fits, down to one request; none if the first does not fit
  assert.equal(partRoom({ committedUsd: 1, capUsd: 8, partMaxUsd: 0.5 }), 0.5); assert.equal(+partRoom({ committedUsd: 7.8, capUsd: 8, partMaxUsd: 0.5 }).toFixed(6), 0.2);
  const qs = [0.2, 0.2, 0.2, 0.7, 0.1].map((r) => ({ reserveUsd: r }));
  assert.equal(nextPart(qs, 0.5).length, 2); assert.equal(nextPart(qs, 0.6).length, 3); assert.equal(nextPart(qs, 0.2).length, 1); assert.equal(nextPart(qs, 0.19).length, 0);
  const tmp0 = fs.mkdtempSync(path.join(os.tmpdir(), 'gn1cap-')), saved = { ...process.env };
  // no network and no real ledger: the API and the ledger are test doubles; the key file and UNFOLD_LEDGER point at nothing
  Object.assign(process.env, { UNFOLD_LEDGER: path.join(tmp0, 'ledger.json'), ANTHROPIC_API_KEY_FILE: path.join(tmp0, 'no-key') });
  try {
    const { reserveMeasured, usageCostFor } = await import('../../lab007-economy/pricing.mjs');
    const cfgc = { ...runConfig(spec), k: 6, shape: { local: 2, directed: 12, symmetric: 4, tests: 6, shown: 3 } }, I = makeInstance(6, 1, cfgc.shape);
    const rows = () => Array.from({ length: 6 }, (_, m) => ({ custom_id: `cap-m${m}`, unit: 'u', m, params: memberRequest(cfgc.model, I, m, new Array(6).fill(''), [], cfgc.memberMax) }));
    const per = reserveMeasured(rows()[0].params, 1000).usd, R = 6 * per;
    const doubles = (outTokens) => { const calls = { created: [], reserved: [], reconciled: [] }, manifests = new Map(); let n = 0;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      return { calls, deps: { countFn: async () => 1000,
        api: { createBatch: async (m) => { const id = `b${n++}`; manifests.set(id, m); calls.created.push(id); return { id }; }, waitForBatch: async (id) => { await sleep(15); return { id }; },
          fetchBatchResults: async (b) => manifests.get(b.id).map((x) => ({ custom_id: x.custom_id, result: { type: 'succeeded', message: { content: [{ type: 'text', text: '{"code":"function f(s){return s}"}' }], stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: outTokens } } } })) },
        budget: { reserveWaves: async (o) => { calls.reserved.push(o.waves[0].reserveUsd); }, attachActualManifest: async () => {}, markSubmitted: async () => {}, reconcileWave: async (o) => { calls.reconciled.push(o.actualUsd); } } } }; };
    const run = async (o) => { const dir = fs.mkdtempSync(path.join(tmp0, 'w-')), logs = [], d = doubles(o.outTokens ?? 100);
      const b = batchBackend({ cfg: cfgc, outDir: dir, name: 'gn1-test', hash: 'x', priorSpentUsd: o.prior, partMaxUsd: o.partMaxUsd ?? 10, deps: d.deps, log: (x) => logs.push(x) });
      const out = await b.wave('c1.w0', rows()); return { b, out, calls: d.calls, logs, dir }; };
    // a wave that fits exactly at 8 goes out
    const exact = await run({ prior: 8 - R });
    assert.ok(exact.out instanceof Map && exact.out.size === 6); assert.equal(exact.calls.created.length, 1); assert.equal(exact.b.capStopped, false); assert.ok(Math.abs(exact.calls.reserved[0] - R) < 1e-12);
    assert.ok(Math.abs(exact.calls.reconciled[0] - 6 * usageCostFor(cfgc.model, { input_tokens: 1000, output_tokens: 100 })) < 1e-12);
    // not even one request fits and nothing is in flight: the wave stops before any reservation or request, with the numbers
    const over = await run({ prior: 8 - 0.5 * per });
    assert.equal(over.out, null); assert.equal(over.b.capStopped, true); assert.equal(over.calls.created.length + over.calls.reserved.length, 0); assert.ok(!fs.existsSync(path.join(over.dir, 'batches.json')));
    assert.deepEqual(Object.keys(over.b.capStop).sort(), ['capUsd', 'part', 'partReserveUsd', 'requestsLeft', 'spentUsd', 'wave', 'waveReserveUsd']);
    assert.equal(over.b.capStop.part, 0); assert.equal(over.b.capStop.requestsLeft, 6); assert.equal(over.b.capStop.capUsd, 8); assert.ok(Math.abs(over.b.capStop.partReserveUsd - per) < 1e-6); assert.ok(over.b.capStop.spentUsd + per > 8);
    // the final part shrinks to fit at exactly 8: room for 4 requests, so part 0 takes 4 and reserves up to exactly 8;
    // part 1 waits for its reconciliation, then takes the other 2
    const shrink = await run({ prior: 8 - 4 * per });
    assert.ok(shrink.out instanceof Map && shrink.out.size === 6); assert.equal(shrink.calls.created.length, 2); assert.ok(Math.abs(8 - 4 * per + shrink.calls.reserved[0] - 8) < 1e-9, 'part 0 ends exactly at 8');
    assert.ok(Math.abs(shrink.calls.reserved[1] - 2 * per) < 1e-12);
    // a part shrinks below 0.5 when committed is close to 8 (room 3 requests, about US$ 0.009)
    const small = await run({ prior: 8 - 3 * per - 1e-7, partMaxUsd: 0.5 });
    assert.ok(Math.abs(small.calls.reserved[0] - 3 * per) < 1e-12 && small.calls.reserved[0] < 0.5); assert.ok(small.out instanceof Map);
    // with the room for 1.5 requests and actual cost near the reservation (8,000 output tokens): part 0 = 1 request goes out,
    // part 1 waits for its reconciliation, then not even one request fits with nothing in flight: stop, 5 requests left
    const stuck = await run({ prior: 8 - 1.5 * per, outTokens: 8000 });
    assert.equal(stuck.out, null); assert.equal(stuck.calls.created.length, 1); assert.equal(stuck.calls.reconciled.length, 1); assert.equal(stuck.b.capStop.part, 1); assert.equal(stuck.b.capStop.requestsLeft, 5);
    assert.ok(stuck.b.capStop.spentUsd + stuck.b.capStop.partReserveUsd > 8 && stuck.b.capStop.spentUsd <= 8);
    const jst = JSON.parse(fs.readFileSync(path.join(stuck.dir, 'batches.json'), 'utf8')); assert.equal(jst['c1.w0.0'].status, 'complete'); assert.equal(jst['c1.w0.0'].ids.length, 1);
    // the study refuses its first wave without the cost-rule record
    const rec = path.join(tmp0, 'plan.json'), study = batchBackend({ cfg: cfgc, outDir: tmp0, name: 'gn1-test', hash: 'x', record: rec, deps: doubles(1).deps, log: () => {} });
    await assert.rejects(study.wave('c1.w0', rows()), /no cost-rule record/); assert.throws(() => requireRecord(rec));
    fs.writeFileSync(rec, JSON.stringify({ sample: '2-controls' })); assert.throws(() => requireRecord(rec), /with at and sample/);
    fs.writeFileSync(rec, JSON.stringify({ at: '2026-11-23T00:00:00Z', sample: '2-controls' })); assert.equal(requireRecord(rec).sample, '2-controls');
    const fb = fakeBackend({ cfg: cfgc, record: path.join(tmp0, 'none.json') }); await assert.rejects(fb.wave('c1.w0', rows()), /no cost-rule record/);
    const fc = fakeBackend({ cfg: cfgc, usdPerRequest: 1, priorSpentUsd: 2.5 }); assert.equal(await fc.wave('c1.w0', rows()), null); assert.equal(fc.capStopped, true); assert.equal(fc.capStop.partReserveUsd, 1); assert.equal(fc.capStop.requestsLeft, 1);
    const fe = fakeBackend({ cfg: cfgc, usdPerRequest: 1, priorSpentUsd: 2 }); assert.ok((await fe.wave('c1.w0', rows())) instanceof Map, 'the stub too: 2 + 6 x 1 = 8 fits exactly');
    // the stop report: numbers and the case runs the plan still needs, to <out>/cap-stop.json and stderr
    const out = path.join(tmp0, 'out'), rd = path.join(out, 'runs'); fs.mkdirSync(rd, { recursive: true }); fs.writeFileSync(path.join(rd, recordName('shared', 1, 7)), '{}');
    const err0 = console.error, errs = []; console.error = (x) => errs.push(String(x));
    try { capStopReport({ out, part: 'study', capStop: over.b.capStop, sequences: [{ seed: 7, type: 'related', cases: 3 }], arms: ['none', 'notebook'], recordsDir: rd, recordName }); } finally { console.error = err0; }
    const cs = JSON.parse(fs.readFileSync(path.join(out, 'cap-stop.json'), 'utf8'));
    assert.equal(cs.unitsNeeded, 4); assert.deepEqual(cs.units, ['none-c2-s7', 'notebook-c2-s7', 'none-c3-s7', 'notebook-c3-s7']); assert.equal(cs.capUsd, 8); assert.ok(cs.at && cs.spentUsd > 0 && cs.partReserveUsd > 0);
    assert.match(errs[0], /GN1 study cap stop \(study\): wave c1\.w0, 6 requests not sent: spent so far US\$ [\d.]+ \+ one request's full reservation US\$ [\d.]+ > cap US\$ 8, nothing in flight; 4 case runs still needed/);
  } finally { for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); fs.rmSync(tmp0, { recursive: true }); }
}

// ---- 8. the spec and the bench gate
assert.equal(spec.studyCapUsd, 8); assert.equal(spec.capUsd, 8); assert.equal(spec.expected, 9 * (1 + 2 * 3)); assert.equal(spec.protocol, 'stigwait'); assert.equal(spec.rounds, 12); assert.equal(spec.memberMax, 8000); assert.equal(spec.effort, null); assert.equal(spec.strictFeedback, true);
assert.deepEqual(spec.arms, ['none', 'notebook', 'library']); assert.equal(spec.costRule.thresholdUsd, 7.4); assert.equal(spec.plan.sample, '5-related'); assert.equal(spec.plan.libraryDropped, false);
assert.deepEqual(spec.hypotheses.map((h) => [h.id, h.label]), [['H-G23', 'GN1-H1'], ['H-G24', 'GN1-H2'], ['H-G25', 'GN1-H3'], ['H-G26', 'GN1-H4'], ['H-G27', 'GN1-H5']]); assert.equal(spec.hypotheses[0].primary, true);
{
  const { discover } = await import('../../../bench/bench.mjs');
  const g = discover(ROOT).find((s) => s.key === 'gn1');
  assert.ok(g && g.kind === 'script' && g.id === 'GN1' && g.paid && g.capUsd === 8 && g.expected === 63);
  assert.equal(g.prereg, 'tasks/GN1-MEMORY-PREREG.md', 'the bench gates on this file being on main');
  assert.equal(g.run, 'observatory/batch2/rc/drive-gn1.mjs'); assert.equal(g.verdicts, 'results/gn1/analysis.json');
  assert.ok(g.bench && typeof g.bench === 'object', 'enabled by Genome Research after the 2026-11-23 adjustments');
  assert.match(spec.bench.reportNote, /guard became weak/); assert.match(spec.bench.reportNote, /9 to 3 is not an effect/); assert.match(spec.bench.reportNote, /Implementation choices fixed before the data, 2026-11-23/);
}

// ---- 9. the runner end to end on the stub model: case 1 (shared) -> notes -> case 2 -> notes -> case 3, per arm
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gn1-')), cfg = { ...runConfig(spec), k: 6, shape: { local: 2, directed: 12, symmetric: 4, tests: 6, shown: 3 }, rounds: 2, notesTokens: 40 };
  const sequences = [{ seed: 7, type: 'related', cases: 3 }, { seed: 8, type: 'control', cases: 2 }], logs = [];
  const backend = fakeBackend({ cfg }), captured = {}, wave0 = backend.wave.bind(backend);
  backend.wave = async (wk, rows) => { if (wk.startsWith('n')) captured[wk] = rows; return wave0(wk, rows); };
  const r = await runGN1({ cfg, sequences, outDir: tmp, recordsDir: path.join(tmp, 'runs'), backend, counter: bytesCounter, log: (o) => logs.push(o) });
  assert.equal(r.stopped, false);
  const st = r.state, waves = backend.waves.map((w) => w.wave);
  assert.deepEqual(Object.keys(st.units).filter((k) => k.includes('|c1|')).sort(), ['c8|c1|shared', 'r7|c1|shared'], 'case 1 runs once per sequence, shared');
  assert.ok(waves.includes('n1.w0') && waves.includes('n2.w0') && waves.indexOf('n1.w0') > waves.indexOf('c1.w0') && waves.indexOf('c2.w0') > waves.indexOf('n1.w0'));
  assert.equal(backend.waves.find((w) => w.wave === 'n1.w0').requests, 2 * 2 * 6, 'one note request per member, per notes arm, per sequence');
  assert.equal(backend.waves.find((w) => w.wave === 'n2.w0').requests, 2 * 6, 'notes after case 2 only where a case 3 follows');
  const nb = st.notes['r7|n1|notebook'], lib = st.notes['r7|n1|library'];
  assert.equal(nb.from, 'r7|c1|shared'); assert.equal(lib.from, 'r7|c1|shared'); assert.equal(st.notes['r7|n2|notebook'].from, 'r7|c2|notebook');
  for (const w of Object.values(nb.written)) { assert.ok(w.tokens <= 40 && w.counter === 'bytes/3' && typeof w.rawTokens === 'number'); }
  assert.ok(nb.summary.writeCut > 0, 'some notes cut and recorded'); assert.ok(Object.values(lib.views).every((x) => x.tokens <= 40 && 'cut' in x && Array.isArray(x.authors)));
  assert.ok(Object.values(lib.written).every((w) => typeof w.tagged === 'number'));
  // notes shown in every member request of the next case, in the notes arms only
  const c2 = Object.fromEntries(['none', 'notebook', 'library'].map((a) => [a, st.units[`r7|c2|${a}`].history[0]]));
  assert.equal(c2.notebook.notesShown, 6); assert.equal(c2.library.notesShown, 6); assert.equal(c2.none.notesShown, 0); assert.equal(st.units['r7|c1|shared'].history[0].notesShown, 0);
  // 6b: the note requests after case 2 show the case-1 notes of the same arm, as in the member requests; after case 1 none
  for (const q of captured['n2.w0']) { const arm = q.unit.split('|')[2], n1 = st.notes[`r7|n1|${arm}`], text = arm === 'notebook' ? n1.written[q.m].text : n1.views[q.m].text;
    assert.ok(q.prior && q.params.messages[0].content.includes(`${NOTES_HEAD[arm]}:\n${text.trim() || '(none)'}\n--- your final code of M${q.m + 1} ---`)); }
  for (const q of captured['n1.w0']) assert.ok(!q.prior && !q.params.messages[0].content.includes('from the previous case'));
  assert.equal(st.notes['r7|n2|notebook'].summary.priorShown, 6); assert.equal(st.notes['r7|n1|notebook'].summary.priorShown, 0);
  // 6a: per member, how many failing checks it saw and how many were left out of its note request
  for (const w of Object.values(st.notes['r7|n1|library'].written)) { assert.equal(typeof w.seen, 'number'); assert.equal(w.seenCut, Math.max(0, w.seen - SEEN_MAX)); }
  const files = fs.readdirSync(path.join(tmp, 'runs')).sort();
  assert.equal(files.length, 1 + 2 * 3 + 1 + 1 * 3); assert.ok(files.includes(recordName('notebook', 3, 7)) && files.includes(recordName('shared', 1, 8)));
  const rec = JSON.parse(fs.readFileSync(path.join(tmp, 'runs', recordName('library', 2, 7)), 'utf8'));
  assert.equal(rec.notesRead.from, 'r7|c1|shared'); assert.equal(rec.firstPass.total, rec.firstPassFailing); assert.ok(rec.noteWriteOutTokens > 0);
  // resumable: a second call does no new wave
  const again = fakeBackend({ cfg }); await runGN1({ cfg, sequences, outDir: tmp, recordsDir: path.join(tmp, 'runs'), backend: again, counter: bytesCounter, log: () => {} });
  assert.equal(again.waves.length, 0);
  fs.rmSync(tmp, { recursive: true });
}
// ---- 10. the driver (stub model, GN1_FAKE=1, no network, no ledger): stage 0 -> pilot -> cost-rule record (exit 3), then
// with the sample recorded and a cap the study cannot fit in, a final cap stop (exit 4) with the numbers in cap-stop.json
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gn1drv-')), sp = path.join(tmp, 'spec.json');
  const s2 = { ...spec, out: path.join(tmp, 'out'), episodes: path.join(tmp, 'out/runs'), k: 6, rounds: 2, shape: { local: 2, directed: 12, symmetric: 4, tests: 6, shown: 3 },
    sequences: { cases: 3, related: [51000], control: [51100] }, costRule: { ...spec.costRule, steps: [{ sample: 'full', related: [51000], control: [51100] }, { sample: '2-controls', related: [51000], control: [51100] }, { sample: '5-related', related: [51000], control: [] }] } };
  fs.writeFileSync(sp, JSON.stringify(s2));
  const env = { ...process.env, GN1_FAKE: '1', GN1_FAKE_USD: '0.01', UNFOLD_LEDGER: path.join(tmp, 'no-ledger.json') }; delete env.ANTHROPIC_API_KEY_FILE;
  const drive = () => spawnSync(process.execPath, [path.join(HERE, 'drive-gn1.mjs'), sp], { cwd: ROOT, env, encoding: 'utf8' });
  const r1 = drive(); assert.equal(r1.status, 3, r1.stderr); const plan = JSON.parse(fs.readFileSync(path.join(tmp, 'out/plan.json'), 'utf8'));
  assert.equal(plan.sample, 'full'); assert.equal(plan.partMaxUsd, 0.5); assert.ok(plan.at && plan.recordedBeforeFirstWave);
  s2.plan = { ...s2.plan, sample: plan.sample }; s2.studyCapUsd = +(plan.pilotSpentUsd + 0.2).toFixed(6); fs.writeFileSync(sp, JSON.stringify(s2));
  const r2 = drive(); assert.equal(r2.status, 4, r2.stderr); assert.match(r2.stderr, /GN1 study cap stop \(study\): wave c1\.w\d+, \d+ requests not sent: spent so far US\$ [\d.]+ \+ one request's full reservation US\$ [\d.]+ > cap US\$ [\d.]+, nothing in flight; 14 case runs still needed/);
  const cs = JSON.parse(fs.readFileSync(path.join(tmp, 'out/cap-stop.json'), 'utf8'));
  assert.equal(cs.phase, 'study'); assert.ok(cs.requestsLeft > 0); assert.equal(cs.unitsNeeded, 14); assert.equal(cs.capUsd, s2.studyCapUsd); assert.ok(cs.spentUsd + cs.partReserveUsd > cs.capUsd);
  const { FINAL } = { FINAL: [3, 4] }; assert.ok(FINAL.includes(r2.status), 'exit 4 is final for the bench');
  fs.rmSync(tmp, { recursive: true });
}
console.log('gn1: ok');

// ---- statement (2) follows the units run (Genome Research, 2026-11-23): 10 units -> 9 wins; 12 keeps the prereg text
{
  const { primaryStatement, winsNeeded, PREREG_PRIMARY_STATEMENT } = await import('./analyze-gn1.mjs');
  assert.equal(winsNeeded(12), 10); assert.equal(winsNeeded(10), 9);
  assert.equal(primaryStatement(12), PREREG_PRIMARY_STATEMENT);
  assert.match(primaryStatement(10), /^Under the cost rule the sample was 5 related sequences, so 10 primary units: the primary holds only with 9 or more wins \(9\/10 gives one-sided p = 0\.011; 8\/10 gives p = 0\.055\); 8 to 2 is not an effect\. Statement as preregistered: "With 12 units/);
}
