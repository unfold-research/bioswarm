import { DatabaseSync } from 'node:sqlite';
export function initializeBudget(file) {
  const db = new DatabaseSync(file);
  try {
    db.exec(
      'CREATE TABLE usage(agent TEXT PRIMARY KEY, starts INTEGER DEFAULT 0, cost REAL DEFAULT 0, stops INTEGER DEFAULT 0, unpriced INTEGER DEFAULT 0)',
    );
  } finally {
    db.close();
  }
}
export function budgetResult(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db
      .prepare(
        'SELECT count(*) AS agents, sum(starts) AS starts, sum(cost) AS cost, sum(stops) AS stops, sum(unpriced) AS unpriced FROM usage',
      )
      .get();
  } finally {
    db.close();
  }
}
