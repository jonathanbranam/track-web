import * as Phaser from 'phaser'
import type { GameState, PcAction, NpcAction, Direction, PcType, NpcType } from './types'
import { GRID_COLS, GRID_ROWS, spawnZoneTiles } from './map'
import { inBounds } from './pathfinding'
import { isTowerImmune } from './turn'
import { validMoveDests, attackSquares, attackDamage, unitDisplayName, hasAttacked } from './pc'
import { getMaxHp, getMoveRange } from './statOverrides'

export const TILE_SIZE = 80

const TERRAIN_COLORS: Record<string, number> = {
  plains: 0xd4a853,
  forest: 0x2d6a2f,
  water: 0x2b72b5,
  stone: 0x7d7d7d,
}
const STRUCTURE_COLOR = 0x8b5a2b
const TOWER_COLOR     = 0xd4a000
const SPAWNER_COLOR   = 0xcc2222
const PC_STROKE = 0xffffff
const PC_SELECT_STROKE = 0xffff00
const NPC_STROKE = 0xffcc00

const UNIT_COLORS: Record<string, number> = {
  'melee':       0x4a90e2,
  'ranger':      0x2ecc71,
  'magic-user':  0x9b59b6,
  'rogue':       0xe67e22,
  'short-range': 0xe24a4a,
  'long-range':  0xcc8800,
}

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
}

function tileCX(col: number) { return col * TILE_SIZE + TILE_SIZE / 2 }
function tileCY(row: number) { return row * TILE_SIZE + TILE_SIZE / 2 }

export default class DungeonTacticsScene extends Phaser.Scene {
  private state!: GameState
  private tilesGfx!: Phaser.GameObjects.Graphics
  private spawnersGfx!: Phaser.GameObjects.Graphics
  private highlightGfx!: Phaser.GameObjects.Graphics
  private overlayGfx!: Phaser.GameObjects.Graphics
  private unitObjects = new Map<string, Phaser.GameObjects.Container>()

  // Layers: worldLayer holds the board (pans/zooms with the main camera);
  // uiLayer holds the fixed bottom-HUD popup, rendered by a separate UI camera
  // at zoom 1 so it stays anchored while the board pans/zooms.
  private worldLayer!: Phaser.GameObjects.Container
  private uiLayer!: Phaser.GameObjects.Container
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  // Scene-owned UI state for the end-of-turn confirmation modal.
  private confirmOpen = false
  // Scene-local admin mode (designer tuning). Off by default; not part of
  // GameState, not undoable, no controller round-trip — just gates HUD/popup UI.
  private adminMode = false

  // Screen-space hit regions for the fixed HUD controls.
  private resetHit: Phaser.Geom.Rectangle | null = null
  private adminHit: Phaser.Geom.Rectangle | null = null
  private doneHit: Phaser.Geom.Rectangle | null = null
  private placementDoneHit: Phaser.Geom.Rectangle | null = null
  private undoHit: Phaser.Geom.Rectangle | null = null
  private confirmCancelHit: Phaser.Geom.Rectangle | null = null
  private confirmConfirmHit: Phaser.Geom.Rectangle | null = null
  private popupHit: {
    panel: Phaser.Geom.Rectangle
    close: Phaser.Geom.Rectangle
    attack: Phaser.Geom.Rectangle | null
    // Admin stat steppers — present only while admin mode is on.
    hpMinus: Phaser.Geom.Rectangle | null
    hpPlus: Phaser.Geom.Rectangle | null
    moveMinus: Phaser.Geom.Rectangle | null
    movePlus: Phaser.Geom.Rectangle | null
  } | null = null

  // Pointer tracking
  private pointerDownX = 0
  private pointerDownY = 0
  private lastPX = 0
  private lastPY = 0
  private isPointerDown = false
  private isDragging = false
  private pinchLastDist: number | null = null
  private pinchLastMidX: number | null = null
  private pinchLastMidY: number | null = null

  constructor() {
    super('DungeonTacticsScene')
  }

