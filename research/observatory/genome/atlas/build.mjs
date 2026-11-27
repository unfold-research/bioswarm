// Build the G1 atlas page: inlines matrix.json and the parts of analysis.json the page reads.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib.mjs';

const OUT = (process.env.G1_OUT || path.join(ROOT, 'results/genome-g1'));
const matrix = JSON.parse(fs.readFileSync(path.join(OUT, 'matrix.json'), 'utf8'));
// codenames live in the catalog; merge them so a rename does not need the matrix rebuilt
const nick = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/genome/species.json'), 'utf8')).species.map((s) => [s.id, s]));
for (const s of matrix.species) { s.nick = nick[s.id]?.nick; s.nickWhy = nick[s.id]?.nickWhy; }
const a = JSON.parse(fs.readFileSync(path.join(OUT, 'analysis.json'), 'utf8'));
const analysis = { reliability: { kappa: a.reliability.kappa }, hypotheses: a.hypotheses, prevalence: a.prevalence, backlog: a.backlog,
  speciesOrder: a.speciesOrder, speciesGroups: a.speciesGroups, traitOrder: a.traitOrder };
const tpl = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'template.html'), 'utf8');
const G2 = path.join(ROOT, 'results/genome-g2');
const f2 = (x) => x.toFixed(2);
const PT = { orchestrator: 'orquestrador', board: 'quadro', school: 'cardume', team: 'equipe', colony: 'colônia', chemical: 'químico', flock: 'bando' };
function g2num(k, v) {
  if (k === 'H-G08') return `${v.holds} de 4 vencem em casa`;
  if (k === 'H-G09') return v.universal.length ? `universal: ${v.universal.join(', ')}` : 'nenhum arquétipo universal';
  if (k === 'H-G10') return `${v.holds} de 4 tarefas`;
  if (k === 'H-G11') return `perda ${f2(v.readersLoss)} contra ${f2(v.independentLoss)} dos independentes`;
  if (k === 'H-G12') return v.rows.map((r) => `${PT[r.regime] || r.regime} ${r.share === null ? '—' : Math.round(100 * r.share) + '%'}`).join(' · ');
  if (k === 'H-G13') return `sem ameaça ${v.perThreat[0]} de 4 · com ameaça ${v.perThreat[1]} de 4`;
  if (k === 'H-G14') return `${v.holds} de 8 células`;
  return '';
}
let g2 = null;
if (fs.existsSync(path.join(G2, 'analysis.json'))) {
  const ga = JSON.parse(fs.readFileSync(path.join(G2, 'analysis.json'), 'utf8')), gg = JSON.parse(fs.readFileSync(path.join(G2, 'grid.json'), 'utf8'));
  g2 = { table: ga.table, selection: ga.selection, archetypes: gg.archetypes, presets: gg.presets,
    hypotheses: Object.fromEntries(Object.entries(ga.hypotheses).map(([k, v]) => [k, { verdict: v.verdict, num: g2num(k, v) }])), htext: JSON.parse(fs.readFileSync(path.join(G2, 'htext.json'), 'utf8')) };
}
const json = JSON.stringify({ matrix, analysis, g2 }).replace(/</g, '\\u003c');
const html = tpl.replace('/*DATA*/null/*END*/', json);
fs.writeFileSync(path.join(OUT, 'atlas.html'), html);
console.log(`atlas.html ${(html.length / 1024).toFixed(0)} KB`);
