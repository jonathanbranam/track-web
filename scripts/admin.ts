import 'dotenv/config'
import { randomUUID } from 'crypto'
import bcrypt from 'bcrypt'
import { Command } from 'commander'
import { getDb } from '../src/db'

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
  .argument('<password>', 'User password')
  .option('--name <displayName>', 'Display name')
  .action((email, password, opts) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      console.error(`Error: user with email "${email}" already exists`)
      process.exit(1)
    }
    const passwordHash = bcrypt.hashSync(password, 12)
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
  .argument('<password>', 'New password')
  .action((email, password) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (!existing) {
      console.error(`Error: no user found with email "${email}"`)
      process.exit(1)
    }
    const passwordHash = bcrypt.hashSync(password, 12)
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
      'INSERT INTO movies (title, runtime_minutes, streaming, added_by_user_id) VALUES (?, ?, ?, ?)'
    ).run(opts.title, opts.runtime ?? null, opts.streaming ?? null, opts.creator)

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
      SELECT m.id, m.title, m.runtime_minutes, m.streaming, m.added_by_user_id,
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

// tv:create
program
  .command('tv:create')
  .description('Create a TV series')
  .requiredOption('--title <title>', 'Series title')
  .option('--episode-runtime <minutes>', 'Episode runtime in minutes', (v) => parseInt(v, 10))
  .option('--seasons <count>', 'Number of seasons', (v) => parseInt(v, 10))
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
      'INSERT INTO tv_series (title, episode_runtime_minutes, season_count, streaming, added_by_user_id) VALUES (?, ?, ?, ?, ?)'
    ).run(opts.title, opts.episodeRuntime ?? null, opts.seasons ?? null, opts.streaming ?? null, opts.creator)

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
      SELECT s.id, s.title, s.episode_runtime_minutes, s.season_count, s.streaming, s.added_by_user_id,
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

program.parse()
