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
  ringFor,
  influenceRadii,
  START_CLEARANCE,
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
import {
  centerStart,
  clampToField,
  layoutFromRuntime,
  startClearanceIntruders,
  startState,
  toRuntimePlanets,
  toRuntimeStars,
  type LevelLayout,
} from './levels'

export { GAME_W, GAME_H }

/** What the scene is playing. `test` runs come from the editor and submit no score. */
export type LevelSource =
  | { kind: 'random' }
  | { kind: 'authored'; layout: LevelLayout; test: boolean }

/** Why a run ended: a loss, or collecting every star of an authored level. */
export type EndReason = LossReason | 'complete'

/** Something the editor can select or drag on the canvas. */
export type EditTarget =
  | { kind: 'planet'; index: number }
  | { kind: 'star'; index: number }
  | { kind: 'start' }

/** Payload of the `edit-move` event, emitted once when a drag ends. */
export type EditMove =
  | { target: { kind: 'planet' | 'star'; index: number }; x: number; y: number }
  | { target: { kind: 'start' }; x: number; y: number; angleDeg?: number }

/** Hit padding for small targets (stars, the start marker), and extra for planets. */
const EDIT_HIT_PAD = 20
const EDIT_PLANET_PAD = 6
/** A press that moves less than this is a tap, not a drag. */
const EDIT_DRAG_SLOP = 3

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

/** Registry key under which the host passes the tuning to start with. */
export const INITIAL_TUNING_KEY = 'initialTuning'

export default class OrbitalDodgerScene extends Phaser.Scene {
  /** Live tuning object. The tuning panel mutates this in place; we re-read it each sub-step. */
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
  /** A run starts frozen at the start position; the first press launches it. */
  private awaitingLaunch = false

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

  /** Null until the host loads a level: the scene idles on the background. */
  private source: LevelSource | null = null
  /** An in-orbit start: the first press only starts the run (cleared on its release). */
  private swallowPress = false

  /** Edit mode: the simulation is frozen and input selects and drags. */
  private editing = false
  /** The scene's own copy of the editor's draft; drags move it for smooth feedback. */
  private editLayout: LevelLayout | null = null
  private editSelection: EditTarget | null = null
  private editDrag: { target: EditTarget; grabDx: number; grabDy: number; downX: number; downY: number; moved: boolean } | null = null

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
  /** Per planet: its image and its wrap ghosts, so a drag can move them. */
  private planetImages: { main: Phaser.GameObjects.Image; ghosts: Phaser.GameObjects.Image[] }[] = []
  /** Set at the end of create(); the host waits for it before calling in. */
  ready = false
  private launchText!: Phaser.GameObjects.Text

