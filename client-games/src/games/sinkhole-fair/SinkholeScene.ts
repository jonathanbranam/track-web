import * as Phaser from 'phaser'
import {
  FALL_MS, MAP_SIZE, PLAYER_ID, finalScore, newWorld, percentEaten, roundMs, standings, step,
  type Hole, type Mode, type Obj, type World,
} from './rules'

export const MODE_KEY = 'sinkhole.mode'

/** Joystick drag length (px) that gives full speed. */
const STICK_MAX = 60
const HUD_MS = 200
const HOLE_COLORS = [0xffffff, 0xef5350, 0x42a5f5, 0xffca28, 0xab47bc, 0x26a69a, 0xff7043]

export interface HudRow {
  name: string
  mass: number
  bot: boolean
  you: boolean
}

export interface HudState {
  remainingMs: number
  rank: number
  rows: HudRow[]
  percent: number
  level: number
  respawning: boolean
}

export interface EndState {
  mode: Mode
  rows: HudRow[]
  score: number
  percent: number
  cleared: boolean
}

export interface StickState {
  active: boolean
  ox: number
  oy: number
  x: number
  y: number
}

const PEOPLE = [0xe53935, 0x1e88e5, 0xfdd835, 0x8e24aa, 0xfb8c00]

/** Draws one fairground object, centred on (0, 0), as flat colour and a shadow. */
function drawObject(g: Phaser.GameObjects.Graphics, o: Obj): void {
  const r = o.r
  g.fillStyle(0x000000, 0.22)
  g.fillEllipse(r * 0.12, r * 0.18, r * 2, r * 1.9)
  switch (o.tier) {
    case 1:
      g.fillStyle(0xfff3c4)
      g.fillCircle(0, 0, r)
      g.fillStyle(0xffd54f)
      g.fillCircle(-r * 0.3, -r * 0.2, r * 0.35)
      g.fillCircle(r * 0.3, r * 0.25, r * 0.3)
      break
    case 2:
      g.fillStyle(PEOPLE[Math.floor(o.spin * PEOPLE.length)])
      g.fillCircle(0, 0, r)
      g.fillStyle(0xffcc99)
      g.fillCircle(0, 0, r * 0.5)
      break
    case 3:
      g.fillStyle(0xe6b84a)
      g.fillRoundedRect(-r, -r * 0.7, r * 2, r * 1.4, r * 0.25)
      g.lineStyle(2, 0xb8892b)
      for (const k of [-0.4, 0.4]) g.lineBetween(k * r, -r * 0.7, k * r, r * 0.7)
      break
    case 4:
      g.fillStyle(0xd84315)
      g.fillRoundedRect(-r, -r * 0.65, r * 2, r * 1.3, r * 0.15)
      g.fillStyle(0xfff3e0)
      g.fillRect(r * 0.2, -r * 0.5, r * 0.65, r)
      g.fillStyle(0xffffff)
      g.fillRect(-r * 0.8, -r * 0.35, r * 0.8, r * 0.7)
      break
    case 5:
      g.fillStyle(0x2e7d32)
      g.fillCircle(0, 0, r)
      g.fillStyle(0x43a047)
      g.fillCircle(-r * 0.15, -r * 0.15, r * 0.7)
      g.fillStyle(0x66bb6a)
      g.fillCircle(-r * 0.25, -r * 0.25, r * 0.35)
      break
    case 6:
    case 7: {
      const wedges = o.tier === 6 ? 6 : 10
      for (let i = 0; i < wedges; i++) {
        const a0 = (i / wedges) * Math.PI * 2
        const a1 = ((i + 1) / wedges) * Math.PI * 2
        g.fillStyle(i % 2 ? 0xfafafa : o.tier === 6 ? 0xe53935 : 0x3949ab)
        g.slice(0, 0, r, a0, a1, false)
        g.fillPath()
      }
      g.fillStyle(0xffd54f)
      g.fillCircle(0, 0, r * 0.18)
      break
    }
    default:
      g.lineStyle(r * 0.14, 0x455a64)
      g.strokeCircle(0, 0, r * 0.88)
      g.lineStyle(3, 0x78909c)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI
        g.lineBetween(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88, -Math.cos(a) * r * 0.88, -Math.sin(a) * r * 0.88)
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        g.fillStyle(PEOPLE[i % PEOPLE.length])
        g.fillCircle(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88, r * 0.1)
      }
  }
}

export default class SinkholeScene extends Phaser.Scene {
  private world!: World
  private objGfx = new Map<number, Phaser.GameObjects.Graphics>()
  private holeGfx = new Map<number, Phaser.GameObjects.Graphics>()
  private holeName = new Map<number, Phaser.GameObjects.Text>()
  private stick = { active: false, ox: 0, oy: 0, x: 0, y: 0 }
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>
  private hudAcc = 0
  private ended = false
  private audio: AudioContext | null = null
  private zoom = 1
  /** Dev test hook: when set, replaces the player's input for one stepped move. */
  private forcedInput: { x: number; y: number } | null = null

  constructor() {
    super('SinkholeScene')
  }

