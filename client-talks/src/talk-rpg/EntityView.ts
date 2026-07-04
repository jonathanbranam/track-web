import * as Phaser from 'phaser'
import { Direction } from './script'

export const TILE_SIZE = 48

/** Placeholder per-entity colors — Phase 8 swaps this for real spritesheet selection. */
export const ENTITY_COLORS: Record<string, number> = {
  pc: 0x3b82f6,
  guide: 0xf59e0b,
  wanderer: 0xa855f7,
}

export type AnimationState = 'idle' | 'walk'

export interface EntitySnapshot {
  position: { x: number; y: number }
  facing: Direction
  animationState: AnimationState
}

const BODY_SIZE = TILE_SIZE * 0.7
const NOTCH_SIZE = 8
const NOTCH_OFFSET = BODY_SIZE / 2 + 4
const BOB_HEIGHT = 4
const BOB_DURATION_MS = 180

const NOTCH_OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -NOTCH_OFFSET },
  down: { x: 0, y: NOTCH_OFFSET },
  left: { x: -NOTCH_OFFSET, y: 0 },
  right: { x: NOTCH_OFFSET, y: 0 },
}

/**
 * Draws one entity — a colored rectangle plus a directional facing notch —
 * given `{ position, facing, animationState }`. The single rendering path
 * every action executor and the resting-state-to-scene apply step go
 * through, so Phase 8 can swap real spritesheet frames in here without
 * touching any call site.
 */
export class EntityView {
  readonly container: Phaser.GameObjects.Container
  private readonly body: Phaser.GameObjects.Rectangle
  private readonly notch: Phaser.GameObjects.Rectangle
  private bobTween: Phaser.Tweens.Tween | null = null
  private animationState: AnimationState = 'idle'

  constructor(scene: Phaser.Scene, color: number) {
    this.body = scene.add.rectangle(0, 0, BODY_SIZE, BODY_SIZE, color).setStrokeStyle(2, 0xffffff, 0.5)
    this.notch = scene.add.rectangle(0, NOTCH_OFFSET, NOTCH_SIZE, NOTCH_SIZE, 0xffffff)
    this.container = scene.add.container(0, 0, [this.body, this.notch])
  }

  apply(snapshot: EntitySnapshot) {
    this.container.setPosition(
      snapshot.position.x * TILE_SIZE + TILE_SIZE / 2,
      snapshot.position.y * TILE_SIZE + TILE_SIZE / 2,
    )
    this.setFacing(snapshot.facing)
    this.setAnimationState(snapshot.animationState)
  }

  private setFacing(facing: Direction) {
    const offset = NOTCH_OFFSETS[facing]
    this.notch.setPosition(offset.x, offset.y)
  }

  private setAnimationState(state: AnimationState) {
    if (state === this.animationState) return
    this.animationState = state
    if (state === 'walk') {
      this.bobTween = this.body.scene.tweens.add({
        targets: this.body,
        y: -BOB_HEIGHT,
        duration: BOB_DURATION_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    } else {
      this.bobTween?.stop()
      this.bobTween = null
      this.body.setY(0)
    }
  }

  destroy() {
    this.bobTween?.stop()
    this.container.destroy()
  }
}
