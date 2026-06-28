**App**: all

## MODIFIED Requirements

### Requirement: Auth me response includes user identity
`GET /api/auth/me` SHALL include `userId`, `displayName`, and `email` in its response. If `display_name` is null in the database, `displayName` SHALL be the username portion of the user's email (text before the `@`). The `email` field SHALL always be the user's email address as stored in the `users` table.

#### Scenario: Me returns displayName when set
- **WHEN** `GET /api/auth/me` is called with a valid session and the user has a non-null `display_name`
- **THEN** the response includes `{ userId, displayName, email }` where `displayName` matches `users.display_name` and `email` matches `users.email`

#### Scenario: Me returns email prefix as displayName fallback
- **WHEN** `GET /api/auth/me` is called with a valid session and the user's `display_name` is null
- **THEN** the response includes `{ userId, displayName, email }` where `displayName` is the portion of `email` before the `@` and `email` is the full address
