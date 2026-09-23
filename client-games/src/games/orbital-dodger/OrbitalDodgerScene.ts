import * as Phaser from 'phaser'
import {
  GAME_W,
  GAME_H,
  DEFAULT_TUNING,
  cloneTuning,
  generatePlanets,
  spawnStarSet,
  gravityAccelAt,
  scoreRateAt,
  stepShip,
  checkLoss,
  projectForecast,
  type Planet,
  type Ship,
  type Star,
  type Tuning,
  type LossReason,
} from './physics'

export { GAME_W, GAME_H }

// ─── Simulation cadence ───────────────────────────────────────────────────────
// Gravity is inverse-square, so a large step both distorts the trajectory and lets
// a fast ship tunnel clean through a small planet. Fixed sub-steps fix both; the
// per-frame cap means a long stall drops time instead of spiralling.
const SUB_STEP = 1 / 120
const MAX_SUB_STEPS = 8

/** React re-renders on score/fuel; ~10 Hz is past what the HUD can show. */
const EMIT_INTERVAL_MS = 100
/** The forecast is the heaviest per-frame work, and needs no per-frame freshness. */
const FORECAST_INTERVAL_MS = 80

const TRAIL_MAX = 50
const PARTICLE_LIFE = 0.5
const STAR_PICKUP_PAD = 6

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

interface BgStar {
  x: number
  y: number
  s: number
  a: number
}

export default class OrbitalDodgerScene extends Phaser.Scene {
  /** Live tuning object. The dev panel mutates this in place; we re-read it each sub-step. */
  tuning: Tuning = cloneTuning(DEFAULT_TUNING)

  private planets: Planet[] = []
  private ship: Ship = { x: GAME_W / 2, y: GAME_H / 2, vx: 0, vy: 0 }
  private stars: Star[] = []
  private particles: Particle[] = []
  private trail: { x: number; y: number }[] = []
  private bgStars: BgStar[] = []

  private fuel = DEFAULT_TUNING.maxFuel
  private score = 0
  private running = false

  /** Where the player is holding, in world coords. Null when not thrusting. */
  private pointerTarget: { x: number; y: number } | null = null

  private accumulator = 0
  private lastEmit = 0
  private lastForecast = 0
  private forecastPts: { x: number; y: number }[] = []

  private planetLayer!: Phaser.GameObjects.Container
  private gfx!: Phaser.GameObjects.Graphics
  private bgGfx!: Phaser.GameObjects.Graphics
  /** Textures generated for the current layout, destroyed when it is replaced. */
  private planetTextureKeys: string[] = []

