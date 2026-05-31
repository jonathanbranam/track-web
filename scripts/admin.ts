import 'dotenv/config'
import { randomUUID, randomBytes, createHash } from 'crypto'
import bcrypt from 'bcrypt'
import { Command } from 'commander'
import { getDb } from '../src/db'
import { env } from '../src/env'
import { getCacheKey, readQueryCache, writeQueryCache, upsertTitleCache, loadTitleCache, applyGenreMap, extractReleaseYear, normalizeTitle, sortPersonCredits, getPersonSortMode } from '../src/utils/tmdb'

function normalizeIds(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const program = new Command()
const db = getDb()

// users:list
program
  .command('users:list')
  .description('List all users')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const rows = db.prepare('SELECT id, email, display_name, created_at FROM users ORDER BY id').all() as {
      id: number; email: string; display_name: string | null; created_at: string
    }[]
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// users:create
program
  .command('users:create')
  .description('Create a new user')
  .argument('<email>', 'User email')
  .argument('<password>', 'User password (plaintext, or bcrypt hash when --hashed is set)')
  .option('--name <displayName>', 'Display name')
  .option('--hashed', 'Treat <password> as an already-hashed bcrypt value; skip hashing')
  .action((email, password, opts) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      console.error(`Error: user with email "${email}" already exists`)
      process.exit(1)
    }
    const passwordHash = opts.hashed ? password : bcrypt.hashSync(password, 12)
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)').run(
      email, passwordHash, opts.name ?? null
    )
    console.log(`User created: ${email}${opts.name ? ` (${opts.name})` : ''}`)
  })

// users:delete
program
  .command('users:delete')
  .description('Delete a user and all their data')
  .argument('<email>', 'User email')
  .action((email) => {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined
    if (!user) {
      console.error(`Error: no user found with email "${email}"`)
      process.exit(1)
    }
    const userId = user.id
    db.transaction(() => {
      db.prepare('DELETE FROM time_entries WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM user_connections WHERE user_id_a = ? OR user_id_b = ?').run(userId, userId)
      db.prepare('DELETE FROM user_connection_requests WHERE from_user_id = ? OR to_user_id = ?').run(userId, userId)
      db.prepare('DELETE FROM user_invite_codes WHERE created_by_user_id = ?').run(userId)
      db.prepare('DELETE FROM group_members WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM user_movies WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM user_tv_series WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM watch_event_invites WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM watch_event_votes WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    })()
    console.log(`Deleted user: ${email} (id=${userId})`)
  })

// users:update-password
program
  .command('users:update-password')
  .description('Update a user password')
  .argument('<email>', 'User email')
  .argument('<password>', 'New password (plaintext, or bcrypt hash when --hashed is set)')
  .option('--hashed', 'Treat <password> as an already-hashed bcrypt value; skip hashing')
  .action((email, password, opts) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (!existing) {
      console.error(`Error: no user found with email "${email}"`)
      process.exit(1)
    }
    const passwordHash = opts.hashed ? password : bcrypt.hashSync(password, 12)
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email)
    console.log(`Password updated: ${email}`)
  })

// users:set-name
program
  .command('users:set-name')
  .description('Set display name for a user')
  .argument('<userId>', 'User ID', (v) => parseInt(v, 10))
  .argument('<name>', 'Display name')
  .action((userId, name) => {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(name, userId)
    console.log(`Updated display name for user ${userId} to "${name}"`)
  })

// connections:create
program
  .command('connections:create')
  .description('Create a connection between two users')
  .argument('<userIdA>', 'User ID A', (v) => parseInt(v, 10))
  .argument('<userIdB>', 'User ID B', (v) => parseInt(v, 10))
  .action((a, b) => {
    const [minId, maxId] = normalizeIds(a, b)
    const existing = db.prepare(
      'SELECT 1 FROM user_connections WHERE user_id_a = ? AND user_id_b = ?'
    ).get(minId, maxId)
    if (existing) {
      console.log(`Connection between ${a} and ${b} already exists`)
    } else {
      db.prepare('INSERT INTO user_connections (user_id_a, user_id_b) VALUES (?, ?)').run(minId, maxId)
      console.log(`Connection created between users ${a} and ${b}`)
    }
  })

// connections:delete
program
  .command('connections:delete')
  .description('Delete a connection between two users')
  .argument('<userIdA>', 'User ID A', (v) => parseInt(v, 10))
  .argument('<userIdB>', 'User ID B', (v) => parseInt(v, 10))
  .action((a, b) => {
    const [minId, maxId] = normalizeIds(a, b)
    const result = db.prepare(
      'DELETE FROM user_connections WHERE user_id_a = ? AND user_id_b = ?'
    ).run(minId, maxId)
    if (result.changes === 0) {
      console.log(`No connection found between users ${a} and ${b}`)
    } else {
      console.log(`Connection deleted between users ${a} and ${b}`)
    }
  })

// connections:list
program
  .command('connections:list')
  .description('List connections for a user')
  .argument('<userId>', 'User ID', (v) => parseInt(v, 10))
  .action((userId) => {
    const rows = db.prepare<number[]>(`
      SELECT u.id, u.email, u.display_name, uc.connected_at
      FROM user_connections uc
      JOIN users u ON u.id = CASE
        WHEN uc.user_id_a = ? THEN uc.user_id_b
        ELSE uc.user_id_a
      END
      WHERE uc.user_id_a = ? OR uc.user_id_b = ?
      ORDER BY u.email
    `).all(userId, userId, userId)
    console.table(rows)
  })

// codes:create
program
  .command('codes:create')
  .description('Create an invite code for a user')
  .argument('<userId>', 'User ID', (v) => parseInt(v, 10))
  .action((userId) => {
    const code = randomUUID()
    const expiresAt = addDays(7)
    db.prepare(
      'INSERT INTO user_invite_codes (code, created_by_user_id, expires_at) VALUES (?, ?, ?)'
    ).run(code, userId, expiresAt)
    console.log(`Invite code created for user ${userId}: ${code}`)
    console.log(`Expires: ${expiresAt}`)
  })

// groups:create
program
  .command('groups:create')
  .description('Create a group')
  .requiredOption('--name <name>', 'Group name')
  .option('--description <desc>', 'Group description')
  .option('--members <ids>', 'Comma-separated member user IDs')
  .option('--creator <userId>', 'Creator user ID', (v) => parseInt(v, 10), 1)
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const result = db.prepare(
      'INSERT INTO groups (name, description, created_by_user_id) VALUES (?, ?, ?)'
    ).run(opts.name, opts.description ?? null, opts.creator)

    const groupId = result.lastInsertRowid as number

    if (opts.members) {
      const memberIds = (opts.members as string).split(',').map(Number).filter(Boolean)
      for (const userId of memberIds) {
        db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, userId)
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({ id: groupId, name: opts.name }))
    } else {
      console.log(`Group created: id=${groupId}, name="${opts.name}"`)
    }
  })

