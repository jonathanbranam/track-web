import * as Phaser from 'phaser'
import {
  IDLE_AIM,
  canFire,
  hasAim,
  moveAim,
  orbitFrozen,
  pressAim,
  releaseAim,
  releaseAngle,
  resetAim,
  type AimSettings,
  type AimState,
} from './aim'
import { STAR_R, buildCourse, forecastLengthFor, type Course, type Level } from './levels'
import { COURSE_W, DEFAULT_TUNING, VIEW_H, advanceAngle, cloneTuning, displacement, onRing, type Tuning } from './physics'
import { applyShot, startRun, starsCollected, type LevelRun } from './run'
import { scoreBreakdown, type ScoreBreakdown } from './scoring'
import {
  SIM_DT,
  ZONE_ASTEROIDS,
  ZONE_RADIATION,
  simulateShot,
  type Outcome,
  type ShotInput,
  type ShotResult,
} from './shot'

/**
 * Space Golf's Phaser scene. It renders, takes pointer input, and replays shots
 * that the pure simulation has already worked out — it never integrates motion
 * itself, so the forecast and the flight cannot disagree (design §3).
 *
 * React talks to it through methods (loadLevel, restart, fire, setLook, …) and
 * listens on game.events: `hud`, `toast`, `level-complete`, `destroyed`.
 */

export const GAME_W = COURSE_W
export const GAME_H = VIEW_H

/** Registry keys the host sets in preBoot. */
export const INITIAL_TUNING_KEY = 'initialTuning'
export const INITIAL_SETTINGS_KEY = 'initialSettings'

/** Payload of the `hud` event. */
export interface HudState {
  strokes: number
  stars: number
  totalStars: number
  hull: number
  phase: Phase
  power: number
  canFire: boolean
}

export type Phase = 'idle' | 'resting' | 'windup' | 'flight' | 'done'

/** Planned-mode wind-up runs this many times faster than the orbit. */
const WINDUP_SPEED = 3
/** Where the resting planet sits in the view, as a fraction from the top. */
const REST_VIEW_FRAC = 0.62
const CAMERA_EASE = 6
const TRAIL_MAX = 40
const PARTICLE_LIFE = 0.6
const POPUP_LIFE = 1.1
const DAMAGE_FLASH = 0.35

const COLORS = {
  ring: 0xc8dcff,
  lieRing: 0x8effc1,
  forecast: 0xffffff,
  forecastHot: 0xff8a5c,
  lock: 0x8effc1,
  ob: 0xff4d4d,
  star: 0xffd76c,
  ship: 0x7cd4ff,
  wormhole: 0xc084fc,
  wind: 0x7dd3fc,
  radiation: 0xa3e635,
  asteroid: 0x8b7d6b,
  power: 0xffd76c,
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: number
}

interface Flight {
  shot: ShotInput
  result: ShotResult
  /** Fractional step index along result.xs. */
  cursor: number
  /** Next event to apply. */
  nextEvent: number
}

