/**
 * Sinkhole Fair rules: a hole drives around a fairground and swallows what is smaller than it.
 * Pure and deterministic (seeded RNG, no Phaser, no DOM): the scene only renders and feeds input.
 * Numbers are tuning knobs, not facts about any original game.
 */

export const MAP_SIZE = 3000
/** Classic round length; solo is shorter (see roundMs). */
export const ROUND_MS = 120_000
export const SOLO_ROUND_MS = 60_000
export const roundMs = (mode: Mode): number => (mode === 'solo' ? SOLO_ROUND_MS : ROUND_MS)
export const TIER_COUNT = 8
export const MAX_LEVEL = TIER_COUNT + 1
export const BASE_RADIUS = 24
export const GROWTH = 1.3
/** Radius ratio a hole needs over another to swallow it. */
export const EAT_RATIO = 1.2
export const RESPAWN_MS = 3000
export const INVULN_MS = 2000
export const FALL_MS = 250
/** World units per second per unit of radius, at full stick. */
export const SPEED_PER_RADIUS = 6
/** Extra speed at level 1, fading linearly to none at the top level: small holes are not slow. */
export const EARLY_SPEED_BONUS = 0.7
/** Classic: a swallowed object of tier <= REGROW_MAX_TIER reappears after REGROW_MS, so bots cannot strip the town. */
export const REGROW_MAX_TIER = 3
export const REGROW_MS = 3000
/** A hole below this fraction of the leader's mass earns CATCHUP_GAIN times the mass from objects. */
export const CATCHUP_BELOW = 0.4
export const CATCHUP_GAIN = 2
/** A hole above this many times the others' mean mass (and past level 8) earns only LEADER_BRAKE_GAIN of object points. */
export const LEADER_BRAKE_OVER = 2.5
export const LEADER_BRAKE_GAIN = 0.5
/** Share of its mass a swallowed hole keeps when it respawns. */
export const RESPAWN_KEEP = 0.75
/** Share of a swallowed hole's mass the eater gains. */
export const HOLE_EAT_SHARE = 0.25
/** Radius easing time constant, so growth is seen rather than jumped. */
const GROW_TAU_MS = 100
/** Bots see this many of their own radii. */
export const BOT_SIGHT = 6
export const TOWN_SEED = 20261004

/** Objects per tier (many small, few large), and their points (= tier). */
export const TIER_COUNTS = [280, 160, 80, 40, 22, 12, 7, 4]
export const pointsForTier = (tier: number): number => tier

/** Mass needed for each level, index = level - 1: 0, 10, then x LEVEL_STEP each. */
export const LEVEL_STEP = 1.8
export const LEVEL_MASS: number[] = Array.from({ length: MAX_LEVEL }, (_, i) => (i === 0 ? 0 : Math.round(10 * LEVEL_STEP ** (i - 1))))

export function levelForMass(mass: number): number {
  let level = 1
  for (let l = 2; l <= MAX_LEVEL; l++) if (mass >= LEVEL_MASS[l - 1]) level = l
  return level
}

export const radiusForLevel = (level: number): number => BASE_RADIUS * GROWTH ** (level - 1)
/** An object of tier t is drawn smaller than a level-t hole. */
export const objectRadius = (tier: number): number => Math.round(radiusForLevel(tier) * 0.6)

export type Mode = 'classic' | 'solo'
export type Personality = 'grazer' | 'hunter' | 'coward'
export type Difficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY: Record<Difficulty, { reactMin: number; reactMax: number; hunterChance: number }> = {
  easy: { reactMin: 350, reactMax: 600, hunterChance: 0.15 },
  normal: { reactMin: 200, reactMax: 400, hunterChance: 0.3 },
  hard: { reactMin: 120, reactMax: 250, hunterChance: 0.5 },
}

export const BOT_NAMES = [
  'Wobble', 'Gulpy', 'Crumb', 'Nibbles', 'Dizzy', 'Muncher', 'Pip', 'Bogart', 'Sprocket', 'Tater',
  'Blorp', 'Nacho', 'Gizmo', 'Waffle', 'Chomp', 'Biscuit', 'Fidget', 'Mochi', 'Zonk', 'Pickle',
  'Noodle', 'Bumble', 'Gus', 'Clyde',
]

