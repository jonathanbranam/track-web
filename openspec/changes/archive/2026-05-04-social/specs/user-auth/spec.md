## MODIFIED Requirements

### Requirement: Password stored as bcrypt hash with salt
The system SHALL provide a `create-user` CLI script to add user accounts to the database. The script SHALL bcrypt-hash the provided password before inserting a record into `users`. An optional `--name` flag SHALL set the user's `display_name`. Plaintext passwords SHALL never be stored or logged.

#### Scenario: Create user via CLI
- **WHEN** the developer runs `npm run create-user -- <email> <password>`
- **THEN** a new record is inserted into `users` with the bcrypt-hashed password and `display_name` set to null

#### Scenario: Create user with display name
- **WHEN** the developer runs `npm run create-user -- <email> <password> --name "<display name>"`
- **THEN** a new record is inserted into `users` with the bcrypt-hashed password and `display_name` set to the provided value

#### Scenario: Duplicate email rejected
- **WHEN** the developer runs `npm run create-user` with an email already present in `users`
- **THEN** the script exits with an error message and no record is inserted

#### Scenario: Update password via CLI
- **WHEN** the developer runs `npm run create-user -- --update <email> <password>`
- **THEN** the bcrypt hash for that user is updated in `users`

#### Scenario: Update password for unknown email rejected
- **WHEN** the developer runs `npm run create-user -- --update` with an email not in `users`
- **THEN** the script exits with an error message and no record is modified

#### Scenario: Startup succeeds with users in database
- **WHEN** the application starts and the `users` table contains at least one record
- **THEN** the process starts normally without any credential-related errors

#### Scenario: Startup rejects missing env vars
- **WHEN** the application starts without required env vars (e.g. `SESSION_SECRET`)
- **THEN** the process exits with a clear error message

## ADDED Requirements

### Requirement: Auth me response includes display name
`GET /api/auth/me` SHALL include `displayName` in its response alongside `userId`. If `display_name` is null in the database, the response SHALL return the username portion of the user's email (text before the `@`).

#### Scenario: Me returns displayName when set
- **WHEN** `GET /api/auth/me` is called with a valid session and the user has a non-null `display_name`
- **THEN** the response includes `{ userId, displayName }` where `displayName` matches `users.display_name`

#### Scenario: Me returns email prefix as fallback
- **WHEN** `GET /api/auth/me` is called with a valid session and the user's `display_name` is null
- **THEN** the response includes `{ userId, displayName }` where `displayName` is the portion of `email` before the `@`