/** Small deterministic PRNG, so a level's asteroid scatter never changes. */
function seeded(seedText: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function tuningKey(t: Tuning): string {
  return JSON.stringify(t)
}

export default class SpaceGolfScene extends Phaser.Scene {
  /** Live tuning object. The tuning panel mutates it in place. */
  tuning: Tuning = cloneTuning(DEFAULT_TUNING)
  settings: AimSettings = { release: 'timed', pause: false }
  /** Set at the end of create(); the host waits for it before calling in. */
  ready = false

  private level: Level | null = null
  private course: Course | null = null
  private courseTuningKey = ''
  private run: LevelRun | null = null
  private phase: Phase = 'idle'

  /** The ship's current angle on the lie's ring. */
  private angle = 0
  private aim: AimState = IDLE_AIM
  /** Power-drag pointer position in screen space, for drawing the pull-back. */
  private dragAt: { x: number; y: number } | null = null

  private forecast: ShotResult | null = null
  private forecastInputs = ''

  private windup: { shot: ShotInput; remaining: number } | null = null
  private flight: Flight | null = null
  /** Stars the current flight has collected so far (shown as gone). */
  private flightStars = new Set<number>()
  private shownHull = 100

  private look = false
  private lookDrag: { startY: number; startScroll: number } | null = null
  /** A wheel scroll holds the camera where the player put it until the next press. */
  private manualScroll = false

  private particles: Particle[] = []
  private trail: { x: number; y: number }[] = []
  private popups: { text: Phaser.GameObjects.Text; life: number; vy: number }[] = []
  private flashLeft = 0

  private bgGfx!: Phaser.GameObjects.Graphics
  private staticGfx!: Phaser.GameObjects.Graphics
  private planetLayer!: Phaser.GameObjects.Container
  private gfx!: Phaser.GameObjects.Graphics
  private labelPool: Phaser.GameObjects.Text[] = []
  private planetTextureKeys: string[] = []
  private lastHud = ''

  constructor() {
    super('SpaceGolfScene')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#070a16')
    this.bgGfx = this.add.graphics()
    this.staticGfx = this.add.graphics()
    this.planetLayer = this.add.container(0, 0)
    this.gfx = this.add.graphics()

    const t = this.registry.get(INITIAL_TUNING_KEY) as Tuning | undefined
    if (t) Object.assign(this.tuning, t)
    const s = this.registry.get(INITIAL_SETTINGS_KEY) as AimSettings | undefined
    if (s) this.settings = { ...s }

    this.drawBackground(VIEW_H, 'idle')

    // Fix 1 (kb/phaser-mobile-input.md): canvas drags go through the scene's own
    // pointer input, never a DOM click off the canvas.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.press(p))
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.drag(p)
    })
    this.input.on('pointerup', () => this.release())
    // windowEvents: false (Fix 2) removes the window-level listener, so a release
    // outside the canvas may never arrive as 'pointerup'. update() also recovers.
    this.input.on('pointerupoutside', () => this.release())
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.wheel(dy))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearPlanetTextures())
    this.ready = true
  }

  // ─── Host API ───────────────────────────────────────────────────────────────

  loadLevel(level: Level): void {
    this.level = level
    this.rebuildCourse()
    this.drawBackground(level.height, level.id)
    this.cameras.main.setBounds(0, 0, COURSE_W, level.height)
    this.restart()
  }

  /** Start the current level again from the tee. Abandons any flight. */
  restart(): void {
    const level = this.level
    if (!level) return
    this.run = startRun(level)
    this.angle = this.run.lie.angle
    this.shownHull = this.run.hull
    this.flight = null
    this.windup = null
    this.flightStars.clear()
    this.particles = []
    this.trail = []
    this.clearPopups()
    this.look = false
    this.lookDrag = null
    this.manualScroll = false
    this.phase = 'resting'
    this.aim = resetAim(this.settings, this.angle)
    this.dragAt = null
    this.forecast = null
    this.forecastInputs = ''
    // Jump straight to the tee rather than easing up the whole course.
    this.cameras.main.scrollY = this.restScrollY()
    this.emitHud(true)
  }

  unload(): void {
    this.level = null
    this.course = null
    this.run = null
    this.phase = 'idle'
    this.flight = null
    this.windup = null
    this.forecast = null
    this.particles = []
    this.trail = []
    this.clearPopups()
    this.clearPlanetTextures()
    this.staticGfx.clear()
    this.gfx.clear()
    this.cameras.main.setBounds(0, 0, COURSE_W, VIEW_H)
    this.cameras.main.scrollY = 0
    this.drawBackground(VIEW_H, 'idle')
  }

  setSettings(s: AimSettings): void {
    this.settings = { ...s }
    if (this.phase === 'resting') {
      this.aim = resetAim(this.settings, this.angle)
      this.dragAt = null
    }
    this.emitHud(true)
  }

  /** Planned mode: the Fire button. */
  fire(): void {
    if (this.phase !== 'resting' || !this.run || !this.course) return
    if (!canFire(this.aim, this.settings, this.tuning)) return
    const shot: ShotInput = { angle: releaseAngle(this.aim, this.settings, this.angle), power: this.aim.power }
    const ring = this.course.rings[this.run.lie.planet]
    if (!ring) return
    const dir = this.run.lie.dir
    const TAU = Math.PI * 2
    // Angular distance still to travel, the way the ship is going.
    const remaining = ((((shot.angle - this.angle) * dir) % TAU) + TAU) % TAU
    this.aim = IDLE_AIM
    this.windup = { shot, remaining }
    this.phase = 'windup'
    this.emitHud(true)
  }

  setLook(on: boolean): void {
    if (this.phase === 'flight' || this.phase === 'windup') return
    this.look = on
    this.lookDrag = null
    if (!on) this.manualScroll = false
    this.emitHud(true)
  }

  // ─── Course ─────────────────────────────────────────────────────────────────

  private rebuildCourse(): void {
    if (!this.level) return
    this.course = buildCourse(this.level, this.tuning)
    this.courseTuningKey = tuningKey(this.tuning)
    this.buildPlanetTextures()
    this.drawStatic()
    this.forecastInputs = ''
  }

  private clearPlanetTextures(): void {
    for (const key of this.planetTextureKeys) {
      if (this.textures.exists(key)) this.textures.remove(key)
    }
    this.planetTextureKeys = []
    this.planetLayer?.removeAll(true)
  }

  /** Lit-sphere planets via a CanvasTexture radial gradient (as in Orbital Dodger). */
  private buildPlanetTextures(): void {
    this.clearPlanetTextures()
    const course = this.course
    if (!course) return
    const offsets = course.wrapX ? [0, -COURSE_W, COURSE_W] : [0]
    course.planets.forEach((p, i) => {
      const key = `sg-planet-${i}-${Date.now()}`
      const size = Math.ceil(p.r * 2)
      const tex = this.textures.createCanvas(key, size, size)
      if (!tex) return
      const ctx = tex.getContext()
      const c = p.r
      const grad = ctx.createRadialGradient(c - p.r * 0.3, c - p.r * 0.3, p.r * 0.1, c, c, p.r)
      grad.addColorStop(0, p.color1)
      grad.addColorStop(1, p.color2)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(c, c, p.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = p.color1
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(c, c, p.r - 0.75, 0, Math.PI * 2)
      ctx.stroke()
      tex.refresh()
      this.planetTextureKeys.push(key)
      for (const ox of offsets) this.planetLayer.add(this.add.image(p.x + ox, p.y, key))
    })
  }

  private drawBackground(height: number, seed: string): void {
    const g = this.bgGfx
    g.clear()
    const rnd = seeded(`bg-${seed}`)
    const count = Math.round((130 * height) / VIEW_H)
    for (let i = 0; i < count; i++) {
      g.fillStyle(0xffffff, 0.25 + rnd() * 0.65)
      const s = 0.5 + rnd() * 1.3
      g.fillRect(rnd() * COURSE_W, rnd() * height, s, s)
    }
  }

  /** Things that never move: asteroid rocks, zone outlines, course edges. */
  private drawStatic(): void {
    const g = this.staticGfx
    g.clear()
    const course = this.course
    if (!course) return
    for (const p of course.pieces) {
      if (p.kind === 'wind') {
        g.fillStyle(COLORS.wind, 0.06)
        g.fillRect(p.x, p.y, p.w, p.h)
        g.lineStyle(1, COLORS.wind, 0.25)
        g.strokeRect(p.x, p.y, p.w, p.h)
      } else if (p.kind === 'asteroids') {
        g.fillStyle(COLORS.asteroid, 0.08)
        g.fillRect(p.x, p.y, p.w, p.h)
        const rnd = seeded(`${course.level.id}-${p.x}-${p.y}`)
        const n = Math.round((p.w * p.h) / 700)
        for (let i = 0; i < n; i++) {
          const x = p.x + rnd() * p.w
          const y = p.y + rnd() * p.h
          const r = 1.5 + rnd() * 3.5
          g.fillStyle(rnd() < 0.5 ? 0x8b7d6b : 0x6b6157, 0.9)
          g.fillCircle(x, y, r)
        }
      }
    }
    // Out-of-bounds lines at the top and bottom of the course.
    g.lineStyle(2, COLORS.ob, 0.35)
    g.lineBetween(0, 1, COURSE_W, 1)
    g.lineBetween(0, course.height - 1, COURSE_W, course.height - 1)
    if (!course.wrapX) {
      g.lineStyle(2, 0xc8dcff, 0.25)
      g.lineBetween(1, 0, 1, course.height)
      g.lineBetween(COURSE_W - 1, 0, COURSE_W - 1, course.height)
    }
  }

  // ─── Input ──────────────────────────────────────────────────────────────────

  private press(p: Phaser.Input.Pointer): void {
    if (this.look) {
      this.lookDrag = { startY: p.y, startScroll: this.cameras.main.scrollY }
      return
    }
    if (this.phase !== 'resting' || !this.course || !this.run) return
    this.manualScroll = false
    const { ringDist, angleAt } = this.ringProbe(p.worldX, p.worldY)
    this.aim = pressAim(this.aim, this.settings, { x: p.x, y: p.y }, ringDist, angleAt)
    this.dragAt = this.aim.drag === 'power' ? { x: p.x, y: p.y } : null
    this.emitHud()
  }

  private drag(p: Phaser.Input.Pointer): void {
    if (this.lookDrag) {
      this.cameras.main.scrollY = this.lookDrag.startScroll - (p.y - this.lookDrag.startY)
      return
    }
    if (this.phase !== 'resting' || this.aim.drag === null) return
    const { angleAt } = this.ringProbe(p.worldX, p.worldY)
    this.aim = moveAim(this.aim, { x: p.x, y: p.y }, angleAt, this.tuning)
    if (this.aim.drag === 'power') this.dragAt = { x: p.x, y: p.y }
    this.emitHud()
  }

  private release(): void {
    this.lookDrag = null
    if (this.aim.drag === null) return
    const { state, intent } = releaseAim(this.aim, this.settings, this.tuning)
    this.aim = state
    this.dragAt = null
    if (intent?.kind === 'fire' && this.phase === 'resting') {
      // Timed release: the angle is the one the last frame drew the forecast from.
      this.launch({ angle: this.angle, power: intent.power })
    }
    this.emitHud(true)
  }

  private wheel(dy: number): void {
    if (!this.course || this.phase === 'flight' || this.phase === 'windup') return
    this.manualScroll = true
    this.cameras.main.scrollY += dy
  }

  /** Distance from the lie's ring and angle around its planet, for a world point. */
  private ringProbe(x: number, y: number): { ringDist: number; angleAt: number } {
    const course = this.course!
    const ring = course.rings[this.run!.lie.planet]!
    const { dx, dy } = displacement(ring.x, ring.y, x, y, course.wrapX)
    return { ringDist: Math.abs(Math.hypot(dx, dy) - ring.R), angleAt: Math.atan2(dy, dx) }
  }

  // ─── Shots ──────────────────────────────────────────────────────────────────

  private launch(shot: ShotInput): void {
    const { course, run } = this
    if (!course || !run) return
    const result = simulateShot(
      course,
      run.lie,
      shot,
      { hull: run.hull, collected: run.collected },
      this.tuning,
    )
    this.flight = { shot, result, cursor: 0, nextEvent: 0 }
    this.flightStars.clear()
    this.forecast = null
    this.trail = []
    this.phase = 'flight'
    this.look = false
    this.manualScroll = false
    this.emitHud(true)
  }

  private resolve(): void {
    const { flight, run, course } = this
    if (!flight || !run || !course) return
    const outcome: Outcome = flight.result.outcome ?? { kind: 'adrift' }
    const next = applyShot(run, flight.shot, flight.result, this.tuning)
    this.run = next
    this.flight = null
    this.flightStars.clear()
    this.shownHull = next.hull

    if (next.status === 'complete') {
      this.phase = 'done'
      this.burst(course.wormhole.x, course.wormhole.y, COLORS.wormhole, 30)
      const breakdown: ScoreBreakdown = scoreBreakdown(next, this.tuning)
      this.game.events.emit('level-complete', breakdown)
    } else if (next.status === 'destroyed') {
      this.phase = 'done'
      const last = flight.result.xs.length - 1
      this.burst(flight.result.xs[last], flight.result.ys[last], 0xff6b4d, 40)
      this.game.events.emit('destroyed')
    } else {
      this.phase = 'resting'
      this.angle = next.lie.angle
      this.aim = resetAim(this.settings, this.angle)
      if (outcome.kind === 'out-of-bounds') {
        this.game.events.emit('toast', `Out of bounds · +1 stroke, −${this.tuning.obHullPenalty} hull`)
      } else if (outcome.kind === 'adrift') {
        this.game.events.emit('toast', 'Lost in space · +1 stroke')
      }
    }
    this.emitHud(true)
  }

  // ─── Loop ───────────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1)
    // A dropped pointerup (see create()) would otherwise leave an aim latched on.
    if ((this.aim.drag !== null || this.lookDrag) && !this.input.activePointer.isDown) this.release()

    if (this.level && tuningKey(this.tuning) !== this.courseTuningKey) this.rebuildCourse()

    const { course, run } = this
    if (course && run) {
      const ring = course.rings[run.lie.planet]
      if (this.phase === 'resting' && ring && !orbitFrozen(this.aim, this.settings)) {
        this.angle = advanceAngle(this.angle, ring, run.lie.dir, dt)
      } else if (this.phase === 'windup' && ring && this.windup) {
        const step = (WINDUP_SPEED * ring.vc * dt) / ring.R
        if (step >= this.windup.remaining) {
          this.angle = this.windup.shot.angle
          const shot = this.windup.shot
          this.windup = null
          this.launch(shot)
        } else {
          this.windup.remaining -= step
          this.angle += run.lie.dir * step
        }
      } else if (this.phase === 'flight') {
        this.advanceFlight(dt)
      }

      if (this.phase === 'resting') this.updateForecast()
      this.updateCamera(dt)
    }

    this.updateEffects(dt)
    this.draw()
    this.emitHud()
  }

  private advanceFlight(dt: number): void {
    const flight = this.flight!
    const res = flight.result
    const last = res.xs.length - 1
    flight.cursor = Math.min(last, flight.cursor + (dt / SIM_DT) * this.tuning.flightSpeed)
    const at = Math.floor(flight.cursor)
    while (flight.nextEvent < res.events.length && res.events[flight.nextEvent].step <= at) {
      const e = res.events[flight.nextEvent++]
      if (e.kind === 'star') {
        this.flightStars.add(e.star)
        const s = this.course!.stars[e.star]
        this.burst(s.x, s.y, COLORS.star, 14)
      } else if (e.damage > 0) {
        this.flashLeft = DAMAGE_FLASH
        this.popup(e.x, e.y - 14, `−${Math.round(e.damage)}`, '#ff8a8a')
        this.cameras.main.shake(120, Math.min(0.012, 0.002 + e.damage / 3000))
      }
    }
    this.shownHull = res.hull[at]
    const { x, y } = this.flightPos()
    this.trail.push({ x, y })
    if (this.trail.length > TRAIL_MAX) this.trail.shift()
    if (flight.cursor >= last) this.resolve()
  }

  /** The ship's position mid-flight, interpolated between steps (not across a wrap seam). */
  private flightPos(): { x: number; y: number } {
    const { result, cursor } = this.flight!
    const i = Math.floor(cursor)
    const j = Math.min(i + 1, result.xs.length - 1)
    const f = cursor - i
    const x0 = result.xs[i]
    const x1 = result.xs[j]
    const x = Math.abs(x1 - x0) > COURSE_W / 2 ? x0 : x0 + (x1 - x0) * f
    return { x, y: result.ys[i] + (result.ys[j] - result.ys[i]) * f }
  }

  private shipPos(): { x: number; y: number } | null {
    const { course, run } = this
    if (!course || !run) return null
    if (this.flight) return this.flightPos()
    const ring = course.rings[run.lie.planet]
    if (!ring) return null
    return onRing(ring, this.angle, run.lie.dir, ring.vc, course.wrapX)
  }

  private updateForecast(): void {
    const { course, run } = this
    if (!course || !run || !hasAim(this.aim, this.settings, this.tuning)) {
      this.forecast = null
      this.forecastInputs = ''
      return
    }
    const shot: ShotInput = { angle: releaseAngle(this.aim, this.settings, this.angle), power: this.aim.power }
    const key = `${shot.angle}|${shot.power}|${run.hull}|${this.courseTuningKey}`
    if (key === this.forecastInputs) return
    this.forecastInputs = key
    this.forecast = simulateShot(
      course,
      run.lie,
      shot,
      { hull: run.hull, collected: run.collected, maxLength: forecastLengthFor(course.level, this.tuning) },
      this.tuning,
    )
  }

  private restScrollY(): number {
    const { course, run } = this
    if (!course || !run) return 0
    return course.planets[run.lie.planet].y - VIEW_H * REST_VIEW_FRAC
  }

  private updateCamera(dt: number): void {
    const cam = this.cameras.main
    if (this.look || this.manualScroll) return
    let target = this.restScrollY()
    if (this.phase === 'flight' && this.flight) target = this.flightPos().y - VIEW_H / 2
    cam.scrollY += (target - cam.scrollY) * Math.min(1, dt * CAMERA_EASE)
  }

  private updateEffects(dt: number): void {
    this.flashLeft = Math.max(0, this.flashLeft - dt)
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const p of this.popups) {
      p.life -= dt
      p.text.y += p.vy * dt
      p.text.setAlpha(Math.max(0, p.life / POPUP_LIFE))
    }
    const dead = this.popups.filter((p) => p.life <= 0)
    for (const p of dead) p.text.destroy()
    this.popups = this.popups.filter((p) => p.life > 0)
  }

  private burst(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 40 + Math.random() * 120
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: PARTICLE_LIFE, color })
    }
  }

  private popup(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color, stroke: '#070a16', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(20)
    this.popups.push({ text: t, life: POPUP_LIFE, vy: -30 })
  }

  private clearPopups(): void {
    for (const p of this.popups) p.text.destroy()
    this.popups = []
  }

  // ─── HUD ────────────────────────────────────────────────────────────────────

  private emitHud(force = false): void {
    const run = this.run
    if (!run) return
    const hud: HudState = {
      strokes: run.strokes,
      stars: starsCollected(run) + this.flightStars.size,
      totalStars: run.collected.length,
      hull: Math.round(this.shownHull),
      phase: this.phase,
      power: this.aim.power,
      canFire: this.phase === 'resting' && canFire(this.aim, this.settings, this.tuning),
    }
    const key = JSON.stringify(hud) + this.look
    if (!force && key === this.lastHud) return
    this.lastHud = key
    this.game.events.emit('hud', hud, this.look)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  private draw(): void {
    const g = this.gfx
    g.clear()
    for (const l of this.labelPool) l.setVisible(false)
    const { course, run } = this
    if (!course || !run) return
    const offsets = course.wrapX ? [0, -COURSE_W, COURSE_W] : [0]
    const now = this.time.now / 1000

    this.drawPieces(now)

    // Rings: faint, the lie's highlighted, a forecast lock target brighter still.
    const lockTarget = this.forecast?.outcome?.kind === 'lock' ? this.forecast.outcome.lie.planet : -1
    course.rings.forEach((ring, i) => {
      if (!ring) return
      const lie = i === run.lie.planet && this.phase !== 'flight'
      const target = i === lockTarget
      g.lineStyle(target ? 3 : lie ? 2.5 : 1.2, target || lie ? COLORS.lieRing : COLORS.ring, target ? 1 : lie ? 0.8 : 0.35)
      for (const ox of offsets) g.strokeCircle(ring.x + ox, ring.y, ring.R)
    })

    this.drawWormhole(now)

    // Stars: collected ones are gone, including ones this flight has passed.
    const forecastStars = new Set(this.forecast?.stars ?? [])
    course.stars.forEach((s, i) => {
      if (run.collected[i] || this.flightStars.has(i)) return
      for (const ox of offsets) {
        if (forecastStars.has(i)) {
          g.lineStyle(2, COLORS.star, 0.9)
          g.strokeCircle(s.x + ox, s.y, STAR_R + 6)
        }
        this.drawStar(s.x + ox, s.y, STAR_R, now + i)
      }
    })

    if (this.forecast && this.phase === 'resting') this.drawForecast(this.forecast)
    this.drawAimGuides()

    for (let i = 0; i < this.trail.length; i++) {
      g.fillStyle(COLORS.ship, 0.1 + (i / this.trail.length) * 0.6)
      g.fillCircle(this.trail[i].x, this.trail[i].y, 2.5)
    }
    for (const p of this.particles) {
      g.fillStyle(p.color, Math.max(p.life / PARTICLE_LIFE, 0))
      g.fillCircle(p.x, p.y, 2)
    }

    const ship = this.shipPos()
    if (ship && run.status !== 'destroyed') {
      const flashing = this.flashLeft > 0 && Math.floor(this.flashLeft / 0.07) % 2 === 0
      g.fillStyle(flashing ? 0xff4d4d : COLORS.ship, 1)
      g.fillCircle(ship.x, ship.y, this.tuning.shipRadius)
      g.lineStyle(1.5, 0xffffff, 0.9)
      g.strokeCircle(ship.x, ship.y, this.tuning.shipRadius)
    }
  }

  private drawPieces(now: number): void {
    const g = this.gfx
    for (const p of this.course!.pieces) {
      if (p.kind === 'wind') {
        // Streaks flowing along the wind, wrapped inside the zone.
        const mag = Math.hypot(p.ax, p.ay) || 1
        const ux = p.ax / mag
        const uy = p.ay / mag
        const rnd = seeded(`wind-${p.x}-${p.y}`)
        const n = Math.round((p.w * p.h) / 1800)
        const span = Math.abs(ux) * p.w + Math.abs(uy) * p.h
        g.lineStyle(1.5, COLORS.wind, 0.35)
        for (let i = 0; i < n; i++) {
          const across = rnd()
          const phase = (rnd() * span + now * (40 + mag * 0.3)) % span
          const along = ux !== 0 ? (ux > 0 ? phase : p.w - phase) : uy > 0 ? phase : p.h - phase
          const x = ux !== 0 ? p.x + along : p.x + across * p.w
          const y = ux !== 0 ? p.y + across * p.h : p.y + along
          const len = 14
          g.lineBetween(x, y, Math.max(p.x, Math.min(p.x + p.w, x - ux * len)), Math.max(p.y, Math.min(p.y + p.h, y - uy * len)))
        }
      } else if (p.kind === 'radiation') {
        const pulse = 0.5 + 0.5 * Math.sin(now * 3 + p.x)
        g.fillStyle(COLORS.radiation, 0.07 + 0.05 * pulse)
        g.fillCircle(p.x, p.y, p.r)
        g.lineStyle(1.5, COLORS.radiation, 0.35 + 0.3 * pulse)
        g.strokeCircle(p.x, p.y, p.r)
        // Trefoil hint.
        for (let k = 0; k < 3; k++) {
          const a = now * 0.4 + (k * Math.PI * 2) / 3
          g.fillStyle(COLORS.radiation, 0.18)
          g.slice(p.x, p.y, p.r * 0.35, a - 0.45, a + 0.45)
          g.fillPath()
        }
      }
    }
  }

  private drawWormhole(now: number): void {
    const g = this.gfx
    const w = this.course!.wormhole
    const complete = this.run?.status === 'complete'
    g.fillStyle(0x1a0b2e, 1)
    g.fillCircle(w.x, w.y, w.r)
    for (let k = 0; k < 4; k++) {
      const r = w.r * (0.35 + k * 0.22)
      const a = now * (1.6 - k * 0.25) + k
      g.lineStyle(2, COLORS.wormhole, 0.35 + k * 0.15)
      g.beginPath()
      g.arc(w.x, w.y, r, a, a + Math.PI * 1.2)
      g.strokePath()
    }
    const hot = this.forecast?.outcome?.kind === 'wormhole' || complete
    g.lineStyle(hot ? 3 : 1.5, COLORS.wormhole, hot ? 1 : 0.6)
    g.strokeCircle(w.x, w.y, w.r + 3)
  }

  private drawStar(x: number, y: number, r: number, t: number): void {
    const g = this.gfx
    const pts: Phaser.Types.Math.Vector2Like[] = []
    const spin = t * 0.6
    for (let k = 0; k < 10; k++) {
      const a = spin + (k * Math.PI) / 5 - Math.PI / 2
      const rr = k % 2 === 0 ? r : r * 0.45
      pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr })
    }
    g.fillStyle(COLORS.star, 1)
    g.fillPoints(pts, true)
  }

  private drawForecast(f: ShotResult): void {
    const g = this.gfx
    const n = f.xs.length
    for (let i = 1; i < n; i++) {
      if (Math.abs(f.xs[i] - f.xs[i - 1]) > COURSE_W / 2) continue // wrap seam
      const hot = (f.zone[i] & (ZONE_ASTEROIDS | ZONE_RADIATION)) !== 0
      const fade = 0.35 + 0.6 * (1 - i / n)
      g.lineStyle(hot ? 3 : 2, hot ? COLORS.forecastHot : COLORS.forecast, fade)
      g.lineBetween(f.xs[i - 1], f.ys[i - 1], f.xs[i], f.ys[i])
    }
    let label = 0
    for (const e of f.events) {
      if (e.kind === 'star' || e.damage <= 0) continue
      g.fillStyle(COLORS.ob, 1)
      g.fillCircle(e.x, e.y, 4)
      this.label(label++, e.x + 10, e.y - 10, `−${Math.round(e.damage)}`, '#ff8a8a')
    }
    const zoneLoss = (f.hull[0] ?? 0) - (f.hull[n - 1] ?? 0) - f.events.reduce((s, e) => s + (e.kind === 'star' ? 0 : e.damage), 0)
    const end = { x: f.xs[n - 1], y: f.ys[n - 1] }
    if (zoneLoss > 0.5) this.label(label++, end.x + 12, end.y + 12, `−${Math.round(zoneLoss)} zone`, '#ffb38a')

    const o = f.outcome
    if (o?.kind === 'lock') {
      g.lineStyle(2.5, COLORS.lock, 1)
      g.strokeCircle(end.x, end.y, 9)
      g.lineBetween(end.x - 5, end.y, end.x + 5, end.y)
      g.lineBetween(end.x, end.y - 5, end.x, end.y + 5)
    } else if (o?.kind === 'out-of-bounds') {
      const cy = Math.max(4, Math.min(this.course!.height - 4, end.y))
      g.lineStyle(3, COLORS.ob, 1)
      g.lineBetween(end.x - 7, cy - 7, end.x + 7, cy + 7)
      g.lineBetween(end.x - 7, cy + 7, end.x + 7, cy - 7)
      this.label(label++, end.x, cy + (end.y < 0 ? 18 : -18), 'OUT', '#ff8a8a')
    } else if (o?.kind === 'destroyed') {
      this.label(label++, end.x, end.y - 16, 'DESTROYED', '#ff4d4d')
    }
  }

  /** Pull-back line and power arc while dragging; planned-mode marker; release arrow. */
  private drawAimGuides(): void {
    const g = this.gfx
    const { course, run } = this
    if (!course || !run || this.phase !== 'resting') return
    const ring = course.rings[run.lie.planet]
    if (!ring) return
    const cam = this.cameras.main
    const ship = onRing(ring, this.angle, run.lie.dir, ring.vc, course.wrapX)

    // Planned mode: the release marker and its launch direction.
    if (this.settings.release === 'planned' && this.aim.marker !== null) {
      const m = onRing(ring, this.aim.marker, run.lie.dir, 1, course.wrapX)
      g.fillStyle(COLORS.power, 1)
      g.fillCircle(m.x, m.y, 5)
      g.lineStyle(2, COLORS.power, 0.9)
      g.lineBetween(m.x, m.y, m.x + m.vx * 22, m.y + m.vy * 22)
    } else if (this.aim.drag === null) {
      // Timed mode at rest: a short prograde tick shows where a shot would go now.
      const v = Math.hypot(ship.vx, ship.vy) || 1
      g.lineStyle(2, COLORS.power, 0.6)
      g.lineBetween(ship.x, ship.y, ship.x + (ship.vx / v) * 18, ship.y + (ship.vy / v) * 18)
    }

    // Power: an arc round the ship, and the drag line in world space.
    if (this.aim.power > 0) {
      g.lineStyle(3, COLORS.power, 0.95)
      g.beginPath()
      g.arc(ship.x, ship.y, this.tuning.shipRadius + 6, -Math.PI / 2, -Math.PI / 2 + this.aim.power * Math.PI * 2)
      g.strokePath()
    }
    if (this.aim.drag === 'power' && this.aim.origin && this.dragAt) {
      const ox = this.aim.origin.x + cam.scrollX
      const oy = this.aim.origin.y + cam.scrollY
      const px = this.dragAt.x + cam.scrollX
      const py = this.dragAt.y + cam.scrollY
      g.lineStyle(1.5, COLORS.power, 0.5)
      g.strokeCircle(ox, oy, this.tuning.powerDeadzone)
      g.lineStyle(1, COLORS.power, 0.3)
      g.strokeCircle(ox, oy, this.tuning.powerFullDrag)
      g.lineStyle(2.5, COLORS.power, 0.8)
      g.lineBetween(ox, oy, px, py)
    }
  }

  private label(i: number, x: number, y: number, text: string, color: string): void {
    let t = this.labelPool[i]
    if (!t) {
      t = this.add
        .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold', stroke: '#070a16', strokeThickness: 3 })
        .setOrigin(0.5)
        .setDepth(15)
      this.labelPool[i] = t
    }
    t.setText(text).setColor(color).setPosition(x, y).setVisible(true)
  }

  /** Dev handle: the current run, for browser automation. */
  debugState() {
    return { phase: this.phase, run: this.run, angle: this.angle, aim: this.aim, forecast: this.forecast?.outcome ?? null }
  }
}
