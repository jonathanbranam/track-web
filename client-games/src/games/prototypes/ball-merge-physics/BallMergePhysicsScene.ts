import * as Phaser from 'phaser'
import { SIZES, type BallSize, sizeInfo, nextSize, SPAWN_MAX_SIZE } from '../../ball-merge/logic'
import type { LevelDef } from '../../ball-merge/levels'

export const GAME_W = 400
export const GAME_H = 640
const WALL_DRAW_T = 14
const WALL_PHYS_T = 40

export interface PhysicsConfig {
  gravityY: number
  restitution: number
  friction: number
  frictionAir: number
  densityScale: number
  frictionStatic: number
  inertiaScale: number
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
  gravityY: 0.9,
  restitution: 0.3,
  friction: 0.1,
  frictionAir: 0.01,
  densityScale: 1.0,
  frictionStatic: 0.5,
  inertiaScale: 1.0,
}

// --- Drawing helpers (from BallMergeScene) ---

function ellipseVerts(rx: number, ry: number, n = 16): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return { x: Math.cos(a) * rx, y: Math.sin(a) * ry }
  })
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
  g.beginPath()
  g.arc(cx - r * 0.22, cy, r * 0.55, -Math.PI * 0.55, Math.PI * 0.55, false)
  g.strokePath()
  g.beginPath()
  g.arc(cx + r * 0.22, cy, r * 0.55, Math.PI - Math.PI * 0.55, Math.PI + Math.PI * 0.55, false)
  g.strokePath()
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
  g.beginPath()
  g.arc(cx, cy, r * 0.85, Math.PI * 0.15, Math.PI * 0.85, false)
  g.strokePath()
  g.beginPath()
  g.arc(cx, cy, r * 0.85, Math.PI + Math.PI * 0.15, Math.PI + Math.PI * 0.85, false)
  g.strokePath()
  g.beginPath()
  g.arc(cx - r * 0.35, cy - r * 0.1, r * 0.9, -Math.PI * 0.5, Math.PI * 0.3, false)
  g.strokePath()
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
  g.beginPath()
  g.arc(cx, cy, r * 0.85, -Math.PI * 0.5, Math.PI * 0.5, false)
  g.strokePath()
  g.beginPath()
  g.arc(cx, cy, r * 0.85, Math.PI * 0.5, Math.PI * 1.5, false)
  g.strokePath()
  g.beginPath()
  g.arc(cx, cy - r * 0.3, r * 0.82, Math.PI * 0.05, Math.PI * 0.95, false)
  g.strokePath()
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
  g.beginPath()
  g.moveTo(cx - rx * 0.7, cy)
  g.lineTo(cx + rx * 0.7, cy)
  g.strokePath()
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
  g.lineStyle(1, 0x00000000, 0)
  g.strokeCircle(cx, cy, r)
  drawShine(g, cx, cy, r)
}

function drawYogaBall(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.fillStyle(0x818cf8, 1)
  g.fillCircle(cx, cy, r)
  drawShine(g, cx, cy, r)
}

function drawBall(g: Phaser.GameObjects.Graphics, s: BallSize): void {
  const cx = s.radiusX ?? s.radius
  const cy = s.radiusY ?? s.radius
  const r = s.radius
  const rx = s.radiusX ?? r
  const ry = s.radiusY ?? r
  switch (s.size) {
    case 0:  drawPingPong(g, cx, cy, r); break
    case 1:  drawGolfBall(g, cx, cy, r); break
    case 2:  drawTennis(g, cx, cy, r); break
    case 3:  drawBaseball(g, cx, cy, r, 0xef4444); break
    case 4:  drawBaseball(g, cx, cy, r, 0x3b82f6); break
    case 5:  drawVolleyball(g, cx, cy, r); break
    case 6:  drawSoccer(g, cx, cy, r); break
    case 7:  drawBasketball(g, cx, cy, r); break
    case 8:  drawFootball(g, cx, cy, rx, ry); break
    case 9:  drawBeachBall(g, cx, cy, r); break
    case 10: drawYogaBall(g, cx, cy, r); break
  }
}

// --- Scene ---

export default class BallMergePhysicsScene extends Phaser.Scene {
  private physicsConfig: PhysicsConfig = { ...DEFAULT_PHYSICS }
  private levelDef!: LevelDef
  private containerBodies: MatterJS.BodyType[] = []
  private containerGraphics!: Phaser.GameObjects.Graphics
  private aimGraphics!: Phaser.GameObjects.Graphics
  private balls!: Phaser.GameObjects.Group
  private aimX = GAME_W / 2
  private heldSize = 0
  private heldBallSprite!: Phaser.GameObjects.Image

  constructor() {
    super('BallMergePhysicsScene')
  }

