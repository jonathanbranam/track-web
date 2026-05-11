## Context

The unified Ratings page replaced the old MoviesWatchlistPage, which had a "Browse →" link in its header pointing to `/movies/catalog`. That link was lost in the migration. The catalog route remains registered in App.tsx but is unreachable from the UI.

## Goals / Non-Goals

**Goals:**
- Restore a Browse link at the top of RatingsPage that navigates to `/movies/catalog`

**Non-Goals:**
- Adding catalog access for TV (TvCatalogPage route exists but was not linked from the old TV page either)
- Changing catalog page behavior or layout

## Decisions

**Use `<Link>` from react-router-dom** — same pattern as the old MoviesWatchlistPage; no new dependency needed.

**Place the link in the page header area** — matches the prior "Browse →" position (top-right of the heading row), consistent with existing pattern in the old watchlist pages.

## Risks / Trade-offs

None — single-file, no state or API changes, fully reversible.
