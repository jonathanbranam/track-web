**App**: me (UI); all (API + CLI)

## Purpose

Self-service account management for any authenticated user: update display name and change password. Covers the `/account` page in `client-me`, two new backend endpoints, and a new admin CLI command for display name.

## ADDED Requirements

### Requirement: Account page at /account
The me app SHALL provide an `/account` page that displays the user's current display name and email (read-only), a form to update their display name, and a form to change their password.

#### Scenario: Current display name pre-filled
- **WHEN** the user opens the Account page
- **THEN** the display name field is pre-filled with the value from `GET /api/auth/me`

#### Scenario: Email shown read-only
- **WHEN** the user opens the Account page
- **THEN** the user's email is displayed but cannot be edited

### Requirement: Update display name
The system SHALL provide `PUT /api/users/me/display-name`, protected by standard auth middleware (any authenticated user), that updates the calling user's `display_name` in the `users` table. The body SHALL contain `{ displayName: string }`. The value SHALL be validated as non-empty and at most 100 characters. The me app SHALL provide a form to submit this update.

#### Scenario: Display name updated successfully
- **WHEN** the user submits a valid display name on the Account page
- **THEN** `PUT /api/users/me/display-name` is called, the `users` table is updated, and the UI confirms success

#### Scenario: Empty display name rejected
- **WHEN** the user submits an empty string as a display name
- **THEN** the request is rejected with 400 and no update occurs

#### Scenario: Display name over 100 characters rejected
- **WHEN** the user submits a display name longer than 100 characters
- **THEN** the request is rejected with 400 and no update occurs

#### Scenario: Updated name reflected in /api/auth/me
- **WHEN** `PUT /api/users/me/display-name` succeeds and the client calls `GET /api/auth/me`
- **THEN** the response includes the updated `displayName`

### Requirement: Change password
The system SHALL provide `PUT /api/users/me/password`, protected by standard auth middleware (any authenticated user), that accepts `{ currentPassword, newPassword }`. It SHALL verify `currentPassword` against the stored bcrypt hash before updating. On success it SHALL store the new bcrypt hash and rotate `session_nonce`, invalidating all sessions for the user including the caller's. The me app SHALL provide a form to submit this change and SHALL inform the user that they will be signed out on all devices.

#### Scenario: Password changed successfully
- **WHEN** the user submits the correct current password and a valid new password
- **THEN** `PUT /api/users/me/password` returns 204, the new hash is stored, and `session_nonce` is rotated

#### Scenario: Wrong current password rejected
- **WHEN** the user submits an incorrect current password
- **THEN** the request is rejected with 401 and the password is not changed

#### Scenario: All sessions invalidated after password change
- **WHEN** `PUT /api/users/me/password` succeeds
- **THEN** all previously issued session cookies for that user (including the caller's) return 401 on subsequent API calls

#### Scenario: App redirects to login after password change
- **WHEN** the next API call returns 401 following a successful password change
- **THEN** the me app redirects to the login page

#### Scenario: UI warns user before submitting
- **WHEN** the user views the change password form
- **THEN** a notice is displayed: "You'll be signed out on all devices after changing your password"

### Requirement: Admin CLI command to set display name
The system SHALL provide a `users:set-display-name <email> <displayName>` admin CLI command that updates the `display_name` for the specified user. The email must match an existing user; if not found the command SHALL exit with an error message and non-zero exit code.

#### Scenario: Display name set via CLI
- **WHEN** `users:set-display-name user@example.com "Alice"` is run for an existing user
- **THEN** that user's `display_name` is updated in the database and the CLI prints a confirmation

#### Scenario: Unknown email fails gracefully
- **WHEN** `users:set-display-name unknown@example.com "Alice"` is run for a non-existent user
- **THEN** the CLI exits with an error message and non-zero exit code
