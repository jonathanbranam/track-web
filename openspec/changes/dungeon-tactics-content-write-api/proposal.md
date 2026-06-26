## Why

The map-persistence change shipped content **read-only**: `src/routes/games.ts`
exposes `GET .../content/*` and the content repo has only reads +
`seedDefaultIfEmpty`. The studio's map editor needs to **save** what it authors, so
this change adds the missing write seam — repository write methods and
Zod-validated, session-authenticated write endpoints for **maps** within the
seeded region. It mirrors, almost exactly, the existing unit-def (Variant) write
endpoints (`POST /scenarios`, `PUT /scenarios/:s/unit-defs`) so the shape is
proven. It adds **no UI** (that's the map-editor change) and touches **only maps**
— region and encounter writing stay out of scope until the editor needs them.

## What Changes

- **Repository write methods.** Extend `IGameContentRepository` + its SQLite impl
  with `createMap`, `updateMap`, and `deleteMap`, each validating the payload
  through the existing server-side Zod `mapSchema` before persisting, and each
  enforcing the parent region exists and that terrain stays within the region's
  `terrainTypes`. Writes go through the same `def_json` columns the reads use.
- **Write endpoints** on the games router, logged-in only (no admin role), under
  `/api/games/dungeon-tactics-solo/content/…`:
  - `POST   /content/regions/:regionId/maps` — create a map in the region.
  - `PUT    /content/maps/:mapId` — replace a map's authored content.
  - `DELETE /content/maps/:mapId` — delete a map.
  Each validates the body with `zValidator('json', …)` mirroring the unit-def
  endpoints; malformed bodies are rejected `400`, unauthenticated `401`, and a
  write SHALL NOT partially persist.
- **Ordering & ids.** Create assigns the next `sort_order` within the region and a
  stable `map_id` (slug or generated); the response returns the stored map so the
  client can route to it. Delete removes the map and its child encounters (the
  seed map's single encounter); deleting the **last** map in a region is rejected
  so play always has a map to load.
- **Validation parity.** The same `mapSchema` already used by the seed path is the
  authority for these writes — terrain grid matches `size` (4×4–16×16), objects and
  spawn-zone tiles in bounds, composite conditions rejected — so a malformed map
  can never be stored from the editor.
- **Out of scope:** region create/update/delete and encounter writes (deferred
  until the editor authors them); any editor UI; any `client-games` page.

## Capabilities

### Modified Capabilities

- `dungeon-tactics-content-persistence`: Adds map **write** support — repository
  `createMap`/`updateMap`/`deleteMap` validated by the server-side Zod schema, and
  logged-in `POST`/`PUT`/`DELETE` map endpoints on the games router. The prior
  "read-only, no write endpoint" constraint is lifted **for maps**; region and
  encounter writing remain out of scope.

## Impact

- **Backend repo** (`src/repositories/sqlite/gameContent.ts`,
  `src/repositories/interfaces.ts`): add the three write methods + their SQL;
  validate through the existing `mapSchema` from `src/games/dungeon-tactics/map.ts`.
- **Routes** (`src/routes/games.ts`): add the three endpoints in the content block,
  using `zValidator` exactly as the unit-def endpoints do; update the block's
  "read-only" comment.
- **Tests** (`src/routes/games.content.test.ts` or a new write test): create →
  read-back round-trip; reject malformed body `400`; reject unauthenticated `401`;
  reject deleting the last map; terrain-outside-region-enum rejected.
- **API docs** (`openapi.yaml`): add the three content write routes.
- **Admin CLI** (`scripts/admin.ts`): optional parity write/delete commands with
  `--json`; at minimum keep the existing read/seed commands accurate.
- **No DB schema change** (tables already exist), **no client change**, **no
  deployment-config change**.
