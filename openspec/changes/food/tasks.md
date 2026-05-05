## 1. Database Migrations

- [ ] 1.1 Add `restaurants` table and `idx_restaurants_name` index to `src/db.ts`
- [ ] 1.2 Add `restaurant_tags` join table to `src/db.ts`
- [ ] 1.3 Add `user_restaurants` table to `src/db.ts`
- [ ] 1.4 Add `user_restaurant_extras` table to `src/db.ts`
- [ ] 1.5 Add `dining_events` table to `src/db.ts`
- [ ] 1.6 Add `dining_event_invites` table to `src/db.ts`
- [ ] 1.7 Add `dining_event_candidates` table (with `UNIQUE (event_id, restaurant_id)`) to `src/db.ts`
- [ ] 1.8 Add `dining_event_votes` table to `src/db.ts`
- [ ] 1.9 Add `dining_event_selection` table to `src/db.ts`
- [ ] 1.10 Add `dining_orders` table to `src/db.ts`
- [ ] 1.11 Add `dining_order_items` table to `src/db.ts`
- [ ] 1.12 Add `user_preferences` table for cuisine preference tags to `src/db.ts`

## 2. Repository

- [ ] 2.1 Define `RestaurantRepository` interface in `src/repositories/interfaces.ts` (catalog CRUD, user list, extras)
- [ ] 2.2 Define `DiningEventRepository` interface in `src/repositories/interfaces.ts` (event CRUD, invites, candidates, votes, selection)
- [ ] 2.3 Define `DiningOrderRepository` interface in `src/repositories/interfaces.ts` (order creation, pre-fill lookup, item management)
- [ ] 2.4 Implement `RestaurantRepository` in `src/repositories/sqlite/restaurant.repository.ts`
- [ ] 2.5 Implement `DiningEventRepository` in `src/repositories/sqlite/dining-event.repository.ts`; group invite expansion calls `SocialRepository.getConnectableUsers` to validate individual user invites
- [ ] 2.6 Implement `DiningOrderRepository` in `src/repositories/sqlite/dining-order.repository.ts`; "last order" pre-fill joins across events to find the previous confirmed order at the same restaurant

## 3. API Routes

- [ ] 3.1 Create `src/routes/food/restaurants.ts` and register under `/api/food/` in `src/app.ts`
- [ ] 3.2 Implement `GET /api/food/restaurants`, `POST /api/food/restaurants`, `GET /api/food/restaurants/:id`, `PUT /api/food/restaurants/:id`
- [ ] 3.3 Implement `GET /api/food/restaurants/list`, `PUT /api/food/restaurants/list/:restaurantId`, `DELETE /api/food/restaurants/list/:restaurantId`
- [ ] 3.4 Implement `GET /api/food/restaurants/:restaurantId/extras`, `POST`, `PUT .../extras/:id`, `DELETE .../extras/:id`
- [ ] 3.5 Create `src/routes/food/events.ts`
- [ ] 3.6 Implement `GET /api/food/events`, `POST /api/food/events` (with group/user invite expansion — individual userId entries validated against `user_connections`), `GET /api/food/events/:id`
- [ ] 3.7 Implement `PUT /api/food/events/:id/attendance`, `POST /api/food/events/:id/candidates`, `POST .../candidates/:candidateId/vote`, `PUT /api/food/events/:id/selection`
- [ ] 3.8 Create `src/routes/food/orders.ts`
- [ ] 3.9 Implement `GET /api/food/events/:id/orders`, `GET /api/food/events/:id/orders/me` (pre-fill from last order at same restaurant), `PUT .../orders/me`, `PUT .../orders/:userId`, `POST .../orders/me/confirm`
- [ ] 3.10 Create `src/routes/food/preferences.ts`; implement `GET /api/food/preferences` and `PUT /api/food/preferences`

## 4. Vite Config and Build

- [ ] 4.1 Create `vite.config.food.ts` (mirrors `client-time` pattern, serves `client-food/`)
- [ ] 4.2 Add `"build:food": "vite build --config vite.config.food.ts"` to `package.json` scripts; include in `build`

## 5. Frontend

- [ ] 5.1 Scaffold `client-food/` directory with `index.html`, `src/App.tsx`, `src/main.tsx`, `package.json` (add `@repo/ui` and `@repo/auth` dependencies)
- [ ] 5.2 Set up React Router v7 with `AuthGuard` in `App.tsx`; add routes for all pages
- [ ] 5.3 Implement `RestaurantListPage` (`/restaurants`) — Want to Try / Visited tabs; skip hidden by default
- [ ] 5.4 Implement `RestaurantCatalogPage` (`/restaurants/catalog`) — all restaurants with search and tag filter; add restaurant form
- [ ] 5.5 Implement `ExtrasPage` (`/restaurants/:id/extras`) — manage always-order extras with `to_share` toggle
- [ ] 5.6 Implement `EventListPage` (`/events`) — dining events the user created or was invited to
- [ ] 5.7 Implement `EventNewPage` (`/events/new`) — create event form with date, invite users/groups via `ConnectableUserPicker` from `@repo/ui`
- [ ] 5.8 Implement `EventDetailPage` (`/events/:id`) — four progressive phases: voting, confirmed, order collection, all confirmed
- [ ] 5.9 Implement `PreferencesPage` (`/preferences`) — cuisine preference tag selection

## 6. People Tab Integration (deferred from social change)

- [ ] 6.1 Add `@repo/ui` dependency to `client-food/package.json`
- [ ] 6.2 Add `/people` route to `App.tsx` (auth-gated)
- [ ] 6.3 Create `client-food/src/pages/PeoplePage.tsx` rendering `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, `RedeemInviteCode` from `@repo/ui` in tabbed layout
- [ ] 6.4 Add **People** entry to food `NavBar`
- [ ] 6.5 Use `ConnectableUserPicker` from `@repo/ui` in `EventNewPage` invite flow

## 7. Deployment

- [ ] 7.1 Add `client-food` entry to `ecosystem.config.cjs` (PM2 static serve or path registration)
- [ ] 7.2 Add `food.branam.us` virtual host to `Caddyfile` with reverse proxy and SPA fallback

## 8. Tests

- [ ] 8.1 Add repository unit tests for `DiningEventRepository` group invite expansion (connected vs. unconnected user)
- [ ] 8.2 Add API integration tests for restaurant CRUD and user list state transitions
- [ ] 8.3 Add API integration tests for dining event lifecycle (create, RSVP, nominate candidate, vote, select)
- [ ] 8.4 Add API integration tests for order pre-fill (first visit returns empty; subsequent visit pre-fills from last order)
- [ ] 8.5 Add API integration test for group invite expansion (groupId expands to member rows at creation time)
