**App**: trips

## ADDED Requirements

### Requirement: Days tab in NavBar
The trips app NavBar SHALL include a "Days" tab entry that navigates to `/days`. The Days tab SHALL appear between the Overview tab and the Info tab. The active tab SHALL be highlighted using the existing active-state style (indigo color).

#### Scenario: Days tab is visible
- **WHEN** an authenticated user is on any page of the trips app
- **THEN** the NavBar shows Overview, Days, and Info tabs

#### Scenario: Days tab is active when on /days
- **WHEN** the current route is `/days`
- **THEN** the Days tab is highlighted as active and the other tabs are not

#### Scenario: Days tab is inactive when on other routes
- **WHEN** the current route is `/` or `/info`
- **THEN** the Days tab is not highlighted

### Requirement: App.tsx routes include /days
`App.tsx` SHALL include a `/days` route wrapped in `<AuthGuard>` that renders `<DaysPage>`.

#### Scenario: Direct navigation to /days
- **WHEN** an authenticated user navigates directly to `/days`
- **THEN** the Days page is rendered

#### Scenario: Unauthenticated access to /days
- **WHEN** an unauthenticated user navigates to `/days`
- **THEN** `AuthGuard` redirects them to the login page
