import * as Phaser from 'phaser'
import {
  SIZES,
  type BallSize,
  sizeInfo,
  nextSize,
  mergeScore,
  pickSpawnSize,
  isOverflow,
} from './logic'
import { findLevel, type LevelDef } from './levels'

// Logical game dimensions (the canvas is scaled to fit the viewport).
export const GAME_W = 400
export const GAME_H = 640

// Wall thickness for physics bodies built from segments.
const WALL_T = 14

// Tuning — gameplay.
const GRACE_MS = 900         // a ball must exist this long before it can trigger overflow
const SETTLE_SPEED = 0.55    // below this a ball is considered "at rest"
const OVERFLOW_SUSTAIN_MS = 400  // ball must stay above topY + slow for this long to lose
const DROP_COOLDOWN_MS = 320
const DEFAULT_GRAVITY_Y = 0.9   // must match the Phaser config in BallMergeGame.tsx

// Tuning — motion controls.
export const SHAKE_COOLDOWN_MS = 2000  // shared cooldown for shake button and physical shake
export const SHAKE_COST = 50           // points deducted per shake
const MAX_TILT_GRAVITY = 0.28          // peak lateral gravity bias at full tilt (fraction of DEFAULT_GRAVITY_Y)
const TILT_SMOOTHING = 0.12            // EMA alpha for tilt: lower = more lag, less jitter
const SHAKE_THRESHOLD = 12             // m/s² acceleration delta to register a physical shake
const JOSTLE_UP_FORCE = 0.020          // upward burst — phase 1; risky if jar is near full
const JOSTLE_LATERAL_FORCE = 0.014    // side-to-side swing — phases 2 & 3
const JOSTLE_SCATTER = 0.004           // per-ball random variation so balls don't move as one block

interface BallImage extends Phaser.Physics.Matter.Image {}

function ellipseVerts(rx: number, ry: number, n = 16): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return { x: Math.cos(a) * rx, y: Math.sin(a) * ry }
  })
}

function drawBall(g: Phaser.GameObjects.Graphics, s: BallSize): void {
  const cx = s.radiusX ?? s.radius
  const cy = s.radiusY ?? s.radius
  const r = s.radius
  const rx = s.radiusX ?? r
  const ry = s.radiusY ?? r

  switch (s.size) {
    case 0: drawPingPong(g, cx, cy, r); break
    case 1: drawGolfBall(g, cx, cy, r); break
    case 2: drawTennis(g, cx, cy, r); break
    case 3: drawBaseball(g, cx, cy, r, 0xef4444); break
    case 4: drawBaseball(g, cx, cy, r, 0x3b82f6); break
    case 5: drawVolleyball(g, cx, cy, r); break
    case 6: drawSoccer(g, cx, cy, r); break
    case 7: drawBasketball(g, cx, cy, r); break
    case 8: drawFootball(g, cx, cy, rx, ry); break
    case 9: drawBeachBall(g, cx, cy, r); break
    case 10: drawYogaBall(g, cx, cy, r); break
  }
}

function drawShine(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0xffffff, 0.22)
  g.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.22)
}

function drawPingPong(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0xff6b35, 1)
  g.fillCircle(cx, cy, r)
  drawShine(g, cx, cy, r)
}

function drawGolfBall(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0xfafafa, 1)
  g.fillCircle(cx, cy, r)
  g.fillStyle(0xcccccc, 1)
  const inner = 6
  const outer = 12
  for (let i = 0; i < inner; i++) {
    const a = (i / inner) * Math.PI * 2
    g.fillCircle(cx + Math.cos(a) * r * 0.38, cy + Math.sin(a) * r * 0.38, r * 0.075)
  }
  for (let i = 0; i < outer; i++) {
    const a = (i / outer) * Math.PI * 2
    g.fillCircle(cx + Math.cos(a) * r * 0.68, cy + Math.sin(a) * r * 0.68, r * 0.075)
  }
  drawShine(g, cx, cy, r)
}

