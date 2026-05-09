import { Hono } from 'hono'
import { createHmac, timingSafeEqual } from 'crypto'
import { spawn } from 'child_process'
import { resolve } from 'path'
import { env } from '../env'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv } from '../types'

const SCRIPT = resolve(__dirname, '..', '..', '..', 'server-deploy.sh')

function runDeploy() {
  spawn('bash', [SCRIPT], { detached: true, stdio: 'ignore' }).unref()
}

export function createDeployRouter() {
  const router = new Hono<AppEnv>()

  // GitHub webhook — HMAC-SHA256 verified, no session auth
  router.post('/', async (c) => {
    if (!env.DEPLOY_SECRET) return c.text('Not configured', 503)
    const sig = c.req.header('x-hub-signature-256') ?? ''
    const body = await c.req.text()
    const expected = 'sha256=' + createHmac('sha256', env.DEPLOY_SECRET).update(body).digest('hex')
    if (sig.length !== expected.length) return c.text('Forbidden', 403)
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return c.text('Forbidden', 403)

    const payload = JSON.parse(body)
    if (payload.ref !== 'refs/heads/main') return c.text('OK', 200)

    runDeploy()
    return c.text('Deploy triggered', 202)
  })

  // Admin UI trigger — session auth + admin-only check
  router.use('/trigger', authMiddleware)
  router.post('/trigger', (c) => {
    if (c.get('userId') !== 1) return c.text('Forbidden', 403)
    runDeploy()
    return c.text('Deploy triggered', 202)
  })

  return router
}
