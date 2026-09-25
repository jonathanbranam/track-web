## REMOVED Requirements

### Requirement: Password stored as bcrypt hash with salt
**Reason**: Its "Startup rejects missing env vars" scenario used `SESSION_SECRET` as the example of a required variable. That variable is gone, and no auth variable is required any more. OpenSpec can't drop a scenario from a modified requirement, so this requirement is replaced by "Passwords stored as bcrypt hashes; no auth secrets in the environment".
**Migration**: The bcrypt and admin-CLI rules carry over unchanged into the replacement requirement. Remove `SESSION_SECRET` from any `.env` whenever convenient; it's ignored.

## ADDED Requirements

### Requirement: Passwords stored as bcrypt hashes; no auth secrets in the environment
The system SHALL store user passwords as bcrypt hashes. User accounts are managed via the admin CLI (`users:create`, `users:update-password` — see social-admin-cli). Plaintext passwords SHALL never be stored or logged. Authentication SHALL NOT depend on any secret supplied through environment variables: credentials live only in the `users` table and sessions only in the `sessions` table.

#### Scenario: Startup succeeds with users in database
- **WHEN** the application starts and the `users` table contains at least one record
- **THEN** the process starts normally without any credential-related errors

#### Scenario: Startup needs no auth-related environment variables
- **WHEN** the application starts with no `SESSION_SECRET` (or any other auth secret) in its environment
- **THEN** the process starts normally, and login and session validation work as usual
