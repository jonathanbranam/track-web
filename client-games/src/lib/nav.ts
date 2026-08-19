// The bottom nav is hidden only while in-game (paths under `/game/…`) so the
// Phaser canvas owns the full viewport. Everything else — including the `/studio`
// design section — shows the two-tab nav. Pure predicate so it can be unit-tested
// without rendering the router.
export function isInGame(pathname: string): boolean {
  return /^\/game\//.test(pathname)
}

// The floating account chip is fixed to the top-right of the viewport, so it sits
// on top of anything a page puts there. Hide it in-game (the canvas owns the
// screen) and on the map editor, whose header keeps Save in that exact corner —
// the chip's larger z-index otherwise swallows the clicks. This is deliberately
// narrower than `isInGame`: the studio keeps its bottom nav, it just loses the
// chip on the one route that collides with it.
export function hidesUserChip(pathname: string): boolean {
  return isInGame(pathname) || /^\/studio\/dungeon-tactics\/maps\/[^/]+$/.test(pathname)
}
