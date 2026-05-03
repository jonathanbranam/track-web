## Context

Currently, the monorepo contains a single Hono backend and one React frontend (time tracker) for a single user. We are expanding to:
- Three independent PWA apps (time tracker, movie coordinator, dinner picker, grocery list), each supporting multiple users
- All hosted on the same EC2 instance with an Elastic IP
- Shared user authentication and database
- Subdomains for app separation (app1.branam.us, app2.branam.us, etc.)

The backend, database, and deployment infrastructure are shared. Frontends are independent Vite builds but share a common UI library.

## Goals / Non-Goals

**Goals:**
- Enable rapid prototyping of new collaborative web apps on shared infrastructure
- Avoid duplicating backend code, user database, or deployment configuration
- Provide seamless SSO: users log in once and access all apps without re-authentication
- Keep each app's frontend isolated (separate builds, separate routes, separate repos/folders)
- Support multi-user scenarios (multiple people per app, groups/rooms if needed)

**Non-Goals:**
- Building a generic "app platform" framework (keep it simple for now)
- Complex permission or RBAC systems (start with everyone-sees-everything per app)
- App-to-app data sharing or cross-app queries (each app owns its data)
- Multi-tenancy or per-app backends (one backend serves all)

## Decisions

### 1. Folder Structure

```
track-web/
├── src/                        # Shared backend (Hono)
├── client-tracker/             # Time tracker frontend
├── client-movies/              # Movie coordinator frontend
├── client-dinners/             # Dinner picker frontend
├── packages/
│   ├── ui/                    # Shared React components, theme, styles
│   └── api/                   # Shared fetch client, API utilities
├── Caddyfile                  # Reverse proxy for all apps
├── ecosystem.config.cjs       # PM2 config (single backend process)
└── package.json               # Root: workspaces for all packages/apps
```

**Rationale**: Monorepo with `npm workspaces` keeps everything in one place for easy development and deployment, while keeping each app's dependencies isolated.

### 2. Database Schema

Multi-user structure: add `user_id` foreign key to all data tables. Collaborative apps also reference a `group_id`. Tables organized by app:

```sql
-- Shared
users (id, email, password_hash, created_at)

-- Groups (shareable across apps)
groups (id, name, created_by_user_id, created_at)
group_members (group_id, user_id, joined_at)

-- App: time tracker (single-user; no group_id)
time_entries (id, user_id, app_id, started_at, ended_at, description, tags)

-- App: movie coordinator (collaborative; scoped to a group)
movies (id, group_id, app_id, title, added_by_user_id, watched, watched_at, rating)

-- App: dinner picker (collaborative; scoped to a group)
dinners (id, group_id, app_id, suggestion, upvotes, suggested_by_user_id, date)
```

**Rationale**: 
- `app_id` column allows future schema consolidation if needed
- `user_id` enables per-user queries; `group_id` enables group-scoped queries
- Single-user apps (time tracker) omit `group_id`; collaborative apps (movies, dinners) own a group
- Groups are defined in shared tables so the same group can be reused across apps
- All stored in single SQLite file (simpler backup/restore)

**Alternative considered**: Generic key-value store (`app_id`, `user_id`, `entity_type`, `data` JSON). Rejected: too flexible, harder to query, no schema validation.

### 3. Backend Routing

Backend serves requests from all apps via app-specific route prefixes:

```
POST   /api/tracker/entries
GET    /api/tracker/entries
POST   /api/movies
GET    /api/movies/:id
POST   /api/dinners/suggest
etc.
```

Each route handler:
1. Validates session (middleware shared across all apps)
2. Extracts user_id from session
3. Queries/writes with `WHERE user_id = ?` and `WHERE app_id = ?`

**Rationale**: Clear separation, easy to debug, consistent with current Hono pattern. No need for dynamic routing or app registry.

**Alternative considered**: Single `/api/*` with app ID in request body/header. Rejected: explicit routes are clearer and align with REST conventions.

### 4. Authentication & Session Management

**Session cookie domain**: Set to `.branam.us` (wildcard) so all subdomains share the same session.

```javascript
// In session middleware
res.setHeader('Set-Cookie', `sessionId=...; Domain=.branam.us; Path=/; Secure; HttpOnly;`)
```

Flow:
1. User logs in at `app1.branam.us/login`
2. Backend sets session cookie with domain `.branam.us`
3. User visits `app2.branam.us`
4. Browser automatically sends same cookie
5. Middleware validates; user is authenticated

