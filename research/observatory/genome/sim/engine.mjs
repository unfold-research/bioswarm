// G2 swarm-archetype simulator. One world (a ring of sites), four task families, and every simulated trait of the G1 genome
// as a mechanism that a regime switches on or off. No model calls. Deterministic given (task, regime, threat, seed).
import { mulberry32, hashSeed } from '../../../sims/lib.mjs';

// Traits of catalog/genome/traits.json that have a mechanism here. Every other trait is listed as not compiled.
export const FLAGS = ['SIG-01', 'SIG-02', 'SIG-04', 'SIG-06', 'FLD-01', 'FLD-02', 'FLD-03', 'FLD-04', 'ACT-01', 'ACT-02', 'ACT-03', 'ACT-05',
  'DEC-03', 'DEC-04', 'DOL-01', 'DOL-04', 'DEF-01', 'DEF-04', 'REG-05'];

export const P = { M: 160, N: 24, R: 300, radius: 4, tau: 15, hubLag: 8, chemLambda: 6, chemQ: 1.5, chemMin: 0.25, share: 0.2, kNear: 6,
  lieWindow: 6, repCut: -2, alarmRadius: 8, recruitHold: 10, restAfter: 3, restWake: 5,
  // G3a (2026-11-15): DEC-04 used to read task.truth() over +/-2*radius for free. It now surveys its own
  // neighbourhood through sense(), and each site read beyond the one it stands on costs one action.
  informedSense: 4, informedSurvey: 1 };

const ring = (a, b, M) => { const d = Math.abs(a - b) % M; return Math.min(d, M - d); };
const signed = (from, to, M) => { let d = ((to - from) % M + M) % M; if (d > M / 2) d -= M; return d; };
const moveToward = (from, to, step, M) => { const d = signed(from, to, M); const s = Math.max(-step, Math.min(step, d)); return ((from + s) % M + M) % M; };
const wrap = (x, M) => ((x % M) + M) % M;
const poisson = (rng, lam) => { let k = 0, p = Math.exp(-lam), s = p; const u = rng(); while (u > s) { k++; p *= lam / k; s += p; } return k; };

// ---------------- tasks ----------------
// Each task exposes: init(w), step(w) (dynamics before agents act), truth(w, s) -> {need, kind} as seen by a perfect sensor,
// sense(w, a, s) -> claim value as seen by agent a (noisy), work(w, a, s), endRound(w), score(w).
// A claim is {s, v, kind, t, author, recruit}: v = 1 "work needed here", 0 "nothing to do". TRACK uses its own claims.
const skill = (w, a, kind) => (!w.f.has('DOL-01') ? 0.6 : kind === undefined || kind === a.type ? 0.9 : 0.3);

