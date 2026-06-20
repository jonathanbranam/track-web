import { Hono } from 'hono'
import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '../env'
import { runDeploy } from '../lib/deploy'
import type { AppEnv } from '../types'

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

  return router
}
