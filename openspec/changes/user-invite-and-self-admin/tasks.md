## 1. Database

- [ ] 1.1 Add `invites` table migration to `src/db.ts` (columns: `id`, `token`, `email`, `expires_at`, `used_at`, `created_by`)
- [ ] 1.2 Add `invites` to `TABLE_NAMES` in `src/db.ts`

## 2. Backend — Invite Routes

- [ ] 2.1 Add `POST /api/admin/invites` (admin-only): validate body, generate `crypto.randomBytes(32).toString('base64url')` token, insert row, return `{ url, token, expiresAt }` with the full `https://me.branam.us/invite/:token` URL
- [ ] 2.2 Add `GET /api/admin/invites` (admin-only): return all invites ordered by created_at DESC
- [ ] 2.3 Add `DELETE /api/admin/invites/:id` (admin-only): reject with 409 if already used, otherwise delete
- [ ] 2.4 Add `GET /api/invites/:token` (public): return `{ email, expiresAt }` for valid unused non-expired token; 404 otherwise
- [ ] 2.5 Add `POST /api/invites/:token/claim` (public): validate token, bcrypt-hash password, create or update user account, set `used_at`, rotate `session_nonce` on password update, return session cookie
- [ ] 2.6 Register all invite routes in `src/app.ts`
- [ ] 2.7 Update `openapi.yaml` with all five new invite endpoints

## 3. Admin CLI

- [ ] 3.1 Add `invites:create <email> [--expires-in <duration>]` command — prints URL and expiry
- [ ] 3.2 Add `invites:list [--json]` command — lists all invites with status
- [ ] 3.3 Add `invites:revoke <id>` command — revokes unused invite, errors on used
- [ ] 3.4 Update `README.md` with the three new CLI commands

## 4. Admin UI — Invite Section

- [ ] 4.1 Add an invite section to the admin users page (`UsersPage.tsx`) with a form (email input, optional expiry), submit button, and result display
- [ ] 4.2 On successful generation, display the invite URL with a "Copy link" button that calls `navigator.clipboard.writeText(url)`
- [ ] 4.3 Load and display existing invites below the form (email, expiry, used/unused badge, revoke button for unused)
- [ ] 4.4 Wire revoke button to `DELETE /api/admin/invites/:id` and refresh the list on success

## 5. Me App — Invite Claim Page

- [ ] 5.1 Add public route `/invite/:token` to `client-me/src/App.tsx` (outside `AuthGuard`)
- [ ] 5.2 Create `InviteClaimPage.tsx`: on mount call `GET /api/invites/:token`; display email on success or error message on 404
- [ ] 5.3 Render password + optional display name form; on submit call `POST /api/invites/:token/claim`; on success redirect to `/`

## 6. Build Verification

- [ ] 6.1 Run `npm run build:admin` — confirm zero TypeScript errors
- [ ] 6.2 Run `npm run build:me` (or equivalent) — confirm zero TypeScript errors
- [ ] 6.3 Run `npm run build` — confirm all apps and server build cleanly

## 7. Context Updates

- [ ] 7.1 Update `llm-context.md` to document the invite endpoints and flow under auth/user management
