# Trips App — Design

## Current State

The trips app (`client-trips/`) is a React PWA backed by the shared Hono/SQLite server. As of this writing it has:

- **Backend:** `src/routes/trips.ts` — CRUD for trips (create, list, get-current, set-current, update, delete)
- **Repository:** `src/repositories/sqlite/trip.repository.ts`
- **DB schema:** one `trips` table — `id, user_id, name, destination, departure_notes, return_notes, nights, full_days, is_current, created_at`
- **Frontend:** one page — `OverviewPage` — shows the current trip's name, destination, nights/fullDays counts, and departure/return notes rendered as markdown
- **Shared component:** `MarkdownContent` — already wired up in the trips client

Notable gaps relative to the full design:
- No `start_date` / `end_date` on trips — only `nights` and `full_days` (counts, not calendar dates)
- No multi-user trip membership
- No Days, Info, or Packing tabs

---

## Design Principles

- **Free-form first.** Notes fields use markdown. No rigid schemas for logistics, reservations, or plans — prose and bullet lists handle those better and need no maintenance as plans change.
- **Family-facing.** Every tab answers a question a family member might actually ask mid-trip: *What are we doing today? Where are we staying? Did I pack everything?*
- **Individual state where it matters.** Packing completion is tracked per user. Checking something off your list does not affect anyone else's.
- **API is the admin interface.** The trip owner is also the app developer. All trip content — dates, day plans, info page, packing list, membership — is created and maintained through direct API calls or CLI scripts. The app itself is the family-facing read layer. The only in-app write action for family members is checking off packing items. No in-app edit UI is needed or wanted; if something requires UI to manage, that's a sign the data model is wrong.

---

## Data Model

### Current `trips` table (existing)

```sql
id            INTEGER PRIMARY KEY
user_id       INTEGER NOT NULL         -- owner
name          TEXT NOT NULL
destination   TEXT
departure_notes TEXT
return_notes  TEXT
nights        INTEGER
full_days     INTEGER
is_current    INTEGER NOT NULL DEFAULT 0
created_at    TEXT NOT NULL            -- ISO 8601 UTC
```

### Additions to `trips` (new columns)

| Column | Type | Purpose |
|--------|------|---------|
| `start_date` | TEXT (YYYY-MM-DD) | First day of the trip; drives Days tab auto-generation |
| `end_date` | TEXT (YYYY-MM-DD) | Last day of the trip |
| `info_markdown` | TEXT | Single markdown page for the Info tab |

`start_date` and `end_date` replace the role of `nights` / `full_days` for the Days tab. The existing `nights` and `full_days` columns can remain for display purposes or be derived.

### New `trip_days` table

```sql
id       INTEGER PRIMARY KEY
trip_id  INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE
date     TEXT NOT NULL             -- YYYY-MM-DD
title    TEXT NOT NULL DEFAULT ''
body     TEXT NOT NULL DEFAULT ''  -- markdown
weather  TEXT                      -- freeform, e.g. "⛅ 84°F, partly cloudy"
```

Unique constraint: `(trip_id, date)`. Records are auto-generated (one per calendar day between `start_date` and `end_date` inclusive) when a trip is created or its date range changes. Day records are never deleted when the date range shrinks — only added. This prevents data loss if dates are accidentally changed via API.

### New `trip_members` table

```sql
id         INTEGER PRIMARY KEY
trip_id    INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE
user_id    INTEGER NOT NULL
role       TEXT NOT NULL DEFAULT 'member'   -- 'owner' | 'member'
joined_at  TEXT NOT NULL                    -- ISO 8601 UTC
```

Unique constraint: `(trip_id, user_id)`. The creating user is automatically inserted as `owner`. Members are added via API/CLI by the admin — there is no in-app member management UI. Membership grants read access to the trip and the ability to check/uncheck packing items.

### New `packing_items` table

```sql
id        INTEGER PRIMARY KEY
trip_id   INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE
section   TEXT NOT NULL DEFAULT ''
text      TEXT NOT NULL
position  INTEGER NOT NULL DEFAULT 0
```