export const TASKS = {
  // Colony home: upkeep of a structure where damage appears, often next to earlier damage.
  maintain: (opts = {}) => ({
    id: 'maintain', home: 'colony', local: opts.local ?? 0.8, rate: opts.rate ?? 2.0, win: opts.win ?? 8,
    init(w) { w.broken = new Map(); w.born = []; },
    step(w) {
      for (let i = poisson(w.rng, this.rate); i > 0; i--) {
        let s; const keys = [...w.broken.keys()];
        if (keys.length && w.rng() < this.local) s = wrap(keys[Math.floor(w.rng() * keys.length)] + (w.rng() < 0.5 ? -1 : 1) * (1 + Math.floor(w.rng() * 2)), w.p.M);
        else s = Math.floor(w.rng() * w.p.M);
        if (!w.broken.has(s)) { const d = { s, kind: Math.floor(w.rng() * 3), born: w.t, fixed: null }; w.broken.set(s, d); w.born.push(d); }
      }
    },
    truth(w, s) { const d = w.broken.get(s); return d ? { need: 1, kind: d.kind } : { need: 0 }; },
    sense(w, a, s) { const d = w.broken.get(s); return d ? (w.rng() < 0.9 ? 1 : 0) : (w.rng() < 0.03 ? 1 : 0); },
    work(w, a, s) { const d = w.broken.get(s); if (d && w.rng() < skill(w, a, d.kind)) { d.fixed = w.t; w.broken.delete(s); } },
    endRound() {},
    score(w) { const xs = w.born.filter((d) => d.born <= w.p.R - this.win); return xs.length ? xs.filter((d) => d.fixed !== null && d.fixed - d.born <= this.win).length / xs.length : 0; },
  }),
  // Flock home: keep the group on a moving target that each member senses only as a noisy direction.
  track: () => ({
    id: 'track', home: 'flock', step1: true,
    init(w) { w.x = Math.floor(w.rng() * w.p.M); w.vel = 1; w.near = 0; w.cnt = 0; },
    step(w) { if (w.rng() < 0.1) w.vel = [-1, 0, 1][Math.floor(w.rng() * 3)]; if (w.rng() < 0.7) w.x = wrap(w.x + w.vel, w.p.M); },
    truth(w, s) { return { need: ring(s, w.x, w.p.M) <= 1 ? 1 : 0 }; },
    sense(w, a, s) { return ring(s, w.x, w.p.M) <= 1 ? 1 : 0; },
    dir(w, a) { const d = Math.sign(signed(a.pos, w.x, w.p.M)) || 0; const p = a.informed ? (w.p.informedP ?? 0.9) : 0.65; return w.rng() < p ? d : -d || (w.rng() < 0.5 ? 1 : -1); },
    work() {},
    endRound(w) { const hs = w.agents.filter((a) => !a.bad && !a.leader); w.near += hs.filter((a) => ring(a.pos, w.x, w.p.M) <= 3).length / hs.length; w.cnt++; },
    score(w) { return w.near / w.cnt; },
  }),
  // Chemical-collective home: prey that only pays when enough members pull at the same site in the same round.
  mass: (opts = {}) => ({
    id: 'mass', home: 'chemical', q: opts.q ?? 4, rate: opts.rate ?? 0.15, life: opts.life ?? 15,
    init(w) { w.prey = new Map(); w.spawned = 0; w.harvested = 0; },
    step(w) {
      for (const [s, p] of w.prey) if (w.t - p.born > this.life) w.prey.delete(s);
      for (let i = poisson(w.rng, this.rate); i > 0; i--) { const s = Math.floor(w.rng() * w.p.M); if (!w.prey.has(s)) { w.prey.set(s, { born: w.t }); if (w.t <= w.p.R - this.life) w.spawned++; } }
    },
    truth(w, s) { const p = w.prey.get(s); if (!p) return { need: 0 }; const here = w.agents.filter((a) => !a.bad && !a.leader && a.pos === s).length; return { need: Math.max(0, this.q - here) + 1 }; },
    sense(w, a, s) { return w.prey.has(s) ? (w.rng() < 0.95 ? 1 : 0) : 0; },
    work() {},
    endRound(w) {
      for (const [s, p] of w.prey) { const here = w.agents.filter((a) => !a.bad && !a.leader && a.pos === s).length;
        if (here >= this.q) { w.prey.delete(s); if (p.born <= w.p.R - this.life) w.harvested++; } }
    },
    score(w) { return w.spawned ? w.harvested / w.spawned : 0; },
  }),
  // Team home: jobs of three stages, each needing a given skill, done in order at one place.
  pipeline: (opts = {}) => ({
    id: 'pipeline', home: 'team', rate: opts.rate ?? 1.2, life: opts.life ?? 20,
    init(w) { w.jobs = new Map(); w.spawned = 0; w.done = 0; },
    step(w) {
      for (const [s, j] of w.jobs) if (w.t - j.born > this.life) w.jobs.delete(s);
      for (let i = poisson(w.rng, this.rate); i > 0; i--) { const s = Math.floor(w.rng() * w.p.M);
        if (!w.jobs.has(s)) { w.jobs.set(s, { born: w.t, stages: [0, 1, 2].map(() => Math.floor(w.rng() * 3)), k: 0 }); if (w.t <= w.p.R - this.life) w.spawned++; } }
    },
    truth(w, s) { const j = w.jobs.get(s); return j ? { need: 1, kind: j.stages[j.k] } : { need: 0 }; },
    sense(w, a, s) { return w.jobs.has(s) ? (w.rng() < 0.95 ? 1 : 0) : (w.rng() < 0.02 ? 1 : 0); },
    work(w, a, s) { const j = w.jobs.get(s); if (!j || j.worked === w.t) return; j.worked = w.t;
      if (w.rng() < skill(w, a, j.stages[j.k])) { j.k++; if (j.k === 3) { w.jobs.delete(s); if (j.born <= w.p.R - this.life) w.done++; } } },
    endRound() {},
    score(w) { return w.spawned ? w.done / w.spawned : 0; },
  }),
};

