import { Hono } from 'hono'
import { createRequireAdminMiddleware } from '../../middleware/auth'
import { createAdminDeployRouter } from './deploy'
import { createAdminBackupsRouter } from './backups'
import { createAdminUsersRouter } from './users'
import { createAdminLogsRouter } from './logs'
import type { IUserRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

export function createAdminRouter(userRepo: IUserRepository) {
  const router = new Hono<AppEnv>()

  // Every admin route requires a valid session AND userId === 1.
  router.use('/*', createRequireAdminMiddleware(userRepo))

  router.route('/deploy', createAdminDeployRouter())
  router.route('/backups', createAdminBackupsRouter())
  router.route('/users', createAdminUsersRouter(userRepo))
  router.route('/logs', createAdminLogsRouter())

  return router
}
