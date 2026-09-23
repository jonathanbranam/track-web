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
  displacement,
  thrustDirection,
  classifyImpact,
  resolveGlancingImpact,
  orbitRings,
  tryCapture,
  advanceOrbit,
  ringOffset,
  orbitScoreFactor,
  offscreenIndicator,
  type Planet,
  type Ship,
  type Star,
  type Tuning,
  type LossReason,
  type Dir,
  type OrbitRing,
  type OrbitLock,
  type ForecastPt,
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
/** Red/normal alternation period while the shield grace period is active. */
const FLASH_PERIOD = 0.08

/** Offsets at which a planet's periodic images are drawn in wrap mode. */
const GHOST_OFFSETS: [number, number][] = [
  [-GAME_W, 0], [GAME_W, 0], [0, -GAME_H], [0, GAME_H],
  [-GAME_W, -GAME_H], [GAME_W, -GAME_H], [-GAME_W, GAME_H], [GAME_W, GAME_H],
]

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
  /** Seconds since the tank ran dry; the run ends when this reaches fuelGraceSec. */
  private emptySec = 0
  private score = 0
  private running = false

  private shields = DEFAULT_TUNING.shieldCharges
  /** Seconds left in the post-hit grace period; > 0 means contact is harmless. */
  private graceLeft = 0

  /** Where the player is holding, in world coords. Null when not held. */
  private pointerTarget: { x: number; y: number } | null = null
  /** Where the current press began — the origin of a relative-drag steer. */
  private pressOrigin: { x: number; y: number } | null = null
  /** Most recent thrust direction, held by direct mode while the finger covers the ship. */
  private lastDir: Dir | null = null
  /** The direction actually thrusting this sub-step, for the heading tick. */
  private thrustDir: Dir | null = null

  private rings: OrbitRing[] = []
  private lock: OrbitLock | null = null
  /** Radians travelled in the current locked orbit — drives the scoring cutoff. */
  private lockedArc = 0
  /** Planet whose ring just released the ship; it may not recapture until the ship leaves its band. */
  private recaptureBlock: number | null = null

  private accumulator = 0
  private lastEmit = 0
  private lastForecast = 0
  private forecastPts: ForecastPt[] = []

  private planetLayer!: Phaser.GameObjects.Container
  private gfx!: Phaser.GameObjects.Graphics
  private bgGfx!: Phaser.GameObjects.Graphics
  /** Textures generated for the current layout, destroyed when it is replaced. */
  private planetTextureKeys: string[] = []
  /** Periodic planet images shown only in wrap mode. */
  private ghostImages: Phaser.GameObjects.Image[] = []

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
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.press(p))
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.setTarget(p)
    })
    this.input.on('pointerup', () => this.releasePointer())
    // The game config sets `input: { windowEvents: false }` (Fix 2) so React HUD
    // buttons still receive taps on iOS — but that also removes the window-level
    // listener, so a release *outside* the canvas may never deliver 'pointerup'.
    // Here a missed release would latch thrust on and silently burn the whole
    // fuel reserve, so subscribe to the outside variant too. update() additionally
    // re-derives the state from pointer.isDown, so a dropped event self-corrects.
    this.input.on('pointerupoutside', () => this.releasePointer())

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

  /** A new press starts a steer — and is the only thing that breaks a locked orbit. */
  private press(p: Phaser.Input.Pointer): void {
    if (!this.running) return
    this.pressOrigin = { x: p.worldX, y: p.worldY }
    this.setTarget(p)
    if (this.lock) {
      this.recaptureBlock = this.lock.planetIdx
      this.lock = null
    }
  }

  private releasePointer(): void {
    this.pointerTarget = null
    this.pressOrigin = null
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
    this.ghostImages = []
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
      for (const [ox, oy] of GHOST_OFFSETS) {
        const ghost = this.add.image(p.x + ox, p.y + oy, key).setAlpha(0.35).setVisible(false)
        this.ghostImages.push(ghost)
        this.planetLayer.add(ghost)
      }
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
    this.releasePointer()
    this.lastDir = null
    this.thrustDir = null
    this.lock = null
    this.lockedArc = 0
    this.recaptureBlock = null
    this.emptySec = 0
    this.shields = this.tuning.shieldCharges
    this.graceLeft = 0
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
      if (this.pointerTarget && !this.input.activePointer.isDown) this.releasePointer()

      // Cheap (n ≤ 7), and rebuilding each frame means tuning edits apply live.
      this.rings = orbitRings(this.planets, this.tuning)

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
      // While locked the highlighted ring *is* the path.
      this.forecastPts = this.lock ? [] : projectForecast(this.ship, this.planets, this.tuning)
    }

    const wrap = this.tuning.edgeMode === 'wrap'
    for (const g of this.ghostImages) g.setVisible(wrap)

    this.draw()
  }

  private simulate(dt: number): void {
    this.graceLeft = Math.max(0, this.graceLeft - dt)
    if (this.fuel <= 0) this.emptySec += dt

    if (!(this.lock ? this.simulateLocked(dt) : this.simulateFree(dt))) return

    for (const s of this.stars) {
      if (s.collected) continue
      const { dx, dy } = displacement(this.ship.x, this.ship.y, s.x, s.y, this.tuning)
      const d = Math.hypot(dx, dy)
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

    const factor = this.lock ? orbitScoreFactor(this.lockedArc, this.tuning.orbitScoreArcDeg) : 1
    this.score += scoreRateAt(this.ship.x, this.ship.y, this.planets, this.tuning) * factor * dt

    for (const pt of this.particles) {
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  /** On rails: no gravity, fuel, or collision. Returns to free flight if the ring vanished. */
  private simulateLocked(dt: number): boolean {
    const lock = this.lock!
    const ring = this.rings.find((r) => r.planetIdx === lock.planetIdx)
    if (!ring) {
      this.lock = null
      return true
    }
    const res = advanceOrbit(lock, ring, this.tuning, dt)
    this.lock = res.lock
    this.ship = res.ship
    this.lockedArc += (ring.vc * dt) / ring.R
    this.thrustDir = null
    this.pushTrail()

    // Rails skip collision, but the empty-tank countdown still runs out.
    const loss = checkLoss(this.ship, this.planets, this.tuning, this.fuel, this.emptySec)
    if (typeof loss === 'string') {
      this.endRun(loss)
      return false
    }
    return true
  }

  /** Free flight. Returns false if the run ended this sub-step. */
  private simulateFree(dt: number): boolean {
    const t = this.tuning
    const dir =
      this.fuel > 0
        ? thrustDirection(
            t.controlMode, this.ship, this.pressOrigin, this.pointerTarget,
            this.lastDir, t.controlDeadzone, t.controlFullDrag,
          )
        : null
    if (dir) this.lastDir = dir
    this.thrustDir = dir

    this.ship = stepShip(this.ship, this.planets, t, dir, this.fuel, dt)
    this.pushTrail()

    // Fuel burns in proportion to throttle, so a light nudge costs little.
    if (dir) this.fuel = Math.max(0, this.fuel - dt * Math.hypot(dir.x, dir.y))

    const loss = checkLoss(this.ship, this.planets, t, this.fuel, this.emptySec)
    if (loss && typeof loss === 'object') {
      if (!this.resolveContact(loss.contact)) return false
    } else if (loss) {
      this.endRun(loss)
      return false
    }

    if (this.recaptureBlock !== null) {
      const ring = this.rings.find((r) => r.planetIdx === this.recaptureBlock)
      if (!ring || Math.abs(ringOffset(this.ship, ring, t)) > t.captureBand) this.recaptureBlock = null
    }

    // Capture only while coasting: a held pointer means the player is steering.
    if (!this.pointerTarget) {
      const lock = tryCapture(this.ship, this.rings, t, this.recaptureBlock)
      if (lock) {
        this.lock = lock
        this.lockedArc = 0
        const ring = this.rings.find((r) => r.planetIdx === lock.planetIdx)!
        this.ship = advanceOrbit(lock, ring, t, 0).ship
      }
    }
    return true
  }

  /** Shields decide a contact. Returns false if it was fatal. */
  private resolveContact(idx: number): boolean {
    const p = this.planets[idx]
    if (this.graceLeft <= 0) {
      if (this.shields <= 0 || classifyImpact(this.ship, p, this.tuning) === 'direct') {
        this.endRun('crash')
        return false
      }
      this.shields--
      this.graceLeft = this.tuning.shieldGraceSec
      this.emitState()
    }
    this.ship = resolveGlancingImpact(this.ship, p, this.tuning)
    return true
  }

  private pushTrail(): void {
    this.trail.push({ x: this.ship.x, y: this.ship.y })
    if (this.trail.length > TRAIL_MAX) this.trail.shift()
  }

  private endRun(reason: LossReason): void {
    this.running = false
    this.releasePointer()
    this.lock = null
    this.emitState(true)
    this.game.events.emit('gameover', Math.floor(this.score), reason)
  }

  /** Quit is a voluntary end: no loss reason, but the same final-value emit. */
  quit(): number {
    this.running = false
    this.releasePointer()
    this.lock = null
    this.emitState(true)
    return Math.floor(this.score)
  }

  private emitState(final = false): void {
    this.game.events.emit('score', Math.floor(this.score))
    this.game.events.emit('fuel', this.fuel / Math.max(this.tuning.maxFuel, 0.001))
    this.game.events.emit('shields', this.shields)
    // Seconds left before an empty tank ends the run; null while fuel remains.
    this.game.events.emit(
      'fuel-grace',
      this.fuel > 0 ? null : Math.max(0, this.tuning.fuelGraceSec - this.emptySec),
    )
    if (final) this.lastEmit = this.time.now
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  private draw(): void {
    const g = this.gfx
    g.clear()
    const t = this.tuning
    const wrap = t.edgeMode === 'wrap'
    const offsets: [number, number][] = wrap ? [[0, 0], ...GHOST_OFFSETS] : [[0, 0]]

    // Orbit rings: faint until locked. Wrap mode draws their periodic images too.
    for (const ring of this.rings) {
      const locked = this.lock?.planetIdx === ring.planetIdx
      g.lineStyle(locked ? 2 : 1, locked ? 0x8effc1 : 0xffffff, locked ? 0.7 : 0.12)
      for (const [ox, oy] of offsets) g.strokeCircle(ring.x + ox, ring.y + oy, ring.R)
    }

    // Forecast: fades along its length so the near term reads strongest. A `brk`
    // point starts a new run, so a wrap seam never draws a line across the field.
    const pts = this.forecastPts
    if (pts.length > 1 && t.forecastRange > 0) {
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].brk) continue
        const f = i / pts.length
        g.lineStyle(2, 0xffffff, (1 - f) * 0.55)
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

    // Steering guide: relative mode is a joystick from the press origin; direct
    // mode is the line from ship to finger.
    if (this.pointerTarget) {
      const color = this.fuel > 0 ? 0x7cd4ff : 0xff6b6b
      const from = t.controlMode === 'relative' ? this.pressOrigin : this.ship
      if (from) {
        if (t.controlMode === 'relative') {
          g.lineStyle(1, color, 0.25)
          g.strokeCircle(from.x, from.y, t.controlDeadzone)
          // Outer ring: drag this far for full thrust.
          g.lineStyle(1, color, 0.12)
          g.strokeCircle(from.x, from.y, t.controlFullDrag)
        }
        g.lineStyle(2, color, 0.35)
        g.beginPath()
        g.moveTo(from.x, from.y)
        g.lineTo(this.pointerTarget.x, this.pointerTarget.y)
        g.strokePath()
      }
    }

    // Heading tick: the direction thrust is actually being applied.
    if (this.thrustDir && this.running) {
      const r = t.shipRadius
      g.lineStyle(2, 0xffa94d, 0.9)
      g.beginPath()
      g.moveTo(this.ship.x - this.thrustDir.x * r, this.ship.y - this.thrustDir.y * r)
      g.lineTo(this.ship.x - this.thrustDir.x * (r + 8), this.ship.y - this.thrustDir.y * (r + 8))
      g.strokePath()
    }

    // Red flash during the shield grace period.
    const flashing = this.graceLeft > 0 && Math.floor(this.graceLeft / FLASH_PERIOD) % 2 === 0
    g.fillStyle(flashing ? 0xff4d4d : 0x7cd4ff, 1)
    g.fillCircle(this.ship.x, this.ship.y, t.shipRadius)
    if (this.graceLeft > 0) {
      g.lineStyle(2, 0xff4d4d, Math.min(1, this.graceLeft / t.shieldGraceSec))
      g.strokeCircle(this.ship.x, this.ship.y, t.shipRadius + 5)
    }

    if (!wrap) this.drawOffscreenIndicator()
  }

  /** Arrow on the nearest edge pointing at an off-screen ship; reddens toward the margin. */
  private drawOffscreenIndicator(): void {
    const ind = offscreenIndicator(this.ship)
    if (!ind) return
    const g = this.gfx
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x7cd4ff),
      Phaser.Display.Color.ValueToColor(0xff4d4d),
      100,
      Math.round(ind.danger * 100),
    )
    const rgb = Phaser.Display.Color.GetColor(color.r, color.g, color.b)
    const pulse = ind.danger > 0.7 ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 120)) : 1

    // Distance cue: a ring that shrinks as the ship drifts farther out.
    g.lineStyle(2, rgb, 0.6 * pulse)
    g.strokeCircle(ind.x, ind.y, 4 + 8 * (1 - ind.danger))

    const c = Math.cos(ind.angle)
    const s = Math.sin(ind.angle)
    const tip = 11
    const back = 5
    const half = 6
    g.fillStyle(rgb, pulse)
    g.fillTriangle(
      ind.x + c * tip, ind.y + s * tip,
      ind.x - c * back - s * half, ind.y - s * back + c * half,
      ind.x - c * back + s * half, ind.y - s * back - c * half,
    )
  }

  /** Exposed for the dev tuning panel: re-read gravity at a probe point. */
  probeGravity(x: number, y: number) {
    return gravityAccelAt(x, y, this.planets, this.tuning)
  }
}
