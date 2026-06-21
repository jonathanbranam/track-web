import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IGameRoomRepository, RoomStatus } from '../../repositories/interfaces'
import type { IUserRepository } from '../../repositories/interfaces'
import { generateRoomCode } from '../../repositories/sqlite/gameRooms'
import type { AppEnv } from '../../types'

const VALID_STATUSES: RoomStatus[] = ['waiting', 'active', 'finished', 'canceled']

const createRoomSchema = z.object({
  slug: z.string().min(1),
  userEmail: z.string().email(),
  players: z.number().int().min(2).max(20),
  name: z.string().min(1).max(80),
})

export function createAdminGamesRouter(gameRoomRepo: IGameRoomRepository, userRepo: IUserRepository) {
  const router = new Hono<AppEnv>()

  // GET /api/admin/games/rooms?slug=<slug>[&status=<status>]
  router.get('/rooms', (c) => {
    const slug = c.req.query('slug')
    if (!slug) return c.json({ error: 'slug query param is required' }, 400)
    const statusParam = c.req.query('status') as RoomStatus | undefined
    let statuses: RoomStatus[] | undefined
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam)) {
        return c.json({ error: `Invalid status; must be one of: ${VALID_STATUSES.join(', ')}` }, 400)
      }
      statuses = [statusParam]
    }
    const rooms = gameRoomRepo.listRooms(slug, statuses)
    return c.json({ rooms })
  })

  // POST /api/admin/games/rooms — create room as a given user
  router.post('/rooms', zValidator('json', createRoomSchema, (result, c) => {
    if (!result.success) return c.json({ error: result.error.flatten() }, 400)
  }), (c) => {
    const { slug, userEmail, players, name } = c.req.valid('json')
    const user = userRepo.findByEmail(userEmail)
    if (!user) return c.json({ error: `No user found with email: ${userEmail}` }, 404)
    let roomCode: string
    for (let i = 0; i < 10; i++) {
      const code = generateRoomCode()
      if (!gameRoomRepo.roomCodeExists(code)) { roomCode = code; break }
    }
    roomCode ??= generateRoomCode() // fallback (collision probability negligible)
    const room = gameRoomRepo.createRoom({
      gameSlug: slug,
      hostUserId: user.id,
      desiredPlayers: players,
      name,
      customDetails: null,
      roomCode: roomCode!,
    })
    return c.json({ room }, 201)
  })

  // POST /api/admin/games/rooms/:code/cancel
  router.post('/rooms/:code/cancel', (c) => {
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    if (room.status !== 'waiting') {
      return c.json({ error: 'Only waiting rooms can be canceled' }, 409)
    }
    const updated = gameRoomRepo.setStatus(room.id, 'canceled')
    return c.json({ room: updated })
  })

  // POST /api/admin/games/rooms/:code/end
  router.post('/rooms/:code/end', (c) => {
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    if (room.status !== 'active') {
      return c.json({ error: 'Only active games can be ended' }, 409)
    }
    const updated = gameRoomRepo.setStatus(room.id, 'finished')
    return c.json({ room: updated })
  })

  // GET /api/admin/games/rooms/:code/players
  router.get('/rooms/:code/players', (c) => {
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    return c.json({ players: room.players, roomCode: code })
  })

  return router
}
