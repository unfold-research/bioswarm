// sched2 (LI6): sched plus shared machines across teams. Two items on the same machine may not overlap: a SYMMETRIC
// constraint between owners (either may move), next to the DIRECTED dependencies. Mixed coupling geometry.
// Second coupled domain: a shared project schedule. Work items belong to teams (the territories are the teams: natural
// ownership, not a partition we chose). Each item has a duration in weeks; a team works on one item at a time; an item
// may depend on items of the same or other teams (it starts only after they end); everything fits a horizon of H weeks.
// A feasible schedule is planted. Conflicts are violated constraints, computed by code; members never message each other.
// Same interface as swarm.mjs: makeInstance, conflicts, parse, soloRequest, repairRequest, memberRequest, plan, patches.
import crypto from 'node:crypto';
import { rng } from './tasks.mjs';

export const ANSWER_SCHEMA = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false };
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const h = (x) => crypto.createHash('sha256').update(String(x)).digest().readUInt32LE(0);
const TEAM = (i) => `T${String(i + 1).padStart(2, '0')}`;

export function makeInstance(n, seed, deg = 1.6, teamSize = 12) {
  const r = rng(`sched:${n}:${seed}`), k = Math.max(2, Math.round(n / teamSize));
  const owner = Array.from({ length: n }, (_, i) => i % k).sort(() => r() - 0.5), dur = Array.from({ length: n }, () => int(r, 1, 4)), planted = new Array(n);
  for (let t = 0; t < k; t++) { let at = 0; for (const i of owner.map((o, i) => (o === t ? i : -1)).filter((i) => i >= 0).sort(() => r() - 0.5)) { at += int(r, 0, 1); planted[i] = at; at += dur[i]; } }
  const H = Math.max(...planted.map((s, i) => s + dur[i])) + 1;
  const deps = new Set(); let tries = 0; const want = Math.round(deg * n);
  while (deps.size < want && tries++ < 200 * n) { const b = int(r, 0, n - 1); const cross = r() < 0.7;
    const cands = planted.map((s, a) => a).filter((a) => a !== b && (owner[a] !== owner[b]) === cross && planted[a] + dur[a] <= planted[b] && planted[a] + dur[a] >= planted[b] - 2);
    if (cands.length) deps.add(`${cands[int(r, 0, cands.length - 1)]}>${b}`); }
  const D = [...deps].map((x) => x.split('>').map(Number));
  // shared machines: about 40% of items use one of k/2 machines; an item joins a machine only if its planted interval
  // does not overlap the items already on it, so the planted schedule stays feasible
  const M = Math.max(2, Math.round(k / 2)), machine = new Array(n).fill(-1), onM = Array.from({ length: M }, () => []);
  for (let i = 0; i < n; i++) { if (r() >= 0.4) continue; const m = int(r, 0, M - 1); if (onM[m].every((j) => planted[j] + dur[j] <= planted[i] || planted[i] + dur[i] <= planted[j])) { machine[i] = m; onM[m].push(i); } }
  const shared = []; for (const L of onM) for (let x = 0; x < L.length; x++) for (let y = x + 1; y < L.length; y++) shared.push([L[x], L[y]]);
  const adj = Array.from({ length: n }, () => new Set()); for (const [a, b] of [...D, ...shared]) { adj[a].add(b); adj[b].add(a); }
  for (let t = 0; t < k; t++) { const mine = owner.map((o, i) => (o === t ? i : -1)).filter((i) => i >= 0); for (const a of mine) for (const b of mine) if (a !== b) adj[a].add(b); }
  const regions = Array.from({ length: k }, (_, t) => owner.map((o, i) => (o === t ? i : -1)).filter((i) => i >= 0));
  return { n, seed, k, owner, dur, H, deps: D, planted, adj: adj.map((s) => [...s]), regions, edges: [...D, ...shared], machine, M, shared };
}
const name = (i) => `W${i}`;

