// Synthetic literature-search task shared by M5 and V2 (same construction as M4, seeds supplied by the study).
// Each task lists 12, 24 or 48 study records; the answer is the study with the largest sample among those that are
// peer-reviewed, from 2020 or later and positive. One sixth qualify; one sixth are larger decoys missing one condition.
export const LEVELS = [12, 24, 48];
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const qualifies = (r) => r.review === 'peer-reviewed' && r.year >= 2020 && r.outcome === 'positive';
export function makeTasks(seeds, levels = LEVELS) {
  return seeds.map((seed, ix) => {
    const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), level = levels[ix % levels.length], k = level / 6;
    const ns = new Set(); while (ns.size < level) ns.add(int(120, 9980)); const sorted = [...ns].sort((a, b) => b - a);
    const ids = new Set(); while (ids.size < level) ids.add(`s-${int(0, 46655).toString(36).padStart(3, '0')}`); const idList = [...ids];
    const records = sorted.map((n, rank) => {
      const good = { year: int(2020, 2025), review: 'peer-reviewed', outcome: 'positive' };
      if (rank < k) { const fail = rank % 3; return { id: idList[rank], ...good, ...(fail === 0 ? { year: 2019 } : fail === 1 ? { review: 'preprint' } : { outcome: rank % 2 ? 'negative' : 'null' }), n }; }
      if (rank < 2 * k) return { id: idList[rank], ...good, n };
      const r = { id: idList[rank], year: int(2012, 2025), review: rnd() < 0.5 ? 'peer-reviewed' : 'preprint', outcome: ['positive', 'negative', 'null'][int(0, 2)], n };
      return qualifies(r) ? { ...r, review: 'preprint' } : r;
    });
    const answer = records[k].id, planted = records[0].id;
    for (let i = records.length - 1; i > 0; i--) { const j = int(0, i); [records[i], records[j]] = [records[j], records[i]]; }
    return { id: `lit-${seed}`, seed, level, records, answer, planted };
  });
}
export const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
export const SEARCH_SYSTEM = `You are a research assistant in a synthetic literature search exercise. Each record describes one study: id, year, review status, outcome and sample size n. Find the study with the largest n among those that are ${COND}. Answer with its id only. Return only JSON matching the schema.`;
export const VERIFY_SYSTEM = `You check a proposed answer in a synthetic literature search exercise. Each record describes one study: id, year, review status, outcome and sample size n. The task was to name the study with the largest n among those that are ${COND}. Accept the proposed answer only if that study meets the three conditions and no other study meeting them has a larger n. Return only JSON matching the schema.`;
export const ID_SCHEMA = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false };
export const ACCEPT_SCHEMA = { type: 'object', properties: { accept: { type: 'boolean' } }, required: ['accept'], additionalProperties: false };
export function plurality(answers) { const c = new Map(); let best = null; answers.forEach((a, i) => { if (a === null || a === undefined) return; const e = c.get(a) || { n: 0, first: i }; e.n++; c.set(a, e); }); for (const [a, e] of c) if (!best || e.n > best.n || (e.n === best.n && e.first < best.first)) best = { a, ...e }; return best ? best.a : null; }
// Seeded paired bootstrap over tasks of mean(a - b); rows carry numeric fields a and b.
export function bootDiff(rows, a, b, seed, draws = 4000) {
  if (!rows.length) return null; const rnd = mulberry32(seed), d = [];
  for (let i = 0; i < draws; i++) { let s = 0; for (let j = 0; j < rows.length; j++) { const t = rows[Math.floor(rnd() * rows.length)]; s += t[a] - t[b]; } d.push(s / rows.length); }
  d.sort((x, y) => x - y); return { diff: rows.reduce((n, t) => n + t[a] - t[b], 0) / rows.length, ci95: [d[Math.floor(0.025 * draws)], d[Math.floor(0.975 * draws)]] };
}
export const verdictOf = (d) => (!d ? 'inconclusive' : d.ci95[0] > 0 ? 'supported' : d.ci95[1] < 0 ? 'refuted' : 'not supported');
// Variants with a working field (added for M6 and V3; the answer-only prompts above are unchanged).
export const workSearchSystem = (w) => `You are a research assistant in a synthetic literature search exercise. Each record describes one study: id, year, review status, outcome and sample size n. Find the study with the largest n among those that are ${COND}. Write your working in \`working\`, at most ${w} words, then the id of the study in \`id\`. Return only JSON matching the schema.`;
export const WORK_ID_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, id: { type: 'string' } }, required: ['working', 'id'], additionalProperties: false };
export const verifyWorkSystem = (w) => VERIFY_SYSTEM.replace('Return only JSON matching the schema.', `Write your working in \`working\`, at most ${w} words, then your decision in \`accept\`. Return only JSON matching the schema.`);
export const ACCEPT_WORK_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, accept: { type: 'boolean' } }, required: ['working', 'accept'], additionalProperties: false };
