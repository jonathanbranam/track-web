import * as Phaser from 'phaser'
import type { GameState, PcAction, NpcAction, Direction, PcType, NpcType, Tile, UnitKind, OutlineRole } from '@repo/dungeon-engine'
import {
  gridCols,
  gridRows,
  playerSpawnZone,
  inBounds,
  isTowerImmune,
  availableActions,
  getDef,
  getMaxHp,
  UNIT_FILL,
  UNIT_INITIAL,
  trianglePoints,
  OUTLINE,
  OVERLAY,
  PIP,
  pipHeightRatio,
  outlineRole,
} from '@repo/dungeon-engine'
import { TILE_SIZE, drawBoard, tileCX, tileCY } from './boardRender'

export { TILE_SIZE }

// Presentation the game alone owns — the vocabulary shared with the design
// bench does not carry these (see the `dungeon-visual-vocabulary` change).
const SPAWNER_COLOR = 0xcc2222

// Which sides this host offers a seat to — the one fact `outlineRole` needs
// that only a host can supply. The game seats the player only; the design
// bench seats both sides, because it drives the enemy by hand.
const GAME_SEATS: UnitKind[] = ['pc']

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
}

export default class DungeonTacticsScene extends Phaser.Scene {
  private state!: GameState
  private tilesGfx!: Phaser.GameObjects.Graphics
  private spawnersGfx!: Phaser.GameObjects.Graphics
  private highlightGfx!: Phaser.GameObjects.Graphics
  private overlayGfx!: Phaser.GameObjects.Graphics
  private unitObjects = new Map<string, Phaser.GameObjects.Container>()

