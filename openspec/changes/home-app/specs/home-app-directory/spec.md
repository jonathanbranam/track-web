**App**: home

## ADDED Requirements

### Requirement: Authentication required
The home app SHALL require authentication. Unauthenticated users SHALL be redirected to a login page. The app SHALL use the existing `GET /api/auth/me` endpoint to determine identity; no new backend endpoints are required.

#### Scenario: Unauthenticated user redirected to login
- **WHEN** an unauthenticated user navigates to `home.branam.us`
- **THEN** the app redirects to the login page

#### Scenario: Authenticated user reaches the directory
- **WHEN** an authenticated user navigates to `home.branam.us`
- **THEN** the app renders the app directory card grid

### Requirement: App directory card grid
The home app SHALL display a grid of cards, one per branam.us app. Each card SHALL show the app name, a short description of its purpose, and a link to its subdomain. Cards SHALL open in the same tab.

The full card inventory is:

| App | URL | Description |
|-----|-----|-------------|
| Time | time.branam.us | Time tracking — start/stop tasks with tags, review daily logs |
| Watch | watch.branam.us | Movie and TV tracking — watchlists, ratings, watch events with friends |
| Trips | trips.branam.us | Family trip log — days, packing lists, and notes |
| Games | games.branam.us | Casual games and leaderboards |
| Me | me.branam.us | Your account, people, and groups |
| Food | food.branam.us | *(Coming soon)* |
| Admin | admin.branam.us | Admin console — deploys, backups, and user management *(admin only)* |
| Proto | proto.branam.us | Prototype workspace *(admin only)* |

#### Scenario: Standard user sees six cards
- **WHEN** a non-admin authenticated user views the home page
- **THEN** cards for Time, Watch, Trips, Games, Me, and Food are displayed; Admin and Proto cards are not shown

#### Scenario: Admin user sees all eight cards
- **WHEN** the admin user (userId === 1) views the home page
- **THEN** all eight cards are displayed including Admin and Proto

#### Scenario: Food card shows Coming Soon
- **WHEN** any authenticated user views the Food card
- **THEN** the card is visually distinct (e.g., muted/disabled style) and has no clickable link

#### Scenario: App cards link to correct subdomain
- **WHEN** a user clicks a non-disabled app card
- **THEN** the browser navigates to the app's subdomain URL

### Requirement: Role-based card visibility
Admin and Proto cards SHALL be visible only to the user whose `userId` is `1`, as returned by `GET /api/auth/me`. No server-side filtering is required; the client hides these cards for non-admin users.

#### Scenario: userId check determines admin visibility
- **WHEN** `GET /api/auth/me` returns `userId: 1`
- **THEN** Admin and Proto cards are rendered

#### Scenario: Non-admin userId hides admin cards
- **WHEN** `GET /api/auth/me` returns any `userId` other than `1`
- **THEN** Admin and Proto cards are not rendered
