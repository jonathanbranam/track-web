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

// Ordered parent-before-child for import; update when adding tables to migrate()
export const TABLE_NAMES = [
  'users',
  'tags',
  'movie_series',
  'groups',
  'movies',
  'tv_series',
  'time_entries',
  'user_invite_codes',
  'user_connections',
  'user_connection_requests',
  'group_members',
  'movie_tags',
  'movie_series_entries',
  'user_movies',
  'tv_series_tags',
  'user_tv_series',
  'watch_events',
  'watch_event_invites',
  'watch_event_candidates',
  'watch_event_votes',
  'watch_event_selection',
  'people',
  'movie_cast',
  'tv_cast',
] as const

type Migration = {
  id: string
  up: (db: Database.Database) => void
}

export const MIGRATIONS: Migration[] = [
  {
    id: '0001_initial_schema',
    up: (db) => {
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
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          name               TEXT    NOT NULL,
          created_by_user_id INTEGER NOT NULL REFERENCES users(id),
          created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS group_members (
          group_id  INTEGER NOT NULL REFERENCES groups(id),
          user_id   INTEGER NOT NULL REFERENCES users(id),
          joined_at TEXT    NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (group_id, user_id)
        );
      `)
    },
  },
  {
    id: '0002_time_entries_app_id',
    up: (db) => {
      const timeCols = db.prepare('PRAGMA table_info(time_entries)').all() as { name: string }[]
      if (!timeCols.some(c => c.name === 'app_id')) {
        db.exec(`ALTER TABLE time_entries ADD COLUMN app_id TEXT NOT NULL DEFAULT 'time'`)
      }
      db.exec(`UPDATE time_entries SET app_id = 'time' WHERE app_id = 'tracker'`)
    },
  },
  {
    id: '0003_users_display_name',
    up: (db) => {
      const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
      if (!userCols.some(c => c.name === 'display_name')) {
        db.exec(`ALTER TABLE users ADD COLUMN display_name TEXT`)
      }
    },
  },
  {
    id: '0004_groups_description',
    up: (db) => {
      const groupCols = db.prepare('PRAGMA table_info(groups)').all() as { name: string }[]
      if (!groupCols.some(c => c.name === 'description')) {
        db.exec(`ALTER TABLE groups ADD COLUMN description TEXT`)
      }
    },
  },
  {
    id: '0005_user_invite_codes_connections',
    up: (db) => {
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
    },
  },
  {
    id: '0006_tags',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          name     TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL CHECK(category IN ('genre','cuisine'))
        );
      `)
      db.exec(`
        INSERT OR IGNORE INTO tags (name, category) VALUES
          ('Action', 'genre'),
          ('Adventure', 'genre'),
          ('Animation', 'genre'),
          ('Anime', 'genre'),
          ('Biography', 'genre'),
          ('Comedy', 'genre'),
          ('Crime', 'genre'),
          ('Documentary', 'genre'),
          ('Drama', 'genre'),
          ('Fantasy', 'genre'),
          ('Historical', 'genre'),
          ('Horror', 'genre'),
          ('Musical', 'genre'),
          ('Mystery', 'genre'),
          ('Romance', 'genre'),
          ('Sci-Fi', 'genre'),
          ('Sport', 'genre'),
          ('Superhero', 'genre'),
          ('Thriller', 'genre'),
          ('Western', 'genre')
      `)
    },
  },
  {
    id: '0007_movies',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS movies (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          title            TEXT    NOT NULL,
          runtime_minutes  INTEGER,
          description      TEXT,
          streaming        TEXT,
          added_by_user_id INTEGER NOT NULL REFERENCES users(id),
          created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);

        CREATE TABLE IF NOT EXISTS movie_tags (
          movie_id INTEGER NOT NULL REFERENCES movies(id),
          tag_id   INTEGER NOT NULL REFERENCES tags(id),
          PRIMARY KEY (movie_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS movie_series (
          id   INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS movie_series_entries (
          series_id INTEGER NOT NULL REFERENCES movie_series(id),
          movie_id  INTEGER NOT NULL REFERENCES movies(id),
          position  INTEGER NOT NULL,
          PRIMARY KEY (series_id, movie_id)
        );

        CREATE TABLE IF NOT EXISTS user_movies (
          user_id  INTEGER NOT NULL REFERENCES users(id),
          movie_id INTEGER NOT NULL REFERENCES movies(id),
          state    TEXT    NOT NULL CHECK(state IN ('unseen','watched','would_watch_again')),
          rating   INTEGER CHECK(rating BETWEEN -2 AND 2),
          added_at TEXT    NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, movie_id)
        );
      `)
    },
  },
  {
    id: '0008_tv_series',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tv_series (
          id                      INTEGER PRIMARY KEY AUTOINCREMENT,
          title                   TEXT    NOT NULL,
          streaming               TEXT,
          episode_runtime_minutes INTEGER,
          added_by_user_id        INTEGER NOT NULL REFERENCES users(id),
          created_at              TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_tv_series_title ON tv_series(title);

        CREATE TABLE IF NOT EXISTS tv_series_tags (
          series_id INTEGER NOT NULL REFERENCES tv_series(id),
          tag_id    INTEGER NOT NULL REFERENCES tags(id),
          PRIMARY KEY (series_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS user_tv_series (
          user_id         INTEGER NOT NULL REFERENCES users(id),
          series_id       INTEGER NOT NULL REFERENCES tv_series(id),
          state           TEXT    NOT NULL CHECK(state IN ('unseen','watching','watched','would_watch_again')),
          rating          INTEGER CHECK(rating BETWEEN -2 AND 2),
          current_season  INTEGER,
          current_episode INTEGER,
          added_at        TEXT    NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, series_id)
        );
      `)
    },
  },
  {
    id: '0009_tv_series_description',
    up: (db) => {
      const tvCols = db.prepare('PRAGMA table_info(tv_series)').all() as { name: string }[]
      if (!tvCols.some(c => c.name === 'description')) {
        db.exec(`ALTER TABLE tv_series ADD COLUMN description TEXT`)
      }
    },
  },
  {
    id: '0010_tv_series_season_count',
    up: (db) => {
      const tvCols = db.prepare('PRAGMA table_info(tv_series)').all() as { name: string }[]
      if (!tvCols.some(c => c.name === 'season_count')) {
        db.exec(`ALTER TABLE tv_series ADD COLUMN season_count INTEGER`)
      }
    },
  },
  {
    id: '0011_watch_events_drop_type',
    up: (db) => {
      const watchCols = db.prepare('PRAGMA table_info(watch_events)').all() as { name: string }[]
      if (watchCols.some(c => c.name === 'type')) {
        db.exec(`
          BEGIN;
          CREATE TABLE watch_events_new (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            title              TEXT    NOT NULL,
            scheduled_date     TEXT    NOT NULL,
            created_by_user_id INTEGER NOT NULL REFERENCES users(id),
            created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
            completed_at       TEXT
          );
          INSERT INTO watch_events_new (id, title, scheduled_date, created_by_user_id, created_at, completed_at)
            SELECT id, title, scheduled_date, created_by_user_id, created_at, completed_at FROM watch_events;
          DROP TABLE watch_events;
          ALTER TABLE watch_events_new RENAME TO watch_events;
          COMMIT;
        `)
      }
    },
  },
  {
    id: '0013_movies_release_year',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(movies)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'release_year')) {
        db.exec(`ALTER TABLE movies ADD COLUMN release_year INTEGER`)
      }
    },
  },
  {
    id: '0014_tv_series_release_year',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(tv_series)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'release_year')) {
        db.exec(`ALTER TABLE tv_series ADD COLUMN release_year INTEGER`)
      }
    },
  },
  {
    id: '0015_movies_tmdb_id',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(movies)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'tmdb_id')) {
        db.exec(`ALTER TABLE movies ADD COLUMN tmdb_id INTEGER`)
      }
    },
  },
  {
    id: '0016_tv_series_tmdb_id',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(tv_series)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'tmdb_id')) {
        db.exec(`ALTER TABLE tv_series ADD COLUMN tmdb_id INTEGER`)
      }
    },
  },
  {
    id: '0017_people',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS people (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          name           TEXT    NOT NULL,
          tmdb_person_id INTEGER NOT NULL UNIQUE
        );
      `)
    },
  },
  {
    id: '0018_title_cast',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS movie_cast (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id     INTEGER NOT NULL REFERENCES people(id),
          title_id      INTEGER NOT NULL REFERENCES movies(id),
          role          TEXT    NOT NULL CHECK(role IN ('cast','director')),
          billing_order INTEGER NOT NULL,
          UNIQUE (title_id, person_id)
        );

        CREATE TABLE IF NOT EXISTS tv_cast (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id     INTEGER NOT NULL REFERENCES people(id),
          title_id      INTEGER NOT NULL REFERENCES tv_series(id),
          role          TEXT    NOT NULL CHECK(role IN ('cast','director')),
          billing_order INTEGER NOT NULL,
          UNIQUE (title_id, person_id)
        );
      `)
    },
  },
  {
    id: '0012_watch_events',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS watch_events (
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          title              TEXT    NOT NULL,
          scheduled_date     TEXT    NOT NULL,
          created_by_user_id INTEGER NOT NULL REFERENCES users(id),
          created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
          completed_at       TEXT
        );

        CREATE TABLE IF NOT EXISTS watch_event_invites (
          event_id   INTEGER NOT NULL REFERENCES watch_events(id),
          user_id    INTEGER NOT NULL REFERENCES users(id),
          attendance TEXT    CHECK(attendance IN ('yes','no','maybe')),
          PRIMARY KEY (event_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS watch_event_candidates (
          id                   INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id             INTEGER NOT NULL REFERENCES watch_events(id),
          item_type            TEXT    NOT NULL CHECK(item_type IN ('movie','tv')),
          movie_id             INTEGER REFERENCES movies(id),
          series_id            INTEGER REFERENCES tv_series(id),
          suggested_by_user_id INTEGER NOT NULL REFERENCES users(id),
          suggested_at         TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_event_candidates_movie ON watch_event_candidates(event_id, movie_id)
          WHERE movie_id IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_event_candidates_tv ON watch_event_candidates(event_id, series_id)
          WHERE series_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS watch_event_votes (
          event_id     INTEGER NOT NULL REFERENCES watch_events(id),
          candidate_id INTEGER NOT NULL REFERENCES watch_event_candidates(id),
          user_id      INTEGER NOT NULL REFERENCES users(id),
          vote         INTEGER NOT NULL CHECK(vote BETWEEN -2 AND 2),
          PRIMARY KEY (event_id, candidate_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS watch_event_selection (
          event_id     INTEGER PRIMARY KEY REFERENCES watch_events(id),
          candidate_id INTEGER NOT NULL REFERENCES watch_event_candidates(id),
          episode_mode TEXT    CHECK(episode_mode IN ('latest','specific')),
          season_from  INTEGER,
          episode_from INTEGER,
          season_to    INTEGER,
          episode_to   INTEGER
        );
      `)
    },
  },
]

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    (db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map(r => r.id)
  )
  const record = db.prepare('INSERT INTO schema_migrations (id) VALUES (?)')

  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.id)) {
      migration.up(db)
      record.run(migration.id)
    }
  }
}

export function migrate(db: Database.Database): void {
  runMigrations(db)
}

export function getLatestMigration(db: Database.Database): string | null {
  try {
    const row = db
      .prepare('SELECT id FROM schema_migrations ORDER BY id DESC LIMIT 1')
      .get() as { id: string } | undefined
    return row?.id ?? null
  } catch {
    return null
  }
}