// Violated constraints as [a, b, kind]; a unary violation (out of horizon or unscheduled) is [a, a, 'bound'].
export function conflicts(inst, s) {
  const out = [];
  for (let i = 0; i < inst.n; i++) if (!Number.isInteger(s[i]) || s[i] < 0 || s[i] + inst.dur[i] > inst.H) out.push([i, i, 'bound']);
  for (const [a, b] of inst.deps) if (Number.isInteger(s[a]) && Number.isInteger(s[b]) && s[b] < s[a] + inst.dur[a]) out.push([a, b, 'dep']);
  for (const [a, b] of inst.shared) { if (!Number.isInteger(s[a]) || !Number.isInteger(s[b])) continue; if (s[a] < s[b] + inst.dur[b] && s[b] < s[a] + inst.dur[a]) out.push([a, b, 'machine']); }
  for (const R of inst.regions) for (let x = 0; x < R.length; x++) for (let y = x + 1; y < R.length; y++) { const a = R[x], b = R[y]; if (!Number.isInteger(s[a]) || !Number.isInteger(s[b])) continue; if (s[a] < s[b] + inst.dur[b] && s[b] < s[a] + inst.dur[a]) out.push([a, b, 'overlap']); }
  return out;
}
export function parse(ans, allowed) { const m = new Map(); for (const [, k, v] of String(ans ?? '').matchAll(/W?(\d+)\s*[:=]\s*(-?\d+)/gi)) { const u = Number(k); if (!allowed || allowed.has(u)) m.set(u, Number(v)); } return m; }
const describe = (inst, [a, b, kind]) => (kind === 'machine' ? `${name(a)} and ${name(b)} overlap on machine M${inst.machine[a] + 1}` : kind === 'bound' ? `${name(a)} outside weeks 0..${inst.H}` : kind === 'dep' ? `${name(b)} starts before ${name(a)} ends` : `${name(a)} and ${name(b)} overlap in ${TEAM(inst.owner[a])}`);
const rules = (H) => `Rules: each work item has a start week (an integer >= 0) and runs for its duration; it must end by week ${H} (start + duration <= ${H}). A team works on one item at a time (its items may not overlap: one must end at or before the other starts). Items that use the same shared machine may not overlap either, whatever their team. An item that depends on another starts at or after that other item's end (start >= other start + other duration).`;
const itemLine = (inst, i) => `${name(i)} (${TEAM(inst.owner[i])}, ${inst.dur[i]} wk${inst.machine[i] >= 0 ? `, machine M${inst.machine[i] + 1}` : ''})`;
const depLines = (inst, filter) => inst.deps.filter(filter).map(([a, b]) => `${name(b)} after ${name(a)}`).join('; ');
const json = (maxTokens, model, content, effort) => ({ model, max_tokens: maxTokens, output_config: { format: { type: 'json_schema', schema: ANSWER_SCHEMA }, ...(effort ? { effort } : {}) }, messages: [{ role: 'user', content }] });

export const soloRequest = (model, inst, maxTokens) => json(maxTokens, model, `Plan a shared project of ${inst.n} work items across ${inst.k} teams.\n${rules(inst.H)}\nItems: ${Array.from({ length: inst.n }, (_, i) => itemLine(inst, i)).join(', ')}.\nDependencies: ${depLines(inst, () => true)}.\nAnswer with a start week for every item as item:week pairs separated by spaces, e.g. "W0:3 W1:0 ...". Nothing else.`);
export const repairRequest = (model, inst, s, marks, maxTokens) => json(maxTokens, model, `Plan a shared project of ${inst.n} work items across ${inst.k} teams.\n${rules(inst.H)}\nItems: ${Array.from({ length: inst.n }, (_, i) => itemLine(inst, i)).join(', ')}.\nDependencies: ${depLines(inst, () => true)}.\nCurrent plan: ${Array.from({ length: inst.n }, (_, i) => `${name(i)}:${Number.isInteger(s[i]) ? s[i] : '?'}`).join(' ')}\nViolations now: ${marks.map((m) => describe(inst, m)).join('; ') || 'none'}.\nReturn a corrected start week for every item as item:week pairs separated by spaces. Nothing else.`);