// groups:list
program
  .command('groups:list')
  .description('List all groups')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const rows = db.prepare(`
      SELECT g.id, g.name, g.description, g.created_by_user_id,
             COUNT(gm.user_id) AS member_count
      FROM groups g
      LEFT JOIN group_members gm ON gm.group_id = g.id
      GROUP BY g.id
      ORDER BY g.id
    `).all()
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// groups:list-members
program
  .command('groups:list-members')
  .description('List members of a group')
  .argument('<groupId>', 'Group ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((groupId, opts) => {
    const rows = db.prepare(`
      SELECT u.id, u.email, u.display_name, gm.joined_at
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY u.email
    `).all(groupId) as { id: number; email: string; display_name: string | null; joined_at: string }[]
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// groups:add-member
program
  .command('groups:add-member')
  .description('Add a user to a group')
  .argument('<groupId>', 'Group ID', (v) => parseInt(v, 10))
  .argument('<userId>', 'User ID', (v) => parseInt(v, 10))
  .action((groupId, userId) => {
    const existing = db.prepare(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
    ).get(groupId, userId)
    if (existing) {
      console.log(`User ${userId} is already a member of group ${groupId}`)
    } else {
      db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, userId)
      console.log(`Added user ${userId} to group ${groupId}`)
    }
  })

// groups:remove-member
program
  .command('groups:remove-member')
  .description('Remove a user from a group')
  .argument('<groupId>', 'Group ID', (v) => parseInt(v, 10))
  .argument('<userId>', 'User ID', (v) => parseInt(v, 10))
  .action((groupId, userId) => {
    const result = db.prepare(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?'
    ).run(groupId, userId)
    if (result.changes === 0) {
      console.log(`User ${userId} is not a member of group ${groupId}`)
    } else {
      console.log(`Removed user ${userId} from group ${groupId}`)
    }
  })

// groups:delete
program
  .command('groups:delete')
  .description('Delete a group and all its members')
  .argument('<groupId>', 'Group ID', (v) => parseInt(v, 10))
  .action((groupId) => {
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId)
    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId)
    console.log(`Deleted group ${groupId}`)
  })

// movies:create
program
  .command('movies:create')
  .description('Create a movie')
  .requiredOption('--title <title>', 'Movie title')
  .option('--runtime <minutes>', 'Runtime in minutes', (v) => parseInt(v, 10))
  .option('--release-year <year>', 'Release year', (v) => parseInt(v, 10))
  .option('--streaming <platform>', 'Streaming platform')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--creator <userId>', 'Creator user ID', (v) => parseInt(v, 10), 1)
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const existingMovie = db.prepare('SELECT id FROM movies WHERE title = ?').get(opts.title)
    if (existingMovie) {
      console.error(`Error: movie with title "${opts.title}" already exists`)
      process.exit(1)
    }

    const movieResult = db.prepare(
      'INSERT INTO movies (title, runtime_minutes, release_year, streaming, added_by_user_id) VALUES (?, ?, ?, ?, ?)'
    ).run(opts.title, opts.runtime ?? null, opts.releaseYear ?? null, opts.streaming ?? null, opts.creator)

    const movieId = movieResult.lastInsertRowid as number

    if (opts.tags) {
      for (const name of (opts.tags as string).split(',').map((s: string) => s.trim())) {
        const tag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').get(name) as { id: number } | undefined
        if (tag) db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(movieId, tag.id)
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({ id: movieId, title: opts.title }))
    } else {
      console.log(`Movie created: id=${movieId}, title="${opts.title}"`)
    }
  })

// movies:list
program
  .command('movies:list')
  .description('List all movies')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const rows = db.prepare(`
      SELECT m.id, m.title, m.release_year, m.runtime_minutes, m.streaming, m.added_by_user_id,
             GROUP_CONCAT(t.name, ', ') AS tags
      FROM movies m
      LEFT JOIN movie_tags mt ON mt.movie_id = m.id
      LEFT JOIN tags t ON t.id = mt.tag_id
      GROUP BY m.id
      ORDER BY m.title
    `).all()
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// movies:get
program
  .command('movies:get')
  .description('Get a movie by ID')
  .argument('<movieId>', 'Movie ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((movieId, opts) => {
    const row = db.prepare(`
      SELECT m.id, m.title, m.release_year, m.runtime_minutes, m.streaming, m.description, m.added_by_user_id,
             GROUP_CONCAT(t.name, ', ') AS tags
      FROM movies m
      LEFT JOIN movie_tags mt ON mt.movie_id = m.id
      LEFT JOIN tags t ON t.id = mt.tag_id
      WHERE m.id = ?
      GROUP BY m.id
    `).get(movieId)
    if (!row) {
      console.error(`Error: no movie found with id ${movieId}`)
      process.exit(1)
    }
    if (opts.json) {
      console.log(JSON.stringify(row))
    } else {
      console.table([row])
    }
  })

