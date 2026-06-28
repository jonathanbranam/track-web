import { Hono } from 'hono'
import { createRequireAdminMiddleware } from '../../middleware/auth'
import { createAdminDeployRouter } from './deploy'
import { createAdminBackupsRouter } from './backups'
import { createAdminUsersRouter } from './users'
import { createAdminLogsRouter } from './logs'
import { createAdminGamesRouter } from './games'
import { createAdminInvitesRouter } from './invites'
import type { IUserRepository, IGameRoomRepository, ISessionRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

export function createAdminRouter(userRepo: IUserRepository, gameRoomRepo: IGameRoomRepository, sessionRepo: ISessionRepository) {
  const router = new Hono<AppEnv>()

  // Every admin route requires a valid session AND userId === 1.
  router.use('/*', createRequireAdminMiddleware(sessionRepo))

  router.route('/deploy', createAdminDeployRouter())
  router.route('/backups', createAdminBackupsRouter())
  router.route('/users', createAdminUsersRouter(userRepo))
  router.route('/logs', createAdminLogsRouter())
  router.route('/games', createAdminGamesRouter(gameRoomRepo, userRepo))
  router.route('/invites', createAdminInvitesRouter())

  return router
}
