// 1b-r study ceiling inside an attempt (PREREG 1b-r: "limitar nova despesa ao saldo restante, registrar eventual
// excedente de chamadas já em voo"). The per-turn (US$ 3) and per-attempt (US$ 9) brakes of pi-budget stay as they are;
// this extension adds a third, lower ceiling: the study balance left when the attempt starts, in the fixed-table
// equivalent of bench/study.mjs (the same weightedUsd the brake and the report use).
//  - Every assistant response adds its fixed-table cost to a shared ledger table; a response without token counts is
//    recorded as unknown, never as zero.
//  - Once the attempt's total reaches the ceiling, or any cost is unknown, every further tool call is blocked and the
//    turn ends, so no new model call follows. The runner starts no new wave either.
//  - A response already in flight when the ceiling is crossed is still counted: the excess is recorded, not hidden.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pricedUsage } from '../study.mjs';

export const markerName = '.phase1b-study-cap';

export function weightedOf(usage) {
  const t = [usage?.input, usage?.cacheRead, usage?.cacheWrite, usage?.output];
  if (!t.every((n) => Number.isFinite(n) && n >= 0)) return null;
  return pricedUsage({ uncachedInput: t[0], cachedInput: t[1], cacheCreation: t[2], output: t[3] });
}

export function initializeStudyCap(ledger) {
  const db = new DatabaseSync(ledger);
  try {
    db.exec('CREATE TABLE IF NOT EXISTS study(agent TEXT PRIMARY KEY, weighted REAL DEFAULT 0, unknown INTEGER DEFAULT 0, stops INTEGER DEFAULT 0)');
  } finally {
    db.close();
  }
}

export function studyCapResult(ledger) {
  const db = new DatabaseSync(ledger, { readOnly: true });
  try {
    const r = db.prepare('SELECT coalesce(sum(weighted),0) AS weighted, coalesce(sum(unknown),0) AS unknown, coalesce(sum(stops),0) AS stops FROM study').get();
    return { weightedUsd: r.weighted, unknown: r.unknown, stops: r.stops };
  } finally {
    db.close();
  }
}

export function installStudyCap(pi, cwd) {
  const marker = join(cwd, markerName);
  if (!existsSync(marker)) return;
  const { ledger, capUsd } = JSON.parse(readFileSync(marker, 'utf8'));
  if (!Number.isFinite(capUsd)) throw Error('Study cap marker without a finite ceiling');
  const agent = basename(cwd);
  let db;
  const open = () => {
    if (!db) {
      db = new DatabaseSync(ledger);
      db.exec('PRAGMA busy_timeout=5000');
      db.prepare('INSERT INTO study(agent) VALUES (?) ON CONFLICT(agent) DO NOTHING').run(agent);
    }
    return db;
  };
  pi.on('message_end', (event) => {
    if (event.message?.role !== 'assistant') return;
    const usd = weightedOf(event.message.usage);
    if (usd === null) open().prepare('UPDATE study SET unknown=unknown+1 WHERE agent=?').run(agent);
    else open().prepare('UPDATE study SET weighted=weighted+? WHERE agent=?').run(usd, agent);
  });
  pi.on('tool_call', () => {
    const total = open().prepare('SELECT sum(weighted) AS weighted, sum(unknown) AS unknown FROM study').get();
    if (total.weighted >= capUsd || total.unknown > 0) {
      db.prepare('UPDATE study SET stops=stops+1 WHERE agent=?').run(agent);
      return { block: true, terminate: true, reason: 'The study spending limit was reached or usage could not be priced. Finish with the work available.' };
    }
  });
  pi.on('session_shutdown', () => {
    db?.close();
    db = undefined;
  });
}
