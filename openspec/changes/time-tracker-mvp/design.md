## Context

New project from scratch. Replaces a previous React Native app for personal time tracking. Single user, single EC2 instance. The core constraint is low operational overhead: one process, one file for data, one command to deploy.

## Goals / Non-Goals

**Goals:**
- Single Node.js process serves API and frontend; no separate processes to manage
- Abstracted persistence layer so storage can be swapped without touching business logic
- HTTPS on a DuckDNS subdomain via Caddy + Let's Encrypt (required for PWA)
- iOS-installable PWA
- Rate-limited auth endpoints to protect against brute force and bots
- Fast task-switching UX as the primary design constraint

**Non-Goals:**
- Multi-user support (MVP is single user only)
- Offline mode / service worker data sync (installable PWA only, not offline-capable)
- Editing past entries (deferred to a future tab/UI)
- Reporting, summaries, or data export
- Android support

## Decisions

### 1. Single Node process (Hono serves static files + API)

**Decision**: Hono serves the compiled React build from `dist/` alongside `/api/*` routes. No separate nginx/reverse proxy for the app itself.

**Rationale**: For a single-user personal tool, the operational simplicity of one process beats the minimal performance benefit of a dedicated static file server. Caddy handles HTTPS termination and proxies everything to the Node process.

**Alternative considered**: Express serving static files — Hono is lighter, TypeScript-native, and has comparable static file middleware.

### 2. Repository pattern for persistence

**Decision**: Define `IEntryRepository` and `IUserRepository` interfaces. `SqliteEntryRepository` and `SqliteUserRepository` implement them using better-sqlite3. All business logic and route handlers depend only on the interfaces.

**Rationale**: The user explicitly wants to swap storage backends in the future. Abstracting now costs little and avoids a painful refactor later.

```
src/
  repositories/
    interfaces.ts         IEntryRepository, IUserRepository
    sqlite/
      entry.repository.ts
      user.repository.ts
  routes/
    auth.ts               uses IUserRepository
    entries.ts            uses IEntryRepository
```

### 3. Session-based auth with single hard-coded user

**Decision**: Use a signed session cookie (via `hono-sessions` or equivalent). On startup, seed a `users` table from `.env` (EMAIL + PASSWORD_HASH). bcrypt with salt rounds ≥ 12.

**Rationale**: Simpler than JWT for a browser-based app. Session cookie works naturally with PWA. No user management UI needed.

**Password hash setup**: A one-time CLI script (`npm run hash-password`) takes a plaintext password, outputs the bcrypt hash to copy into `.env`. Never store plaintext.

### 4. Continuous timeline invariant enforced at both layers

**Decision**: Both UI and API enforce: no new entry may start before the `ended_at` of the most recent entry.

**Rationale**: Double enforcement prevents corrupt data from direct API calls or race conditions. The UI prevents it from ever being attempted; the API rejects it as a safety net.

**Business rules enforced server-side:**
- Only one `ended_at IS NULL` entry allowed at a time
- `started_at` of new entry >= `ended_at` of previous entry
- `ended_at` cannot be before `started_at`

### 5. Day boundary at 4am US/Eastern

**Decision**: A "day" spans from 4:00am Eastern to 3:59am Eastern the following calendar day. All date filtering converts the requested calendar date to UTC bounds accounting for Eastern offset (EST = UTC-5, EDT = UTC-4).

**Rationale**: User is never awake at 4am, making it a clean boundary that avoids splitting any real work session across two days.

**Implementation**: Use `date-fns-tz` with `America/New_York` for all timezone conversions. Store all timestamps in UTC in SQLite.

### 6. Tags stored as comma-separated text

**Decision**: Parse `#hashtags` from description at write time, store as `"tag1,tag2"` in a `tags` TEXT column. No separate tags table.

**Rationale**: Tags are a display/filter convenience, not a relational entity. For MVP, denormalized storage is sufficient. Future filtering can use `LIKE '%tag%'` or a simple split.

### 7. Caddy for HTTPS

**Decision**: Caddy sits in front of the Node process. `Caddyfile` configures the DuckDNS domain with automatic Let's Encrypt cert provisioning.

**Rationale**: Caddy's automatic HTTPS is the simplest path to production TLS. Zero cert management. DuckDNS provides the domain; Caddy handles the cert.

```
Caddyfile:
  myapp.duckdns.org {
      reverse_proxy localhost:3000
  }
```

### 8. Rate limiting on auth endpoints

**Decision**: In-memory rate limiter (e.g., `hono-rate-limiter` or custom Map-based) on `/api/auth/login`: 5 attempts per IP per 15 minutes → 429 response.

**Rationale**: Protects against brute force and bots. In-memory is sufficient for a single-process single-user app; no Redis needed.

## Risks / Trade-offs

- **SQLite on EC2 root volume** → Data lost if instance is terminated. Accepted by user; no mitigation needed for MVP.
- **In-memory rate limiter** → Resets on process restart. Acceptable for MVP; a determined attacker could restart-bypass, but this is a personal tool.
- **Single process, no clustering** → If the Node process crashes between a stop and start action, a gap could appear in the timeline. pm2 auto-restart mitigates downtime. Short window of vulnerability accepted.
- **iOS PWA limitations** → iOS Safari does not support push notifications or background sync in PWAs. This is acceptable; the app is interaction-driven, not notification-driven.
- **DuckDNS + Let's Encrypt** → If the DuckDNS domain lapses or EC2 IP changes, the cert will fail to renew. User must keep DuckDNS A record pointing to the current EC2 IP.

## Migration Plan

1. Provision DuckDNS subdomain pointing to EC2 IP
2. SSH to EC2, install Node 20+, pm2, Caddy
3. Clone repo, `npm install`, `npm run build`
4. Create `.env` from `.env.example`, run `npm run hash-password` to generate PASSWORD_HASH
5. Start app with `pm2 start ecosystem.config.js`
6. Start Caddy with `caddy start` — cert auto-provisions on first request
7. Run `./deploy.sh` for all future deploys

**Rollback**: `pm2 stop app` + revert git commit + `pm2 start`

## Open Questions

- None blocking MVP. Post-MVP: evaluate Turso (SQLite over HTTP) or PocketBase as alternate repository backends.
