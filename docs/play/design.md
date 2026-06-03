# Play App — Design

## App Concept

`play.branam.us` is a board game companion app for tabletop sessions. It augments physical games — it does not replace the rulebook, board, or components. Its job is to handle the bookkeeping that would otherwise require paper, a spreadsheet, or mental gymnastics: score tracking, round totals, turn order, timers, and game history.

The app is mobile-first and designed to live on the table — either on a shared device or on each player's phone.

---

## Design Principles

- **Session-first.** A session is the anchor. Players sit down, the session starts, and all game plays are children of it. No awkward "start a new game" flow from a blank home screen.
- **Flexible but not formless.** Most data is free-form enough to work for any game. Known games get templates that pre-fill structure; custom games get the same underlying tables with fewer labels.
- **Registered users are the norm; guests are the fallback.** Players are typically registered branam.us users. Guest names (no account) are allowed when someone new sits down. Guest play history can be retroactively linked to a registered account.
- **Multiple plays per session.** Playing Sushi Go or One Night Werewolf five times in a row should feel natural. Sessions contain multiple game plays; plays can be the same title repeatedly.

---

## Player Model

Players in a session are either registered users or named guests:

```
{ type: 'user', userId: number, displayName: string }
{ type: 'guest', name: string, guestId: string }  // guestId: local UUID, stable within the session
```

The session roster is stored as a JSON array. Individual game play rosters snapshot the session roster at play start and can diverge (add/remove players between plays without ending the session).

**Retroactive linking:** A guest slot in `play_results` stores a nullable `user_id`. At any point — including weeks later — the host can patch that slot to link the guest to a registered account. Once linked, the game appears in that user's history. The guest name is preserved for display continuity.

---

## Data Model

### Hierarchy

```
Session
  └── GamePlay  (one play of one game title; many per session, including repeats)
        ├── Round[]  (optional; for round-based scoring games)
        │     └── RoundScore per player
        └── PlayerResult per player  (final: rank, score, role, faction, meta)
```

### Tables

**`play_sessions`**
```sql
id            INTEGER PRIMARY KEY
user_id       INTEGER NOT NULL             -- host / creating user
name          TEXT                         -- optional label, e.g. "Game Night Jun 3"
started_at    TEXT NOT NULL               -- ISO 8601 UTC
ended_at      TEXT                        -- null while in progress
roster        TEXT NOT NULL DEFAULT '[]'  -- JSON: Array<PlayerSlot>
```

`PlayerSlot` JSON shape:
```json
{ "type": "user", "userId": 1, "displayName": "Jon" }
{ "type": "guest", "guestId": "abc-123", "name": "Sarah" }
```

**`play_games`**
```sql
id          INTEGER PRIMARY KEY
slug        TEXT NOT NULL UNIQUE    -- e.g. 'root', 'sushi-go', 'secret-hitler'
name        TEXT NOT NULL           -- display name
template    TEXT NOT NULL DEFAULT '{}'  -- JSON: GameTemplate (see below)
is_builtin  INTEGER NOT NULL DEFAULT 0
```

**`play_gameplay`**
```sql
id            INTEGER PRIMARY KEY
session_id    INTEGER NOT NULL REFERENCES play_sessions(id) ON DELETE CASCADE
game_id       INTEGER NOT NULL REFERENCES play_games(id)
play_number   INTEGER NOT NULL DEFAULT 1   -- nth play of this game in the session
started_at    TEXT NOT NULL
ended_at      TEXT
roster        TEXT NOT NULL DEFAULT '[]'   -- JSON: snapshot of active players this play
winner        TEXT                         -- player name or null
uses_rounds   INTEGER NOT NULL DEFAULT 0  -- 1 = round-based scoring
meta          TEXT NOT NULL DEFAULT '{}'   -- game-specific JSON
```

**`play_rounds`**
```sql
id          INTEGER PRIMARY KEY
gameplay_id INTEGER NOT NULL REFERENCES play_gameplay(id) ON DELETE CASCADE
round_num   INTEGER NOT NULL
scores      TEXT NOT NULL DEFAULT '{}'  -- JSON: { playerKey: score }
```

**`play_results`**
```sql
id          INTEGER PRIMARY KEY
gameplay_id INTEGER NOT NULL REFERENCES play_gameplay(id) ON DELETE CASCADE
player_key  TEXT NOT NULL      -- userId (stringified) or guestId
player_name TEXT NOT NULL      -- display name at time of play
user_id     INTEGER            -- nullable; links guest to registered account (retroactive OK)
score       INTEGER
rank        INTEGER            -- 1 = winner
role        TEXT               -- game-specific: "Fascist", "Marquise de Cat", etc.
faction     TEXT               -- game-specific: "Eyrie Dynasties", "Alliance"
meta        TEXT NOT NULL DEFAULT '{}'   -- any other game-specific fields
```

### GameTemplate JSON

Templates define the fields that the UI should prompt for when recording results for a known game. Example for Root:

```json
{
  "usesRounds": false,
  "factionChoices": ["Marquise de Cat", "Eyrie Dynasties", "Woodland Alliance", "Vagabond", "Riverfolk", "Corvid Conspiracy", "Underground Duchy", "Lizard Cult"],
  "resultFields": [
    { "key": "faction", "label": "Faction", "type": "select", "choices": "$factionChoices" },
    { "key": "score",   "label": "Score",   "type": "number" }
  ]
}
```