export interface Obj {
  id: number
  tier: number
  x: number
  y: number
  r: number
  /** Visual variation only. */
  spin: number
  /** Id of the hole eating it, while it falls. */
  fallBy: number | null
  fallMs: number
}

export interface Hole {
  id: number
  name: string
  bot: boolean
  personality: Personality | null
  mass: number
  level: number
  radius: number
  x: number
  y: number
  /** Current input, length 0..1. */
  dirX: number
  dirY: number
  respawnAt: number | null
  invulnUntil: number
  thinkAt: number
  wanderX: number
  wanderY: number
}

export type GameEvent =
  | { type: 'eat'; hole: number; tier: number; points: number; x: number; y: number }
  | { type: 'levelup'; hole: number; level: number }
  | { type: 'swallowed'; victim: number; eater: number }
  | { type: 'respawn'; hole: number }
  | { type: 'end' }

export interface World {
  mode: Mode
  difficulty: Difficulty
  t: number
  over: boolean
  rng: number
  objs: Obj[]
  holes: Hole[]
  totalMass: number
  eatenMass: number
  nextObjId: number
  /** Objects waiting to reappear (classic only). */
  regrow: { tier: number; at: number }[]
  events: GameEvent[]
}

export const PLAYER_ID = 0

/** mulberry32: advances `w.rng`, returns [0, 1). */
export function rand(w: { rng: number }): number {
  w.rng = (w.rng + 0x6d2b79f5) | 0
  let t = w.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const between = (w: { rng: number }, a: number, b: number): number => a + (b - a) * rand(w)

/** Where holes start: the player in the middle, bots on a ring around it. */
export function spawnPoints(count: number): { x: number; y: number }[] {
  const c = MAP_SIZE / 2
  return Array.from({ length: count }, (_, i) => {
    if (i === 0) return { x: c, y: c }
    const a = ((i - 1) / Math.max(1, count - 1)) * Math.PI * 2 + 0.6
    return { x: c + Math.cos(a) * 1050, y: c + Math.sin(a) * 1050 }
  })
}

/** The town: a fixed layout (TOWN_SEED), largest first so big things get room. Positions only; no hole state. */
export function townLayout(spawns: { x: number; y: number }[]): Omit<Obj, 'id' | 'fallBy' | 'fallMs'>[] {
  const g = { rng: TOWN_SEED }
  const placed: Omit<Obj, 'id' | 'fallBy' | 'fallMs'>[] = []
  for (let tier = TIER_COUNT; tier >= 1; tier--) {
    const r = objectRadius(tier)
    for (let n = 0; n < TIER_COUNTS[tier - 1]; n++) {
      for (let tries = 0; tries < 60; tries++) {
        const x = between(g, 120, MAP_SIZE - 120)
        const y = between(g, 120, MAP_SIZE - 120)
        if (spawns.some((s) => Math.hypot(s.x - x, s.y - y) < 170 + r)) continue
        if (placed.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 70)) continue
        placed.push({ tier, x, y, r, spin: rand(g) })
        break
      }
    }
  }
  return placed
}

export interface NewWorldOptions {
  mode: Mode
  seed: number
  difficulty?: Difficulty
  botCount?: number
  playerName?: string
}

