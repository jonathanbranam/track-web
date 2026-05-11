**App**: client-watch

## MODIFIED Requirements

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
