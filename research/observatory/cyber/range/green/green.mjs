// R0 green workload (M2; tasks/R0-PILOT-PREREG.md, "Green"). Scripted benign users on the three workstations:
//   - an HTTP GET to web:8080 (the nginx service; no curl/wget in the image, so a raw request over bash /dev/tcp);
//   - SFTP get and put on files:2222 under the service-user sshd (internal-sftp).
// Every action is logged as succeeded or failed with its cause, exactly as the prereg's attribution rule asks:
//   blue_restore (a host of the action is down by a blue Restore), blue_block (the segment pair is cut at the router),
//   red_impact (the service is broken by red), or other. The cause comes from HARNESS STATE only (Cyber Research,
//   2026-11-23, pre-data deviation): red's impacts copied at launch, the hosts the mediator had down (Restore) and the
//   segment pairs it had blocked while the action was in flight. Green opens no network probe to find a cause (its old
//   check to web:2222 showed up as wsN|web|2222, a key in no list, and made false cues when red or blue were active).
// Green only ever uses the svc account for SFTP on files (prereg "Allow-list key"); its HTTP request is a plain TCP client, so green never opens a shell on a server.
//
// The driver (episode.mjs) owns the range and the per-episode key; it calls new Green(...).step(i) once per step, which
// launches the step's actions without waiting for them, and green.drain() at the end of the episode.
// Green is seeded: the schedule (which workstation does what on which step) is fixed by the seed, so a replay of a
// seed issues the same actions in the same order.
import { spawn, spawnSync } from 'node:child_process';

// A small deterministic PRNG (mulberry32) so a seed fixes the whole green schedule.
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Classify a failed green action from the harness state (failureCause below). Pure, unit-tested.
//   serviceUp:false  -> a host of the action was down by a blue Restore
//   reachable:false  -> the segment pair was cut by a blue Block at the router
//   impacted:true    -> red broke the service (impact, as known at launch)
//   otherwise        -> other
export function classifyFailure({ serviceUp, reachable, impacted }) {
  if (!serviceUp) return 'blue_restore';
  if (!reachable) return 'blue_block';
  if (impacted) return 'red_impact';
  return 'other';
}

// The segment-pair key of the mediator's Block/Allow (mediator.mjs: sorted, joined by '-'). Pure.
export const pairKey = (a, b) => [a, b].sort().join('-');
// A failed action's cause from harness state only. Pure, unit-tested.
//   ws, target: the hosts of the action; seen: { down:Set of hosts, blocked:Set of segment pairs } over the action's
//   flight; impacted: red's impacts at launch; segmentOf: host -> segment.
export function failureCause({ ws, target, seen, impacted = {}, segmentOf = {} }) {
  const down = seen?.down || new Set(), blocked = seen?.blocked || new Set();
  const sa = segmentOf[ws], sb = segmentOf[target];
  return classifyFailure({ serviceUp: !down.has(target) && !down.has(ws), reachable: !(sa && sb && sa !== sb && blocked.has(pairKey(sa, sb))), impacted: !!impacted[target] });
}

// Deferred and dropped actions against the planned ones (Cyber Research, 2026-11-23): more than MAX_SCHED_FRAC of the
// planned actions deferred + dropped in a baseline episode or the idle diagnostic is a final stop. A dropped action was
// deferred first, so it counts in both, as the rule is written. Returns null or the reason. Pure.
export const MAX_SCHED_FRAC = 0.05;
export function scheduleBlocks(s, max = MAX_SCHED_FRAC) {
  if (!s || typeof s.planned !== 'number') return 'no green schedule record';
  const frac = s.planned ? (s.deferred + s.dropped) / s.planned : 0;
  return frac > max ? `green deferred ${s.deferred} + dropped ${s.dropped} = ${(100 * frac).toFixed(1)}% of ${s.planned} planned actions > ${100 * max}%` : null;
}
// The fixed per-step schedule for a seed: a list of {ws, kind} actions. Pure, unit-tested.
// kind is 'http' (ws -> web) or 'sftp' (ws -> files). On average ~1.5 actions per step across the workstations.
export function schedule(seed, steps, workstations = ['ws1', 'ws2', 'ws3']) {
  const r = rng(seed ^ 0x9e3779b9), plan = [];
  for (let i = 0; i < steps; i++) {
    const acts = [];
    for (const ws of workstations) if (r() < 0.5) acts.push({ ws, kind: r() < 0.5 ? 'http' : 'sftp' });
    plan.push(acts);
  }
  return plan;
}

