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
}
