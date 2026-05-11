# UI Prototypes: Integrated Add Component

Context: The ratings redesign removed the ability to add new titles to the ratings list. This component restores that — with a unified interface that searches both the local catalog and TMDB. If a title is found locally, the user can add it to their watchlist directly. If it's only on TMDB, the import + watchlist-add happens in one step.

The component should be reusable: first used on the Ratings page, but potentially also usable in the Events candidate flow.

---

## Prototype A: Cascade / Progressive Disclosure

**The user's suggested approach.** Single search input that does incremental local search. TMDB is a deliberate second step.

```
┌──────────────────────────────────────────┐
│ 🔍 Search titles…                    [✕] │
└──────────────────────────────────────────┘

  ── In your catalog ──
  Dune (2021) · Movie                 [+ Add]
  Dune: Part Two (2024) · Movie       [+ Add]

  ─────────────────────────────────────────
  [ 🌐 Search TMDB for "dune" ]
  ─────────────────────────────────────────

  (after clicking TMDB button)

  ── TMDB results ──
  Dune (2021)            Already added [+ Add]
  Dune: Part Two (2024)  Already added [+ Add]
  Dune: Prophecy (2024) · TV           [Import]
  Dune (1984) · Movie                  [Import]
  Children of Dune (2003) · TV         [Import]

  [ ← Back to local results ]
```

**How it works:**
- Typing triggers incremental local search (debounced ~200ms, `GET /api/watch/movies?q=…` + TV equivalent)
- Local "In catalog" results appear immediately with an [+ Add] button → calls watchlist upsert
- At the bottom: a "Search TMDB for '…'" button, only visible when there is a query
- Clicking TMDB button fires `GET /api/watch/external/search` and replaces the result area
- TMDB results already in the local catalog show "Already added" state but still allow [+ Add]
- TMDB-only results show [Import] → imports then adds to watchlist in one step

**Tradeoffs:**
- Pro: Two clear, sequential modes. User understands the cost difference (local = instant, TMDB = network).
- Pro: Minimal API calls — TMDB is only called on explicit intent.
- Pro: Matches how users likely think: "Do I already have it? No? Fine, search TMDB."
- Con: Reaching TMDB requires two interactions (type + click button).
- Con: Losing TMDB results requires clicking "Back" — state is one-at-a-time.

---

## Prototype B: Source Tabs

Explicit tabs below the input — Local and TMDB. The input stays the same; the active tab controls behavior and result set.

```
┌──────────────────────────────────────────┐
│ 🔍 dune                              [✕] │
└──────────────────────────────────────────┘
  [  Local ●  ] [  TMDB  ]

  Dune (2021) · Movie                 [+ Add]
  Dune: Part Two (2024) · Movie       [+ Add]

  ─ 2 results ─


  (after tapping TMDB tab)

┌──────────────────────────────────────────┐
│ 🔍 dune                         [Search] │
└──────────────────────────────────────────┘
  [  Local  ] [  TMDB ●  ] [Title] [Person]

  Dune (2021)            In catalog   [+ Add]
  Dune: Part Two (2024)  In catalog   [+ Add]
  Dune: Prophecy (2024) · TV          [Import]
  Dune (1984) · Movie                 [Import]
```

**How it works:**
- Local tab: incremental search, always live
- TMDB tab: shows the same query text, but search is only fired on explicit "Search" button press (avoids rate-limiting on every keystroke)
- Switching tabs preserves the query text
- TMDB tab also shows the Title / Person toggle (borrowed from `TmdbImportPanel`)

**Tradeoffs:**
- Pro: Clear source labeling. User always knows where results are from.
- Pro: TMDB search is opt-in (button press), avoiding accidental rate limit usage.
- Pro: Both modes visible at once in the tab bar — easy to switch back.
- Con: Tab switching feels like a mode change; users may miss the TMDB tab entirely.
- Con: Two different interaction models in one component (live vs. button-triggered).

---

## Prototype C: Blended Results

Single input, single search — both local and TMDB results merged into one list. Local results float to the top. A brief debounce (~300ms) fires both queries simultaneously.

```
┌──────────────────────────────────────────┐
│ 🔍 dune                              [✕] │
└──────────────────────────────────────────┘

  ── In your catalog ──────────────────────
  Dune (2021) · Movie                 [+ Add]
  Dune: Part Two (2024) · Movie       [+ Add]

  ── From TMDB ────────────────────────────
  Dune: Prophecy (2024) · TV          [Import]
  Dune (1984) · Movie                 [Import]
  Children of Dune (2003) · TV        [Import]
  ─────────────────────────────────────────
```

**How it works:**
- One debounced fetch fires both `GET /api/watch/movies?q=…` (local) and `GET /api/watch/external/search` (TMDB) in parallel
- While TMDB is loading, local results show immediately (fast path)
- Local catalog items appear first with a subtle divider; TMDB-only below
- TMDB results that are already in the local catalog are either hidden (to avoid duplication) or shown with a badge

