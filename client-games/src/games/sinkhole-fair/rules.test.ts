import { describe, expect, it } from 'vitest'
import {
  BASE_RADIUS, EAT_RATIO, INVULN_MS, LEVEL_MASS, MAP_SIZE, MAX_LEVEL, PLAYER_ID, RESPAWN_MS, ROUND_MS, SOLO_ROUND_MS, TIER_COUNTS,
  EARLY_SPEED_BONUS, REGROW_MAX_TIER, REGROW_MS, finalScore, levelForMass, newWorld, objectRadius, percentEaten, radiusForLevel, standings, step,
  type Obj, type World,
} from './rules'

const none = { x: 0, y: 0 }

/** A bare world: one object-free player, optionally with extra objects. */
function bare(mode: 'classic' | 'solo' = 'solo'): World {
  const w = newWorld({ mode, seed: 1 })
  w.objs = []
  w.totalMass = 100
  return w
}
const obj = (id: number, tier: number, x: number, y: number): Obj => ({ id, tier, x, y, r: objectRadius(tier), spin: 0, fallBy: null, fallMs: 0 })

describe('levels', () => {
  it('level is a step function of mass, 1.8x per step', () => {
    expect(levelForMass(0)).toBe(1)
    expect(levelForMass(9)).toBe(1)
    expect(levelForMass(10)).toBe(2)
    expect(levelForMass(17)).toBe(2)
    expect(levelForMass(18)).toBe(3)
    expect(levelForMass(1e6)).toBe(MAX_LEVEL)
    expect(LEVEL_MASS).toHaveLength(MAX_LEVEL)
  })
  it('radius is 24 at level 1 and grows about 30% a level', () => {
    expect(radiusForLevel(1)).toBe(BASE_RADIUS)
    expect(radiusForLevel(2) / radiusForLevel(1)).toBeCloseTo(1.3)
  })
  it('the town holds enough mass to reach the top level', () => {
    const total = TIER_COUNTS.reduce((s, n, i) => s + n * (i + 1), 0)
    expect(total).toBeGreaterThan(LEVEL_MASS[MAX_LEVEL - 1] * 2)
  })
})

describe('world', () => {
  it('places every tier, apart from the spawn points, and differs a little between seeds', () => {
    const a = newWorld({ mode: 'classic', seed: 1 })
    const b = newWorld({ mode: 'classic', seed: 2 })
    expect(new Set(a.objs.map((o) => o.tier)).size).toBe(8)
    expect(a.objs.length).toBe(b.objs.length)
    expect(a.objs[0].x).not.toBe(b.objs[0].x)
    expect(Math.abs(a.objs[0].x - b.objs[0].x)).toBeLessThan(61)
    const p = a.holes[PLAYER_ID]
    expect(a.objs.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.r + p.radius)).toBe(false)
  })
  it('classic has bots with distinct names, solo has none', () => {
    const c = newWorld({ mode: 'classic', seed: 3, botCount: 5 })
    expect(c.holes.filter((h) => h.bot)).toHaveLength(5)
    expect(new Set(c.holes.map((h) => h.name)).size).toBe(6)
    expect(newWorld({ mode: 'solo', seed: 3 }).holes).toHaveLength(1)
  })
})

describe('swallowing', () => {
  it('swallows an object of tier <= level whose centre is in the hole, and gains its points', () => {
    const w = bare()
    const p = w.holes[0]
    w.objs = [obj(0, 1, p.x + 10, p.y), obj(1, 1, p.x + 200, p.y)]
    step(w, 16, none)
    expect(w.objs[0].fallBy).toBe(PLAYER_ID)
    expect(w.objs[1].fallBy).toBeNull()
    expect(p.mass).toBe(1)
    expect(w.events.some((e) => e.type === 'eat')).toBe(true)
  })
  it('leaves a bigger object solid and slides around it', () => {
    const w = bare()
    const p = w.holes[0]
    const big = obj(0, 3, p.x + 60, p.y)
    w.objs = [big]
    for (let i = 0; i < 60; i++) step(w, 16, { x: 1, y: 0 })
    expect(big.fallBy).toBeNull()
    expect(Math.hypot(p.x - big.x, p.y - big.y)).toBeGreaterThanOrEqual(big.r - 0.001)
  })
  it('grows a level, then eats the tier it could not before', () => {
    const w = bare()
    const p = w.holes[0]
    w.objs = [obj(0, 2, p.x + 5, p.y)]
    step(w, 16, none)
    expect(w.objs[0].fallBy).toBeNull()
    p.mass = 9
    w.objs.push(obj(1, 1, p.x - 5, p.y))
    step(w, 16, none)
    expect(p.level).toBe(2)
    step(w, 16, none)
    expect(w.objs[0].fallBy).toBe(PLAYER_ID)
  })
  it('removes an object once it has fallen', () => {
    const w = bare()
    const p = w.holes[0]
    w.objs = [obj(0, 1, p.x, p.y)]
    for (let i = 0; i < 30; i++) step(w, 16, none)
    expect(w.objs).toHaveLength(0)
  })
  it('stays inside the map', () => {
    const w = bare()
    for (let i = 0; i < 400; i++) step(w, 16, { x: -1, y: -1 })
    expect(w.holes[0].x).toBeGreaterThanOrEqual(0)
    expect(w.holes[0].y).toBeGreaterThanOrEqual(0)
    expect(w.holes[0].x).toBeLessThanOrEqual(MAP_SIZE)
  })
})