One row per checkbox item. `section` groups items under a heading (e.g., "Everyone", "Jonathan"). `position` controls display order within a section. Items are created, updated, and deleted via API — the app never writes to this table.

### New `packing_state` table

```sql
id               INTEGER PRIMARY KEY
packing_item_id  INTEGER NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE
user_id          INTEGER NOT NULL
checked          INTEGER NOT NULL DEFAULT 0
```

Unique constraint: `(packing_item_id, user_id)`. `ON DELETE CASCADE` ensures that when an item is removed via API, all users' checked state for it is also removed — no orphaned rows, no stale state.

---

## Tab Structure

### Overview *(existing, minor additions)*

At-a-glance trip summary. Already shows: name, destination, nights/fullDays, departure notes (markdown), return notes (markdown). All read-only.

**Additions:**
- Show `start_date` / `end_date` when present (formatted dates, not just counts).
- When the trip is active (today falls between `start_date` and `end_date` inclusive), surface a **"Today" card** — the current day's title and body from `trip_days` — at the top of the page, above departure notes.
- "Today" card is read-only; tapping it navigates to the Days tab scrolled to that card.

**Data needed from API:** existing `/api/trips/current` response extended with `startDate`, `endDate`, `infoMarkdown`, `packingMarkdown`. The "Today" card content comes from the Days API or is embedded in the trip response.

---

### Days

One card per calendar day from `start_date` through `end_date`. All content is set via API/CLI by the admin; the tab is read-only in the app.

**Behavior:**
- Each card shows: date header (formatted "Tue, Jun 3"), title (falls back to date if empty), `weather` text line (if set), markdown body. All read-only for all users.
- When the trip is active, the page auto-scrolls to today's card on mount.

**API routes needed:**
```
GET  /api/trips/:id/days          → list all day records
PUT  /api/trips/:id/days/:date    → update title/body/weather (admin/CLI use)
```

---

### Info

A single markdown page for everything the family needs mid-trip: lodging details, access codes, car rental, emergency contacts, nearby stores. Content is set via API/CLI; the tab is read-only in the app.

**Behavior:**
- All members see the rendered markdown.
- No edit mode in the app.

**API:** `info_markdown` is a field on the trip record, updated via `PUT /api/trips/:id` with `infoMarkdown`. No new route needed.

---

### Packing

A per-person interactive checklist. The list is defined as structured items in the database, managed via API by the owner. The app renders them as tappable checkboxes. Each user's checked state is stored independently. This is the only tab with in-app write actions for family members.

**Behavior:**
- All members see the full item list grouped by section, with their own checkmarks applied.
- Tapping a checkbox toggles the `packing_state` row for that `(packingItemId, userId)`.
- User_id 1 (admin/owner) additionally sees a **summary bar** showing per-member completion: "Josiah: 14/22".
- No edit mode in the app — list management is API-only.

**API routes needed:**
```
GET    /api/trips/:id/packing/items            → list all items (grouped by section)
POST   /api/trips/:id/packing/items            → create an item { section, text, position }
PUT    /api/trips/:id/packing/items/:itemId    → update item { section?, text?, position? }
DELETE /api/trips/:id/packing/items/:itemId    → delete item (cascades state)
PUT    /api/trips/:id/packing/items/bulk       → replace entire list atomically

GET    /api/trips/:id/packing/state            → current user's checked item IDs
PUT    /api/trips/:id/packing/state            → toggle { itemId, checked }
GET    /api/trips/:id/packing/summary          → per-member completion (owner only)
```

The `bulk` endpoint is the primary authoring path — the owner POSTs the full list as a JSON array and the server replaces all items in a transaction, preserving `packing_state` rows for any item whose `id` appears in the payload.

---

## Multi-User / Family Access

