**App**: client-watch

## Purpose

Mobile-first shell and visual design system for `client-watch`. Covers bottom navigation, safe area support, card and button conventions, accent color palette, loading states, and tag/badge styling.

## Requirements

### Requirement: Fixed bottom navigation bar
The system SHALL replace the horizontal top navigation bar with a fixed bottom navigation bar. The bar SHALL display three tabs — Events, Ratings, and People — each with an icon and a text label. The active tab SHALL be visually distinguished using the violet accent color. The bar SHALL apply bottom safe area inset padding so it clears the home indicator on notched devices.

#### Scenario: Active tab is highlighted
- **WHEN** the user is on a page corresponding to a bottom nav tab
- **THEN** that tab's icon and label are rendered in the violet accent color and all other tabs are rendered in the inactive color

#### Scenario: Tapping a tab navigates to that section
- **WHEN** the user taps a bottom nav tab
- **THEN** the app navigates to that section and the tapped tab becomes active

#### Scenario: Nav bar clears the home indicator
- **WHEN** the app is installed as a PWA on a device with a home indicator
- **THEN** the bottom nav bar is not obscured by the home indicator

#### Scenario: Ratings tab is active on ratings route
- **WHEN** the user is on the `/ratings` route
- **THEN** the Ratings tab is highlighted as active

#### Scenario: Movies and TV tabs are not present
- **WHEN** the bottom navigation bar is rendered
- **THEN** no Movies tab and no TV tab are displayed; only Events, Ratings, and People tabs are shown

### Requirement: Safe area inset CSS variables
The system SHALL define `--sat` (safe area top) and `--sab` (safe area bottom) CSS variables in `client-watch/src/index.css`, populated from the device's safe area environment variables. These variables SHALL be applied to any fixed UI elements that may overlap device chrome.

#### Scenario: Safe area variables are available globally
- **WHEN** the app loads on any device
- **THEN** the `--sat` and `--sab` CSS variables are defined and reflect the device's safe area insets (zero on devices without notches)

### Requirement: Mobile card visual style
The system SHALL render content cards with a large border radius and generous padding. Cards SHALL span the full content width with consistent horizontal page padding; no desktop-width constraint SHALL be applied to page containers.

#### Scenario: Cards span full content width
- **WHEN** a page with card-style content is viewed on a mobile-width viewport
- **THEN** cards span the full width of the viewport minus the page's horizontal padding

### Requirement: Full-width primary action buttons
The system SHALL render primary action buttons at full container width with a large enough height to meet mobile tap target guidelines. Button text SHALL be rendered at a weight sufficient to distinguish it as a primary action.

#### Scenario: Primary button spans container width
- **WHEN** a primary action button is rendered on a form or detail page
- **THEN** the button stretches to the full width of its container

### Requirement: Violet accent color
The system SHALL use violet as the accent color for all interactive and branded elements in `client-watch` — navigation highlights, primary buttons, focus rings, badges, and segmented control selection. No blue accent colors inherited from earlier scaffolding SHALL remain.

#### Scenario: Active and interactive elements use violet
- **WHEN** the user views any interactive element in client-watch (active nav tab, primary button, focused input, selected tab, genre badge)
- **THEN** the accent color applied is violet, not blue or indigo

### Requirement: Back-button header for secondary pages
Pages that are reached by navigating away from a primary tab — including the new event form, movie catalog, and TV catalog — SHALL display a fixed-position header with a back button and a page title. Inline text navigation links SHALL NOT be used as the primary means to return to a previous page.

#### Scenario: Back button returns to the previous page
- **WHEN** the user taps the back button in a secondary page header
- **THEN** the app navigates back to the originating list or tab page

#### Scenario: Secondary page displays its title
- **WHEN** a secondary page is rendered
- **THEN** the header shows a descriptive title for the current page

### Requirement: Floating action button for primary event creation
The Events page SHALL provide a floating action button (FAB) as the primary means to create a new event. The FAB SHALL be positioned in the bottom-right corner above the navigation bar and SHALL remain visible while the user scrolls the event list.

#### Scenario: FAB is visible while scrolling
- **WHEN** the user scrolls the Events page
- **THEN** the FAB remains fixed in the bottom-right corner above the nav bar

#### Scenario: Tapping FAB opens the new event form
- **WHEN** the user taps the FAB on the Events page
- **THEN** the app navigates to the new event creation page

