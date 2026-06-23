## Why

New users must currently have their accounts created by the admin (user 1) via CLI or admin UI, with no way to set their own credentials — admin must choose and communicate a password out-of-band. Invite links close this gap by letting the invited person activate their own account, and self-admin pages let non-admin users maintain their own credentials and display name without bothering the admin.

## What Changes

- Admin (user 1) can generate a single-use, time-limited invite link tied to a specific email via admin UI or CLI
- The invite recipient visits the link and sets their own password (and optionally display name) to activate the account
- Non-admin users can log in to `admin.branam.us` and access a self-admin page to change their password or update their display name
- The `admin.branam.us` access guard is relaxed: non-admin authenticated users are routed to self-admin rather than "Access Denied"

## Capabilities

### New Capabilities

- `user-invites`: Admin-only invite link generation (UI + CLI) and the public token-claim flow that lets the invite recipient set their own password and activate their account
- `user-self-admin`: Self-admin UI on `admin.branam.us` for non-admin users — change own password and update own display name

### Modified Capabilities

- `admin-app-shell`: Non-admin authenticated users must be routed to self-admin pages instead of the "Access Denied" view; only admin-exclusive routes remain restricted to user 1
- `admin-users`: Invite link creation UI added to user management (alongside existing create/list/delete/change-password controls)

## Impact

- **Backend**: New routes — `POST /api/admin/invites` (admin-only), `GET /api/invites/:token` (public, validates token), `POST /api/invites/:token/claim` (public, activates account); new `PUT /api/users/me/password` and `PUT /api/users/me/display-name` endpoints (any authenticated user); new `invites` table in SQLite (token, email, expires_at, used_at)
- **Admin CLI**: New `invites:create <email> [--expires-in <duration>]` command
- **`client-admin`**: Routing updated to send non-admin users to `/self-admin` instead of `/access-denied`; new self-admin page component; invite creation UI added to users page
- **`user-auth` spec**: `session_nonce` rotation requirement applies when user changes their own password via self-admin (same invariant as admin password change)
- **No new DNS or Caddy changes needed** — `admin.branam.us` already exists