export function newWorld(opts: NewWorldOptions): World {
  const { mode, seed, difficulty = 'normal' } = opts
  const w: World = { mode, difficulty, t: 0, over: false, rng: seed, objs: [], holes: [], totalMass: 0, eatenMass: 0, nextObjId: 0, regrow: [], events: [] }
  const botCount = mode === 'solo' ? 0 : Math.min(opts.botCount ?? 4, BOT_NAMES.length)
  const spawns = spawnPoints(botCount + 1)
  // The round seed only nudges the fixed town a little, so rounds differ.
  w.objs = townLayout(spawns).map((o, i) => ({
    ...o,
    id: i,
    x: Math.min(MAP_SIZE - o.r, Math.max(o.r, o.x + between(w, -30, 30))),
    y: Math.min(MAP_SIZE - o.r, Math.max(o.r, o.y + between(w, -30, 30))),
    fallBy: null,
    fallMs: 0,
  }))
  w.nextObjId = w.objs.length
  w.totalMass = w.objs.reduce((s, o) => s + pointsForTier(o.tier), 0)

  const names = [...BOT_NAMES]
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand(w) * (i + 1))
    ;[names[i], names[j]] = [names[j], names[i]]
  }
  const mk = (id: number, name: string, bot: boolean, personality: Personality | null): Hole => ({
    id, name, bot, personality, mass: 0, level: 1, radius: BASE_RADIUS,
    x: spawns[id].x, y: spawns[id].y, dirX: 0, dirY: 0, respawnAt: null, invulnUntil: 0,
    thinkAt: bot ? between(w, 0, DIFFICULTY[difficulty].reactMax) : 0, wanderX: spawns[id].x, wanderY: spawns[id].y,
  })
  w.holes.push(mk(PLAYER_ID, opts.playerName ?? 'You', false, null))
  for (let i = 0; i < botCount; i++) {
    const roll = rand(w)
    const p: Personality = roll < DIFFICULTY[difficulty].hunterChance ? 'hunter' : roll < DIFFICULTY[difficulty].hunterChance + 0.25 ? 'coward' : 'grazer'
    w.holes.push(mk(i + 1, names[i], true, p))
  }
  return w
}

export const isActive = (h: Hole): boolean => h.respawnAt === null
const isVulnerable = (h: Hole, t: number): boolean => isActive(h) && t >= h.invulnUntil

/** Can hole `a` swallow hole `b` (sizes only)? */
export const canEatHole = (a: Hole, b: Hole): boolean => a.radius >= b.radius * EAT_RATIO

const speedOf = (h: Hole): number => h.radius * SPEED_PER_RADIUS * (1 + (EARLY_SPEED_BONUS * (MAX_LEVEL - h.level)) / (MAX_LEVEL - 1))

/** The direction (unit or zero) a bot wants to move, from what it can see. */
function botDirection(w: World, h: Hole): { x: number; y: number } {
  const sight = h.radius * BOT_SIGHT
  const others = w.holes.filter((o) => o.id !== h.id && isActive(o) && Math.hypot(o.x - h.x, o.y - h.y) <= sight)
  const toward = (tx: number, ty: number) => {
    const d = Math.hypot(tx - h.x, ty - h.y) || 1
    return { x: (tx - h.x) / d, y: (ty - h.y) / d }
  }
  // Everyone avoids a hole that could eat them; a coward avoids any larger one.
  const threats = others.filter((o) => (h.personality === 'coward' ? o.radius > h.radius : canEatHole(o, h)))
  if (threats.length) {
    const t = threats.reduce((a, b) => (Math.hypot(a.x - h.x, a.y - h.y) < Math.hypot(b.x - h.x, b.y - h.y) ? a : b))
    const away = toward(t.x, t.y)
    return { x: -away.x, y: -away.y }
  }
  if (h.personality === 'hunter') {
    const prey = others.filter((o) => canEatHole(h, o) && isVulnerable(o, w.t))
    if (prey.length) {
      const p = prey.reduce((a, b) => (Math.hypot(a.x - h.x, a.y - h.y) < Math.hypot(b.x - h.x, b.y - h.y) ? a : b))
      return toward(p.x, p.y)
    }
  }
  let best: Obj | null = null
  let bestScore = Infinity
  for (const o of w.objs) {
    if (o.fallBy !== null || o.tier > h.level) continue
    const d = Math.hypot(o.x - h.x, o.y - h.y)
    if (d > sight) continue
    // A coward prefers food near the map edge, away from the crowd.
    const edge = h.personality === 'coward' ? Math.min(o.x, o.y, MAP_SIZE - o.x, MAP_SIZE - o.y) * 0.5 : 0
    const score = d + edge
    if (score < bestScore) {
      bestScore = score
      best = o
    }
  }
  if (best) return toward(best.x, best.y)
  if (Math.hypot(h.wanderX - h.x, h.wanderY - h.y) < h.radius) {
    h.wanderX = between(w, 150, MAP_SIZE - 150)
    h.wanderY = between(w, 150, MAP_SIZE - 150)
  }
  return toward(h.wanderX, h.wanderY)
}

