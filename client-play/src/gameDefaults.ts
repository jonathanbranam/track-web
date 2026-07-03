// Default configuration for known tabletop/card games. Keyed by a normalized
// (lowercased, trimmed) game name so lookups are case-insensitive. When a user
// picks one of these games in setup, its defaults (currently just the round
// count) can be autofilled. This is the single source of truth for per-game
// defaults — add new games here.

export interface GameDefault {
  rounds: number
}

export const GAME_DEFAULTS: Record<string, GameDefault> = {
  'sushi go': { rounds: 3 },
  'tides of time': { rounds: 3 },
}

function normalizeGameName(name: string): string {
  return name.trim().toLowerCase()
}

/** Default config for a game name, or null if the game is unknown. */
export function gameDefaultFor(name: string): GameDefault | null {
  return GAME_DEFAULTS[normalizeGameName(name)] ?? null
}