**Rationale**: No extra work needed; cookie domain is a single config change. All apps share auth context automatically.

**Alternative considered**: OAuth/OIDC server. Rejected: overkill for self-hosted single-user family apps; simple cookie-based auth is sufficient.

### 5. Frontend Builds & Assets

Each app builds independently to its own dist folder:

```bash
# Root package.json scripts
npm run build          # runs all client builds in parallel
npm run build:tracker  # builds client-tracker/ → client-tracker/dist
npm run build:movies   # builds client-movies/ → client-movies/dist
npm run build:dinners  # builds client-dinners/ → client-dinners/dist
```

Each client's `vite.config.ts`:
```javascript
{
  base: '/',  // serves at root of subdomain (app1.branam.us/)
  build: {
    outDir: 'dist',
  }
}
```

Caddy serves each from its dist folder based on subdomain.

**Rationale**: Simple, parallel builds, no cross-app interference, each app is a true SPA.

### 6. Caddy Reverse Proxy Configuration

```caddyfile
app1.branam.us {
  root /path/to/client-tracker/dist
  try_files {path} /index.html
  reverse_proxy /api/* localhost:3000
}

app2.branam.us {
  root /path/to/client-movies/dist
  try_files {path} /index.html
  reverse_proxy /api/* localhost:3000
}

app3.branam.us {
  root /path/to/client-dinners/dist
  try_files {path} /index.html
  reverse_proxy /api/* localhost:3000
}
```

**Rationale**: Each subdomain is self-contained; static files and API proxying are handled by Caddy. No app needs to know about others.

### 7. Shared UI Library

`packages/ui/` exports:
- Theme (colors, typography, spacing)
- Reusable components (NavBar, Button, Form, etc.)
- CSS/Tailwind config (if using)

Each client app imports:
```javascript
import { Button, NavBar } from '@repo/ui';
```

**Rationale**: Consistent UX across apps, reduces duplication, easy to maintain.

### 8. Deployment

One deployment process:
1. `npm run build` — builds backend + all client apps
2. PM2 restarts backend (single process)
3. Caddy reloads (picks up new client files)
4. All apps are live

No per-app deployment, no service discovery, no load balancing.

**Rationale**: Simplicity. All apps are deployed together; coordinating updates is not a concern for now.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **SQLite contention**: Multiple apps writing to same DB file simultaneously | Start with SQLite; if contention becomes an issue, migrate to PostgreSQL later (app code is unchanged, just connection string) |
| **Data isolation bugs**: Forgetting `user_id` or `app_id` in a query exposes data across users or apps | Code review + tests; consider helper functions that enforce filtering |
| **Shared session cookie**: One app's logout doesn't log out other apps | Expected behavior (user wants to stay logged in); can add explicit "logout all" if needed |
| **Shared backend failure**: One app's bad request crashes backend, affecting all | Standard error handling; deploy with PM2 auto-restart |
| **Caddy config complexity**: Many subdomains → large Caddyfile | Generate Caddyfile from template or config file if it grows; not a concern yet |
| **Frontend asset duplication**: Three independent Vite builds may share some deps | Monorepo + workspaces + shared `packages/ui` minimize duplication; acceptable trade-off for isolation |

## Decisions (continued)

### 9. Per-App Collaboration Model

Each app independently decides whether it is single-user or group-collaborative:

| App | Model | Notes |
|-----|-------|-------|
| Time tracker | Single-user | Personal productivity; no sharing |
| Movie coordinator | Group | Family/friends watch list |
| Dinner picker | Group | Household or group vote on meals |
| Grocery list | Group | Shared household list |

A **group** is a named set of users (e.g., "Branam Family"). Groups are defined in shared tables and can be reused across apps — the same family group can back both the movie list and the dinner picker without re-defining membership.

**Rationale**: Keeps each app simple (one clear data scope), avoids per-user vs. per-group query ambiguity within a single app, and lets group membership be managed in one place.

### 10. User Account Creation

All user accounts are created via CLI script (`npm run create-user`). There is no self-signup flow in any app. The existing honeypot login UI remains unchanged.

**Rationale**: These are private family/friends apps; controlled account creation is simpler and more secure than open registration.

## Open Questions (Resolved)

- **Groups/rooms**: Yes — some apps are group-collaborative. Groups are shared across apps. See Decision 9.
- **Self-signup**: No — accounts created via CLI. See Decision 10.
- **Backend log app_id**: Yes, add `app_id` to logging context.
