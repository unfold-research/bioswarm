// Phase 1a on the direct Pi host: pure parts of the runner, tested without model calls.
// Nothing here stores prompts, messages, tool arguments or file contents.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';
import { availableBytes, countProviderEvent, pauseBytes } from './direct-host-health.mjs';
import { claim, waiting } from './bridge-queue.mjs';
import { observedSeconds, pricedUsage } from './study.mjs';

// The frozen 0.1 connector: files Pi loads, pinned by git blob id at the approved commit.
export const connectorRevision = '2d1dd01bc7401b7c6121449191b48bb2478c85e5';
export const connectorBlobs = {
  'index.js': '11286d21cd97b7daa2df2f8a62d11379eff0dddf',
  'policy.js': '5d7efa769a6b59969bc8741634775297aa559245',
  'package.json': '65cee7f1dacb6494a8e9a20b57fe6a3ecdc4aeb1',
};
export const gitBlob = (buf) =>
  createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
export function verifyConnector(dir) {
  const mismatched = Object.entries(connectorBlobs).filter(
    ([file, id]) => !existsSync(join(dir, file)) || gitBlob(readFileSync(join(dir, file))) !== id,
  );
  if (mismatched.length) throw Error('Connector is not the frozen 0.1 at ' + connectorRevision.slice(0, 7));
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  return { version: pkg.version, revision: connectorRevision };
}
export const digestFiles = (files) => {
  const h = createHash('sha256');
  for (const f of files) h.update(f.name + '\0').update(readFileSync(f.path));
  return h.digest('hex');
};

export const model = 'gpt-6.1-sol';
export const piVersion = '1.5.2';
export const team = ['Lia', 'Davi', 'Otto'];

// The technical smoke's whole toolset: no shell, edit, find, grep or ls (bench/pi-jail enforces the same list).
export const smokeTools = ['read', 'write', 'leave_mark', 'read_marks', 'send_message'];

export function piArgs({ sessionDir, sessionId, extensions, system, prompt, tools }) {
  return [
    '--provider', 'openai', '--model', model, '--thinking', 'medium', '--mode', 'json',
    '--session-dir', sessionDir, '--session-id', sessionId,
    '--no-mcp', '--no-skills', '--no-extensions', '--no-context-files', '--no-prompt-templates', '--no-themes',
    ...extensions.flatMap((e) => ['-e', e]),
    ...(tools ? ['--tools', tools.join(',')] : []),
    '--append-system-prompt', system,
    '-p', prompt,
  ];
}

export const inbox = (messages, names) =>
  messages.map((m) => `Mensagem de ${names[m.sender] ?? 'um colega'} (send_message):\n${m.body}`).join('\n\n');

// Counters fed by every raw Pi JSON event of one turn. Only numbers and model ids are kept.
export function turnMeter() {
  const m = {
    responses: 0, errors: 0, unpriced: 0, hostUsd: 0, models: new Set(),
    tokens: { uncachedInput: 0, cachedInput: 0, cacheCreation: 0, output: 0 },
    provider: { http429: 0, retries: 0 }, unparsed: 0,
  };
  m.feed = (e) => {
    countProviderEvent(m.provider, e);
    if (e.type !== 'message_end' || e.message?.role !== 'assistant') return;
    const msg = e.message;
    m.responses++;
    if (msg.stopReason === 'error') m.errors++;
    m.finalError = msg.stopReason === 'error';
    if (msg.model) m.models.add(msg.model);
    const u = msg.usage ?? {};
    m.tokens.uncachedInput += u.input ?? 0;
    m.tokens.cachedInput += u.cacheRead ?? 0;
    m.tokens.cacheCreation += u.cacheWrite ?? 0;
    m.tokens.output += u.output ?? 0;
    if (Number.isFinite(u.cost?.total) && u.cost.total >= 0) m.hostUsd += u.cost.total;
    else m.unpriced++;
  };
  return m;
}

function killGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    try { child.kill(signal); } catch {}
  }
}

