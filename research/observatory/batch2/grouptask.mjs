// Second synthetic task, for V6: counting by group. Each task lists 24, 48 or 96 study records with an author id. The
// answer is the author with the most studies that are peer-reviewed, from 2020 or later and positive. The winner has one
// more qualifying study than the runner-up; a decoy author has the most studies in total, most of them one condition short.
// Unlike the search task of M4 (find one record), this needs a tally over every record.
import { mulberry32, qualifies } from './littask.mjs';
export const LEVELS = [24, 48, 96];
export const AUTHORS = 6;
export function makeTasks(seeds, levels = LEVELS) {
  return seeds.map((seed, ix) => {
    const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), level = levels[ix % levels.length], w = level / 8 + 1;
    const names = new Set(); while (names.size < AUTHORS) names.add(`au-${int(0, 46655).toString(36).padStart(3, '0')}`); const authors = [...names];
    const counts = [w, w - 1, ...Array.from({ length: AUTHORS - 2 }, () => int(0, w - 2))], decoy = 2 + int(0, AUTHORS - 3), records = [];
    const good = () => ({ year: int(2020, 2025), review: 'peer-reviewed', outcome: 'positive' });
    counts.forEach((c, a) => { for (let i = 0; i < c; i++) records.push({ author: authors[a], ...good() }); });
    for (let i = 0; i < level / 6; i++) { const fail = i % 3; records.push({ author: authors[decoy], ...good(), ...(fail === 0 ? { year: 2019 } : fail === 1 ? { review: 'preprint' } : { outcome: i % 2 ? 'negative' : 'null' }) }); }
    while (records.length < level) { const r = { author: authors[int(0, AUTHORS - 1)], year: int(2012, 2025), review: rnd() < 0.5 ? 'peer-reviewed' : 'preprint', outcome: ['positive', 'negative', 'null'][int(0, 2)] }; records.push(qualifies(r) ? { ...r, review: 'preprint' } : r); }
    for (let i = records.length - 1; i > 0; i--) { const j = int(0, i); [records[i], records[j]] = [records[j], records[i]]; }
    const ids = new Set(); while (ids.size < level) ids.add(`s-${int(0, 46655).toString(36).padStart(3, '0')}`); const idList = [...ids];
    return { id: `grp-${seed}`, seed, level, authors, records: records.map((r, i) => ({ id: idList[i], ...r })), answer: authors[0], planted: authors[decoy] };
  });
}
export const tally = (records) => { const c = {}; for (const r of records) if (qualifies(r)) c[r.author] = (c[r.author] || 0) + 1; return c; };
const COND = 'peer-reviewed, published in 2020 or later, and reporting a positive outcome';
const INTRO = 'Each record describes one study: id, author, year, review status and outcome.';
export const DIRECT_SYSTEM = `You are a research assistant in a synthetic bibliometric exercise. ${INTRO} Find the author with the most studies that are ${COND}. Answer with the author id only. Return only JSON matching the schema.`;
export const workSystem = (w) => `You are a research assistant in a synthetic bibliometric exercise. ${INTRO} Find the author with the most studies that are ${COND}. Write your working in \`working\`, at most ${w} words, then the author id in \`author\`. Return only JSON matching the schema.`;
export const verifySystem = (w) => `You check a proposed answer in a synthetic bibliometric exercise. ${INTRO} The task was to name the author with the most studies that are ${COND}. Accept the proposed author only if no other author has as many or more such studies. Write your working in \`working\`, at most ${w} words, then your decision in \`accept\`. Return only JSON matching the schema.`;
export const AUTHOR_SCHEMA = { type: 'object', properties: { author: { type: 'string' } }, required: ['author'], additionalProperties: false };
export const WORK_AUTHOR_SCHEMA = { type: 'object', properties: { working: { type: 'string' }, author: { type: 'string' } }, required: ['working', 'author'], additionalProperties: false };
