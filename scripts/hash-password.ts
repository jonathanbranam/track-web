import bcrypt from 'bcrypt'
import { createInterface } from 'readline'

const rl = createInterface({ input: process.stdin, output: process.stdout })

rl.question('Enter password to hash: ', async (password) => {
  rl.close()
  if (!password) {
    console.error('Error: Password cannot be empty.')
    process.exit(1)
  }
  const hash = await bcrypt.hash(password, 12)
  console.log(hash)
})
