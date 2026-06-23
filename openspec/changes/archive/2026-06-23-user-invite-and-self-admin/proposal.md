## Why

New users must currently have their accounts created by the admin (user 1) via CLI or admin UI, with no way to set their own credentials — admin must choose and communicate a password out-of-band. Invite links close this gap by letting the invited person activate their own account, and self-admin pages let non-admin users maintain their own credentials and display name without bothering the admin.

## What Changes

- Admin (user 1) can generate a single-use, time-limited invite link tied to a specific email via admin UI or CLI
- The invite recipient visits the link and sets their own password (and optionally display name) to activate the account
- Non-admin users manage their own credentials and display name at `me.branam.us` (handled by the `me-app` change)

## Capabilities

### New Capabilities

- `user-invites`: Admin-only invite link generation (UI + CLI) with a copy-to-clipboard button to share the link, and the public token-claim flow that lets the invite recipient set their own password and activate their account

### Modified Capabilities

- `admin-users`: Invite link creation UI added to user management (alongside existing create/list/delete/change-password controls)

## Impact

- **Backend**: New routes — `POST /api/admin/invites` (admin-only), `GET /api/invites/:token` (public, validates token), `POST /api/invites/:token/claim` (public, activates account); new `invites` table in SQLite (token, email, expires_at, used_at)
- **Admin CLI**: New `invites:create <email> [--expires-in <duration>]` command
- **`client-admin`**: Invite creation UI added to users page
- **Self-admin (password, display name)**: Handled by `me-app` at `me.branam.us` — not part of this change
- **No new DNS or Caddy changes needed** — `admin.branam.us` already exists