**Access rules:**
- Only members (owner or member role) can read a trip and its tabs.
- Only user_id 1 (admin/owner) manages trip content — trip fields, day bodies, packing markdown, info markdown, and membership — via API or CLI. There is no in-app management UI.
- All members can check/uncheck packing items for themselves.
- `/api/trips/current` returns the current trip for any user who is a member of it.

**Member management:** done via `POST /api/trips/:id/members` from the CLI or a direct API call. The admin adds family members by user ID before the trip. No in-app UI is needed.

**API routes needed:**
```
GET    /api/trips/:id/members          → list members
POST   /api/trips/:id/members          → add a member { userId }
DELETE /api/trips/:id/members/:userId  → remove a member
```

---

## Packing List Design

The packing list is structured data, not markdown. This was a deliberate choice — markdown is right for free-form notes (departure, return, info page, day plans), but a checklist is fundamentally structured: it has items, sections, order, and per-user state. Storing it as markdown forces a parse step on every read, creates a text-hash key stability problem (rename an item → state lost), and makes it harder to query completion counts.

A `packing_items` table with DB primary keys solves all of this:
- Renaming an item via `PUT /items/:id` keeps the same row ID → checked state is fully preserved
- Deleting an item cascades the `packing_state` rows — no orphaned state
- Reordering updates the `position` column — keys are unaffected
- Completion queries are a simple JOIN — no parsing needed

The tradeoff vs. markdown is authoring ergonomics: the admin posts structured JSON instead of typing freeform text. Since the owner is also the developer and uses the API directly, this is not a barrier. A single `PUT /packing/items/bulk` endpoint with a JSON array is fast to call from a script or curl.

---

## Implementation Order

The specs below are ordered so each builds on a stable foundation. Backend-first within each phase is preferred — it lets the API be tested before the UI lands.

### Phase 1 — Foundation

- [x] **Spec 1: Trip dates & new fields**
  Add `start_date`, `end_date`, and `info_markdown` columns to the `trips` table in a single migration. Expose them in the API. This unblocks all subsequent phases without further schema migrations.

- [x] **Spec 2: Trip membership model**
  Add `trip_members` table. Auto-insert the creating user as owner on trip create. Expose member list/add/remove routes (for CLI/API use). Update `/api/trips/current` and list to use membership rather than `trips.user_id`. This is a breaking change to access semantics — do it before adding family members to the system.

### Phase 2 — New Tabs (simple ones first)

- [ ] **Spec 3: Info tab**
  Add `infoMarkdown` to the trip API response. Frontend: new `InfoPage` route and NavBar entry; renders `<MarkdownContent>`. Read-only. Empty state when null.

- [ ] **Spec 4: Days — data model & API**
  Add `trip_days` table. Auto-generate day records when a trip is created or its date range changes. Add `GET /api/trips/:id/days` and `PUT /api/trips/:id/days/:date`.

- [ ] **Spec 5: Days — frontend tab**
  New `DaysPage`. Card-per-day rendering with date header, title fallback, weather text line, and markdown body. Auto-scroll to today's card when trip is active. All read-only.

### Phase 3 — Packing

- [ ] **Spec 6: Packing — list rendering**
  Add `packing_items` table. Expose item CRUD and bulk-replace routes (admin/CLI use). New `PackingPage` route and NavBar entry; renders items grouped by section as a read-only list (no checkboxes yet).

- [ ] **Spec 7: Packing — per-user state**
  Add `packing_state` table referencing `packing_items.id` with cascade delete. Expose state read/write and summary routes. Frontend: render checkboxes with per-user state applied; tap to toggle. Owner sees per-member completion summary.

### Phase 4 — Overview enhancements

- [ ] **Spec 8: Overview "Today" card**
  When the trip is active and Days records exist, fetch today's day record and render it as a card at the top of Overview. Tapping navigates to the Days tab. Depends on Days API (Spec 4).

---

## Spec Authoring Guide

Each spec below maps to an OPSX proposal. "Key decisions" call out choices that should be explicit in the spec text.

### Spec 1: Trip dates & new fields