**Tradeoffs:**
- Pro: One interaction, most complete picture. Feels seamless.
- Pro: Local results appear instantly; TMDB fills in below.
- Con: Every keystroke fires a TMDB API call — cost, rate limit, and latency risk.
- Con: TMDB results for short queries (e.g. "d") could be noisy/useless.
- Con: More complex deduplication logic between local and TMDB results.
- Mitigation: Only fire TMDB after a minimum query length (e.g. 3+ chars) and a longer debounce (500ms).

---

## Prototype D: Bottom Sheet / Overlay

The ratings page stays clean. A prominent [+] button (or FAB) opens a full-height bottom sheet dedicated to adding. The sheet contains whichever search approach from the above options.

```
  Ratings page (normal state):
  ┌──────────────────────────────────────────┐
  │ Ratings                             [+] ↑│
  │ [Movies] [TV]             [Seen (3)]     │
  │                                          │
  │  Oppenheimer (2023)              ++ ████ │
  │  Succession · S4                 ++ ████ │
  │  Parasite (2019)                 +  ████ │
  │  The Bear · S2                   +  ████ │
  │                                          │
  └──────────────────────────────────────────┘

  After tapping [+]:
  ┌──────────────────────────────────────────┐
  │ ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ │
  │ Add to Ratings                      [✕] │
  │ ┌──────────────────────────────────┐    │
  │ │ 🔍 Search titles…               │    │
  │ └──────────────────────────────────┘    │
  │ [Movies] [TV]                           │
  │                                         │
  │  ── In your catalog ──                  │
  │  (local results appear here)            │
  │                                         │
  │  [ 🌐 Search TMDB for "…" ]            │
  │                                         │
  └──────────────────────────────────────────┘
```

**How it works:**
- A [+] button in the ratings page header opens the sheet (slides up from bottom)
- Inside the sheet: any of the search UX patterns above (Prototype A is recommended here)
- After adding, the sheet either closes or stays open to allow adding multiple titles
- The sheet dismisses on [✕], backdrop tap, or swipe down

**Tradeoffs:**
- Pro: Ratings list is never cluttered by search state. Clean separation.
- Pro: Full-height gives room for long result lists on mobile.
- Pro: Familiar iOS/Android sheet pattern — easy to understand.
- Con: More implementation complexity (sheet animation, focus management, scroll locking).
- Con: Can't see the ratings list while searching — no side-by-side context.

---

## Prototype E: Inline Expandable Panel

A compact [+ Add] button inline in the page header. Tapping it inserts an expansion panel between the filter bar and the ratings list. The list below scrolls normally; the panel is part of the flow.

```
  Collapsed:
  ┌──────────────────────────────────────────┐
  │ Ratings                                  │
  │ [Movies] [TV]     [Seen (3)]    [+ Add]  │
  │                                          │
  │  Oppenheimer (2023)              ++ ████ │
  └──────────────────────────────────────────┘

  Expanded:
  ┌──────────────────────────────────────────┐
  │ Ratings                                  │
  │ [Movies] [TV]     [Seen (3)]    [+ Add ▲]│
  │ ┌──────────────────────────────────────┐ │
  │ │ 🔍 dune                          [✕] │ │
  │ │ [Movies] [TV]                        │ │
  │ │                                      │ │
  │ │  Dune (2021) · Movie         [+ Rate]│ │
  │ │  Dune: Part Two (2024)       [+ Rate]│ │
  │ │                                      │ │
  │ │  [ 🌐 Search TMDB for "dune" ]      │ │
  │ └──────────────────────────────────────┘ │
  │                                          │
  │  Oppenheimer (2023)              ++ ████ │
  │  Succession · S4                 ++ ████ │
  └──────────────────────────────────────────┘
```

**How it works:**
- [+ Add] toggles the panel open/closed; the list below shifts down
- Panel has its own search input + movie/TV type toggle
- Local search is incremental; TMDB is the "Search TMDB" button at the bottom
- After adding a title, the panel stays open so the user can keep adding
- [✕] or tapping [+ Add] again closes the panel

**Tradeoffs:**
- Pro: User can see their ratings list while searching — context preserved.
- Pro: Simpler implementation than a bottom sheet (no overlay, no scroll locking).
- Pro: The panel position is clear and non-surprising.
- Con: On short screens with long results, the panel + list scroll can be confusing.
- Con: "Keyboard opens → layout shifts" is awkward on mobile without careful scroll anchoring.

---

---

## Prototype F: Transparent Import (Unified Catalog View)

**A model shift, not just a UI pattern.** Local and TMDB results are presented identically — the user never sees "Import" as an action. Titles are written to the local DB lazily, only when the user does something meaningful with them (rate, add to event, add to list). TMDB is treated as a read-only extension of the catalog, not a separate system to pull from.

Local search is incremental. TMDB search is **user-initiated only** — triggered by tapping a button or pressing Enter — never on keystrokes.

