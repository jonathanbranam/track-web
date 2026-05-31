## Context

The Trips app already has a membership/auth model (`trip_members`) and a days sub-resource (`trip_days`) following an established pattern: inline migration in `db.ts`, repository interface in `interfaces.ts`, SQLite implementation in `repositories/sqlite/`, Hono router factory function in `routes/`, and a `checkAccess` helper that enforces owner/member roles. This spec adds a packing sub-resource following the same pattern.

The trips client (`client-trips/`) already has a NavBar with tabs and a `MarkdownContent` component. The packing list is structured data — not markdown — because it needs stable IDs for per-user state tracking in Spec 7.

## Goals / Non-Goals

**Goals:**
- Add `packing_items` DB table with section/text/position structure
- Repository interface and SQLite implementation with CRUD + atomic bulk-replace
- API routes for list, create, update, delete, and bulk-replace (with owner/member role enforcement)
- Read-only `PackingPage` rendering items grouped by section with unchecked checkbox icons
- Admin CLI commands for all packing item operations
- Empty state when no items exist

**Non-Goals:**
- Per-user checked state (`packing_state` table — Spec 7)
- Interactive checkboxes — no write actions for family members yet
- Completion summary (Spec 7)
- In-app edit UI — the admin uses the API/CLI only

## Decisions

**Structured data over markdown for packing lists.**  
Markdown would need a parser to extract items, has no stable IDs (renaming an item loses its state), and makes completion-count queries expensive. A `packing_items` table gives stable primary keys, queryable structure, and clean cascade delete for state in Spec 7. See `docs/trips/design.md` § "Packing List Design" for the full rationale.

**`bulkReplace` runs in a transaction: delete all then insert.**  
This is the primary authoring path — the admin posts the full list as a JSON array. Running DELETE + INSERT in a single transaction guarantees atomicity. `packing_state` rows for deleted items cascade automatically (Spec 7 will add that FK). Items receive new auto-increment IDs on each bulk replace; callers should not depend on IDs surviving a bulk replace.

**Single bulk-replace endpoint vs. diff-based patch.**  
A diff-based PATCH would require the client to track which rows changed. Since the admin posts from a script (not a UI), sending the full list is simpler. The tradeoff is that a bulk replace with an `id` field for existing items is not supported — the endpoint always assigns new IDs. This is acceptable because Spec 7 per-user state tracks by `packing_item_id` and is cascade-deleted on item removal.

**Router mounted at `/api/trips/:id/packing`.**  
Mirrors the pattern used by `trips-days.ts` (mounted at `/api/trips`). All packing routes are nested under a trip ID, enforcing trip-level access checks. A separate `routes/packing.ts` file keeps the routes module small and cohesive.

**CLI commands use the same `apiFetch` helper used by other CLI commands.**  
All packing item operations need CLI equivalents so the admin can manage items without a UI. Commands follow the existing pattern in `routes/deploy.ts` / `src/cli/` (or equivalent). All list/get commands support `--json`.

## Risks / Trade-offs

**Bulk replace assigns new IDs** → Spec 7 `packing_state` rows will be invalidated on every bulk replace. Mitigation: document that bulk replace is a destructive reset; the owner should use individual PUT/DELETE for edits that preserve user state once Spec 7 is live.

**No ordering guarantee within a section beyond `position`** → If two items share the same `position`, display order is non-deterministic. Mitigation: the `bulkReplace` endpoint assigns `position` from the array index if not provided; individual create/update should validate or normalize positions (not blocking for Spec 6).

## Migration Plan

1. Add inline migration `0023_packing_items` in `db.ts` (after the `trip_days` migration).
2. Add `'packing_items'` to the `TABLE_NAMES` export in `db.ts`.
3. Deploy: the migration runs on server startup; no data to backfill.
4. Rollback: remove the migration entry and drop the table (no existing data at risk for a new table).

## Open Questions

*(none — design is fully specified by the Spec 6 authoring guide in `docs/trips/design.md`)*
