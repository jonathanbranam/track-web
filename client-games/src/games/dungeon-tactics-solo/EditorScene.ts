import * as Phaser from 'phaser'
import type { ContentMap } from './contentTypes'
import { mapToCells } from './editorModel'
import { TILE_SIZE, drawBoard } from './boardRender'

// The studio map editor's Phaser scene: a *dumb renderer + input source*. It draws
// the `ContentMap` it is given (terrain/structures via the shared `drawBoard`, plus
// editor-only overlays — inert objects, enemy/player-zone tints, grid, hover/brush
// cursor) and emits `{col,row}` tile coordinates on pointer events (with an
// `isDrag` flag so click-drag paints a stroke). It holds NO tool or validation
// logic — React owns the authoritative map and all mutation (see MapEditorPage).
//
// React passes the map and the pointer callback through the game registry before
// `create()` runs, and pushes later maps via `setMap`.

export type TilePointerHandler = (tile: { col: number; row: number }, isDrag: boolean) => void

const ENEMY_ZONE_COLOR = 0xcc2222
const PLAYER_ZONE_COLOR = 0x33cc66
const INERT_OBJECT_COLOR = 0x999999
const CURSOR_COLOR = 0xffffff

export default class EditorScene extends Phaser.Scene {
  private map!: ContentMap
  private onTilePointer: TilePointerHandler = () => {}

  private boardGfx!: Phaser.GameObjects.Graphics
  private overlayGfx!: Phaser.GameObjects.Graphics
  private problemGfx!: Phaser.GameObjects.Graphics
  private cursorGfx!: Phaser.GameObjects.Graphics
  private worldLayer!: Phaser.GameObjects.Container
  private problemTiles: string[] = []

  // Paint-stroke tracking: while the pointer is down we emit each newly-entered
  // tile once (so a drag paints a continuous stroke without re-emitting a tile).
  private painting = false
  private lastPaintedKey: string | null = null
  private hoverTile: { col: number; row: number } | null = null

  constructor() {
    super('EditorScene')
  }

  create() {
    this.map = this.game.registry.get('editorMap') as ContentMap
    this.onTilePointer = (this.game.registry.get('onTilePointer') as TilePointerHandler) ?? (() => {})

    this.worldLayer = this.add.container(0, 0)
    this.boardGfx = this.add.graphics().setDepth(0)
    this.overlayGfx = this.add.graphics().setDepth(1)
    this.problemGfx = this.add.graphics().setDepth(2)
    this.cursorGfx = this.add.graphics().setDepth(3)
    this.worldLayer.add([this.boardGfx, this.overlayGfx, this.problemGfx, this.cursorGfx])

    this.drawAll()
    this.fitCamera()
    this.setupInput()
  }

  private fitCamera() {
    const cam = this.cameras.main
    const padding = 16
    const fitZoom = Math.min(
      cam.width / (this.map.size.cols * TILE_SIZE + padding * 2),
      cam.height / (this.map.size.rows * TILE_SIZE + padding * 2),
      1.0,
    )
    cam.zoom = fitZoom
    cam.centerOn((this.map.size.cols * TILE_SIZE) / 2, (this.map.size.rows * TILE_SIZE) / 2)
  }

  private tileAt(ptr: Phaser.Input.Pointer): { col: number; row: number } | null {
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
    const col = Math.floor(wp.x / TILE_SIZE)
    const row = Math.floor(wp.y / TILE_SIZE)
    if (col < 0 || col >= this.map.size.cols || row < 0 || row >= this.map.size.rows) return null
    return { col, row }
  }

  private setupInput() {
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, deltaY: number) => {
      const cam = this.cameras.main
      cam.zoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.25, 2.0)
    })

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const tile = this.tileAt(ptr)
      if (!tile) return
      this.painting = true
      this.lastPaintedKey = `${tile.col},${tile.row}`
      this.onTilePointer(tile, false)
    })

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const tile = this.tileAt(ptr)
      // Hover/brush cursor follows the pointer (mouse); harmless on touch.
      this.hoverTile = tile
      this.drawCursor()
      if (!this.painting || !tile) return
      const key = `${tile.col},${tile.row}`
      if (key === this.lastPaintedKey) return
      this.lastPaintedKey = key
      this.onTilePointer(tile, true)
    })

    const endStroke = () => {
      this.painting = false
      this.lastPaintedKey = null
    }
    this.input.on('pointerup', endStroke)
    this.input.on('pointerupoutside', endStroke)
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────────

  private drawAll() {
    this.drawBoardLayer()
    this.drawOverlay()
    this.drawProblems()
    this.drawCursor()
  }

  private drawProblems() {
    const gfx = this.problemGfx
    gfx.clear()
    for (const key of this.problemTiles) {
      const [col, row] = key.split(',').map(Number)
      if (col < 0 || col >= this.map.size.cols || row < 0 || row >= this.map.size.rows) continue
      gfx.lineStyle(3, 0xff3355, 0.95)
      gfx.strokeRect(col * TILE_SIZE + 3, row * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6)
      // A diagonal slash so the flag reads even over a same-color tile.
      gfx.beginPath()
      gfx.moveTo(col * TILE_SIZE + 6, row * TILE_SIZE + 6)
      gfx.lineTo((col + 1) * TILE_SIZE - 6, (row + 1) * TILE_SIZE - 6)
      gfx.strokePath()
    }
  }

  private drawBoardLayer() {
    this.boardGfx.clear()
    drawBoard(this.boardGfx, mapToCells(this.map), { towerImmune: false })
  }

  private drawOverlay() {
    const gfx = this.overlayGfx
    gfx.clear()

    // Enemy + player spawn-zone tints.
    const tintZone = (zone: string[], color: number) => {
      for (const key of zone) {
        const [col, row] = key.split(',').map(Number)
        gfx.fillStyle(color, 0.28)
        gfx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        gfx.lineStyle(2, color, 0.85)
        gfx.strokeRect(col * TILE_SIZE + 1, row * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2)
      }
    }
    tintZone(this.map.enemySpawnZone, ENEMY_ZONE_COLOR)
    tintZone(this.map.playerSpawnZone, PLAYER_ZONE_COLOR)

    // Inert objects (no hp) — drawBoard can't represent them, so mark them here.
    for (const o of this.map.objects) {
      if (o.hp != null) continue
      const m = TILE_SIZE * 0.3
      gfx.fillStyle(INERT_OBJECT_COLOR, 0.9)
      gfx.fillRect(o.col * TILE_SIZE + m, o.row * TILE_SIZE + m, TILE_SIZE - 2 * m, TILE_SIZE - 2 * m)
    }
  }

  private drawCursor() {
    this.cursorGfx.clear()
    if (!this.hoverTile) return
    const { col, row } = this.hoverTile
    this.cursorGfx.lineStyle(3, CURSOR_COLOR, 0.9)
    this.cursorGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  // Replace the rendered map. Redraws only when something actually changed (the
  // common drag case mutates one tile, but the single immediate-mode Graphics is
  // cheap at ≤16×16; the play scene full-redraws on every tap likewise). Refits the
  // camera when the board size changes.
  setMap(map: ContentMap) {
    if (map === this.map) return
    const sizeChanged =
      map.size.cols !== this.map.size.cols || map.size.rows !== this.map.size.rows
    this.map = map
    this.drawBoardLayer()
    this.drawOverlay()
    this.drawProblems()
    if (sizeChanged) this.fitCamera()
  }

  // Flag the given "col,row" tiles as validation problems (drawn as red markers).
  setProblemTiles(tiles: string[]) {
    this.problemTiles = tiles
    if (this.problemGfx) this.drawProblems()
  }
}
