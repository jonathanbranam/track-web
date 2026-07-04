import * as Phaser from 'phaser'
import { MAPS, tileColor } from './script'
import { DirectorSnapshot } from './directorEngine'
import { EntityView, ENTITY_COLORS, TILE_SIZE } from './EntityView'

interface Point {
  x: number
  y: number
}

/**
 * Renders the Director's `resting` contract in Phaser: a fixed tilemap of
 * solid-color rectangles, one `EntityView` per entity, and a camera that
 * follows the active entity live or snaps directly from a checkpoint.
 * Receives snapshots via the game's global event emitter (`director-snapshot`)
 * — set up this way because `RpgExperience.tsx` mounts this scene through
 * Phaser's own scene manager, not as a React child it can pass props to.
 */
export default class TalkRpgScene extends Phaser.Scene {
  private tileRects: Phaser.GameObjects.Rectangle[] = []
  private entityViews: Record<string, EntityView> = {}
  private previousPositions: Record<string, Point> = {}
  private activeSceneId: string | null = null

  constructor() {
    super({ key: 'TalkRpgScene' })
  }

  create() {
    this.tileRects = []
    this.entityViews = {}
    this.previousPositions = {}
    this.activeSceneId = null

    // Tap anywhere on the canvas to advance. Handled through Phaser's own scene
    // input rather than a DOM click so it works on iOS — see kb/phaser-mobile-input.md.
    this.input.on('pointerdown', () => {
      this.game.events.emit('tap-advance')
    })

    this.game.events.on('director-snapshot', this.applySnapshot, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('director-snapshot', this.applySnapshot, this)
    })

    const getSnapshot = this.registry.get('getSnapshot') as (() => DirectorSnapshot) | undefined
    if (getSnapshot) this.applySnapshot(getSnapshot())
  }

  private applySnapshot(snapshot: DirectorSnapshot) {
    const { resting, status } = snapshot
    const isPlaying = status === 'PLAYING'

    if (resting.sceneId !== this.activeSceneId) {
      this.loadArea(resting.sceneId)
      this.snapCamera(resting.camera)
    }

    for (const id of Object.keys(this.entityViews)) {
      if (!resting.entities[id]) {
        this.entityViews[id].destroy()
        delete this.entityViews[id]
      }
    }

    let movedEntityId: string | null = null
    for (const entity of Object.values(resting.entities)) {
      const prev = this.previousPositions[entity.id]
      const moved = isPlaying && !!prev && (prev.x !== entity.x || prev.y !== entity.y)
      if (moved) movedEntityId = entity.id

      let view = this.entityViews[entity.id]
      if (!view) {
        view = new EntityView(this, ENTITY_COLORS[entity.id] ?? 0x94a3b8)
        this.entityViews[entity.id] = view
      }
      view.apply({
        position: { x: entity.x, y: entity.y },
        facing: entity.facing,
        animationState: moved ? 'walk' : 'idle',
      })
    }

    this.previousPositions = Object.fromEntries(
      Object.values(resting.entities).map((entity) => [entity.id, { x: entity.x, y: entity.y }]),
    )

    if (isPlaying) {
      if (movedEntityId) this.followEntity(movedEntityId)
    } else {
      this.snapCamera(resting.camera)
    }
  }

  /**
   * Projects an entity's world position to canvas-space screen pixels via the
   * live camera transform — read directly instead of `resting.camera`'s
   * tile-space values, since this needs to reflect the camera's continuous
   * follow-smoothing between resting-state updates (see design.md's
   * world-anchoring Decision).
   */
  getScreenPosition(entityId: string): { x: number; y: number } | null {
    const view = this.entityViews[entityId]
    if (!view) return null
    const cam = this.cameras.main
    return {
      x: (view.container.x - cam.worldView.x) * cam.zoom,
      y: (view.container.y - cam.worldView.y) * cam.zoom,
    }
  }

  private followEntity(id: string) {
    const view = this.entityViews[id]
    if (!view) return
    this.cameras.main.startFollow(view.container, true)
  }

  private snapCamera(camera: { x: number; y: number; zoom: number }) {
    this.cameras.main.stopFollow()
    this.cameras.main.setZoom(camera.zoom)
    this.cameras.main.centerOn(camera.x * TILE_SIZE + TILE_SIZE / 2, camera.y * TILE_SIZE + TILE_SIZE / 2)
  }

  private loadArea(sceneId: string) {
    const map = MAPS[sceneId]
    if (!map) return
    this.activeSceneId = sceneId

    for (const rect of this.tileRects) rect.destroy()
    this.tileRects = []
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const gid = map.tiles[y * map.width + x]
        const rect = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          tileColor(gid),
        )
        rect.setDepth(-1)
        this.tileRects.push(rect)
      }
    }

    for (const id of Object.keys(this.entityViews)) {
      this.entityViews[id].destroy()
      delete this.entityViews[id]
    }
    this.previousPositions = {}

    this.cameras.main.setBounds(0, 0, map.width * TILE_SIZE, map.height * TILE_SIZE)
  }
}
