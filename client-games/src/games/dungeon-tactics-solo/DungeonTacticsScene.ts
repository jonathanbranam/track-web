import * as Phaser from 'phaser'
import type { GameState, PcAction, NpcAction, Direction } from './types'
import { GRID_COLS, GRID_ROWS } from './map'
import { inBounds } from './pathfinding'
import { isTowerImmune } from './turn'
import { validMoveDests, attackSquares } from './pc'

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

    this.tilesGfx = this.add.graphics().setDepth(0)
    this.spawnersGfx = this.add.graphics().setDepth(1)
    this.highlightGfx = this.add.graphics().setDepth(2)
    this.overlayGfx = this.add.graphics().setDepth(10)

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
      this.unitObjects.set(unit.id, container)
    }
  }

  private renderPc(gfx: Phaser.GameObjects.Graphics, unitType: string, hp: number, selected: boolean) {
    const r = TILE_SIZE * 0.28
    const fill = UNIT_COLORS[unitType] ?? 0x4a90e2
    gfx.fillStyle(fill)
    gfx.fillCircle(0, 0, r)
    gfx.lineStyle(selected ? 3 : 2, selected ? PC_SELECT_STROKE : PC_STROKE)
    gfx.strokeCircle(0, 0, r)
    this.drawHpPips(gfx, fill, hp)
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
    this.drawHpPips(gfx, fill, hp)
  }

  private drawHpPips(gfx: Phaser.GameObjects.Graphics, fillColor: number, hp: number) {
    const maxHp = 3
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

  // ─── Public API ──────────────────────────────────────────────────────────────

  redraw(state: GameState) {
    this.state = state
    this.drawTiles()
    this.drawSpawners()
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
            flashT.fillStyle(0xff2222, 0.6)
            flashT.fillRect(action.targetCol * TILE_SIZE, action.targetRow * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            this.tweens.add({ targets: flashT, alpha: 0, duration: 250, onComplete: () => { flashT.destroy(); onComplete() } })
          },
        })
        return
      }

      // Short-range: flash attacker + target
      const flashA = this.add.graphics()
      flashA.fillStyle(0xff2222, 0.6)
      if (unitGfx) flashA.fillRect(unitGfx.x - TILE_SIZE / 2, unitGfx.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE)
      const flashT = this.add.graphics()
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
