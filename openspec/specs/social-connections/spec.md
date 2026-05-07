## Purpose

Covers the user connection model: two-tier visibility (visible vs. connected), invite code lifecycle for bootstrapping connections with strangers, in-app connection requests between group co-members, and connection revocation.

## Requirements

### Requirement: Two-tier user visibility model
The system SHALL enforce a two-tier visibility model. A user is **connected** to another user if a `user_connections` row exists for the pair. A user is **visible** to another user if they share at least one `group_members` row but are not connected. All other users are **invisible** — they cannot be seen, found, or contacted.

#### Scenario: Connected users are retrievable
- **WHEN** user A calls `GET /api/social/connections`
- **THEN** the response includes all users with whom A has a `user_connections` row, with their `id`, `email`, and `displayName`

#### Scenario: Invisible users are not returned
- **WHEN** user A calls `GET /api/social/connections` or `GET /api/social/users/connectable`
- **THEN** users who share no group and have no connection with A are not present in any response

#### Scenario: Connectable users list returns connected users only
- **WHEN** user A calls `GET /api/social/users/connectable`
- **THEN** the response contains only users connected to A (not merely visible)

### Requirement: Invite code creation and redemption
The system SHALL allow a user to generate a single-use invite code. The code SHALL be a cryptographically random token, valid for exactly 7 days from creation. Redeeming a valid code by a second user SHALL create a bilateral `user_connections` row between the code creator and the redeemer. A code MAY NOT be redeemed by its creator.

#### Scenario: Code generated successfully
- **WHEN** an authenticated user calls `POST /api/social/invite-codes`
- **THEN** a new row is inserted into `user_invite_codes` with `expires_at = created_at + 7 days` and the code token is returned

#### Scenario: Valid code redeemed
- **WHEN** an authenticated user calls `POST /api/social/connect` with a valid, unused, non-expired code not created by themselves
- **THEN** a `user_connections` row is created for the pair and the code's `used_by_user_id` and `used_at` are set

#### Scenario: Expired code rejected
- **WHEN** `POST /api/social/connect` is called with a code whose `expires_at` is in the past
- **THEN** the server returns 400 and no connection is created

#### Scenario: Already-used code rejected
- **WHEN** `POST /api/social/connect` is called with a code that already has `used_at` set
- **THEN** the server returns 400 and no connection is created

#### Scenario: Creator cannot redeem own code
- **WHEN** `POST /api/social/connect` is called by the user who created the code
- **THEN** the server returns 400 and no connection is created

#### Scenario: Code deletion removes unused code
- **WHEN** an authenticated user calls `DELETE /api/social/invite-codes/:id` for a code they own that has not been used
- **THEN** the row is deleted

#### Scenario: Cannot delete used code
- **WHEN** `DELETE /api/social/invite-codes/:id` is called for a code with `used_at` set
- **THEN** the server returns 400 and the row is not deleted

### Requirement: In-app connection requests between group co-members
The system SHALL allow a user to send an in-app connection request to another user with whom they share a group but are not yet connected. A request SHALL expire 7 days after creation. After expiry, a new request MAY be sent. The recipient accepts or declines; the requester SHALL NOT be informed of a decline — all non-accepted, non-expired sent requests appear as `pending` in the sender's view. Accepting a request creates a `user_connections` row and sets the request status to `accepted`.

#### Scenario: Request sent to group co-member
- **WHEN** user A calls `POST /api/social/connection-requests` with `{ toUserId: B }` and A and B share a group but are not connected
- **THEN** a `user_connection_requests` row is created with `status = 'pending'` and `expires_at = created_at + 7 days`

#### Scenario: Request rejected if no shared group
- **WHEN** user A calls `POST /api/social/connection-requests` with `{ toUserId: B }` and A and B share no group
- **THEN** the server returns 403 and no row is created

#### Scenario: Request rejected if already connected or pending
- **WHEN** user A calls `POST /api/social/connection-requests` and A and B already have a `user_connections` row, or A already has a non-expired pending request to B
- **THEN** the server returns 409

#### Scenario: Expired request allows re-request
- **WHEN** user A's previous request to user B has `expires_at` in the past
- **THEN** `POST /api/social/connection-requests` for B succeeds; the old row is pruned and a new one is created

#### Scenario: Recipient sees pending requests
- **WHEN** user B calls `GET /api/social/connection-requests/pending`
- **THEN** all non-expired requests where `to_user_id = B` and `status = 'pending'` are returned with the sender's id, email, and displayName

#### Scenario: Accepting a request creates connection
- **WHEN** user B calls `PUT /api/social/connection-requests/:id` with `{ action: 'accept' }` for a pending, non-expired request directed at B
- **THEN** a `user_connections` row is created for the pair and `status` is set to `'accepted'`

#### Scenario: Declining a request is hidden from sender
- **WHEN** user B calls `PUT /api/social/connection-requests/:id` with `{ action: 'decline' }`
- **THEN** `status` is set to `'declined'` internally; the sender's view of the request via `GET /api/social/connection-requests/sent` shows it as `'pending'`

#### Scenario: Cannot respond to another user's request
- **WHEN** user C calls `PUT /api/social/connection-requests/:id` for a request directed at user B (not C)
- **THEN** the server returns 403

### Requirement: Connection revocation
Either user in a connected pair SHALL be able to revoke the connection at any time. Revocation deletes the `user_connections` row. After revocation the two users revert to visible (if they still share a group) or invisible.

#### Scenario: Connection revoked by either party
- **WHEN** user A or user B calls `DELETE /api/social/connections/:userId` identifying the other
- **THEN** the `user_connections` row is deleted and both users' connectable list no longer includes the other

#### Scenario: Revoking non-existent connection returns 404
- **WHEN** `DELETE /api/social/connections/:userId` is called for a user not connected to the caller
- **THEN** the server returns 404