function drawTennis(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0xcfff04, 1)
  g.fillCircle(cx, cy, r)
  // White S-curve seam approximated by sampling a cubic bezier curve
  g.lineStyle(r * 0.12, 0xffffff, 0.9)
  const p0 = [cx - r * 0.3, cy - r * 0.85]
  const p1 = [cx + r * 0.6, cy - r * 0.4]
  const p2 = [cx - r * 0.6, cy + r * 0.4]
  const p3 = [cx + r * 0.3, cy + r * 0.85]
  const steps = 16
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    pts.push({
      x: mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
      y: mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
    })
  }
  g.strokePoints(pts, false)
  drawShine(g, cx, cy, r)
}

function drawStitching(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  color: number,
): void {
  g.lineStyle(r * 0.09, color, 1)
  // Left arc
  g.beginPath()
  g.arc(cx - r * 0.22, cy, r * 0.55, -Math.PI * 0.55, Math.PI * 0.55, false)
  g.strokePath()
  // Right arc (mirrored)
  g.beginPath()
  g.arc(cx + r * 0.22, cy, r * 0.55, Math.PI - Math.PI * 0.55, Math.PI + Math.PI * 0.55, false)
  g.strokePath()
  // Tick marks on left arc
  const tickLen = r * 0.12
  const tickCount = 4
  for (let i = 0; i < tickCount; i++) {
    const t = -0.4 + (i / (tickCount - 1)) * 0.8
    const angle = t * Math.PI * 0.55
    const ax = (cx - r * 0.22) + Math.cos(angle) * r * 0.55
    const ay = cy + Math.sin(angle) * r * 0.55
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    g.beginPath()
    g.moveTo(ax - nx * tickLen * 0.5, ay - ny * tickLen * 0.5)
    g.lineTo(ax + nx * tickLen * 0.5, ay + ny * tickLen * 0.5)
    g.strokePath()
    // Mirrored tick on right arc
    const bAngle = Math.PI - angle
    const bx = (cx + r * 0.22) + Math.cos(bAngle) * r * 0.55
    const by = cy + Math.sin(bAngle) * r * 0.55
    const mx2 = -Math.sin(bAngle)
    const my2 = Math.cos(bAngle)
    g.beginPath()
    g.moveTo(bx - mx2 * tickLen * 0.5, by - my2 * tickLen * 0.5)
    g.lineTo(bx + mx2 * tickLen * 0.5, by + my2 * tickLen * 0.5)
    g.strokePath()
  }
}

function drawBaseball(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  stitchColor: number,
): void {
  const baseColor = stitchColor === 0xef4444 ? 0xfef3c7 : 0xfde047
  g.fillStyle(baseColor, 1)
  g.fillCircle(cx, cy, r)
  drawStitching(g, cx, cy, r, stitchColor)
  drawShine(g, cx, cy, r)
}

function drawVolleyball(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0x60a5fa, 1)
  g.fillCircle(cx, cy, r)
  g.lineStyle(r * 0.07, 0xffffff, 0.85)
  // Horizontal band
  g.beginPath()
  g.arc(cx, cy, r * 0.85, Math.PI * 0.15, Math.PI * 0.85, false)
  g.strokePath()
  g.beginPath()
  g.arc(cx, cy, r * 0.85, Math.PI + Math.PI * 0.15, Math.PI + Math.PI * 0.85, false)
  g.strokePath()
  // Upper-left diagonal band
  g.beginPath()
  g.arc(cx - r * 0.35, cy - r * 0.1, r * 0.9, -Math.PI * 0.5, Math.PI * 0.3, false)
  g.strokePath()
  // Upper-right diagonal band
  g.beginPath()
  g.arc(cx + r * 0.35, cy - r * 0.1, r * 0.9, Math.PI * 0.7, Math.PI * 1.5, false)
  g.strokePath()
  drawShine(g, cx, cy, r)
}

function drawPentagon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
): void {
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = rotation + (i / 5) * Math.PI * 2
    const px = cx + Math.cos(a) * size
    const py = cy + Math.sin(a) * size
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
  g.strokePath()
}

