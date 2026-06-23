**App**: admin

## ADDED Requirements

### Requirement: Invite link generation UI
The admin users page SHALL include a section to generate invite links. The admin SHALL be able to enter an email address and optionally a duration, submit to generate an invite, and then copy the resulting URL to the clipboard via a "Copy link" button. Generated invites SHALL be listed below the form with their email, expiry, used status, and a revoke control for unused invites.

#### Scenario: Invite generated and URL displayed
- **WHEN** user 1 submits an email in the invite form
- **THEN** the invite URL is displayed alongside a "Copy link" button

#### Scenario: Copy link button copies URL to clipboard
- **WHEN** user 1 clicks "Copy link"
- **THEN** the full invite URL is written to the clipboard

#### Scenario: Pending invites listed
- **WHEN** user 1 views the invite section
- **THEN** all existing invites are listed with email, expiry, and used/unused status

#### Scenario: Unused invite revoked from UI
- **WHEN** user 1 clicks revoke on an unused invite
- **THEN** the invite is deleted and removed from the list