For Sushi Go:
```json
{
  "usesRounds": true,
  "roundCount": 3,
  "resultFields": []
}
```

For Secret Hitler / Avalon / One Night variants:
```json
{
  "usesRounds": false,
  "multiPlay": true,
  "resultFields": [
    { "key": "role",    "label": "Role",    "type": "text" },
    { "key": "outcome", "label": "Outcome", "type": "select", "choices": ["Liberal win", "Fascist win"] }
  ]
}
```

---

## Feature Areas

### 1. Session management

- Start a session: auto-fills today's date; optional name/location label
- Session roster: add players by searching registered users or typing a guest name
- Within a session: start a new game play (picks up the session roster)
- Remove or add players between game plays without ending the session
- End session explicitly or leave open (history is readable regardless)

### 2. Game plays

- Pick a game from the catalog (built-in titles + any custom ones previously entered)
- Or type a custom game title — creates a minimal `play_games` entry on the fly
- Adjust the roster for this specific play (late arrivals, someone stepped out)
- For known games: template-driven setup fields (factions, roles, etc.)
- Record winner and final scores; for round-based games, enter per-round scores and derive totals
- Multiple plays of the same game in a row: "Play again" — creates a new `play_gameplay` row with `play_number` incremented, carries roster forward

### 3. Per-round scoring

For games like Sushi Go, Pit, Uno, and One Night variants:

- Enter scores per player per round
- Running cumulative totals shown inline
- Winner derived automatically from final totals
- Configurable number of rounds (or open-ended: "add another round")

### 4. Turn order

- Display current turn order
- Randomize (shuffle roster)
- Rotate (shift first player by one)
- Pass turn: highlight the active player; advance with a tap

### 5. Turn timer

- Countdown timer with configurable duration
- Chess-clock mode: each player has an independent timer; tap to pass the clock to the next player
- Accumulated per-player times displayed
- Audio/visual alert on expiry (vibration on mobile)
- Pause / resume

### 6. Play history

- Per-user view: all game plays the user (or a linked guest) participated in
- Per-game view: all plays of a given title across all sessions — win rates, average scores, score distribution
- Session view: replay the arc of a session, all plays in order
- Filter by: date range, game title, player

---

## Built-in Game Templates

| Game | Key setup fields | Scoring |
|------|-----------------|---------|
| Root | Faction per player (choose from list), score | Total score; winner = highest |
| Vast | Role per player (Knight, Dragon, Goblin, Thief, Caves), win condition | Win condition reached; no score |
| Secret Hitler | Role per player (Liberal / Fascist / Hitler), outcome (policy track or assassination) | Outcome only; optional round-by-round voting in meta |
| Avalon | Role per player (Merlin, Percival, Morgana, Assassin, generic Good/Evil), quests | Quest pass/fail per round; side win |
| Sushi Go | Round-based scoring (3 rounds) | Per-round scores, totals auto-derived |
| Pit | Round-based (open-ended rounds) | Per-round commodity scores |
| Uno | Round-based (open-ended) | Per-round card-point totals |
| One Night Werewolf / Alien | Multi-play mode; role + winner per play | Winner per play |
| Piles | Multi-play mode; winner per play | Winner only |

Custom game: no template; free-form `meta` blob and a winner field.

---

## Multi-Play Sessions

For short games played back-to-back (One Night, Piles, Sushi Go), the flow is:

1. Session starts with a roster
2. First play of "One Night Werewolf" → enter roles, record winner → `play_gameplay` row 1
3. "Play again" → new `play_gameplay` row 2, `play_number: 2`, same roster carried forward
4. A player leaves → remove them from the active roster for play 3 onwards (session roster is unchanged; play roster snapshots the current active set)
5. Session history shows each play as a row: "One Night Werewolf — Play 1 — Jon won", "Play 2 — Sarah won", etc.

Win tracking per-session summary: "Jon: 3 wins / 5 plays" derived from `play_results.rank = 1` within the session.

---

## Tech Approach (for future implementation)

- New `client-play/` workspace; React 19 + Vite + Tailwind + PWA, same as other clients
- Dev port 6030 (next after trips at 6025)
- New API routes at `/api/play/*` on the shared Hono backend
- New SQLite tables via inline migration in `db.ts`
- Auth: `@repo/auth` session cookie required for host; guest names do not need accounts
- Subdomain `play.branam.us` — add to `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`, `openapi.yaml`, `llm-context.md`

---

## Open Questions

- **Timer alerts on locked phones.** Native browser timers pause when a phone sleeps. Options: Web Audio API (survives lock screen on some browsers), a push-notification approach (needs service worker + backend), or "good enough" — alert when the app is foregrounded. Start with the last; upgrade later.
- **Offline support.** Scoring often happens without reliable WiFi. The PWA service worker can cache the app shell. Active session state (scores in progress) could be persisted to `localStorage` as a crash buffer and synced on reconnect.
- **Role reveal screen.** Secret Hitler and Avalon need a way to show each player their role privately on their own phone without others seeing. This is a UX challenge on a shared device. Initial plan: skip it — roles are dealt physically, just recorded in the app after.
