// Map size bounds — the client mirror of the server constants in
// `src/games/dungeon-tactics/map.ts`. Min 4×4, max 16×16; the 16×16 cap keeps
// every board within the engine's Manhattan-span move/range bounds. When you
// change one side, mirror the other.
export const MAP_SIZE_MIN = 4
export const MAP_SIZE_MAX = 16
