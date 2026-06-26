import * as Phaser from 'phaser'
import type { Cell } from './types'

// Shared board rendering for the play scene (`DungeonTacticsScene`) and the studio
// editor scene (`EditorScene`). Both draw terrain + structures the same way through
// `drawBoard`, so authored boards look exactly like played boards — and both will
// inherit the sprite tileset together when `dungeon-tactics-sprite-rendering` lands
// (this file becomes its single upgrade point). Editor-only overlays (zone tints,
// grid lines, hover/brush cursor) live in the editor scene, on top of this.

export const TILE_SIZE = 80

export const TERRAIN_COLORS: Record<string, number> = {
  plains: 0xd4a853,
  forest: 0x2d6a2f,
  water: 0x2b72b5,
  stone: 0x7d7d7d,
}

const STRUCTURE_COLOR = 0x8b5a2b
const TOWER_COLOR = 0xd4a000

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
        const m = TILE_SIZE * (isTower ? 0.12 : 0.18)
        gfx.fillStyle(isTower ? TOWER_COLOR : STRUCTURE_COLOR)
        gfx.fillRect(col * TILE_SIZE + m, row * TILE_SIZE + m, TILE_SIZE - 2 * m, TILE_SIZE - 2 * m)

        if (isTower) {
          const cx = col * TILE_SIZE + TILE_SIZE / 2
          const cy = row * TILE_SIZE + TILE_SIZE / 2
          const arm = TILE_SIZE * 0.22
          gfx.lineStyle(4, 0xffffff, 0.7)
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

        // HP pips on the left edge, stacked bottom-to-top
        const hp = cell.structureHp ?? 3
        const maxHp = isTower ? 5 : 3
        const pipW = 6; const pipH = isTower ? 7 : 10; const pipGap = 2
        for (let i = 0; i < maxHp; i++) {
          const pipX = col * TILE_SIZE + 3
          const pipY = (row + 1) * TILE_SIZE - 4 - (i + 1) * pipH - i * pipGap
          if (i < hp) {
            gfx.fillStyle(isTower ? 0xffdd44 : 0x22cc44)
            gfx.fillRect(pipX, pipY, pipW, pipH)
          }
          gfx.lineStyle(1, 0x333333, 1)
          gfx.strokeRect(pipX, pipY, pipW, pipH)
        }
      }
    }
  }
}
