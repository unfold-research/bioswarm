// M4 (H-M03, H-02; Murmur): at the same number of calls, is it better to spend the last call on a verifier or on one more
// searcher? M3 measured a verifier on planted errors only. Here the errors are the searchers' own.
// Task: a synthetic literature search. Each task lists 12, 24 or 48 study records; the searcher must name the study with
// the largest sample among those meeting three conditions. Decoys with larger samples fail exactly one condition.
// Wave 0: five independent searcher samples per task (s0..s4), answer only.
// Wave 1: a verifier that sees the records and one proposed answer, for each distinct answer among s0, s1 and the planted
// decoy (the largest decoy), and returns accept or reject.
// Strategies compared, all computed from the same calls:
//   single   s0                                                            1 call
//   vote3    plurality of s0..s2                                           3 calls
//   verify3  s0 if the verifier accepts it, otherwise s1                   2 or 3 calls
//   vote5    plurality of s0..s4                                           5 calls
//   chain5   s0 if accepted, otherwise s1 if accepted, otherwise s2        2 to 5 calls
// Plurality ties go to the earliest sample. An answer that is not the id of a record is rejected by a deterministic check.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';

export const ID = 'm4-budget';
export const TITLE = 'M4 verifier or one more searcher at the same budget (H-M03, H-02)';
export const PREREG = 'tasks/M4-BUDGET-PREREG.md';
export const WAVES = 2;
export const LEVELS = [12, 24, 48];
export const PER_LEVEL = 30, SAMPLES = 5;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 14001 + i);
export const GATE = { maxInvalidShare: 0.1 }, BAND = [0.2, 0.9];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const qualifies = (r) => r.review === 'peer-reviewed' && r.year >= 2020 && r.outcome === 'positive';
export function makeTasks() {
  return SEEDS.map((seed, ix) => {
    const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), level = LEVELS[ix % LEVELS.length], k = level / 6;
    const ns = new Set(); while (ns.size < level) ns.add(int(120, 9980)); const sorted = [...ns].sort((a, b) => b - a);
    const ids = new Set(); while (ids.size < level) ids.add(`s-${int(0, 46655).toString(36).padStart(3, '0')}`); const idList = [...ids];
    const records = sorted.map((n, rank) => {
      const good = { year: int(2020, 2025), review: 'peer-reviewed', outcome: 'positive' };
      if (rank < k) { const fail = rank % 3; return { id: idList[rank], ...good, ...(fail === 0 ? { year: 2019 } : fail === 1 ? { review: 'preprint' } : { outcome: rank % 2 ? 'negative' : 'null' }), n }; } // decoys: larger than every qualifier, one condition short
      if (rank < 2 * k) return { id: idList[rank], ...good, n }; // qualifiers; the first of them is the answer
      const r = { id: idList[rank], year: int(2012, 2025), review: rnd() < 0.5 ? 'peer-reviewed' : 'preprint', outcome: ['positive', 'negative', 'null'][int(0, 2)], n };
      return qualifies(r) ? { ...r, review: 'preprint' } : r;
    });
    const answer = records[k].id, planted = records[0].id;
    for (let i = records.length - 1; i > 0; i--) { const j = int(0, i); [records[i], records[j]] = [records[j], records[i]]; }
    return { id: `lit-${seed}`, seed, level, records, answer, planted };
  });
}
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const SYS = {
  search: `You are a research assistant in a synthetic literature search exercise. Each record describes one study: id, year, review status, outcome and sample size n. Find the study with the largest n among those that are ${COND}. Answer with its id only. Return only JSON matching the schema.`,
  verify: `You check a proposed answer in a synthetic literature search exercise. Each record describes one study: id, year, review status, outcome and sample size n. The task was to name the study with the largest n among those that are ${COND}. Accept the proposed answer only if that study meets the three conditions and no other study meeting them has a larger n. Return only JSON matching the schema.`,
};
const SCHEMA = { search: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false }, verify: { type: 'object', properties: { accept: { type: 'boolean' } }, required: ['accept'], additionalProperties: false } };
const req = (kind, content) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: SCHEMA[kind] } }, system: SYS[kind], messages: [{ role: 'user', content: JSON.stringify(content) }] });
const answerOf = (outputs, seed, s) => { const o = outputs.get(`m4-${seed}-s${s}`)?.output; return o && typeof o.id === 'string' ? o.id.trim() : null; };
const verifierRows = (t, proposals) => proposals.map((p) => ({ custom_id: `m4-${t.seed}-v-${p}`, params: req('verify', { task_id: t.id, records: t.records, proposed_answer: p }), meta: { kind: 'verify', seed: t.seed, level: t.level, proposed: p, truthCorrect: p === t.answer, planted: p === t.planted } }));

