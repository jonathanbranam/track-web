**App**: all

## ADDED Requirements

### Requirement: UserChip component exported from @repo/auth
The system SHALL export a `UserChip` React component from `@repo/auth` that renders a fixed-position circular initials button in the upper-right corner of the viewport, respecting the iOS safe-area-inset-top.

#### Scenario: Chip renders when authenticated
- **WHEN** `<UserChip />` is mounted and `useAuth().userId` is non-null
- **THEN** a circular button appears fixed at `top: calc(var(--sat) + 6px); right: 12px` displaying the user's computed initials

#### Scenario: Chip hidden via prop
- **WHEN** `<UserChip hidden={true} />` is rendered
- **THEN** the component returns null and nothing is rendered

#### Scenario: Chip not rendered when unauthenticated
- **WHEN** `useAuth().userId` is null
- **THEN** the chip does not render regardless of the `hidden` prop value

### Requirement: Initials computed from displayName with email fallback
The chip SHALL display 1–2 uppercase initials derived first from `displayName`, falling back to the email local part if `displayName` is unavailable. Initials are always the first character of the **first** word and (if more than one word) the first character of the **last** word, ignoring any middle words.

#### Scenario: Single-word displayName
- **WHEN** `displayName` is `"Jon"`
- **THEN** the chip displays `"J"`

#### Scenario: Multi-word displayName uses first and last word
- **WHEN** `displayName` is `"Jon J. Branam"`
- **THEN** the chip displays `"JB"` (first=Jon, last=Branam, middle ignored)

#### Scenario: Email fallback with dotted local part
- **WHEN** `displayName` is null and `email` is `"bill.j.smith@gmail.com"`
- **THEN** dots in the local part are replaced with spaces, producing words `["bill", "j", "smith"]`, and the chip displays `"BS"` (first=bill, last=smith)

#### Scenario: Email fallback with single-word local part
- **WHEN** `displayName` is null and `email` is `"jon@branam.us"`
- **THEN** the chip displays `"J"`

#### Scenario: Both null fallback
- **WHEN** both `displayName` and `email` are null
- **THEN** the chip renders a person outline icon in place of initials

### Requirement: Tapping the chip opens an account drawer
The system SHALL display a bottom drawer when the chip is tapped. The drawer SHALL include: user ID (displayed as a secondary label), display name, email address, a link to `https://me.branam.us` for account management, and a logout button. A semi-transparent backdrop covers the rest of the screen and closes the drawer when tapped.

#### Scenario: Drawer opens on chip tap
- **WHEN** the user taps the chip
- **THEN** a panel slides up from the bottom of the screen and a backdrop appears behind it

#### Scenario: Drawer shows user identity
- **WHEN** the drawer is open
- **THEN** it displays the user's display name, email address, and user ID

#### Scenario: Account management link opens me.branam.us
- **WHEN** the user taps the account management link in the drawer
- **THEN** `https://me.branam.us` opens in a new tab (or Safari on iOS PWA)

#### Scenario: Logout button signs out and redirects
- **WHEN** the user taps the logout button in the drawer
- **THEN** `useAuth().logout()` is called and the user is navigated to `/login`

#### Scenario: Backdrop tap closes drawer
- **WHEN** the drawer is open and the user taps the backdrop
- **THEN** the drawer closes and the backdrop is removed

### Requirement: All client apps render UserChip in their app shell
Each client app (`client-time`, `client-games`, `client-watch`, `client-me`, `client-play`, `client-admin`, `client-trips`) SHALL render `<UserChip />` inside its `AuthProvider`. Apps SHALL pass `hidden={true}` on routes where the chip would obstruct content (e.g. in-game views).

#### Scenario: Chip visible on default route of each app
- **WHEN** a user navigates to the default authenticated route of any client app
- **THEN** the UserChip is visible in the upper-right corner

#### Scenario: Chip hidden on in-game routes in client-games
- **WHEN** the user is on a game-play route in client-games (where `isInGame` is true)
- **THEN** the chip is not rendered