// movies:update
program
  .command('movies:update')
  .description('Update a movie')
  .argument('<movieId>', 'Movie ID', (v) => parseInt(v, 10))
  .option('--title <title>', 'Movie title')
  .option('--runtime <minutes>', 'Runtime in minutes', (v) => parseInt(v, 10))
  .option('--release-year <year>', 'Release year (use 0 to clear)', (v) => parseInt(v, 10))
  .option('--streaming <platform>', 'Streaming platform (use "" to clear)')
  .option('--description <desc>', 'Description (use "" to clear)')
  .option('--tags <tags>', 'Comma-separated tags (replaces existing)')
  .option('--json', 'Output as JSON')
  .action((movieId, opts) => {
    const existing = db.prepare('SELECT * FROM movies WHERE id = ?').get(movieId) as {
      id: number; title: string; runtime_minutes: number | null; release_year: number | null; streaming: string | null; description: string | null
    } | undefined
    if (!existing) {
      console.error(`Error: no movie found with id ${movieId}`)
      process.exit(1)
    }

    const releaseYear = 'releaseYear' in opts
      ? (opts.releaseYear === 0 ? null : opts.releaseYear)
      : existing.release_year

    db.prepare(`
      UPDATE movies SET
        title = ?,
        runtime_minutes = ?,
        release_year = ?,
        streaming = ?,
        description = ?
      WHERE id = ?
    `).run(
      opts.title ?? existing.title,
      'runtime' in opts ? (opts.runtime ?? null) : existing.runtime_minutes,
      releaseYear,
      'streaming' in opts ? (opts.streaming || null) : existing.streaming,
      'description' in opts ? (opts.description || null) : existing.description,
      movieId
    )

    if (opts.tags) {
      db.prepare('DELETE FROM movie_tags WHERE movie_id = ?').run(movieId)
      for (const name of (opts.tags as string).split(',').map((s: string) => s.trim())) {
        const tag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').get(name) as { id: number } | undefined
        if (tag) db.prepare('INSERT OR IGNORE INTO movie_tags (movie_id, tag_id) VALUES (?, ?)').run(movieId, tag.id)
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({ id: movieId, updated: true }))
    } else {
      console.log(`Movie updated: id=${movieId}`)
    }
  })

// tv:create
program
  .command('tv:create')
  .description('Create a TV series')
  .requiredOption('--title <title>', 'Series title')
  .option('--episode-runtime <minutes>', 'Episode runtime in minutes', (v) => parseInt(v, 10))
  .option('--seasons <count>', 'Number of seasons', (v) => parseInt(v, 10))
  .option('--release-year <year>', 'Release year', (v) => parseInt(v, 10))
  .option('--streaming <platform>', 'Streaming platform')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('--creator <userId>', 'Creator user ID', (v) => parseInt(v, 10), 1)
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const existingTv = db.prepare('SELECT id FROM tv_series WHERE title = ?').get(opts.title)
    if (existingTv) {
      console.error(`Error: TV series with title "${opts.title}" already exists`)
      process.exit(1)
    }

    const tvResult = db.prepare(
      'INSERT INTO tv_series (title, episode_runtime_minutes, season_count, release_year, streaming, added_by_user_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(opts.title, opts.episodeRuntime ?? null, opts.seasons ?? null, opts.releaseYear ?? null, opts.streaming ?? null, opts.creator)

    const seriesId = tvResult.lastInsertRowid as number

    if (opts.tags) {
      for (const name of (opts.tags as string).split(',').map((s: string) => s.trim())) {
        const tag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').get(name) as { id: number } | undefined
        if (tag) db.prepare('INSERT OR IGNORE INTO tv_series_tags (series_id, tag_id) VALUES (?, ?)').run(seriesId, tag.id)
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({ id: seriesId, title: opts.title }))
    } else {
      console.log(`TV series created: id=${seriesId}, title="${opts.title}"`)
    }
  })

