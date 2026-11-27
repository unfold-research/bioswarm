// G1 citation check against Crossref (free, no key). Reads both coders' results, writes citations.json.
// A reference is verified when Crossref returns a work whose title overlaps the cited title by >= 0.6 and whose year is within one.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CODERS, titleMatch } from './lib.mjs';
import { parseResults } from './parse.mjs';

const OUT = (process.env.G1_OUT || path.join(ROOT, 'results/genome-g1')), FILE = path.join(OUT, 'citations.json');
const UA = 'unfold-research-genome/1.0 (citation check)';
const cache = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')).cache : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) }).catch(() => null);
    if (res?.status === 404) return null;
    if (res?.ok) return res.json();
    const ra = Number(res?.headers?.get('retry-after')); if (Number.isFinite(ra) && ra > 120) return { error: true }; await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 3000 * (i + 1));
  }
  return { error: true };
}
const yearOf = (w) => w?.issued?.['date-parts']?.[0]?.[0] ?? w?.published?.['date-parts']?.[0]?.[0] ?? null;

async function check(ref) {
  const key = JSON.stringify([ref.doi?.toLowerCase() || null, ref.title.toLowerCase(), ref.year]);
  if (cache[key]) return cache[key];
  let out;
  if (ref.doi) {
    const j = await get(`https://api.crossref.org/works/${encodeURIComponent(ref.doi.replace(/^https?:\/\/doi.org\//, ''))}`);
    const w = j?.message, t = w?.title?.[0] || '';
    out = j?.error ? { method: 'doi', status: 'error' }
      : !w ? { method: 'doi', status: 'doi-not-found' }
      : { method: 'doi', status: titleMatch(ref.title, t) >= 0.6 && Math.abs((yearOf(w) ?? ref.year) - ref.year) <= 1 ? 'verified' : 'doi-other-work', foundTitle: t, foundYear: yearOf(w), score: titleMatch(ref.title, t) };
    if (out.status !== 'verified' && out.status !== 'error') { // fall back to search: a wrong DOI on a real paper
      const s = await search(ref); if (s.status === 'verified') out = { ...s, method: 'search-after-bad-doi', badDoi: true };
    }
  } else out = await search(ref);
  if (out.status !== 'error') cache[key] = out; await sleep(250); return out;
}
const OPENALEX_KEY = process.env.OPENALEX_API_KEY_FILE ? fs.readFileSync(process.env.OPENALEX_API_KEY_FILE, 'utf8').trim() : null;
async function search(ref) {
  // Title search: OpenAlex when a key is available (deviation from the preregistration, which named Crossref search; the
  // Crossref public pool allows one concurrent request at ~3-4 s per search), else Crossref. Same match rule either way:
  // title overlap >= 0.6, year within one. The key is read from a file and never written to results.
  if (OPENALEX_KEY) {
    const q = encodeURIComponent(ref.title.replace(/[,:;()?!"]/g, ' ').slice(0, 200));
    const j = await get(`https://api.openalex.org/works?search=${q}&per-page=5&select=doi,title,publication_year&api_key=${OPENALEX_KEY}`);
    if (j?.error) return { method: 'search', status: 'error' };
    const best = (j?.results || []).map((w) => ({ w, s: titleMatch(ref.title, w.title) })).sort((x, y) => y.s - x.s)[0];
    if (!best) return { method: 'search', source: 'openalex', status: 'not-found' };
    const ok = best.s >= 0.6 && Math.abs((best.w.publication_year ?? ref.year) - ref.year) <= 1;
    return { method: 'search', source: 'openalex', status: ok ? 'verified' : 'not-found', foundTitle: best.w.title, foundYear: best.w.publication_year, foundDoi: best.w.doi?.replace('https://doi.org/', '') || null, score: best.s };
  }
  const q = encodeURIComponent(`${ref.title} ${ref.authors.split(/[;,]/)[0]}`);
  const j = await get(`https://api.crossref.org/works?query.bibliographic=${q}&rows=5&select=DOI,title,issued`);
  if (j?.error) return { method: 'search', status: 'error' };
  const best = (j?.message?.items || []).map((w) => ({ w, s: titleMatch(ref.title, w.title?.[0]) })).sort((x, y) => y.s - x.s)[0];
  if (!best) return { method: 'search', source: 'crossref', status: 'not-found' };
  const ok = best.s >= 0.6 && Math.abs((yearOf(best.w) ?? ref.year) - ref.year) <= 1;
  return { method: 'search', source: 'crossref', status: ok ? 'verified' : 'not-found', foundTitle: best.w.title?.[0], foundYear: yearOf(best.w), foundDoi: best.w.DOI, score: best.s };
}

const rows = [];
for (const coder of Object.keys(CODERS)) {
  const parsed = parseResults(coder);
  for (const [sp, r] of Object.entries(parsed)) if (r.ok) for (const [trait, c] of Object.entries(r.data.traits)) for (const ref of c.refs) rows.push({ coder, sp, trait, ref });
}
const uniq = new Map(); for (const r of rows) uniq.set(JSON.stringify([r.ref.doi?.toLowerCase() || null, r.ref.title.toLowerCase(), r.ref.year]), r.ref);
let i = 0;
const all = [...uniq.values()], doiQ = all.filter((r) => r.doi), searchQ = all.filter((r) => !r.doi);
const worker = (q) => async () => { while (q.length) { await check(q.shift()); if (++i % 25 === 0) { console.log(`${i}/${uniq.size}`); fs.writeFileSync(FILE, JSON.stringify({ cache }, null, 1)); } } };
// Crossref public pool: one concurrent request; OpenAlex search tolerates a few.
// Crossref public pool: one concurrent request for DOI lookups; OpenAlex searches with a key run four at a time.
await Promise.all(OPENALEX_KEY ? [worker(doiQ)(), ...Array.from({ length: 4 }, () => worker(searchQ)())] : [worker([...doiQ, ...searchQ])()]);
const checked = rows.map((r) => ({ ...r, check: cache[JSON.stringify([r.ref.doi?.toLowerCase() || null, r.ref.title.toLowerCase(), r.ref.year])] || { status: 'unchecked' } }));
const tally = (xs) => xs.reduce((m, x) => ((m[x.check.status] = (m[x.check.status] || 0) + 1), m), {});
const summary = {
  uniqueRefs: uniq.size, citations: rows.length,
  byStatus: tally(checked),
  withDoi: { n: checked.filter((x) => x.ref.doi).length, verified: checked.filter((x) => x.ref.doi && x.check.status === 'verified' && !x.check.badDoi).length },
  byCoder: Object.fromEntries(Object.keys(CODERS).map((c) => [c, tally(checked.filter((x) => x.coder === c))])),
};
fs.writeFileSync(FILE, JSON.stringify({ summary, cache }, null, 1));
fs.writeFileSync(path.join(OUT, 'citations-by-cell.jsonl'), checked.map((x) => JSON.stringify({ coder: x.coder, sp: x.sp, trait: x.trait, ...x.ref, status: x.check.status, foundDoi: x.check.foundDoi || null })).join('\n') + '\n');
console.log(JSON.stringify(summary, null, 1));
