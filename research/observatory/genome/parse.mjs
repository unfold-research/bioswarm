// Parse one coder's batch results into { speciesId: { ok, data | error, stop, usage } }. Repair results, when present, replace failures.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, TRAIT_IDS } from './lib.mjs';

const OUT = (process.env.G1_OUT || path.join(ROOT, 'results/genome-g1'));
const lines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

export function parseResults(coder) {
  const out = {};
  for (const file of [`g1-genome-${coder}.results.jsonl`, `g1-genome-${coder}-repair.results.jsonl`]) {
    for (const r of lines(path.join(OUT, file))) {
      const sp = r.custom_id.replace(/^[A-Z]-/, ''), m = r.result?.message;
      let rec = { ok: false, error: r.result?.type, stop: m?.stop_reason, usage: m?.usage, repaired: file.includes('repair') };
      if (m && m.stop_reason === 'end_turn') {
        try {
          const data = JSON.parse(m.content.filter((c) => c.type === 'text').map((c) => c.text).join(''));
          if (TRAIT_IDS.every((id) => data.traits?.[id])) rec = { ...rec, ok: true, data };
          else rec.error = 'missing-traits';
        } catch { rec.error = 'bad-json'; }
      }
      if (rec.ok || !out[sp]?.ok) out[sp] = rec;
    }
  }
  return out;
}