  constructor() {
    super('OrbitalDodgerScene')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0e1c')

    this.bgGfx = this.add.graphics()
    this.planetLayer = this.add.container(0, 0)
    this.gfx = this.add.graphics()
    this.launchText = this.add
      .text(GAME_W / 2, GAME_H / 2 + 56, 'Touch and drag to launch', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#0a0e1c',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false)

    // The host resolves the selected config before booting and hands it over via
    // the registry, so the very first layout, fuel and shields come from it.
    const initial = this.registry.get(INITIAL_TUNING_KEY) as Tuning | undefined
    if (initial) Object.assign(this.tuning, initial)

    this.makeBgStars()
    this.drawBgStars()
    // No layout yet: the host shows the level picker and calls loadLevel().

    // Fix 1 (kb/phaser-mobile-input.md): canvas press-and-drag goes through the
    // scene's own pointer input, never a DOM click off the canvas. Edit mode
    // uses the same listeners and skips the steering paths entirely.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.editing) this.pressEdit(p)
      else this.press(p)
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return
      if (this.editing) this.dragEdit(p)
      else if (!this.swallowPress) this.setTarget(p)
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
    this.ready = true
  }

  private setTarget(p: Phaser.Input.Pointer): void {
    this.pointerTarget = { x: p.worldX, y: p.worldY }
  }

  /** A new press starts a steer — and is the only thing that breaks a locked orbit. */
  private press(p: Phaser.Input.Pointer): void {
    if (!this.running) return
    if (this.awaitingLaunch && this.swallowPress) {
      // An in-orbit start: this press only starts the run. No steer, no break;
      // swallowPress stays set until the press ends (releasePointer).
      this.awaitingLaunch = false
      this.accumulator = 0
      return
    }
    this.pressOrigin = { x: p.worldX, y: p.worldY }
    this.setTarget(p)
    if (this.awaitingLaunch) {
      // The launching press is also a steer: thrust applies from the first sub-step.
      this.awaitingLaunch = false
      this.accumulator = 0
    }
    if (this.lock) {
      this.recaptureBlock = this.lock.planetIdx
      this.lock = null
    }
  }

  private releasePointer(): void {
    if (this.editing) this.releaseEdit()
    this.pointerTarget = null
    this.pressOrigin = null
    // Only once the run is going: before the first press the swallow is armed.
    if (!this.awaitingLaunch) this.swallowPress = false
  }

  // ─── Layout ─────────────────────────────────────────────────────────────────

  private makeBgStars(): void {
    this.bgStars = Array.from({ length: 130 }, () => ({
      x: Math.random() * GAME_W,
      y: Math.random() * GAME_H,
      s: 0.5 + Math.random() * 1.3,
      a: 0.3 + Math.random() * 0.7,
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
    this.planetImages = []
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
      // Lit rim: the shadow side otherwise melts into the background on a phone.
      ctx.strokeStyle = p.color1
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(c, c, p.r - 0.75, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      tex.refresh()

      this.planetTextureKeys.push(key)
      const ghosts: Phaser.GameObjects.Image[] = []
      for (const [ox, oy] of GHOST_OFFSETS) {
        const ghost = this.add.image(p.x + ox, p.y + oy, key).setAlpha(0.6).setVisible(false)
        ghosts.push(ghost)
        this.ghostImages.push(ghost)
        this.planetLayer.add(ghost)
      }
      const main = this.add.image(p.x, p.y, key)
      this.planetLayer.add(main)
      this.planetImages.push({ main, ghosts })
    })
  }

  private movePlanetImages(i: number, x: number, y: number): void {
    const imgs = this.planetImages[i]
    if (!imgs) return
    imgs.main.setPosition(x, y)
    imgs.ghosts.forEach((g, k) => g.setPosition(x + GHOST_OFFSETS[k][0], y + GHOST_OFFSETS[k][1]))
  }

  /**
   * Replace every tuning value at once (a config was chosen). Before the first
   * press nothing has happened yet, so restart the frozen run from the new
   * values: Random also regenerates (planet count included), an authored level
   * keeps its geometry. While editing, the values apply and the frame redraws.
   * Mid-run the usual live-apply rules hold.
   */
  applyTuning(t: Tuning): void {
    Object.assign(this.tuning, t)
    if (this.editing || !this.source || !this.awaitingLaunch) return
    if (this.source.kind === 'random') this.newLayout()
    else this.retry()
  }

  /** Start playing a level: Random generates, an authored level is built as saved. */
  loadLevel(src: LevelSource): void {
    this.editing = false
    this.editLayout = null
    this.editSelection = null
    this.editDrag = null
    this.source = src
    if (src.kind === 'random') {
      this.newLayout()
      return
    }
    this.planets = toRuntimePlanets(src.layout)
    this.buildPlanetTextures()
    this.retry()
  }

  /** Back to the idle background, behind the level picker. */
  unload(): void {
    this.source = null
    this.editing = false
    this.editLayout = null
    this.running = false
    this.awaitingLaunch = false
    this.swallowPress = false
    this.releasePointer()
    this.lock = null
    this.planets = []
    this.stars = []
    this.rings = []
    this.trail = []
    this.particles = []
    this.forecastPts = []
    this.clearPlanetTextures()
  }

  /** Fresh planets *and* a fresh run. Random level only. */
  newLayout(): void {
    if (this.source?.kind !== 'random') return
    this.planets = generatePlanets(GAME_W, GAME_H, this.tuning)
    this.buildPlanetTextures()
    this.retry()
  }

  /** Fresh run on the existing layout, frozen at the level's start and at rest. */
  retry(): void {
    const src = this.source
    if (!src || this.editing) return
    const layout: LevelLayout =
      src.kind === 'random' ? { v: 1, start: centerStart(), planets: [], stars: [] } : src.layout
    const start = startState(layout, this.planets, this.tuning)
    this.ship = start.ship
    this.stars = src.kind === 'random' ? spawnStarSet(GAME_W, GAME_H, this.planets) : toRuntimeStars(src.layout)
    this.particles = []
    this.trail = []
    this.releasePointer()
    this.lastDir = null
    this.thrustDir = null
    this.lock = start.lock
    this.swallowPress = start.lock !== null
    this.lockedArc = 0
    this.recaptureBlock = null
    this.emptySec = 0
    this.shields = this.tuning.shieldCharges
    this.graceLeft = 0
    this.score = 0
    this.fuel = this.tuning.maxFuel
    this.accumulator = 0
    this.forecastPts = []
    this.lastForecast = -Infinity
    this.awaitingLaunch = true
    this.running = true
    this.emitState(true)
  }

  /** The live Random geometry with a center start, for Save as level. */
  currentLayout(): LevelLayout {
    return layoutFromRuntime(this.planets, this.stars, centerStart())
  }

  // ─── Loop ───────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const wrap = this.tuning.edgeMode === 'wrap'
    if (this.editing) {
      this.launchText.setVisible(false)
      for (const g of this.ghostImages) g.setVisible(wrap)
      this.drawEdit()
      return
    }

    if (this.running && !this.awaitingLaunch) {
      // A dropped pointerup (see create()) would otherwise latch thrust on — or,
      // on an in-orbit start, leave the swallow latched to eat the next real press.
      if ((this.pointerTarget || this.swallowPress) && !this.input.activePointer.isDown) this.releasePointer()

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

    this.launchText.setVisible(this.running && this.awaitingLaunch)
    if (this.awaitingLaunch) this.rings = orbitRings(this.planets, this.tuning)

    if (this.running && time - this.lastForecast >= FORECAST_INTERVAL_MS) {
      this.lastForecast = time
      // While locked the highlighted ring *is* the path.
      this.forecastPts = this.lock ? [] : projectForecast(this.ship, this.planets, this.tuning)
    }

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
      if (this.source?.kind === 'random') {
        this.stars = spawnStarSet(GAME_W, GAME_H, this.planets)
      } else {
        // An authored level is complete once every star is in; the bonus is in the score.
        this.endRun('complete')
        return
      }
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

  private endRun(reason: EndReason): void {
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
    // Stars left on an authored level; null on Random, where they respawn.
    this.game.events.emit(
      'stars',
      this.source && this.source.kind !== 'random' ? this.stars.filter((s) => !s.collected).length : null,
    )
    if (final) this.lastEmit = this.time.now
  }

  // ─── Edit mode ──────────────────────────────────────────────────────────────
  // React owns the draft; the scene renders it, hit-tests, and moves its own copy
  // during a drag, reporting the final position once on release (edit-move).

  /** Freeze whatever is on screen and show `layout` for editing. */
  startEditing(layout: LevelLayout, selection: EditTarget | null = null): void {
    this.running = false
    this.awaitingLaunch = false
    this.swallowPress = false
    this.pointerTarget = null
    this.pressOrigin = null
    this.lock = null
    this.trail = []
    this.particles = []
    this.forecastPts = []
    this.editing = true
    this.setDraft(layout, selection)
  }

  /** The editor's draft changed: take a copy, rebuild textures, redraw. */
  setDraft(layout: LevelLayout, selection: EditTarget | null = null): void {
    this.editLayout = JSON.parse(JSON.stringify(layout)) as LevelLayout
    this.editSelection = selection
    // A draft can arrive mid-drag (e.g. a tuning-driven redraw): keep the drag
    // going unless its object is gone.
    const d = this.editDrag?.target
    if (d && ((d.kind === 'planet' && !layout.planets[d.index]) || (d.kind === 'star' && !layout.stars[d.index]))) {
      this.editDrag = null
    }
    this.planets = toRuntimePlanets(this.editLayout)
    this.stars = toRuntimeStars(this.editLayout)
    this.buildPlanetTextures()
  }

  /** Where the start is shown: a point, or on (or at the height of) its ring. */
  private editStartPos(): { x: number; y: number; vx: number; vy: number } {
    return startState(this.editLayout!, this.planets, this.tuning).ship
  }

  /** Stars, then the start, then the smallest planet: small things win ties. */
  private hitTest(x: number, y: number): EditTarget | null {
    let best: EditTarget | null = null
    let bestD = EDIT_HIT_PAD
    this.stars.forEach((s, i) => {
      const d = Math.hypot(s.x - x, s.y - y)
      if (d < bestD) {
        bestD = d
        best = { kind: 'star', index: i }
      }
    })
    if (best) return best
    const st = this.editStartPos()
    if (Math.hypot(st.x - x, st.y - y) < EDIT_HIT_PAD) return { kind: 'start' }
    let bestR = Infinity
    this.planets.forEach((p, i) => {
      if (Math.hypot(p.x - x, p.y - y) < p.r + EDIT_PLANET_PAD && p.r < bestR) {
        bestR = p.r
        best = { kind: 'planet', index: i }
      }
    })
    return best
  }

  private pressEdit(p: Phaser.Input.Pointer): void {
    if (!this.editLayout) return
    const x = p.worldX
    const y = p.worldY
    const target = this.hitTest(x, y)
    if (!target) {
      this.editDrag = null
      this.game.events.emit('edit-tap', x, y)
      return
    }
    const at = this.editTargetPos(target)
    this.editDrag = { target, grabDx: at.x - x, grabDy: at.y - y, downX: x, downY: y, moved: false }
    // Highlight now, but report the selection on release (releaseEdit): the
    // editor opens its inspector on selection, and it must not cover a drag.
    this.editSelection = target
  }

  private editTargetPos(t: EditTarget): { x: number; y: number } {
    if (t.kind === 'planet') return this.planets[t.index]
    if (t.kind === 'star') return this.stars[t.index]
    return this.editStartPos()
  }

  private dragEdit(p: Phaser.Input.Pointer): void {
    const drag = this.editDrag
    const layout = this.editLayout
    if (!drag || !layout) return
    if (!drag.moved && Math.hypot(p.worldX - drag.downX, p.worldY - drag.downY) < EDIT_DRAG_SLOP) return
    drag.moved = true
    const { x, y } = clampToField(p.worldX + drag.grabDx, p.worldY + drag.grabDy)
    const t = drag.target
    if (t.kind === 'planet') {
      Object.assign(this.planets[t.index], { x, y })
      Object.assign(layout.planets[t.index], { x, y })
      this.movePlanetImages(t.index, x, y)
    } else if (t.kind === 'star') {
      Object.assign(this.stars[t.index], { x, y })
      Object.assign(layout.stars[t.index], { x, y })
    } else if (layout.start.kind === 'orbit') {
      // An orbit start slides along its ring: only the angle changes.
      const c = this.planets[layout.start.planet]
      const angleDeg = (Math.atan2(p.worldY - c.y, p.worldX - c.x) * 180) / Math.PI
      layout.start.angleDeg = Math.round(angleDeg * 10) / 10
    } else {
      layout.start = { kind: 'point', x, y }
    }
  }

  /** End of a press in edit mode: report a completed drag once, then the selection. */
  private releaseEdit(): void {
    const drag = this.editDrag
    this.editDrag = null
    const layout = this.editLayout
    if (!drag || !layout) return
    if (!drag.moved) {
      this.game.events.emit('edit-select', drag.target)
      return
    }
    const t = drag.target
    let move: EditMove
    if (t.kind === 'start') {
      const s = layout.start
      const at = this.editStartPos()
      move = s.kind === 'orbit'
        ? { target: t, x: at.x, y: at.y, angleDeg: s.angleDeg }
        : { target: t, x: s.x, y: s.y }
    } else {
      const obj = t.kind === 'planet' ? layout.planets[t.index] : layout.stars[t.index]
      move = { target: t, x: obj.x, y: obj.y }
    }
    this.game.events.emit('edit-move', move)
    this.game.events.emit('edit-select', t)
  }

  private drawEdit(): void {
    const g = this.gfx
    g.clear()
    const layout = this.editLayout
    if (!layout) return
    const t = this.tuning
    const offsets: [number, number][] = t.edgeMode === 'wrap' ? [[0, 0], ...GHOST_OFFSETS] : [[0, 0]]

    // Rings as the current config builds them; a dropped ring is simply absent
    // (the editor names the reason).
    const S = t.influenceZones ? influenceRadii(this.planets, t) : null
    const orbited = layout.start.kind === 'orbit' ? layout.start.planet : -1
    this.planets.forEach((_, i) => {
      const ring = ringFor(i, this.planets, t, GAME_W, GAME_H, S)
      if ('dropped' in ring) return
      const hi = i === orbited
      g.lineStyle(hi ? 2.5 : 1.5, hi ? 0x8effc1 : 0xc8dcff, hi ? 0.9 : 0.45)
      for (const [ox, oy] of offsets) g.strokeCircle(ring.x + ox, ring.y + oy, ring.R)
    })

    for (const s of this.stars) {
      g.fillStyle(0xffd76c, 1)
      g.fillCircle(s.x, s.y, s.r)
    }

    // Start clearance: red when a planet (other than an orbited one) is inside it.
    const st = this.editStartPos()
    const intruded = startClearanceIntruders(layout, this.planets, t).length > 0
    g.lineStyle(1.5, intruded ? 0xff4d4d : 0x7cd4ff, intruded ? 0.8 : 0.3)
    g.strokeCircle(st.x, st.y, START_CLEARANCE)

    // Start marker: the ship, plus a direction arrow for an orbit start.
    g.fillStyle(0x7cd4ff, 1)
    g.fillCircle(st.x, st.y, t.shipRadius)
    g.lineStyle(1.5, 0xffffff, 0.9)
    g.strokeCircle(st.x, st.y, t.shipRadius)
    const speed = Math.hypot(st.vx, st.vy)
    if (layout.start.kind === 'orbit' && speed > 0) {
      const ux = st.vx / speed
      const uy = st.vy / speed
      const tipX = st.x + ux * 24
      const tipY = st.y + uy * 24
      g.lineStyle(2.5, 0x8effc1, 1)
      g.beginPath()
      g.moveTo(st.x + ux * 8, st.y + uy * 8)
      g.lineTo(tipX, tipY)
      g.strokePath()
      g.fillStyle(0x8effc1, 1)
      g.fillTriangle(
        tipX + ux * 7, tipY + uy * 7,
        tipX - uy * 5, tipY + ux * 5,
        tipX + uy * 5, tipY - ux * 5,
      )
    }

    const sel = this.editSelection
    if (sel) {
      g.lineStyle(2, 0xffe066, 1)
      if (sel.kind === 'planet' && this.planets[sel.index]) {
        const p = this.planets[sel.index]
        g.strokeCircle(p.x, p.y, p.r + EDIT_PLANET_PAD)
      } else if (sel.kind === 'star' && this.stars[sel.index]) {
        const s = this.stars[sel.index]
        g.strokeCircle(s.x, s.y, 12)
      } else if (sel.kind === 'start') {
        g.strokeCircle(st.x, st.y, t.shipRadius + 8)
      }
    }
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
      g.lineStyle(locked ? 3 : 1.5, locked ? 0x8effc1 : 0xc8dcff, locked ? 1 : 0.45)
      for (const [ox, oy] of offsets) g.strokeCircle(ring.x + ox, ring.y + oy, ring.R)
    }

    // Forecast: fades along its length so the near term reads strongest. A `brk`
    // point starts a new run, so a wrap seam never draws a line across the field.
    const pts = this.forecastPts
    if (pts.length > 1 && t.forecastRange > 0) {
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].brk) continue
        const f = i / pts.length
        g.lineStyle(2, 0xffffff, 0.25 + (1 - f) * 0.7)
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
      g.fillStyle(0x7cd4ff, 0.15 + (i / this.trail.length) * 0.8)
      g.fillCircle(this.trail[i].x, this.trail[i].y, 2.5)
    }

    // Steering guide: relative mode is a joystick from the press origin; direct
    // mode is the line from ship to finger.
    if (this.pointerTarget) {
      const color = this.fuel > 0 ? 0x7cd4ff : 0xff6b6b
      const from = t.controlMode === 'relative' ? this.pressOrigin : this.ship
      if (from) {
        if (t.controlMode === 'relative') {
          g.lineStyle(1.5, color, 0.6)
          g.strokeCircle(from.x, from.y, t.controlDeadzone)
          // Outer ring: drag this far for full thrust.
          g.lineStyle(1.5, color, 0.4)
          g.strokeCircle(from.x, from.y, t.controlFullDrag)
        }
        g.lineStyle(2.5, color, 0.75)
        g.beginPath()
        g.moveTo(from.x, from.y)
        g.lineTo(this.pointerTarget.x, this.pointerTarget.y)
        g.strokePath()
      }
    }

    // Heading tick: the direction thrust is actually being applied.
    if (this.thrustDir && this.running) {
      const r = t.shipRadius
      g.lineStyle(3, 0xffa94d, 1)
      g.beginPath()
      g.moveTo(this.ship.x - this.thrustDir.x * r, this.ship.y - this.thrustDir.y * r)
      g.lineTo(this.ship.x - this.thrustDir.x * (r + 8), this.ship.y - this.thrustDir.y * (r + 8))
      g.strokePath()
    }

    if (!this.source) return

    // Red flash during the shield grace period.
    const flashing = this.graceLeft > 0 && Math.floor(this.graceLeft / FLASH_PERIOD) % 2 === 0
    g.fillStyle(flashing ? 0xff4d4d : 0x7cd4ff, 1)
    g.fillCircle(this.ship.x, this.ship.y, t.shipRadius)
    // Bright rim so the ship pops off both space and a planet behind it.
    g.lineStyle(1.5, 0xffffff, 0.9)
    g.strokeCircle(this.ship.x, this.ship.y, t.shipRadius)
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
    g.lineStyle(2.5, rgb, 0.9 * pulse)
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