function drawSoccer(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0x1f2937, 1)
  g.fillCircle(cx, cy, r)
  g.lineStyle(r * 0.07, 0xffffff, 1)
  const ps = r * 0.28
  const rot = -Math.PI / 2
  drawPentagon(g, cx, cy, ps, rot)
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * Math.PI * 2
    const ox = cx + Math.cos(a) * r * 0.56
    const oy = cy + Math.sin(a) * r * 0.56
    drawPentagon(g, ox, oy, ps * 0.85, a + Math.PI)
  }
  drawShine(g, cx, cy, r)
}

function drawBasketball(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0xe05d10, 1)
  g.fillCircle(cx, cy, r)
  g.lineStyle(r * 0.07, 0x000000, 0.9)
  // Vertical center seam
  g.beginPath()
  g.arc(cx, cy, r * 0.85, -Math.PI * 0.5, Math.PI * 0.5, false)
  g.strokePath()
  g.beginPath()
  g.arc(cx, cy, r * 0.85, Math.PI * 0.5, Math.PI * 1.5, false)
  g.strokePath()
  // Left lateral seam
  g.beginPath()
  g.arc(cx, cy - r * 0.3, r * 0.82, Math.PI * 0.05, Math.PI * 0.95, false)
  g.strokePath()
  // Right lateral seam
  g.beginPath()
  g.arc(cx, cy + r * 0.3, r * 0.82, Math.PI + Math.PI * 0.05, Math.PI + Math.PI * 0.95, false)
  g.strokePath()
  drawShine(g, cx, cy, r)
}

function drawFootball(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  g.fillStyle(0x78350f, 1)
  g.fillEllipse(cx, cy, rx * 2, ry * 2)
  g.lineStyle(ry * 0.08, 0xffffff, 1)
  // Horizontal center seam
  g.beginPath()
  g.moveTo(cx - rx * 0.7, cy)
  g.lineTo(cx + rx * 0.7, cy)
  g.strokePath()
  // Lace crossbars (4 vertical bars along the center line)
  const laceW = ry * 0.35
  const lacePositions = [-rx * 0.18, -rx * 0.06, rx * 0.06, rx * 0.18]
  g.lineStyle(ry * 0.07, 0xffffff, 1)
  for (const lx of lacePositions) {
    g.beginPath()
    g.moveTo(cx + lx, cy - laceW)
    g.lineTo(cx + lx, cy + laceW)
    g.strokePath()
  }
  drawShine(g, cx, cy, ry)
}

function drawBeachBall(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  const wedgeColors = [0xef4444, 0xffffff, 0x3b82f6, 0xfbbf24, 0x22c55e, 0xf97316]
  const wedgeCount = wedgeColors.length
  g.fillStyle(0xf43f5e, 1)
  g.fillCircle(cx, cy, r)
  for (let i = 0; i < wedgeCount; i++) {
    const startAngle = (i / wedgeCount) * Math.PI * 2 - Math.PI / 2
    const endAngle = ((i + 1) / wedgeCount) * Math.PI * 2 - Math.PI / 2
    g.fillStyle(wedgeColors[i], 1)
    g.beginPath()
    g.moveTo(cx, cy)
    g.arc(cx, cy, r, startAngle, endAngle, false)
    g.closePath()
    g.fillPath()
  }
  // Outline to clean up edges
  g.lineStyle(1, 0x00000000, 0)
  g.strokeCircle(cx, cy, r)
  drawShine(g, cx, cy, r)
}

function drawYogaBall(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0x818cf8, 1)
  g.fillCircle(cx, cy, r)
  drawShine(g, cx, cy, r)
}

/**
 * Ball Merge gameplay scene. Owns the canvas; reports score and game-over to
 * React via `this.game.events`, and listens for a `restart` event from React.
 * The active level definition is read from `game.registry` key `'levelId'`.
 */
export default class BallMergeScene extends Phaser.Scene {
  private balls!: Phaser.GameObjects.Group
  private preview!: Phaser.GameObjects.Image
  private aimLine!: Phaser.GameObjects.Graphics
  private containerGraphics!: Phaser.GameObjects.Graphics
  private containerBodies: MatterJS.BodyType[] = []
  private activeLevelDef!: LevelDef
  private heldSize = 0
  private score = 0
  private gameOver = false
  private canDrop = true
  private tiltEnabled = false
  private smoothedTiltX = 0
  private lastJostleTime = -Infinity
  private prevAccelX = 0
  private prevAccelY = 0
  private boundDeviceMotion: ((e: DeviceMotionEvent) => void) | null = null

