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
  `)
}
