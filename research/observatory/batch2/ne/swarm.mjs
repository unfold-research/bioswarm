// Coupled constraint task (3-colouring of a planted graph) and the coordination regimes compared on it.
// Territory: nodes are split into contiguous regions of about REGION nodes; one member owns each region.
// Field: the current colouring; the environment (code) computes conflicting edges, which are the marks.
// Cross-inhibition: on a conflicting edge between two regions only one side (priority alternating by round) is told to
// act; the other holds. A member acts only when it has a mark (response threshold of one stimulus).
import crypto from 'node:crypto';
import { rng, coloring } from './tasks.mjs';

export const COLORS = ['R', 'G', 'B'];
export const ANSWER_SCHEMA = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false };
const h = (x) => crypto.createHash('sha256').update(String(x)).digest().readUInt32LE(0);

export function makeInstance(n, seed, deg = 2.3, regionSize = 15) {
  const g = coloring.gen(seed, n, Math.round(deg * n));
  const adj = Array.from({ length: n }, () => []); for (const [a, b] of g.edges) { adj[a].push(b); adj[b].push(a); }
  // territories by BFS growth from random seeds
  const r = rng(`terr:${n}:${seed}`), owner = new Array(n).fill(-1), k = Math.max(1, Math.round(n / regionSize)), order = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5);
  const seeds = order.slice(0, k), queues = seeds.map((s, i) => { owner[s] = i; return [s]; }), size = new Array(k).fill(1), cap = Math.ceil(n / k) + 2;
  let grew = true; while (grew) { grew = false; for (let i = 0; i < k; i++) { const q = queues[i]; while (q.length && size[i] < cap) { const u = q[0]; const nb = adj[u].find((v) => owner[v] < 0); if (nb === undefined) { q.shift(); continue; } owner[nb] = i; size[i]++; q.push(nb); grew = true; break; } } }
  for (let u = 0; u < n; u++) if (owner[u] < 0) { const nb = adj[u].find((v) => owner[v] >= 0); owner[u] = nb !== undefined ? owner[nb] : size.indexOf(Math.min(...size)); size[owner[u]]++; }
  const regions = Array.from({ length: k }, (_, i) => owner.map((o, u) => (o === i ? u : -1)).filter((u) => u >= 0));
  return { ...g, adj, owner, regions, k };
}

export const conflicts = (inst, col) => inst.edges.filter(([a, b]) => !col[a] || !col[b] || col[a] === col[b]);
export function parseColors(ans, allowed) { const m = new Map(); for (const [, k, c] of String(ans ?? '').matchAll(/(\d+)\s*:\s*([RGB])/gi)) { const u = Number(k); if (!allowed || allowed.has(u)) m.set(u, c.toUpperCase()); } return m; }

