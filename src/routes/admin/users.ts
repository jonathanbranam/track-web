import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import type { IUserRepository } from '../../repositories/interfaces'
import type { AppEnv } from '../../types'

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().min(1).optional(),
})

const passwordSchema = z.object({
  password: z.string().min(1),
})

export function createAdminUsersRouter(userRepo: IUserRepository) {
  const router = new Hono<AppEnv>()

  router.get('/', (c) => c.json({ users: userRepo.listAll() }))

  router.post('/', zValidator('json', createSchema), (c) => {
    const { email, password, displayName } = c.req.valid('json')
    if (userRepo.findByEmail(email)) {
      return c.json({ error: 'A user with that email already exists' }, 409)
    }
    const passwordHash = bcrypt.hashSync(password, 12)
    const user = userRepo.createUser(email, passwordHash, displayName ?? null)
    return c.json(user, 201)
  })

  router.delete('/:id', (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'Invalid id' }, 400)
    if (id === 1) return c.json({ error: 'Cannot delete the owner account' }, 400)
    const deleted = userRepo.deleteUser(id)
    if (!deleted) return c.json({ error: 'User not found' }, 404)
    return c.json({ deleted: true })
  })

  router.put('/:id/password', zValidator('json', passwordSchema), (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'Invalid id' }, 400)
    const passwordHash = bcrypt.hashSync(c.req.valid('json').password, 12)
    const updated = userRepo.updatePassword(id, passwordHash)
    if (!updated) return c.json({ error: 'User not found' }, 404)
    return c.json({ updated: true })
  })

  return router
}
