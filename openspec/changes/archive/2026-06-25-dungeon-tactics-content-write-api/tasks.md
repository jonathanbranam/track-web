## 1. Repository write methods

- [x] 1.1 Extend `IGameContentRepository` (`src/repositories/interfaces.ts`) with `createMap(regionId, map)`, `updateMap(mapId, map)`, `deleteMap(mapId)`
- [x] 1.2 Implement them in `src/repositories/sqlite/gameContent.ts`: validate the payload via the existing `mapSchema` (`src/games/dungeon-tactics/map.ts`); enforce parent region exists and terrain ⊆ region `terrainTypes`; write through `def_json`
- [x] 1.3 `createMap`: assign `sort_order = max+1` in the region and a stable de-duplicated `map_id`; return the stored map
- [x] 1.4 `deleteMap`: cascade to the map's encounters; reject deleting the last map in a region (so `getDefault()` never returns null)
- [x] 1.5 `updateMap`: full replace of authored content + name/order from the validated body

## 2. Write endpoints

- [x] 2.1 Add `POST /:slug/content/regions/:regionId/maps`, `PUT /:slug/content/maps/:mapId`, `DELETE /:slug/content/maps/:mapId` in `src/routes/games.ts`, session-gated, using `zValidator('json', mapSchema, …)` exactly as the unit-def endpoints do
- [x] 2.2 Map repo errors to status codes: schema → `400`, unknown region/map → `404`, last-map delete → `409`; success → `201`/`200`/`204` with the stored map where applicable
- [x] 2.3 Update the content block's "read-only — no write endpoints" comment in `games.ts`

## 3. Tests

- [x] 3.1 Create → `GET` round-trip: stored map deserializes to the authored content with the next ordering position
- [x] 3.2 Malformed body cases → `400`, nothing persisted (grid≠size, out-of-bounds object, terrain outside region enum, composite condition)
- [x] 3.3 Unauthenticated create/update/delete → `401`, nothing persisted
- [x] 3.4 Delete last map → rejected; `getDefault()` still returns a map
- [x] 3.5 Update replaces content wholesale; read-back reflects it

## 4. Docs, CLI, build

- [x] 4.1 Add the three content write routes to `openapi.yaml`
- [x] 4.2 (Optional parity) add admin CLI map write/delete commands in `scripts/admin.ts`, each returning data supporting `--json`; update README if commands are added
- [x] 4.3 Update `llm-context.md` if the content-authoring API surface is consumer-visible
- [x] 4.4 Run `npm run build:server`; confirm zero TypeScript errors and that existing + new tests pass
