import * as Phaser from 'phaser'
import {
  SIZES,
  sizeInfo,
  nextSize,
  mergeScore,
  pickSpawnSize,
  isOverflow,
} from './logic'

// Logical game dimensions (the canvas is scaled to fit the viewport).
export const GAME_W = 400
export const GAME_H = 640

// Container geometry.
const MARGIN_X = 48 // interior left edge
const WALL_T = 14 // wall thickness
const FLOOR_Y = 600 // interior floor line
const TOP_Y = 150 // open top / overflow line (wall tops)
const DROP_Y = 92 // y where a held ball is dropped from

// Tuning.
const GRACE_MS = 900 // a ball must exist this long before it can trigger overflow
const SETTLE_SPEED = 0.55 // below this a ball is considered "at rest"
const DROP_COOLDOWN_MS = 320 // minimum spacing between drops

interface BallImage extends Phaser.Physics.Matter.Image {}

/**
 * Ball Merge gameplay scene. Owns the canvas; reports score and game-over to
 * React via `this.game.events`, and listens for a `restart` event from React.
 */
export default class BallMergeScene extends Phaser.Scene {
  private balls!: Phaser.GameObjects.Group
  private preview!: Phaser.GameObjects.Image
  private aimLine!: Phaser.GameObjects.Graphics
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
    this.buildContainer()

    // Held-ball preview at the top, with a dashed targeting line below it.
    this.aimLine = this.add.graphics()
    this.preview = this.add.image(GAME_W / 2, DROP_Y, 'ball-0').setAlpha(0.85)
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
      if (age > GRACE_MS && isOverflow(topEdge, TOP_Y, body.speed, SETTLE_SPEED)) {
        this.endGame()
        return
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
    const interiorRight = GAME_W - MARGIN_X
    const wallH = FLOOR_Y - TOP_Y
    const wallCY = (TOP_Y + FLOOR_Y) / 2
    const color = 0x374151

    const make = (x: number, y: number, w: number, h: number) => {
      this.add.rectangle(x, y, w, h, color).setStrokeStyle(2, 0x4b5563)
      this.matter.add.rectangle(x, y, w, h, { isStatic: true, friction: 0.4 })
    }

    // Left wall, right wall, floor.
    make(MARGIN_X - WALL_T / 2, wallCY, WALL_T, wallH)
    make(interiorRight + WALL_T / 2, wallCY, WALL_T, wallH)
    make(GAME_W / 2, FLOOR_Y + WALL_T / 2, interiorRight - MARGIN_X + WALL_T * 2, WALL_T)

    // Faint guide marking the open top / overflow line.
    this.add
      .line(0, 0, MARGIN_X, TOP_Y, interiorRight, TOP_Y, 0xf87171, 0.35)
      .setOrigin(0, 0)
      .setLineWidth(1)
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
    const min = MARGIN_X + r
    const max = GAME_W - MARGIN_X - r
    this.preview.x = Phaser.Math.Clamp(x, min, max)
    this.updateAimLine()
  }

  private updateAimLine() {
    this.aimLine.clear()
    if (this.gameOver) return
    const x = this.preview.x
    const r = sizeInfo(this.heldSize).radius
    const startY = DROP_Y + r
    const dashLen = 8
    const gapLen = 5
    const step = dashLen + gapLen
    this.aimLine.lineStyle(1.5, 0xffffff, 0.4)
    for (let y = startY; y < FLOOR_Y; y += step) {
      this.aimLine.beginPath()
      this.aimLine.moveTo(x, y)
      this.aimLine.lineTo(x, Math.min(y + dashLen, FLOOR_Y))
      this.aimLine.strokePath()
    }
  }

  private drop() {
    if (this.gameOver || !this.canDrop) return
    this.canDrop = false
    this.addBall(this.preview.x, DROP_Y, this.heldSize)
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
    // Mark consumed synchronously so a ball shared between two simultaneous
    // same-size contacts can never be merged/destroyed twice.
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
      // Small pop so the new ball reads as an event.
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
    this.preview.setVisible(true)
    this.readyNextBall()
    this.updateAimLine()
    this.emitScore()
  }

  private emitScore() {
    this.game.events.emit('score', this.score)
  }
}