// Every docker call of green has a 20 s timeout. placeKey (once, before step 0) stays synchronous; the actions run
// asynchronously (dxAsync) so the step clock never waits for them (Cyber Research, 2026-11-23, pre-data deviation).
export const EXEC_TIMEOUT_MS = 20000;
const dx = (args, opts = {}) => spawnSync('docker', args, { encoding: 'utf8', timeout: EXEC_TIMEOUT_MS, ...opts });
// The asynchronous docker call: resolves (never rejects) to spawnSync's shape { status, stdout, stderr }. At the timeout
// the client is killed and status is null, as spawnSync reports a timed-out child; timedOut says so.
export function dxAsync(args, { input, timeout = EXEC_TIMEOUT_MS, cmd = 'docker' } = {}) {
  return new Promise((resolve) => {
    let out = '', err = '', done = false, timedOut = false, p;
    const finish = (r) => { if (done) return; done = true; clearTimeout(t); resolve(r); };
    const t = setTimeout(() => { timedOut = true; try { p?.kill('SIGKILL'); } catch {} }, timeout);
    try { p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { finish({ status: null, stdout: '', stderr: String(e.message || e), timedOut }); return; }
    p.stdout.setEncoding('utf8'); p.stderr.setEncoding('utf8');
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => finish({ status: null, stdout: out, stderr: err || String(e.message || e), timedOut }));
    p.on('close', (code) => finish({ status: timedOut ? null : code, stdout: out, stderr: err, timedOut }));
    p.stdin.on('error', () => {});
    p.stdin.end(input ?? undefined);
  });
}