  constructor() {
    super('BallMergeScene')
  }

  create() {
    this.balls = this.add.group()
    this.generateTextures()

    this.containerGraphics = this.add.graphics()
    this.activeLevelDef = findLevel(this.game.registry.get('levelId') as string)
    this.buildContainer()

    // Held-ball preview at the top, with a dashed targeting line below it.
    this.aimLine = this.add.graphics()
    this.preview = this.add
      .image(GAME_W / 2, this.activeLevelDef.dropY, 'ball-0')
      .setAlpha(0.85)
    this.readyNextBall()

    this.setupInput()

    this.matter.world.on(
      'collisionstart',
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => this.onCollision(event),
    )

    // React -> scene: game control events.
    this.game.events.on('restart', this.doRestart, this)
    this.game.events.on('tilt-enabled', this.enableTilt, this)
    this.game.events.on('tilt-disabled', this.disableTilt, this)
    this.game.events.on('jostle', this.jostle, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('restart', this.doRestart, this)
      this.game.events.off('tilt-enabled', this.enableTilt, this)
      this.game.events.off('tilt-disabled', this.disableTilt, this)
      this.game.events.off('jostle', this.jostle, this)
      if (this.boundDeviceMotion) {
        window.removeEventListener('devicemotion', this.boundDeviceMotion)
      }
    })