  // worldLayer holds the board (pans/zooms with the main camera). The HUD is now
  // a ReactDOM overlay (see hud/Hud.tsx) rendered over the canvas by the React
  // host, so the scene draws only the board.
  private worldLayer!: Phaser.GameObjects.Container

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
      cam.width / (gridCols() * TILE_SIZE + padding * 2),
      cam.height / (gridRows() * TILE_SIZE + padding * 2),
      1.0,
    )
    cam.zoom = fitZoom
    cam.centerOn(
      (gridCols() * TILE_SIZE) / 2,
      (gridRows() * TILE_SIZE) / 2,
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

      // The HUD is a ReactDOM overlay: its interactive controls capture pointer
      // events in the DOM, so taps that reach the canvas here are always board
      // taps. Convert screen → world via camera matrix inverse (handles zoom
      // around viewport center).
      const wp = cam.getWorldPoint(ptr.x, ptr.y)
      const col = Math.floor(wp.x / TILE_SIZE)
      const row = Math.floor(wp.y / TILE_SIZE)
      if (col < 0 || col >= gridCols() || row < 0 || row >= gridRows()) return

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
    // Terrain + structures are drawn by the shared helper the editor scene also
    // uses, so play and editor render identically.
    drawBoard(this.tilesGfx, this.state.cells, { towerImmune: isTowerImmune(this.state.cells) })
  }

  drawUnits() {
    for (const container of this.unitObjects.values()) container.destroy()
    this.unitObjects.clear()

    const npcs = this.state.units.filter((u) => u.kind === 'npc')

    for (const unit of this.state.units) {
      const gfx = this.add.graphics()
      const selected = unit.id === this.state.selectedUnitId
      const role = outlineRole({ phase: this.state.phase, side: unit.kind, seats: GAME_SEATS })
      const r = TILE_SIZE * 0.28
      if (unit.kind === 'pc') {
        this.renderPc(gfx, unit.unitType, unit.hp, selected, role)
      } else {
        this.renderNpc(gfx, unit.unitType, unit.hp, selected, role)
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

      // The archetype initial, centred on the token. A circle's centre is the
      // token origin; a triangle's centroid sits about 0.13r below it, so a
      // letter placed at the origin would ride high in the narrow apex.
      const initialY = unit.kind === 'npc' ? r * 0.13 : 0
      const initial = this.add.text(0, initialY, UNIT_INITIAL[unit.unitType], {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5)

      const container = this.add.container(tileCX(unit.col), tileCY(unit.row), [gfx, initial, text])
      container.setDepth(2)
      this.worldLayer.add(container)
      this.unitObjects.set(unit.id, container)
    }

    // Keep the planning overlay (depth 10) above units (depth 2) within the layer.
    this.worldLayer.sort('depth')
  }

  private renderPc(
    gfx: Phaser.GameObjects.Graphics,
    unitType: string,
    hp: number,
    selected: boolean,
    role: OutlineRole,
  ) {
    const r = TILE_SIZE * 0.28
    const fill = UNIT_FILL[unitType as PcType | NpcType] ?? 0x4a90e2
    gfx.fillStyle(fill)
    gfx.fillCircle(0, 0, r)
    this.strokeOutline((radius) => gfx.strokeCircle(0, 0, radius), gfx, r, selected, role)
    this.drawHpPips(gfx, fill, hp, getMaxHp(unitType as PcType | NpcType))
  }

  private renderNpc(
    gfx: Phaser.GameObjects.Graphics,
    unitType: string,
    hp: number,
    selected: boolean,
    role: OutlineRole,
  ) {
    const r = TILE_SIZE * 0.28
    const fill = UNIT_FILL[unitType as PcType | NpcType] ?? 0xe24a4a
    const strokeTriangleAt = (radius: number) => {
      const pts = trianglePoints(radius)
      gfx.strokeTriangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1])
    }
    const [apex, right, left] = trianglePoints(r)
    gfx.fillStyle(fill)
    gfx.fillTriangle(apex[0], apex[1], right[0], right[1], left[0], left[1])
    this.strokeOutline(strokeTriangleAt, gfx, r, selected, role)
    this.drawHpPips(gfx, fill, hp, getMaxHp(unitType as PcType | NpcType))
  }

  // The unit's outline: the live/idle rule (`OUTLINE.live` / `OUTLINE.idle`) for
  // an unselected piece, or the selection mark for a selected one — a yellow
  // ring inside a black one, which replaces the live/idle outline rather than
  // stacking with it (design.md §4). `strokeShape` draws the piece's own
  // outline (circle or triangle) at whatever radius it is given, so this stays
  // shape-agnostic.
  private strokeOutline(
    strokeShape: (radius: number) => void,
    gfx: Phaser.GameObjects.Graphics,
    r: number,
    selected: boolean,
    role: OutlineRole,
  ) {
    if (selected) {
      gfx.lineStyle(2, OUTLINE.selected)
      strokeShape(r)
      gfx.lineStyle(2, OUTLINE.selectedBacking)
      strokeShape(r + 3)
      return
    }
    gfx.lineStyle(2, role === 'live' ? OUTLINE.live : OUTLINE.idle)
    strokeShape(r)
  }

  private drawHpPips(gfx: Phaser.GameObjects.Graphics, fillColor: number, hp: number, maxHp: number) {
    const pipW = PIP.widthRatio * TILE_SIZE
    const pipH = pipHeightRatio(maxHp) * TILE_SIZE
    const pipGap = PIP.gapRatio * TILE_SIZE
    const pipX = -TILE_SIZE / 2 + PIP.insetRatio * TILE_SIZE
    for (let i = 0; i < maxHp; i++) {
      const pipY = TILE_SIZE / 2 - PIP.bottomRatio * TILE_SIZE - (i + 1) * pipH - i * pipGap
      if (i < hp) {
        gfx.fillStyle(fillColor)
        gfx.fillRect(pipX, pipY, pipW, pipH)
      }
      gfx.lineStyle(1, PIP.emptyStroke, 1)
      gfx.strokeRect(pipX, pipY, pipW, pipH)
    }
  }

  // Board-anchored overlays that are not tied to the selected unit: today only
  // the NPC attack telegraphs. The per-unit `plans` overlay that used to be drawn
  // here is gone with the plan-then-commit model — nothing has written
  // `state.plans` since PC actions became immediate, so the loop drew an empty
  // map on every redraw.
  drawPlanningOverlay() {
    this.overlayGfx.clear()
    if (this.state.phase !== 'player') return

    // NPC telegraphed attacks (orange marker on the targeted cell). Movement is no
    // longer telegraphed — NPCs have already moved by the time the player turn
    // begins — so only the stored attack plans are drawn.
    for (const plan of this.state.npcPlans) {
      const npc = this.state.units.find((u) => u.id === plan.unitId)
      if (!npc) continue
      const ax = plan.targetCol * TILE_SIZE + TILE_SIZE * 0.5
      const ay = plan.targetRow * TILE_SIZE + TILE_SIZE * 0.5
      this.overlayGfx.lineStyle(2, 0xff4400, 0.9)
      this.overlayGfx.strokeCircle(ax, ay, 10)
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
      for (const key of playerSpawnZone()) {
        const [col, row] = key.split(',').map(Number)
        this.highlightGfx.lineStyle(3, 0xffff00, 0.9)
        this.highlightGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        this.highlightGfx.fillStyle(0xffff00, 0.15)
        this.highlightGfx.fillRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      }
      return
    }

    if (this.state.phase !== 'player' || !this.state.selectedUnitId) return

    // Which action is active, and therefore which tiles to paint, comes from the
    // engine — the scene no longer derives reach or targeting for itself. The
    // `overlay` hint picks which vocabulary entry applies; the engine still has
    // no business knowing about colours, only about which hint an action gets.
    const active: 'move' | 'attack' | null =
      this.state.planningPhase === 'selecting-move' ? 'move'
      : this.state.planningPhase === 'selecting-attack' ? 'attack'
      : null
    if (!active) return

    const option = availableActions(this.state, this.state.selectedUnitId).find((o) => o.id === active)
    if (!option || !option.available) return

    const { color, fillAlpha } = option.overlay === 'reachable' ? OVERLAY.move : OVERLAY.attack
    for (const { col, row } of option.targets) {
      this.highlightGfx.lineStyle(3, color, 0.9)
      this.highlightGfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      this.highlightGfx.fillStyle(color, fillAlpha)
      this.highlightGfx.fillRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
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

  /**
   * Animate a committed PC move: slide the unit along its path, then hand back.
   *
   * Attacks are animated by `animateAttack`, which takes the tiles the engine
   * says the attack resolves against rather than re-deriving them here. Before
   * that split this method hardcoded the ranger's minimum range and the
   * magic-user's cross, so editing an archetype's range made the animation
   * depict an attack the game no longer performed.
   */
  animatePcAction(action: PcAction, onComplete: () => void) {
    if (action.kind !== 'move') {
      onComplete()
      return
    }
    const unitGfx = this.unitObjects.get(action.unitId)
    if (!unitGfx) { onComplete(); return }

    const steps = action.path
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
  }

  /**
   * Animate an attack over the tiles the engine reports it resolves against.
   *
   * The *style* is presentation and stays here, but it is keyed on the unit
   * definition's propagation shape rather than on the archetype's name, so a
   * definition edit changes both what the attack does and how it looks:
   *
   *   line → a projectile travelling to the tile the attack lands on
   *   plus → the whole area flashing at once
   *   otherwise → the single struck tile flashing
   *
   * `impact` is where damage actually landed (the engine's first effect), which
   * for a line attack is nearer than the footprint's far end.
   */
  animateAttack(unitId: string, affected: Tile[], impact: Tile | null, onComplete: () => void) {
    const unit = this.state.units.find((u) => u.id === unitId)
    if (!unit || affected.length === 0) { onComplete(); return }
    const shape = getDef(unit.unitType).attack.propagation.shape

    if (shape === 'line') {
      const dest = impact ?? affected[affected.length - 1]
      const proj = this.add.graphics()
      this.worldLayer.add(proj)
      proj.fillStyle(0xaaffaa)
      proj.fillCircle(0, 0, 5)
      proj.setDepth(5)
      proj.x = tileCX(unit.col)
      proj.y = tileCY(unit.row)
      this.tweens.add({
        targets: proj,
        x: tileCX(dest.col),
        y: tileCY(dest.row),
        duration: 320,
        ease: 'Linear',
        onComplete: () => { proj.destroy(); onComplete() },
      })
      return
    }

    const area = shape === 'plus'
    const tiles = area ? affected : (impact ? [impact] : affected.slice(0, 1))
    const colour = area ? 0xaa44ff : 0xff2222
    const alpha = area ? 0.65 : 0.7
    const duration = area ? 350 : 250

    const flashes: Phaser.GameObjects.Graphics[] = []
    for (const { col, row } of tiles) {
      if (!inBounds(col, row)) continue
      const flash = this.add.graphics()
      this.worldLayer.add(flash)
      flash.fillStyle(colour, alpha)
      flash.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      flashes.push(flash)
    }
    if (flashes.length === 0) { onComplete(); return }

    let done = 0
    for (const flash of flashes) {
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration,
        onComplete: () => { flash.destroy(); if (++done === flashes.length) onComplete() },
      })
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
