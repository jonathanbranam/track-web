import 'dotenv/config'
import { randomUUID } from 'crypto'
import bcrypt from 'bcrypt'
import { getDb } from '../src/db'

function usage(): never {
  console.error(`Usage: npm run admin -- <subcommand> [args]

Subcommands:
  users:list
  users:create <email> <password> [--name "<display name>"]
  users:update-password <email> <password>
  users:set-name <userId> "<name>"

  connections:create <userIdA> <userIdB>
  connections:delete <userIdA> <userIdB>
  connections:list <userId>

  codes:create <userId>

  groups:create --name "<name>" [--description "<desc>"] [--members 1,2,3]
  groups:list
  groups:add-member <groupId> <userId>
  groups:remove-member <groupId> <userId>
  groups:delete <groupId>
`)
  process.exit(1)
}

function normalizeIds(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a]
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function main() {
  const db = getDb()
  const [subcommand, ...rest] = process.argv.slice(2)

  if (!subcommand) usage()

  switch (subcommand) {
    case 'users:list': {
      const rows = db.prepare('SELECT id, email, display_name, created_at FROM users ORDER BY id').all() as {
        id: number; email: string; display_name: string | null; created_at: string
      }[]
      console.table(rows)
      break
    }

    case 'users:set-name': {
      const [userId, name] = rest
      if (!userId || !name) {
        console.error('Usage: npm run admin -- users:set-name <userId> "<name>"')
        process.exit(1)
      }
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(name, parseInt(userId, 10))
      console.log(`Updated display name for user ${userId} to "${name}"`)
      break
    }

    case 'users:create': {
      const nameIdx = rest.indexOf('--name')
      const displayName = nameIdx !== -1 ? rest[nameIdx + 1] : undefined
      const positional = rest.filter((a, i) => {
        if (a === '--name') return false
        if (i > 0 && rest[i - 1] === '--name') return false
        return true
      })
      const [email, password] = positional
      if (!email || !password) {
        console.error('Usage: npm run admin -- users:create <email> <password> [--name "<display name>"]')
        process.exit(1)
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      if (existing) {
        console.error(`Error: user with email "${email}" already exists`)
        process.exit(1)
      }
      const passwordHash = bcrypt.hashSync(password, 12)
      db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)').run(
        email, passwordHash, displayName ?? null
      )
      console.log(`User created: ${email}${displayName ? ` (${displayName})` : ''}`)
      break
    }

    case 'users:update-password': {
      const [email, password] = rest
      if (!email || !password) {
        console.error('Usage: npm run admin -- users:update-password <email> <password>')
        process.exit(1)
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      if (!existing) {
        console.error(`Error: no user found with email "${email}"`)
        process.exit(1)
      }
      const passwordHash = bcrypt.hashSync(password, 12)
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email)
      console.log(`Password updated: ${email}`)
      break
    }

    case 'connections:create': {
      const [a, b] = rest.map(Number)
      if (!a || !b) {
        console.error('Usage: npm run admin -- connections:create <userIdA> <userIdB>')
        process.exit(1)
      }
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
      break
    }

    case 'connections:delete': {
      const [a, b] = rest.map(Number)
      if (!a || !b) {
        console.error('Usage: npm run admin -- connections:delete <userIdA> <userIdB>')
        process.exit(1)
      }
      const [minId, maxId] = normalizeIds(a, b)
      const result = db.prepare(
        'DELETE FROM user_connections WHERE user_id_a = ? AND user_id_b = ?'
      ).run(minId, maxId)
      if (result.changes === 0) {
        console.log(`No connection found between users ${a} and ${b}`)
      } else {
        console.log(`Connection deleted between users ${a} and ${b}`)
      }
      break
    }

    case 'connections:list': {
      const [userId] = rest.map(Number)
      if (!userId) {
        console.error('Usage: npm run admin -- connections:list <userId>')
        process.exit(1)
      }
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
      break
    }

    case 'codes:create': {
      const [userId] = rest.map(Number)
      if (!userId) {
        console.error('Usage: npm run admin -- codes:create <userId>')
        process.exit(1)
      }
      const code = randomUUID()
      const expiresAt = addDays(7)
      db.prepare(
        'INSERT INTO user_invite_codes (code, created_by_user_id, expires_at) VALUES (?, ?, ?)'
      ).run(code, userId, expiresAt)
      console.log(`Invite code created for user ${userId}: ${code}`)
      console.log(`Expires: ${expiresAt}`)
      break
    }

    case 'groups:create': {
      const nameIdx = rest.indexOf('--name')
      const descIdx = rest.indexOf('--description')
      const membersIdx = rest.indexOf('--members')

      const name = nameIdx !== -1 ? rest[nameIdx + 1] : undefined
      const description = descIdx !== -1 ? rest[descIdx + 1] : undefined
      const membersStr = membersIdx !== -1 ? rest[membersIdx + 1] : undefined

      if (!name) {
        console.error('Usage: npm run admin -- groups:create --name "<name>" [--description "<desc>"] [--members 1,2,3]')
        process.exit(1)
      }

      const result = db.prepare(
        'INSERT INTO groups (name, description, created_by_user_id) VALUES (?, ?, 0)'
      ).run(name, description ?? null)

      const groupId = result.lastInsertRowid as number

      if (membersStr) {
        const memberIds = membersStr.split(',').map(Number).filter(Boolean)
        for (const userId of memberIds) {
          db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, userId)
        }
      }

      console.log(`Group created: id=${groupId}, name="${name}"`)
      break
    }

    case 'groups:list': {
      const rows = db.prepare(`
        SELECT g.id, g.name, g.description, g.created_by_user_id,
               COUNT(gm.user_id) AS member_count
        FROM groups g
        LEFT JOIN group_members gm ON gm.group_id = g.id
        GROUP BY g.id
        ORDER BY g.id
      `).all()
      console.table(rows)
      break
    }

    case 'groups:add-member': {
      const [groupId, userId] = rest.map(Number)
      if (!groupId || !userId) {
        console.error('Usage: npm run admin -- groups:add-member <groupId> <userId>')
        process.exit(1)
      }
      const existing = db.prepare(
        'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
      ).get(groupId, userId)
      if (existing) {
        console.log(`User ${userId} is already a member of group ${groupId}`)
      } else {
        db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, userId)
        console.log(`Added user ${userId} to group ${groupId}`)
      }
      break
    }

    case 'groups:remove-member': {
      const [groupId, userId] = rest.map(Number)
      if (!groupId || !userId) {
        console.error('Usage: npm run admin -- groups:remove-member <groupId> <userId>')
        process.exit(1)
      }
      const result = db.prepare(
        'DELETE FROM group_members WHERE group_id = ? AND user_id = ?'
      ).run(groupId, userId)
      if (result.changes === 0) {
        console.log(`User ${userId} is not a member of group ${groupId}`)
      } else {
        console.log(`Removed user ${userId} from group ${groupId}`)
      }
      break
    }

    case 'groups:delete': {
      const [groupId] = rest.map(Number)
      if (!groupId) {
        console.error('Usage: npm run admin -- groups:delete <groupId>')
        process.exit(1)
      }
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId)
      db.prepare('DELETE FROM groups WHERE id = ?').run(groupId)
      console.log(`Deleted group ${groupId}`)
      break
    }

    default:
      console.error(`Unknown subcommand: ${subcommand}`)
      usage()
  }
}

main()
