**App**: admin

## ADDED Requirements

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