// tv:list
program
  .command('tv:list')
  .description('List all TV series')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const rows = db.prepare(`
      SELECT s.id, s.title, s.release_year, s.episode_runtime_minutes, s.season_count, s.streaming, s.added_by_user_id,
             GROUP_CONCAT(t.name, ', ') AS tags
      FROM tv_series s
      LEFT JOIN tv_series_tags st ON st.series_id = s.id
      LEFT JOIN tags t ON t.id = st.tag_id
      GROUP BY s.id
      ORDER BY s.title
    `).all()
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// tv:get
program
  .command('tv:get')
  .description('Get a TV series by ID')
  .argument('<seriesId>', 'Series ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((seriesId, opts) => {
    const row = db.prepare(`
      SELECT s.id, s.title, s.release_year, s.episode_runtime_minutes, s.season_count, s.streaming, s.description, s.added_by_user_id,
             GROUP_CONCAT(t.name, ', ') AS tags
      FROM tv_series s
      LEFT JOIN tv_series_tags st ON st.series_id = s.id
      LEFT JOIN tags t ON t.id = st.tag_id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(seriesId)
    if (!row) {
      console.error(`Error: no TV series found with id ${seriesId}`)
      process.exit(1)
    }
    if (opts.json) {
      console.log(JSON.stringify(row))
    } else {
      console.table([row])
    }
  })

// tv:update
program
  .command('tv:update')
  .description('Update a TV series')
  .argument('<seriesId>', 'Series ID', (v) => parseInt(v, 10))
  .option('--title <title>', 'Series title')
  .option('--episode-runtime <minutes>', 'Episode runtime in minutes', (v) => parseInt(v, 10))
  .option('--seasons <count>', 'Number of seasons', (v) => parseInt(v, 10))
  .option('--release-year <year>', 'Release year (use 0 to clear)', (v) => parseInt(v, 10))
  .option('--streaming <platform>', 'Streaming platform (use "" to clear)')
  .option('--description <desc>', 'Description (use "" to clear)')
  .option('--json', 'Output as JSON')
  .action((seriesId, opts) => {
    const existing = db.prepare('SELECT * FROM tv_series WHERE id = ?').get(seriesId) as {
      id: number; title: string; episode_runtime_minutes: number | null; season_count: number | null; release_year: number | null; streaming: string | null; description: string | null
    } | undefined
    if (!existing) {
      console.error(`Error: no TV series found with id ${seriesId}`)
      process.exit(1)
    }

    const releaseYear = 'releaseYear' in opts
      ? (opts.releaseYear === 0 ? null : opts.releaseYear)
      : existing.release_year

    db.prepare(`
      UPDATE tv_series SET
        title = ?,
        episode_runtime_minutes = ?,
        season_count = ?,
        release_year = ?,
        streaming = ?,
        description = ?
      WHERE id = ?
    `).run(
      opts.title ?? existing.title,
      'episodeRuntime' in opts ? (opts.episodeRuntime ?? null) : existing.episode_runtime_minutes,
      'seasons' in opts ? (opts.seasons ?? null) : existing.season_count,
      releaseYear,
      'streaming' in opts ? (opts.streaming || null) : existing.streaming,
      'description' in opts ? (opts.description || null) : existing.description,
      seriesId
    )

    if (opts.json) {
      console.log(JSON.stringify({ id: seriesId, updated: true }))
    } else {
      console.log(`TV series updated: id=${seriesId}`)
    }
  })

// movies:delete-all
program
  .command('movies:delete-all')
  .description('Delete all movies and their related data (tags, cast, user states, series, watch event candidates)')
  .action(() => {
    const count = (db.prepare('SELECT COUNT(*) AS n FROM movies').get() as { n: number }).n
    db.transaction(() => {
      const candidateIds = (db.prepare(
        'SELECT id FROM watch_event_candidates WHERE movie_id IS NOT NULL'
      ).all() as { id: number }[]).map(r => r.id)
      if (candidateIds.length) {
        const ph = candidateIds.map(() => '?').join(',')
        db.prepare(`DELETE FROM watch_event_votes WHERE candidate_id IN (${ph})`).run(...candidateIds)
        db.prepare(`DELETE FROM watch_event_selection WHERE candidate_id IN (${ph})`).run(...candidateIds)
        db.prepare(`DELETE FROM watch_event_candidates WHERE id IN (${ph})`).run(...candidateIds)
      }
      db.prepare('DELETE FROM user_movies').run()
      db.prepare('DELETE FROM movie_series_entries').run()
      db.prepare('DELETE FROM movie_series').run()
      db.prepare('DELETE FROM movie_tags').run()
      db.prepare('DELETE FROM movie_cast').run()
      db.prepare('DELETE FROM movies').run()
    })()
    console.log(`Deleted ${count} movie(s) and all related data.`)
  })

// tv:delete-all
program
  .command('tv:delete-all')
  .description('Delete all TV series and their related data (tags, cast, user states, watch event candidates)')
  .action(() => {
    const count = (db.prepare('SELECT COUNT(*) AS n FROM tv_series').get() as { n: number }).n
    db.transaction(() => {
      const candidateIds = (db.prepare(
        'SELECT id FROM watch_event_candidates WHERE series_id IS NOT NULL'
      ).all() as { id: number }[]).map(r => r.id)
      if (candidateIds.length) {
        const ph = candidateIds.map(() => '?').join(',')
        db.prepare(`DELETE FROM watch_event_votes WHERE candidate_id IN (${ph})`).run(...candidateIds)
        db.prepare(`DELETE FROM watch_event_selection WHERE candidate_id IN (${ph})`).run(...candidateIds)
        db.prepare(`DELETE FROM watch_event_candidates WHERE id IN (${ph})`).run(...candidateIds)
      }
      db.prepare('DELETE FROM user_tv_series').run()
      db.prepare('DELETE FROM tv_series_tags').run()
      db.prepare('DELETE FROM tv_cast').run()
      db.prepare('DELETE FROM tv_series').run()
    })()
    console.log(`Deleted ${count} TV series and all related data.`)
  })

// events:list
program
  .command('events:list')
  .description('List all watch events')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const rows = db.prepare(`
      SELECT e.id, e.title, e.scheduled_date, e.created_by_user_id,
             e.created_at, e.completed_at,
             COUNT(i.user_id) AS invite_count
      FROM watch_events e
      LEFT JOIN watch_event_invites i ON i.event_id = e.id
      GROUP BY e.id
      ORDER BY e.scheduled_date DESC
    `).all()
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// events:create
program
  .command('events:create')
  .description('Create a watch event')
  .requiredOption('--title <title>', 'Event title')
  .requiredOption('--date <date>', 'Scheduled date (YYYY-MM-DD or ISO 8601)')
  .option('--creator <userId>', 'Creator user ID', (v) => parseInt(v, 10), 1)
  .option('--invites <ids>', 'Comma-separated user IDs to invite')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const result = db.prepare(
      'INSERT INTO watch_events (title, scheduled_date, created_by_user_id) VALUES (?, ?, ?)'
    ).run(opts.title, opts.date, opts.creator)
    const eventId = result.lastInsertRowid as number

    if (opts.invites) {
      const userIds = (opts.invites as string).split(',').map(Number).filter(Boolean)
      for (const userId of userIds) {
        db.prepare('INSERT OR IGNORE INTO watch_event_invites (event_id, user_id) VALUES (?, ?)').run(eventId, userId)
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({ id: eventId, title: opts.title }))
    } else {
      console.log(`Event created: id=${eventId}, title="${opts.title}"`)
    }
  })

// events:delete
program
  .command('events:delete')
  .description('Delete a watch event and all related data')
  .argument('<eventId>', 'Event ID', (v) => parseInt(v, 10))
  .action((eventId) => {
    const event = db.prepare('SELECT id, title FROM watch_events WHERE id = ?').get(eventId) as { id: number; title: string } | undefined
    if (!event) {
      console.error(`Error: no event found with id ${eventId}`)
      process.exit(1)
    }
    db.transaction(() => {
      db.prepare('DELETE FROM watch_event_selection WHERE event_id = ?').run(eventId)
      db.prepare('DELETE FROM watch_event_votes WHERE event_id = ?').run(eventId)
      db.prepare('DELETE FROM watch_event_candidates WHERE event_id = ?').run(eventId)
      db.prepare('DELETE FROM watch_event_invites WHERE event_id = ?').run(eventId)
      db.prepare('DELETE FROM watch_events WHERE id = ?').run(eventId)
    })()
    console.log(`Deleted event: id=${eventId}, title="${event.title}"`)
  })

// events:show
program
  .command('events:show')
  .description('Show details for a watch event')
  .argument('<eventId>', 'Event ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((eventId, opts) => {
    const event = db.prepare(`
      SELECT e.id, e.title, e.scheduled_date, e.created_at, e.completed_at,
             u.email AS created_by_email, u.display_name AS created_by_name,
             COUNT(DISTINCT i.user_id) AS invite_count,
             COUNT(DISTINCT c.id) AS candidate_count
      FROM watch_events e
      LEFT JOIN users u ON u.id = e.created_by_user_id
      LEFT JOIN watch_event_invites i ON i.event_id = e.id
      LEFT JOIN watch_event_candidates c ON c.event_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
    `).get(eventId)
    if (!event) {
      console.error(`Error: no event found with id ${eventId}`)
      process.exit(1)
    }
    if (opts.json) {
      console.log(JSON.stringify(event))
    } else {
      console.table([event])
    }
  })

// events:attendees
program
  .command('events:attendees')
  .description('List attendees and their attendance status for a watch event')
  .argument('<eventId>', 'Event ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((eventId, opts) => {
    const rows = db.prepare(`
      SELECT u.id AS user_id, u.email, u.display_name, i.attendance
      FROM watch_event_invites i
      JOIN users u ON u.id = i.user_id
      WHERE i.event_id = ?
      ORDER BY u.email
    `).all(eventId)
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// events:candidates
program
  .command('events:candidates')
  .description('List candidates and vote ratings for a watch event')
  .argument('<eventId>', 'Event ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((eventId, opts) => {
    const rows = db.prepare(`
      SELECT
        c.id AS candidate_id,
        c.item_type,
        COALESCE(m.title, s.title) AS title,
        u.email AS suggested_by_email,
        c.suggested_at,
        COUNT(v.user_id) AS vote_count,
        ROUND(AVG(v.vote), 2) AS avg_vote
      FROM watch_event_candidates c
      LEFT JOIN movies m ON m.id = c.movie_id
      LEFT JOIN tv_series s ON s.id = c.series_id
      LEFT JOIN users u ON u.id = c.suggested_by_user_id
      LEFT JOIN watch_event_votes v ON v.candidate_id = c.id
      WHERE c.event_id = ?
      GROUP BY c.id
      ORDER BY avg_vote DESC NULLS LAST, title
    `).all(eventId)
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// watch external search
program
  .command('watch:external:search')
  .description('Search TMDB external catalog')
  .requiredOption('--q <query>', 'Search query')
  .requiredOption('--type <type>', 'Content type: movie or tv')
  .option('--person', 'Search by person (actor/director filmography)')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    if (!env.TMDB_API_KEY) {
      console.error('Error: TMDB_API_KEY is not configured')
      process.exit(1)
    }
    if (opts.type !== 'movie' && opts.type !== 'tv') {
      console.error('Error: --type must be "movie" or "tv"')
      process.exit(1)
    }

    const type = opts.type as 'movie' | 'tv'
    const mode = opts.person ? `person:${getPersonSortMode()}` : 'title'
    const cacheKey = getCacheKey(type, mode, opts.q)
    const cachedIds = readQueryCache(cacheKey)

    let results: unknown[]
    if (cachedIds) {
      results = loadTitleCache(cachedIds)
    } else {
      const TMDB_BASE = 'https://api.themoviedb.org'
      async function tmdbGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
        const qs = new URLSearchParams(params).toString()
        const url = `${TMDB_BASE}${path}${qs ? `?${qs}` : ''}`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${env.TMDB_API_KEY}` } })
        if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`)
        return res.json()
      }

      if (mode === 'title') {
        const endpoint = type === 'movie' ? '/3/search/movie' : '/3/search/tv'
        const data = await tmdbGet(endpoint, { query: opts.q }) as { results: Record<string, unknown>[] }
        results = (data.results ?? []).slice(0, 50).map(item => ({
          tmdbId: item.id,
          title: type === 'movie' ? (item.title ?? item.original_title) : (item.name ?? item.original_name),
          releaseYear: extractReleaseYear((type === 'movie' ? item.release_date : item.first_air_date) as string | undefined),
          runtimeMinutes: type === 'movie' ? (item.runtime ?? null) : null,
          seasonCount: type === 'tv' ? (item.number_of_seasons ?? null) : null,
          overview: item.overview ?? '',
          genres: applyGenreMap([]),
          isDuplicate: false,
        }))
      } else {
        const personData = await tmdbGet('/3/search/person', { query: opts.q }) as { results: Array<{ id: number }> }
        if (!personData.results?.length) { results = []; }
        else {
          const personId = personData.results[0].id
          const creditsEndpoint = type === 'movie' ? `/3/person/${personId}/movie_credits` : `/3/person/${personId}/tv_credits`
          const credits = await tmdbGet(creditsEndpoint) as {
            cast: Array<Record<string, unknown> & { id: number; order: number }>
            crew: Array<Record<string, unknown> & { id: number; job: string }>
          }
          const byId = new Map<number, { item: Record<string, unknown>; billing: number }>()
          for (const item of credits.crew ?? []) {
            if (item.job !== 'Director') continue
            const existing = byId.get(item.id as number)
            if (!existing || 0 < existing.billing) byId.set(item.id as number, { item, billing: 0 })
          }
          for (const item of credits.cast ?? []) {
            const billing = item.order
            const existing = byId.get(item.id as number)
            if (!existing || billing < existing.billing) byId.set(item.id as number, { item, billing })
          }
          results = sortPersonCredits([...byId.values()]).slice(0, 50).map(({ item }) => ({
            tmdbId: item.id,
            title: type === 'movie' ? (item.title ?? item.original_title) : (item.name ?? item.original_name),
            releaseYear: extractReleaseYear((type === 'movie' ? item.release_date : item.first_air_date) as string | undefined),
            runtimeMinutes: type === 'movie' ? (item.runtime ?? null) : null,
            seasonCount: type === 'tv' ? (item.number_of_seasons ?? null) : null,
            overview: item.overview ?? '',
            genres: applyGenreMap([]),
            isDuplicate: false,
            voteAverage: item.vote_average as number | undefined,
            popularity: item.popularity as number | undefined,
          }))
        }
      }
      const typedResults = results as Array<{ tmdbId: number }>
      for (const r of typedResults) {
        upsertTitleCache(r.tmdbId, r)
      }
      writeQueryCache(cacheKey, typedResults.map(r => r.tmdbId))
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2))
    } else {
      const rows = (results as Array<Record<string, unknown>>).map(r => ({
        title: r.title,
        year: r.releaseYear ?? '—',
        runtime: type === 'movie' ? (r.runtimeMinutes != null ? `${r.runtimeMinutes}m` : '—') : undefined,
        seasons: type === 'tv' ? (r.seasonCount != null ? `${r.seasonCount}s` : '—') : undefined,
        duplicate: r.isDuplicate ? 'yes' : 'no',
      }))
      console.table(rows)
    }
  })

// watch cast
program
  .command('watch:cast')
  .description('Show cast and director for a movie or TV series')
  .requiredOption('--id <id>', 'Title ID', parseInt)
  .requiredOption('--type <type>', 'Content type: movie or tv')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    if (opts.type !== 'movie' && opts.type !== 'tv') {
      console.error('Error: --type must be "movie" or "tv"')
      process.exit(1)
    }
    const table = opts.type === 'movie' ? 'movie_cast' : 'tv_cast'
    const rows = db
      .prepare(
        `SELECT p.name, p.tmdb_person_id, c.role, c.billing_order
         FROM ${table} c
         JOIN people p ON p.id = c.person_id
         WHERE c.title_id = ?
         ORDER BY c.billing_order`
      )
      .all(opts.id) as { name: string; tmdb_person_id: number; role: string; billing_order: number }[]

    if (opts.json) {
      console.log(JSON.stringify(rows.map(r => ({
        name: r.name,
        role: r.role,
        billingOrder: r.billing_order,
        tmdbPersonId: r.tmdb_person_id,
      })), null, 2))
    } else {
      if (rows.length === 0) {
        console.log('No cast stored for this title.')
        return
      }
      console.table(rows.map(r => ({
        name: r.name,
        role: r.role,
        billingOrder: r.billing_order,
      })))
    }
  })

// watch:cast:fetch — backfill cast for an existing title by fetching from TMDB
program
  .command('watch:cast:fetch')
  .description('Fetch and store cast from TMDB for an existing movie or TV series')
  .requiredOption('--id <id>', 'Title ID', parseInt)
  .requiredOption('--type <type>', 'Content type: movie or tv')
  .action(async (opts) => {
    if (opts.type !== 'movie' && opts.type !== 'tv') {
      console.error('Error: --type must be "movie" or "tv"')
      process.exit(1)
    }
    if (!env.TMDB_API_KEY) {
      console.error('Error: TMDB_API_KEY is not configured')
      process.exit(1)
    }

    const titleTable = opts.type === 'movie' ? 'movies' : 'tv_series'
    const row = db.prepare(`SELECT id, title, tmdb_id FROM ${titleTable} WHERE id = ?`).get(opts.id) as
      | { id: number; title: string; tmdb_id: number | null }
      | undefined

    if (!row) {
      console.error(`Error: no ${opts.type === 'movie' ? 'movie' : 'TV series'} found with id ${opts.id}`)
      process.exit(1)
    }
    if (!row.tmdb_id) {
      console.error(`Error: title "${row.title}" has no tmdb_id stored — cannot fetch cast`)
      process.exit(1)
    }

    const TMDB_BASE = 'https://api.themoviedb.org'
    const endpoint = opts.type === 'movie'
      ? `/3/movie/${row.tmdb_id}/credits`
      : `/3/tv/${row.tmdb_id}/credits`
    const url = `${TMDB_BASE}${endpoint}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${env.TMDB_API_KEY}` } })
    if (!res.ok) {
      console.error(`Error: TMDB ${res.status}: ${await res.text()}`)
      process.exit(1)
    }
    const credits = await res.json() as {
      crew: Array<{ id: number; name: string; job: string }>
      cast: Array<{ id: number; name: string; order: number }>
    }

    const castTable = opts.type === 'movie' ? 'movie_cast' : 'tv_cast'
    const upsertPerson = db.prepare('INSERT OR IGNORE INTO people (name, tmdb_person_id) VALUES (?, ?)')
    const getPerson = db.prepare('SELECT id FROM people WHERE tmdb_person_id = ?')
    const delCast = db.prepare(`DELETE FROM ${castTable} WHERE title_id = ?`)
    const insCast = db.prepare(`INSERT OR IGNORE INTO ${castTable} (person_id, title_id, role, billing_order) VALUES (?, ?, ?, ?)`)

    const director = (credits.crew ?? []).find(c => c.job === 'Director')
    const dedupedCast = new Map<number, { id: number; name: string; order: number }>()
    for (const member of [...(credits.cast ?? [])].sort((a, b) => a.order - b.order)) {
      if (!dedupedCast.has(member.id)) dedupedCast.set(member.id, member)
    }
    const topCast = [...dedupedCast.values()].slice(0, 30)

    db.transaction(() => {
      delCast.run(row.id)
      if (director) {
        upsertPerson.run(director.name, director.id)
        const person = getPerson.get(director.id) as { id: number }
        insCast.run(person.id, row.id, 'director', 0)
      }
      for (const member of topCast) {
        upsertPerson.run(member.name, member.id)
        const person = getPerson.get(member.id) as { id: number }
        insCast.run(person.id, row.id, 'cast', member.order)
      }
    })()

    const stored = (director ? 1 : 0) + topCast.length
    console.log(`Stored ${stored} cast member(s) for "${row.title}" (id=${row.id}, tmdb_id=${row.tmdb_id})`)
  })

// watch:ratings
program
  .command('watch:ratings')
  .description('List personal ratings for a user (movies and TV)')
  .option('--userId <id>', 'User ID', (v) => parseInt(v, 10), 1)
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const movieRows = db.prepare(`
      SELECT um.movie_id AS id, 'movie' AS media_type, m.title, m.release_year AS year, m.streaming, um.rating, um.state
      FROM user_movies um
      JOIN movies m ON m.id = um.movie_id
      WHERE um.user_id = ?
    `).all(opts.userId) as Array<{ id: number; media_type: string; title: string; year: number | null; streaming: string | null; rating: number | null; state: string }>

    const tvRows = db.prepare(`
      SELECT uts.series_id AS id, 'tv' AS media_type, tv.title, tv.release_year AS year, tv.streaming, uts.rating, uts.state
      FROM user_tv_series uts
      JOIN tv_series tv ON tv.id = uts.series_id
      WHERE uts.user_id = ?
    `).all(opts.userId) as Array<{ id: number; media_type: string; title: string; year: number | null; streaming: string | null; rating: number | null; state: string }>

    const rows = [...movieRows, ...tvRows].sort((a, b) => {
      if (a.rating === null && b.rating === null) return 0
      if (a.rating === null) return 1
      if (b.rating === null) return -1
      return b.rating - a.rating
    })

    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// trips:list
program
  .command('trips:list')
  .description('List all trips')
  .option('--user-id <userId>', 'Filter by user ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const where = opts.userId ? 'WHERE user_id = ?' : ''
    const args = opts.userId ? [opts.userId] : []
    const rows = db.prepare(`SELECT * FROM trips ${where} ORDER BY created_at DESC`).all(...args)
    if (opts.json) {
      console.log(JSON.stringify(rows))
    } else {
      console.table(rows)
    }
  })

// trips:create
program
  .command('trips:create')
  .description('Create a new trip')
  .argument('<name>', 'Trip name')
  .requiredOption('--user-id <userId>', 'User ID', (v) => parseInt(v, 10))
  .option('--destination <destination>', 'Destination')
  .option('--departure-notes <notes>', 'Departure notes')
  .option('--return-notes <notes>', 'Return notes')
  .option('--nights <n>', 'Number of nights', (v) => parseInt(v, 10))
  .option('--full-days <n>', 'Number of full days', (v) => parseInt(v, 10))
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--info-markdown <markdown>', 'Info page markdown')
  .option('--json', 'Output as JSON')
  .action((name, opts) => {
    const result = db.prepare(
      `INSERT INTO trips (user_id, name, destination, departure_notes, return_notes, nights, full_days, start_date, end_date, info_markdown)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      opts.userId, name,
      opts.destination ?? null,
      opts.departureNotes ?? null,
      opts.returnNotes ?? null,
      opts.nights ?? null,
      opts.fullDays ?? null,
      opts.startDate ?? null,
      opts.endDate ?? null,
      opts.infoMarkdown ?? null,
    )
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(Number(result.lastInsertRowid))
    if (opts.json) {
      console.log(JSON.stringify(trip))
    } else {
      console.log('Trip created:')
      console.table([trip])
    }
  })

