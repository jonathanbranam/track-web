import type Database from 'better-sqlite3'
import type { IGameContentRepository } from '../interfaces'
import {
  regionSchema,
  mapSchemaForTerrain,
  encounterSchema,
  type Region,
  type GameMap,
  type Encounter,
} from '../../games/dungeon-tactics/map'

// Persistence for dungeon-tactics serialized board content. Identity/ordering
// fields are real columns (for listing/joins); the full validated entity is
// stored as a single `def_json` blob, mirroring game_dt_unit_defs. Every write
// goes through the Zod schemas so a malformed map/encounter can never persist.

interface DefRow {
  def_json: string
}

// Typed write failures the games router maps to HTTP status codes:
// 'not-found' → 404, 'conflict' → 409, 'validation' → 400.
export class ContentError extends Error {
  constructor(
    public code: 'not-found' | 'conflict' | 'validation',
    message: string,
  ) {
    super(message)
    this.name = 'ContentError'
  }
}

// Derive a stable, url-ish map id from a name. Falls back to 'map' when the name
// has no alphanumeric content so an id is always non-empty.
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'map'
}

export class SqliteGameContentRepository implements IGameContentRepository {
  constructor(private db: Database.Database) {}

  listRegions(): Region[] {
    const rows = this.db
      .prepare('SELECT def_json FROM game_dt_regions ORDER BY sort_order ASC, region_id ASC')
      .all() as DefRow[]
    return rows.map(r => JSON.parse(r.def_json) as Region)
  }

  getRegionWithMaps(regionId: string): { region: Region; maps: GameMap[] } | null {
    const row = this.db
      .prepare('SELECT def_json FROM game_dt_regions WHERE region_id = ?')
      .get(regionId) as DefRow | undefined
    if (!row) return null
    const maps = this.db
      .prepare('SELECT def_json FROM game_dt_maps WHERE region_id = ? ORDER BY sort_order ASC, map_id ASC')
      .all(regionId) as DefRow[]
    return {
      region: JSON.parse(row.def_json) as Region,
      maps: maps.map(m => JSON.parse(m.def_json) as GameMap),
    }
  }

  getMapWithEncounters(mapId: string): { map: GameMap; encounters: Encounter[] } | null {
    const row = this.db
      .prepare('SELECT def_json FROM game_dt_maps WHERE map_id = ?')
      .get(mapId) as DefRow | undefined
    if (!row) return null
    const encounters = this.db
      .prepare('SELECT def_json FROM game_dt_encounters WHERE map_id = ? ORDER BY sort_order ASC, encounter_id ASC')
      .all(mapId) as DefRow[]
    return {
      map: JSON.parse(row.def_json) as GameMap,
      encounters: encounters.map(e => JSON.parse(e.def_json) as Encounter),
    }
  }

  getDefault(): { region: Region; map: GameMap; encounter: Encounter } | null {
    const regionRow = this.db
      .prepare('SELECT region_id, def_json FROM game_dt_regions ORDER BY sort_order ASC, region_id ASC LIMIT 1')
      .get() as (DefRow & { region_id: string }) | undefined
    if (!regionRow) return null

    const mapRow = this.db
      .prepare('SELECT map_id, def_json FROM game_dt_maps WHERE region_id = ? ORDER BY sort_order ASC, map_id ASC LIMIT 1')
      .get(regionRow.region_id) as (DefRow & { map_id: string }) | undefined
    if (!mapRow) return null

    const encounterRow = this.db
      .prepare('SELECT def_json FROM game_dt_encounters WHERE map_id = ? ORDER BY sort_order ASC, encounter_id ASC LIMIT 1')
      .get(mapRow.map_id) as DefRow | undefined
    if (!encounterRow) return null

    return {
      region: JSON.parse(regionRow.def_json) as Region,
      map: JSON.parse(mapRow.def_json) as GameMap,
      encounter: JSON.parse(encounterRow.def_json) as Encounter,
    }
  }