/** A spot far from bigger holes, away from solid objects. */
function safeSpot(w: World, h: Hole): { x: number; y: number } {
  let best = { x: MAP_SIZE / 2, y: MAP_SIZE / 2 }
  let bestScore = -1
  for (let i = 0; i < 14; i++) {
    const x = between(w, 150, MAP_SIZE - 150)
    const y = between(w, 150, MAP_SIZE - 150)
    let score = Infinity
    for (const o of w.holes) if (o.id !== h.id && isActive(o) && o.radius >= h.radius) score = Math.min(score, Math.hypot(o.x - x, o.y - y) - o.radius)
    if (w.objs.some((o) => o.fallBy === null && Math.hypot(o.x - x, o.y - y) < o.r + 30)) score = Math.min(score, 0)
    if (score > bestScore) {
      bestScore = score
      best = { x, y }
    }
  }
  return best
}

/** Mass gained from an object: boosted for a hole far behind the leader. */
function objectGain(w: World, h: Hole, points: number): number {
  const lead = Math.max(...w.holes.map((o) => o.mass))
  if (h.mass < lead * CATCHUP_BELOW) return Math.round(points * CATCHUP_GAIN)
  // The leader brakes once it is far ahead of the field.
  const others = w.holes.filter((o) => o.id !== h.id)
  const mean = others.reduce((sum, o) => sum + o.mass, 0) / Math.max(1, others.length)
  return h.mass > LEADER_BRAKE_OVER * mean && h.mass > LEVEL_MASS[MAX_LEVEL - 2] ? Math.max(1, Math.round(points * LEADER_BRAKE_GAIN)) : points
}

function addMass(w: World, h: Hole, amount: number): void {
  h.mass += amount
  const level = levelForMass(h.mass)
  if (level > h.level) {
    h.level = level
    w.events.push({ type: 'levelup', hole: h.id, level })
  } else h.level = level
}

/** Put due objects back at a random spot clear of holes and other objects; a blocked one waits. */
function regrowObjects(w: World): void {
  if (!w.regrow.length) return
  w.regrow = w.regrow.filter((q) => {
    if (w.t < q.at) return true
    const r = objectRadius(q.tier)
    for (let tries = 0; tries < 8; tries++) {
      const x = between(w, 120, MAP_SIZE - 120)
      const y = between(w, 120, MAP_SIZE - 120)
      if (w.holes.some((h) => Math.hypot(h.x - x, h.y - y) < h.radius * 2 + r)) continue
      if (w.objs.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 40)) continue
      w.objs.push({ id: w.nextObjId++, tier: q.tier, x, y, r, spin: rand(w), fallBy: null, fallMs: 0 })
      return false
    }
    return true
  })
}