const rules = 'Assign each node a colour R, G or B so that no edge joins two nodes of the same colour.';
export const soloRequest = (model, inst, maxTokens) => ({ model, max_tokens: maxTokens, output_config: { format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
  messages: [{ role: 'user', content: `Graph with nodes 0..${inst.n - 1} and edges: ${inst.edges.map(([a, b]) => `${a}-${b}`).join(', ')}.\n${rules} Answer as node:colour pairs separated by spaces, for all ${inst.n} nodes, e.g. "0:R 1:G ...". Nothing else.` }] });

// Central repair: the whole graph, the current colouring and the conflict marks; returns a full colouring.
export const repairRequest = (model, inst, col, marks, maxTokens) => ({ model, max_tokens: maxTokens, output_config: { format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
  messages: [{ role: 'user', content: `Graph with nodes 0..${inst.n - 1} and edges: ${inst.edges.map(([a, b]) => `${a}-${b}`).join(', ')}.\n${rules}\nCurrent colouring: ${Array.from({ length: inst.n }, (_, u) => `${u}:${col[u] || '?'}`).join(' ')}\nEdges in conflict now (same colour or uncoloured end): ${marks.map(([a, b]) => `${a}-${b}`).join(', ') || 'none'}.\nReturn a corrected colouring of all ${inst.n} nodes as node:colour pairs separated by spaces. Nothing else.` }] });

// A member: owns its region; sees its internal edges, its boundary edges with the foreign end's current colour (fixed for
// it), its own current colours, and the marks it must resolve. Returns colours for its own nodes only.
export function memberRequest(model, inst, region, col, marks, maxTokens, { showMarks = true, effort = null } = {}) {
  const mine = new Set(Array.isArray(region) ? region : inst.regions[region]), internal = inst.edges.filter(([a, b]) => mine.has(a) && mine.has(b)), boundary = inst.edges.filter(([a, b]) => mine.has(a) !== mine.has(b)).map(([a, b]) => (mine.has(a) ? [a, b] : [b, a]));
  const ownNow = [...mine].map((u) => `${u}:${col[u] || '?'}`).join(' ');
  const fixed = boundary.map(([a, b]) => `${a}-${b}(${b} is ${col[b] || 'not yet coloured'})`).join(', ');
  const markText = showMarks ? `\nConflicts you must resolve now (same colour on both ends): ${marks.map(([a, b]) => `${a}-${b}`).join(', ')}.` : '';
  return { model, max_tokens: maxTokens, output_config: { format: { type: 'json_schema', schema: ANSWER_SCHEMA }, ...(effort ? { effort } : {}) },
    messages: [{ role: 'user', content: `You colour part of a larger graph together with other agents. You own nodes ${[...mine].join(', ')} and may change only their colours.\n${rules}\nEdges among your nodes: ${internal.map(([a, b]) => `${a}-${b}`).join(', ') || 'none'}.\nEdges from your nodes to nodes owned by others, whose colour you cannot change: ${fixed || 'none'}.\nYour current colours: ${ownNow}.${markText}\nReturn colours for all your ${mine.size} nodes as node:colour pairs separated by spaces. Change as few as needed. Nothing else.` }] };
}

// Which regions act this round and with which marks.
//   'inhibit': a cross-region conflict is assigned to one side only (priority by hash of region and round)
//   'sync':    every region with a conflict on one of its nodes acts on all its conflicts
//   'all':     every region acts every round with no marks shown (no stigmergic signal)
export function plan(inst, col, round, mode) {
  const cs = conflicts(inst, col), byRegion = new Map(); const add = (i, e) => { if (!byRegion.has(i)) byRegion.set(i, []); byRegion.get(i).push(e); };
  if (mode === 'all') { for (let i = 0; i < inst.k; i++) byRegion.set(i, cs.filter(([a, b]) => inst.owner[a] === i || inst.owner[b] === i)); return byRegion; }
  for (const e of cs) { const ra = inst.owner[e[0]], rb = inst.owner[e[1]]; if (ra === rb || mode === 'sync') { add(ra, e); if (rb !== ra) add(rb, e); } else add(h(`${ra}:${round}`) > h(`${rb}:${round}`) ? ra : rb, e); }
  return byRegion;
}

// Stimulus-centred recruitment: every conflicting edge recruits the ball of radius `radius` around its ends; overlapping
// balls merge into one patch; one member works each patch (capped at `cap` nodes, nearest first). Returns [{ nodes, marks }].
export function patches(inst, col, radius = 1, cap = 40) {
  const cs = conflicts(inst, col); if (!cs.length) return [];
  const parent = new Map(); const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const balls = cs.map(([a, b]) => { const seen = new Set([a, b]); let front = [a, b]; for (let d = 0; d < radius; d++) { const nx = []; for (const u of front) for (const v of inst.adj[u]) if (!seen.has(v)) { seen.add(v); nx.push(v); } front = nx; } return seen; });
  balls.forEach((_, i) => parent.set(i, i)); const nodeBall = new Map();
  balls.forEach((B, i) => { for (const u of B) { if (nodeBall.has(u)) parent.set(find(i), find(nodeBall.get(u))); else nodeBall.set(u, i); } });
  const groups = new Map(); balls.forEach((B, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, { nodes: new Set(), marks: [] }); for (const u of B) groups.get(r).nodes.add(u); groups.get(r).marks.push(cs[i]); });
  return [...groups.values()].map((g) => { let nodes = [...g.nodes]; if (nodes.length > cap) { const core = new Set(g.marks.flat()); nodes = [...core, ...nodes.filter((u) => !core.has(u))].slice(0, cap); } return { nodes: nodes.sort((x, y) => x - y), marks: g.marks }; });
}
