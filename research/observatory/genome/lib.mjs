// G1 swarm genome: pure functions (prompt, schema, consensus, statistics). No network, no key.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TRAITS = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/genome/traits.json'), 'utf8'));
export const SPECIES = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/genome/species.json'), 'utf8')).species;
export const TRAIT_IDS = TRAITS.traits.map((t) => t.id);
export const hash = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');

// Batch list prices, USD per million tokens (Claude API, 50% batch discount), 2026-11-13.
export const CODERS = {
  A: { model: 'claude-opus-5-5', inUsd: 2.0, outUsd: 10.0 },
  B: { model: 'claude-sonnet-5-5', inUsd: 1.0, outUsd: 5.0 },
};
export const MAX_TOKENS = 32000;

const cell = {
  type: 'object', additionalProperties: false,
  required: ['state', 'strength', 'confidence', 'evidence', 'refs'],
  properties: {
    state: { type: 'string', enum: ['present', 'variable', 'absent', 'unknown'] },
    strength: { type: 'integer', enum: [0, 1, 2, 3] },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    evidence: { type: 'string' },
    refs: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['authors', 'year', 'title', 'doi'],
      properties: { authors: { type: 'string' }, year: { type: 'integer' }, title: { type: 'string' }, doi: { type: ['string', 'null'] } } } },
  },
};
const condSchema = (c) => c.type === 'log10' ? { type: 'number' } : c.type === 'set'
  ? { type: 'array', items: { type: 'string', enum: c.values } } : { type: 'string', enum: c.values };

export const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['traits', 'conditions', 'note'],
  $defs: { cell },
  properties: {
    traits: { type: 'object', additionalProperties: false, required: TRAIT_IDS,
      properties: Object.fromEntries(TRAIT_IDS.map((id) => [id, { $ref: '#/$defs/cell' }])) },
    conditions: { type: 'object', additionalProperties: false, required: TRAITS.conditions.map((c) => c.id),
      properties: Object.fromEntries(TRAITS.conditions.map((c) => [c.id, condSchema(c)])) },
    note: { type: 'string' },
  },
};

export const SYSTEM = [
  'You are a comparative behavioural ecologist coding collective behaviour for a trait matrix. You code one collective system at a time against a fixed list of traits and conditions.',
  '',
  'Rules:',
  '- Base every state on published evidence about this system, not on its relatives. If the trait has not been studied in this system, the state is "unknown"; do not infer it from related species.',
  '- "present": documented in this system. "variable": documented in some populations, castes or conditions and not others. "absent": studied and not found, or impossible for this body plan. "unknown": not studied or you are not sure.',
  '- strength: 0 when absent or unknown; 1 weak or occasional; 2 clear; 3 a defining feature of this system.',
  '- evidence: at most 40 words, the concrete finding. Empty string when unknown.',
  '- refs: at most two works that report the finding. Cite only works you are confident exist, with their real authors, year and title. Give the DOI only if you are sure of it; otherwise null. An empty list is better than an invented reference.',
  '- conditions: code the typical functioning collective of this system. C-SIZE is log10 of the typical number of members.',
  '- note: at most 60 words on anything that limits the coding (for example the unit chosen).',
  '',
  'Traits:',
  ...TRAITS.traits.map((t) => `${t.id} ${t.name}: ${t.definition}`),
  '',
  'Conditions:',
  ...TRAITS.conditions.map((c) => `${c.id} ${c.name} (${c.type}${c.values ? ': ' + c.values.join(', ') : ''}): ${c.definition}`),
].join('\n');

export function request(coder, sp) {
  const c = CODERS[coder];
  return {
    custom_id: `${coder}-${sp.id}`.slice(0, 64),
    params: {
      model: c.model, max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `System to code: ${sp.name} (${sp.common}). Unit: one functioning collective of this system. Code all ${TRAIT_IDS.length} traits and all conditions.` }],
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
    },
  };
}

export const reserveUsd = (coder, inputTokens) => (inputTokens * CODERS[coder].inUsd + MAX_TOKENS * CODERS[coder].outUsd) / 1e6;
export function usageUsd(model, u) {
  const c = Object.values(CODERS).find((x) => x.model === model);
  if (!c || !u) return null;
  const read = u.cache_read_input_tokens || 0, write = u.cache_creation_input_tokens || 0;
  return ((u.input_tokens || 0) * c.inUsd + read * c.inUsd * 0.1 + write * c.inUsd * 1.25 + (u.output_tokens || 0) * c.outUsd) / 1e6;
}

// ---- consensus and statistics ----
export const collapse = (s) => (s === 'present' || s === 'variable' ? 'p' : s === 'absent' ? 'a' : 'u');
export function consensus(a, b) {
  if (!a || !b) return 'U';
  const x = collapse(a.state), y = collapse(b.state);
  if (x === 'p' && y === 'p') return 'P';
  if (x === 'a' && y === 'a') return 'A';
  if (x === 'u' && y === 'u') return 'U';
  return 'C';
}

export function cohenKappa(pairs) {
  const cats = [...new Set(pairs.flat())], n = pairs.length;
  if (!n) return null;
  const po = pairs.filter(([x, y]) => x === y).length / n;
  const pe = cats.reduce((s, c) => s + (pairs.filter(([x]) => x === c).length / n) * (pairs.filter(([, y]) => y === c).length / n), 0);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

const lfact = (() => { const t = [0]; for (let i = 1; i < 2000; i++) t[i] = t[i - 1] + Math.log(i); return (n) => t[n]; })();
// One-sided Fisher exact test that the trait is MORE frequent in the group: table [[a,b],[c,d]], a = in group & present.
export function fisherGreater(a, b, c, d) {
  const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
  const p = (x) => Math.exp(lfact(r1) + lfact(r2) + lfact(c1) + lfact(n - c1) - lfact(n) - lfact(x) - lfact(r1 - x) - lfact(c1 - x) - lfact(r2 - c1 + x));
  let s = 0; for (let x = a; x <= Math.min(r1, c1); x++) s += p(x);
  return Math.min(1, s);
}

export const jaccard = (A, B) => { const u = new Set([...A, ...B]); if (!u.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / u.size; };

export function mulberry32(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const titleTokens = (s) => new Set(String(s || '').toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
export function titleMatch(a, b) { const A = titleTokens(a), B = titleTokens(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / Math.max(A.size, B.size); }
