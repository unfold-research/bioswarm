// GN1: the largest single-request FULL reservation in each part of the design (no network, no model). Builds the requests
// with the runner's own builders (code.mjs memberRequest + plan for stigwait, notes.mjs withNotes / noteRequest) on the
// registered instances, in a worst case for prompt size, and prices them with the reservation function the backend uses
// (lab007-economy/pricing.mjs reserveMeasured). Input tokens are counted offline as bytes / 3 of the request JSON (the
// runner's stub counter, an overcount for this kind of text).
// Worst case: every module's current code is as long as the output limit allows (memberMax tokens, written as 4 bytes
// of text per token, which the bytes/3 counter counts as 4/3 x memberMax tokens; a member request also shows the code
// of the modules it works with, so this term dominates), every check fails, every directed check it holds carries a
// 400-character trace, notes are at the 300-token cut (900 bytes), and a note request lists 40 failing
// checks; a member request carries the most failing checks stigwait assigns it in any of the act rounds. Also the start
// wave (empty code) as built.
// Usage: node observatory/batch2/rc/gn1-maxreserve.mjs [spec.json] [--k N] [--cases 2|3] [--code-tokens N]   (--k other than the spec's: the
// same per-module density; at k160 the family generator cannot draw a third case (fresh names run out), use --cases 2:
// case 3 is built like case 2)
import fs from 'node:fs';
import * as W from './code.mjs';
import { makeSequence } from './family.mjs';
import { withNotes, noteRequest, SEEN_MAX } from './notes.mjs';
import { reserveMeasured } from '../../lab007-economy/pricing.mjs';

const args = process.argv.slice(2), specPath = args.find((a) => a.endsWith('.json')) || 'observatory/batch2/gn1/bench.json';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')), ki = args.indexOf('--k'), k = ki >= 0 ? Number(args[ki + 1]) : spec.k;
const ci_ = args.indexOf('--cases'), CASES = ci_ >= 0 ? Number(args[ci_ + 1]) : 3;
const shape = k === spec.k ? spec.shape : { ...spec.shape, directed: 2 * k, symmetric: Math.round(53 * k / 80) };
const count = (p) => Math.ceil(Buffer.byteLength(JSON.stringify(p)) / 3);
const price = (p) => reserveMeasured(p, count(p)).usd;
// code length per module in output tokens (default: the output limit, memberMax); member requests also show the code of
// the modules a member works with, so this dominates the worst case
const cti = args.indexOf('--code-tokens'), CODE_TOKENS = cti >= 0 ? Number(args[cti + 1]) : spec.memberMax;
const bigCode = (m) => `// module M${m + 1}\n` + 'x'.repeat(CODE_TOKENS * 4);
const notes = 'n'.repeat(900);
const seqs = [...spec.sequences.related.map((s) => ['related', s]), ...spec.sequences.control.slice(0, 1).map((s) => ['control', s])];
const rows = { 'case 1, start wave (empty code)': [], 'case 1, later waves (worst case)': [], 'case 2/3, start wave, notebook': [], 'case 2/3, start wave, library': [],
  'case 2/3, later waves, notebook (worst case)': [], 'case 2/3, later waves, library (worst case)': [], 'note writing after case 1, notebook': [], 'note writing after case 1, library': [],
  'note writing after case 2, notebook (sees its case-1 notes)': [], 'note writing after case 2, library (sees its case-1 lines)': [] };
let n = 0;
for (const [type, seed] of seqs) {
  const fam = makeSequence(seed, { type, cases: CASES, k, shape, f: spec.f });
  for (const [ci, I] of fam.entries()) {
    const empty = new Array(I.k).fill(''), big = Array.from({ length: I.k }, (_, m) => bigCode(m));
    const vs = W.check(I, big, { strict: true }), traces = Object.fromEntries(I.checks.filter((c) => c.kind === 'directed').map((c) => [c.id, 't'.repeat(400)]));
    const plans = Array.from({ length: spec.rounds }, (_, r) => W.plan(I, vs, r + 1, 'stigwait', traces)), texts = vs.map((v) => [v.id, v.text]).sort((a, b) => b[1].length - a[1].length).slice(0, SEEN_MAX).map(([id, t]) => `[${id}] ${t}`);
    for (let m = 0; m < I.k; m++) {
      const w0 = W.memberRequest(spec.model, I, m, empty, [], spec.memberMax, { effort: spec.effort }), assigned = plans.map((p) => p.get(m) || []).sort((a, b) => b.length - a.length)[0]; // the round that assigns it the most
      const wk = W.memberRequest(spec.model, I, m, big, assigned, spec.memberMax, { effort: spec.effort });
      if (ci === 0) { rows['case 1, start wave (empty code)'].push(price(w0)); rows['case 1, later waves (worst case)'].push(price(wk)); }
      else for (const arm of ['notebook', 'library']) { rows[`case 2/3, start wave, ${arm}`].push(price(withNotes(w0, m, arm, notes))); rows[`case 2/3, later waves, ${arm} (worst case)`].push(price(withNotes(wk, m, arm, notes))); }
      if (ci < 2) for (const arm of ['notebook', 'library']) {
        const p = noteRequest(spec.model, I, m, big, texts, arm, spec.notesMax, spec.effort, ci === 0 ? null : notes);
        rows[ci === 0 ? `note writing after case 1, ${arm}` : `note writing after case 2, ${arm} (${arm === 'notebook' ? 'sees its case-1 notes' : 'sees its case-1 lines'})`].push(price(p));
      }
      n++;
    }
  }
}
const out = Object.entries(rows).map(([part, xs]) => ({ part, requests: xs.length, maxUsd: +Math.max(...xs).toFixed(6), meanUsd: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(6) }));
console.log(JSON.stringify({ k, cases: CASES, codeTokens: CODE_TOKENS, shape, model: spec.model, memberMax: spec.memberMax, notesMax: spec.notesMax, counter: 'bytes/3 of the request JSON', overallMaxUsd: Math.max(...out.map((x) => x.maxUsd)), parts: out }, null, 1));