**What to specify:**
- Add four nullable columns via inline migration in `db.ts`: `start_date TEXT`, `end_date TEXT`, `info_markdown TEXT`, `packing_markdown TEXT`
- Update `CreateTripInput` / `UpdateTripInput` types in `interfaces.ts`
- Update `createTripSchema` / `updateTripSchema` in `routes/trips.ts` to accept the new fields
- Update `SqliteTripRepository` — `create`, `update`, `rowToTrip`
- Update `Trip` type in `client-trips/src/types.ts`
- Display `startDate` / `endDate` on OverviewPage when present, formatted as "Mon, Jun 3"

**Key decisions:** `nights` and `full_days` remain; they are not auto-derived from dates. New fields are nullable so existing trips are unaffected.

---

### Spec 2: Trip membership model

**What to specify:**
- New `trip_members` table (schema above) via inline migration
- `ITripRepository` extended with `addMember(tripId, userId, role)`, `removeMember(tripId, userId)`, `listMembers(tripId)`, `isMember(tripId, userId)`, `getMemberRole(tripId, userId)`
- `create()` auto-inserts the creating user as `owner` in `trip_members`
- `findCurrent(userId)` joins on `trip_members` instead of `trips.user_id`
- `list(userId)` similarly joins on membership
- New routes: `GET /api/trips/:id/members`, `POST /api/trips/:id/members` body `{ userId }`, `DELETE /api/trips/:id/members/:userId`
- All trip routes: authorization checks `isMember(tripId, userId)`; mutation routes additionally check `role = 'owner'`

**Key decisions:** member management lives in `ITripRepository` for simplicity. The `POST /members` route requires the authenticated user to be the owner — there is no self-serve join. This is admin-only.

---

### Spec 3: Info tab

**What to specify:**
- `infoMarkdown` included in all trip API responses (null if not set)
- `PUT /api/trips/:id` accepts `infoMarkdown` field (update `updateTripSchema`)
- New `client-trips/src/pages/InfoPage.tsx`
- App.tsx: add `/info` route; NavBar: add Info tab
- InfoPage: renders `<MarkdownContent>{trip.infoMarkdown}</MarkdownContent>`
- Empty state: "No info added yet." (same for all users — no edit mode in app)

---

### Spec 4: Days — data model & API

**What to specify:**
- New `trip_days` table (schema above) via inline migration
- `TripDay` type in `interfaces.ts`: `{ id, tripId, date, title, body, weather }`
- `ITripDayRepository` interface: `listByTrip(tripId): TripDay[]`, `upsertDay(tripId, date, data: { title?, body?, weather? }): TripDay`, `generateDays(tripId, startDate, endDate): void`
- `generateDays`: `INSERT OR IGNORE` one row per date in range; never deletes existing rows
- `SqliteTripDayRepository` implementing the above
- Mount days router at `/api/trips/:id/days` in `app.ts`
- Routes:
  - `GET /api/trips/:id/days` → `{ days: TripDay[] }` ordered by `date ASC`; requires membership
  - `PUT /api/trips/:id/days/:date` body `{ title?, body?, weather? }` → updated `TripDay`; requires owner role
- Call `generateDays` inside `tripRepo.create()` and inside `tripRepo.update()` when `startDate` or `endDate` changes

**Key decisions:** Day records survive date-range shrinks (INSERT OR IGNORE, no DELETE). This is intentional to prevent data loss on accidental API edits.

---

### Spec 5: Days — frontend tab

**What to specify:**
- New `client-trips/src/pages/DaysPage.tsx`
- App.tsx: add `/days` route; NavBar: add Days tab
- On mount: `GET /api/trips/:id/days` → render one `DayCard` per day, ordered by date
- `DayCard` shows: date header formatted "Tue, Jun 3"; title (or bare date as fallback when title is empty); `weather` as a plain text line when set (e.g., "⛅ 84°F, partly cloudy"); markdown body via `<MarkdownContent>`
- All cards are read-only for all users
- Auto-scroll: if trip is active (today between `startDate` and `endDate`), attach a `ref` to today's card and call `scrollIntoView({ behavior: 'instant' })` after render
- Empty state when no days returned: "Set trip dates to generate the day plan."

