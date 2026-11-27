// Adapted from unfold-research/research, experiments/openbot-unfold-mode/study/run.mjs
// at 9e24bfc746046bea87d6e16d916a0b0fea34c27f. Never select conversations or tool payloads.
import { observedSeconds, pricedUsage } from './study.mjs';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const hostDir = '/data/.config/OpenBot';
export async function api(method, path, body) {
  const dir = join(hostDir, 'automation');
  const url = new URL(readFileSync(join(dir, 'url'), 'utf8').trim());
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1')
    throw Error('Expected loopback Local scripts listener');
  const token = readFileSync(join(dir, 'token'), 'utf8').trim();
  const res = await fetch(new URL(path, url), {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (!res.ok)
    throw Error('Local scripts ' + method + ' ' + path.split('/').at(-1) + ' returned ' + res.status);
  return res.json();
}

export function measure(ids, since) {
  const db = new DatabaseSync(join(hostDir, 'openbot.db'), { readOnly: true });
  try {
    db.exec('BEGIN');
    const q = ids.map(() => '?').join(','),
      threads = ids.map((id) => 'openbot-thread-' + id);
    const turns = db
      .prepare(
        `SELECT started_at,completed_at FROM projection_turns WHERE thread_id IN (${q}) AND started_at >= ?`,
      )
      .all(...threads, since);
    const pending = db
      .prepare(
        `SELECT count(*) n FROM projection_deliveries WHERE recipient_agent_id IN (${q}) AND status IN ('queued','starting','running')`,
      )
      .get(...ids).n;
    const messages = db
      .prepare(
        `SELECT count(*) n FROM projection_mailbox_messages WHERE sender_kind='agent' AND sender_agent_id IN (${q}) AND created_at>=?`,
      )
      .get(...ids, since).n;
    const usage = db
      .prepare(
        `SELECT agent_id,provider,model,tokens_json,estimated_cost_usd FROM agent_usage_records WHERE agent_id IN (${q}) AND occurred_at>=?`,
      )
      .all(...ids, since);
    const tokens = { uncachedInput: 0, cachedInput: 0, cacheCreation: 0, output: 0 };
    let cost = 0,
      priced = usage.length > 0;
    for (const row of usage) {
      const counts = JSON.parse(row.tokens_json);
      for (const k of Object.keys(tokens)) tokens[k] += counts[k] ?? 0;
      if (row.estimated_cost_usd == null) priced = false;
      else cost += row.estimated_cost_usd;
    }
    const first = turns.map((t) => Date.parse(t.started_at)),
      last = turns.filter((t) => t.completed_at).map((t) => Date.parse(t.completed_at));
    return {
      busy: pending + turns.filter((t) => !t.completed_at).length,
      turns: turns.length,
      contributors: new Set(usage.map((r) => r.agent_id)).size,
      models: [...new Set(usage.map((r) => r.model))],
      providers: [...new Set(usage.map((r) => r.provider))],
      usageRecords: usage.length,
      tokens,
      tokenPriceUsd: pricedUsage(tokens),
      observedWallSeconds: observedSeconds(turns),
      estimatedUsd: priced ? cost : null,
      agentMessages: messages,
      queueSeconds: first.length ? (Math.min(...first) - Date.parse(since)) / 1000 : null,
      wallSeconds: last.length ? (Math.max(...last) - Date.parse(since)) / 1000 : null,
      agentSeconds: turns.reduce(
        (s, t) => s + (t.completed_at ? (Date.parse(t.completed_at) - Date.parse(t.started_at)) / 1000 : 0),
        0,
      ),
    };
  } finally {
    db.close();
  }
}

export async function waitTeam(ids, deliveries, since, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let idleSince = 0;
  while (Date.now() < deadline) {
    const statuses = await Promise.all(
      deliveries.map(
        async ({ agent, id }) => (await api('GET', '/v1/agents/' + agent + '/deliveries/' + id)).status,
      ),
    );
    const metrics = measure(ids, since);
    if (
      !metrics.busy &&
      statuses.every((s) => ['completed', 'failed', 'cancelled', 'interrupted'].includes(s))
    ) {
      idleSince ||= Date.now();
      if (Date.now() - idleSince >= 30000) return { statuses, metrics, timedOut: false };
    } else idleSince = 0;
    await sleep(5000);
  }
  return { metrics: measure(ids, since), statuses: [], timedOut: true };
}
