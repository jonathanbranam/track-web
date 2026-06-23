import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import type { IUserRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

const displayNameSchema = z.object({
  displayName: z.string().min(1).max(100),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
})

export function createUsersRouter(userRepo: IUserRepository) {
  const router = new Hono<AppEnv>()

  router.put('/me/display-name', zValidator('json', displayNameSchema), (c) => {
    const userId = c.get('userId')
    const { displayName } = c.req.valid('json')
    userRepo.updateDisplayName(userId, displayName)
    return c.json({ displayName })
  })

  router.put('/me/password', zValidator('json', passwordSchema), async (c) => {
    const userId = c.get('userId')
    const { currentPassword, newPassword } = c.req.valid('json')
    const user = userRepo.findById(userId)
    if (!user) return c.json({ error: 'Not found' }, 404)

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return c.json({ error: 'Current password is incorrect.' }, 401)

    const newHash = await bcrypt.hash(newPassword, 12)
    userRepo.updatePassword(userId, newHash)
    return c.body(null, 204)
  })

  return router
}
