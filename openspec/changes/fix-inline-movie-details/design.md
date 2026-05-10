## Context

`MovieCard` and `TvSeriesCard` already render a cast preview section (director + top-3 actors) when expanded. `EventDetailPage` has its own inline expansion path for candidate cards — it fetches the same detail payload (including `director` and `cast`) via the lazy-fetch pattern but never renders those fields. Additionally, all three card surfaces render a small chevron (▾/▴) adjacent to the title; the proposal removes it because the tappable title itself is sufficient affordance.

## Goals / Non-Goals

**Goals:**
- Render director and cast preview in the expanded candidate panel on `EventDetailPage`, consistent with catalog and watchlist cards
- Remove the chevron icon from `MovieCard`, `TvSeriesCard`, and the candidate expansion in `EventDetailPage`
- Update affected specs to reflect the new requirements

**Non-Goals:**
- Changing the lazy-fetch, caching, or at-most-one-expanded logic
- Altering the full-cast secondary expansion behavior
- Any backend changes (cast data is already returned by the detail endpoints)

## Decisions

### Extract a shared `CastPreview` component

**Decision**: Create `client-watch/src/components/CastPreview.tsx` that encapsulates the director + top-actors section and the full-cast toggle.

**Rationale**: `MovieCard` and `TvSeriesCard` each contain identical cast rendering logic (~25 lines). Adding the same block a third time in `EventDetailPage` would create three diverging copies. A small shared component keeps the rendering consistent and is the only structural change needed to satisfy both goals.

**Alternatives considered**: Inline duplication in `EventDetailPage` — simpler in the short term but creates three diverging copies of the same UI pattern.

### Chevron removal is a pure deletion

**Decision**: Remove the `<span>` holding ▾/▴ from each card surface. No replacement affordance is added.

**Rationale**: The expand behavior is triggered by tapping the title text, which is already visually distinct (larger, styled differently than metadata). The chevron adds a pixel-level cue that is redundant with the title's tappability and clutters small-screen cards.

## Risks / Trade-offs

- **Discoverability regression**: Users who rely on the chevron as a visual hint that the card is tappable will no longer see it. Mitigated by the fact that this is a single-user app and the behavior is already established.
- **CastPreview coupling**: The new component takes `director`, `cast`, `showFullCast`, and `onToggleFullCast` as props — it has no internal state. If the full-cast toggle behavior ever needs to differ by surface, the component will need to be split. Acceptable given current scope.