// trips:set-current
program
  .command('trips:set-current')
  .description('Set the current trip for a user')
  .argument('<tripId>', 'Trip ID', (v) => parseInt(v, 10))
  .action((tripId) => {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId) as { user_id: number; name: string } | undefined
    if (!trip) {
      console.error(`Error: trip ${tripId} not found`)
      process.exit(1)
    }
    db.transaction(() => {
      db.prepare('UPDATE trips SET is_current = 0 WHERE user_id = ?').run(trip.user_id)
      db.prepare('UPDATE trips SET is_current = 1 WHERE id = ?').run(tripId)
    })()
    console.log(`Current trip set to: ${trip.name} (id=${tripId})`)
  })

// trips:update
program
  .command('trips:update')
  .description('Update a trip')
  .argument('<tripId>', 'Trip ID', (v) => parseInt(v, 10))
  .option('--name <name>', 'Trip name')
  .option('--destination <destination>', 'Destination')
  .option('--departure-notes <notes>', 'Departure notes')
  .option('--return-notes <notes>', 'Return notes')
  .option('--nights <n>', 'Number of nights', (v) => parseInt(v, 10))
  .option('--full-days <n>', 'Number of full days', (v) => parseInt(v, 10))
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--info-markdown <markdown>', 'Info page markdown')
  .option('--json', 'Output as JSON')
  .action((tripId, opts) => {
    const existing = db.prepare('SELECT id FROM trips WHERE id = ?').get(tripId)
    if (!existing) {
      console.error(`Error: trip ${tripId} not found`)
      process.exit(1)
    }
    const fields: string[] = []
    const values: unknown[] = []
    if (opts.name !== undefined) { fields.push('name = ?'); values.push(opts.name) }
    if (opts.destination !== undefined) { fields.push('destination = ?'); values.push(opts.destination) }
    if (opts.departureNotes !== undefined) { fields.push('departure_notes = ?'); values.push(opts.departureNotes) }
    if (opts.returnNotes !== undefined) { fields.push('return_notes = ?'); values.push(opts.returnNotes) }
    if (opts.nights !== undefined) { fields.push('nights = ?'); values.push(opts.nights) }
    if (opts.fullDays !== undefined) { fields.push('full_days = ?'); values.push(opts.fullDays) }
    if (opts.startDate !== undefined) { fields.push('start_date = ?'); values.push(opts.startDate) }
    if (opts.endDate !== undefined) { fields.push('end_date = ?'); values.push(opts.endDate) }
    if (opts.infoMarkdown !== undefined) { fields.push('info_markdown = ?'); values.push(opts.infoMarkdown) }
    if (fields.length === 0) {
      console.error('No fields to update')
      process.exit(1)
    }
    values.push(tripId)
    db.prepare(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId)
    if (opts.json) {
      console.log(JSON.stringify(trip))
    } else {
      console.log('Trip updated:')
      console.table([trip])
    }
  })

