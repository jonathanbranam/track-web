import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { IGameRoomRepository } from '../repositories/interfaces'
import { generateRoomCode } from '../repositories/sqlite/gameRooms'
import type { AppEnv } from '../types'

const createRoomSchema = z.object({
  gameSlug: z.string().min(1).max(100),
  desiredPlayers: z.number().int().min(2).max(20),
  name: z.string().min(1).max(80),
  customDetails: z.unknown().optional().nullable(),
})

function makeRoomCode(repo: IGameRoomRepository): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode()
    if (!repo.roomCodeExists(code)) return code
  }
  throw new Error('Failed to generate unique room code after 10 attempts')
}

export function createGamesRouter(gameRoomRepo: IGameRoomRepository) {
  const router = new Hono<AppEnv>()

  // POST /api/games/rooms — create room
  router.post('/rooms', zValidator('json', createRoomSchema, (result, c) => {
    if (!result.success) return c.json({ error: result.error.flatten() }, 400)
  }), (c) => {
    const userId = c.get('userId')
    const { gameSlug, desiredPlayers, name, customDetails } = c.req.valid('json')
    const roomCode = makeRoomCode(gameRoomRepo)
    const room = gameRoomRepo.createRoom({
      gameSlug,
      hostUserId: userId,
      desiredPlayers,
      name,
      customDetails: customDetails ?? null,
      roomCode,
    })
    return c.json(room, 201)
  })

  // GET /api/games/rooms?slug= — list waiting + active rooms
  router.get('/rooms', (c) => {
    const slug = c.req.query('slug')
    if (!slug) return c.json({ error: 'slug query param is required' }, 400)
    const rooms = gameRoomRepo.listRooms(slug)
    return c.json(rooms)
  })

  // GET /api/games/rooms/:code — single room detail
  router.get('/rooms/:code', (c) => {
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    return c.json(room)
  })

  // POST /api/games/rooms/:code/join
  router.post('/rooms/:code/join', (c) => {
    const userId = c.get('userId')
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    if (room.status !== 'waiting') {
      return c.json({ error: 'Room is not waiting for players' }, 409)
    }
    const alreadyJoined = room.players.some(p => p.id === userId)
    if (alreadyJoined) return c.json({ error: 'Already in this room' }, 409)
    if (room.players.length >= room.desiredPlayers) {
      return c.json({ error: 'Room is full' }, 409)
    }
    const joinOrder = room.players.length + 1
    gameRoomRepo.addPlayer(room.id, userId, joinOrder)
    const updated = gameRoomRepo.getRoom(code)!
    return c.json(updated)
  })

  // POST /api/games/rooms/:code/start
  router.post('/rooms/:code/start', (c) => {
    const userId = c.get('userId')
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    if (room.host.id !== userId) return c.json({ error: 'Only the host can start the game' }, 403)
    if (room.status !== 'waiting') {
      return c.json({ error: 'Room is not in waiting status' }, 409)
    }
    if (room.players.length < 2) {
      return c.json({ error: 'At least 2 players required to start' }, 409)
    }
    const updated = gameRoomRepo.setStarted(room.id, new Date().toISOString())
    return c.json(updated)
  })

  // POST /api/games/rooms/:code/cancel
  router.post('/rooms/:code/cancel', (c) => {
    const userId = c.get('userId')
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    if (room.host.id !== userId) return c.json({ error: 'Only the host can cancel the room' }, 403)
    if (room.status !== 'waiting') {
      return c.json({ error: 'Only waiting rooms can be canceled' }, 409)
    }
    const updated = gameRoomRepo.setStatus(room.id, 'canceled')
    return c.json(updated)
  })

  // POST /api/games/rooms/:code/end
  router.post('/rooms/:code/end', (c) => {
    const userId = c.get('userId')
    const code = c.req.param('code')
    const room = gameRoomRepo.getRoom(code)
    if (!room) return c.json({ error: 'Room not found' }, 404)
    const isParticipant = room.players.some(p => p.id === userId)
    if (!isParticipant) return c.json({ error: 'Only room participants can end the game' }, 403)
    if (room.status !== 'active') {
      return c.json({ error: 'Only active games can be ended' }, 409)
    }
    const updated = gameRoomRepo.setStatus(room.id, 'finished')
    return c.json(updated)
  })

  return router
}
