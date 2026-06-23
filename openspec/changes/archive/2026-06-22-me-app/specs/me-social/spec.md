**App**: me

## Purpose

The People tab on `me.branam.us` — the canonical home for social management (connections, groups, invite codes) across all apps. Consumes existing `@repo/ui` components without modification; no changes to `/api/social/*` endpoints.

## ADDED Requirements

### Requirement: Social hub page at /people
The me app SHALL provide a `/people` page that renders `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, and `RedeemInviteCode` from `@repo/ui` in a three-sub-tab layout: **Connections**, **Groups**, and **Codes**.

#### Scenario: Connections sub-tab renders PeopleTab
- **WHEN** the user navigates to `/people` and selects the Connections sub-tab
- **THEN** the `PeopleTab` component renders with incoming requests, connected users, and visible co-members

#### Scenario: Groups sub-tab renders group management
- **WHEN** the user selects the Groups sub-tab
- **THEN** `GroupList` renders all user groups and provides an entry point to `GroupEditor` for creating or editing a group

#### Scenario: Codes sub-tab renders invite code management
- **WHEN** the user selects the Codes sub-tab
- **THEN** `InviteCodePanel` and `RedeemInviteCode` render for generating codes and redeeming a received code