  seedDefaultIfEmpty(content: { region: unknown; map: unknown; encounter: unknown }): void {
    const existing = this.db.prepare('SELECT 1 FROM game_dt_regions LIMIT 1').get()
    if (existing) return // never overwrite existing content

    // Validate every entity before persisting (the write authority). A region's
    // map is validated against that region's terrainTypes.
    const region = regionSchema.parse(content.region)
    const map = mapSchemaForTerrain(region.terrainTypes).parse(content.map)
    const encounter = encounterSchema.parse(content.encounter)

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO game_dt_regions (region_id, name, theme, sort_order, def_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .run(region.id, region.name, region.theme, region.order, JSON.stringify(region))
      this.db
        .prepare(
          `INSERT INTO game_dt_maps (region_id, map_id, name, sort_order, def_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .run(map.regionId, map.id, map.name, map.order, JSON.stringify(map))
      this.db
        .prepare(
          `INSERT INTO game_dt_encounters (map_id, encounter_id, name, sort_order, def_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .run(encounter.mapId, encounter.id, encounter.name, encounter.order, JSON.stringify(encounter))
    })
    tx()
  }

  // ─── Map writes ───────────────────────────────────────────────────────────

  /** Load a region's parsed def, or throw not-found. */
  private requireRegion(regionId: string): Region {
    const row = this.db
      .prepare('SELECT def_json FROM game_dt_regions WHERE region_id = ?')
      .get(regionId) as DefRow | undefined
    if (!row) throw new ContentError('not-found', `Region "${regionId}" not found`)
    return JSON.parse(row.def_json) as Region
  }

  /**
   * Validate a map body against a region's terrain enum (structural schema +
   * referential terrain check), surfacing any failure as a `validation` error.
   */
  private validateMap(region: Region, map: unknown): GameMap {
    const result = mapSchemaForTerrain(region.terrainTypes).safeParse(map)
    if (!result.success) {
      throw new ContentError('validation', result.error.message)
    }
    return result.data
  }

  createMap(regionId: string, map: unknown): GameMap {
    const region = this.requireRegion(regionId)

    // The path region scopes the map; ignore any client id (we mint a stable one)
    // and force the regionId so terrain validates against the right enum.
    const candidate = { ...(map as Record<string, unknown>), regionId, id: 'placeholder' }
    const parsed = this.validateMap(region, candidate)

    const existing = (
      this.db
        .prepare('SELECT map_id FROM game_dt_maps WHERE region_id = ?')
        .all(regionId) as { map_id: string }[]
    ).map(r => r.map_id)
    const taken = new Set(existing)

    const base = slugify(parsed.name)
    let id = base
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`

    const maxRow = this.db
      .prepare('SELECT MAX(sort_order) AS maxOrder FROM game_dt_maps WHERE region_id = ?')
      .get(regionId) as { maxOrder: number | null }
    const order = (maxRow.maxOrder ?? -1) + 1

    const stored: GameMap = { ...parsed, id, regionId, order }
    this.db
      .prepare(
        `INSERT INTO game_dt_maps (region_id, map_id, name, sort_order, def_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .run(regionId, id, stored.name, order, JSON.stringify(stored))
    return stored
  }

  updateMap(mapId: string, map: unknown): GameMap {
    const row = this.db
      .prepare('SELECT region_id FROM game_dt_maps WHERE map_id = ?')
      .get(mapId) as { region_id: string } | undefined
    if (!row) throw new ContentError('not-found', `Map "${mapId}" not found`)

    const region = this.requireRegion(row.region_id)
    // Keep the map pinned to its existing id and region; everything else is a
    // wholesale replace from the validated body.
    const candidate = { ...(map as Record<string, unknown>), id: mapId, regionId: row.region_id }
    const stored = this.validateMap(region, candidate)

    this.db
      .prepare(
        `UPDATE game_dt_maps SET name = ?, sort_order = ?, def_json = ?, updated_at = datetime('now')
         WHERE map_id = ?`
      )
      .run(stored.name, stored.order, JSON.stringify(stored), mapId)
    return stored
  }

  deleteMap(mapId: string): void {
    const row = this.db
      .prepare('SELECT region_id FROM game_dt_maps WHERE map_id = ?')
      .get(mapId) as { region_id: string } | undefined
    if (!row) throw new ContentError('not-found', `Map "${mapId}" not found`)

    const count = (
      this.db
        .prepare('SELECT COUNT(*) AS n FROM game_dt_maps WHERE region_id = ?')
        .get(row.region_id) as { n: number }
    ).n
    if (count <= 1) {
      throw new ContentError('conflict', `Cannot delete the last map in region "${row.region_id}"`)
    }

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM game_dt_encounters WHERE map_id = ?').run(mapId)
      this.db.prepare('DELETE FROM game_dt_maps WHERE map_id = ?').run(mapId)
    })
    tx()
  }
}