/** Advance the world by `dtMs` (callers keep it small, <= 50). `player` is the stick, length 0..1. */
export function step(w: World, dtMs: number, player: { x: number; y: number }): void {
  if (w.over) return
  w.events = []
  w.t += dtMs
  const dt = dtMs / 1000
  const react = DIFFICULTY[w.difficulty]

  for (const h of w.holes) {
    if (h.respawnAt !== null && w.t >= h.respawnAt) {
      h.respawnAt = null
      h.invulnUntil = w.t + INVULN_MS
      h.mass = Math.floor(h.mass * RESPAWN_KEEP)
      h.level = levelForMass(h.mass)
      h.radius = radiusForLevel(h.level)
      const s = safeSpot(w, h)
      h.x = s.x
      h.y = s.y
      w.events.push({ type: 'respawn', hole: h.id })
    }
    if (!isActive(h)) continue
    if (h.bot) {
      if (w.t >= h.thinkAt) {
        const d = botDirection(w, h)
        h.dirX = d.x
        h.dirY = d.y
        h.thinkAt = w.t + between(w, react.reactMin, react.reactMax)
      }
    } else {
      const len = Math.hypot(player.x, player.y)
      const k = len > 1 ? 1 / len : 1
      h.dirX = player.x * k
      h.dirY = player.y * k
    }
    h.x = Math.min(MAP_SIZE, Math.max(0, h.x + h.dirX * speedOf(h) * dt))
    h.y = Math.min(MAP_SIZE, Math.max(0, h.y + h.dirY * speedOf(h) * dt))
    // Objects too big to swallow are solid: slide around them.
    for (const o of w.objs) {
      if (o.fallBy !== null || o.tier <= h.level) continue
      const dx = h.x - o.x
      const dy = h.y - o.y
      const d = Math.hypot(dx, dy)
      if (d < o.r) {
        const nx = d === 0 ? 1 : dx / d
        const ny = d === 0 ? 0 : dy / d
        h.x = o.x + nx * o.r
        h.y = o.y + ny * o.r
      }
    }
    // Swallow.
    for (const o of w.objs) {
      if (o.fallBy !== null || o.tier > h.level) continue
      if (Math.hypot(o.x - h.x, o.y - h.y) < h.radius) {
        o.fallBy = h.id
        o.fallMs = 0
        const points = pointsForTier(o.tier)
        w.eatenMass += points
        addMass(w, h, objectGain(w, h, points))
        w.events.push({ type: 'eat', hole: h.id, tier: o.tier, points, x: o.x, y: o.y })
      }
    }
  }

  // Hole vs hole: the bigger rim covering the smaller centre swallows it; the eater gets half its mass.
  for (const a of w.holes) {
    if (!isVulnerable(a, w.t)) continue
    for (const b of w.holes) {
      if (a === b || !isVulnerable(b, w.t) || !canEatHole(a, b)) continue
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.radius) {
        addMass(w, a, Math.floor(b.mass * HOLE_EAT_SHARE))
        b.respawnAt = w.t + RESPAWN_MS
        b.dirX = 0
        b.dirY = 0
        w.events.push({ type: 'swallowed', victim: b.id, eater: a.id })
      }
    }
  }

  for (const o of w.objs) {
    if (o.fallBy === null) continue
    o.fallMs += dtMs
    const eater = w.holes[o.fallBy]
    o.x += (eater.x - o.x) * Math.min(1, dt * 8)
    o.y += (eater.y - o.y) * Math.min(1, dt * 8)
  }
  if (w.mode === 'classic') {
    for (const o of w.objs) if (o.fallBy !== null && o.fallMs >= FALL_MS && o.tier <= REGROW_MAX_TIER) w.regrow.push({ tier: o.tier, at: w.t + REGROW_MS })
  }
  w.objs = w.objs.filter((o) => o.fallBy === null || o.fallMs < FALL_MS)
  regrowObjects(w)

  for (const h of w.holes) {
    const target = radiusForLevel(h.level)
    h.radius += (target - h.radius) * (1 - Math.exp(-dtMs / GROW_TAU_MS))
  }

  const allEaten = w.eatenMass >= w.totalMass
  if (w.t >= roundMs(w.mode) || (w.mode === 'solo' && allEaten)) {
    w.over = true
    w.events.push({ type: 'end' })
  }
}

/** Holes ranked by mass, biggest first. */
export function standings(w: World): Hole[] {
  return [...w.holes].sort((a, b) => b.mass - a.mass || a.id - b.id)
}

export const percentEaten = (w: World): number => (w.totalMass === 0 ? 0 : (100 * w.eatenMass) / w.totalMass)

/** Classic: mass at the end. Solo: tenths of a percent of the city eaten, plus a second-for-second bonus for clearing it early. */
export function finalScore(w: World): number {
  if (w.mode === 'classic') return w.holes[PLAYER_ID].mass
  const cleared = w.eatenMass >= w.totalMass
  return Math.round(percentEaten(w) * 10) + (cleared ? Math.ceil((roundMs(w.mode) - w.t) / 1000) : 0)
}
