## Purpose

Covers group creation and membership management: creating groups with connected members, adding/removing members, updating group metadata, and listing groups with per-member connection status.

## Requirements

### Requirement: Group creation and membership
Any authenticated user SHALL be able to create a group with a name, optional description, and an initial list of member user IDs. All initial members MUST be connected to the creator. The creator is automatically added as a member. Any group member MAY add a connected user to the group, remove any member (including themselves), update the group's name or description, or delete the group. There are no permission tiers — all members have equal rights.

#### Scenario: Group created with connected members
- **WHEN** an authenticated user calls `POST /api/social/groups` with `{ name, description?, memberUserIds }` where all listed users are connected to the creator
- **THEN** a `groups` row is created, the creator and all listed users are inserted into `group_members`, and the group detail is returned

#### Scenario: Group creation rejected for unconnected member
- **WHEN** `POST /api/social/groups` lists a `memberUserId` not connected to the creator
- **THEN** the server returns 400 and no group or membership rows are created

#### Scenario: Member added by existing member
- **WHEN** an authenticated user who is a member of group G calls `POST /api/social/groups/:id/members` with `{ userId }` where that user is connected to the requester
- **THEN** a `group_members` row is inserted for the new user

#### Scenario: Member add rejected for unconnected user
- **WHEN** a group member calls `POST /api/social/groups/:id/members` with a `userId` not connected to them
- **THEN** the server returns 403 and no row is inserted

#### Scenario: Non-member cannot add members
- **WHEN** a user not in group G calls `POST /api/social/groups/:id/members`
- **THEN** the server returns 403

#### Scenario: Member removed by any group member
- **WHEN** any group member calls `DELETE /api/social/groups/:id/members/:userId`
- **THEN** the target `group_members` row is deleted

#### Scenario: Non-member cannot remove members
- **WHEN** a user not in group G calls `DELETE /api/social/groups/:id/members/:userId`
- **THEN** the server returns 403

### Requirement: Group metadata management
Any group member SHALL be able to update the group's name and description, and delete the group entirely.

#### Scenario: Group name and description updated
- **WHEN** a group member calls `PUT /api/social/groups/:id` with updated `name` or `description`
- **THEN** the `groups` row is updated and the new values are returned

#### Scenario: Non-member cannot update group
- **WHEN** a user not in the group calls `PUT /api/social/groups/:id`
- **THEN** the server returns 403

#### Scenario: Group deleted by any member
- **WHEN** any group member calls `DELETE /api/social/groups/:id`
- **THEN** the `groups` row and all associated `group_members` rows are deleted

#### Scenario: Non-member cannot delete group
- **WHEN** a user not in the group calls `DELETE /api/social/groups/:id`
- **THEN** the server returns 403

### Requirement: Group listing and detail
The system SHALL return only groups the requesting user is a member of. Group detail SHALL include the member list annotated with a `connected` boolean indicating whether each member is connected to the requesting user.

#### Scenario: Group list contains only user's groups
- **WHEN** an authenticated user calls `GET /api/social/groups`
- **THEN** only groups where the user has a `group_members` row are returned

#### Scenario: Group detail includes per-member connection status
- **WHEN** an authenticated user calls `GET /api/social/groups/:id` for a group they belong to
- **THEN** the response includes each member's `id`, `email`, `displayName`, and `connected` (true if a `user_connections` row exists for the pair, false otherwise)

#### Scenario: Non-member cannot view group detail
- **WHEN** a user not in the group calls `GET /api/social/groups/:id`
- **THEN** the server returns 403
