import * as Phaser from 'phaser'
import {
  type GameState,
  type PcAction,
  type NpcAction,
  GRID_COLS,
  GRID_ROWS,
  validMoveDests,
  attackSquares,
} from './GridModel'

export const TILE_SIZE = 80

const TERRAIN_COLORS: Record<string, number> = {
  plains: 0xd4a853,
  forest: 0x2d6a2f,
  water: 0x2b72b5,
  stone: 0x7d7d7d,
}
const STRUCTURE_COLOR = 0x8b5a2b
const PC_FILL = 0x4a90e2
const PC_STROKE = 0xffffff
const PC_SELECT_STROKE = 0xffff00
const NPC_FILL = 0xe24a4a
const NPC_STROKE = 0xffcc00

function tileCX(col: number) { return col * TILE_SIZE + TILE_SIZE / 2 }
function tileCY(row: number) { return row * TILE_SIZE + TILE_SIZE / 2 }

export default class GridScene extends Phaser.Scene {
  private state!: GameState
  private tilesGfx!: Phaser.GameObjects.Graphics
  private highlightGfx!: Phaser.GameObjects.Graphics
  private overlayGfx!: Phaser.GameObjects.Graphics
  private unitObjects = new Map<string, Phaser.GameObjects.Container>()

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
    super('GridScene')
  }

  create() {
    this.state = this.game.registry.get('initialState') as GameState

    this.tilesGfx = this.add.graphics().setDepth(0)
    this.highlightGfx = this.add.graphics().setDepth(1)
    this.overlayGfx = this.add.graphics().setDepth(10)

    this.drawTiles()
    this.drawUnits()
    this.drawPlanningOverlay()
    this.drawHighlights()

    // Center camera on the grid
    this.cameras.main.centerOn(
      (GRID_COLS * TILE_SIZE) / 2,
      (GRID_ROWS * TILE_SIZE) / 2,
    )

    this.setupInput()
  }

  private setupInput() {
    const cam = this.cameras.main

    // Scroll-wheel zoom
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
          const m = TILE_SIZE * 0.18
          this.tilesGfx.fillStyle(STRUCTURE_COLOR)
          this.tilesGfx.fillRect(
            col * TILE_SIZE + m,
            row * TILE_SIZE + m,
            TILE_SIZE - 2 * m,
            TILE_SIZE - 2 * m,
          )
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
        this.renderPc(gfx, unit.id === this.state.selectedUnitId)
      } else {
        this.renderNpc(gfx)
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
      this.unitObjects.set(unit.id, container)
    }
  }

  private renderPc(gfx: Phaser.GameObjects.Graphics, selected: boolean) {
    const r = TILE_SIZE * 0.28
    gfx.fillStyle(PC_FILL)
    gfx.fillCircle(0, 0, r)
    gfx.lineStyle(selected ? 3 : 2, selected ? PC_SELECT_STROKE : PC_STROKE)
    gfx.strokeCircle(0, 0, r)
  }

  private renderNpc(gfx: Phaser.GameObjects.Graphics) {
    const r = TILE_SIZE * 0.28
    const tx = r * 0.87
    const ty = r * 0.7
    gfx.fillStyle(NPC_FILL)
    gfx.fillTriangle(0, -r, tx, ty, -tx, ty)
    gfx.lineStyle(2, NPC_STROKE)
    gfx.strokeTriangle(0, -r, tx, ty, -tx, ty)
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
        const tx = tileCX(plan.moveTarget.col)
        const ty = tileCY(plan.moveTarget.row)
        const angle = Math.atan2(ty - fy, tx - fx)
        const headLen = 14

        // Arrow shaft
        this.overlayGfx.lineStyle(3, 0xffffff, 0.85)
        this.overlayGfx.beginPath()
        this.overlayGfx.moveTo(fx, fy)
        this.overlayGfx.lineTo(tx, ty)
        this.overlayGfx.strokePath()

        // Arrowhead
        this.overlayGfx.beginPath()
        this.overlayGfx.moveTo(tx, ty)
        this.overlayGfx.lineTo(tx - headLen * Math.cos(angle - Math.PI / 6), ty - headLen * Math.sin(angle - Math.PI / 6))
        this.overlayGfx.moveTo(tx, ty)
        this.overlayGfx.lineTo(tx - headLen * Math.cos(angle + Math.PI / 6), ty - headLen * Math.sin(angle + Math.PI / 6))
        this.overlayGfx.strokePath()

        // Ghost PC at destination
        const r = TILE_SIZE * 0.28
        this.overlayGfx.fillStyle(PC_FILL, 0.35)
        this.overlayGfx.fillCircle(tx, ty, r)
        this.overlayGfx.lineStyle(2, PC_STROKE, 0.45)
        this.overlayGfx.strokeCircle(tx, ty, r)
      }

      if (plan.attackDir) {
        const baseCol = plan.moveTarget?.col ?? unit.col
        const baseRow = plan.moveTarget?.row ?? unit.row
        const DIR: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
        const [dc, dr] = DIR[plan.attackDir]
        const atkCol = baseCol + dc
        const atkRow = baseRow + dr
        if (atkCol >= 0 && atkCol < GRID_COLS && atkRow >= 0 && atkRow < GRID_ROWS) {
          // Upper-right quadrant of the tile
          const ax = atkCol * TILE_SIZE + TILE_SIZE * 0.78
          const ay = atkRow * TILE_SIZE + TILE_SIZE * 0.22
          this.overlayGfx.fillStyle(0xff3333, 0.75)
          this.overlayGfx.fillCircle(ax, ay, 9)
          this.overlayGfx.lineStyle(2, 0xff0000, 1)
          this.overlayGfx.strokeCircle(ax, ay, 9)
        }
      }
    }
  }

  clearPlanningOverlay() {
    this.overlayGfx.clear()
  }

  drawHighlights() {
    this.highlightGfx.clear()
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
      const squares = attackSquares(this.state, this.state.selectedUnitId)
      for (const { col, row } of squares) {
        this.highlightGfx.lineStyle(3, 0xff6600, 0.9)
        this.highlightGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        this.highlightGfx.fillStyle(0xff6600, 0.15)
        this.highlightGfx.fillRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      }
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  redraw(state: GameState) {
    this.state = state
    this.drawTiles()
    this.drawUnits()
    this.drawPlanningOverlay()
    this.drawHighlights()
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
      const attackDir = action.kind === 'move-attack' ? action.attackDir : action.attackDir
      const DIR: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
      const [dc, dr] = DIR[attackDir]
      const tc = col + dc
      const tr = row + dr
      if (tc < 0 || tc >= GRID_COLS || tr < 0 || tr >= GRID_ROWS) { onComplete(); return }

      const flash = this.add.graphics()
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
      this.tweens.add({
        targets: unitGfx,
        x: tileCX(action.toCol),
        y: tileCY(action.toRow),
        duration: 400,
        ease: 'Sine.easeInOut',
        onComplete: () => attackAfterMove(action.toCol, action.toRow),
      })
    } else if (action.kind === 'attack') {
      attackAfterMove(action.col, action.row)
    }
  }

  animateNpcAction(action: NpcAction, onComplete: () => void) {
    if (action.kind === 'stay') { onComplete(); return }

    if (action.kind === 'move') {
      const unitGfx = this.unitObjects.get(action.unitId)
      if (!unitGfx) { onComplete(); return }
      this.tweens.add({
        targets: unitGfx,
        x: tileCX(action.toCol),
        y: tileCY(action.toRow),
        duration: 400,
        ease: 'Sine.easeInOut',
        onComplete: () => onComplete(),
      })
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
      // Flash attacker tile
      const flashA = this.add.graphics()
      flashA.fillStyle(0xff2222, 0.6)
      if (unitGfx) flashA.fillRect(unitGfx.x - TILE_SIZE / 2, unitGfx.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE)
      // Flash target tile
      const flashT = this.add.graphics()
      flashT.fillStyle(0xff2222, 0.6)
      flashT.fillRect(action.targetCol * TILE_SIZE, action.targetRow * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      let done = 0
      const check = () => { if (++done === 2) onComplete() }
      this.tweens.add({ targets: flashA, alpha: 0, duration: 300, onComplete: () => { flashA.destroy(); check() } })
      this.tweens.add({ targets: flashT, alpha: 0, duration: 300, onComplete: () => { flashT.destroy(); check() } })
    }
  }
}
