## Why

Users want to coordinate group dining — deciding where to eat, collecting everyone's order before placing it online, and remembering what dishes to order again. Without a structured tool this coordination happens entirely out-of-band, orders get forgotten or wrong, and good restaurants get lost.

## What Changes

- Users maintain a personal restaurant list with states: **want to try**, **visited**, **skip**
- Restaurants have a name, cuisine tags (one or more), and optional notes
- Per-user, per-restaurant **extras** — always-order additions (e.g., "queso blanco with Mexican") with a `to_share` flag for table-wide items
- Per-user cuisine preferences (informational; used when creating dining events)
- Any user can create a **dining event** — a scheduled outing with a date — invite individual users or groups, vote on restaurant candidates, and confirm a selection
- After a restaurant is confirmed, the organizer opens **order collection**: each person's last order at that restaurant is pre-filled; everyone confirms or changes their dishes; the organizer sees all orders to place the combined online order
- Dishes have an optional rating; order history is retained per person per restaurant

## Capabilities

### New Capabilities

- `food-catalog`: Global restaurant catalog — name and cuisine tags; shared across all users
- `food-list`: Per-user restaurant list tracking want-to-try, visited, and skip states
- `food-extras`: Per-user, per-restaurant always-order additions with a `to_share` flag
- `food-events`: Dining events with invite list, attendance RSVP, restaurant candidate voting, and host-confirmed selection; shares invite/RSVP/vote structure with the watch app
- `food-orders`: Per-event order collection — pre-filled from each user's last order at the confirmed restaurant; dishes with optional rating; organizer view of all orders

### Modified Capabilities

- `user-auth`: No requirement changes — dining events use the same session auth as all other routes

## Impact

- `src/db.ts` — new tables: `restaurants`, `restaurant_tags`, `user_restaurants`, `user_restaurant_extras`, `dining_events`, `dining_event_invites`, `dining_event_candidates`, `dining_event_votes`, `dining_event_selection`, `dining_orders`, `dining_order_items`
- `src/routes/food/` — new route files: `restaurants.ts`, `events.ts`, `orders.ts`, `preferences.ts`; registered under `/api/food/` in `app.ts`
- `src/repositories/sqlite/` — new: `restaurant.repository.ts`, `dining-event.repository.ts`, `dining-order.repository.ts`; interfaces added to `repositories/interfaces.ts`
- `client-food/src/` — new frontend: restaurant list, catalog, event list/detail, order collection view
- `vite.config.food.ts` — Vite config for `client-food` build (mirrors `client-time` pattern)
- `package.json` — add `build:food` script; include in `build`
- `ecosystem.config.cjs`, `Caddyfile` — add `food.branam.us` entry
- `tags` spec — cuisine tags use the same `tags` table introduced by the watch change; no requirement changes, shared infrastructure
