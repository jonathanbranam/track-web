## MODIFIED Requirements

### Requirement: Password stored as bcrypt hash with salt
The system SHALL provide `users:create` and `users:update-password` subcommands in the `admin` CLI to manage user accounts in the database. The subcommands SHALL bcrypt-hash the provided password before inserting or updating a record in `users`. Plaintext passwords SHALL never be stored or logged.

#### Scenario: Create user via CLI
- **WHEN** the developer runs `npm run admin -- users:create <email> <password> [--name "<display name>"]`
- **THEN** a new record is inserted into `users` with the bcrypt-hashed password

#### Scenario: Duplicate email rejected
- **WHEN** the developer runs `npm run admin -- users:create` with an email already present in `users`
- **THEN** the script exits with an error message and no record is inserted

#### Scenario: Update password via CLI
- **WHEN** the developer runs `npm run admin -- users:update-password <email> <password>`
- **THEN** the bcrypt hash for that user is updated in `users`

#### Scenario: Update password for unknown email rejected
- **WHEN** the developer runs `npm run admin -- users:update-password` with an email not in `users`
- **THEN** the script exits with an error message and no record is modified

#### Scenario: Startup succeeds with users in database
- **WHEN** the application starts and the `users` table contains at least one record
- **THEN** the process starts normally without any credential-related errors

#### Scenario: Startup rejects missing env vars
- **WHEN** the application starts without required env vars (e.g. `SESSION_SECRET`)
- **THEN** the process exits with a clear error message
