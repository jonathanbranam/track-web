## Why

The current application is a single-user time tracker. We want to rapidly expand to multiple independent PWA applications hosted on the same server—a movie-watching coordinator, a dinner-picker, a shared grocery list, and others—each supporting multiple users while sharing the same backend infrastructure, user database, and deployment pipeline. This allows rapid prototyping of new collaborative tools without duplicating infrastructure.

## What Changes

- **Monorepo structure**: Add separate client applications (`client-tracker`, `client-movies`, `client-dinners`, etc.) alongside the existing backend
- **Multi-user support**: Expand authentication and data storage from single-user to multi-user (with user_id foreign keys on all entries)
- **Subdomain routing**: Each app is served at a distinct subdomain (app1.branam.us, app2.branam.us, etc.) via Caddy reverse proxy
- **Single sign-on**: Users authenticate once and can access all apps without re-logging in (shared session cookies across all subdomains)
- **Shared backend**: One Hono backend serves API requests from all apps, with app-specific route prefixes
- **Shared database**: One SQLite database with app-specific tables or columns to separate data by application
- **Build pipeline**: Update npm scripts to build all frontend apps in parallel; update PM2 config and Caddyfile to handle routing

## Capabilities

### New Capabilities
- `multi-app-hosting`: Infrastructure for running multiple PWA frontends on the same server using subdomain routing, with Caddy configuration and build pipeline updates
- `shared-sso`: Single sign-on mechanism allowing users to log in once and access all apps without re-authentication (session cookies with wildcard domain)

### Modified Capabilities
- `user-auth`: Expand from single-user to multi-user authentication; add support for multi-app session sharing; session storage and validation must work across subdomains

## Impact

- **Frontend**: Multiple independent Vite/React builds; shared component library and styling
- **Backend**: New route structure (`/api/app1/*`, `/api/app2/*`, etc.); multi-user queries with user_id filtering; session cookie domain configuration
- **Database**: Multi-user schema (user_id foreign keys); app-specific tables or an app_id column
- **Infrastructure**: Caddyfile updated for subdomain routing; build scripts updated to build all apps; PM2 config simplified (still one backend process)
- **Deployment**: Elastic IP and Squarespace DNS already configured to route all subdomains to the same server
