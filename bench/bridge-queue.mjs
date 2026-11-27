// Durable local mailbox for the direct Pi host. One SQLite file per attempt, private to the operator.
// Message bodies live only here, so the recipient can read them; telemetry reads counts, never bodies.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

function open(file) {
  // busy_timeout first: every later statement, pragmas included, then waits for a concurrent writer.
  const db = new DatabaseSync(file);
  db.exec('PRAGMA busy_timeout=10000; PRAGMA synchronous=FULL');
  return db;
}

export function initializeQueue(file) {
  const db = open(file);
  try {
    db.exec('PRAGMA journal_mode=WAL');
    db.exec(`CREATE TABLE messages(seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
      sender TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, queued_at INTEGER NOT NULL,
      turn TEXT, delivered_at INTEGER);
      CREATE TABLE refusals(seq INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT NOT NULL, reason TEXT NOT NULL,
      at INTEGER NOT NULL);`);
  } finally {
    db.close();
  }
}

// Returns once the row is committed with synchronous=FULL, so an accepted call survives a runner crash.
export function enqueue(file, { sender, recipient, body, now = Date.now() }) {
  const db = open(file);
  try {
    const id = randomUUID();
    db.prepare('INSERT INTO messages(id,sender,recipient,body,queued_at) VALUES (?,?,?,?,?)').run(
      id,
      sender,
      recipient,
      body,
      now,
    );
    return id;
  } finally {
    db.close();
  }
}

export function refuse(file, { sender, reason, now = Date.now() }) {
  const db = open(file);
  try {
    db.prepare('INSERT INTO refusals(sender,reason,at) VALUES (?,?,?)').run(sender, reason, now);
  } finally {
    db.close();
  }
}

// Atomically hand every waiting message of one recipient to a new turn, in queue order.
export function claim(file, recipient, turn, now = Date.now()) {
  const db = open(file);
  try {
    db.exec('BEGIN IMMEDIATE');
    const rows = db
      .prepare('SELECT seq,sender,body FROM messages WHERE recipient=? AND turn IS NULL ORDER BY seq')
      .all(recipient);
    if (rows.length)
      db.prepare('UPDATE messages SET turn=?, delivered_at=? WHERE recipient=? AND turn IS NULL AND seq<=?').run(
        turn,
        now,
        recipient,
        rows.at(-1).seq,
      );
    db.exec('COMMIT');
    return rows.map(({ sender, body }) => ({ sender, body }));
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

export function waiting(file) {
  const db = open(file);
  try {
    return db
      .prepare('SELECT recipient, count(*) AS n FROM messages WHERE turn IS NULL GROUP BY recipient')
      .all()
      .map((r) => r.recipient);
  } finally {
    db.close();
  }
}

// Counts only: what the study may keep.
export function queueCounts(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    db.exec('PRAGMA busy_timeout=10000');
    const accepted = db.prepare('SELECT sender, count(*) AS n FROM messages GROUP BY sender').all();
    const refused = db.prepare('SELECT sender, reason, count(*) AS n FROM refusals GROUP BY sender, reason').all();
    const undelivered = db.prepare('SELECT count(*) AS n FROM messages WHERE turn IS NULL').get().n;
    const latency = db
      .prepare('SELECT max(delivered_at-queued_at) AS maxMs FROM messages WHERE turn IS NOT NULL')
      .get().maxMs;
    return {
      accepted: Object.fromEntries(accepted.map((r) => [r.sender, r.n])),
      refused: refused.map((r) => ({ sender: r.sender, reason: r.reason, n: r.n })),
      undelivered,
      maxDeliveryWaitMs: latency ?? null,
    };
  } finally {
    db.close();
  }
}
