## Context

The monorepo has a shared Hono backend and SQLite database with `users`, `groups`, and `group_members` tables. A separate `client-food` frontend will be added (parallel to `client-time` and `client-watch`). The backend follows a repository pattern with interfaces in `src/repositories/interfaces.ts` and implementations in `src/repositories/sqlite/`.

The `watch` change introduces a shared `tags` table with `category IN ('genre','cuisine')`. This change reuses that table for cuisine tags; the two changes must be deployed together or `watch` must land first.

The social change must also land before this change — group/user invite selection depends on `user_connections` and `GET /api/social/users/connectable`, and the People tab imports components from `@repo/ui` provided by that change.

## Goals / Non-Goals

**Goals:**
- Global restaurant catalog with cuisine tags (shared across users)
- Per-user restaurant list: want-to-try / visited / skip states
- Per-user per-restaurant extras (always-order additions) with a `to_share` flag
- Dining events: invite, RSVP, restaurant candidate voting, host-confirmed selection
- Order collection per event: pre-filled from each user's last order at the confirmed restaurant; dishes with optional rating; organizer can edit all orders

**Non-Goals:**
- External restaurant data (Yelp, Google Places) — manual entry only
- Menu management or a full dish catalog — dishes are free-text per order
- Automatic "best restaurant" recommendation — voting is the mechanism
- Splitting bills or payment tracking

## Decisions

### 1. Separate Dining Event Tables (Not Shared with Watch)

Dining events use their own `dining_events`, `dining_event_invites`, `dining_event_candidates`, `dining_event_votes`, and `dining_event_selection` tables rather than a unified cross-app event table. The schema is parallel to the watch app's `watch_events` family.

**Alternative considered**: A single polymorphic `events` table shared by both apps. Rejected because the two apps are independently deployed frontends with no current need for cross-app queries. A shared table would couple their migrations and routing. Consolidation is straightforward later if a shared event dashboard is ever needed.

### 2. Cuisine Tags via Shared `tags` Table

Restaurant cuisine tags use the same `tags` table introduced by the watch change (`category = 'cuisine'`). `restaurant_tags` is a join table. User cuisine preferences in `user_preferences` reference the same tag rows.

**Alternative considered**: A separate `cuisine_tags` table. Rejected to keep the tag namespace unified — a user preference row shouldn't need to distinguish which app's tags it refers to.

### 3. Extras Are Per-User, Per-Restaurant, Free-Text

`user_restaurant_extras` stores one row per always-order item (e.g., "queso blanco") for a given user at a given restaurant. `to_share` (boolean) flags items intended for the whole table rather than just the individual. Extras surface as suggestions during order collection.

**Alternative considered**: Extras as a shared restaurant-level list. Rejected because personal preferences differ per person. The `to_share` flag keeps shared suggestions visible without forcing everyone to use them.

### 4. "Last Order" Pre-Fill Strategy

When order collection opens for event E at restaurant R, `GET /api/food/events/:id/orders/me` looks up the most recent `dining_orders` row for the current user where the associated event's selected restaurant is R. The response includes those order items (minus any prior ratings) as a suggested pre-fill; the client populates the order form with them.

If no prior order exists for that user at R, the response returns an empty item list. The user builds their order from scratch.

**Alternative considered**: A separate "standard order" table explicitly maintained by the user. Rejected because the user said "reorder what I ordered last time" — deriving it from history is simpler and always accurate without extra maintenance.

### 5. Order Status Flow

`dining_orders.status` is either `pending` or `confirmed`. Each user confirms their own order. The organizer sees a summary of all orders with confirmation status and can edit any order before placing. There is no "order placed" event recorded in the system — the actual online order is external.

### 6. Database Schema

```sql
-- Restaurants
CREATE TABLE restaurants (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  notes            TEXT,
  added_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_restaurants_name ON restaurants(name);

CREATE TABLE restaurant_tags (
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  tag_id        INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (restaurant_id, tag_id)
);

-- Per-user restaurant list
CREATE TABLE user_restaurants (
  user_id       INTEGER NOT NULL REFERENCES users(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  state         TEXT    NOT NULL CHECK(state IN ('want','visited','skip')),
  added_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, restaurant_id)
);

-- Per-user always-order extras
CREATE TABLE user_restaurant_extras (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  description   TEXT    NOT NULL,
  to_share      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Dining Events
CREATE TABLE dining_events (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  title              TEXT    NOT NULL,
  scheduled_date     TEXT    NOT NULL,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE dining_event_invites (
  event_id   INTEGER NOT NULL REFERENCES dining_events(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  attendance TEXT    CHECK(attendance IN ('yes','no','maybe')),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE dining_event_candidates (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id             INTEGER NOT NULL REFERENCES dining_events(id),
  restaurant_id        INTEGER NOT NULL REFERENCES restaurants(id),
  suggested_by_user_id INTEGER NOT NULL REFERENCES users(id),
  suggested_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, restaurant_id)
);

CREATE TABLE dining_event_votes (
  event_id     INTEGER NOT NULL REFERENCES dining_events(id),
  candidate_id INTEGER NOT NULL REFERENCES dining_event_candidates(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  vote         INTEGER NOT NULL CHECK(vote BETWEEN -2 AND 2),
  PRIMARY KEY (event_id, candidate_id, user_id)
);

CREATE TABLE dining_event_selection (
  event_id      INTEGER PRIMARY KEY REFERENCES dining_events(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id)
);

-- Orders (created after restaurant selection)
CREATE TABLE dining_orders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   INTEGER NOT NULL REFERENCES dining_events(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  status     TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, user_id)
);

CREATE TABLE dining_order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES dining_orders(id),
  description TEXT    NOT NULL,
  rating      INTEGER CHECK(rating BETWEEN 1 AND 5)
);
```

