import type { ContentMap, ContentEncounter, ContentTree } from '@repo/dungeon-engine'
import { applyMap, resetContent } from '@repo/dungeon-engine'
import { fetchDefaultContent, fetchMapWithEncounters } from '../../api'

// The browser host's loading half of the board-content store. The engine package
// owns the deserialized board and its getters; everything that talks to the
// server lives here.
//
// At game start `loadFromServer()` populates the engine's store from the
// persisted default Map; if that fetch fails the engine keeps the bundled map so
// the game stays playable offline / on error. There is no polling / mid-session
// re-fetch. There is no localStorage "active content" pointer — the host either
// loads the server default or the Map the player picked in the start dialog.

export const GAME_SLUG = 'dungeon-tactics-solo'

let loadedMapId: string | null = null

export function loadedMap(): string | null {
  return loadedMapId
}

// Load the persisted default Map into the store at game start. On any failure
// the store is left as-is (bundled map) so the game stays playable. Returns
// whether a load succeeded.
export async function loadFromServer(): Promise<{ ok: boolean; mapId: string | null }> {
  try {
    const tree = await fetchDefaultContent<ContentTree>(GAME_SLUG)
    applyMap(tree.map)
    loadedMapId = tree.map.id
    return { ok: true, mapId: tree.map.id }
  } catch {
    console.warn('[dungeon-tactics] content fetch failed; using bundled map')
    return { ok: false, mapId: null }
  }
}

// Load a specific Map by id into the store — the path used when the player picks
// a map from the start-of-game selection dialog. On failure the store is left
// as-is so the game stays playable. Returns whether the load succeeded.
export async function loadMapById(mapId: string): Promise<{ ok: boolean; mapId: string | null }> {
  try {
    const { map } = await fetchMapWithEncounters<ContentMap, ContentEncounter>(GAME_SLUG, mapId)
    applyMap(map)
    loadedMapId = map.id
    return { ok: true, mapId: map.id }
  } catch {
    console.warn('[dungeon-tactics] map fetch failed; using bundled map')
    return { ok: false, mapId: null }
  }
}

// Restore the bundled map and forget which Map is loaded (tests / fallback) —
// the host-side counterpart of the engine's `reset()`, which knows nothing about
// the active selection.
export function reset(): void {
  resetContent()
  loadedMapId = null
}
