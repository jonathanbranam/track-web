## MODIFIED Requirements

### Requirement: Movies login page displays movies branding
The watch login page SHALL display "Watch" as the app name with an appropriate icon. All honeypot behaviors (Forgot Login, Create Account) SHALL function identically to the tracker login page.

#### Scenario: Login page renders watch branding
- **WHEN** the watch login page renders
- **THEN** the app name displayed is "Watch" and the icon reflects the watch app identity

#### Scenario: Successful login navigates to watch home
- **WHEN** the user submits valid credentials on the watch login page
- **THEN** the session is established and the user is navigated to `/`
