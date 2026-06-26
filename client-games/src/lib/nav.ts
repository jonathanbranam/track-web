// The bottom nav is hidden only while in-game (paths under `/game/…`) so the
// Phaser canvas owns the full viewport. Everything else — including the `/studio`
// design section — shows the two-tab nav. Pure predicate so it can be unit-tested
// without rendering the router.
export function isInGame(pathname: string): boolean {
  return /^\/game\//.test(pathname)
}
