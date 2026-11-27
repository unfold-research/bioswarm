// Exports the regime studies R1, R2 and R2b to the field-log format and recomputes their accuracy from the log alone.
// Usage: node observatory/batch2/kernel/export-regimes.mjs [--write]   (--write saves field-log.jsonl next to each study's results; not committed)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { event, outcome } from './fieldlog.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const waves = (study) => { const out = []; for (let k = 0; fs.existsSync(path.join(ROOT, `results/batch2-${study}/wave-${k}.scored.json`)); k++) out.push(...rd(`results/batch2-${study}/wave-${k}.scored.json`)); return out; };

export async function exportStudy(family, regime) {
  const P = await import(`../${family}-regimes/protocol.mjs`), study = `${family}-${regime}`, rows = waves(study), runs = [];
  for (const seed of P.SEEDS) { const c = P.makeCorpus(seed);
    for (const cond of [0, 1]) { const ev = []; let seq = 0; const run = `${seed}/${cond}`, push = (round, actor, kind, place, payload) => ev.push(event(seq++, run, round, actor, kind, place, payload));
      if (family === 'r1') {
        const mine = rows.filter((x) => x.seed === seed && (x.cond === null || x.cond === cond));
        for (const x of mine.filter((y) => y.kind === 'assign' && y.epoch === 1)) push(0.9, 'orchestrator', 'assign', '*', { places: x.assignments });
        for (const x of mine.filter((y) => y.kind === 'read' && y.round <= 2)) push(x.round, `worker-${x.slot}`, 'deposit', x.unit.join('+'), { counts: x.counts });
        if (cond === 1) push(2.5, 'environment', 'edit', String(c.perturbedPart), { parts: [c.perturbedPart] });
        for (const x of mine.filter((y) => y.kind === 'assign' && y.epoch === 2)) push(2.9, 'orchestrator', 'assign', '*', { places: x.assignments });
        for (const x of mine.filter((y) => y.kind === 'read' && y.round > 2)) push(x.round, `worker-${x.slot}`, 'deposit', x.unit.join('+'), { counts: x.counts });
        for (const x of mine.filter((y) => y.kind === 'final')) push(5, 'orchestrator', 'answer', '*', { author: x.answer });
        const rule = regime === 'stig-decay' ? { decay: P.DECAY, rounds: P.ROUNDS } : regime === 'stig-nodecay' ? { decay: 1, rounds: P.ROUNDS } : 'latest';
        runs.push({ seed, cond, events: ev, correct: outcome(ev, c.authors, rule) === c.answer[cond] ? 1 : 0 });
      } else {
        const mine = rows.filter((x) => x.seed === seed && (x.cond === null || x.cond === cond));
        for (const x of mine.filter((y) => y.kind === 'read' && y.phase === 'pre')) push(0, 'worker', 'deposit', String(x.part), { counts: x.counts });
        if (cond === 1) push(0.5, 'environment', 'edit', c.block.join('+'), { parts: c.block });
        for (let round = 1; round <= P.ROUNDS; round++) {
          for (const x of rows.filter((y) => y.kind === 'assign' && y.seed === seed && y.round === round && (y.cond === null || y.cond === cond))) push(round - 0.1, 'orchestrator', 'assign', '*', { places: x.assignments });
          for (const x of mine.filter((y) => y.kind === 'read' && y.phase === 'post' && y.round === round)) push(round, 'worker', 'deposit', String(x.part), { counts: x.counts });
        }
        runs.push({ seed, cond, events: ev, correct: outcome(ev, c.authors, 'latest') === c.answer[cond] ? 1 : 0 });
      } } }
  const acc = (cond) => { const r = runs.filter((x) => x.cond === cond); return r.reduce((n, x) => n + x.correct, 0) / r.length; };
  return { study, runs, accuracy: { stable: acc(0), edited: acc(1) }, events: runs.reduce((n, r) => n + r.events.length, 0) };
}
export const STUDIES = [['r1', 'sweep'], ['r1', 'deep'], ['r1', 'stig-decay'], ['r1', 'stig-nodecay'], ['r1', 'router'], ['r2', 'sweep'], ['r2', 'random'], ['r2', 'alarm'], ['r2', 'router'], ['r2b', 'sweep'], ['r2b', 'random'], ['r2b', 'alarm'], ['r2b', 'router']];
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [f, r] of STUDIES) { const x = await exportStudy(f, r), pub = rd(`results/batch2-${x.study}/summary.json`).accuracy;
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, `results/batch2-${x.study}/field-log.jsonl`), x.runs.flatMap((q) => q.events).map((e) => JSON.stringify(e)).join('\n') + '\n');
    console.log(`${x.study.padEnd(18)} events ${String(x.events).padStart(5)}  from log: stable ${x.accuracy.stable.toFixed(3)} edited ${x.accuracy.edited.toFixed(3)}  published: stable ${pub.stable.toFixed(3)} edited ${pub.edited.toFixed(3)}  ${Math.abs(x.accuracy.stable - pub.stable) < 1e-9 && Math.abs(x.accuracy.edited - pub.edited) < 1e-9 ? 'match' : 'MISMATCH'}`); }
}
