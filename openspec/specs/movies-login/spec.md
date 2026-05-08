## Purpose

Covers the per-app login page branding: each client app displays its own name and icon on the shared login UI provided by `@repo/auth`. Auth routing (redirect unauthenticated users, block authenticated users from `/login`) is handled by `AuthGuard` from `shared-client-auth`.

## Requirements

### Requirement: Movies login page displays movies branding
The movies login page SHALL display "Movies" as the app name with an appropriate icon. All honeypot behaviors (Forgot Login, Create Account) SHALL function identically to the tracker login page.

#### Scenario: Login page renders movies branding
- **WHEN** the movies login page renders
- **THEN** the app name displayed is "Movies" and the icon reflects the movies app identity

#### Scenario: Successful login navigates to movies home
- **WHEN** the user submits valid credentials on the movies login page
- **THEN** the session is established and the user is navigated to `/`

### Requirement: Watch login page displays watch branding
The watch login page SHALL display "Watch" as the app name with an appropriate icon. All honeypot behaviors (Forgot Login, Create Account) SHALL function identically to the tracker login page.

#### Scenario: Login page renders watch branding
- **WHEN** the watch login page renders
- **THEN** the app name displayed is "Watch" and the icon reflects the watch app identity

#### Scenario: Successful login navigates to watch home
- **WHEN** the user submits valid credentials on the watch login page
- **THEN** the session is established and the user is navigated to `/`