  constructor() {
    super('OrbitalDodgerScene')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0e1c')

    this.bgGfx = this.add.graphics()
    this.planetLayer = this.add.container(0, 0)
    this.gfx = this.add.graphics()

    this.makeBgStars()
    this.drawBgStars()
    this.newLayout()

    // Fix 1 (kb/phaser-mobile-input.md): canvas press-and-drag goes through the
    // scene's own pointer input, never a DOM click off the canvas.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.setTarget(p))
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.setTarget(p)
    })
    this.input.on('pointerup', () => { this.pointerTarget = null })
    // The game config sets `input: { windowEvents: false }` (Fix 2) so React HUD
    // buttons still receive taps on iOS — but that also removes the window-level
    // listener, so a release *outside* the canvas may never deliver 'pointerup'.
    // Here a missed release would latch thrust on and silently burn the whole
    // fuel reserve, so subscribe to the outside variant too. update() additionally
    // re-derives the state from pointer.isDown, so a dropped event self-corrects.
    this.input.on('pointerupoutside', () => { this.pointerTarget = null })

    this.game.events.on('retry', this.retry, this)
    this.game.events.on('new-layout', this.newLayout, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('retry', this.retry, this)
      this.game.events.off('new-layout', this.newLayout, this)
      this.clearPlanetTextures()
    })
  }

  private setTarget(p: Phaser.Input.Pointer): void {
    this.pointerTarget = { x: p.worldX, y: p.worldY }
  }

  // ─── Layout ─────────────────────────────────────────────────────────────────

  private makeBgStars(): void {
    this.bgStars = Array.from({ length: 130 }, () => ({
      x: Math.random() * GAME_W,
      y: Math.random() * GAME_H,
      s: 0.5 + Math.random() * 1.3,
      a: 0.2 + Math.random() * 0.7,
    }))
  }

  private drawBgStars(): void {
    this.bgGfx.clear()
    for (const b of this.bgStars) {
      this.bgGfx.fillStyle(0xffffff, b.a)
      this.bgGfx.fillRect(b.x, b.y, b.s, b.s)
    }
  }

  private clearPlanetTextures(): void {
    for (const key of this.planetTextureKeys) {
      if (this.textures.exists(key)) this.textures.remove(key)
    }
    this.planetTextureKeys = []
    this.planetLayer.removeAll(true)
  }

  /**
   * Phaser's Graphics has no radial gradient, which is how a planet reads as a lit
   * sphere. A CanvasTexture exposes a real 2D context, so the prototype's
   * createRadialGradient works verbatim — drawn once per layout, never per frame.
   */
  private buildPlanetTextures(): void {
    this.clearPlanetTextures()

    this.planets.forEach((p, i) => {
      const key = `od-planet-${i}-${Date.now()}`
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
      tex.refresh()

      this.planetTextureKeys.push(key)
      this.planetLayer.add(this.add.image(p.x, p.y, key))
    })
  }

  /** Fresh planets *and* a fresh run. */
  newLayout(): void {
    this.planets = generatePlanets(GAME_W, GAME_H, this.tuning)
    this.buildPlanetTextures()
    this.retry()
  }

  /** Fresh run on the existing layout. */
  retry(): void {
    this.ship = {
      x: GAME_W / 2,
      y: GAME_H / 2,
      vx: -15 + Math.random() * 30,
      vy: -20 + Math.random() * 12,
    }
    this.stars = spawnStarSet(GAME_W, GAME_H, this.planets)
    this.particles = []
    this.trail = []
    this.pointerTarget = null
    this.score = 0
    this.fuel = this.tuning.maxFuel
    this.accumulator = 0
    this.forecastPts = []
    this.running = true
    this.emitState(true)
  }

  // ─── Loop ───────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.running) {
      // A dropped pointerup (see create()) would otherwise latch thrust on.
      if (this.pointerTarget && !this.input.activePointer.isDown) this.pointerTarget = null

      this.accumulator += delta / 1000
      let steps = 0
      while (this.accumulator >= SUB_STEP && steps < MAX_SUB_STEPS && this.running) {
        this.simulate(SUB_STEP)
        this.accumulator -= SUB_STEP
        steps++
      }
      // Long stall: drop the backlog rather than spiralling.
      if (steps >= MAX_SUB_STEPS) this.accumulator = 0

      if (time - this.lastEmit >= EMIT_INTERVAL_MS) {
        this.lastEmit = time
        this.emitState()
      }
    }

    if (this.running && time - this.lastForecast >= FORECAST_INTERVAL_MS) {
      this.lastForecast = time
      this.forecastPts = projectForecast(this.ship, this.planets, this.tuning)
    }

    this.draw()
  }

  private simulate(dt: number): void {
    const thrusting = this.pointerTarget !== null && this.fuel > 0

    this.ship = stepShip(this.ship, this.planets, this.tuning, this.pointerTarget, this.fuel, dt)

    this.trail.push({ x: this.ship.x, y: this.ship.y })
    if (this.trail.length > TRAIL_MAX) this.trail.shift()

    if (thrusting) this.fuel = Math.max(0, this.fuel - dt)

    const loss = checkLoss(this.ship, this.planets, this.tuning, this.fuel)
    if (loss) return this.endRun(loss)

    for (const s of this.stars) {
      if (s.collected) continue
      const d = Math.hypot(s.x - this.ship.x, s.y - this.ship.y)
      if (d < s.r + this.tuning.shipRadius + STAR_PICKUP_PAD) {
        s.collected = true
        this.score += this.tuning.starBonus
        for (let i = 0; i < 10; i++) {
          this.particles.push({
            x: s.x,
            y: s.y,
            vx: -80 + Math.random() * 160,
            vy: -80 + Math.random() * 160,
            life: PARTICLE_LIFE,
          })
        }
      }
    }
    if (this.stars.every((s) => s.collected)) {
      this.stars = spawnStarSet(GAME_W, GAME_H, this.planets)
    }

    this.score += scoreRateAt(this.ship.x, this.ship.y, this.planets, this.tuning) * dt

    for (const pt of this.particles) {
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  private endRun(reason: LossReason): void {
    this.running = false
    this.pointerTarget = null
    this.emitState(true)
    this.game.events.emit('gameover', Math.floor(this.score), reason)
  }

  /** Quit is a voluntary end: no loss reason, but the same final-value emit. */
  quit(): number {
    this.running = false
    this.pointerTarget = null
    this.emitState(true)
    return Math.floor(this.score)
  }

  private emitState(final = false): void {
    this.game.events.emit('score', Math.floor(this.score))
    this.game.events.emit('fuel', this.fuel / Math.max(this.tuning.maxFuel, 0.001))
    if (final) this.lastEmit = this.time.now
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  private draw(): void {
    const g = this.gfx
    g.clear()

    // Forecast: fades along its length so the near term reads strongest.
    const pts = this.forecastPts
    if (pts.length > 1 && this.tuning.forecastRange > 0) {
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length
        g.lineStyle(2, 0xffffff, (1 - t) * 0.55)
        g.beginPath()
        g.moveTo(pts[i - 1].x, pts[i - 1].y)
        g.lineTo(pts[i].x, pts[i].y)
        g.strokePath()
      }
    }

    for (const s of this.stars) {
      if (s.collected) continue
      g.fillStyle(0xffd76c, 1)
      g.fillCircle(s.x, s.y, s.r)
    }

    for (const pt of this.particles) {
      g.fillStyle(0xffd76c, Math.max(pt.life / PARTICLE_LIFE, 0))
      g.fillCircle(pt.x, pt.y, 2)
    }

    for (let i = 0; i < this.trail.length; i++) {
      g.fillStyle(0x7cd4ff, (i / this.trail.length) * 0.5)
      g.fillCircle(this.trail[i].x, this.trail[i].y, 2)
    }

    if (this.pointerTarget) {
      g.lineStyle(2, this.fuel > 0 ? 0x7cd4ff : 0xff6b6b, 0.35)
      g.beginPath()
      g.moveTo(this.ship.x, this.ship.y)
      g.lineTo(this.pointerTarget.x, this.pointerTarget.y)
      g.strokePath()
    }

    g.fillStyle(0x7cd4ff, 1)
    g.fillCircle(this.ship.x, this.ship.y, this.tuning.shipRadius)
  }

  /** Exposed for the dev tuning panel: re-read gravity at a probe point. */
  probeGravity(x: number, y: number) {
    return gravityAccelAt(x, y, this.planets, this.tuning)
  }
}