  create() {
    const level = this.game.registry.get('level') as LevelDef
    this.levelDef = level
    this.aimX = (level.dropMinX + level.dropMaxX) / 2

    const initPhysics = this.game.registry.get('physics') as PhysicsConfig | undefined
    if (initPhysics) {
      Object.assign(this.physicsConfig, initPhysics)
      this.matter.world.setGravity(0, this.physicsConfig.gravityY)
    }

    this.generateTextures()
    this.containerGraphics = this.add.graphics()
    this.aimGraphics = this.add.graphics().setDepth(4)
    this.balls = this.add.group()

    this.heldSize = Math.floor(Math.random() * (SPAWN_MAX_SIZE + 1))
    this.heldBallSprite = this.add
      .image(this.aimX, this.levelDef.dropY, `ball-${this.heldSize}`)
      .setAlpha(0.85)
      .setDepth(5)

    this.buildContainer()
    this.setupInput()

    this.matter.world.on(
      'collisionstart',
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => this.onCollision(event),
    )

    this.game.events.on('physics-update', this.applyPhysicsUpdate, this)
    this.game.events.on('sandbox-clear-balls', this.clearBalls, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('physics-update', this.applyPhysicsUpdate, this)
      this.game.events.off('sandbox-clear-balls', this.clearBalls, this)
    })
  }

  update() {
    this.heldBallSprite.x = this.aimX
    this.drawAimLine()
    this.clampBallVelocities()
  }

  private clampBallVelocities() {
    const maxSpeed = 25
    for (const child of this.balls.getChildren()) {
      const body = (child as Phaser.Physics.Matter.Image).body as MatterJS.BodyType
      if (!body) continue
      const { x, y } = body.velocity
      const speed = Math.hypot(x, y)
      if (speed > maxSpeed) {
        this.matter.body.setVelocity(body, { x: (x / speed) * maxSpeed, y: (y / speed) * maxSpeed })
      }
    }
  }

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
    const level = this.levelDef

    // Centroid of segment midpoints — used to pick the outward-facing perpendicular
    let sumX = 0, sumY = 0
    for (const seg of level.segments) {
      sumX += (seg.x1 + seg.x2) / 2
      sumY += (seg.y1 + seg.y2) / 2
    }
    const centX = sumX / level.segments.length
    const centY = sumY / level.segments.length

    this.containerGraphics.lineStyle(WALL_DRAW_T, 0x374151, 1)
    for (const seg of level.segments) {
      const mx = (seg.x1 + seg.x2) / 2
      const my = (seg.y1 + seg.y2) / 2
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1)
      const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1)
      const dx = seg.x2 - seg.x1
      const dy = seg.y2 - seg.y1

      // Pick the perpendicular pointing away from the centroid (outward)
      const n1x = -dy / len
      const n1y = dx / len
      const dot = n1x * (mx - centX) + n1y * (my - centY)
      const nx = dot >= 0 ? n1x : -n1x
      const ny = dot >= 0 ? n1y : -n1y

      // Physics body: shift outward so inner face sits on the segment line
      const body = this.matter.add.rectangle(
        mx + nx * WALL_PHYS_T / 2,
        my + ny * WALL_PHYS_T / 2,
        len + WALL_PHYS_T,
        WALL_PHYS_T,
        { isStatic: true, friction: 0.4, angle },
      )
      this.containerBodies.push(body)

      // Draw: shift outward so inner edge sits on the segment line
      this.containerGraphics.beginPath()
      this.containerGraphics.moveTo(seg.x1 + nx * WALL_DRAW_T / 2, seg.y1 + ny * WALL_DRAW_T / 2)
      this.containerGraphics.lineTo(seg.x2 + nx * WALL_DRAW_T / 2, seg.y2 + ny * WALL_DRAW_T / 2)
      this.containerGraphics.strokePath()
    }
  }

  private setupInput() {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.aimX = Phaser.Math.Clamp(p.worldX, this.levelDef.dropMinX, this.levelDef.dropMaxX)
    })
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.aimX = Phaser.Math.Clamp(p.worldX, this.levelDef.dropMinX, this.levelDef.dropMaxX)
      this.addBall(this.aimX, this.levelDef.dropY, this.heldSize)
      this.heldSize = Math.floor(Math.random() * (SPAWN_MAX_SIZE + 1))
      this.heldBallSprite.setTexture(`ball-${this.heldSize}`)
    })
  }

  private drawAimLine() {
    this.aimGraphics.clear()
    const x = this.aimX
    const info = sizeInfo(this.heldSize)
    const startY = this.levelDef.dropY + (info.radiusY ?? info.radius)
    this.aimGraphics.lineStyle(1.5, 0xffffff, 0.35)
    this.aimGraphics.beginPath()
    this.aimGraphics.moveTo(x, startY)
    this.aimGraphics.lineTo(x, GAME_H)
    this.aimGraphics.strokePath()
  }

  private addBall(x: number, y: number, size: number): Phaser.Physics.Matter.Image {
    const info = sizeInfo(size)
    const ball = this.matter.add.image(x, y, `ball-${size}`)
    if (info.radiusX !== undefined && info.radiusY !== undefined) {
      ball.setBody({ type: 'fromVertices', verts: ellipseVerts(info.radiusX, info.radiusY) })
    } else {
      ball.setCircle(info.radius)
    }
    ball.setFriction(this.physicsConfig.friction, this.physicsConfig.frictionAir)
    ball.setBounce(this.physicsConfig.restitution)
    ball.setDensity(0.001 * this.physicsConfig.densityScale)
    const body = ball.body as MatterJS.BodyType
    body.frictionStatic = this.physicsConfig.frictionStatic
    const baseInertia = body.inertia
    ball.setData('baseInertia', baseInertia)
    this.matter.body.setInertia(body, baseInertia * this.physicsConfig.inertiaScale)
    ball.setData('size', size)
    ball.setData('consumed', false)
    this.balls.add(ball)
    return ball
  }

  private onCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    for (const pair of event.pairs) {
      const a = (pair.bodyA as { gameObject?: unknown }).gameObject as Phaser.Physics.Matter.Image | undefined
      const b = (pair.bodyB as { gameObject?: unknown }).gameObject as Phaser.Physics.Matter.Image | undefined
      if (!a || !b) continue
      if (!this.balls.contains(a) || !this.balls.contains(b)) continue
      if (a.getData('consumed') || b.getData('consumed')) continue
      const sizeA = a.getData('size') as number
      const sizeB = b.getData('size') as number
      if (sizeA !== sizeB) continue
      if (nextSize(sizeA) === null) continue
      this.mergeBalls(a, b, sizeA)
    }
  }

  private mergeBalls(
    a: Phaser.Physics.Matter.Image,
    b: Phaser.Physics.Matter.Image,
    size: number,
  ) {
    a.setData('consumed', true)
    b.setData('consumed', true)
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    this.tweens.killTweensOf(a)
    this.tweens.killTweensOf(b)
    this.balls.remove(a, true, true)
    this.balls.remove(b, true, true)
    const ns = nextSize(size)
    if (ns !== null) {
      const merged = this.addBall(mx, my, ns)
      merged.setScale(0.85)
      this.tweens.add({ targets: merged, scale: 1, duration: 100, ease: 'Back.Out' })
    }
  }

  private applyPhysicsUpdate(config: Partial<PhysicsConfig>) {
    if (config.gravityY !== undefined) {
      this.physicsConfig.gravityY = config.gravityY
      this.matter.world.setGravity(0, config.gravityY)
    }
    if (config.restitution !== undefined) this.physicsConfig.restitution = config.restitution
    if (config.friction !== undefined) this.physicsConfig.friction = config.friction
    if (config.frictionAir !== undefined) this.physicsConfig.frictionAir = config.frictionAir
    if (config.densityScale !== undefined) this.physicsConfig.densityScale = config.densityScale
    if (config.frictionStatic !== undefined) this.physicsConfig.frictionStatic = config.frictionStatic
    if (config.inertiaScale !== undefined) this.physicsConfig.inertiaScale = config.inertiaScale

    const patchDensity = config.densityScale !== undefined
    const patchInertia = patchDensity || config.inertiaScale !== undefined
    const needsPatch =
      config.restitution !== undefined ||
      config.friction !== undefined ||
      config.frictionAir !== undefined ||
      config.frictionStatic !== undefined ||
      patchDensity ||
      patchInertia

    if (needsPatch) {
      for (const child of this.balls.getChildren()) {
        const ball = child as Phaser.Physics.Matter.Image
        const body = ball.body as MatterJS.BodyType
        if (!body) continue
        if (config.restitution !== undefined) body.restitution = config.restitution
        if (config.friction !== undefined) body.friction = config.friction
        if (config.frictionAir !== undefined) body.frictionAir = config.frictionAir
        if (config.frictionStatic !== undefined) body.frictionStatic = config.frictionStatic
        if (patchDensity) {
          ball.setDensity(0.001 * this.physicsConfig.densityScale)
          // Density change recalculates inertia proportionally — store new base before scaling
          ball.setData('baseInertia', body.inertia)
        }
        if (patchInertia) {
          const baseInertia = ball.getData('baseInertia') as number
          this.matter.body.setInertia(body, baseInertia * this.physicsConfig.inertiaScale)
        }
      }
    }
  }

  private clearBalls() {
    this.balls.clear(true, true)
  }
}
