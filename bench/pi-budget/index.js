// Common instrumentation for the study. It registers no coordination tools.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const perTurnUsd = 3;
export const teamUsd = 9;

export function installBudget(pi, cwd = process.cwd()) {
  const marker = join(cwd, '.phase1-budget');
  if (!existsSync(marker)) return;
  const { ledger } = JSON.parse(readFileSync(marker, 'utf8'));
  const agent = basename(cwd);
  let turnCost = 0;
  let db;
  pi.on('agent_start', () => {
    turnCost = 0;
    db ??= new DatabaseSync(ledger);
    db.exec('PRAGMA busy_timeout=5000');
    db.prepare(
      'INSERT INTO usage(agent,starts) VALUES (?,1) ON CONFLICT(agent) DO UPDATE SET starts=starts+1',
    ).run(agent);
  });
  pi.on('message_end', (event) => {
    if (event.message?.role !== 'assistant') return;
    const cost = event.message.usage?.cost?.total;
    if (!Number.isFinite(cost) || cost < 0) {
      db.prepare('UPDATE usage SET unpriced=unpriced+1 WHERE agent=?').run(agent);
      return;
    }
    turnCost += cost;
    db.prepare('UPDATE usage SET cost=cost+? WHERE agent=?').run(cost, agent);
  });
  pi.on('tool_call', () => {
    const total = db.prepare('SELECT sum(cost) AS cost, sum(unpriced) AS unpriced FROM usage').get();
    if (turnCost > perTurnUsd || total.cost > teamUsd || total.unpriced > 0) {
      db.prepare('UPDATE usage SET stops=stops+1 WHERE agent=?').run(agent);
      return {
        block: true,
        terminate: true,
        reason:
          'The study spending limit was reached or usage could not be priced. Finish with the work available.',
      };
    }
  });
  pi.on('session_shutdown', () => {
    db?.close();
    db = undefined;
  });
}
export default installBudget;