// ---------------- the swarm ----------------
export function simulate({ task, flags = [], sched = false, threat = 0, seed = 0, params = {} }) {
  const p = { ...P, ...params }, f = new Set(flags);
  const rng = mulberry32(hashSeed('g2', task.id, task.local ?? '', [...f].sort().join('+'), sched, threat, seed));
  const w = { p, f, rng, t: 0, trace: new Map(), hubQ: [], hub: new Map(), board: new Map(), recent: [], votes: new Map(), shared: new Set(), actions: 0, falseFlags: 0, trueFlags: 0 };
  const nBad = Math.round(threat * p.N);
  w.agents = Array.from({ length: p.N }, (_, i) => ({
    id: i, pos: Math.floor(rng() * p.M), leader: f.has('DOL-04') && i === 0, bad: false, type: i % 3,
    theta: f.has('ACT-01') ? 0.05 + 0.9 * rng() : 0.5, scout: false, informed: false,
    mem: new Map(), rep: new Map(), black: new Set(), idle: 0, rest: 0, target: null, recruitUntil: -1, offset: Math.floor((i * p.M) / p.N),
  }));
  // compromised members are drawn from the non-leader agents; scouts and informed members from the honest rest
  const pool = w.agents.filter((a) => !a.leader);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  pool.slice(0, nBad).forEach((a) => (a.bad = true));
  const honest = pool.slice(nBad);
  if (f.has('DEC-03')) honest.slice(0, Math.round(p.share * honest.length)).forEach((a) => (a.scout = true));
  if (f.has('DEC-04')) honest.slice(-Math.round(p.share * honest.length)).forEach((a) => (a.informed = true));
  task.init(w);

  const weight = (c) => (f.has('FLD-02') ? Math.exp(-(w.t - c.t) / p.tau) : 1) * (c.recruit ? 1.5 : 1);
  const ignored = (a, author) => author !== a.id && ((f.has('DEF-01') && (a.rep.get(author) ?? 0) <= p.repCut) || (f.has('DEF-04') && w.shared.has(author)));
  const latest = (into, c) => { const o = into.get(c.s); if (!o || o.t <= c.t) into.set(c.s, c); };

  function knowledge(a) {
    const k = new Map();
    for (const c of a.mem.values()) latest(k, c);
    if (f.has('FLD-01')) for (let d = -p.radius; d <= p.radius; d++) { const c = w.trace.get(wrap(a.pos + d, p.M)); if (c && !ignored(a, c.author)) latest(k, c); }
    if (f.has('FLD-03')) for (const c of w.hub.values()) if (!ignored(a, c.author)) latest(k, c);
    return k;
  }
  // a member who observes a site checks the recent claims others made about it
  function audit(a, s, v, claims) {
    for (const c of claims) {
      if (c.s !== s || c.author === a.id || w.t - c.t > p.lieWindow) continue;
      const r = (a.rep.get(c.author) ?? 0) + (c.v === v ? 0.5 : -1); a.rep.set(c.author, Math.min(2, r));
      if (c.v !== v && r <= p.repCut && !a.flagged?.has(c.author)) {
        (a.flagged ||= new Set()).add(c.author);
        const bad = w.agents[c.author].bad; bad ? w.trueFlags++ : w.falseFlags++;
        if (f.has('SIG-04')) for (const b of w.agents) if (!b.bad && ring(b.pos, a.pos, p.M) <= p.alarmRadius) b.rep.set(c.author, Math.min(b.rep.get(c.author) ?? 0, p.repCut));
        if (f.has('DEF-04')) { const vs = w.votes.get(c.author) || new Set(); vs.add(a.id); w.votes.set(c.author, vs); if (vs.size >= 2) w.shared.add(c.author); }
      }
    }
  }
  function chemAt(s) { let c = 0; for (const e of w.emit) c += Math.exp(-ring(s, e, p.M) / p.chemLambda); return c; }

  for (w.t = 0; w.t < p.R; w.t++) {
    task.step(w);
    w.emit = [];
    if (f.has('SIG-02')) for (const a of w.agents) if (!a.leader && (a.bad ? true : a.recruitUntil >= w.t)) w.emit.push(a.pos);
    // ---- leader assigns from the reports of the previous round ----
    if (f.has('DOL-04')) leaderAssign(w, task);
    // ---- members decide ----
    const intent = new Map();
    for (const a of w.agents) {
      if (a.leader) continue;
      if (a.bad) { intent.set(a, wrap(a.pos + Math.floor(rng() * (2 * p.radius + 1)) - p.radius, p.M)); continue; }
      if (sched) { intent.set(a, wrap(a.offset + w.t, p.M)); continue; }
      if (f.has('REG-05') && a.rest > 0) { a.rest--; intent.set(a, a.pos); a.resting = true; continue; }
      a.resting = false;
      if (a.assigned !== undefined && a.assigned !== null) { intent.set(a, a.assigned); continue; }
      intent.set(a, decide(a));
    }
    // neighbour coupling: a member's step follows the majority direction of its k nearest members
    if (f.has('SIG-06')) {
      const mem = [...intent.keys()].filter((a) => !a.bad && !sched);
      const dir = new Map(mem.map((a) => [a, Math.sign(signed(a.pos, intent.get(a), p.M))]));
      for (const a of mem) {
        if (a.target?.engaged) continue;
        const near = mem.filter((b) => b !== a).sort((x, y) => ring(x.pos, a.pos, p.M) - ring(y.pos, a.pos, p.M)).slice(0, p.kNear);
        const s = dir.get(a) + near.reduce((n, b) => n + dir.get(b), 0);
        if (s !== 0) intent.set(a, wrap(a.pos + Math.sign(s) * (task.step1 ? 1 : Math.max(1, ring(a.pos, intent.get(a), p.M))), p.M));
      }
    }
    // ---- move, sense, work, deposit, report ----
    const reports = [];
    for (const [a, to] of intent) {
      if (a.resting) continue;
      a.pos = moveToward(a.pos, to, task.step1 ? 1 : Math.max(1, a.budget ?? p.radius), p.M); w.actions++;
      const s = a.pos, tr = task.truth(w, s);
      const v = a.bad ? (tr.need > 0 ? 0 : 1) : task.sense(w, a, s);
      const claim = { s, v, kind: a.bad ? Math.floor(rng() * 3) : tr.kind, t: w.t, author: a.id, recruit: false };
      if (!a.bad) {
        const seen = [...(f.has('FLD-01') ? [w.trace.get(s)].filter(Boolean) : []), ...(f.has('FLD-03') && w.hub.get(s) ? [w.hub.get(s)] : [])];
        if (f.has('DOL-04')) { const bc = w.board.get(s); if (bc) seen.push(bc); }
        for (const c of a.mem.values()) if (c.author !== a.id) seen.push(c);
        audit(a, s, v, seen);
        if (v === 1) task.work(w, a, s);
        const after = task.truth(w, s);
        const stillNeeds = v === 1 && after.need > 0;
        if (f.has('ACT-03') && stillNeeds && after.need > 1) { claim.recruit = true; a.recruitUntil = f.has('ACT-05') ? w.t : w.t + p.recruitHold; }
        else if (f.has('ACT-05')) a.recruitUntil = -1;
        claim.v = stillNeeds ? 1 : (v === 1 ? 0 : v);
        a.target = stillNeeds && task.id === 'mass' ? { s, engaged: true } : null;
      } else if (f.has('ACT-03') && claim.v === 1) claim.recruit = true;
      if (!f.has('FLD-04')) for (const [k, c] of a.mem) if (c.author === a.id) a.mem.delete(k);
      latest(a.mem, claim);
      if (f.has('FLD-01')) w.trace.set(s, claim);
      if (f.has('FLD-03')) w.hubQ.push(claim);
      reports.push(claim);
      if (a.target === null && claim.v === 0 && !task.step1) { a.idle++; if (f.has('REG-05') && a.idle >= p.restAfter && !(f.has('SIG-02') && chemAt(a.pos) >= p.chemMin)) { a.rest = p.restWake; a.idle = 0; } } else a.idle = 0;
    }
    if (f.has('FLD-03')) { while (w.hubQ.length && w.hubQ[0].t <= w.t + 1 - p.hubLag) latest(w.hub, w.hubQ.shift()); }
    // contact: members on the same or adjacent site exchange what they know
    if (f.has('SIG-01')) {
      const live = w.agents.filter((a) => !a.leader && !a.resting);
      for (const a of live) for (const b of live) if (a !== b && ring(a.pos, b.pos, p.M) <= 1)
        for (const c of b.mem.values()) if (!ignored(a, c.author) && (c.author === b.id || f.has('FLD-04'))) latest(a.mem, { ...c });
    }
    if (f.has('DOL-04')) {
      for (const c of reports) latest(w.board, c);
      if (f.has('DEF-01') || f.has('DEF-04')) leaderAudit(w, reports);
    }
    task.endRound(w);
  }
  const sh = [...w.shared].map((i) => w.agents[i]);
  return { score: task.score(w), actions: w.actions / (p.N * p.R), trueFlags: w.trueFlags, falseFlags: w.falseFlags, sharedBad: sh.filter((a) => a.bad).length, sharedHonest: sh.filter((a) => !a.bad).length };

  // ---------- member policy ----------
  function decide(a) {
    if (task.id === 'track') return decideTrack(a);
    if (a.target?.engaged && task.truth(w, a.target.s).need > 0) return a.target.s;
    if (a.scout) return wrap(a.pos + Math.floor(rng() * (2 * p.radius + 1)) - p.radius, p.M);
    const k = knowledge(a);
    // G3a: an informed member surveys its own neighbourhood through the noisy sense(), not truth(), and pays for the
    // reads out of the same per-round action budget every member has. The survey is capped at informedSense sites.
    let budget = p.radius;
    if (a.informed) {
      let reads = 0;
      for (let d = -p.radius; d <= p.radius && reads < p.informedSense && budget > 0; d++) {
        if (d === 0) continue; // the member's own site is read by the ordinary sense() step below
        const s = wrap(a.pos + d, p.M), v = task.sense(w, a, s);
        if (v === 1) latest(k, { s, v: 1, kind: task.truth(w, s).kind, t: w.t, author: a.id });
        reads++; budget -= p.informedSurvey;
      }
    }
    a.budget = budget;
    // density switch: with enough signal around, follow the chemical gradient before anything else
    const here = f.has('SIG-02') ? chemAt(a.pos) : 0;
    if (f.has('ACT-02') && here >= p.chemQ) return uphill(a);
    let best = null, bs = -Infinity;
    for (const c of k.values()) {
      if (c.v !== 1) continue;
      let wgt = weight(c); if (f.has('DOL-01') && c.kind !== undefined && c.kind !== a.type) wgt *= 0.5;
      if (wgt < a.theta) continue;
      const sc = wgt - 0.04 * ring(a.pos, c.s, p.M) + rng() * 0.01;
      if (sc > bs) { bs = sc; best = c; }
    }
    if (best) return best.s;
    if (f.has('SIG-02') && here >= p.chemMin) return uphill(a);
    return wrap(a.pos + Math.floor(rng() * (2 * p.radius + 1)) - p.radius, p.M);
  }
  function uphill(a) { let bs = a.pos, bc = -1; for (let d = -p.radius; d <= p.radius; d++) { const s = wrap(a.pos + d, p.M), c = chemAt(s); if (c > bc) { bc = c; bs = s; } } return bs; }
  function decideTrack(a) {
    const k = knowledge(a); let best = null;
    for (const c of k.values()) if (c.v === 1 && weight(c) >= a.theta && (!best || c.t > best.t)) best = c;
    if (best && w.t - best.t <= 3) return best.s;
    return wrap(a.pos + task.dir(w, a), p.M);
  }
}

