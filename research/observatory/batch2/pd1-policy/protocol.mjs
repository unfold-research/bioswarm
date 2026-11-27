// PD1 policy discovery: a model plans a search policy from a few examples, the plan is written as a rule, and the rule
// is checked by simulation. Follows RD (a larger model found the planned search that code then ran for nothing) and asks
// whether that works as a method on a field whose structure is not the ring.
//
// Field: 24 parts. Each part has a position in a ring (its number) and three labels: `source` (6 values, 4 parts each),
// `shelf` (4 values, 6 parts each) and `batch` (8 values, 3 parts each), assigned independently at random in every field.
// Three parts were edited. Which three depends on the domain, which no regime is told:
//   ring    three neighbouring parts          source  three of the four parts of one source
//   shelf   three of the six parts of a shelf  batch   the three parts of one batch
// Budget: 8 re-counts in 4 rounds of 2. A field is right when at least two of the three edited parts are re-counted
// (the T1 margins: 20 against 16, three studies added per edited part). Readers are simulated with exact counts, so a
// re-count of an edited part always shows as changed.
//
// A policy is three values:
//   follow        none | ring | source | shelf | batch: after a changed part, go first to untouched parts related to it
//   follow_limit  1, 2, 3 or 6: at most this many parts followed per changed part
//   probe         in_order | spread_ring | spread_source | spread_shelf | spread_batch: where to look otherwise
// The model returns a policy in this form, so no person translates the plan. Only the planning call uses a model.
import { MODEL } from '../../lab007-economy/model.mjs';
import { mulberry32 } from '../littask.mjs';

export const TITLE = 'PD1 policy discovery: a plan made by a model from a few examples, run as a rule';
export const PREREG = 'tasks/PD1-PREREG.md';
export const PARTS = 24, ROUNDS = 4, WORKERS = 2, DOMAINS = ['ring', 'source', 'shelf', 'batch'], LABELS = { source: 6, shelf: 4, batch: 8 };
export const FOLLOW = ['none', 'ring', 'source', 'shelf', 'batch'], LIMITS = [1, 2, 3, 6], PROBE = ['in_order', 'spread_ring', 'spread_source', 'spread_shelf', 'spread_batch'];
export const KS = [0, 1, 4], REPS = 10, SONNET = 'claude-sonnet-5-5', GATE = { maxInvalidShare: 0.1 };
export const CONTROLS = { exempt: 'no collective is compared with one agent: the study compares ways of choosing a rule (a model, a fit by simulation on the same examples, a rule carried over from the ring, the best rule of the family), all scored by simulation on the same fields' };
export const POLICIES = [{ follow: 'none', follow_limit: 1 }, ...FOLLOW.slice(1).flatMap((follow) => LIMITS.map((follow_limit) => ({ follow, follow_limit })))].flatMap((f) => PROBE.map((probe) => ({ ...f, probe })));
export const RING_RULE = { follow: 'ring', follow_limit: 2, probe: 'spread_ring' }; // the planned search of RD, carried over unchanged
export const keyOf = (p) => `${p.follow}/${p.follow === 'none' ? 1 : p.follow_limit}/${p.probe}`;

export function makeField(seed, domain) {
  const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const label = (n) => shuffle(Array.from({ length: PARTS }, (_, i) => i % n)), source = label(6), shelf = label(4), batch = label(8), all = Array.from({ length: PARTS }, (_, i) => i);
  let block;
  if (domain === 'ring') { const s = int(0, PARTS - 1); block = [s, (s + 1) % PARTS, (s + 2) % PARTS]; }
  else { const lab = { source, shelf, batch }[domain], v = int(0, LABELS[domain] - 1); block = shuffle(all.filter((p) => lab[p] === v)).slice(0, 3); }
  return { seed, domain, parts: all.map((p) => ({ part: p, source: `s${source[p] + 1}`, shelf: `h${shelf[p] + 1}`, batch: `b${batch[p] + 1}` })), block: block.sort((a, b) => a - b) };
}
const SPREAD_RING = [0, 12, 6, 18, 3, 15, 9, 21, 1, 13, 7, 19, 4, 16, 10, 22, 2, 14, 8, 20, 5, 17, 11, 23];
function probeOrder(f, probe) {
  if (probe === 'in_order') return f.parts.map((x) => x.part); if (probe === 'spread_ring') return SPREAD_RING;
  const lab = probe.slice(7), values = [...new Set(f.parts.map((x) => x[lab]))].sort(), groups = values.map((v) => f.parts.filter((x) => x[lab] === v).map((x) => x.part)), out = [];
  for (let i = 0; out.length < PARTS; i++) for (const g of groups) if (g[i] !== undefined) out.push(g[i]); return out;
}
const related = (f, a, follow) => (follow === 'ring' ? [(a + 1) % PARTS, (a + PARTS - 1) % PARTS] : follow === 'none' ? [] : f.parts.filter((x) => x.part !== a && x[follow] === f.parts[a][follow]).map((x) => x.part));
// Runs a policy on a field with exact readers. Returns whether it is right and the re-counts made when the second edited part was found.
export function run(f, policy) {
  const touched = [], changed = [], followed = new Map(), order = probeOrder(f, policy.probe), limit = policy.follow === 'none' ? 0 : policy.follow_limit; let found = 0, at = null;
  for (let r = 0; r < ROUNDS; r++) { const want = [];
    for (const a of changed) { let n = followed.get(a) || 0; for (const p of related(f, a, policy.follow)) if (n < limit && !touched.includes(p) && !want.includes(p)) { want.push(p); n++; } }
    for (const p of order) if (!touched.includes(p) && !want.includes(p)) want.push(p);
    for (const p of want.slice(0, WORKERS)) { touched.push(p); for (const a of changed) if (related(f, a, policy.follow).includes(p)) followed.set(a, (followed.get(a) || 0) + 1); if (f.block.includes(p)) { changed.push(p); found++; if (found === 2 && at === null) at = touched.length; } } }
  return { correct: found >= 2 ? 1 : 0, at: at ?? ROUNDS * WORKERS + 1, touched };
}
export const valid = (p) => !!p && FOLLOW.includes(p.follow) && LIMITS.includes(p.follow_limit) && PROBE.includes(p.probe);
export const accuracy = (policy, fields) => fields.reduce((n, f) => n + run(f, policy).correct, 0) / fields.length;
export const testFields = (domain, n = 1000, from = 810001) => Array.from({ length: n }, (_, i) => makeField(from + DOMAINS.indexOf(domain) * 100000 + i, domain));
// Fit by simulation on the examples: most examples right, then fewest re-counts to the second edited part, then list order.
export function fit(examples) { let best = null; for (const p of POLICIES) { const o = examples.map((f) => run(f, p)), s = [o.reduce((n, x) => n + x.correct, 0), -o.reduce((n, x) => n + x.at, 0)]; if (!best || s[0] > best.s[0] || (s[0] === best.s[0] && s[1] > best.s[1])) best = { p, s }; } return best.p; }

