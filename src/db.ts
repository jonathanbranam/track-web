import Database from 'better-sqlite3'
import { env } from './env'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(env.SQLITE_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    migrate(_db)
  }
  return _db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      description TEXT    NOT NULL,
      tags        TEXT    NOT NULL DEFAULT '',
      started_at  TEXT    NOT NULL,
      ended_at    TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_time_entries_user_started
      ON time_entries(user_id, started_at);

    CREATE INDEX IF NOT EXISTS idx_time_entries_running
      ON time_entries(user_id, ended_at)
      WHERE ended_at IS NULL;

    CREATE TABLE IF NOT EXISTS groups (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT    NOT NULL,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id  INTEGER NOT NULL REFERENCES groups(id),
      user_id   INTEGER NOT NULL REFERENCES users(id),
      joined_at TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, user_id)
    );
  `)

  // Add app_id to time_entries if not yet present (additive migration)
  const cols = db.prepare('PRAGMA table_info(time_entries)').all() as { name: string }[]
  if (!cols.some(c => c.name === 'app_id')) {
    db.exec(`ALTER TABLE time_entries ADD COLUMN app_id TEXT NOT NULL DEFAULT 'tracker'`)
  }
}
