## Shared App — Planned Future Work

- **Admin app.** Create a dedicated admin application for admin-only functionality: deploy button and deploy log (currently in the time UI), and other administrative tasks. Removes admin concerns from end-user interfaces.

- **Per-app styling.** Support per-app theming and styling more thoroughly so each app can have a distinct visual identity within the shared design system.

- **Drop `users.session_nonce` column (deferred from `session-table-auth`).** Web auth moved to a server-side `sessions` table; the `session_nonce` column is no longer read or written but was intentionally left in place for one stable release so a rollback to the prior binary stays safe. Once the sessions-table code has proven out, add a migration to `ALTER TABLE users DROP COLUMN session_nonce` (SQLite ≥3.35, available via better-sqlite3) and remove any remaining `sessionNonce` references. There is no remaining `sessionNonce` field on the `User` type — only the dormant DB column.
