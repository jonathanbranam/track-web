import 'dotenv/config'
import bcrypt from 'bcrypt'
import { getDb } from '../src/db'

async function main() {
  const [email, password] = process.argv.slice(2)

  if (!email || !password) {
    console.error('Usage: npm run create-user -- <email> <password>')
    process.exit(1)
  }

  const db = getDb()

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    console.error(`Error: user with email "${email}" already exists`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash)

  console.log(`User created: ${email}`)
}

main().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
