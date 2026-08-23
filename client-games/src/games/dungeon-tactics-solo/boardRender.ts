import * as Phaser from 'phaser'
import type { Cell } from '@repo/dungeon-engine'
import { TERRAIN, STRUCTURE_FILL, TOWER_CROSS, PIP, STRUCTURE_PIP_FILL, pipHeightRatio } from '@repo/dungeon-engine'

// Shared board rendering for the play scene (`DungeonTacticsScene`) and the studio
// editor scene (`EditorScene`). Both draw terrain + structures the same way through
// `drawBoard`, so authored boards look exactly like played boards — and both will
// inherit the sprite tileset together when `dungeon-tactics-sprite-rendering` lands
// (this file becomes its single upgrade point). Editor-only overlays (zone tints,
// grid lines, hover/brush cursor) live in the editor scene, on top of this.
//
// Every colour and every pip dimension below comes from the engine's shared
// visual vocabulary (`@repo/dungeon-engine`'s `./palette`) rather than being
// declared here — see the `dungeon-visual-vocabulary` change. `TERRAIN_COLORS`
// stays exported under its old name because `MapEditorHud.tsx` still imports it.

export const TILE_SIZE = 80

/** Kept for `MapEditorHud.tsx`, which imports this name; the values themselves
 *  now come from the engine's vocabulary rather than being declared here. */
export const TERRAIN_COLORS: Record<string, number> = TERRAIN

export function tileCX(col: number) { return col * TILE_SIZE + TILE_SIZE / 2 }
export function tileCY(row: number) { return row * TILE_SIZE + TILE_SIZE / 2 }

// Draw terrain rects (with grid stroke) and any structures (power-center/tower
// body, tower cross + immunity ring, HP pips) for the whole grid into `gfx`. The
// caller clears/owns `gfx`. `towerImmune` draws the tower's blue protection ring.
export function drawBoard(
  gfx: Phaser.GameObjects.Graphics,
  cells: Cell[][],
  opts: { towerImmune: boolean },
) {
  const rows = cells.length
  for (let row = 0; row < rows; row++) {
    const cols = cells[row].length
    for (let col = 0; col < cols; col++) {
      const cell = cells[row][col]
      const color = TERRAIN_COLORS[cell.terrain] ?? 0x444444
      gfx.fillStyle(color)
      gfx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      gfx.lineStyle(1, 0x000000, 0.4)
      gfx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)

      if (cell.hasStructure) {
        const isTower = cell.structureKind === 'tower'
        const structureKind = cell.structureKind ?? 'power-center'
        const m = TILE_SIZE * (isTower ? 0.12 : 0.18)
        gfx.fillStyle(STRUCTURE_FILL[structureKind])
        gfx.fillRect(col * TILE_SIZE + m, row * TILE_SIZE + m, TILE_SIZE - 2 * m, TILE_SIZE - 2 * m)

        if (isTower) {
          const cx = col * TILE_SIZE + TILE_SIZE / 2
          const cy = row * TILE_SIZE + TILE_SIZE / 2
          const arm = TOWER_CROSS.armRatio * TILE_SIZE
          gfx.lineStyle(TOWER_CROSS.thicknessRatio * TILE_SIZE, TOWER_CROSS.color, TOWER_CROSS.opacity)
          gfx.beginPath()
          gfx.moveTo(cx - arm, cy); gfx.lineTo(cx + arm, cy)
          gfx.moveTo(cx, cy - arm); gfx.lineTo(cx, cy + arm)
          gfx.strokePath()
          // Blue immunity ring when protected
          if (opts.towerImmune) {
            gfx.lineStyle(3, 0x44aaff, 0.85)
            gfx.strokeRect(col * TILE_SIZE + 2, row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4)
          }
        }

        // HP pips on the left edge, stacked bottom-to-top. Geometry is a ratio of
        // tile size, not a pixel count — see `pipHeightRatio`'s header for why.
        const hp = cell.structureHp ?? 3
        const maxHp = isTower ? 5 : 3
        const pipW = PIP.widthRatio * TILE_SIZE
        const pipH = pipHeightRatio(maxHp) * TILE_SIZE
        const pipGap = PIP.gapRatio * TILE_SIZE
        for (let i = 0; i < maxHp; i++) {
          const pipX = col * TILE_SIZE + PIP.insetRatio * TILE_SIZE
          const pipY = (row + 1) * TILE_SIZE - PIP.bottomRatio * TILE_SIZE - (i + 1) * pipH - i * pipGap
          if (i < hp) {
            gfx.fillStyle(STRUCTURE_PIP_FILL[structureKind])
            gfx.fillRect(pipX, pipY, pipW, pipH)
          }
          gfx.lineStyle(1, PIP.emptyStroke, 1)
          gfx.strokeRect(pipX, pipY, pipW, pipH)
        }
      }
    }
  }
}
