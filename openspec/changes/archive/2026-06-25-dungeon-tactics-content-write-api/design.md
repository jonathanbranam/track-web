## Context

After map-persistence, content flows one way: the server seeds a Region/Map/
Encounter, exposes `GET .../content/*`, and the client content store loads it.
`SqliteGameContentRepository` (`src/repositories/sqlite/gameContent.ts`) has
`listRegions`, `getRegionWithMaps`, `getMapWithEncounters`, `getDefault`, and
`seedDefaultIfEmpty` — no writes. The server-side Zod `mapSchema`
(`src/games/dungeon-tactics/map.ts`) already validates the seed; it is the authority
to reuse for writes.

The exact write pattern to mirror already exists for Variants in `games.ts`:
`POST /:slug/scenarios` and `PUT /:slug/scenarios/:s/unit-defs`, both wrapped in
`zValidator('json', schema, onError → 400)`, session-gated, returning the stored
row. This change is the map analogue.

## Goals / Non-Goals

**Goals:**

- Add validated, session-authenticated **map** writes (create/update/delete) so the
  forthcoming editor can persist authored maps.
- Reuse the existing `mapSchema` as the single validation authority (server is
  source of truth; the client may pre-validate for UX but never bypasses this).
- Keep the API shape parallel to the unit-def write endpoints so the codebase has
  one consistent content-write idiom.

**Non-Goals:**

- No region or encounter writes (the editor authors maps first; region/encounter
  authoring is a later change).
- No editor UI, no client code.
- No admin gate (equal-rights default, matching the in-game editor and unit-def
  writes).

## Decisions

### Endpoints and verbs

```
POST   /api/games/dungeon-tactics-solo/content/regions/:regionId/maps   → 201 + stored map
PUT    /api/games/dungeon-tactics-solo/content/maps/:mapId              → 200 + stored map
DELETE /api/games/dungeon-tactics-solo/content/maps/:mapId             → 204
```

Create is nested under the region because a map cannot exist without one and the
region scopes ordering and the terrain enum. Update/Delete key by the globally
unique `map_id`, matching the existing `GET .../content/maps/:mapId`.

### Validation is the existing `mapSchema`, plus referential checks

The Zod `mapSchema` enforces the intrinsic rules (size bounds, grid-matches-size,
in-bounds objects/zones, atomic conditions). The repo adds the **referential**
checks the schema can't see: the parent region exists, and every terrain value is
in that region's `terrainTypes`. A failure at either layer rejects the write
atomically (no partial persist) — schema failures surface as `400` at the route via
`zValidator`; referential failures surface as `400`/`404` from the repo.

### Ordering, ids, and the "last map" guard

`createMap` assigns `sort_order = max(existing)+1` in the region and a stable
`map_id` (a slug derived from the name, de-duplicated; generated if empty).
`deleteMap` cascades to the map's encounters. Deleting the **last** remaining map in
a region is rejected (`409`) so the play path always resolves a default map —
`getDefault()` must never return null on a seeded DB.

### Update is a full replace of authored content

`PUT` replaces the map's `def_json` (terrain/objects/zones/size) and `name`/order
fields wholesale from the validated body — simplest correct semantics for an editor
that holds the whole map in memory and saves it. No field-level patching.

## Risks / Trade-offs

- **Cascade delete of encounters.** Deleting a map silently drops its encounters. *Accepted* for now: encounters aren't authored yet (only the seed's single encounter exists), and the last-map guard prevents removing the only playable map. Revisit when encounter authoring lands.
- **Slug collisions on create.** Two maps named the same. *Mitigation:* de-duplicate the derived `map_id` (suffix `-2`, `-3`); ids are opaque to users.
- **Schema drift between client and server.** The client `contentTypes.ts` mirrors the server schema by hand. *Mitigation:* server remains the only validation authority; the client may pre-validate but the endpoint is the gate (covered by tests).

## Migration / Rollout

No DB migration (tables exist). Purely additive endpoints; existing reads and the
seed are untouched. The map-editor change consumes these endpoints next.

## Open Questions

- Should `PUT` support partial updates (e.g. rename only) later? Not now — full
  replace is sufficient for the editor. Reserved.
- Do we want optimistic-concurrency (an `updated_at`/version check) to guard
  concurrent edits? Single-user today; deferred. Note it as a future hardening.

## Testing

- Create → `GET` round-trip: the stored map deserializes to the authored content.
- Malformed body (grid not matching size; object out of bounds; terrain outside the
  region enum; a composite condition) → `400`, nothing persisted.
- Unauthenticated create/update/delete → `401`, nothing persisted.
- Delete the last map in the region → rejected; `getDefault()` still returns a map.
- Update replaces content wholesale and is reflected on read-back.
- All CLI commands that return data support `--json` (if CLI parity is added).
- `npm run build:server` passes with zero TypeScript errors; existing + new tests
  pass.
