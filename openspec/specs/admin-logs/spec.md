**App**: admin

## Purpose

Viewing the server's output, error, and deploy logs from the admin app (user 1 only): list logs, read the most recent lines via an allowlist, and refresh manually or via an optional auto-refresh poll.

## Requirements

### Requirement: List available logs
The system SHALL provide `GET /api/admin/logs`, restricted to user 1, returning the set of viewable server logs — the output log, the error log, and the deploy log — each with its key and metadata (such as file size and last-modified time). The admin app SHALL present these as selectable logs.

#### Scenario: Logs enumerated
- **WHEN** user 1 opens the logs page
- **THEN** the output, error, and deploy logs are listed as selectable options

### Requirement: View the tail of a log
The system SHALL provide `GET /api/admin/logs/:name?lines=N`, restricted to user 1, returning the most recent `N` lines of the selected log (with a default and an enforced maximum). The `:name` SHALL be resolved through a fixed allowlist mapping `output → out.log`, `error → error.log`, and `deploy → deploy.log`, so no client-supplied filesystem path is ever used.

#### Scenario: Most recent lines returned
- **WHEN** user 1 selects the deploy log
- **THEN** the response contains the most recent lines of `logs/deploy.log`

#### Scenario: Line count bounded
- **WHEN** a request asks for more lines than the enforced maximum
- **THEN** the server returns at most the maximum number of lines

#### Scenario: Unknown log name rejected
- **WHEN** a request is made for a `:name` that is not in the allowlist (e.g. a path or unknown key)
- **THEN** the server rejects the request and reads no file

### Requirement: Refresh the log view
The log page SHALL provide a manual Refresh control that re-fetches the current tail of the selected log. The page SHALL additionally offer an optional auto-refresh toggle that, while enabled, re-fetches the tail on a fixed interval; auto-refresh SHALL be off by default.

#### Scenario: Manual refresh re-fetches
- **WHEN** user 1 activates the Refresh control
- **THEN** the page re-requests the selected log's tail and displays the updated content

#### Scenario: Auto-refresh polls while enabled
- **WHEN** user 1 enables the auto-refresh toggle
- **THEN** the page re-fetches the selected log's tail on a fixed interval until the toggle is disabled

#### Scenario: Auto-refresh off by default
- **WHEN** the logs page first loads
- **THEN** auto-refresh is disabled and the log updates only on manual refresh
