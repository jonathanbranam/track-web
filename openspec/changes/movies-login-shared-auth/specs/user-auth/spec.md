## MODIFIED Requirements

### Requirement: Honeypot login UI
The system SHALL present a login screen that appears to be an official app login (email + password fields) while silently logging any "Forgot Login" or "Create Account" interaction attempts server-side. The login UI SHALL be provided by the shared `@repo/auth` package and SHALL display app-specific branding (name and icon) supplied by the consuming client.

#### Scenario: Forgot Login flow
- **WHEN** the user clicks "Forgot Login?"
- **THEN** the server logs the attempt (timestamp, IP) and the UI displays a generic message: "For security reasons, please contact support."

#### Scenario: Create Account flow
- **WHEN** the user clicks "Create Account"
- **THEN** the UI displays: "This app is in closed beta. We're not accepting new registrations at this time." No server-side account is created.

#### Scenario: Only configured credentials work
- **WHEN** any email/password combination other than the configured user is submitted
- **THEN** login fails with 401 regardless of the email or password provided

#### Scenario: App-specific branding is displayed
- **WHEN** a client renders the shared login page with a given `appName` and `appIcon`
- **THEN** the login page header displays that app's name and icon