// ---------- leader ----------
// The leader audits each site's recent reports against their majority; an author in the minority loses reputation.
function leaderAudit(w, reports) {
  const { p, f } = w, L = w.agents[0];
  w.recent = w.recent.filter((c) => w.t - c.t < p.lieWindow).concat(reports);
  const by = new Map(); for (const c of w.recent) (by.get(c.s) || by.set(c.s, []).get(c.s)).push(c);
  for (const c of reports) {
    const xs = by.get(c.s).filter((x) => x.author !== c.author); if (xs.length < 2) continue;
    const maj = xs.filter((x) => x.v === 1).length * 2 > xs.length ? 1 : 0;
    const r = (L.rep.get(c.author) ?? 0) + (c.v === maj ? 0.5 : -1); L.rep.set(c.author, Math.min(2, r));
    if (r <= p.repCut && !w.shared.has(c.author)) { w.agents[c.author].bad ? w.trueFlags++ : w.falseFlags++; if (f.has('DEF-04')) w.shared.add(c.author); }
  }
}

function leaderAssign(w, task) {
  const { p, f } = w, M = p.M, L = w.agents[0];
  const ok = (c) => !((f.has('DEF-04') && w.shared.has(c.author)) || (f.has('DEF-01') && (L.rep.get(c.author) ?? 0) <= p.repCut));
  const workers = w.agents.filter((a) => !a.leader && !a.bad);
  for (const a of w.agents) a.assigned = null;
  if (task.id === 'track') {
    // estimate the target from the newest sighting, else from the members' direction votes
    let est = null, bt = -1; for (const c of w.board.values()) if (c.v === 1 && ok(c) && c.t > bt) { bt = c.t; est = c.s; }
    if (est === null || w.t - bt > 3) {
      const votes = w.agents.filter((a) => !a.leader).map((a) => ({ x: a.pos, d: a.bad ? (w.rng() < 0.5 ? 1 : -1) : task.dir(w, a) }));
      let bx = 0, be = Infinity; for (let x = 0; x < M; x++) { let e = 0; for (const v of votes) e += Math.sign(signed(v.x, x, M)) === v.d ? 0 : 1; if (e < be) { be = e; bx = x; } }
      est = bx;
    }
    for (const a of workers) a.assigned = est;
    return;
  }
  const need = [...w.board.values()].filter((c) => c.v === 1 && ok(c) && (f.has('FLD-02') ? w.t - c.t <= 3 * p.tau : true)).sort((x, y) => y.t - x.t);
  const free = new Set(workers);
  for (const c of need) {
    const k = task.id === 'mass' ? task.q : 1;
    const pick = [...free].sort((x, y) => (f.has('DOL-01') && c.kind !== undefined ? (x.type === c.kind ? 0 : 50) - (y.type === c.kind ? 0 : 50) : 0) + ring(x.pos, c.s, M) - ring(y.pos, c.s, M)).slice(0, k);
    for (const a of pick) { a.assigned = c.s; free.delete(a); }
    if (!free.size) break;
  }
  // the rest sweep the sites the board has heard least about
  const stale = Array.from({ length: M }, (_, s) => [s, w.board.get(s)?.t ?? -1]).sort((x, y) => x[1] - y[1]).map((x) => x[0]);
  let i = 0; for (const a of free) { a.assigned = stale[i++ % stale.length]; }
}