export function wave(k, outputs) {
  const tasks = makeTasks();
  if (k === 0) return tasks.flatMap((t) => Array.from({ length: SAMPLES }, (_, s) => ({ custom_id: `m4-${t.seed}-s${s}`, params: req('search', { task_id: t.id, records: t.records }), meta: { kind: 'search', seed: t.seed, level: t.level, sample: s, answer: t.answer, planted: t.planted, ids: t.records.map((r) => r.id) } })));
  return tasks.flatMap((t) => { const known = new Set(t.records.map((r) => r.id)); return verifierRows(t, [...new Set([t.planted, answerOf(outputs, t.seed, 0), answerOf(outputs, t.seed, 1)].filter((a) => a && known.has(a)))]); });
}
// Reservation ceiling of wave 1: three distinct proposals per task.
export const ceiling = (k) => makeTasks().flatMap((t) => verifierRows(t, [t.planted, t.answer, t.records.find((r) => r.id !== t.planted && r.id !== t.answer).id]));
export function score(k, rows, outputs) {
  return rows.map((q) => { const o = outputs.get(q.custom_id)?.output, m = q.meta;
    if (m.kind === 'search') { const valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null; return { customId: q.custom_id, kind: 'search', seed: m.seed, level: m.level, sample: m.sample, valid, answer: a, known: valid && m.ids.includes(a), correct: a === m.answer, planted: a === m.planted }; }
    const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', seed: m.seed, level: m.level, proposed: m.proposed, truthCorrect: m.truthCorrect, planted: m.planted, valid, accept: valid && o.accept === true }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function plurality(answers) { const c = new Map(); let best = null; answers.forEach((a, i) => { if (a === null) return; const e = c.get(a) || { n: 0, first: i }; e.n++; c.set(a, e); }); for (const [a, e] of c) if (!best || e.n > best.n || (e.n === best.n && e.first < best.first)) best = { a, ...e }; return best ? best.a : null; }
const wilson = (k, n) => { if (!n) return null; const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
const STRATEGIES = ['single', 'vote3', 'verify3', 'vote5', 'chain5', 'any3'];
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated' } };
  const verdict = new Map(s1.map((x) => [`${x.seed}/${x.proposed}`, x.accept]));
  const perTask = SEEDS.map((seed) => { const r = s0.filter((x) => x.seed === seed).sort((a, b) => a.sample - b.sample), a = r.map((x) => (x.valid ? x.answer : null)), truth = r.find((x) => x.correct)?.answer;
    const ok = (x) => (r.some((y) => y.answer === x && y.correct) ? 1 : 0), acc = (i) => !!a[i] && r[i].known && verdict.get(`${seed}/${a[i]}`) === true;
    const v3 = acc(0) ? { a: a[0], calls: 2 } : { a: a[1], calls: 3 }, c5 = acc(0) ? { a: a[0], calls: 2 } : acc(1) ? { a: a[1], calls: 4 } : { a: a[2], calls: 5 };
    return { seed, level: r[0].level, single: ok(a[0]), vote3: ok(plurality(a.slice(0, 3))), verify3: ok(v3.a), vote5: ok(plurality(a)), chain5: ok(c5.a), any3: a.slice(0, 3).some((x) => ok(x)) ? 1 : 0, callsVerify3: v3.calls, callsChain5: c5.calls, truth }; });
  const mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null), accOf = (rows) => Object.fromEntries(STRATEGIES.map((s) => [s, mean(rows, (x) => x[s])]));
  const byLevel = Object.fromEntries(LEVELS.map((L) => [L, { tasks: PER_LEVEL, ...accOf(perTask.filter((x) => x.level === L)) }]));
  const analysisLevels = LEVELS.filter((L) => byLevel[L].single >= BAND[0] && byLevel[L].single <= BAND[1]), pool = perTask.filter((x) => analysisLevels.includes(x.level));
  const rnd = mulberry32(20261112), boot = (a, b) => { if (!pool.length) return null; const d = []; for (let i = 0; i < 4000; i++) { let s = 0; for (let j = 0; j < pool.length; j++) { const t = pool[Math.floor(rnd() * pool.length)]; s += t[a] - t[b]; } d.push(s / pool.length); } d.sort((x, y) => x - y); return { diff: mean(pool, (t) => t[a] - t[b]), ci95: [d[Math.floor(0.025 * d.length)], d[Math.floor(0.975 * d.length)]] }; };
  const d3 = boot('verify3', 'vote3'), d5 = boot('chain5', 'vote5'), verdictOf = (d) => (!d ? 'inconclusive' : d.ci95[0] > 0 ? 'supported' : d.ci95[1] < 0 ? 'refuted' : 'not supported');
  const natural = s1.filter((v) => s0.some((x) => x.seed === v.seed && x.sample <= 1 && x.answer === v.proposed)), wrong = natural.filter((v) => !v.truthCorrect), right = natural.filter((v) => v.truthCorrect), planted = s1.filter((v) => v.planted);
  const rate = (rows, f) => ({ n: rows.length, k: rows.filter(f).length, rate: rows.length ? rows.filter(f).length / rows.length : null, ci95: wilson(rows.filter(f).length, rows.length) });
  const verifier = { specificity: rate(right, (v) => v.accept), sensitivityOwnErrors: rate(wrong, (v) => !v.accept), sensitivityPlanted: rate(planted, (v) => !v.accept), invalid: s1.filter((v) => !v.valid).length };
  return { byLevel, analysisLevels, pooled: pool.length ? { tasks: pool.length, ...accOf(pool), meanCallsVerify3: mean(pool, (x) => x.callsVerify3), meanCallsChain5: mean(pool, (x) => x.callsChain5) } : null, overall: accOf(perTask), verify3MinusVote3: d3, chain5MinusVote5: d5, verifier,
    tests: { P1: verdictOf(d3), P2: verdictOf(d5), P3: verifier.specificity.rate === null ? 'inconclusive' : verifier.specificity.rate >= 0.9 ? 'supported' : 'not supported' } };
}
