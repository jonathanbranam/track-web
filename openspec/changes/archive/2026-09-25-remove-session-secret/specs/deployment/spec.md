## REMOVED Requirements

### Requirement: Environment variable configuration
**Reason**: Its "Application exits on missing required vars" scenario describes fail-fast startup validation, which no longer exists: no variable is required. OpenSpec can't drop a scenario from a modified requirement, so this requirement is replaced by "Environment configuration with no required variables".
**Migration**: The `.env` loading and `.env.example` rules carry over into the replacement requirement. Remove `EMAIL`, `PASSWORD_HASH` and `SESSION_SECRET` from any `.env` whenever convenient; they're ignored.

## ADDED Requirements

### Requirement: Environment configuration with no required variables
The system SHALL load configuration from a `.env` file when one is present. A `.env.example` SHALL be committed to the repository listing every environment variable the server reads, with placeholder values and optional variables marked as optional. No environment variable SHALL be required: every variable SHALL have a default or be optional, so the server starts without a `.env` file. Variables the server no longer reads SHALL be removed from `.env.example`.

#### Scenario: Env vars documented
- **WHEN** a developer clones the repo
- **THEN** `.env.example` lists `PORT`, `SQLITE_PATH`, `DEPLOY_SECRET`, `TMDB_API_KEY`, and `TMDB_PERSON_SORT`, marking the optional ones
- **AND** it does not list `EMAIL`, `PASSWORD_HASH`, or `SESSION_SECRET`

#### Scenario: Server starts with no variables set
- **WHEN** the application starts with no `.env` file and none of these variables set
- **THEN** the process starts normally, listening on port 3000 with the database at `data.db`

#### Scenario: Unused variables are ignored
- **WHEN** an existing `.env` still sets a variable the server no longer reads (e.g. `SESSION_SECRET`)
- **THEN** the process starts normally and ignores it

#### Scenario: Optional features degrade without their variables
- **WHEN** the application starts without `DEPLOY_SECRET` or `TMDB_API_KEY`
- **THEN** the process starts normally; the deploy webhook and TMDB endpoints respond 503 while the rest of the app works
