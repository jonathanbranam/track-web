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
  'trips',
  'trip_members',
  'trip_days',
  'packing_items',
  'packing_state',
  'api_tokens',
  'sessions',
  'game_scores',
  'game_rooms',
  'game_room_players',
  'invites',
  'game_dt_variants',
  'game_dt_unit_defs',
  'game_dt_regions',
  'game_dt_maps',
  'game_dt_encounters',
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
    id: '0019_trips',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS trips (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id          INTEGER NOT NULL REFERENCES users(id),
          name             TEXT    NOT NULL,
          destination      TEXT,
          departure_notes  TEXT,
          return_notes     TEXT,
          nights           INTEGER,
          full_days        INTEGER,
          is_current       INTEGER NOT NULL DEFAULT 0,
          created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
        )
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
  {
    id: '0020_trip_dates_and_info',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(trips)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'start_date')) {
        db.exec(`ALTER TABLE trips ADD COLUMN start_date TEXT`)
      }
      if (!cols.some(c => c.name === 'end_date')) {
        db.exec(`ALTER TABLE trips ADD COLUMN end_date TEXT`)
      }
      if (!cols.some(c => c.name === 'info_markdown')) {
        db.exec(`ALTER TABLE trips ADD COLUMN info_markdown TEXT`)
      }
    },
  },
  {
    id: '0021_trip_members',
    up: (db) => {
      db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS trip_members (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id   INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            user_id   INTEGER NOT NULL REFERENCES users(id),
            role      TEXT    NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'member')),
            joined_at TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE (trip_id, user_id)
          )
        `)
        db.exec(`
          INSERT OR IGNORE INTO trip_members (trip_id, user_id, role, joined_at)
          SELECT id, user_id, 'owner', created_at FROM trips
        `)
      })()
    },
  },
  {
    id: '0022_trip_days',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS trip_days (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          date    TEXT    NOT NULL,
          title   TEXT    NOT NULL DEFAULT '',
          body    TEXT    NOT NULL DEFAULT '',
          weather TEXT,
          UNIQUE (trip_id, date)
        )
      `)
    },
  },
  {
    id: '0023_packing_items',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS packing_items (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id  INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          section  TEXT    NOT NULL DEFAULT '',
          text     TEXT    NOT NULL,
          position INTEGER NOT NULL DEFAULT 0
        )
      `)
    },
  },
  {
    id: '0024_packing_state',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS packing_state (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          packing_item_id  INTEGER NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE,
          user_id          INTEGER NOT NULL,
          checked          INTEGER NOT NULL DEFAULT 0,
          UNIQUE (packing_item_id, user_id)
        )
      `)
    },
  },
  {
    id: '0025_packing_items_user_id',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(packing_items)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'user_id')) {
        db.exec(`ALTER TABLE packing_items ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`)
      }
    },
  },
  {
    id: '0026_putt_tracker',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS putt_rounds (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id    INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
          name       TEXT    NOT NULL DEFAULT '',
          created_by INTEGER NOT NULL REFERENCES users(id),
          created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS putt_scores (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          round_id INTEGER NOT NULL REFERENCES putt_rounds(id) ON DELETE CASCADE,
          user_id  INTEGER NOT NULL REFERENCES users(id),
          hole     INTEGER NOT NULL CHECK(hole >= 1 AND hole <= 18),
          strokes  INTEGER NOT NULL CHECK(strokes >= 1),
          UNIQUE (round_id, user_id, hole)
        );
      `)
    },
  },
  {
    id: '0019_api_tokens',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS api_tokens (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL REFERENCES users(id),
          token_hash TEXT    NOT NULL UNIQUE,
          label      TEXT    NOT NULL,
          expires_at TEXT    NOT NULL,
          created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
      `)
    },
  },
  {
    id: '0028_session_nonce',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'session_nonce')) {
        // ALTER TABLE cannot use non-constant defaults; add nullable, then fill existing rows.
        db.exec(`ALTER TABLE users ADD COLUMN session_nonce TEXT`)
        db.exec(`UPDATE users SET session_nonce = lower(hex(randomblob(16))) WHERE session_nonce IS NULL`)
      }
    },
  },
  {
    id: '0029_game_rooms',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS game_rooms (
          id                    INTEGER PRIMARY KEY AUTOINCREMENT,
          room_code             TEXT    NOT NULL UNIQUE,
          game_slug             TEXT    NOT NULL,
          name                  TEXT    NOT NULL DEFAULT '',
          host_user_id          INTEGER NOT NULL REFERENCES users(id),
          status                TEXT    NOT NULL DEFAULT 'waiting'
                                CHECK(status IN ('waiting','active','finished','canceled')),
          desired_players       INTEGER NOT NULL,
          current_turn_user_id  INTEGER REFERENCES users(id),
          custom_details        TEXT,
          started_at            TEXT,
          created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_game_rooms_slug_status
          ON game_rooms(game_slug, status);
      `)
    },
  },
  {
    id: '0030_game_room_players',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS game_room_players (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id    INTEGER NOT NULL REFERENCES game_rooms(id),
          user_id    INTEGER NOT NULL REFERENCES users(id),
          join_order INTEGER NOT NULL,
          joined_at  TEXT    NOT NULL DEFAULT (datetime('now')),
          UNIQUE(room_id, user_id)
        );
      `)
    },
  },
  {
    id: '0031_invites',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS invites (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          token      TEXT    NOT NULL UNIQUE,
          email      TEXT    NOT NULL,
          expires_at TEXT    NOT NULL,
          used_at    TEXT,
          created_by INTEGER NOT NULL REFERENCES users(id),
          created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
        CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
      `)
    },
  },
  {
    id: '0027_game_scores',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS game_scores (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id     INTEGER NOT NULL REFERENCES users(id),
          game_slug   TEXT    NOT NULL,
          mode        TEXT    NOT NULL,
          level       TEXT    NOT NULL,
          score       INTEGER NOT NULL,
          achieved_at TEXT    NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard
          ON game_scores(game_slug, mode, level, score DESC);
      `)
    },
  },
  {
    id: '0032_game_scenarios',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS game_scenarios (
          game_slug   TEXT    NOT NULL,
          scenario_id TEXT    NOT NULL,
          name        TEXT    NOT NULL,
          is_default  INTEGER NOT NULL DEFAULT 0,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (game_slug, scenario_id)
        );

        CREATE INDEX IF NOT EXISTS idx_game_scenarios_default
          ON game_scenarios(game_slug, is_default);
      `)
    },
  },
  {
    id: '0033_game_unit_defs',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS game_unit_defs (
          game_slug   TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          archetype   TEXT NOT NULL,
          def_json    TEXT NOT NULL,
          updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (game_slug, scenario_id, archetype)
        );
      `)
    },
  },
  {
    // Rename the DT unit-def tables to the `game_dt_` prefix and drop the
    // redundant `game_slug` column. Because `game_slug` is part of both tables'
    // primary keys, SQLite cannot ALTER TABLE … DROP COLUMN it — so we rebuild:
    // create the new tables, copy rows (discarding the constant game_slug and
    // mapping scenario_id → variant_id), recreate the default index, then drop
    // the old tables. All in one transaction, guarded by this migration's id.
    id: '0034_dt_variant_tables_rename',
    up: (db) => {
      db.transaction(() => {
        db.exec(`
          CREATE TABLE game_dt_variants (
            variant_id TEXT    NOT NULL PRIMARY KEY,
            name       TEXT    NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
          );

          INSERT INTO game_dt_variants (variant_id, name, is_default, created_at, updated_at)
            SELECT scenario_id, name, is_default, created_at, updated_at FROM game_scenarios;

          CREATE TABLE game_dt_unit_defs (
            variant_id TEXT NOT NULL,
            archetype  TEXT NOT NULL,
            def_json   TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (variant_id, archetype)
          );

          INSERT INTO game_dt_unit_defs (variant_id, archetype, def_json, updated_at)
            SELECT scenario_id, archetype, def_json, updated_at FROM game_unit_defs;

          CREATE INDEX idx_game_dt_variants_default ON game_dt_variants(is_default);

          DROP TABLE game_unit_defs;
          DROP TABLE game_scenarios;
        `)
      })()
    },
  },
  {
    // Dungeon Tactics serialized board content: Region → Map → Encounter.
    // Identity/ordering live as real columns for listing/joins; the shaped
    // payload (terrain grid, objects, zones, wave manifest) is a single
    // Zod-validated `def_json` blob, mirroring game_dt_unit_defs. No game_slug —
    // every DT table is single-game.
    id: '0035_dt_content_tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS game_dt_regions (
          region_id  TEXT    NOT NULL PRIMARY KEY,
          name       TEXT    NOT NULL,
          theme      TEXT    NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          def_json   TEXT    NOT NULL,
          created_at TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS game_dt_maps (
          region_id  TEXT    NOT NULL,
          map_id     TEXT    NOT NULL,
          name       TEXT    NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          def_json   TEXT    NOT NULL,
          created_at TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (region_id, map_id)
        );

        CREATE TABLE IF NOT EXISTS game_dt_encounters (
          map_id       TEXT    NOT NULL,
          encounter_id TEXT    NOT NULL,
          name         TEXT    NOT NULL,
          sort_order   INTEGER NOT NULL DEFAULT 0,
          def_json     TEXT    NOT NULL,
          created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (map_id, encounter_id)
        );

        CREATE INDEX IF NOT EXISTS idx_game_dt_maps_region
          ON game_dt_maps(region_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_game_dt_encounters_map
          ON game_dt_encounters(map_id, sort_order);
      `)
    },
  },
  {
    id: '0036_trip_research_markdown',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(trips)').all() as { name: string }[]
      if (!cols.some(c => c.name === 'research_markdown')) {
        db.exec(`ALTER TABLE trips ADD COLUMN research_markdown TEXT`)
      }
    },
  },
  {
    // Server-side session allowlist, mirroring api_tokens (0019). The cookie
    // carries an opaque token; we store only its sha256 hash. Replaces the
    // per-user users.session_nonce model (the column is left in place for one
    // release; a later migration drops it).
    id: '0037_sessions',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL REFERENCES users(id),
          token_hash TEXT    NOT NULL UNIQUE,
          created_at TEXT    NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT    NOT NULL,
          user_agent TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
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
