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
  // Retained as a required var for compatibility; no longer used to sign sessions
  // (web sessions are opaque tokens validated against the sessions table).
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  DEPLOY_SECRET: process.env.DEPLOY_SECRET,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  SQLITE_PATH: process.env.SQLITE_PATH ?? 'data.db',
  isProd: process.env.NODE_ENV === 'production',
}