// trips:delete
program
  .command('trips:delete')
  .description('Delete a trip')
  .argument('<tripId>', 'Trip ID', (v) => parseInt(v, 10))
  .action((tripId) => {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId) as { name: string } | undefined
    if (!trip) {
      console.error(`Error: trip ${tripId} not found`)
      process.exit(1)
    }
    db.prepare('DELETE FROM trips WHERE id = ?').run(tripId)
    console.log(`Deleted trip: ${trip.name} (id=${tripId})`)
  })

// tokens:create
program
  .command('tokens:create')
  .description('Create an API token for a user')
  .requiredOption('--user-id <userId>', 'User ID', (v) => parseInt(v, 10))
  .requiredOption('--label <label>', 'Human-readable label for the token')
  .requiredOption('--days <days>', 'Expiration in days (1–180)', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((opts) => {
    if (opts.days < 1 || opts.days > 180) {
      console.error('Error: --days must be between 1 and 180')
      process.exit(1)
    }
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(opts.userId)
    if (!user) {
      console.error(`Error: no user found with id ${opts.userId}`)
      process.exit(1)
    }
    const rawToken = 'track_' + randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + opts.days)
    const expiresAtIso = expiresAt.toISOString()
    const result = db.prepare(
      'INSERT INTO api_tokens (user_id, token_hash, label, expires_at) VALUES (?, ?, ?, ?)'
    ).run(opts.userId, tokenHash, opts.label, expiresAtIso)
    const id = Number(result.lastInsertRowid)
    if (opts.json) {
      console.log(JSON.stringify({ id, label: opts.label, expiresAt: expiresAtIso, token: rawToken }))
    } else {
      console.log(`Token created: id=${id}, label="${opts.label}", expires=${expiresAtIso}`)
      console.log(`Token value (save this — it will not be shown again):`)
      console.log(rawToken)
    }
  })

