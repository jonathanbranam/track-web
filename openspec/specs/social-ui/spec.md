## Purpose

Covers the shared `@repo/ui` social components: `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, `RedeemInviteCode`, and `ConnectableUserPicker`. These components are consumed by the watch and food apps' People tab.

## Requirements

### Requirement: PeopleTab component
The `@repo/ui` package SHALL export a `PeopleTab` React component that displays three sections: incoming pending connection requests (with accept/decline actions), connected users (with revoke action), and visible-but-not-connected group co-members (in locked style with a "Request Connection" action). The component SHALL call `/api/social/` endpoints directly.

#### Scenario: Incoming requests shown with action buttons
- **WHEN** `PeopleTab` mounts and `GET /api/social/connection-requests/pending` returns one or more requests
- **THEN** each request is displayed with the sender's display name and Accept / Decline buttons

#### Scenario: Accepting a request updates the UI
- **WHEN** the user clicks Accept on a pending request
- **THEN** `PUT /api/social/connection-requests/:id` is called with `{ action: 'accept' }` and the request moves from the pending section to the connected section

#### Scenario: Connected users shown with revoke action
- **WHEN** `PeopleTab` mounts and `GET /api/social/connections` returns connected users
- **THEN** each is displayed with their display name and a Revoke button

#### Scenario: Visible-not-connected co-members shown in locked style
- **WHEN** a group co-member is not in the connected list
- **THEN** they appear in a visually distinct locked style with a "Request Connection" button instead of an invite action

#### Scenario: Request Connection triggers in-app request
- **WHEN** the user clicks "Request Connection" for a visible co-member
- **THEN** `POST /api/social/connection-requests` is called and the button changes to "Request Sent"

### Requirement: GroupList and GroupEditor components
The `@repo/ui` package SHALL export `GroupList` and `GroupEditor` React components. `GroupList` renders the user's groups with a "Create Group" entry point. `GroupEditor` supports creating and editing a group's name and description, and managing its member list.

#### Scenario: Group list renders all user groups
- **WHEN** `GroupList` mounts
- **THEN** `GET /api/social/groups` is called and each group is rendered with its name and member count

#### Scenario: GroupEditor creates a new group
- **WHEN** the user fills in a name and submits via `GroupEditor` in create mode
- **THEN** `POST /api/social/groups` is called and the new group appears in `GroupList`

#### Scenario: GroupEditor shows connected vs locked members
- **WHEN** `GroupEditor` renders the member list for an existing group
- **THEN** members with `connected: true` appear normally; members with `connected: false` appear in locked style

#### Scenario: Adding a member only offers connected users
- **WHEN** the user opens the add-member picker in `GroupEditor`
- **THEN** only connected users (from `GET /api/social/users/connectable`) are shown as candidates

### Requirement: InviteCodePanel and RedeemInviteCode components
The `@repo/ui` package SHALL export `InviteCodePanel` (generate and manage codes) and `RedeemInviteCode` (enter and submit a code) as separate React components.

#### Scenario: Invite code generated and displayed
- **WHEN** the user clicks "Generate Invite Code" in `InviteCodePanel`
- **THEN** `POST /api/social/invite-codes` is called and the returned code token is displayed for copying

#### Scenario: Code list shows status badges
- **WHEN** `InviteCodePanel` loads the user's codes via `GET /api/social/invite-codes`
- **THEN** each code shows a status badge: Active, Used, or Expired

#### Scenario: Unused code deleted
- **WHEN** the user clicks delete on an active code in `InviteCodePanel`
- **THEN** `DELETE /api/social/invite-codes/:id` is called and the code is removed from the list

#### Scenario: Valid code redeemed
- **WHEN** the user enters a code in `RedeemInviteCode` and submits
- **THEN** `POST /api/social/connect` is called; on success a confirmation is shown and the connected user appears in `PeopleTab`

#### Scenario: Invalid code shows error
- **WHEN** `POST /api/social/connect` returns 400
- **THEN** `RedeemInviteCode` displays an error message (e.g., "Code is invalid, expired, or already used")

### Requirement: ConnectableUserPicker component
The `@repo/ui` package SHALL export a `ConnectableUserPicker` React component that renders a multi-select list of the current user's connected users. It SHALL be used by watch and food event creation forms and the group member add flow to select invite recipients.

#### Scenario: Picker loads connected users
- **WHEN** `ConnectableUserPicker` mounts
- **THEN** `GET /api/social/users/connectable` is called and each connected user is shown as a selectable option

#### Scenario: Selection emits userId array
- **WHEN** the user selects or deselects users in `ConnectableUserPicker`
- **THEN** the component calls its `onChange` callback with the current array of selected `userId` values

### Requirement: People tab in watch and food apps
Both the watch and food frontend apps SHALL include a **People** navigation tab that renders `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, and `RedeemInviteCode` from `@repo/ui` in a single tabbed layout. The time app SHALL NOT include this tab.

#### Scenario: People tab accessible in watch app
- **WHEN** the user navigates to `/people` in the watch app
- **THEN** the People tab renders with connection management and group management sections

#### Scenario: People tab accessible in food app
- **WHEN** the user navigates to `/people` in the food app
- **THEN** the People tab renders with connection management and group management sections

#### Scenario: Time app has no People tab
- **WHEN** the user uses the time app
- **THEN** no social navigation tab or social UI component is rendered