describe('hole vs hole', () => {
  function duel(): { w: World; big: World['holes'][0]; small: World['holes'][0] } {
    const w = newWorld({ mode: 'classic', seed: 5, botCount: 1 })
    w.objs = []
    w.totalMass = 100
    const [big, small] = w.holes
    big.mass = 100
    big.level = levelForMass(100)
    big.radius = radiusForLevel(big.level)
    small.mass = 20
    small.level = levelForMass(20)
    small.radius = radiusForLevel(small.level)
    small.thinkAt = Infinity
    small.x = big.x + 5
    small.y = big.y
    return { w, big, small }
  }
  it('swallows a hole 1.2x smaller when the centre is under the rim; eater gets a quarter of its mass', () => {
    const { w, big, small } = duel()
    expect(big.radius).toBeGreaterThanOrEqual(small.radius * EAT_RATIO)
    big.invulnUntil = small.invulnUntil = 0
    step(w, 16, none)
    expect(small.respawnAt).not.toBeNull()
    expect(big.mass).toBe(105)
  })
  it('does not swallow a hole that is not 1.2x smaller', () => {
    const { w, big, small } = duel()
    small.mass = 90
    small.level = big.level
    small.radius = big.radius
    step(w, 16, none)
    expect(small.respawnAt).toBeNull()
    expect(big.mass).toBe(100)
  })
  it('respawns after 3 s at 75% of its mass, invulnerable for 2 s', () => {
    const { w, small } = duel()
    step(w, 16, none)
    expect(small.respawnAt).not.toBeNull()
    for (let t = 0; t < RESPAWN_MS + 50; t += 50) step(w, 50, none)
    expect(small.respawnAt).toBeNull()
    expect(small.mass).toBe(15)
    expect(small.invulnUntil).toBeGreaterThan(w.t)
    expect(small.invulnUntil - w.t).toBeLessThanOrEqual(INVULN_MS)
  })
  it('an invulnerable hole cannot be eaten', () => {
    const { w, big, small } = duel()
    small.invulnUntil = 5000
    step(w, 16, none)
    expect(small.respawnAt).toBeNull()
    expect(big.mass).toBe(100)
  })
})

describe('bots', () => {
  it('a grazer heads for food it can see', () => {
    const w = newWorld({ mode: 'classic', seed: 7, botCount: 1 })
    const bot = w.holes[1]
    bot.personality = 'grazer'
    bot.x = 500
    bot.y = 500
    w.objs = [obj(0, 1, 600, 500)]
    w.holes[0].x = 2800
    w.holes[0].y = 2800
    bot.thinkAt = 0
    step(w, 16, none)
    expect(bot.dirX).toBeGreaterThan(0.9)
  })
  it('flees a hole that could eat it', () => {
    const w = newWorld({ mode: 'classic', seed: 7, botCount: 1 })
    const bot = w.holes[1]
    bot.personality = 'grazer'
    bot.x = 500
    bot.y = 500
    const me = w.holes[0]
    me.mass = 51
    me.level = levelForMass(51)
    me.radius = radiusForLevel(me.level)
    me.x = 400
    me.y = 500
    w.objs = [obj(0, 1, 300, 500)]
    bot.thinkAt = 0
    step(w, 16, none)
    expect(bot.dirX).toBeGreaterThan(0.9)
  })
  it('a hunter chases a smaller hole', () => {
    const w = newWorld({ mode: 'classic', seed: 7, botCount: 1 })
    const bot = w.holes[1]
    bot.personality = 'hunter'
    bot.mass = 200
    bot.level = levelForMass(200)
    bot.radius = radiusForLevel(bot.level)
    bot.x = 500
    bot.y = 500
    w.holes[0].x = 500
    w.holes[0].y = 800
    w.objs = []
    bot.thinkAt = 0
    step(w, 16, none)
    expect(bot.dirY).toBeGreaterThan(0.9)
  })
})