### 7. API Routes

All routes under `/api/food/` require authentication.

**Restaurants**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/food/restaurants` | List catalog (`?q=` search, `?tag=` filter) |
| POST | `/api/food/restaurants` | Add a restaurant |
| GET | `/api/food/restaurants/:id` | Get a restaurant |
| PUT | `/api/food/restaurants/:id` | Update restaurant |
| GET | `/api/food/restaurants/list` | Current user's restaurant list |
| PUT | `/api/food/restaurants/list/:restaurantId` | Add or update list entry |
| DELETE | `/api/food/restaurants/list/:restaurantId` | Remove from list |
| GET | `/api/food/restaurants/:restaurantId/extras` | Get user's extras for a restaurant |
| POST | `/api/food/restaurants/:restaurantId/extras` | Add an extra |
| PUT | `/api/food/restaurants/:restaurantId/extras/:id` | Update an extra |
| DELETE | `/api/food/restaurants/:restaurantId/extras/:id` | Delete an extra |

**Events**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/food/events` | List events the user created or was invited to |
| POST | `/api/food/events` | Create an event with initial invite list |
| GET | `/api/food/events/:id` | Event detail: invites, candidates, votes, selection |
| PUT | `/api/food/events/:id/attendance` | RSVP (yes / no / maybe) |
| POST | `/api/food/events/:id/candidates` | Nominate a restaurant |
| POST | `/api/food/events/:id/candidates/:candidateId/vote` | Cast or update a vote |
| PUT | `/api/food/events/:id/selection` | Host confirms restaurant |

**Orders** (available after selection is set)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/food/events/:id/orders` | All orders for the event (organizer view) |
| GET | `/api/food/events/:id/orders/me` | Current user's order (pre-filled from last visit if new) |
| PUT | `/api/food/events/:id/orders/me` | Save or update current user's order items |
| PUT | `/api/food/events/:id/orders/:userId` | Organizer updates any user's order |
| POST | `/api/food/events/:id/orders/me/confirm` | Confirm own order |

**Preferences**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/food/preferences` | Get current user's cuisine preferences |
| PUT | `/api/food/preferences` | Replace full preference tag list |

Group invite expansion (POST `/api/food/events`): same pattern as watch — `{ groupId }` entries expand to individual `group_members` rows at creation time. Individual `{ userId }` entries must be connected users; the backend validates this via `user_connections`. The event creation form uses `ConnectableUserPicker` from `@repo/ui`, which surfaces only connected users.

### 8. Repository Pattern

Three new repository interfaces and SQLite implementations:

- `RestaurantRepository` — catalog CRUD, user list, extras operations
- `DiningEventRepository` — event CRUD, invites, candidates, votes, selection
- `DiningOrderRepository` — order creation, pre-fill lookup, item management

Interfaces in `src/repositories/interfaces.ts`; implementations in `src/repositories/sqlite/`.

### 9. Frontend Page Structure

```
/                         → redirect to /restaurants
/restaurants              → personal list (Want to Try / Visited tabs; skip hidden by default)
/restaurants/catalog      → all restaurants; add restaurant
/restaurants/:id/extras   → manage my extras for this restaurant
/events                   → dining events list
/events/new               → create event (date, invite users/groups via ConnectableUserPicker)
/events/:id               → event detail: invites+RSVP, candidates+votes, selection, orders
/preferences              → cuisine preference tags
/people                   → People tab: connections, groups, invite codes (components from @repo/ui; social change)
```

NavBar: Restaurants | Events | People

The event detail page has four progressive phases:
1. **Voting** — invite/RSVP section + candidate nominations + vote; aggregate score shown
2. **Confirmed** (after host sets selection) — selected restaurant banner + order collection opens
3. **Order Collection** — each user's order pre-filled; confirm button per user; organizer sees all
4. **All Confirmed** — read-only summary of all orders; organizer uses this to place the combined order

Extras belonging to the current user for the selected restaurant are shown as one-tap additions during order entry. `to_share` extras are shown to all users as suggested additions.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| `tags` table dependency on watch change | Document deployment order: watch migrations must run before food migrations; both can be included in the same deploy |
| "Last order" pre-fill requires a join across events to find the previous restaurant match | Query is bounded by a user's event history; acceptable at this scale |
| Free-text dish descriptions make order history hard to aggregate or search | Intentional for now — a dish catalog adds significant scope; can be added later |
| Organizer editing other users' orders could cause confusion | Order detail shows who last edited each order; users are notified (via UI) that organizer may update |
| No "order placed" confirmation in system | Out of scope; the online order is placed externally |

## Open Questions

- Should extras surface automatically in the order form, or require the user to manually add them each time? (Current design: surfaced as one-tap suggestions — user still adds them explicitly)
- Should dish ratings apply to the current order (future reference) or only be settable after the meal? (Current design: rating is on the order item row and can be set at any time)
