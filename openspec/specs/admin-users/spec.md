**App**: admin

## Purpose

User-account management from the admin app (user 1 only): list, create, delete, and change a user's password.

## Requirements

### Requirement: List users
The system SHALL provide `GET /api/admin/users`, restricted to user 1, returning all user accounts (id, email, display name, created-at). The admin app SHALL display this list.

#### Scenario: Users listed
- **WHEN** user 1 opens the users page
- **THEN** all user accounts are listed with their id, email, and display name

### Requirement: Create a user
The system SHALL provide `POST /api/admin/users`, restricted to user 1, that creates a user from an email, password, and display name, storing the password as a bcrypt hash. The admin app SHALL provide a form to add a user.

#### Scenario: User created
- **WHEN** user 1 submits a new user's email, password, and display name
- **THEN** a user account is created with the password stored as a bcrypt hash, and it appears in the users list

#### Scenario: Duplicate email rejected
- **WHEN** user 1 submits an email that already belongs to an existing user
- **THEN** the request is rejected and no duplicate account is created

### Requirement: Delete a user
The system SHALL provide `DELETE /api/admin/users/:id`, restricted to user 1, that removes the specified user account. The admin app SHALL provide a control to remove a user.

#### Scenario: User removed
- **WHEN** user 1 deletes a user
- **THEN** that user account is removed and no longer appears in the users list

### Requirement: Change a user's password
The system SHALL provide an endpoint restricted to user 1 to change a specified user's password, storing the new password as a bcrypt hash. The admin app SHALL provide a control to change a user's password.

#### Scenario: Password changed
- **WHEN** user 1 sets a new password for a user
- **THEN** the user's stored password hash is updated and the user can authenticate with the new password
