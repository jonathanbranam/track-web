import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../db'
import { SqliteUserRepository } from './user.repository'
import { SqliteScoreGameRepository } from './scoreGame.repository'

function setup() {
  const db = new Database(':memory:')
  migrate(db)
  const userRepo = new SqliteUserRepository(db)
  const repo = new SqliteScoreGameRepository(db)
  const owner = userRepo.upsert('owner@example.com', 'x')
  const other = userRepo.upsert('other@example.com', 'x')
  return { db, repo, ownerId: owner.id, otherId: other.id }
}

describe('SqliteScoreGameRepository', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => { ctx = setup() })

  it('seeds the remembered game names', () => {
    const names = ctx.repo.listGameNames()
    expect(names).toEqual(expect.arrayContaining(['Sushi Go', 'Tides of Time', 'Pit', 'Farkle', 'Uno']))
  })

  it('creates a game with players and remembers a new name', () => {
    const game = ctx.repo.createGame({
      userId: ctx.ownerId,
      name: 'Catan',
      targetRounds: 3,
      players: [{ name: 'Alice' }, { userId: ctx.otherId, name: 'Bob' }],
    })
    expect(game.status).toBe('active')
    expect(game.targetRounds).toBe(3)
    expect(game.players.map(p => p.name)).toEqual(['Alice', 'Bob'])
    expect(game.players[1].userId).toBe(ctx.otherId)
    expect(game.players[0].userId).toBeNull()
    expect(ctx.repo.listGameNames()).toContain('Catan')
  })

  it('creates an unlimited game when targetRounds is null', () => {
    const game = ctx.repo.createGame({
      userId: ctx.ownerId, name: 'Pit', targetRounds: null,
      players: [{ name: 'A' }, { name: 'B' }],
    })
    expect(game.targetRounds).toBeNull()
  })

  it('does not add a duplicate name (case/space insensitive)', () => {
    ctx.repo.createGame({ userId: ctx.ownerId, name: '  uno  ', targetRounds: null, players: [{ name: 'A' }] })
    const unoCount = ctx.repo.listGameNames().filter(n => n.toLowerCase() === 'uno').length
    expect(unoCount).toBe(1)
  })

  it('records and replaces per-round scores including negatives and zero', () => {
    const game = ctx.repo.createGame({
      userId: ctx.ownerId, name: 'Farkle', targetRounds: null,
      players: [{ name: 'A' }, { name: 'B' }],
    })
    const [pA, pB] = game.players

    let detail = ctx.repo.upsertRound(game.id, ctx.ownerId, 1, [
      { playerId: pA.id, value: -5 },
      { playerId: pB.id, value: 0 },
    ])!
    let r1 = detail.scores.filter(s => s.roundNumber === 1)
    expect(r1.find(s => s.playerId === pA.id)!.value).toBe(-5)
    expect(r1.find(s => s.playerId === pB.id)!.value).toBe(0)

    // Re-submitting the same round replaces the values
    detail = ctx.repo.upsertRound(game.id, ctx.ownerId, 1, [
      { playerId: pA.id, value: 10 },
      { playerId: pB.id, value: 20 },
    ])!
    r1 = detail.scores.filter(s => s.roundNumber === 1)
    expect(r1.find(s => s.playerId === pA.id)!.value).toBe(10)
    expect(r1).toHaveLength(2)
  })

  it('deletes a round without affecting others', () => {
    const game = ctx.repo.createGame({
      userId: ctx.ownerId, name: 'Uno', targetRounds: null, players: [{ name: 'A' }],
    })
    const p = game.players[0]
    ctx.repo.upsertRound(game.id, ctx.ownerId, 1, [{ playerId: p.id, value: 3 }])
    ctx.repo.upsertRound(game.id, ctx.ownerId, 2, [{ playerId: p.id, value: 7 }])
    const detail = ctx.repo.deleteRound(game.id, ctx.ownerId, 1)!
    expect(detail.scores.map(s => s.roundNumber)).toEqual([2])
  })

  it('completes a game, setting status and completed_at', () => {
    const game = ctx.repo.createGame({
      userId: ctx.ownerId, name: 'Uno', targetRounds: null, players: [{ name: 'A' }],
    })
    const done = ctx.repo.completeGame(game.id, ctx.ownerId)!
    expect(done.status).toBe('completed')
    expect(done.completedAt).toBeTruthy()
  })

  it('scopes games to their owner', () => {
    const game = ctx.repo.createGame({
      userId: ctx.ownerId, name: 'Uno', targetRounds: null, players: [{ name: 'A' }],
    })
    expect(ctx.repo.getGame(game.id, ctx.otherId)).toBeNull()
    expect(ctx.repo.upsertRound(game.id, ctx.otherId, 1, [])).toBeNull()
    expect(ctx.repo.completeGame(game.id, ctx.otherId)).toBeNull()
    expect(ctx.repo.listGames(ctx.otherId)).toHaveLength(0)
    expect(ctx.repo.listGames(ctx.ownerId)).toHaveLength(1)
  })

  it('lists active games before completed ones', () => {
    const a = ctx.repo.createGame({ userId: ctx.ownerId, name: 'Uno', targetRounds: null, players: [{ name: 'A' }] })
    ctx.repo.createGame({ userId: ctx.ownerId, name: 'Pit', targetRounds: null, players: [{ name: 'A' }] })
    ctx.repo.completeGame(a.id, ctx.ownerId)
    const games = ctx.repo.listGames(ctx.ownerId)
    expect(games[0].status).toBe('active')
    expect(games[games.length - 1].status).toBe('completed')
  })
})
