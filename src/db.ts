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

export function setDb(db: Database.Database | null): void {
  _db = db
}

export function migrate(db: Database.Database): void {
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

  // Additive migrations: new columns on existing tables
  const timeCols = db.prepare('PRAGMA table_info(time_entries)').all() as { name: string }[]
  if (!timeCols.some(c => c.name === 'app_id')) {
    db.exec(`ALTER TABLE time_entries ADD COLUMN app_id TEXT NOT NULL DEFAULT 'time'`)
  }
  db.exec(`UPDATE time_entries SET app_id = 'time' WHERE app_id = 'tracker'`)

  const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  if (!userCols.some(c => c.name === 'display_name')) {
    db.exec(`ALTER TABLE users ADD COLUMN display_name TEXT`)
  }

  const groupCols = db.prepare('PRAGMA table_info(groups)').all() as { name: string }[]
  if (!groupCols.some(c => c.name === 'description')) {
    db.exec(`ALTER TABLE groups ADD COLUMN description TEXT`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_invite_codes (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      code               TEXT    NOT NULL UNIQUE,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id),
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at         TEXT    NOT NULL,
      used_by_user_id    INTEGER REFERENCES users(id),
      used_at            TEXT
    );

    CREATE TABLE IF NOT EXISTS user_connections (
      user_id_a    INTEGER NOT NULL REFERENCES users(id),
      user_id_b    INTEGER NOT NULL REFERENCES users(id),
      connected_at TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id_a, user_id_b),
      CHECK (user_id_a < user_id_b)
    );

    CREATE TABLE IF NOT EXISTS user_connection_requests (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id   INTEGER NOT NULL REFERENCES users(id),
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at   TEXT    NOT NULL,
      responded_at TEXT,
      status       TEXT    NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','accepted','declined')),
      CHECK(from_user_id != to_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_connections_a ON user_connections(user_id_a);
    CREATE INDEX IF NOT EXISTS idx_connections_b ON user_connections(user_id_b);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON user_invite_codes(code);
    CREATE INDEX IF NOT EXISTS idx_conn_requests_to ON user_connection_requests(to_user_id, status);
  `)
}
