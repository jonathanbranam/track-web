import 'dotenv/config'

export const env = {
  DEPLOY_SECRET: process.env.DEPLOY_SECRET,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  SQLITE_PATH: process.env.SQLITE_PATH ?? 'data.db',
  isProd: process.env.NODE_ENV === 'production',
}
