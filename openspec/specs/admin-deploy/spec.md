**App**: admin

## Purpose

Triggering a server deploy from the admin app via `POST /api/admin/deploy` (user 1 only), the unchanged GitHub auto-deploy webhook, and removal of the former manual trigger and the time-app deploy button.

## Requirements

### Requirement: Admin deploy endpoint
The system SHALL provide `POST /api/admin/deploy`, restricted to user 1, that triggers a server deploy (running the same deploy routine as the GitHub webhook) and responds with status `202`. The admin app SHALL surface this as a deploy control that indicates success when the trigger is accepted.

#### Scenario: Deploy triggered returns 202
- **WHEN** user 1 activates the deploy control in the admin app
- **THEN** `POST /api/admin/deploy` is called, the deploy routine starts, and the response status is `202`

#### Scenario: Deploy control shows success
- **WHEN** the deploy request returns `202`
- **THEN** the admin app shows a success indication to the user

#### Scenario: Non-admin cannot deploy
- **WHEN** an authenticated user whose id is not 1 calls `POST /api/admin/deploy`
- **THEN** the backend responds `403` and no deploy is started

### Requirement: GitHub deploy webhook unchanged
The existing GitHub auto-deploy webhook (`POST /api/deploy`, HMAC-SHA256 verified) SHALL continue to function unchanged.

#### Scenario: Webhook still deploys on push to main
- **WHEN** a valid GitHub webhook request with a correct signature and `ref` of `refs/heads/main` is received at `POST /api/deploy`
- **THEN** the deploy routine starts and the response status is `202`

### Requirement: Deploy page shows current server version
The admin Deploy page SHALL display the current server version information fetched from `GET /api/version` on page load. The displayed information SHALL include: short SHA, commit time (formatted in US/Eastern), and build time (formatted in US/Eastern).

#### Scenario: Version info shown on page load
- **WHEN** the admin Deploy page loads
- **THEN** the current server SHA, commit time, and build time are displayed

#### Scenario: Version info unavailable
- **WHEN** the admin Deploy page loads and `/api/version` returns `sha: "unknown"`
- **THEN** the page displays "unknown" for SHA and omits the timestamps

### Requirement: Deploy page polls for version change after trigger
After `POST /api/admin/deploy` returns `202`, the admin Deploy page SHALL begin polling `GET /api/version` every 5 seconds. Polling SHALL stop when the returned SHA differs from the SHA that was displayed before the deploy was triggered, at which point the page SHALL display the new SHA as a success confirmation. If the SHA has not changed after 3 minutes (36 polls), polling SHALL stop and display a warning that the deploy may still be in progress.

#### Scenario: Deploy confirmed when SHA changes
- **WHEN** a deploy is triggered and the server SHA changes from the pre-deploy value
- **THEN** polling stops and the new SHA is shown with a success confirmation

#### Scenario: Warning shown if SHA unchanged after timeout
- **WHEN** a deploy is triggered and 3 minutes elapse without the SHA changing
- **THEN** polling stops and a warning is shown that the deploy may still be running

#### Scenario: Polling does not start if pre-deploy SHA is unknown
- **WHEN** a deploy is triggered and the pre-deploy SHA was "unknown"
- **THEN** the page triggers the deploy but does not attempt polling (cannot detect change from unknown baseline)

### Requirement: Manual deploy trigger removed from the time app
The former manual deploy endpoint `POST /api/deploy/trigger` and the deploy button in the time app SHALL be removed. The time app SHALL no longer expose any deploy control or call any deploy endpoint.

#### Scenario: Old trigger endpoint is gone
- **WHEN** a client calls `POST /api/deploy/trigger`
- **THEN** the endpoint no longer exists (the route is not registered)

#### Scenario: Time app has no deploy button
- **WHEN** user 1 uses the time app
- **THEN** no deploy button is shown anywhere in the time app
