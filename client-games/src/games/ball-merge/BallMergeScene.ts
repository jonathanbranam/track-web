import * as Phaser from 'phaser'
import {
  SIZES,
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

// Tuning.
const GRACE_MS = 900         // a ball must exist this long before it can trigger overflow
const SETTLE_SPEED = 0.55    // below this a ball is considered "at rest"
const OVERFLOW_SUSTAIN_MS = 400  // ball must stay above topY + slow for this long to lose
const DROP_COOLDOWN_MS = 320

interface BallImage extends Phaser.Physics.Matter.Image {}

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

    // React -> scene: restart request.
    this.game.events.on('restart', this.doRestart, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('restart', this.doRestart, this)
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
      g.fillStyle(s.color, 1)
      g.fillCircle(s.radius, s.radius, s.radius)
      g.fillStyle(0xffffff, 0.18)
      g.fillCircle(s.radius * 0.68, s.radius * 0.66, s.radius * 0.28)
      g.lineStyle(2, 0xffffff, 0.25)
      g.strokeCircle(s.radius, s.radius, s.radius)
      g.generateTexture(key, s.radius * 2, s.radius * 2)
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
    ball.setCircle(info.radius)
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
  }

  private emitScore() {
    this.game.events.emit('score', this.score)
  }
}
