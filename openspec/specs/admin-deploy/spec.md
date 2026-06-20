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

### Requirement: Manual deploy trigger removed from the time app
The former manual deploy endpoint `POST /api/deploy/trigger` and the deploy button in the time app SHALL be removed. The time app SHALL no longer expose any deploy control or call any deploy endpoint.

#### Scenario: Old trigger endpoint is gone
- **WHEN** a client calls `POST /api/deploy/trigger`
- **THEN** the endpoint no longer exists (the route is not registered)

#### Scenario: Time app has no deploy button
- **WHEN** user 1 uses the time app
- **THEN** no deploy button is shown anywhere in the time app
