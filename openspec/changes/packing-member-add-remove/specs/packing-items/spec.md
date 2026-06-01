**App**: trips

## MODIFIED Requirements

### Requirement: Read-only PackingPage
The system SHALL render a `PackingPage` at the `/packing` route in the trips client. On mount it SHALL fetch `GET /api/trips/:id/packing/items` and `GET /api/trips/:id/packing/state` in parallel. It SHALL render shared items grouped by section (section name as a styled heading, each item as a list row with a checkbox). Personal items (those returned with `userId` matching the current user) SHALL be rendered in a separate section labeled **"FYP"**, after the shared sections, also as checkboxable rows. Tapping a checkbox SHALL optimistically toggle the local state and fire `PUT /api/trips/:id/packing/state`; on error it SHALL revert the toggle. For the trip owner (user_id 1), the page SHALL additionally fetch `GET /api/trips/:id/packing/summary` in parallel and render a per-member completion summary section above the item list. The owner SHALL see each member's FYP items rendered under a **"FYP – [member name or userId]"** heading. A NavBar tab SHALL link to `/packing`.

The FYP section for the **current user** (whether member or owner) SHALL include:
- An inline text input at the bottom of the section with an Add button. Submitting the input (via button tap or Enter) SHALL POST to `POST /api/trips/:id/packing/items` with `{ text, section: '', position: 0 }` and append the returned item to the local list. The input SHALL clear on success.
- A trash icon on each personal item row. Tapping the trash icon SHALL transition that row into a **pending-delete** state showing Cancel and Delete buttons inline. Tapping Cancel restores the normal row. Tapping Delete SHALL optimistically remove the item from local state, fire `DELETE /api/trips/:id/packing/items/:itemId`, and restore the item on error.

The owner's view of **other members'** FYP groups (rendered under "FYP – [member]" headings) SHALL remain read-only — no add input and no trash icons.

#### Scenario: Shared items rendered under section headings
- **WHEN** the PackingPage mounts and items are fetched
- **THEN** shared items are displayed under their section headings in position order with checkboxes reflecting the current user's checked state

#### Scenario: Personal items rendered in FYP section
- **WHEN** the current user has personal items in the response
- **THEN** a "FYP" section appears after the shared sections containing those items with checkboxes

#### Scenario: No FYP section when user has no personal items
- **WHEN** the current user has no personal items and no FYP section content
- **THEN** no "FYP" section is rendered (but the add input is still available to start one)

#### Scenario: FYP section always shows add input
- **WHEN** the current user's FYP section is visible (with or without existing items)
- **THEN** an inline text input and Add button are rendered at the bottom of the FYP section

#### Scenario: Member adds a personal item
- **WHEN** a trip member types text into the FYP add input and taps Add
- **THEN** a POST request is sent, the new item appears in the FYP list, and the input clears

#### Scenario: Add input clears on success
- **WHEN** the POST for a new personal item succeeds
- **THEN** the text input is cleared and ready for the next entry

#### Scenario: Trash icon appears only on personal items
- **WHEN** the FYP section renders the current user's personal items
- **THEN** each row shows a trash icon; shared item rows show no trash icon

#### Scenario: Trash icon triggers inline confirmation
- **WHEN** a user taps the trash icon on a personal item
- **THEN** the row transitions to show Cancel and Delete buttons inline, replacing the normal row content

#### Scenario: Cancel restores the row
- **WHEN** a user taps Cancel in the pending-delete state
- **THEN** the row returns to its normal display

#### Scenario: Delete removes item optimistically
- **WHEN** a user taps Delete in the pending-delete state
- **THEN** the item is immediately removed from the list and a DELETE request is sent

#### Scenario: Delete reverts on error
- **WHEN** the DELETE request fails
- **THEN** the item is restored to the list

#### Scenario: Owner sees all members' FYP items
- **WHEN** the owner views the PackingPage and multiple members have personal items
- **THEN** the owner sees a "FYP – [member]" section per member containing that member's personal items (read-only)

#### Scenario: Owner's own FYP section is editable
- **WHEN** the owner views their own FYP group
- **THEN** the add input and trash icons are present, same as for any member

#### Scenario: Owner cannot add/delete from other members' FYP sections
- **WHEN** the owner views another member's FYP group
- **THEN** no add input and no trash icons are shown for that group

#### Scenario: Tap to check an item
- **WHEN** the user taps an unchecked checkbox
- **THEN** the checkbox immediately shows as checked (optimistic), and a PUT request is sent to persist the state

#### Scenario: Tap to uncheck an item
- **WHEN** the user taps a checked checkbox
- **THEN** the checkbox immediately shows as unchecked (optimistic), and a PUT request is sent to persist the state

#### Scenario: Toggle reverts on error
- **WHEN** the PUT request for a toggle fails
- **THEN** the checkbox reverts to its prior state

#### Scenario: Owner sees completion summary
- **WHEN** the owner (user_id 1) views the PackingPage
- **THEN** a summary section above the list shows one row per member with their `checked/total` count

#### Scenario: Non-owner does not see summary
- **WHEN** a non-owner member views the PackingPage
- **THEN** no summary section is rendered

#### Scenario: Empty state
- **WHEN** no items exist for the trip
- **THEN** the page displays "No packing list yet." but still renders the FYP add input

#### Scenario: NavBar tab present
- **WHEN** the user views any page in the trips app
- **THEN** a Packing tab is visible in the NavBar and navigates to `/packing`