  create(): void {
    const mode = (this.registry.get(MODE_KEY) as Mode | undefined) ?? 'classic'
    this.world = newWorld({ mode, seed: (Date.now() & 0x7fffffff) | 1, playerName: 'You' })
    this.ended = false
    this.hudAcc = HUD_MS
    this.objGfx.clear()
    this.holeGfx.clear()
    this.holeName.clear()
    this.cameras.main.setBackgroundColor('#3b5b2a')

    const ground = this.add.graphics().setDepth(-10)
    ground.fillStyle(0x6aa84f)
    ground.fillRect(0, 0, MAP_SIZE, MAP_SIZE)
    ground.fillStyle(0x76b55a)
    for (let x = 0; x < MAP_SIZE; x += 200) for (let y = 0; y < MAP_SIZE; y += 200) if (((x + y) / 200) % 2 === 0) ground.fillRect(x, y, 200, 200)
    ground.fillStyle(0xd7c49a)
    ground.fillRect(MAP_SIZE / 2 - 60, 0, 120, MAP_SIZE)
    ground.fillRect(0, MAP_SIZE / 2 - 60, MAP_SIZE, 120)
    ground.lineStyle(10, 0x3e2f1c)
    ground.strokeRect(0, 0, MAP_SIZE, MAP_SIZE)

    const kb = this.input.keyboard!
    this.keys = kb.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D' }) as typeof this.keys
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.wake()
      this.stick = { active: true, ox: p.x, oy: p.y, x: p.x, y: p.y }
      this.emitStick()
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.stick.active) return
      this.stick.x = p.x
      this.stick.y = p.y
      this.emitStick()
    })
    const release = () => {
      this.stick.active = false
      this.emitStick()
    }
    this.input.on('pointerup', release)
    this.input.on('pointerupoutside', release)
    kb.on('keydown', () => this.wake())

    const p = this.world.holes[PLAYER_ID]
    this.zoom = this.targetZoom(p)
    this.cameras.main.setZoom(this.zoom).centerOn(p.x, p.y)
    this.installHook()
    this.events.once('shutdown', () => {
      this.removeHook()
      void this.audio?.close()
      this.audio = null
    })
  }

  update(_time: number, delta: number): void {
    if (this.ended) return
    this.advance(Math.min(delta, 50), this.readInput())
    this.syncVisuals(delta)
    this.hudAcc += delta
    if (this.hudAcc >= HUD_MS || this.world.over) {
      this.hudAcc = 0
      this.game.events.emit('hud', this.hud())
    }
    if (this.world.over) this.finish()
  }

  private advance(ms: number, input: { x: number; y: number }): void {
    step(this.world, ms, input)
    for (const e of this.world.events) {
      if (e.type === 'eat') {
        if (e.hole === PLAYER_ID) {
          this.pop(e.tier)
          this.floatText(e.x, e.y, `+${e.points}`)
        }
      } else if (e.type === 'levelup') {
        const h = this.world.holes[e.hole]
        this.ring(h)
        if (e.hole === PLAYER_ID) this.flourish()
      } else if (e.type === 'swallowed') {
        if (e.victim === PLAYER_ID || e.eater === PLAYER_ID) this.tone(110, 0.25, 'sawtooth')
      }
    }
  }

  private readInput(): { x: number; y: number } {
    if (this.forcedInput) return this.forcedInput
    const k = this.keys
    const kx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0)
    const ky = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0)
    if (kx || ky) return { x: kx, y: ky }
    if (!this.stick.active) return { x: 0, y: 0 }
    const dx = this.stick.x - this.stick.ox
    const dy = this.stick.y - this.stick.oy
    const len = Math.hypot(dx, dy)
    if (len < 4) return { x: 0, y: 0 }
    const m = Math.min(1, len / STICK_MAX)
    return { x: (dx / len) * m, y: (dy / len) * m }
  }

  private targetZoom(p: Hole): number {
    const cam = this.cameras.main
    return (Math.min(cam.width, cam.height) * 0.11) / p.radius
  }

  private syncVisuals(delta: number): void {
    const w = this.world
    const seen = new Set<number>()
    for (const o of w.objs) {
      seen.add(o.id)
      let g = this.objGfx.get(o.id)
      if (!g) {
        g = this.add.graphics().setDepth(o.tier)
        drawObject(g, o)
        g.setRotation(o.spin * 6.28)
        this.objGfx.set(o.id, g)
      }
      g.setPosition(o.x, o.y)
      if (o.fallBy !== null) {
        const k = Math.min(1, o.fallMs / FALL_MS)
        g.setScale(1 - k).setRotation(o.spin * 6.28 + k * 1.2)
      }
    }
    for (const [id, g] of this.objGfx) {
      if (!seen.has(id)) {
        g.destroy()
        this.objGfx.delete(id)
      }
    }

    const z = this.zoom
    for (const h of w.holes) {
      let g = this.holeGfx.get(h.id)
      let name = this.holeName.get(h.id)
      if (!g || !name) {
        g = this.add.graphics().setDepth(20)
        name = this.add.text(0, 0, h.bot ? `${h.name} [bot]` : h.name, { fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(30)
        this.holeGfx.set(h.id, g)
        this.holeName.set(h.id, name)
      }
      const visible = h.respawnAt === null
      g.setVisible(visible)
      name.setVisible(visible)
      if (!visible) continue
      const blink = w.t < h.invulnUntil && Math.floor(w.t / 120) % 2 === 0
      g.clear()
      g.setAlpha(blink ? 0.35 : 1)
      const color = HOLE_COLORS[h.id % HOLE_COLORS.length]
      g.fillStyle(0x000000, 0.35)
      g.fillCircle(h.x + h.radius * 0.06, h.y + h.radius * 0.1, h.radius * 1.1)
      g.lineStyle(Math.max(3, h.radius * 0.12), color)
      g.fillStyle(0x0b0b10)
      g.fillCircle(h.x, h.y, h.radius)
      g.strokeCircle(h.x, h.y, h.radius)
      g.fillStyle(0x000000)
      g.fillCircle(h.x, h.y, h.radius * 0.7)
      name.setPosition(h.x, h.y - h.radius - 6 / z).setScale(1 / z)
    }

    const p = w.holes[PLAYER_ID]
    const cam = this.cameras.main
    if (p.respawnAt === null) {
      this.zoom += (this.targetZoom(p) - this.zoom) * Math.min(1, (delta / 1000) * 5)
      cam.setZoom(this.zoom)
      cam.centerOn(p.x, p.y)
    }
  }

  private hud(): HudState {
    const w = this.world
    const rows = standings(w).map((h) => ({ name: h.name, mass: h.mass, bot: h.bot, you: h.id === PLAYER_ID }))
    const p = w.holes[PLAYER_ID]
    return {
      remainingMs: Math.max(0, roundMs(w.mode) - w.t),
      rank: rows.findIndex((r) => r.you) + 1,
      rows,
      percent: percentEaten(w),
      level: p.level,
      respawning: p.respawnAt !== null,
    }
  }

  private finish(): void {
    this.ended = true
    const w = this.world
    const end: EndState = {
      mode: w.mode,
      rows: this.hud().rows,
      score: finalScore(w),
      percent: percentEaten(w),
      cleared: w.eatenMass >= w.totalMass,
    }
    this.game.events.emit('end', end)
  }

  private emitStick(): void {
    this.game.events.emit('stick', { ...this.stick } satisfies StickState)
  }

  // --- feedback ---

  private floatText(x: number, y: number, text: string): void {
    const t = this.add.text(x, y, text, { fontSize: '18px', color: '#fff59d', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(40).setScale(1 / this.zoom)
    this.tweens.add({ targets: t, y: y - 50 / this.zoom, alpha: 0, duration: 700, onComplete: () => t.destroy() })
  }

  private ring(h: Hole): void {
    const g = this.add.graphics().setDepth(25)
    g.lineStyle(6 / this.zoom, 0xffffff)
    g.strokeCircle(0, 0, h.radius)
    g.setPosition(h.x, h.y)
    this.tweens.add({ targets: g, scale: 2.2, alpha: 0, duration: 500, onComplete: () => g.destroy() })
  }

  private wake(): void {
    if (!this.audio) {
      try {
        this.audio = new AudioContext()
      } catch {
        this.audio = null
      }
    }
    void this.audio?.resume()
  }

  private tone(freq: number, secs: number, type: OscillatorType = 'sine', delay = 0): void {
    const ctx = this.audio
    if (!ctx || ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t0 = ctx.currentTime + delay
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    gain.gain.setValueAtTime(0.12, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + secs)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + secs)
  }

  /** A pop that is lower for bigger tiers. */
  private pop(tier: number): void {
    this.tone(820 - tier * 80, 0.12)
  }

  private flourish(): void {
    this.tone(523, 0.12, 'triangle')
    this.tone(659, 0.12, 'triangle', 0.1)
    this.tone(784, 0.2, 'triangle', 0.2)
  }

  // --- dev-only test hook (window.__game), folded out of production builds ---

  private installHook(): void {
    if (!import.meta.env.DEV) return
    const dirs = [
      [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
    ].map(([x, y]) => ({ x, y, ms: 500 }))
    ;(window as unknown as { __game?: unknown }).__game = {
      name: 'sinkhole-fair',
      getState: () => this.world,
      /** The eight compass moves `move` accepts; steering is continuous, so this is a sample. */
      legalMoves: () => (this.world.over ? [] : dirs),
      /** Hold the stick toward (x, y) for `ms` of game time, stepping the world directly. */
      move: (m: { x: number; y: number; ms: number }) => {
        if (this.world.over) return false
        for (let left = m.ms; left > 0 && !this.world.over; left -= 50) this.advance(Math.min(50, left), m)
        return true
      },
      restart: () => this.scene.restart(),
      /** Force the player's input, or pass null to go back to real controls. */
      setInput: (v: { x: number; y: number } | null) => {
        this.forcedInput = v
      },
    }
  }

  private removeHook(): void {
    if (import.meta.env.DEV) delete (window as unknown as { __game?: unknown }).__game
  }
}