---

### Spec 6: Packing — list rendering

**What to specify:**
- New `packing_items` table (schema above) via inline migration in `db.ts`
- `PackingItem` type in `interfaces.ts`: `{ id, tripId, section, text, position }`
- `IPackingItemRepository` interface: `listByTrip(tripId): PackingItem[]`, `create(tripId, data): PackingItem`, `update(id, data): PackingItem | null`, `delete(id): boolean`, `bulkReplace(tripId, items): PackingItem[]`
- `bulkReplace`: run in a transaction — delete all existing items for the trip, then insert the new array; `packing_state` rows for deleted item IDs cascade automatically
- Routes (all require trip membership; mutations require owner role):
  - `GET /api/trips/:id/packing/items` → `{ items: PackingItem[] }` ordered by `section, position`
  - `POST /api/trips/:id/packing/items` body `{ section, text, position }` → created `PackingItem`
  - `PUT /api/trips/:id/packing/items/:itemId` body `{ section?, text?, position? }` → updated `PackingItem`
  - `DELETE /api/trips/:id/packing/items/:itemId` → 204
  - `PUT /api/trips/:id/packing/items/bulk` body `{ items: Array<{ id?, section, text, position }> }` → `{ items: PackingItem[] }` (items with `id` are updated; items without `id` are created; items not in payload are deleted)
- New `client-trips/src/pages/PackingPage.tsx`
- App.tsx: add `/packing` route; NavBar: add Packing tab
- On mount: `GET /api/trips/:id/packing/items` → render grouped by `section`: section headers as styled `<h2>`, items as list rows with checkbox icons (unchecked — no interactivity yet in this spec)
- Empty state: "No packing list yet." (same for all users)

---

### Spec 7: Packing — per-user state

**What to specify:**
- New `packing_state` table (schema above) via inline migration; `ON DELETE CASCADE` on `packing_item_id`
- `IPackingStateRepository`: `getState(tripId, userId): Record<number, boolean>` (itemId → checked), `setState(itemId, userId, checked: boolean): void`
- Routes:
  - `GET /api/trips/:id/packing/state` → `{ state: Record<itemId, boolean> }` for the authenticated user; requires membership
  - `PUT /api/trips/:id/packing/state` body `{ itemId: number, checked: boolean }` → `{ ok: true }`; validate that `itemId` belongs to this trip
  - `GET /api/trips/:id/packing/summary` → `{ members: Array<{ userId, displayName, checked, total }> }`; requires owner role; SQL: `SELECT user_id, COUNT(*) FILTER (WHERE checked=1) AS checked, COUNT(*) AS total FROM packing_state WHERE packing_item_id IN (SELECT id FROM packing_items WHERE trip_id=?) GROUP BY user_id`
- PackingPage: on mount, fetch `/packing/items` and `/packing/state` in parallel; render checkboxes with each user's state merged in
- Tap a checkbox → optimistic toggle in local state + `PUT` to persist; revert on error
- Owner (user_id 1) sees a "Completion" summary section above the list, one row per member showing `checked/total`
- Conflict resolution: last write wins; no locking needed

---

### Spec 8: Overview "Today" card

**What to specify:**
- On OverviewPage mount, if `trip.startDate` and `trip.endDate` are set and today falls within the range, also fetch `GET /api/trips/:id/days`
- Extract the day record matching today's date
- Render a "Today" card above the Departure section: show the day's `title` (or formatted date as fallback) and `body` as markdown via `<MarkdownContent>`
- Card is tappable: navigates to `/days` (the Days tab will auto-scroll to today's card)
- If the fetch fails or no matching day record exists, skip the card silently
- Depends on Spec 4 (Days API) and Spec 5 (Days route existing for navigation target)