export function memberRequest(model, inst, region, s, marks, maxTokens, { showMarks = true, effort = null } = {}) {
  const mine = new Set(Array.isArray(region) ? region : inst.regions[region]), teams = [...new Set([...mine].map((i) => inst.owner[i]))];
  const own = [...mine].map((i) => `${itemLine(inst, i)} now ${Number.isInteger(s[i]) ? `week ${s[i]}` : 'unscheduled'}`).join('; ');
  const foreignDeps = inst.deps.filter(([a, b]) => mine.has(a) !== mine.has(b)).map(([a, b]) => (mine.has(b) ? `${name(b)} after ${name(a)} (${name(a)} is fixed at ${Number.isInteger(s[a]) ? `week ${s[a]}, ends week ${s[a] + inst.dur[a]}` : 'not yet scheduled'})` : `${name(b)} after ${name(a)} (${name(b)} is fixed at ${Number.isInteger(s[b]) ? `week ${s[b]}` : 'not yet scheduled'})`)).join('; ');
  const others = inst.regions.flat().filter((i) => !mine.has(i) && teams.includes(inst.owner[i])).map((i) => `${name(i)} ${Number.isInteger(s[i]) ? `weeks ${s[i]}-${s[i] + inst.dur[i]}` : 'unscheduled'}`).join(', ');
  const myMachines = new Set([...mine].map((i) => inst.machine[i]).filter((m) => m >= 0));
  const machineOthers = [...myMachines].map((m) => `M${m + 1}: ` + (inst.regions.flat().filter((i) => !mine.has(i) && inst.machine[i] === m).map((i) => `${name(i)} ${Number.isInteger(s[i]) ? `weeks ${s[i]}-${s[i] + inst.dur[i]}` : 'unscheduled'}`).join(', ') || 'no other items')).join('; ');
  const markText0 = machineOthers ? `\nOther items on your machines, owned by others and fixed: ${machineOthers}.` : '';
  const markText = markText0 + (showMarks ? `\nViolations you must resolve now: ${marks.map((m) => describe(inst, m)).join('; ')}.` : '');
  return json(maxTokens, model, `You plan part of a shared project together with other planners. You own items ${[...mine].map(name).join(', ')} and may change only their start weeks.\n${rules(inst.H)}\nYour items: ${own}.\nDependencies among your items: ${depLines(inst, ([a, b]) => mine.has(a) && mine.has(b)) || 'none'}.\nDependencies with items owned by others, which you cannot move: ${foreignDeps || 'none'}.${others ? `\nOther items of the same team(s), owned by others and fixed: ${others}.` : ''}${markText}\nReturn a start week for each of your ${mine.size} items as item:week pairs separated by spaces. Change as few as needed. Nothing else.`, effort);
}

export function plan(inst, s, round, mode) {
  const cs = conflicts(inst, s), byRegion = new Map(); const add = (i, e) => { if (!byRegion.has(i)) byRegion.set(i, []); byRegion.get(i).push(e); };
  // 'routed': a symmetric cross-owner conflict (shared machine) goes to one side; a directed one (dependency) to both
  for (const e of cs) { const ra = inst.owner[e[0]], rb = inst.owner[e[1]]; const both = mode === 'sync' || (mode === 'routed' && e[2] !== 'machine'); if (ra === rb || both) { add(ra, e); if (rb !== ra) add(rb, e); } else add(h(`${ra}:${round}`) > h(`${rb}:${round}`) ? ra : rb, e); }
  return byRegion;
}
export function patches(inst, s, radius = 1, cap = 40) {
  const cs = conflicts(inst, s); if (!cs.length) return [];
  const parent = new Map(); const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const balls = cs.map(([a, b]) => { const seen = new Set([a, b]); let front = [a, b]; for (let d = 0; d < radius; d++) { const nx = []; for (const u of front) for (const v of inst.adj[u]) if (!seen.has(v)) { seen.add(v); nx.push(v); } front = nx; } return seen; });
  balls.forEach((_, i) => parent.set(i, i)); const nodeBall = new Map();
  balls.forEach((B, i) => { for (const u of B) { if (nodeBall.has(u)) parent.set(find(i), find(nodeBall.get(u))); else nodeBall.set(u, i); } });
  const groups = new Map(); balls.forEach((B, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, { nodes: new Set(), marks: [] }); for (const u of B) groups.get(r).nodes.add(u); groups.get(r).marks.push(cs[i]); });
  return [...groups.values()].map((g) => { let nodes = [...g.nodes]; if (nodes.length > cap) { const core = new Set(g.marks.flatMap((m) => [m[0], m[1]])); nodes = [...core, ...nodes.filter((u) => !core.has(u))].slice(0, cap); } return { nodes: nodes.sort((x, y) => x - y), marks: g.marks }; });
}
