# Play App — Session & Setup Design

> Clarifies how game setup generalizes to cover round-scored competitive games
> (Sushi Go), rank/role competitive games (Root), and cooperative team games
> (Spirit Island) **without** introducing the separate `play_sessions` /
> `play_gameplay` table family sketched in `design.md`. That hierarchy is
> superseded — see the note at the top of `design.md`. The shipped
> `score_games` / `score_players` / `score_round_scores` tables (see
> `src/db.ts`, migration `0038_score_tracker`) are extended in place instead,
> because every one of these features is still "players + a game + what
> happened," just with more detail per game.

## Why extend, not replace

The real schema today:

```
score_games ──< score_players
      └───────< score_round_scores
```

This already covers the "Session = a scorekeeper + a name + a roster" shape.
What's missing to cover Spirit Island and Root is:

1. A per-player **role** (spirit / faction / character) — most games don't
   need it, some games are built around it.
2. Per-game **setup options** that vary by title (Root's map, landmarks,
   hirelings; Spirit Island has none) — freeform, not every game has the same
   fields.
3. A way to record a **cooperative team outcome** (win/loss) for games with no
   individual score — see `design-score-tracking.md` for why this is the only
   genuinely new "result" field needed.
4. A **turn timer** attached to the game or to individual players — see
   `design-turn-timer.md`.

None of these require a new hierarchy; they're new columns/tables hanging off
the existing `score_games` row.

## Schema additions

```sql
ALTER TABLE score_games   ADD COLUMN meta    TEXT NOT NULL DEFAULT '{}';  -- per-game setup options (map, landmarks, hirelings, ...)
ALTER TABLE score_games   ADD COLUMN outcome TEXT;                        -- 'win' | 'loss' | NULL — cooperative team result only
ALTER TABLE score_players ADD COLUMN role    TEXT;                        -- chosen spirit / faction / character
```

`meta` and `role` are intentionally freeform JSON/text rather than typed
columns per option — there's no admin UI for defining per-game fields (that
stays future work, see below), so the setup screen just needs somewhere to
stash whatever a game's static config says it needs.

## Per-game config stays static and client-side

Nothing here calls for the `play_games` / `GameTemplate` database table from
the old design — no one is asking for an in-app catalog editor yet (that
remains tracked in `docs/play/planning.md` under "Game catalog management
UI"). Instead, `client-play/src/gameDefaults.ts` (currently just a round-count
lookup) grows into the single source of truth for "what does this game's
setup screen need to ask for":

```ts
export interface GameConfig {
  rounds?: number
  roleLabel?: string          // e.g. "Spirit", "Faction" — omit if the game has no roles
  roleChoices?: string[]      // fixed list for a select; omit for freeform text
  setupFields?: SetupField[]  // extra per-game setup questions → written into score_games.meta
  timer?: TimerDefaults       // see design-turn-timer.md
  phases?: PhaseDef[]         // shared-clock phase list — coop games only
}

interface SetupField {
  key: string                 // meta JSON key, e.g. "map"
  label: string                // "Map"
  type: 'text' | 'select' | 'multiselect'
  choices?: string[]
}
```

Unknown/custom game names simply get no `GameConfig` — the setup screen falls
back to today's behavior (name + rounds + freeform players), no role field,
no extra setup fields. Roles and meta fields are only surfaced in the UI when
a config says to.

### Generic "Multiplayer" option

Writing a bespoke `GameConfig` entry is overkill for the common case of "some
game without a specific config that still wants a role per player and a turn
timer" — Root and Spirit Island justify their own entries because their
roles/phases are fixed and worth naming; most games don't. So the game
picker gets one more built-in entry, always present alongside real titles
(`score_game_names` + anything typed in) and separate from "totally bare
custom game":

```ts
'multiplayer': {
  roleLabel: 'Role',      // freeform text input, no roleChoices — anything goes
  timer: { mode: 'configurable' },  // user picks shared-vs-per-player, direction, alert at setup time
}
```

Picking "Multiplayer" from the dropdown gets you: a plain-text "Role" field
per player (skippable), and a timer setup step where the host chooses
per-player chess clock vs. a shared clock, count-up vs. count-down, and an
optional alert — instead of those being baked into a static config, they're
just asked for interactively. This is the fallback for "custom game, but I
still want the role + timer machinery," sitting between "fully bare custom
game" (today's behavior, no extra fields at all) and "fully specced game"
(Root/Spirit Island, fixed choices baked in).

### Worked example: Spirit Island

```ts
'spirit island': {
  roleLabel: 'Spirit',
  roleChoices: ['Lightning\'s Swift Strike', 'Vital Strength of the Earth', 'Shadows Flicker Like Flame', /* ... */],
  timer: { mode: 'shared' },
  phases: [
    { name: 'Spirit Phase',   checklist: ['Growth', 'Gain energy', 'Choose & play powers'] },
    { name: 'Fast Powers',    checklist: ['Resolve fast power cards in order'] },
    { name: 'Invader Phase',  checklist: ['Blighted Island check', 'Fear', 'Ravage', 'Build', 'Explore', 'Advance card'] },
    { name: 'Slow Powers',    checklist: ['Resolve slow power cards in order'] },
    { name: 'Time Passes',    checklist: ['Damage recovers', 'Elements fade', 'Discard used cards'] },
  ],
}
```

No `rounds` — Spirit Island isn't round-scored; the phase list is its own
cycle (see `design-turn-timer.md` for how the shared clock loops it).

### Worked example: Root

```ts
'root': {
  roleLabel: 'Faction',
  roleChoices: ['Marquise de Cat', 'Eyrie Dynasties', 'Woodland Alliance', 'Vagabond', 'Riverfolk', 'Corvid Conspiracy', 'Underground Duchy', 'Lizard Cult'],
  setupFields: [
    { key: 'map',       label: 'Map',       type: 'select', choices: ['Autumn', 'Winter', 'Lake', 'Mountain'] },
    { key: 'landmarks', label: 'Landmarks', type: 'multiselect', choices: ['Tower', 'Ferry', 'Marketplace', 'Ruins'] },
    { key: 'hirelings', label: 'Hirelings', type: 'multiselect', choices: [/* ... */] },
  ],
  timer: { mode: 'per-player', direction: 'up', alertSeconds: null },
}
```

Root turns out to need **no new scoring mechanism at all** — VP is tracked
per-round exactly like Sushi Go, just with a role and a chess clock layered
on. See `design-score-tracking.md`.

## Open questions

- Should `setupFields`/`roleChoices` support anything beyond flat string
  lists (e.g. Root landmark counts, faction-specific expansion toggles)? Start
  minimal; extend the `SetupField.type` union if a real game needs more.
- Retroactive editing: today's "Edit setup" flow (`ScorePage.tsx`) prefills
  name/rounds/players. It needs to grow to prefill `role` and `meta` too —
  straightforward extension, not a design question, but noting it so it isn't
  missed.
