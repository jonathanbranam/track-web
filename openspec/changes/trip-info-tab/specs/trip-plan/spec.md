**App**: trips

## ADDED Requirements

### Requirement: Info tab in NavBar
The trips app NavBar SHALL include an "Info" tab entry that navigates to `/info`. The Info tab SHALL appear after the Overview tab. The active tab SHALL be highlighted using the existing active-state style (indigo color).

#### Scenario: Info tab is visible
- **WHEN** an authenticated user is on any page of the trips app
- **THEN** the NavBar shows both an "Overview" tab and an "Info" tab

#### Scenario: Info tab is active when on /info
- **WHEN** the current route is `/info`
- **THEN** the Info tab is highlighted as active and the Overview tab is not

#### Scenario: Overview tab is active when on /
- **WHEN** the current route is `/`
- **THEN** the Overview tab is highlighted as active and the Info tab is not

### Requirement: App.tsx routes include /info
`App.tsx` SHALL include a `/info` route wrapped in `<AuthGuard>` that renders `<InfoPage>`. The catch-all `*` route SHALL continue to redirect to `/`.

#### Scenario: Direct navigation to /info
- **WHEN** an authenticated user navigates directly to `/info`
- **THEN** the Info page is rendered

#### Scenario: Unauthenticated access to /info
- **WHEN** an unauthenticated user navigates to `/info`
- **THEN** `AuthGuard` redirects them to the login page
