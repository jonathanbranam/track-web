**App**: home

## MODIFIED Requirements

### Requirement: App directory card grid
The home app SHALL display a grid of cards, one per branam.us app. Each card SHALL show the app name, a short description of its purpose, and a link to its subdomain. Cards SHALL open in the same tab. When running under the Vite dev server, card link targets SHALL be resolved against the current page's hostname so they point at the corresponding local development server instead of the production subdomain.

The full card inventory is:

| App | URL | Description |
|-----|-----|-------------|
| Time | time.branam.us | Time tracking — start/stop tasks with tags, review daily logs |
| Watch | watch.branam.us | Movie and TV tracking — watchlists, ratings, watch events with friends |
| Trips | trips.branam.us | Family trip log — days, packing lists, and notes |
| Games | games.branam.us | Casual games and leaderboards |
| Me | me.branam.us | Your account, people, and groups |
| Talks | talks.branam.us | Presentations and talk content |
| Food | food.branam.us | *(Coming soon)* |
| Admin | admin.branam.us | Admin console — deploys, backups, and user management *(admin only)* |
| Proto | proto.branam.us | Prototype workspace *(admin only)* |

#### Scenario: Standard user sees seven cards
- **WHEN** a non-admin authenticated user views the home page
- **THEN** cards for Time, Watch, Trips, Games, Me, Talks, and Food are displayed; Admin and Proto cards are not shown

#### Scenario: Admin user sees all nine cards
- **WHEN** the admin user (userId === 1) views the home page
- **THEN** all nine cards are displayed including Admin and Proto

#### Scenario: Food card shows Coming Soon
- **WHEN** any authenticated user views the Food card
- **THEN** the card is visually distinct (e.g., muted/disabled style) and has no clickable link

#### Scenario: App cards link to production subdomain
- **WHEN** a user clicks a non-disabled app card in a production build (not running under the Vite dev server)
- **THEN** the browser navigates to the app's `https://<app>.branam.us` subdomain URL, unchanged from today

#### Scenario: App cards link to local dev server on localhost
- **WHEN** the home app is running under the Vite dev server and the current page's hostname is `localhost`
- **THEN** clicking a non-disabled app card navigates to `http://localhost:<port>`, where `<port>` is that app's local dev server port

#### Scenario: App cards link to local dev server on a LAN IP
- **WHEN** the home app is running under the Vite dev server and the current page's hostname is a LAN IP address (e.g. `10.0.0.113`)
- **THEN** clicking a non-disabled app card navigates to that same IP address on the target app's local dev server port

#### Scenario: App cards link to matching DuckDNS hostname
- **WHEN** the home app is running under the Vite dev server and the current page's hostname matches `<slug>-branam-us.duckdns.org`
- **THEN** clicking a non-disabled app card navigates to `<target-app-slug>-branam-us.duckdns.org`, keeping the same protocol and no explicit port

#### Scenario: Card falls back to production URL when no dev port is known
- **WHEN** the home app is running under the Vite dev server and the target app has no entry in the shared dev port table
- **THEN** clicking that app's card navigates to its production subdomain URL, unchanged
