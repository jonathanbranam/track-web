## Why

The personal rating field exists in the data model but is never surfaced in the UI, leaving the core "what should we watch tonight?" use case underserved. The current watchlist organizes content by state (Want/Watching/Watched/Again), which forces users through an arbitrary filter before seeing their preferences — and gives no way to express a negative preference, see ratings across a group, or feed personal ratings into watch event suggestions.

## What Changes

- Replace the separate Movies and TV watchlist pages with a unified "Ratings" page sorted by personal rating
- Expose and enable editing of the personal rating field (currently stored but never shown)
- Add a filter bar: toggle content type (Movies / TV / both) and visibility of seen-but-not-again items; include all ratings including negative by default
- Replace the 4-item nav bar (Events / Movies / TV / People) with 3 items (Events / Ratings / People)
- Two sub-tabs within Ratings: "Ratings" (main view) and "My Lists" (placeholder, coming soon)
- TV series currently being watched are included in the default view
- When a candidate is added to a watch event, seed all invitees' event votes from their existing personal ratings (one-time copy at add time; later rating changes do not affect the vote)
- **BREAKING**: Remove real-time vote-to-rating seeding (currently voting in an event immediately seeds the watchlist rating); replace with post-completion backfill instead
- After event completion, copy event votes to personal ratings for invitees who have no existing rating for that item
- Add a "From My Ratings" panel in the event detail page for quickly adding candidates from your rated content
- Sort the event suggestions list by summed personal ratings of Yes/Maybe attendees, excluding No RSVPs

## Capabilities

### New Capabilities
- `unified-ratings`: Unified Movies + TV personal ratings page — filter bar, rating-first sort, MediaCard component replacing separate MovieCard/TvSeriesCard, two sub-tabs (Ratings | My Lists), and "Add to Event" integration from the ratings list

### Modified Capabilities
- `watch-watchlist`: Rating sync rules change — remove real-time vote-to-rating seeding; add (a) personal-rating-to-vote seeding at candidate-add time for all invitees, and (b) event-vote-to-personal-rating backfill at event completion for previously unrated items
- `watch-mobile-ui`: Navigation reduces from 4 tabs to 3 — Movies and TV merge into "Ratings"; `/movies` and `/tv` routes removed, `/ratings` added
- `watch-events`: Adding a candidate now triggers personal-rating-to-vote seeding for all invitees; event detail gains "From My Ratings" panel and suggestions sorted by summed attendee personal ratings

## UI Design

### Ratings Page

**Sub-tabs and navigation.** Two sub-tabs sit below the page title: "Ratings" (the main view) and "My Lists" (placeholder, coming soon). The bottom nav reduces from four tabs to three: Events, Ratings, People.

**Filter bar.** Two pill-style toggle buttons (Movies, TV) control content type visibility. Both are active by default. They are independent — either, both, or neither can be active — not a segmented control, which would imply mutual exclusion. Active pills use filled violet; inactive use a muted border style.

A separate "Seen" pill on the right side of the filter row controls whether items the user has marked as seen (and not flagged for again or currently watching) are included. It is off by default. When off, the pill label includes a count of hidden items in parentheses. Seen-but-again and currently-watching items are always included regardless of this toggle.

**Add-to row.** Above the card list, a persistent row reads: "Add to [Event|List dropdown] [specific event or list dropdown]". The first dropdown selects the target type; the second is contextual — showing upcoming events with a candidate count when Event is selected, or named lists with a count when List is selected. Counts use "shows" for domain consistency. When Event is selected and no upcoming events exist, the second dropdown is replaced with italic placeholder text ("No upcoming events"). This row persists at the top of the filter bar rather than appearing per-card, so the user sets the target once and acts on multiple items.

**Rating button.** Each card shows a compact rating button (~40×28px) in the top-right corner displaying the current rating label (-- − 0 + ++) with color-coded background: red tones for negative, gray for neutral, green/lime for positive. Items with no rating show "?" in muted gray. Single tap opens inline editing.

**Inline rating expansion.** Tapping the rating button expands that card in-place to show a full horizontal row of five rating buttons (−− − 0 + ++), matching the layout used for event voting. The selected value is highlighted with its color. An ✕ button dismisses without making a change. Only one card can be expanded at a time; tapping a different card's rating button closes the open one. This avoids a modal or bottom sheet, keeping the user in context and making it easy to rate multiple items in sequence.

**Per-card toggle pill.** Each card shows a small pill button below the title row indicating whether that item is currently in the selected event or list. The pill uses a filled dot (●) with violet text when included, and an open dot (○) with gray text when not. The pill label is the name of the selected event or list — not "Add" / "Remove" — so membership state is always visible without tapping. The pill is hidden when no valid target is selected (Event mode with no upcoming events, or no target chosen).

---

### Event Detail Page — "Add From My Ratings" Panel

The event detail page gains an expandable panel at the bottom of the Suggestions section, toggled by a text link ("▼ Add From My Ratings" / "▲ Hide"). The panel renders a compact list — each row is a single line showing a type badge (M / TV), title, personal rating badge, and an Add button. Items already in the event are omitted. The Add button shows a transient checkmark (~2 seconds) after tapping to confirm the action without dismissing the panel. Personal ratings are shown to inform the decision, but a title with no rating or a negative rating remains addable.

---

## Impact

**Frontend:**
- `client-watch/src/pages/MoviesWatchlistPage.tsx` — replaced by new `RatingsPage`
- `client-watch/src/pages/TvWatchlistPage.tsx` — replaced by new `RatingsPage`
- `client-watch/src/components/MovieCard.tsx` + `TvSeriesCard.tsx` — merged into a shared `MediaCard` component
- `client-watch/src/pages/EventDetailPage.tsx` — adds From My Ratings panel; suggestions sorted by summed attendee personal ratings
- `client-watch/src/App.tsx` — routing and nav changes; `/movies` and `/tv` routes removed, `/ratings` added

**Backend:**
- `src/repositories/sqlite/watch-event.repository.ts` — `addCandidate` seeds votes from personal ratings for all invitees; `completeEvent` backfills personal ratings from votes
- Vote endpoint: remove the real-time vote-to-rating seeding behavior
- Event detail endpoint updated to return suggestions sorted by summed attendee personal ratings (Yes/Maybe RSVPs only)