// Planning cells: 4 domains x K in {1, 4} x 10 replicates, plus 10 replicates with no example (K = 0).
export const CELLS = [...Array.from({ length: REPS }, (_, r) => ({ domain: null, k: 0, rep: r })), ...DOMAINS.flatMap((domain) => [1, 4].flatMap((k) => Array.from({ length: REPS }, (_, r) => ({ domain, k, rep: r }))))];
export const examplesOf = (c) => Array.from({ length: c.k }, (_, i) => makeField(610001 + DOMAINS.indexOf(c.domain) * 10000 + c.k * 1000 + c.rep * 10 + i, c.domain));
const idOf = (c) => `pd1-${c.domain || 'none'}-k${c.k}-r${c.rep}`;
const SYSTEM = `You plan how a team re-checks a collection of study records in a synthetic bibliometric exercise. The collection is split into ${PARTS} parts, numbered 0 to ${PARTS - 1} and arranged in a ring (part ${PARTS - 1} is next to part 0). Each part also has three labels: a source (6 values, 4 parts each), a shelf (4 values, 6 parts each) and a batch (8 values, 3 parts each). The labels are assigned differently in every collection. Every part was counted once. Since then exactly three parts were edited, and nobody knows which. The team can re-count only ${ROUNDS * WORKERS} parts, two per round for ${ROUNDS} rounds; a re-count of an edited part shows as changed. The result is right only if at least two of the three edited parts are re-counted.

You do not direct the team round by round. You write one policy, which will be applied by code to many future collections of the same kind, each with its own labels and its own edited parts. A policy has three settings:
- follow: after a part shows as changed, the team goes first to parts related to it that have not been re-counted. "ring" means its two neighbours in the ring; "source", "shelf" or "batch" means the parts with the same label; "none" means changed parts are not followed.
- follow_limit: at most this many related parts are re-counted for each changed part (1, 2, 3 or 6).
- probe: where the team looks when there is nothing to follow. "in_order": parts 0, 1, 2, ... "spread_ring": parts far apart in the ring first (0, 12, 6, 18, 3, ...). "spread_source", "spread_shelf", "spread_batch": one part of each value of that label first, then a second part of each value, and so on.

\`examples\` lists past collections of the same kind, with the labels of each part and whether it was one of the edited parts. It may be empty. Choose the policy that will be right most often on future collections. Write your working in \`working\`, at most 120 words, then the three settings. Return only JSON matching the schema.`;
const SCHEMA = { type: 'object', properties: { working: { type: 'string' }, follow: { type: 'string', enum: FOLLOW }, follow_limit: { type: 'integer', enum: LIMITS }, probe: { type: 'string', enum: PROBE } }, required: ['working', 'follow', 'follow_limit', 'probe'], additionalProperties: false };
export function rows(model) {
  return CELLS.map((c) => { const content = { examples: examplesOf(c).map((f, i) => ({ collection: i + 1, parts: f.parts.map((x) => ({ ...x, edited: f.block.includes(x.part) })) })) };
    const params = model === 'sonnet' ? { model: SONNET, max_tokens: 2048, output_config: { format: { type: 'json_schema', schema: SCHEMA }, effort: 'low' }, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(content) }] }
      : { model: MODEL, max_tokens: 768, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: SCHEMA } }, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(content) }] };
    return { custom_id: idOf(c), params, meta: { ...c } }; });
}
export const WAVES = 1;
export function score(k, rs, outputs) { return rs.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, ok = valid(o); return { customId: q.custom_id, ...q.meta, valid: ok, truncated: item?.stopReason === 'max_tokens', policy: ok ? { follow: o.follow, follow_limit: o.follow_limit, probe: o.probe } : null }; }); }
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarize(scoredByWave) { const all = scoredByWave.flat(); return { plans: all.length, invalid: all.filter((x) => !x.valid).length, truncated: all.filter((x) => x.truncated).length, perCell: all }; }
