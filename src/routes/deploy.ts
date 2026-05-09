import { Hono } from 'hono'
import { createHmac, timingSafeEqual } from 'crypto'
import { spawn } from 'child_process'
import { resolve } from 'path'
import { mkdirSync, openSync } from 'fs'
import { env } from '../env'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv } from '../types'

const APP_DIR = resolve(__dirname, '..', '..', '..')
const SCRIPT = resolve(APP_DIR, 'server-deploy.sh')
const LOG_DIR = resolve(APP_DIR, 'logs')
const LOG_FILE = resolve(LOG_DIR, 'deploy.log')

function runDeploy(trigger: string) {
  console.log(`[deploy] Starting deploy (trigger: ${trigger})`)
  mkdirSync(LOG_DIR, { recursive: true })
  const fd = openSync(LOG_FILE, 'a')
  const child = spawn('bash', [SCRIPT], {
    detached: true,
    stdio: ['ignore', fd, fd],
    env: { ...process.env, APP_DIR },
  })
  child.on('error', (err) => console.error(`[deploy] spawn error: ${err.message}`))
  child.unref()
}

export function createDeployRouter() {
  const router = new Hono<AppEnv>()

  // GitHub webhook — HMAC-SHA256 verified, no session auth
  router.post('/', async (c) => {
    console.log('[deploy] Webhook received')
    if (!env.DEPLOY_SECRET) {
      console.log('[deploy] DEPLOY_SECRET not configured')
      return c.text('Not configured', 503)
    }
    const sig = c.req.header('x-hub-signature-256') ?? ''
    const body = await c.req.text()
    const expected = 'sha256=' + createHmac('sha256', env.DEPLOY_SECRET).update(body).digest('hex')
    if (sig.length !== expected.length) {
      console.log('[deploy] Webhook signature length mismatch')
      return c.text('Forbidden', 403)
    }
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      console.log('[deploy] Webhook signature invalid')
      return c.text('Forbidden', 403)
    }

    const payload = JSON.parse(body)
    console.log(`[deploy] Webhook verified, ref=${payload.ref}`)
    if (payload.ref !== 'refs/heads/main') return c.text('OK', 200)

    runDeploy('github-webhook')
    return c.text('Deploy triggered', 202)
  })

  // Admin UI trigger — session auth + admin-only check
  router.use('/trigger', authMiddleware)
  router.post('/trigger', (c) => {
    console.log(`[deploy] Manual trigger by userId=${c.get('userId')}`)
    if (c.get('userId') !== 1) return c.text('Forbidden', 403)
    runDeploy('manual-trigger')
    return c.text('Deploy triggered', 202)
  })

  return router
}
