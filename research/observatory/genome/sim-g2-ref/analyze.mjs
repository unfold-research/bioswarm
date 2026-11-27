// G2 analysis: the preregistered tests H-G08..14 from grid.json and selection.json.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib.mjs';

const OUT = process.env.G2_OUT || path.join(ROOT, 'results/genome-g2');
const { presets, grid, single, archetypes } = JSON.parse(fs.readFileSync(path.join(OUT, 'grid.json'), 'utf8'));
const selection = JSON.parse(fs.readFileSync(path.join(OUT, 'selection.json'), 'utf8'));
const MAIN = ['maintain', 'track', 'mass', 'pipeline'], THREATS = [0, 0.2];
const HOME = { maintain: 'colony', track: 'flock', mass: 'chemical', pipeline: 'team' };
const ARCH = Object.keys(archetypes);
const BASE = Object.keys(presets).filter((k) => presets[k].kind !== 'defence-variant');
const g = (task, threat, name) => grid[`${task}|${threat}|${name}`];
const m = (task, threat, name) => g(task, threat, name).mean;
const best = (task, threat, names) => names.reduce((a, b) => (m(task, threat, b) > m(task, threat, a) ? b : a));
const sep = (task, threat, a, b) => Math.abs(m(task, threat, a) - m(task, threat, b)) > g(task, threat, a).half + g(task, threat, b).half;

const H = {};
{ // H-G08 home field
  const rows = MAIN.map((t) => { const b = best(t, 0, ARCH); return { task: t, home: HOME[t], winner: b, homeScore: m(t, 0, HOME[t]), winnerScore: m(t, 0, b), ok: b === HOME[t] }; });
  const k = rows.filter((r) => r.ok).length; H['H-G08'] = { rows, holds: k, verdict: k >= 3 ? 'supported' : 'refuted' };
}
{ // H-G09 no universal archetype
  const rows = ARCH.map((a) => ({ archetype: a, gaps: Object.fromEntries(MAIN.map((t) => [t, m(t, 0, best(t, 0, BASE)) - m(t, 0, a)])) }));
  const universal = rows.filter((r) => Object.values(r.gaps).every((x) => x <= 0.05)).map((r) => r.archetype);
  H['H-G09'] = { rows, universal, bestPerTask: Object.fromEntries(MAIN.map((t) => [t, best(t, 0, BASE)])), verdict: universal.length ? 'refuted' : 'supported' };
}
{ // H-G10 orchestrator vs best archetype
  const rows = MAIN.map((t) => { const b = best(t, 0, ARCH); return { task: t, orchestrator: m(t, 0, 'orchestrator'), bestArchetype: b, score: m(t, 0, b), ok: m(t, 0, 'orchestrator') >= m(t, 0, b) - 0.02 }; });
  const k = rows.filter((r) => r.ok).length; H['H-G10'] = { rows, holds: k, verdict: k >= 3 ? 'supported' : 'refuted' };
}
{ // H-G11 reading others costs under threat
  const readers = ['orchestrator', 'board', 'colony', 'chemical', 'team'];
  const loss = (n) => MAIN.reduce((a, t) => a + m(t, 0, n) - m(t, 0.2, n), 0) / MAIN.length;
  const rl = readers.reduce((a, n) => a + loss(n), 0) / readers.length, il = loss('independent');
  H['H-G11'] = { readersLoss: rl, independentLoss: il, byRegime: Object.fromEntries([...readers, 'independent', 'schedule', 'flock', 'school'].map((n) => [n, loss(n)])), verdict: rl - il >= 0.05 ? 'supported' : 'refuted' };
}
{ // H-G12 defence recovers the threat loss
  const bestArch = ARCH.reduce((a, b) => (MAIN.reduce((s, t) => s + m(t, 0.2, b), 0) > MAIN.reduce((s, t) => s + m(t, 0.2, a), 0) ? b : a));
  const rows = ['orchestrator', 'board', bestArch].map((n) => {
    const lost = MAIN.reduce((a, t) => a + m(t, 0, n) - m(t, 0.2, n), 0) / MAIN.length;
    const rec = MAIN.reduce((a, t) => a + m(t, 0.2, `${n}+def`) - m(t, 0.2, n), 0) / MAIN.length;
    return { regime: n, lost, recovered: rec, share: lost > 0 ? rec / lost : null, flags: MAIN.reduce((a, t) => a + g(t, 0.2, `${n}+def`).trueFlags, 0) / MAIN.length, falseFlags: MAIN.reduce((a, t) => a + g(t, 0.2, `${n}+def`).falseFlags, 0) / MAIN.length, ok: lost > 0 && rec / lost >= 0.5 };
  });
  const k = rows.filter((r) => r.ok).length; H['H-G12'] = { bestArchetypeUnderThreat: bestArch, rows, verdict: k >= 2 ? 'supported' : 'refuted' };
}
{ // H-G13 flag selection beats presets
  const rows = MAIN.flatMap((t) => THREATS.map((th) => { const b = best(t, th, BASE); const h = m(t, th, 'task-hybrid');
    return { task: t, threat: th, bestPreset: b, preset: m(t, th, b), hybrid: h, diff: h - m(t, th, b), separable: sep(t, th, 'task-hybrid', b), flags: selection.task[`${t}|${th}`].flags, ok: h - m(t, th, b) >= 0.03 }; }));
  const per = THREATS.map((th) => rows.filter((r) => r.threat === th && r.ok).length);
  H['H-G13'] = { rows, perThreat: per, verdict: per.every((k) => k >= 2) ? 'supported' : 'refuted' };
}
{ // H-G14 general hybrid
  const rows = MAIN.flatMap((t) => THREATS.map((th) => { const names = [...BASE, 'task-hybrid']; const b = best(t, th, names);
    return { task: t, threat: th, best: b, bestScore: m(t, th, b), general: m(t, th, 'general-hybrid'), gap: m(t, th, b) - m(t, th, 'general-hybrid'), ok: m(t, th, b) - m(t, th, 'general-hybrid') <= 0.05 }; }));
  const k = rows.filter((r) => r.ok).length; H['H-G14'] = { flags: selection.general.flags, start: selection.general.start, rows, holds: k, verdict: k >= 6 ? 'supported' : 'refuted' };
}
// exploratory: scattered maintenance, single-flag effects relative to independent members
const scattered = Object.fromEntries([...BASE, 'general-hybrid'].map((n) => [n, { local: m('maintain', 0, n), scattered: m('maintain-scattered', 0, n) }]));
const flagEffect = {};
for (const k of Object.keys(single)) { const [t, th, fl] = k.split('|'); (flagEffect[fl] ||= {})[`${t}|${th}`] = single[k].mean - m(t, +th, 'independent'); }
const table = Object.fromEntries(['maintain', 'maintain-scattered', ...MAIN.slice(1)].flatMap((t) => THREATS.map((th) => [`${t}|${th}`,
  Object.fromEntries([...BASE, ...Object.keys(presets).filter((k) => k.endsWith('+def')), ...(MAIN.includes(t) ? ['task-hybrid'] : []), 'general-hybrid'].map((n) => [n, grid[`${t}|${th}|${n}`] ? { mean: +m(t, th, n).toFixed(4), half: +g(t, th, n).half.toFixed(4), actions: +g(t, th, n).actions.toFixed(3) } : null]))])));
const analysis = { hypotheses: H, table, scattered, flagEffect, selection };
fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(analysis, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.verdict])), null, 1));
