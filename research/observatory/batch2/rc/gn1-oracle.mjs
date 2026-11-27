// GN1 stage 0 (tasks/GN1-MEMORY-PREREG.md): an oracle without any model writes, for every member of case 1 of each
// related sequence, the ideal notes (the resolved requirement of every directed edge it was on, as caller or helper
// owner, and the agreed format of every symmetric edge it was on), cut at NOTE_TOKENS. It then counts, over the checks
// failing in case 2 at the start (empty code, strict check), the share whose fix is in the notes the owner would read:
//   notebook  the member's own notes;  library  the lines about the member's module (lines as each author wrote them,
//   then the reader's view cut at NOTE_TOKENS, author ascending, as in the runner)
// Whose fix: a directed check is fixed by the helper owner (the only one who can change the helper and who lacks the
// requirement); a symmetric check needs both sides on the agreed format, so it counts only when both sides read it;
// local checks are all new, so their fix is never in the notes. A line counts only if it survives the cut whole.
// Gate: notebook share below 20% stops GN1 before any spend; library alone below 20% drops the library arm.
// Usage: node observatory/batch2/rc/gn1-oracle.mjs [spec.json] [--offline]   (offline: bytes / 3, no network)
import fs from 'node:fs';
import { check } from './code.mjs';
import { makeSequence, GN1_SHAPE, GN1_F } from './family.mjs';
import { NOTE_TOKENS, cutToTokens, libraryRead, bytesCounter, apiCounter } from './notes.mjs';
const mod = (i) => `M${i + 1}`;

// the agreed format of a symmetric edge: the producer's house style (any fixed format both sides follow would do)
const agreed = (inst, c) => { const l = inst.specs[c.prod].find((x) => x.startsWith(`${c.enc}(rec):`)), m = l.match(/house style is to (.*?)\. The house style/); return m ? m[1] : 'a fixed format'; };
const keyOf = (c) => (c.kind === 'directed' ? `D:${c.holder}>${c.impl}:${c.need}` : `S:${c.prod}>${c.cons}:${c.enc}`);
// the ideal note items of member m: one line per edge it was on, in case-1 check order; tag = the module a line is about
export function idealItems(inst, m) {
  const items = [];
  for (const c of inst.checks) {
    if (c.kind === 'directed' && (c.holder === m || c.impl === m)) {
      const text = `${mod(c.impl)}.${c.helper} (helper used by ${mod(c.holder)}.${c.fn}) must return ${c.need}.`;
      // library: the helper owner needs it; the caller's own line is about the helper's module, the owner's about its own
      items.push({ key: keyOf(c), text, about: [c.impl] });
    } else if (c.kind === 'symmetric' && (c.prod === m || c.cons === m)) {
      const text = `${c.enc.slice(6)} records, ${mod(c.prod)}.${c.enc} to ${mod(c.cons)}.${c.dec}: agreed format: ${agreed(inst, c)}.`;
      items.push({ key: keyOf(c), text, about: [c.prod, c.cons] });
    }
  }
  return items;
}
const survivors = (lines, cutText) => { const kept = cutText.split('\n'); return lines.filter((l, i) => kept[i] === l.text); };

export async function stage0({ seeds, k = 80, shape = GN1_SHAPE, f = GN1_F, max = NOTE_TOKENS, count = bytesCounter }) {
  const perSeq = [];
  for (const seed of seeds) {
    const [c1, c2] = makeSequence(seed, { type: 'related', cases: 2, k, shape, f });
    const nb = [], libWritten = [];
    for (let m = 0; m < k; m++) {
      const items = idealItems(c1, m);
      const cut = await cutToTokens(items.map((x) => x.text).join('\n'), max, count);
      nb[m] = { keys: new Set(survivors(items, cut.text).map((x) => x.key)), cut };
      const lines = items.flatMap((x) => x.about.map((a) => ({ key: x.key, text: `${mod(a)}: ${x.text}` })));
      const lcut = await cutToTokens(lines.map((x) => x.text).join('\n'), max, count);
      libWritten[m] = { text: lcut.text, lines, cut: lcut };
    }
    const lib = [];
    for (let m = 0; m < k; m++) {
      const view = await libraryRead(libWritten, m, k, max, count), seen = new Set(view.text.split('\n'));
      const keys = new Set(); for (let a = 0; a < k; a++) for (const l of libWritten[a].lines) if (l.text.startsWith(`${mod(m)}: `) && seen.has(l.text)) keys.add(l.key);
      lib[m] = { keys, view };
    }
    const failing = check(c2, new Array(k).fill(''), { strict: true }).map((v) => v.id), by = new Map(c2.checks.map((c) => [c.id, c]));
    const has = (read, c) => (c.kind === 'directed' ? read[c.impl].keys.has(keyOf(c)) : c.kind === 'symmetric' ? read[c.prod].keys.has(keyOf(c)) && read[c.cons].keys.has(keyOf(c)) : false);
    const row = { seed, failing: failing.length, notebook: 0, library: 0, byKind: {}, notebookCut: nb.filter((x) => x.cut.cut).length, libraryWriteCut: libWritten.filter((x) => x.cut.cut).length, libraryReadCut: lib.filter((x) => x.view.cut).length };
    for (const id of failing) {
      const c = by.get(id), b = (row.byKind[c.kind] ||= { failing: 0, repeated: 0, notebook: 0, library: 0 });
      b.failing++; if (c.repeat) b.repeated++;
      if (has(nb, c)) { row.notebook++; b.notebook++; }
      if (has(lib, c)) { row.library++; b.library++; }
    }
    perSeq.push(row);
  }
  const sum = (f2) => perSeq.reduce((n, r) => n + f2(r), 0), failing = sum((r) => r.failing);
  return { seeds, k, shape, f, maxTokens: max, counter: count.label || 'custom', failing,
    notebook: { inNotes: sum((r) => r.notebook), share: sum((r) => r.notebook) / failing },
    library: { inNotes: sum((r) => r.library), share: sum((r) => r.library) / failing }, perSeq };
}
// the registered gate on a stage-0 result
export const stage0Gate = (res, gate = 0.2) => ({ stop: res.notebook.share < gate, dropLibrary: res.library.share < gate, notebookShare: res.notebook.share, libraryShare: res.library.share, gate });

if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'observatory/batch2/gn1/bench.json', spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const offline = process.argv.includes('--offline') || process.env.RC_COUNT_STUB === 'YES';
  const count = offline ? bytesCounter : apiCounter((await import('../../../library/cards/batch-api.mjs')).countTokens, spec.model);
  const res = await stage0({ seeds: spec.sequences.related, k: spec.k, shape: spec.shape, f: spec.f, max: spec.notesTokens, count });
  console.log(JSON.stringify({ ...res, gate: stage0Gate(res, spec.stage0.gate) }, null, 1));
}
