## Purpose

Describes how the app is packaged, served, and managed in production: a single Node.js process behind a Caddy reverse proxy on EC2, managed by pm2, deployed via a shell script.

## Requirements

### Requirement: Single Node process serves all apps
The system SHALL run as a single Node.js process where Hono handles all /api/* routes. Caddy serves each client app's compiled assets from its own dist/ directory (see multi-app-hosting for routing details). API routes SHALL always take precedence over static file serving.

#### Scenario: API routes take precedence over static assets
- **WHEN** a request is made to any `/api/*` path
- **THEN** the API handler responds, not the static file middleware

### Requirement: pm2 process management
The system SHALL use pm2 to manage the Node process in production, providing auto-restart on crash and startup on system reboot.

#### Scenario: Process restarts on crash
- **WHEN** the Node process exits unexpectedly
- **THEN** pm2 restarts it automatically

#### Scenario: Process starts on EC2 reboot
- **WHEN** the EC2 instance reboots
- **THEN** pm2 starts the application automatically via the pm2 startup hook

### Requirement: Caddy reverse proxy with automatic HTTPS
The system SHALL use Caddy as a reverse proxy in front of the Node process. Caddy SHALL automatically provision and renew a Let's Encrypt TLS certificate for the DuckDNS subdomain.

#### Scenario: HTTPS certificate auto-provisioned
- **WHEN** Caddy starts for the first time with a valid DuckDNS domain pointing to the EC2 IP
- **THEN** Caddy obtains a Let's Encrypt certificate without manual intervention

#### Scenario: Certificate auto-renewed
- **WHEN** the TLS certificate approaches expiry
- **THEN** Caddy renews it automatically without service interruption

#### Scenario: HTTP traffic redirected to HTTPS
- **WHEN** a request arrives on port 80
- **THEN** Caddy issues a 301 redirect to the HTTPS equivalent

### Requirement: deploy.sh script for SSH-based deployment
The system SHALL include a deploy.sh script that deploys the application to EC2 via SSH in a single command.

#### Scenario: Full deploy via script
- **WHEN** the developer runs ./deploy.sh from their local machine
- **THEN** the script: SSHs to EC2, pulls latest code from git, runs npm install, runs npm run build, and restarts the pm2 process

#### Scenario: Script requires EC2_HOST configured
- **WHEN** EC2_HOST is not set in the environment or deploy config
- **THEN** the script exits with a clear error before attempting SSH

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