```
  Initial state (local incremental results):
  ┌──────────────────────────────────────────┐
  │ 🔍 dune                              [✕] │
  │                            [Search TMDB] │
  └──────────────────────────────────────────┘

  ── In your catalog ──
  Dune (2021) · Movie · 2h35m          [Rate]
  Dune: Part Two (2024) · Movie        [Rate]

  ─────────────────────────────────────────
  [ 🌐 Search TMDB ]   ← or press Enter
  ─────────────────────────────────────────


  After TMDB search (results merged, source invisible):
  ┌──────────────────────────────────────────┐
  │ 🔍 dune                              [✕] │
  │                            [Search TMDB] │
  └──────────────────────────────────────────┘

  Dune (2021) · Movie · 2h35m          [Rate]
  Dune: Part Two (2024) · Movie        [Rate]
  Dune: Prophecy (2024) · TV · S1      [Rate]
  Dune (1984) · Movie · 2h17m          [Rate]
  Children of Dune (2003) · TV · S1    [Rate]
```

No badges. No "Already in catalog." No "Import" button. Every card looks and behaves the same.

**How it works:**
- Typing triggers incremental local search (debounced ~200ms)
- "Search TMDB" button (or pressing Enter in the input) fires `GET /api/watch/external/search`
- Results are merged into one list: local results stay at top, TMDB-only results append below, but all cards are visually identical
- TMDB results that already exist locally are shown once (the local record takes precedence; dedup by `isDuplicate` flag)
- Tapping [Rate] on any card — local or TMDB-only — calls the same action. The server handles import atomically if needed:
  - Local title → `PUT /api/watch/movies/watchlist/:localId` (existing endpoint)
  - TMDB-only title → new endpoint (e.g. `PUT /api/watch/movies/watchlist/by-tmdb`) that imports the title first, then upserts the watchlist entry, returning the result in one call

**Backend changes required (not in the other prototypes):**

1. **`localId` in search results** — `GET /api/watch/external/search` currently returns `isDuplicate: true` and `localTitle` for matches, but no `localId`. The client needs the local ID to call the right watchlist endpoint when a TMDB result is already in the catalog. The response shape needs `localId?: number`.

2. **Import-on-action endpoint** — A new endpoint accepts TMDB result data + action parameters and handles the import atomically:
   ```
   PUT /api/watch/movies/watchlist/by-tmdb/:tmdbId
   body: { state, rating, tmdbResult: { title, releaseYear, ... } }
   → imports title if not already local, then upserts watchlist entry
   ```
   The client passes the full `ExternalResult` so the server doesn't need to re-fetch TMDB (it already has the metadata from the search).

3. **TV equivalent** — same pattern for `PUT /api/watch/tv/watchlist/by-tmdb/:tmdbId`.

**Edge cases to handle:**
- **Import fails** (TMDB down, API key missing): show inline error on the card ("Couldn't add this title — try again"). Don't expose the import concept in the error message.
- **Already-rated duplicates**: if a TMDB result is already local and already rated, ideally the [Rate] button shows the current rating rather than a neutral state. Requires `localId` + `rating` in the search result.
- **Fuzzy duplicate miss**: the Levenshtein-based dedup could miss a match (e.g. "The Bear" vs "Bear, The"). Result: same title appears twice. Worth tightening the match threshold or normalizing articles before comparison.

**Tradeoffs:**
- Pro: Cleanest possible UX — the user thinks in titles, not databases. No cognitive overhead of "is this in my catalog yet?"
- Pro: Local DB stays lean — only titles the user actually cares about are written.
- Pro: [Rate] as the primary action on every card is coherent with the Ratings page context.
- Con: Requires backend changes (2 new endpoints, `localId` in search shape) that the other prototypes don't need.
- Con: Import-on-action adds latency to the first interaction with a TMDB-only title (the import fetch happens inline). A loading state on the card is needed.
- Con: The "Search TMDB" trigger must still be explicit — so there's still a two-phase search (local incremental, then TMDB on demand). The result list *looks* unified, but the search experience still has two steps.

---

## Summary Comparison

| Prototype | Interactions to TMDB | Sees List While Adding | API Calls on Keypress | Backend Changes | Implementation Complexity |
|-----------|---------------------|----------------------|----------------------|-----------------|--------------------------|
| A: Cascade | 2 (type + button) | No | Local only | None | Low |
| B: Source Tabs | 3 (type + tab + button) | No | Local only | None | Medium |
| C: Blended | — (removed; keypress TMDB ruled out) | — | — | — | — |
| D: Bottom Sheet | 2 (tap + type + button) | No | Local only | None | High (sheet UX) |
| E: Inline Panel | 2 (tap + type + button) | Yes | Local only | None | Low–Medium |
| F: Transparent Import | 2 (type + button) | No | Local only | Yes (2 endpoints + localId) | Medium–High |

**Recommendation before prototyping:** A and E require no backend changes and are the lowest-friction builds. F is the most ambitious — worth prototyping the UI first with mocked import latency to validate the feel before building the backend. A good sequence would be: build A or E first to restore basic functionality, then prototype F to evaluate the unified-catalog model.
