**App**: admin

## Purpose

Viewing the server's output, error, deploy, and scheduled-backup logs from the admin app (user 1 only): list logs, read the most recent lines via an allowlist, and refresh manually or via an optional auto-refresh poll.

## Requirements

### Requirement: List available logs
The system SHALL provide `GET /api/admin/logs`, restricted to user 1, returning the set of viewable server logs — the output log, the error log, the deploy log, and the scheduled-backup (export-push) log — each with its key and metadata (such as file size and last-modified time). The admin app SHALL present these as selectable logs.

#### Scenario: Logs enumerated
- **WHEN** user 1 opens the logs page
- **THEN** the output, error, deploy, and backup logs are listed as selectable options

#### Scenario: Backup log enumerated
- **WHEN** user 1 opens the logs page
- **THEN** the scheduled-backup log is offered under the `backup` key with its size and last-modified metadata

### Requirement: View the tail of a log
The system SHALL provide `GET /api/admin/logs/:name?lines=N`, restricted to user 1, returning the most recent `N` lines of the selected log (with a default and an enforced maximum). The `:name` SHALL be resolved through a fixed allowlist mapping `output → out.log`, `error → error.log`, `deploy → deploy.log`, and `backup → export-push.log`, so no client-supplied filesystem path is ever used.

#### Scenario: Most recent lines returned
- **WHEN** user 1 selects the deploy log
- **THEN** the response contains the most recent lines of `logs/deploy.log`

#### Scenario: Backup log tail returned
- **WHEN** user 1 selects the backup log
- **THEN** the response contains the most recent lines of `logs/export-push.log`

#### Scenario: Missing backup log returns empty
- **WHEN** user 1 selects the backup log and `logs/export-push.log` does not exist
- **THEN** the server returns an empty log body rather than an error

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
