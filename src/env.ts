import 'dotenv/config'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    console.error(`Error: Missing required environment variable: ${key}`)
    process.exit(1)
  }
  return value
}

export const env = {
  EMAIL: requireEnv('EMAIL'),
  PASSWORD_HASH: requireEnv('PASSWORD_HASH'),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  SQLITE_PATH: process.env.SQLITE_PATH ?? 'data.db',
  isProd: process.env.NODE_ENV === 'production',
}