### Requirement: Minimum touch target height for tab selectors
Segmented control tabs used as state or sub-category filters SHALL have a minimum rendered height sufficient to meet mobile touch target guidelines (at minimum 40px). This applies to watchlist state filters and People sub-tabs.

#### Scenario: Tab selector meets minimum tap target height
- **WHEN** a segmented control is rendered
- **THEN** each tab option has a rendered height of at least 40px

### Requirement: Animated loading spinner for async states
Pages and components that load data asynchronously SHALL display a centered animated spinner while the request is in flight. Plain loading text SHALL NOT be used in place of a spinner.

#### Scenario: Spinner shown during data fetch
- **WHEN** a page or component is waiting for an async data fetch to complete
- **THEN** an animated spinner is displayed in the center of the loading area

#### Scenario: Spinner replaced by content on success
- **WHEN** the async fetch completes successfully
- **THEN** the spinner is removed and the loaded content is displayed

### Requirement: Pill-style genre and type badges
Genre tags and content-type labels in `client-watch` SHALL be rendered as pill-shaped badges using the violet accent color family. They SHALL be visually consistent with the `TagChip` pattern used in `client-time`.

#### Scenario: Genre badge renders as a pill
- **WHEN** a genre tag or type label is rendered on a movie, TV, or event card
- **THEN** it appears as a rounded-full pill badge with violet-toned colors

### Requirement: Consistent focus rings on form inputs
All text inputs and form controls in `client-watch` SHALL display a focus ring using the violet accent color when focused. No blue or browser-default focus styles SHALL remain.

#### Scenario: Input shows violet focus ring when focused
- **WHEN** the user focuses a text input or form control
- **THEN** a violet focus ring is displayed around the control

### Requirement: Invite picker on the new event form
The new event form SHALL include an invite picker section below the date field, allowing the user to select connected users and groups to invite before creating the event. The picker SHALL display connected users as a checkbox list and groups as selectable rows. Selecting a group SHALL add the group to the pending invite selection (server expands to members at creation time). The form SHALL pass all selected invitees to `POST /api/watch/events` on submit.

#### Scenario: Connected users displayed as checkboxes
- **WHEN** the user opens the new event form
- **THEN** the invite picker displays each connected user with a checkbox; unchecked by default

#### Scenario: Groups displayed as selectable rows
- **WHEN** the user opens the new event form and has groups
- **THEN** each group is displayed by name with a toggle button; tapping it adds or removes the group from the pending selection

#### Scenario: Selected invitees sent on create
- **WHEN** the user submits the new event form with one or more invitees selected
- **THEN** the selected users and groups are included in the `invitees` payload sent to `POST /api/watch/events`

#### Scenario: No invitees selected is valid
- **WHEN** the user submits the new event form with no invitees selected
- **THEN** the event is created with `invitees: []`; only the creator is in `watch_event_invites`

### Requirement: Invite management on the event detail page
The event detail page SHALL provide an invite management section visible to any current participant (host or invitee). The section SHALL allow adding new invitees via the same user and group picker and SHALL render a remove button on each existing invitee row. The creator's invitee row SHALL NOT have a remove button. Users already invited SHALL be excluded from the add picker. The section SHALL be collapsed by default and expand on demand to defer the picker's data fetch.

#### Scenario: Any participant sees the invite management section
- **WHEN** a current participant (host or invitee) views the event detail page
- **THEN** the invite management section is visible and accessible

#### Scenario: Adding invitees from the detail page
- **WHEN** a participant expands the invite management section, selects users or groups, and submits
- **THEN** `POST /api/watch/events/:id/invitees` is called with the selection and the people list reloads

#### Scenario: Already-invited users excluded from the picker
- **WHEN** the invite management section is expanded
- **THEN** users who already have a `watch_event_invites` row for this event are not shown in the user picker

#### Scenario: Remove button on each non-creator invitee row
- **WHEN** a participant views the people list on the event detail page
- **THEN** each invitee row (except the creator's) has a remove button

#### Scenario: Creator row has no remove button
- **WHEN** a participant views the people list on the event detail page
- **THEN** the creator's invitee row does not display a remove button

#### Scenario: Removing an invitee reloads the people list
- **WHEN** a participant taps the remove button on an invitee row
- **THEN** `DELETE /api/watch/events/:id/invitees/:userId` is called and the people list reloads to reflect the removal

#### Scenario: Self-removal navigates away
- **WHEN** a non-creator participant removes themselves and the deletion succeeds
- **THEN** the app navigates away from the event detail page (the user no longer has access)
