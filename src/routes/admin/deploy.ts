import { Hono } from 'hono'
import { runDeploy } from '../../lib/deploy'
import type { AppEnv } from '../../types'

export function createAdminDeployRouter() {
  const router = new Hono<AppEnv>()

  // POST /api/admin/deploy — trigger a server deploy (admin-only via parent middleware)
  router.post('/', (c) => {
    console.log(`[deploy] Manual trigger by userId=${c.get('userId')}`)
    runDeploy('admin')
    return c.text('Deploy triggered', 202)
  })

  return router
}
