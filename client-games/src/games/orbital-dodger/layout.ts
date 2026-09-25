/**
 * Where the play area sits while the tuning panel is open. The game is scaled
 * with Phaser's FIT, so for a container of w × h it is drawn
 * min(w, h × GAME_W / GAME_H) wide. Pulling the play area's right edge in by
 * the free space around the game — capped at the panel width — moves the game
 * left without ever making its container narrower than the drawn game, so FIT
 * keeps the same scale: the game slides, it never shrinks.
 */

/** Width of the tuning panel on screens wide enough to show it beside the game. */
export const PANEL_W = 300

export function panelInset(
  containerW: number,
  containerH: number,
  gameW: number,
  gameH: number,
  panelW = PANEL_W,
): number {
  if (containerW <= 0 || containerH <= 0) return 0
  const drawnW = Math.min(containerW, (containerH * gameW) / gameH)
  return Math.max(0, Math.min(panelW, containerW - drawnW))
}
