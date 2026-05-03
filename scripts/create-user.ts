import 'dotenv/config'
import bcrypt from 'bcrypt'
import { getDb } from '../src/db'

async function main() {
  const args = process.argv.slice(2)
  const update = args[0] === '--update'
  const [email, password] = update ? args.slice(1) : args

  if (!email || !password) {
    console.error('Usage:')
    console.error('  npm run create-user -- <email> <password>')
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
    db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash)
    console.log(`User created: ${email}`)
  }
}

main().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
