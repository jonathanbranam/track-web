## Context

New users currently require the admin to create their account and communicate a password out-of-band. This change adds a single-use, time-limited invite link flow: admin generates a link, shares it, and the recipient self-activates. Self-admin (password and display name) is out of scope here — handled by the `me-app` change.

The invite claim UI lives on `me.branam.us` (already deploying) since it is account-activation behavior. The invite management UI lives on `admin.branam.us`.

## Goals / Non-Goals

**Goals:**
- Admin-generated invite links that let recipients self-activate accounts
- Copy-to-clipboard for invite URLs in the admin UI
- CLI parity with all invite operations
- Invite claim page on `me.branam.us`

**Non-Goals:**
- Self-admin (password/display name change) — owned by `me-app`
- Bulk invite generation
- Invite email delivery (sharing the link out-of-band is intentional)
- Invite resend (revoke and re-create instead)

## Decisions

### Token generation
Invite tokens are `crypto.randomBytes(32).toString('base64url')` — 43 URL-safe characters, cryptographically random, no guessable structure. Stored as plaintext (not hashed) because they are single-use, time-limited, and not a password equivalent. A compromised database exposes pending invites but not credentials.

*Alternative*: Hash tokens like password reset flows. Rejected — unnecessary complexity for a self-hosted single-admin system with direct DB access.

### Invite claim creates or updates the user account
The admin may have pre-created an account via CLI (with a temporary password) and then sent an invite to let the user set their own. The claim endpoint handles both cases: if the email exists, update the password; if not, create the account. Either way, `session_nonce` is not rotated on account creation (there are no prior sessions), but IS rotated on password update to invalidate any existing sessions.

### Invite claim page on `me.branam.us`
Account activation belongs with account management. Placing the claim page on `admin.branam.us` would require that app's auth guard to have a special public bypass — adding complexity. `me.branam.us` already has unauthenticated routes (login page) and is the natural home for identity flows.

*Alternative*: Standalone claim page on `admin.branam.us` with a public route exception. Rejected — `admin.branam.us` is an admin tool, not a user-facing surface.

### Duplicate pending invite policy
`POST /api/admin/invites` returns 409 if an unused, non-expired invite already exists for that email. This prevents accidental double-invites. The admin can revoke the existing invite and create a new one if needed.

### Copy-to-clipboard
Uses `navigator.clipboard.writeText()`. Admin app is served over HTTPS so the Clipboard API is available. No fallback needed (admin-only, controlled environment).

### `TABLE_NAMES` update in `src/db.ts`
The `invites` table must be added to `TABLE_NAMES` so it is included in database exports/backups.

## Risks / Trade-offs

- **Pending invite exposure**: If the database is compromised, pending (unused) invite tokens are readable. Mitigation: short default expiry (7 days); admin can revoke at any time.
- **Email not verified at invite time**: The admin enters the recipient's email — there's no verification that the email is reachable. Mitigation: out-of-band sharing means the link reaches the right person before activation.
- **`me.branam.us` dependency**: The claim page lives on `me.branam.us`, so `me-app` must be deployed first. Mitigation: `me-app` is confirmed to land before this change.

## Migration Plan

1. Add `invites` table migration to `src/db.ts` (inline, versioned)
2. Add `TABLE_NAMES` entry for `invites`
3. Add backend routes (`/api/admin/invites`, `/api/invites/:token`, `/api/invites/:token/claim`)
4. Add CLI commands (`invites:create`, `invites:list`, `invites:revoke`)
5. Add invite section to `client-admin` users page
6. Add `/invite/:token` public route to `client-me`
7. Deploy — no data migration needed (new table, no existing data)
