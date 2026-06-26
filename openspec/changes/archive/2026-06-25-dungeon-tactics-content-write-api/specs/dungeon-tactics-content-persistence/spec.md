**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: Any logged-in user writes map content over a validated API
The system SHALL expose, on the games router and requiring a logged-in session but **no admin role** (matching the project's equal-rights default and the existing unit-def writes), endpoints to create, replace, and delete **maps** within the seeded region:

- `POST .../content/regions/:regionId/maps` — create a map in the region.
- `PUT .../content/maps/:mapId` — replace a map's authored content (size, terrain, objects, spawn zones, name).
- `DELETE .../content/maps/:mapId` — delete a map.

Every write body SHALL be validated against the server-side Zod `mapSchema` (the same authority used by the seed) **before** persisting, and the repository SHALL additionally enforce that the parent region exists and that every terrain value is in that region's `terrainTypes`. A write that fails validation SHALL be rejected with `400` (or `404` for an unknown parent) and SHALL NOT persist any partial change. Create SHALL assign the next ordering position and a stable `map_id`, returning the stored map. Delete SHALL cascade to the map's encounters and SHALL be **rejected** when it would remove the last remaining map in a region, so a seeded database always resolves a default map. This requirement covers maps only; region and encounter writes are out of scope.

#### Scenario: Logged-in user creates a valid map
- **WHEN** a logged-in client `POST`s a schema-valid map to a region's maps endpoint
- **THEN** the system SHALL persist it with the next ordering position and a stable id, and SHALL return the stored map

#### Scenario: Malformed map write is rejected
- **WHEN** a create or update body fails schema or referential validation (grid not matching `size`, out-of-bounds object, terrain outside the region's `terrainTypes`, or a composite condition)
- **THEN** the system SHALL reject it with `400`/`404` and SHALL NOT persist any change

#### Scenario: Unauthenticated write is rejected
- **WHEN** an unauthenticated client calls any map create/update/delete endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT persist any change

#### Scenario: Update replaces the map's authored content
- **WHEN** a logged-in client `PUT`s valid content for an existing map
- **THEN** the system SHALL replace that map's stored content wholesale and a subsequent read SHALL return the new content

#### Scenario: Deleting the last map is rejected
- **WHEN** a delete would remove the only remaining map in a region
- **THEN** the system SHALL reject the delete so the play path can still resolve a default map

## MODIFIED Requirements

### Requirement: Any logged-in user reads content over the endpoints
The system SHALL expose, on the games router and requiring a logged-in session, read endpoints that list regions and return a region's map(s) and a map's encounter(s) for the play path. Unauthenticated requests SHALL be rejected with `401`. Content **write** endpoints are provided separately (see "Any logged-in user writes map content over a validated API"); the read endpoints themselves SHALL remain read-only.

#### Scenario: Authenticated user reads content for play
- **WHEN** a logged-in client requests the content read endpoints
- **THEN** the system SHALL respond with the requested region/map/encounter content

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated client requests any content read endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT return data