  create() {
    this.state = this.game.registry.get('initialState') as GameState

    this.worldLayer = this.add.container(0, 0)
    this.uiLayer = this.add.container(0, 0)

    this.tilesGfx = this.add.graphics().setDepth(0)
    this.spawnersGfx = this.add.graphics().setDepth(1)
    this.highlightGfx = this.add.graphics().setDepth(2)
    this.overlayGfx = this.add.graphics().setDepth(10)
    this.worldLayer.add([this.tilesGfx, this.spawnersGfx, this.highlightGfx, this.overlayGfx])

    this.drawTiles()
    this.drawSpawners()
    this.drawUnits()
    this.drawPlanningOverlay()
    this.drawHighlights()

    // Fit the full grid into the viewport with a small border, never zooming in past 1:1
    const cam = this.cameras.main
    const padding = 16
    const fitZoom = Math.min(
      cam.width / (GRID_COLS * TILE_SIZE + padding * 2),
      cam.height / (GRID_ROWS * TILE_SIZE + padding * 2),
      1.0,
    )
    cam.zoom = fitZoom
    cam.centerOn(
      (GRID_COLS * TILE_SIZE) / 2,
      (GRID_ROWS * TILE_SIZE) / 2,
    )

    // Dedicated UI camera renders only the fixed HUD (uiLayer) at zoom 1, so the
    // popup is unaffected by the board's pan/zoom. Each camera ignores the other's
    // layer; ignoring at the container level also covers children added later.
    this.uiCamera = this.cameras.add(0, 0, cam.width, cam.height)
    this.uiCamera.setScroll(0, 0)
    this.cameras.main.ignore(this.uiLayer)
    this.uiCamera.ignore(this.worldLayer)

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.uiCamera.setSize(gameSize.width, gameSize.height)
      this.drawHud()
    })

    this.drawHud()
    this.setupInput()
  }

  private setupInput() {
    const cam = this.cameras.main

    this.input.on('wheel', (_ptr: unknown, _objs: unknown, _dx: number, deltaY: number) => {
      cam.zoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.5, 2.0)
    })

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.isPointerDown = true
      this.pointerDownX = ptr.x
      this.pointerDownY = ptr.y
      this.lastPX = ptr.x
      this.lastPY = ptr.y
      this.isDragging = false
      this.pinchLastDist = null
      this.pinchLastMidX = null
      this.pinchLastMidY = null
    })

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.isPointerDown) return

      // Pinch-zoom + two-finger pan
      if (this.input.pointer2.isDown) {
        const p1 = this.input.pointer1
        const p2 = this.input.pointer2
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y)
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        if (this.pinchLastDist !== null && dist > 0) {
          cam.zoom = Phaser.Math.Clamp(cam.zoom * (dist / this.pinchLastDist), 0.5, 2.0)
        }
        if (this.pinchLastMidX !== null && this.pinchLastMidY !== null) {
          cam.scrollX -= (midX - this.pinchLastMidX) / cam.zoom
          cam.scrollY -= (midY - this.pinchLastMidY) / cam.zoom
        }
        this.pinchLastDist = dist
        this.pinchLastMidX = midX
        this.pinchLastMidY = midY
        return
      }

      const travelX = ptr.x - this.pointerDownX
      const travelY = ptr.y - this.pointerDownY
      if (Math.sqrt(travelX * travelX + travelY * travelY) >= 5) {
        this.isDragging = true
      }
      if (this.isDragging) {
        const dx = ptr.x - this.lastPX
        const dy = ptr.y - this.lastPY
        cam.scrollX -= dx / cam.zoom
        cam.scrollY -= dy / cam.zoom
      }
      this.lastPX = ptr.x
      this.lastPY = ptr.y
    })

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      this.pinchLastDist = null
      this.pinchLastMidX = null
      this.pinchLastMidY = null

      // If the other finger is still down, re-anchor single-finger pan and don't tap
      const other = this.input.pointer1.isDown
        ? this.input.pointer1
        : this.input.pointer2.isDown
          ? this.input.pointer2
          : null
      if (other) {
        this.lastPX = other.x
        this.lastPY = other.y
        this.pointerDownX = other.x
        this.pointerDownY = other.y
        this.isDragging = true
        return
      }

      this.isPointerDown = false
      if (this.isDragging) {
        this.isDragging = false
        return
      }
      this.isDragging = false

      // The confirm modal is blocking: while open it captures every tap, and only
      // its Cancel/Confirm controls do anything.
      if (this.confirmOpen) {
        if (this.confirmConfirmHit && Phaser.Geom.Rectangle.Contains(this.confirmConfirmHit, ptr.x, ptr.y)) {
          this.confirmOpen = false
          this.drawHud()
          this.game.events.emit('hud-done-confirm')
        } else if (this.confirmCancelHit && Phaser.Geom.Rectangle.Contains(this.confirmCancelHit, ptr.x, ptr.y)) {
          this.confirmOpen = false
          this.drawHud()
        }
        return
      }

      // Fixed HUD (Reset/Done/popup) intercepts taps in screen space before the board does.
      if (this.resetHit && Phaser.Geom.Rectangle.Contains(this.resetHit, ptr.x, ptr.y)) {
        this.game.events.emit('hud-reset')
        return
      }
      // Admin toggle is pure scene UI: flip the flag and rebuild the HUD; no
      // GameState change and no controller round-trip.
      if (this.adminHit && Phaser.Geom.Rectangle.Contains(this.adminHit, ptr.x, ptr.y)) {
        this.adminMode = !this.adminMode
        this.drawHud()
        return
      }
      if (this.doneHit && Phaser.Geom.Rectangle.Contains(this.doneHit, ptr.x, ptr.y)) {
        this.confirmOpen = true
        this.drawHud()
        return
      }
      // Placement Done commits positions immediately — no confirm modal.
      if (this.placementDoneHit && Phaser.Geom.Rectangle.Contains(this.placementDoneHit, ptr.x, ptr.y)) {
        this.game.events.emit('hud-placement-done')
        return
      }
      // Undo registers a hit region only when enabled, so a tap here implies a
      // non-empty stack.
      if (this.undoHit && Phaser.Geom.Rectangle.Contains(this.undoHit, ptr.x, ptr.y)) {
        this.game.events.emit('hud-undo')
        return
      }
      if (this.popupHit) {
        if (Phaser.Geom.Rectangle.Contains(this.popupHit.close, ptr.x, ptr.y)) {
          this.game.events.emit('popup-close')
          return
        }
        // Admin stat steppers (present only while admin mode is on). Each emits a
        // single per-archetype edit the controller applies and redraws.
        const unit = this.state.units.find((u) => u.id === this.state.selectedUnitId)
        if (unit) {
          const edit = (stat: 'maxHp' | 'move', delta: number) =>
            this.game.events.emit('admin-stat-edit', { stat, unitType: unit.unitType, delta })
          if (this.popupHit.hpMinus && Phaser.Geom.Rectangle.Contains(this.popupHit.hpMinus, ptr.x, ptr.y)) { edit('maxHp', -1); return }
          if (this.popupHit.hpPlus && Phaser.Geom.Rectangle.Contains(this.popupHit.hpPlus, ptr.x, ptr.y)) { edit('maxHp', 1); return }
          if (this.popupHit.moveMinus && Phaser.Geom.Rectangle.Contains(this.popupHit.moveMinus, ptr.x, ptr.y)) { edit('move', -1); return }
          if (this.popupHit.movePlus && Phaser.Geom.Rectangle.Contains(this.popupHit.movePlus, ptr.x, ptr.y)) { edit('move', 1); return }
        }
        if (this.popupHit.attack && Phaser.Geom.Rectangle.Contains(this.popupHit.attack, ptr.x, ptr.y)) {
          this.game.events.emit('popup-attack-toggle')
          return
        }
        // A tap anywhere else on the panel is consumed (it must not fall through
        // to the board tiles rendered beneath the popup).
        if (Phaser.Geom.Rectangle.Contains(this.popupHit.panel, ptr.x, ptr.y)) return
      }

      // Convert screen → world via camera matrix inverse (handles zoom around viewport center)
      const wp = cam.getWorldPoint(ptr.x, ptr.y)
      const col = Math.floor(wp.x / TILE_SIZE)
      const row = Math.floor(wp.y / TILE_SIZE)
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return

      const unit = this.state.units.find((u) => u.col === col && u.row === row)
      if (unit && this.state.planningPhase !== 'selecting-attack') {
        this.game.events.emit('unit-tapped', { unitId: unit.id })
      } else {
        this.game.events.emit('cell-tapped', { col, row })
      }
    })
  }

  drawTiles() {
    this.tilesGfx.clear()
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.state.cells[row][col]
        const color = TERRAIN_COLORS[cell.terrain] ?? 0x444444
        this.tilesGfx.fillStyle(color)
        this.tilesGfx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        this.tilesGfx.lineStyle(1, 0x000000, 0.4)
        this.tilesGfx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)

        if (cell.hasStructure) {
          const isTower = cell.structureKind === 'tower'
          const m = TILE_SIZE * (isTower ? 0.12 : 0.18)
          this.tilesGfx.fillStyle(isTower ? TOWER_COLOR : STRUCTURE_COLOR)
          this.tilesGfx.fillRect(col * TILE_SIZE + m, row * TILE_SIZE + m, TILE_SIZE - 2 * m, TILE_SIZE - 2 * m)

          if (isTower) {
            const cx = col * TILE_SIZE + TILE_SIZE / 2
            const cy = row * TILE_SIZE + TILE_SIZE / 2
            const arm = TILE_SIZE * 0.22
            this.tilesGfx.lineStyle(4, 0xffffff, 0.7)
            this.tilesGfx.beginPath()
            this.tilesGfx.moveTo(cx - arm, cy); this.tilesGfx.lineTo(cx + arm, cy)
            this.tilesGfx.moveTo(cx, cy - arm); this.tilesGfx.lineTo(cx, cy + arm)
            this.tilesGfx.strokePath()
            // Blue immunity ring when protected
            if (isTowerImmune(this.state.cells)) {
              this.tilesGfx.lineStyle(3, 0x44aaff, 0.85)
              this.tilesGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
            }
          }

          // HP pips on the left edge, stacked bottom-to-top
          const hp = cell.structureHp ?? 3
          const maxHp = isTower ? 5 : 3
          const pipW = 6; const pipH = isTower ? 7 : 10; const pipGap = 2
          for (let i = 0; i < maxHp; i++) {
            const pipX = col * TILE_SIZE + 3
            const pipY = (row + 1) * TILE_SIZE - 4 - (i + 1) * pipH - i * pipGap
            if (i < hp) {
              this.tilesGfx.fillStyle(isTower ? 0xffdd44 : 0x22cc44)
              this.tilesGfx.fillRect(pipX, pipY, pipW, pipH)
            }
            this.tilesGfx.lineStyle(1, 0x333333, 1)
            this.tilesGfx.strokeRect(pipX, pipY, pipW, pipH)
          }
        }
      }
    }
  }

  drawUnits() {
    for (const container of this.unitObjects.values()) container.destroy()
    this.unitObjects.clear()

    const npcs = this.state.units.filter((u) => u.kind === 'npc')

    for (const unit of this.state.units) {
      const gfx = this.add.graphics()
      if (unit.kind === 'pc') {
        this.renderPc(gfx, unit.unitType, unit.hp, unit.id === this.state.selectedUnitId)
      } else {
        this.renderNpc(gfx, unit.unitType, unit.hp)
      }

      let label = ''
      if (unit.kind === 'pc') {
        const idx = this.state.planOrder.indexOf(unit.id)
        if (idx >= 0) label = String(idx + 1)
      } else {
        const idx = npcs.findIndex((u) => u.id === unit.id)
        if (idx >= 0) label = String(idx + 1)
      }

      const text = this.add.text(-TILE_SIZE * 0.28, -TILE_SIZE * 0.28, label, {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5)

      const container = this.add.container(tileCX(unit.col), tileCY(unit.row), [gfx, text])
      container.setDepth(2)
      this.worldLayer.add(container)
      this.unitObjects.set(unit.id, container)
    }

    // Keep the planning overlay (depth 10) above units (depth 2) within the layer.
    this.worldLayer.sort('depth')
  }

  private renderPc(gfx: Phaser.GameObjects.Graphics, unitType: string, hp: number, selected: boolean) {
    const r = TILE_SIZE * 0.28
    const fill = UNIT_COLORS[unitType] ?? 0x4a90e2
    gfx.fillStyle(fill)
    gfx.fillCircle(0, 0, r)
    gfx.lineStyle(selected ? 3 : 2, selected ? PC_SELECT_STROKE : PC_STROKE)
    gfx.strokeCircle(0, 0, r)
    this.drawHpPips(gfx, fill, hp, getMaxHp(unitType as PcType | NpcType))
  }

  private renderNpc(gfx: Phaser.GameObjects.Graphics, unitType: string, hp: number) {
    const r = TILE_SIZE * 0.28
    const tx = r * 0.87
    const ty = r * 0.7
    const fill = UNIT_COLORS[unitType] ?? 0xe24a4a
    gfx.fillStyle(fill)
    gfx.fillTriangle(0, -r, tx, ty, -tx, ty)
    gfx.lineStyle(2, NPC_STROKE)
    gfx.strokeTriangle(0, -r, tx, ty, -tx, ty)
    this.drawHpPips(gfx, fill, hp, getMaxHp(unitType as PcType | NpcType))
  }

  private drawHpPips(gfx: Phaser.GameObjects.Graphics, fillColor: number, hp: number, maxHp: number) {
    const pipW = 6; const pipH = 10; const pipGap = 2
    const pipX = -TILE_SIZE / 2 + 3
    for (let i = 0; i < maxHp; i++) {
      const pipY = TILE_SIZE / 2 - 4 - (i + 1) * pipH - i * pipGap
      if (i < hp) {
        gfx.fillStyle(fillColor)
        gfx.fillRect(pipX, pipY, pipW, pipH)
      }
      gfx.lineStyle(1, 0x333333, 1)
      gfx.strokeRect(pipX, pipY, pipW, pipH)
    }
  }

  drawPlanningOverlay() {
    this.overlayGfx.clear()
    if (this.state.phase !== 'player') return

    for (const [unitId, plan] of Object.entries(this.state.plans)) {
      const unit = this.state.units.find((u) => u.id === unitId)
      if (!unit) continue

      if (plan.moveTarget) {
        const fx = tileCX(unit.col)
        const fy = tileCY(unit.row)
        const headLen = 14

        const tx = tileCX(plan.moveTarget.col)
        const ty = tileCY(plan.moveTarget.row)

        this.overlayGfx.lineStyle(3, 0xffffff, 0.85)
        if (plan.movePath && plan.movePath.length > 0) {
          this.overlayGfx.beginPath()
          this.overlayGfx.moveTo(fx, fy)
          for (const step of plan.movePath) {
            this.overlayGfx.lineTo(tileCX(step.col), tileCY(step.row))
          }
          this.overlayGfx.strokePath()
          const last = plan.movePath[plan.movePath.length - 1]
          const prev = plan.movePath.length > 1 ? plan.movePath[plan.movePath.length - 2] : { col: unit.col, row: unit.row }
          const angle = Math.atan2(ty - tileCY(prev.row), tx - tileCX(prev.col))
          this.overlayGfx.beginPath()
          this.overlayGfx.moveTo(tx, ty)
          this.overlayGfx.lineTo(tx - headLen * Math.cos(angle - Math.PI / 6), ty - headLen * Math.sin(angle - Math.PI / 6))
          this.overlayGfx.moveTo(tx, ty)
          this.overlayGfx.lineTo(tx - headLen * Math.cos(angle + Math.PI / 6), ty - headLen * Math.sin(angle + Math.PI / 6))
          this.overlayGfx.strokePath()
        }

        // Ghost PC at destination
        const r = TILE_SIZE * 0.28
        const ghostColor = UNIT_COLORS[unit.unitType] ?? 0x4a90e2
        this.overlayGfx.fillStyle(ghostColor, 0.35)
        this.overlayGfx.fillCircle(tx, ty, r)
        this.overlayGfx.lineStyle(2, PC_STROKE, 0.45)
        this.overlayGfx.strokeCircle(tx, ty, r)
      }

      if (plan.attackDir) {
        const tiles = attackSquares(this.state, unitId)
        const isMagicUser = unit.unitType === 'magic-user'
        for (const { col: ac, row: ar } of tiles) {
          if (isMagicUser) {
            this.overlayGfx.fillStyle(0xaa44ff, 0.3)
            this.overlayGfx.fillRect(ac * TILE_SIZE, ar * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            this.overlayGfx.lineStyle(2, 0xaa44ff, 0.9)
            this.overlayGfx.strokeRect(ac * TILE_SIZE + 1, ar * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2)
          } else {
            this.overlayGfx.fillStyle(0xff3333, 0.25)
            this.overlayGfx.fillRect(ac * TILE_SIZE, ar * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            this.overlayGfx.lineStyle(2, 0xff0000, 0.9)
            this.overlayGfx.strokeRect(ac * TILE_SIZE + 1, ar * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2)
          }
        }
      }
    }

    // NPC intended actions (orange)
    for (const plan of this.state.npcPlans) {
      const npc = this.state.units.find((u) => u.id === plan.unitId)
      if (!npc) continue
      const nx = tileCX(npc.col)
      const ny = tileCY(npc.row)

      if (plan.kind === 'move' || plan.kind === 'move-attack') {
        const headLen = 10
        this.overlayGfx.lineStyle(2, 0xff7733, 0.7)
        this.overlayGfx.beginPath()
        this.overlayGfx.moveTo(nx, ny)
        for (const step of plan.path) {
          this.overlayGfx.lineTo(tileCX(step.col), tileCY(step.row))
        }
        this.overlayGfx.strokePath()
        if (plan.path.length > 0) {
          const last = plan.path[plan.path.length - 1]
          const prev = plan.path.length > 1 ? plan.path[plan.path.length - 2] : { col: npc.col, row: npc.row }
          const tx = tileCX(last.col)
          const ty = tileCY(last.row)
          const angle = Math.atan2(ty - tileCY(prev.row), tx - tileCX(prev.col))
          this.overlayGfx.beginPath()
          this.overlayGfx.moveTo(tx, ty)
          this.overlayGfx.lineTo(tx - headLen * Math.cos(angle - Math.PI / 6), ty - headLen * Math.sin(angle - Math.PI / 6))
          this.overlayGfx.moveTo(tx, ty)
          this.overlayGfx.lineTo(tx - headLen * Math.cos(angle + Math.PI / 6), ty - headLen * Math.sin(angle + Math.PI / 6))
          this.overlayGfx.strokePath()
        }
      }

      if (plan.kind === 'attack' || plan.kind === 'move-attack') {
        const ax = plan.targetCol * TILE_SIZE + TILE_SIZE * 0.5
        const ay = plan.targetRow * TILE_SIZE + TILE_SIZE * 0.5
        this.overlayGfx.lineStyle(2, 0xff4400, 0.9)
        this.overlayGfx.strokeCircle(ax, ay, 10)
      }

      if (plan.kind === 'exit') {
        const hy = ny + TILE_SIZE * 0.35
        this.overlayGfx.lineStyle(2, 0xff7733, 0.7)
        this.overlayGfx.beginPath()
        this.overlayGfx.moveTo(nx, ny)
        this.overlayGfx.lineTo(nx, hy)
        this.overlayGfx.strokePath()
        this.overlayGfx.beginPath()
        this.overlayGfx.moveTo(nx, hy)
        this.overlayGfx.lineTo(nx - 6, hy - 6)
        this.overlayGfx.moveTo(nx, hy)
        this.overlayGfx.lineTo(nx + 6, hy - 6)
        this.overlayGfx.strokePath()
      }
    }
  }

  drawSpawners() {
    this.spawnersGfx.clear()
    for (const { col, row } of this.state.spawners) {
      const cx = col * TILE_SIZE + TILE_SIZE / 2
      const top = row * TILE_SIZE + TILE_SIZE * 0.08
      const s = TILE_SIZE * 0.16
      this.spawnersGfx.fillStyle(SPAWNER_COLOR, 0.85)
      this.spawnersGfx.fillTriangle(cx - s, top, cx + s, top, cx, top + s * 1.5)
      this.spawnersGfx.lineStyle(1, 0x880000, 1)
      this.spawnersGfx.strokeTriangle(cx - s, top, cx + s, top, cx, top + s * 1.5)
    }
  }

  clearPlanningOverlay() {
    this.overlayGfx.clear()
  }

  drawHighlights() {
    this.highlightGfx.clear()

    // Turn-0 placement: highlight every valid spawn-zone tile in yellow, reusing
    // the walk-tile treatment. Drawn only during placement, so it vanishes the
    // instant Done flips the phase.
    if (this.state.phase === 'placement') {
      for (const key of spawnZoneTiles()) {
        const [col, row] = key.split(',').map(Number)
        this.highlightGfx.lineStyle(3, 0xffff00, 0.9)
        this.highlightGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        this.highlightGfx.fillStyle(0xffff00, 0.15)
        this.highlightGfx.fillRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      }
      return
    }

    if (this.state.phase !== 'player' || !this.state.selectedUnitId) return

    if (this.state.planningPhase === 'selecting-move') {
      const dests = validMoveDests(this.state, this.state.selectedUnitId)
      for (const { col, row } of dests) {
        this.highlightGfx.lineStyle(3, 0x00ff88, 0.9)
        this.highlightGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        this.highlightGfx.fillStyle(0x00ff88, 0.15)
        this.highlightGfx.fillRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      }
    } else if (this.state.planningPhase === 'selecting-attack') {
      // Show all possible attack tiles for all 4 directions so the player can tap one
      const allTiles = new Set<string>()
      for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
        const plan = this.state.plans[this.state.selectedUnitId] ?? {}
        const tempState = {
          ...this.state,
          plans: { ...this.state.plans, [this.state.selectedUnitId]: { ...plan, attackDir: dir } },
        }
        for (const sq of attackSquares(tempState, this.state.selectedUnitId)) {
          allTiles.add(`${sq.col},${sq.row}`)
        }
      }
      for (const key of allTiles) {
        const [col, row] = key.split(',').map(Number)
        this.highlightGfx.lineStyle(3, 0xff6600, 0.9)
        this.highlightGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        this.highlightGfx.fillStyle(0xff6600, 0.15)
        this.highlightGfx.fillRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      }
    }
  }

  // Fixed in-canvas HUD: Reset (top-right) and Done (bottom-right) turn controls
  // plus the unit info popup (the first of a planned family of HUD displays).
  // Rebuilt from state on each redraw and rendered by the UI camera so it stays
  // anchored while the board pans/zooms.
  drawHud() {
    this.uiLayer.removeAll(true)
    this.resetHit = null
    this.adminHit = null
    this.doneHit = null
    this.placementDoneHit = null
    this.undoHit = null
    this.confirmCancelHit = null
    this.confirmConfirmHit = null
    this.popupHit = null

    const state = this.state
    const camW = this.scale.width
    const camH = this.scale.height

    // Status pill (top-center): placement prompt during turn 0, playback status
    // during PC/NPC playback.
    if (state.phase === 'placement') {
      this.drawStatusPill(camW / 2, 28, 'Place your units')
    } else if (state.phase !== 'player') {
      this.drawStatusPill(camW / 2, 28, state.phase === 'pc-playback' ? 'PC Actions…' : 'Enemy Actions…')
    }

    // Reset — top-right, always available.
    const rw = 64
    const rh = 30
    this.resetHit = this.addHudButton(camW - rw - 12, 12, rw, rh, 'Reset', {
      fill: 0x1f2937, stroke: 0x374151, fontSize: '12px', color: '#d1d5db',
    })

    // Admin toggle — left of Reset, anchored upper-right. Highlighted when on
    // (mirroring the Attack toggle's active style). Designer tuning gate.
    const aw = 64
    const ax = camW - rw - 12 - aw - 8
    if (this.adminMode) {
      this.adminHit = this.addHudButton(ax, 12, aw, rh, 'Admin', {
        fill: 0xea580c, stroke: 0xfb923c, fontSize: '12px', color: '#ffffff',
      })
    } else {
      this.adminHit = this.addHudButton(ax, 12, aw, rh, 'Admin', {
        fill: 0x1f2937, stroke: 0x374151, fontSize: '12px', color: '#d1d5db',
      })
    }

    // Unit info popup — player or placement phase with a selected unit.
    const popupShown = (state.phase === 'player' || state.phase === 'placement') && !!state.selectedUnitId
    const popupTop = popupShown ? this.drawUnitPopup() : camH

    // Placement Done (Start) — bottom-right during turn 0. Emits its own event so
    // it bypasses the end-turn confirm modal used in the player phase.
    if (state.phase === 'placement') {
      const bw = 120
      const bh = 46
      const bx = camW - bw - 16
      const by = popupTop < camH ? popupTop - bh - 12 : camH - bh - 16
      this.placementDoneHit = this.addHudButton(bx, by, bw, bh, 'Start', {
        fill: 0x16a34a, stroke: 0x22c55e, fontSize: '16px',
      })
    }

    // Done — bottom-right, player phase only; lifted above the popup when one is open.
    if (state.phase === 'player') {
      const bw = 120
      const bh = 46
      const bx = camW - bw - 16
      const by = popupTop < camH ? popupTop - bh - 12 : camH - bh - 16
      this.doneHit = this.addHudButton(bx, by, bw, bh, 'Done', {
        fill: 0x16a34a, stroke: 0x22c55e, fontSize: '16px',
      })

      // Undo — bottom-left, mirroring Done and lifted by the same popup offset.
      // Enabled only when the undo stack is non-empty; a disabled button renders
      // dimmed and registers no hit region so taps are ignored.
      const uw = 120
      const uh = 46
      const ux = 16
      const uy = popupTop < camH ? popupTop - uh - 12 : camH - uh - 16
      if (state.undoStack.length > 0) {
        this.undoHit = this.addHudButton(ux, uy, uw, uh, 'Undo', {
          fill: 0x2563eb, stroke: 0x3b82f6, fontSize: '16px',
        })
      } else {
        this.addHudButton(ux, uy, uw, uh, 'Undo', {
          fill: 0x1f2937, stroke: 0x374151, fontSize: '16px', color: '#6b7280', alpha: 0.5,
        })
      }
    }

    // End-of-turn confirmation modal sits on top of everything else.
    if (this.confirmOpen) this.drawConfirmModal()
  }

  private drawStatusPill(cx: number, cy: number, label: string) {
    const text = this.add.text(0, 0, label, { fontSize: '13px', color: '#d1d5db' }).setOrigin(0.5)
    const w = text.width + 28
    const h = text.height + 16
    const bg = this.add.graphics()
    bg.fillStyle(0x111827, 0.8)
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8)
    this.uiLayer.add(bg)
    text.setPosition(cx, cy)
    this.uiLayer.add(text)
  }

  // Centered modal asking the player to confirm ending the turn, warning when some
  // PCs have not attacked this round. Backdrop + panel + Cancel/Confirm, all in Phaser.
  private drawConfirmModal() {
    const camW = this.scale.width
    const camH = this.scale.height

    const backdrop = this.add.graphics()
    backdrop.fillStyle(0x000000, 0.5)
    backdrop.fillRect(0, 0, camW, camH)
    this.uiLayer.add(backdrop)

    const pcsNotAttacked = this.state.units.filter(
      (u) => u.kind === 'pc' && !hasAttacked(this.state, u.id),
    ).length
    const hasWarning = pcsNotAttacked > 0

    const panelW = Math.min(camW - 48, 320)
    const panelH = hasWarning ? 172 : 140
    const px = (camW - panelW) / 2
    const py = (camH - panelH) / 2

    const panel = this.add.graphics()
    panel.fillStyle(0x111827, 1)
    panel.fillRoundedRect(px, py, panelW, panelH, 14)
    panel.lineStyle(2, 0x374151, 1)
    panel.strokeRoundedRect(px, py, panelW, panelH, 14)
    this.uiLayer.add(panel)

    this.uiLayer.add(this.add.text(px + panelW / 2, py + 26, 'End your turn?', {
      fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5))

    if (hasWarning) {
      const word = pcsNotAttacked !== 1 ? 'units have' : 'unit has'
      this.uiLayer.add(this.add.text(px + panelW / 2, py + 62,
        `${pcsNotAttacked} ${word} not attacked.`, {
          fontSize: '12px', color: '#facc15', align: 'center',
          wordWrap: { width: panelW - 36 },
        }).setOrigin(0.5))
    }

    const bw = 100
    const bh = 38
    const gap = 12
    const bx0 = px + (panelW - (bw * 2 + gap)) / 2
    const by = py + panelH - bh - 16
    this.confirmCancelHit = this.addHudButton(bx0, by, bw, bh, 'Cancel', {
      fill: 0x374151, stroke: 0x4b5563,
    })
    this.confirmConfirmHit = this.addHudButton(bx0 + bw + gap, by, bw, bh, 'Confirm', {
      fill: 0x16a34a, stroke: 0x22c55e,
    })
  }

  private addHudButton(
    x: number, y: number, w: number, h: number, label: string,
    opts: { fill: number; stroke?: number; fontSize?: string; color?: string; alpha?: number },
  ): Phaser.Geom.Rectangle {
    const alpha = opts.alpha ?? 1
    const g = this.add.graphics()
    g.fillStyle(opts.fill, alpha)
    g.fillRoundedRect(x, y, w, h, 8)
    if (opts.stroke !== undefined) {
      g.lineStyle(2, opts.stroke, alpha)
      g.strokeRoundedRect(x, y, w, h, 8)
    }
    this.uiLayer.add(g)
    const text = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: opts.fontSize ?? '15px', fontStyle: 'bold', color: opts.color ?? '#ffffff',
    }).setOrigin(0.5)
    text.setAlpha(alpha)
    this.uiLayer.add(text)
    return new Phaser.Geom.Rectangle(x, y, w, h)
  }

  // Draws the bottom-anchored unit info popup (assumes uiLayer was already cleared
  // by drawHud) and records its hit regions. Returns the panel's top Y (screen
  // space) so the Done button can sit above it.
  private drawUnitPopup(): number {
    const state = this.state
    const unit = state.units.find((u) => u.id === state.selectedUnitId)
    if (!unit) return this.scale.height

    const isPc = unit.kind === 'pc'
    const camW = this.scale.width
    const camH = this.scale.height

    const panelW = Math.min(camW - 24, 380)
    // Admin mode adds two stepper rows, so the panel grows to keep them clear of
    // the portrait and the bottom action button.
    const panelH = this.adminMode ? 150 : 116
    const px = (camW - panelW) / 2
    const py = camH - panelH - 12
    const add = (obj: Phaser.GameObjects.GameObject) => { this.uiLayer.add(obj) }

    // Panel background
    const bg = this.add.graphics()
    bg.fillStyle(0x111827, 0.95)
    bg.fillRoundedRect(px, py, panelW, panelH, 12)
    bg.lineStyle(2, 0x374151, 1)
    bg.strokeRoundedRect(px, py, panelW, panelH, 12)
    add(bg)

    // Portrait placeholder (room reserved for a future unit image)
    const portraitSize = 72
    const portraitX = px + 14
    const portraitY = py + 14
    const portrait = this.add.graphics()
    portrait.fillStyle(UNIT_COLORS[unit.unitType] ?? 0x4a90e2, 1)
    portrait.fillRoundedRect(portraitX, portraitY, portraitSize, portraitSize, 8)
    portrait.lineStyle(2, 0xffffff, 0.5)
    portrait.strokeRoundedRect(portraitX, portraitY, portraitSize, portraitSize, 8)
    add(portrait)

    // Name / archetype
    const textX = portraitX + portraitSize + 14
    add(this.add.text(textX, py + 12, unitDisplayName(unit), {
      fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }))

    // Stat lines: HP / move (+ attack for PCs). Max HP and move come from the
    // per-archetype override source the engine uses so the popup can't drift from
    // the board.
    const maxHp = getMaxHp(unit.unitType)
    const move = getMoveRange(unit.unitType)

    // Steppers exist only while admin mode is on; otherwise null so taps are inert.
    let hpMinus: Phaser.Geom.Rectangle | null = null
    let hpPlus: Phaser.Geom.Rectangle | null = null
    let moveMinus: Phaser.Geom.Rectangle | null = null
    let movePlus: Phaser.Geom.Rectangle | null = null

    if (this.adminMode) {
      // Editable max HP and movement; attack damage and other stats stay read-only.
      add(this.add.text(textX, py + 38, `HP ${unit.hp}/${maxHp}`, { fontSize: '13px', color: '#9ca3af' }))
      const hpRow = this.drawStatStepper(textX, py + 56, 'Max HP', maxHp)
      hpMinus = hpRow.minus; hpPlus = hpRow.plus
      const moveRow = this.drawStatStepper(textX, py + 88, 'Move', move)
      moveMinus = moveRow.minus; movePlus = moveRow.plus
      if (isPc) {
        add(this.add.text(textX, py + 120, `Attack ${attackDamage(unit)}`, { fontSize: '14px', color: '#d1d5db' }))
      }
    } else {
      const stats = [`HP ${unit.hp}/${maxHp}`, `Move ${move}`]
      if (isPc) stats.push(`Attack ${attackDamage(unit)}`)
      stats.forEach((line, i) => {
        add(this.add.text(textX, py + 42 + i * 20, line, { fontSize: '14px', color: '#d1d5db' }))
      })
    }

    // Close (X) — top-right
    const closeSize = 28
    const closeX = px + panelW - closeSize - 8
    const closeY = py + 8
    const closeG = this.add.graphics()
    closeG.fillStyle(0x374151, 1)
    closeG.fillRoundedRect(closeX, closeY, closeSize, closeSize, 6)
    add(closeG)
    add(this.add.text(closeX + closeSize / 2, closeY + closeSize / 2, '✕', {
      fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5))
    const closeRect = new Phaser.Geom.Rectangle(closeX, closeY, closeSize, closeSize)

    // PC action bar — a single Attack toggle, highlighted while active. Hidden
    // once the PC has attacked this turn (it is locked, no further actions).
    // During placement the button is rendered disabled (dimmed) with no hit
    // region, so the dialog stays a pure info view while repositioning units.
    let attackRect: Phaser.Geom.Rectangle | null = null
    const placement = state.phase === 'placement'
    if (isPc && (placement || !hasAttacked(state, unit.id))) {
      const active = !placement && state.planningPhase === 'selecting-attack'
      const bw = 110
      const bh = 36
      const bx = px + panelW - bw - 10
      const by = py + panelH - bh - 10
      const alpha = placement ? 0.5 : 1
      const ag = this.add.graphics()
      ag.fillStyle(active ? 0xea580c : 0x374151, alpha)
      ag.fillRoundedRect(bx, by, bw, bh, 8)
      ag.lineStyle(2, active ? 0xfb923c : 0x4b5563, alpha)
      ag.strokeRoundedRect(bx, by, bw, bh, 8)
      add(ag)
      add(this.add.text(bx + bw / 2, by + bh / 2, 'Attack', {
        fontSize: '15px', fontStyle: 'bold', color: placement ? '#6b7280' : '#ffffff',
      }).setOrigin(0.5).setAlpha(alpha))
      // No hit region during placement: popup-attack-toggle can never fire.
      if (!placement) attackRect = new Phaser.Geom.Rectangle(bx, by, bw, bh)
    }

    this.popupHit = {
      panel: new Phaser.Geom.Rectangle(px, py, panelW, panelH),
      close: closeRect,
      attack: attackRect,
      hpMinus, hpPlus, moveMinus, movePlus,
    }
    return py
  }

  // Draws a `label  [−]  value  [+]` editing row at (x, y) and returns the two
  // stepper button hit regions. Used by the admin popup for max HP and movement.
  private drawStatStepper(
    x: number, y: number, label: string, value: number,
  ): { minus: Phaser.Geom.Rectangle; plus: Phaser.Geom.Rectangle } {
    const btn = 26
    const labelW = 64
    this.uiLayer.add(this.add.text(x, y + btn / 2, label, {
      fontSize: '14px', color: '#d1d5db',
    }).setOrigin(0, 0.5))
    const mx = x + labelW
    const minus = this.addStepperButton(mx, y, btn, '−')
    this.uiLayer.add(this.add.text(mx + btn + 22, y + btn / 2, String(value), {
      fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0.5))
    const plus = this.addStepperButton(mx + btn + 44, y, btn, '+')
    return { minus, plus }
  }

  private addStepperButton(x: number, y: number, size: number, label: string): Phaser.Geom.Rectangle {
    const g = this.add.graphics()
    g.fillStyle(0x374151, 1)
    g.fillRoundedRect(x, y, size, size, 6)
    g.lineStyle(2, 0x4b5563, 1)
    g.strokeRoundedRect(x, y, size, size, 6)
    this.uiLayer.add(g)
    this.uiLayer.add(this.add.text(x + size / 2, y + size / 2, label, {
      fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5))
    return new Phaser.Geom.Rectangle(x, y, size, size)
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  redraw(state: GameState) {
    this.state = state
    this.drawTiles()
    this.drawSpawners()
    this.drawUnits()
    this.drawPlanningOverlay()
    this.drawHighlights()
    this.drawHud()
  }

  animatePcAction(action: PcAction, onComplete: () => void) {
    if (action.kind === 'stay') {
      onComplete()
      return
    }

    const unitGfx = this.unitObjects.get(action.unitId)
    if (!unitGfx) { onComplete(); return }

    const attackAfterMove = (col: number, row: number) => {
      if (action.kind !== 'move-attack' && action.kind !== 'attack') {
        onComplete()
        return
      }
      const unit = this.state.units.find((u) => u.id === action.unitId)
      const attackDir = action.attackDir
      const [dc, dr] = DIR_OFFSETS[attackDir]

      if (unit?.unitType === 'ranger') {
        // Projectile from unit toward first target at distance >= 2
        let destC = col, destR = row
        for (let d = 2; ; d++) {
          const nc = col + dc * d, nr = row + dr * d
          if (!inBounds(nc, nr)) break
          destC = nc; destR = nr
          const hit = this.state.units.find((u) => u.col === nc && u.row === nr)
            || this.state.cells[nr]?.[nc]?.hasStructure
          if (hit) break
        }
        const proj = this.add.graphics()
        this.worldLayer.add(proj)
        proj.fillStyle(0xaaffaa)
        proj.fillCircle(0, 0, 5)
        proj.setDepth(5)
        proj.x = tileCX(col)
        proj.y = tileCY(row)
        this.tweens.add({
          targets: proj,
          x: tileCX(destC),
          y: tileCY(destR),
          duration: 320,
          ease: 'Linear',
          onComplete: () => { proj.destroy(); onComplete() },
        })
        return
      }

      if (unit?.unitType === 'magic-user') {
        // Flash the AoE cross tiles
        const cx = col + dc * 2
        const cy = row + dr * 2
        const crossTiles: [number, number][] = [
          [cx, cy], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
        ]
        const flashes: Phaser.GameObjects.Graphics[] = []
        for (const [tc, tr] of crossTiles) {
          if (!inBounds(tc, tr)) continue
          const flash = this.add.graphics()
          this.worldLayer.add(flash)
          flash.fillStyle(0xaa44ff, 0.65)
          flash.fillRect(tc * TILE_SIZE, tr * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          flashes.push(flash)
        }
        if (flashes.length === 0) { onComplete(); return }
        let done = 0
        for (const flash of flashes) {
          this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 350,
            onComplete: () => { flash.destroy(); if (++done === flashes.length) onComplete() },
          })
        }
        return
      }

      // Melee / rogue: flash adjacent tile
      const tc = col + dc
      const tr = row + dr
      if (!inBounds(tc, tr)) { onComplete(); return }
      const flash = this.add.graphics()
      this.worldLayer.add(flash)
      flash.fillStyle(0xff2222, 0.7)
      flash.fillRect(tc * TILE_SIZE, tr * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 250,
        onComplete: () => { flash.destroy(); onComplete() },
      })
    }

    if (action.kind === 'move' || action.kind === 'move-attack') {
      const steps = action.path
      let i = 0
      const animateNext = () => {
        if (i >= steps.length) { attackAfterMove(action.toCol, action.toRow); return }
        const step = steps[i++]
        this.tweens.add({
          targets: unitGfx,
          x: tileCX(step.col),
          y: tileCY(step.row),
          duration: 180,
          ease: 'Sine.easeInOut',
          onComplete: animateNext,
        })
      }
      if (steps.length === 0) attackAfterMove(action.toCol, action.toRow)
      else animateNext()
    } else if (action.kind === 'attack') {
      attackAfterMove(action.col, action.row)
    }
  }

  animateNpcAction(action: NpcAction, onComplete: () => void) {
    if (action.kind === 'stay') { onComplete(); return }

    if (action.kind === 'move') {
      const unitGfx = this.unitObjects.get(action.unitId)
      if (!unitGfx) { onComplete(); return }
      const steps = this.reachableSteps(action.unitId, action.path)
      if (steps.length === 0) { onComplete(); return }
      let i = 0
      const animateNext = () => {
        if (i >= steps.length) { onComplete(); return }
        const step = steps[i++]
        this.tweens.add({
          targets: unitGfx,
          x: tileCX(step.col),
          y: tileCY(step.row),
          duration: 180,
          ease: 'Sine.easeInOut',
          onComplete: animateNext,
        })
      }
      animateNext()
      return
    }

    if (action.kind === 'exit') {
      const unitGfx = this.unitObjects.get(action.unitId)
      if (!unitGfx) { onComplete(); return }
      this.tweens.add({
        targets: unitGfx,
        y: unitGfx.y + TILE_SIZE,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeIn',
        onComplete: () => {
          unitGfx.destroy()
          this.unitObjects.delete(action.unitId)
          onComplete()
        },
      })
      return
    }

    if (action.kind === 'attack') {
      const unitGfx = this.unitObjects.get(action.unitId)
      const npc = this.state.units.find((u) => u.id === action.unitId)

      if (npc?.unitType === 'long-range') {
        // Projectile from NPC to target
        if (!unitGfx) { onComplete(); return }
        const proj = this.add.graphics()
        this.worldLayer.add(proj)
        proj.fillStyle(0xffcc44)
        proj.fillCircle(0, 0, 5)
        proj.setDepth(5)
        proj.x = unitGfx.x
        proj.y = unitGfx.y
        this.tweens.add({
          targets: proj,
          x: tileCX(action.targetCol),
          y: tileCY(action.targetRow),
          duration: 350,
          ease: 'Linear',
          onComplete: () => {
            proj.destroy()
            const flashT = this.add.graphics()
            this.worldLayer.add(flashT)
            flashT.fillStyle(0xff2222, 0.6)
            flashT.fillRect(action.targetCol * TILE_SIZE, action.targetRow * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            this.tweens.add({ targets: flashT, alpha: 0, duration: 250, onComplete: () => { flashT.destroy(); onComplete() } })
          },
        })
        return
      }

      // Short-range: flash attacker + target
      const flashA = this.add.graphics()
      this.worldLayer.add(flashA)
      flashA.fillStyle(0xff2222, 0.6)
      if (unitGfx) flashA.fillRect(unitGfx.x - TILE_SIZE / 2, unitGfx.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE)
      const flashT = this.add.graphics()
      this.worldLayer.add(flashT)
      flashT.fillStyle(0xff2222, 0.6)
      flashT.fillRect(action.targetCol * TILE_SIZE, action.targetRow * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      let done = 0
      const check = () => { if (++done === 2) onComplete() }
      this.tweens.add({ targets: flashA, alpha: 0, duration: 300, onComplete: () => { flashA.destroy(); check() } })
      this.tweens.add({ targets: flashT, alpha: 0, duration: 300, onComplete: () => { flashT.destroy(); check() } })
    }

    if (action.kind === 'move-attack') {
      const unitGfx = this.unitObjects.get(action.unitId)
      if (!unitGfx) { onComplete(); return }
      const doAttack = () => {
        const flash = this.add.graphics()
        this.worldLayer.add(flash)
        flash.fillStyle(0xff2222, 0.6)
        flash.fillRect(action.targetCol * TILE_SIZE, action.targetRow * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => { flash.destroy(); onComplete() } })
      }
      const steps = this.reachableSteps(action.unitId, action.path)
      if (steps.length === 0) { doAttack(); return }
      let i = 0
      const animateNext = () => {
        if (i >= steps.length) { doAttack(); return }
        const step = steps[i++]
        this.tweens.add({
          targets: unitGfx,
          x: tileCX(step.col),
          y: tileCY(step.row),
          duration: 180,
          ease: 'Sine.easeInOut',
          onComplete: animateNext,
        })
      }
      animateNext()
    }
  }

  private reachableSteps(
    unitId: string,
    path: Array<{ col: number; row: number }>,
  ): Array<{ col: number; row: number }> {
    const units = this.state.units
    const cells = this.state.cells
    const structs = new Set<string>()
    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        if (cells[r][c].hasStructure) structs.add(`${c},${r}`)
      }
    }
    const steps: Array<{ col: number; row: number }> = []
    for (const step of path) {
      const occupied = units.some((u) => u.id !== unitId && u.col === step.col && u.row === step.row)
      if (occupied || structs.has(`${step.col},${step.row}`)) break
      steps.push(step)
    }
    return steps
  }
}