// tokens:list
program
  .command('tokens:list')
  .description('List API tokens for a user')
  .requiredOption('--user-id <userId>', 'User ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const rows = db.prepare(
      'SELECT id, label, created_at, expires_at FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC'
    ).all(opts.userId) as { id: number; label: string; created_at: string; expires_at: string }[]
    if (opts.json) {
      console.log(JSON.stringify(rows.map(r => ({
        id: r.id,
        label: r.label,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
      }))))
    } else {
      console.table(rows.map(r => ({
        id: r.id,
        label: r.label,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        expired: r.expires_at < new Date().toISOString() ? 'yes' : 'no',
      })))
    }
  })

// tokens:revoke
program
  .command('tokens:revoke')
  .description('Revoke an API token by ID')
  .requiredOption('--id <id>', 'Token ID', (v) => parseInt(v, 10))
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const token = db.prepare('SELECT id, label, user_id FROM api_tokens WHERE id = ?').get(opts.id) as
      | { id: number; label: string; user_id: number }
      | undefined
    if (!token) {
      console.error(`Error: no token found with id ${opts.id}`)
      process.exit(1)
    }
    db.prepare('DELETE FROM api_tokens WHERE id = ?').run(opts.id)
    if (opts.json) {
      console.log(JSON.stringify({ ok: true, id: opts.id }))
    } else {
      console.log(`Revoked token: id=${opts.id}, label="${token.label}" (user_id=${token.user_id})`)
    }
  })

program.parse()