export class Green {
  // opts: { pods:[{host,ip,service,...}], keyPath (svc private key, placed in each ws svc container at /tmp/gk),
  //         token (harness token so green's own exec is excluded from the allow-lists), seed, steps,
  //         run? (the async docker call; tests only), runSync? (the synchronous one; tests only), timeoutMs? (tests only) }
  constructor({ pods, keyPath, token, seed, steps, run = dxAsync, runSync = dx, timeoutMs = EXEC_TIMEOUT_MS }) {
    this.P = Object.fromEntries(pods.map((p) => [p.host, p]));
    this.keyPath = keyPath; this.token = token; this.plan = schedule(seed, steps);
    this.run = run; this.runSync = runSync; this.timeoutMs = timeoutMs;
    this.keyOk = {}; this.rekeys = []; // the svc key in each workstation (placeKey, rekey) and every re-placement
    // At most one action in flight per workstation (Cyber Research, 2026-11-23, pre-data deviation): a due action whose
    // workstation is busy is deferred to the next step ONCE; if the workstation is still busy then, it is dropped.
    this.busy = new Set(); this.deferredQ = [];
    this.sched = { planned: 0, executed: 0, deferred: 0, dropped: 0, deferredList: [], droppedList: [] };
    this.stepSched = { deferred: [], dropped: [] }; // what the last step() deferred and dropped (stepLog)
    this.tally = { ok: 0, fail: 0, byCause: { blue_restore: 0, blue_block: 0, red_impact: 0, other: 0 }, byKind: { http: 0, sftp: 0 } };
    this.log = [];
    this.pending = new Set(); this.inFlight = 0; this.now = null; // actions launched and not yet back; the current step
    this.segmentOf = Object.fromEntries(pods.map((p) => [p.host, p.segment]));
    this.state = { down: new Set(), blocked: new Set() }; // the mediator's state as last reported (observe)
    this.flights = new Set(); // the harness state seen by each action in flight
  }
  // The episode reports the mediator's state each step (hosts down by a Restore, segment pairs blocked); every action
  // in flight records it, so a Restore or Block during its flight is its cause. No network, no docker call.
  observe({ down = [], blocked = [] } = {}) {
    this.state = { down: new Set(down), blocked: new Set(blocked) };
    for (const f of this.flights) { for (const h of this.state.down) f.down.add(h); for (const b of this.state.blocked) f.blocked.add(b); }
  }
  // Run green's exec inside a workstation with the harness token set, so the sensor never puts green in an allow-list.
  exec(ws, argv, input) {
    return this.run(['exec', '-i', '-e', `R0_HARNESS=${this.token}`, this.P[ws].service, ...argv], { input, timeout: this.timeoutMs });
  }
  // One HTTP GET to web over /dev/tcp; success = nginx 200 ("r0-web ok").
  async http(ws, cause) {
    const web = this.P.web, cmd = `exec 3<>/dev/tcp/${web.ip}/${web.port}; printf 'GET / HTTP/1.0\\r\\nHost: web\\r\\n\\r\\n' >&3; cat <&3`;
    const r = await this.exec(ws, ['bash', '-c', `timeout 3 bash -c ${JSON.stringify(cmd)}`]);
    const ok = r.status === 0 && /200 OK/.test(r.stdout) && /r0-web ok/.test(r.stdout);
    return ok ? { ok: true } : { ok: false, cause: cause('web') };
  }
  // SFTP: put a small synthetic file, then get it back. success = both transfers return 0 and bytes match.
  async sftp(ws, cause) {
    const files = this.P.files, name = `g-${ws}-${Date.now()}`;
    const batch = `put /tmp/gk /home/svc/share/${name}\n-get /home/svc/share/${name} /tmp/${name}\nbye\n`;
    const r = await this.exec(ws, ['bash', '-c',
      `timeout 10 sftp -i /tmp/gk -P 2222 -b - -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes svc@${files.ip} <<'SF'\n${batch}SF`]);
    // sftp -b exits nonzero if any un-prefixed command (the put) fails; batch mode prints no "Uploading" line, so the
    // exit status is the reliable success signal.
    const ok = r.status === 0 && !/Permission denied|Couldn't|No such file/i.test(r.stdout + r.stderr);
    return ok ? { ok: true } : { ok: false, cause: cause('files') };
  }
  // One step: LAUNCH this step's due actions and return at once (the step clock does not wait for them). The episode
  // calls it right after the sensor read (order red -> sensor -> green; Cyber Research, 2026-11-23).
  // impacted = {web,files,db} as known to the runner (red impacts) at launch; it is copied, so the cause of a failure is
  // attributed with the impacts of the step the action was LAUNCHED in; the mediator's state at launch (the last
  // observe()) and every later observe() until it returns give the Restore and Block causes (failureCause). Each result
  // goes to the log and the tally when it comes back, with step = its launch step (doneStep = the step in which it came
  // back). An SFTP action launched while its workstation has no key (a failed re-placement) that fails is 'other'.
  // Returns the promises.
  // Cap: a workstation with an action in flight launches nothing. Due in step i are the actions deferred from step i-1
  // (first: it is their last chance) and then the actions planned for step i. A due action whose workstation is busy
  // is deferred to step i+1 if it was planned for step i, or dropped if it was already deferred once. A launched
  // deferred action is attributed to its launch step (step) and keeps its planned step (plannedStep).
  step(i, impacted = {}) {
    this.now = i;
    const imp = { ...impacted }, launched = [], deferred = [], dropped = [];
    const planned = this.plan[i] || [];
    this.sched.planned += planned.length;
    const due = [...this.deferredQ.map((a) => ({ ...a, wasDeferred: true })), ...planned.map(({ ws, kind }) => ({ ws, kind, plannedStep: i, wasDeferred: false }))];
    this.deferredQ = [];
    for (const a of due) {
      if (this.busy.has(a.ws)) {
        const rec = { plannedStep: a.plannedStep, step: i, ws: a.ws, kind: a.kind };
        if (a.wasDeferred) { this.sched.dropped++; this.sched.droppedList.push(rec); dropped.push(rec); }
        else { this.sched.deferred++; this.sched.deferredList.push(rec); deferred.push(rec); this.deferredQ.push({ ws: a.ws, kind: a.kind, plannedStep: a.plannedStep }); }
        continue;
      }
      launched.push(this.launch(i, a, imp));
    }
    this.stepSched = { deferred, dropped };
    return launched;
  }
  launch(i, { ws, kind, plannedStep, wasDeferred }, imp) {
      const t0 = Date.now(); this.inFlight++; this.busy.add(ws); this.sched.executed++;
      const seen = { down: new Set(this.state.down), blocked: new Set(this.state.blocked) }; this.flights.add(seen);
      const noKey = kind === 'sftp' && this.keyOk[ws] === false;
      const cause = (target) => (noKey ? 'other' : failureCause({ ws, target, seen, impacted: imp, segmentOf: this.segmentOf }));
      const p = (kind === 'http' ? this.http(ws, cause) : this.sftp(ws, cause))
        .catch((e) => ({ ok: false, cause: 'other', error: String(e?.message || e).slice(0, 200) }))
        .then((res) => {
          this.inFlight--; this.pending.delete(p); this.flights.delete(seen); this.busy.delete(ws);
          this.tally.byKind[kind]++;
          if (res.ok) this.tally.ok++; else { this.tally.fail++; this.tally.byCause[res.cause]++; }
          const rec = { step: i, plannedStep, deferred: wasDeferred, ws, kind, ok: res.ok, cause: res.cause || null, ms: Date.now() - t0, doneStep: this.now };
          this.log.push(rec); return rec;
        });
      this.pending.add(p); return p;
  }
  // the end of the episode: an action still deferred is never launched; it counts as dropped (episodeEnd)
  endSchedule() {
    for (const a of this.deferredQ) { const rec = { plannedStep: a.plannedStep, step: null, ws: a.ws, kind: a.kind, episodeEnd: true }; this.sched.dropped++; this.sched.droppedList.push(rec); }
    this.deferredQ = [];
    return this.sched;
  }
  // Wait for every action still in flight (each is bounded by the exec timeouts); the log is then in launch order
  // (step, then workstation: at most one action per workstation per step).
  async drain() {
    while (this.pending.size) await Promise.all([...this.pending]);
    this.log.sort((a, b) => a.step - b.step || a.ws.localeCompare(b.ws));
    return this.log;
  }
  // Place the svc key in each workstation once, before the first step.
  placeKey(fs) {
    const key = fs.readFileSync(this.keyPath);
    for (const ws of ['ws1', 'ws2', 'ws3']) { const r = this.runSync(['exec', '-i', '-e', `R0_HARNESS=${this.token}`, this.P[ws].service, 'sh', '-c', 'cat > /tmp/gk && chmod 600 /tmp/gk'], { input: key }); this.keyOk[ws] = r?.status === 0; }
  }
  // Re-place the svc key after a blue Restore (Cyber Research, 2026-11-23, pre-data deviation). A Restore recreates the
  // service container from the clean image, so a workstation loses /tmp/gk and its later SFTP actions would fail. The
  // episode calls rekey(host) in the SAME step, right after the Restore returns. The servers keep what green needs (the
  // svc authorized_keys and host key are on the pod volume, which a Restore reuses; web's page and the files share
  // directory come from the image), so only a workstation is re-keyed. The exec carries the harness token and runs ONE
  // process, bash, using builtins only (umask, read, printf, test): bash with the token is on the sensor's exclusion
  // list, as the mediator's own execs are, and docker exec opens no range connection, so nothing enters a list or a
  // cue. Returns { host, step, ms, ok } (null for a host green keeps no key on); a failure leaves keyOk[host] false.
  static REKEY = "umask 077; IFS= read -r -d '' k; printf '%s' \"$k\" > /tmp/gk && [ -s /tmp/gk ]";
  rekey(host, step, fs) {
    if (!['ws1', 'ws2', 'ws3'].includes(host)) return null;
    const t0 = Date.now(); let ok = false, error = null;
    try {
      const r = this.runSync(['exec', '-i', '-e', `R0_HARNESS=${this.token}`, this.P[host].service, 'bash', '-c', Green.REKEY], { input: fs.readFileSync(this.keyPath) });
      ok = r?.status === 0; if (!ok) error = String(r?.stderr || r?.error?.message || `exit ${r?.status}`).trim().slice(0, 200);
    } catch (e) { error = String(e?.message || e).slice(0, 200); }
    this.keyOk[host] = ok;
    const rec = { host, step, ms: Date.now() - t0, ok, ...(error ? { error } : {}) };
    this.rekeys.push(rec); return rec;
  }
}