    this.emitScore()
  }

  update() {
    if (this.gameOver) return
    const now = this.time.now
    const children = this.balls.getChildren() as BallImage[]
    for (const ball of children) {
      if (ball.getData('consumed')) continue
      const body = ball.body as MatterJS.BodyType | null
      if (!body) continue
      const radius = sizeInfo(ball.getData('size') as number).radius
      const topEdge = ball.y - radius
      const age = now - (ball.getData('spawnTime') as number)
      if (age > GRACE_MS && isOverflow(topEdge, this.activeLevelDef.topY, body.speed, SETTLE_SPEED)) {
        const overflowSince = ball.getData('overflowSince') as number | null
        if (overflowSince === null) {
          ball.setData('overflowSince', now)
        } else if (now - overflowSince > OVERFLOW_SUSTAIN_MS) {
          this.endGame()
          return
        }
      } else {
        ball.setData('overflowSince', null)
      }
    }
  }

  // --- Setup helpers -------------------------------------------------------

  private generateTextures() {
    for (const s of SIZES) {
      const key = `ball-${s.size}`
      if (this.textures.exists(key)) continue
      const g = this.add.graphics()
      const w = (s.radiusX ?? s.radius) * 2
      const h = (s.radiusY ?? s.radius) * 2
      drawBall(g, s)
      g.generateTexture(key, w, h)
      g.destroy()
    }
  }

  private buildContainer() {
    const level = this.activeLevelDef
    const color = 0x374151

    // Physics: one thin rotated rectangle per segment.
    for (const seg of level.segments) {
      const cx = (seg.x1 + seg.x2) / 2
      const cy = (seg.y1 + seg.y2) / 2
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1)
      const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1)
      const body = this.matter.add.rectangle(cx, cy, len + WALL_T, WALL_T, {
        isStatic: true,
        friction: 0.4,
        angle,
      })
      this.containerBodies.push(body)
    }

    // Visuals: draw each segment as an independent line so ordering doesn't matter.
    this.containerGraphics.lineStyle(WALL_T, color, 1)
    for (const seg of level.segments) {
      this.containerGraphics.beginPath()
      this.containerGraphics.moveTo(seg.x1, seg.y1)
      this.containerGraphics.lineTo(seg.x2, seg.y2)
      this.containerGraphics.strokePath()
    }

    // Faint guide marking the open top / overflow line across the drop zone width.
    this.containerGraphics.lineStyle(1, 0xf87171, 0.35)
    this.containerGraphics.beginPath()
    this.containerGraphics.moveTo(level.dropMinX, level.topY)
    this.containerGraphics.lineTo(level.dropMaxX, level.topY)
    this.containerGraphics.strokePath()
  }

  private clearContainer() {
    this.containerGraphics.clear()
    for (const body of this.containerBodies) {
      this.matter.world.remove(body)
    }
    this.containerBodies = []
  }

  private setupInput() {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.movePreview(p.worldX)
    })
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.movePreview(p.worldX))
    this.input.on('pointerup', () => this.drop())

    const kb = this.input.keyboard
    if (kb) {
      kb.on('keydown-LEFT', () => this.movePreview(this.preview.x - 24))
      kb.on('keydown-RIGHT', () => this.movePreview(this.preview.x + 24))
      kb.on('keydown-SPACE', () => this.drop())
    }
  }

  // --- Gameplay ------------------------------------------------------------

  private readyNextBall() {
    this.heldSize = pickSpawnSize()
    this.preview.setTexture(`ball-${this.heldSize}`)
    this.movePreview(this.preview.x)
  }

  private movePreview(x: number) {
    if (this.gameOver) return
    const r = sizeInfo(this.heldSize).radius
    const min = this.activeLevelDef.dropMinX + r
    const max = this.activeLevelDef.dropMaxX - r
    this.preview.x = Phaser.Math.Clamp(x, min, max)
    this.updateAimLine()
  }

  private updateAimLine() {
    this.aimLine.clear()
    if (this.gameOver) return
    const x = this.preview.x
    const r = sizeInfo(this.heldSize).radius
    const startY = this.activeLevelDef.dropY + r
    const dashLen = 8
    const gapLen = 5
    const step = dashLen + gapLen
    this.aimLine.lineStyle(1.5, 0xffffff, 0.4)
    for (let y = startY; y < GAME_H; y += step) {
      this.aimLine.beginPath()
      this.aimLine.moveTo(x, y)
      this.aimLine.lineTo(x, Math.min(y + dashLen, GAME_H))
      this.aimLine.strokePath()
    }
  }

  private drop() {
    if (this.gameOver || !this.canDrop) return
    this.canDrop = false
    this.addBall(this.preview.x, this.activeLevelDef.dropY, this.heldSize)
    this.readyNextBall()
    this.time.delayedCall(DROP_COOLDOWN_MS, () => {
      this.canDrop = true
    })
  }

  private addBall(x: number, y: number, size: number): BallImage {
    const info = sizeInfo(size)
    const ball = this.matter.add.image(x, y, `ball-${size}`) as BallImage
    if (info.radiusX !== undefined && info.radiusY !== undefined) {
      ball.setBody({ type: 'fromVertices', verts: ellipseVerts(info.radiusX, info.radiusY) })
    } else {
      ball.setCircle(info.radius)
    }
    ball.setFriction(0.02, 0.02, 0.05)
    ball.setBounce(0.12)
    ball.setData('size', size)
    ball.setData('spawnTime', this.time.now)
    ball.setData('consumed', false)
    ball.setData('overflowSince', null)
    this.balls.add(ball)
    return ball
  }

  private onCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    if (this.gameOver) return
    for (const pair of event.pairs) {
      const a = (pair.bodyA as { gameObject?: unknown }).gameObject as BallImage | undefined
      const b = (pair.bodyB as { gameObject?: unknown }).gameObject as BallImage | undefined
      if (!a || !b) continue
      if (!this.balls.contains(a) || !this.balls.contains(b)) continue
      if (a.getData('consumed') || b.getData('consumed')) continue
      const sizeA = a.getData('size') as number
      const sizeB = b.getData('size') as number
      if (sizeA !== sizeB) continue
      this.mergeBalls(a, b, sizeA)
    }
  }

  private mergeBalls(a: BallImage, b: BallImage, size: number) {
    a.setData('consumed', true)
    b.setData('consumed', true)

    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    this.tweens.killTweensOf(a)
    this.tweens.killTweensOf(b)
    this.balls.remove(a, true, true)
    this.balls.remove(b, true, true)

    this.score += mergeScore(size)
    this.emitScore()

    const ns = nextSize(size)
    if (ns !== null) {
      const merged = this.addBall(mx, my, ns)
      merged.setScale(0.8)
      this.tweens.add({ targets: merged, scale: 1, duration: 120, ease: 'Back.Out' })
    }
  }

  private endGame() {
    if (this.gameOver) return
    this.gameOver = true
    this.preview.setVisible(false)
    this.aimLine.clear()
    this.game.events.emit('gameover', this.score)
  }

  private doRestart() {
    this.balls.clear(true, true)
    this.score = 0
    this.gameOver = false
    this.canDrop = true

    // Rebuild container in case the level changed.
    this.clearContainer()
    this.activeLevelDef = findLevel(this.game.registry.get('levelId') as string)
    this.buildContainer()

    this.preview.y = this.activeLevelDef.dropY
    this.preview.x = GAME_W / 2
    this.preview.setVisible(true)
    this.readyNextBall()
    this.updateAimLine()
    this.emitScore()

    // Reset EMA so there's no tilt lag carry-over, but keep tilt enabled/disabled state.
    this.smoothedTiltX = 0
    this.matter.world.setGravity(0, DEFAULT_GRAVITY_Y)
  }

  private enableTilt() {
    if (this.tiltEnabled) return
    this.tiltEnabled = true
    this.smoothedTiltX = 0
    this.prevAccelX = 0
    this.prevAccelY = 0
    this.boundDeviceMotion = this.onDeviceMotion.bind(this)
    window.addEventListener('devicemotion', this.boundDeviceMotion)
  }

  private disableTilt() {
    if (!this.tiltEnabled) return
    this.tiltEnabled = false
    if (this.boundDeviceMotion) {
      window.removeEventListener('devicemotion', this.boundDeviceMotion)
      this.boundDeviceMotion = null
    }
    this.matter.world.setGravity(0, DEFAULT_GRAVITY_Y)
  }

  private onDeviceMotion(e: DeviceMotionEvent) {
    // Tilt: use accelerationIncludingGravity (contains gravity component → reflects phone angle).
    const rawX = e.accelerationIncludingGravity?.x ?? 0
    this.smoothedTiltX = TILT_SMOOTHING * rawX + (1 - TILT_SMOOTHING) * this.smoothedTiltX
    const gravityX = (this.smoothedTiltX / 9.8) * MAX_TILT_GRAVITY
    this.matter.world.setGravity(gravityX, DEFAULT_GRAVITY_Y)

    // Shake: use acceleration (gravity-subtracted) so tilt angle doesn't affect sensitivity.
    const ax = e.acceleration?.x ?? 0
    const ay = e.acceleration?.y ?? 0
    const dx = ax - this.prevAccelX
    const dy = ay - this.prevAccelY
    this.prevAccelX = ax
    this.prevAccelY = ay
    if (Math.sqrt(dx * dx + dy * dy) > SHAKE_THRESHOLD) {
      this.jostle()
    }
  }

  private jostle() {
    if (this.time.now - this.lastJostleTime < SHAKE_COOLDOWN_MS) return
    this.lastJostleTime = this.time.now
    this.score = Math.max(0, this.score - SHAKE_COST)
    this.emitScore()
    this.game.events.emit('jostled')

    // Phase 1 (immediate): upward burst — lifts balls, risky if jar is near full.
    this.applyJostleImpulse(0, -JOSTLE_UP_FORCE)

    // Phase 2 (120ms): swing left.
    this.time.delayedCall(120, () => {
      this.applyJostleImpulse(-JOSTLE_LATERAL_FORCE, 0)
    })

    // Phase 3 (280ms): swing right, slightly randomised so it doesn't feel mechanical.
    this.time.delayedCall(280, () => {
      this.applyJostleImpulse(JOSTLE_LATERAL_FORCE * (0.8 + Math.random() * 0.5), 0)
    })
  }

  private applyJostleImpulse(baseX: number, baseY: number) {
    const children = this.balls.getChildren() as BallImage[]
    for (const ball of children) {
      if (ball.getData('consumed')) continue
      const fx = baseX + (Math.random() - 0.5) * JOSTLE_SCATTER
      const fy = baseY + (Math.random() - 0.5) * JOSTLE_SCATTER
      ball.applyForce(new Phaser.Math.Vector2(fx, fy))
    }
  }

  private emitScore() {
    this.game.events.emit('score', this.score)
  }
}