// Runs the trio: at most one turn per agent at a time, agents concurrent. A turn starts when an idle agent has an
// opening prompt due or queued messages. Ends when nobody runs and nothing waits, at the deadline, or below the
// disk floor. `stages` are opening prompts; a stage opens after every turn of the previous stage has ended.
export async function runTeam({
  command, agents, names, queue, stages, deadlineMs, argsFor, envFor, cwdFor, diskDir,
  pollMs = 200, diskEveryMs = 5000, now = () => Date.now(), floorBytes = pauseBytes,
}) {
  const start = now(), deadline = start + deadlineMs;
  const busy = new Map(), turns = [];
  let stage = 0, stageIds = [], timedOut = false, diskPaused = false, maxWorkers = 0, seq = 0;
  let minBytes = diskDir ? availableBytes(diskDir) : null, lastDisk = start;
  const begin = (agent, prompt) => {
    const id = `t${++seq}`;
    const meter = turnMeter();
    const child = spawn(command[0], [...command.slice(1), ...argsFor(agent, prompt)], {
      cwd: cwdFor(agent), env: envFor(agent), detached: true, stdio: ['ignore', 'pipe', 'ignore'],
    });
    const record = { id, agent, startedMs: now(), endedMs: null, exit: null, signal: null };
    const lines = createInterface({ input: child.stdout });
    lines.on('line', (line) => {
      if (!line.trim()) return;
      try { meter.feed(JSON.parse(line)); } catch { meter.unparsed++; }
    });
    const done = new Promise((resolve) => {
      let closed = false, exited = null;
      const finish = () => {
        if (!closed || !exited || record.endedMs) return;
        record.endedMs = now();
        [record.exit, record.signal] = exited;
        resolve();
      };
      lines.on('close', () => { closed = true; finish(); });
      child.on('error', () => { exited = [-1, null]; closed = true; finish(); });
      child.on('exit', (code, signal) => {
        exited = [code, signal];
        finish();
        // A grandchild holding stdout must not keep the turn open.
        setTimeout(() => { closed = true; finish(); }, 2000).unref();
      });
    });
    record.meter = meter;
    busy.set(agent, { child, done, record });
    turns.push(record);
    maxWorkers = Math.max(maxWorkers, busy.size);
    done.then(() => busy.delete(agent));
    return id;
  };
  const stopAll = async () => {
    for (const { child } of busy.values()) killGroup(child, 'SIGTERM');
    const grace = sleep(10000, undefined, { ref: false }).then(() => { for (const { child } of busy.values()) killGroup(child, 'SIGKILL'); });
    await Promise.race([Promise.all([...busy.values()].map((b) => b.done)), grace]);
    await Promise.all([...busy.values()].map((b) => b.done));
  };
  for (;;) {
    if (diskDir && now() - lastDisk >= diskEveryMs) {
      lastDisk = now();
      const free = availableBytes(diskDir);
      minBytes = Math.min(minBytes, free);
      if (free < floorBytes) { diskPaused = true; await stopAll(); break; }
    }
    if (now() >= deadline) { timedOut = true; await stopAll(); break; }
    const ended = (id) => turns.find((t) => t.id === id).endedMs;
    if (stage < stages.length && stageIds.every(ended) && stages[stage].every((s) => !busy.has(s.agent))) {
      stageIds = stages[stage].map((s) => begin(s.agent, s.prompt));
      stage++;
    }
    for (const agent of waiting(queue)) {
      if (busy.has(agent) || !agents.includes(agent)) continue;
      const id = `t${seq + 1}`;
      const messages = claim(queue, agent, id, now());
      if (messages.length) begin(agent, inbox(messages, names));
    }
    if (!busy.size && stage >= stages.length && !waiting(queue).some((a) => agents.includes(a))) break;
    await Promise.race([sleep(pollMs), ...[...busy.values()].map((b) => b.done)]);
  }
  if (diskDir) minBytes = Math.min(minBytes, availableBytes(diskDir));
  return { start, turns, timedOut, diskPaused, maxWorkers, minAvailableBytes: minBytes };
}

// Measurement of one attempt from its turns. Wall time is the union of turn intervals (study.mjs).
export function measureTurns(turns, start, agents) {
  const rows = turns.map((t) => ({
    started_at: new Date(t.startedMs).toISOString(),
    completed_at: t.endedMs ? new Date(t.endedMs).toISOString() : null,
  }));
  const tokens = { uncachedInput: 0, cachedInput: 0, cacheCreation: 0, output: 0 };
  const provider = { http429: 0, retries: 0 };
  const models = new Set();
  let responses = 0, errors = 0, unpriced = 0, hostUsd = 0;
  for (const t of turns) {
    for (const k of Object.keys(tokens)) tokens[k] += t.meter.tokens[k];
    for (const k of Object.keys(provider)) provider[k] += t.meter.provider[k];
    t.meter.models.forEach((m) => models.add(m));
    responses += t.meter.responses; errors += t.meter.errors; unpriced += t.meter.unpriced; hostUsd += t.meter.hostUsd;
  }
  const first = turns.map((t) => t.startedMs), last = turns.filter((t) => t.endedMs).map((t) => t.endedMs);
  return {
    turns: turns.length,
    turnsByRole: agents.map((a) => turns.filter((t) => t.agent === a).length),
    contributors: new Set(turns.filter((t) => t.meter.responses > 0).map((t) => t.agent)).size,
    failedTurns: turns.filter((t) => t.exit !== 0 || t.meter.finalError).length,
    responses, errorResponses: errors,
    models: [...models],
    tokens,
    tokenPriceUsd: pricedUsage(tokens),
    estimatedUsd: unpriced ? null : hostUsd,
    provider,
    observedWallSeconds: observedSeconds(rows),
    queueSeconds: first.length ? (Math.min(...first) - start) / 1000 : null,
    wallSeconds: last.length ? (Math.max(...last) - start) / 1000 : null,
    agentSeconds: turns.reduce((s, t) => s + (t.endedMs ? (t.endedMs - t.startedMs) / 1000 : 0), 0),
  };
}

export const readJsonl = (file) =>
  existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
