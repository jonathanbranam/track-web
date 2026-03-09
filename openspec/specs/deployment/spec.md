## ADDED Requirements

### Requirement: Single Node process serves API and frontend
The system SHALL run as a single Node.js process where Hono handles both /api/* routes and serves the compiled React frontend from the dist/ directory.

#### Scenario: Frontend assets served from root
- **WHEN** a GET request is made to / or any non-API path
- **THEN** the server returns the compiled index.html or the matching static asset from dist/

#### Scenario: API routes take precedence
- **WHEN** a GET request is made to /api/entries
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

### Requirement: Environment variable configuration
The system SHALL load all secrets and configuration from a .env file. A .env.example SHALL be committed to the repository with all required keys and placeholder values.

#### Scenario: Required env vars documented
- **WHEN** a developer clones the repo
- **THEN** .env.example lists: EMAIL, PASSWORD_HASH, SESSION_SECRET, PORT, and SQLITE_PATH

#### Scenario: Application exits on missing required vars
- **WHEN** the application starts and a required env var is missing
- **THEN** the process exits immediately with a message identifying the missing variable