describe('round and scoring', () => {
  it('ends at 120 s and ranks by mass', () => {
    const w = newWorld({ mode: 'classic', seed: 9 })
    w.holes[2].mass = 50
    w.holes[1].mass = 5
    expect(standings(w)[0].id).toBe(2)
    while (!w.over) step(w, 50, none)
    expect(w.t).toBeGreaterThanOrEqual(ROUND_MS)
    expect(w.events.some((e) => e.type === 'end')).toBe(true)
  })
  it('classic scores mass', () => {
    const w = newWorld({ mode: 'classic', seed: 9 })
    w.holes[0].mass = 42
    expect(finalScore(w)).toBe(42)
  })
  it('solo scores tenths of a percent eaten, and ends early when the city is gone', () => {
    const w = bare('solo')
    w.totalMass = 4
    const p = w.holes[0]
    w.objs = [obj(0, 1, p.x, p.y), obj(1, 1, p.x + 5, p.y), obj(2, 1, p.x - 5, p.y), obj(3, 1, p.x, p.y + 5)]
    step(w, 1000, none)
    expect(percentEaten(w)).toBe(100)
    expect(w.over).toBe(true)
    expect(finalScore(w)).toBe(1000 + Math.ceil((SOLO_ROUND_MS - 1000) / 1000))
  })
})

describe('tuning', () => {
  it('solo and classic are both two minutes', () => {
    expect(SOLO_ROUND_MS).toBe(120_000)
    const s = newWorld({ mode: 'solo', seed: 1 })
    while (!s.over) step(s, 50, none)
    expect(s.t).toBeGreaterThanOrEqual(SOLO_ROUND_MS)
    expect(s.t).toBeLessThanOrEqual(ROUND_MS + 50)
  })
  it('level 1 has plenty to eat and moves faster than the plain speed', () => {
    expect(TIER_COUNTS[0]).toBeGreaterThanOrEqual(250)
    const w = bare()
    const p = w.holes[0]
    const x = p.x
    step(w, 1000, { x: 1, y: 0 })
    expect(p.x - x).toBeCloseTo(BASE_RADIUS * 6 * (1 + EARLY_SPEED_BONUS), 0)
  })
  it('small objects grow back in classic', () => {
    const w = newWorld({ mode: 'classic', seed: 1, botCount: 0 })
    const p = w.holes[0]
    const before = w.objs.length
    w.objs.push(obj(9999, 1, p.x, p.y))
    step(w, 50, none)
    step(w, 300, none)
    expect(w.objs.length).toBe(before)
    for (let t = 0; t < REGROW_MS + 500; t += 50) step(w, 50, none)
    expect(w.objs.length).toBe(before + 1)
  })
  it('a hole far behind the leader gains extra from objects', () => {
    const w = bare('classic')
    w.holes[1].mass = 100
    w.holes[0].mass = 0
    w.objs = [obj(0, 1, w.holes[0].x, w.holes[0].y)]
    w.holes[1].x = 0
    w.holes[1].y = 0
    step(w, 16, none)
    expect(w.holes[0].mass).toBe(2)
  })
})

describe('leader brake', () => {
  it('a far-ahead top-level hole earns half from objects', () => {
    const w = bare('classic')
    w.holes[0].mass = 1000
    w.holes[0].level = MAX_LEVEL
    w.holes[1].x = 0
    w.holes[1].y = 0
    w.objs = [obj(0, 2, w.holes[0].x, w.holes[0].y)]
    step(w, 16, none)
    expect(w.holes[0].mass).toBe(1001)
  })
})

describe('bots-only simulation', () => {
  it('food lasts and no bot runs away with the round', () => {
    const leads: number[] = []
    const lows: number[] = []
    const smallLeft: number[] = []
    const small = (w: World) => w.objs.filter((o) => o.tier <= REGROW_MAX_TIER).length
    for (let seed = 1; seed <= 12; seed++) {
      const w = newWorld({ mode: 'classic', seed, botCount: 5 })
      const start = small(w)
      while (!w.over) {
        step(w, 50, none)
        if (w.t === ROUND_MS / 2) smallLeft.push(small(w) / start)
      }
      const m = standings(w).map((h) => h.mass).slice(0, -1) // the idle player (id 0) sits out
      leads.push(m[0])
      lows.push(m[m.length - 1])
    }
    const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length
    // At midgame, most small things are still on the map, and the best bot is nowhere near ten times the worst.
    expect(avg(smallLeft)).toBeGreaterThan(0.6)
    expect(avg(leads) / Math.max(1, avg(lows))).toBeLessThan(10)
  })
})