export const sessionFiles = (dir) =>
  existsSync(dir) ? readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.jsonl')).length : 0;

const isCeiling = (e) => e.type === 'rule' && ['message_ceiling', 'session_ceiling'].includes(e.rule);

// Live smoke of the frozen 0.1 connector with the local bridge (prereg "Ativação e duração").
// events[i]: connector event log of agent i (lead first); marks: shared field; ids: agent ids in that order.
export function smokeVerdict({ events, marks, ids, remote, accepted, proofOk, comparable }) {
  const writers = new Set(marks.map((m) => m.by));
  const tools = events.flat().filter((e) => e.type === 'tool').map((e) => e.tool);
  const bridge = [...new Set(tools.filter((x) => /(?:^|[._])send_message$/.test(x)))];
  const crossRead = events.some((es, i) => {
    const own = marks.filter((m) => m.by === ids[i]).length;
    return es.some((e) => e.type === 'read_marks' && e.count > own);
  });
  const lead = events[0];
  const markBefore = lead.findIndex((e) => e.type === 'mark');
  const firstMessage = lead.findIndex((e) => e.type === 'message_sent');
  const refused = lead.findIndex(isCeiling);
  const after = refused < 0 ? [] : lead.slice(refused + 1);
  const continued =
    markBefore >= 0 && firstMessage > markBefore && refused > firstMessage &&
    after.some((e) => e.type === 'mark') && after.some((e) => e.type === 'read_marks') &&
    after.some((e) => e.type === 'tool' && e.tool === 'write') && proofOk;
  const identity = remote.length === ids.length && remote.every(Boolean);
  const pass =
    identity && continued && comparable && ids.every((id) => writers.has(id)) && crossRead &&
    bridge.length > 0 && events.flat().some((e) => e.type === 'message_sent') && accepted > 0;
  return { pass, identity, writers: writers.size, crossRead, bridge, continued };
}

export function manipulation(events, policies) {
  return events.map((log, i) => {
    const first = log.findIndex(isCeiling);
    return {
      policyId: policies[i] ?? null,
      messagesSent: log.filter((e) => e.type === 'message_sent').length,
      ceilingRefusals: log.filter(isCeiling).length,
      fieldWritesAfterCeiling: first < 0 ? 0 : log.slice(first + 1).filter((e) => e.type === 'mark').length,
    };
  });
}

// Conditions before the nine-attempt sample (prereg; owner's request): live smoke for this treatment, three A
// activations with median >= 1800 s, the blind reviewer calibrated 64/64 and the Research Leader's approval.
export function sampleGate({ treatment, smoke, activations, calibration, approval }) {
  const same = (r) => r && JSON.stringify(r.treatment) === JSON.stringify(treatment);
  const problems = [];
  if (!smoke?.pass || !same(smoke)) problems.push('smoke');
  const times = (activations ?? []).filter((a) => a?.comparable && same(a)).map((a) => a.metrics.observedWallSeconds);
  if (times.length !== 3) problems.push('activations');
  else if (times.sort((a, b) => a - b)[1] < 1800) problems.push('baseline_short');
  // results/phase1/JUDGE-CALIBRATION.json, the committed summary that bench/judge-batch.mjs also requires.
  if (
    calibration?.passed !== true || calibration.correctItems !== 64 || calibration.totalItems !== 64 ||
    calibration.validMemos !== 8
  )
    problems.push('reviewer_calibration');
  if (
    approval?.approved !== true || approval.reviewer !== 'Research Leader' || !approval.blindReviewerConfirmed ||
    approval.revision !== treatment.runnerRevision
  )
    problems.push('approval');
  return { ready: problems.length === 0, problems, medianSeconds: times.length === 3 ? times[1] : null };
}

// Control route. Mac: the loopback end of an SSH tunnel to BenchHost. BenchHost: the local route to the Control container,
// loopback or a Docker bridge address (172.16.0.0/12), never a public address. Plain http stays on the host.
export function controlRoute(raw, studyHost) {
  if (studyHost === 'benchhost' && !raw) throw Error('Set BIOSWARM_CONTROL_URL to the local Control route on BenchHost');
  const url = new URL(raw || 'http://127.0.0.1:18787');
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(url.hostname);
  const bridge = studyHost === 'benchhost' && m && Number(m[1]) === 172 && Number(m[2]) >= 16 && Number(m[2]) <= 31;
  if (url.protocol !== 'http:' || url.username || url.password || !(url.hostname === '127.0.0.1' || bridge))
    throw Error(studyHost === 'benchhost' ? 'Control must be loopback or the Docker bridge on BenchHost' : 'Control must be a loopback tunnel');
  return url;
}

// The only environment Pi gets: home, path, locale, offline startup and the operator's approved egress proxy.
// Everything else (keys, tokens, other settings) is left out; proxy values pass through unchanged.
export const proxyVars = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy'];
export function piBaseEnv(env, home) {
  const out = { HOME: home, PATH: env.PATH, LANG: 'C.UTF-8', PI_OFFLINE: '1' };
  for (const k of proxyVars) if (env[k]) out[k] = env[k];
  return out;
}
