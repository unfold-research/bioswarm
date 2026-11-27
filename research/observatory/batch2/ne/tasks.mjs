// NE (no-entry field) task families: search problems with many candidate answers and an exact verifier in code.
// Each family: gen(seed) -> instance { prompt, ...data }, verify(instance, answerString) -> { ok, reason }.
// Deterministic from the seed; every generated instance is checked solvable.
import crypto from 'node:crypto';

export function rng(seed) { let s = crypto.createHash('sha256').update(String(seed)).digest().readUInt32LE(0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---- Countdown: reach the target with + - * / over the given numbers, each used at most once.
function countdownReach(nums) { // every value reachable with exact integer arithmetic
  const seen = new Set(), memo = new Set();
  const rec = (arr) => { const key = arr.slice().sort((x, y) => x - y).join(','); if (memo.has(key)) return; memo.add(key); for (const v of arr) seen.add(v); if (arr.length < 2) return;
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { const a = Math.max(arr[i], arr[j]), b = Math.min(arr[i], arr[j]), rest = arr.filter((_, k) => k !== i && k !== j); const outs = [a + b, a * b]; if (a > b) outs.push(a - b); if (b > 1 && a % b === 0) outs.push(a / b); for (const o of outs) rec([...rest, o]); } };
  rec(nums); return seen; }
export const countdown = {
  id: 'countdown',
  gen(seed) { const r = rng(`cd:${seed}`); for (;;) { const big = int(r, 0, 2); const nums = [...shuffle(r, [25, 50, 75, 100]).slice(0, big), ...Array.from({ length: 6 - big }, () => int(r, 1, 10))]; const reach = countdownReach(nums); const target = int(r, 101, 999); if (reach.has(target)) return { family: 'countdown', seed, nums, target, prompt: `Numbers: ${nums.join(', ')}. Target: ${target}.\nWrite one arithmetic expression that equals the target exactly, using only + - * / and parentheses, and each given number at most once (a number listed twice may be used twice). Not every number has to be used. Answer with the expression only.` }; } },
  verify(inst, ans) {
    const e = String(ans ?? '').replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/=.*$/, '').trim();
    if (!/^[\d+\-*/() ]+$/.test(e) || !e) return { ok: false, reason: 'syntax' };
    const used = (e.match(/\d+/g) || []).map(Number), pool = inst.nums.slice();
    for (const u of used) { const k = pool.indexOf(u); if (k < 0) return { ok: false, reason: 'number' }; pool.splice(k, 1); }
    let v; try { v = Function(`"use strict";return (${e});`)(); } catch { return { ok: false, reason: 'syntax' }; }
    return Math.abs(v - inst.target) < 1e-9 ? { ok: true } : { ok: false, reason: 'value' };
  },
};

// ---- Subset sum: choose numbers from the list that add to the target.
export const subset = {
  id: 'subset',
  gen(seed) { const r = rng(`ss:${seed}`); const nums = Array.from({ length: 16 }, () => int(r, 11, 499)); const pickN = int(r, 5, 8); const sub = shuffle(r, nums.map((_, i) => i)).slice(0, pickN); const target = sub.reduce((n, i) => n + nums[i], 0);
    return { family: 'subset', seed, nums, target, prompt: `List: ${nums.join(', ')}.\nChoose some of these numbers (each list position at most once) so that they add up to exactly ${target}. Answer with the chosen numbers separated by commas, nothing else.` }; },
  verify(inst, ans) { const used = (String(ans ?? '').match(/\d+/g) || []).map(Number); if (!used.length) return { ok: false, reason: 'syntax' }; const pool = inst.nums.slice(); for (const u of used) { const k = pool.indexOf(u); if (k < 0) return { ok: false, reason: 'number' }; pool.splice(k, 1); } return used.reduce((n, x) => n + x, 0) === inst.target ? { ok: true } : { ok: false, reason: 'value' }; },
};

// ---- Graph colouring: 3 colours, planted solution, adjacent nodes differ.
export const coloring = {
  id: 'coloring',
  gen(seed, n = 15, m = 2 * n) { const r = rng(`gc:${n}:${seed}`); const col = Array.from({ length: n }, () => int(r, 0, 2)); const edges = new Set(); while (edges.size < m) { const a = int(r, 0, n - 1), b = int(r, 0, n - 1); if (a !== b && col[a] !== col[b]) edges.add(a < b ? `${a}-${b}` : `${b}-${a}`); } const E = [...edges].map((x) => x.split('-').map(Number)).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return { family: 'coloring', seed, n, edges: E, planted: col, prompt: `Graph with nodes 0..${n - 1} and edges: ${E.map(([a, b]) => `${a}-${b}`).join(', ')}.\nAssign each node a colour R, G or B so that no edge joins two nodes of the same colour. Answer as node:colour pairs separated by spaces, for all ${n} nodes, e.g. "0:R 1:G ...". Nothing else.` }; },
  verify(inst, ans) { const m = new Map(); for (const [, k, c] of String(ans ?? '').matchAll(/(\d+)\s*:\s*([RGB])/gi)) m.set(Number(k), c.toUpperCase()); for (let i = 0; i < inst.n; i++) if (!m.has(i)) return { ok: false, reason: 'missing' }; for (const [a, b] of inst.edges) if (m.get(a) === m.get(b)) return { ok: false, reason: 'conflict' }; return { ok: true }; },
};

// ---- Modular: find x in range with given residues (CRT, several solutions in range).
export const modular = {
  id: 'modular',
  gen(seed) { const r = rng(`md:${seed}`); const mods = shuffle(r, [7, 9, 11, 13, 16]).slice(0, 3).sort((a, b) => a - b); const x = int(r, 100, 2999); const res = mods.map((m) => x % m);
    return { family: 'modular', seed, mods, res, lo: 1, hi: 5000, prompt: `Find an integer x with 1 <= x <= 5000 such that ${mods.map((m, i) => `x mod ${m} = ${res[i]}`).join(', ')}. Answer with x only.` }; },
  verify(inst, ans) { const m = String(ans ?? '').match(/-?\d+/); if (!m) return { ok: false, reason: 'syntax' }; const x = Number(m[0]); if (x < inst.lo || x > inst.hi) return { ok: false, reason: 'range' }; return inst.mods.every((md, i) => x % md === inst.res[i]) ? { ok: true } : { ok: false, reason: 'value' }; },
};

// ---- Word grid: place digits 1..9 in a 3x3 grid, each once, with row and column sums given (many solutions? fixed sums).
export const magic = {
  id: 'grid',
  gen(seed) { const r = rng(`mg:${seed}`); const g = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]); const rows = [0, 1, 2].map((i) => g[3 * i] + g[3 * i + 1] + g[3 * i + 2]), cols = [0, 1, 2].map((j) => g[j] + g[3 + j] + g[6 + j]);
    return { family: 'grid', seed, rows, cols, prompt: `Place the digits 1 to 9, each exactly once, in a 3x3 grid so that the rows sum to ${rows.join(', ')} (top to bottom) and the columns sum to ${cols.join(', ')} (left to right). Answer with the 9 digits row by row separated by spaces, nothing else.` }; },
  verify(inst, ans) { const d = (String(ans ?? '').match(/\d/g) || []).map(Number); if (d.length !== 9 || new Set(d).size !== 9 || d.includes(0)) return { ok: false, reason: 'syntax' }; const rows = [0, 1, 2].map((i) => d[3 * i] + d[3 * i + 1] + d[3 * i + 2]), cols = [0, 1, 2].map((j) => d[j] + d[3 + j] + d[6 + j]); return rows.every((v, i) => v === inst.rows[i]) && cols.every((v, i) => v === inst.cols[i]) ? { ok: true } : { ok: false, reason: 'value' }; },
};

export const FAMILIES = { countdown, subset, coloring, modular, grid: magic };
export const ANSWER_SCHEMA = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false };
