import 'dotenv/config'
import bcrypt from 'bcrypt'
import { getDb } from '../src/db'

async function main() {
  const args = process.argv.slice(2)

  // Parse flags
  const updateIdx = args.indexOf('--update')
  const nameIdx = args.indexOf('--name')

  const update = updateIdx !== -1
  const displayName = nameIdx !== -1 ? args[nameIdx + 1] : undefined

  // Remove flags and their values to get positional args
  const positional = args.filter((a, i) => {
    if (a === '--update') return false
    if (a === '--name') return false
    if (i > 0 && args[i - 1] === '--name') return false
    return true
  })

  const [email, password] = update ? positional : positional

  if (!email || !password) {
    console.error('Usage:')
    console.error('  npm run create-user -- <email> <password> [--name "<display name>"]')
    console.error('  npm run create-user -- --update <email> <password>')
    process.exit(1)
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)

  if (update) {
    if (!existing) {
      console.error(`Error: no user found with email "${email}"`)
      process.exit(1)
    }
    const passwordHash = await bcrypt.hash(password, 12)
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email)
    console.log(`Password updated: ${email}`)
  } else {
    if (existing) {
      console.error(`Error: user with email "${email}" already exists`)
      process.exit(1)
    }
    const passwordHash = await bcrypt.hash(password, 12)
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)').run(
      email,
      passwordHash,
      displayName ?? null
    )
    console.log(`User created: ${email}${displayName ? ` (${displayName})` : ''}`)
  }
}

main().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
