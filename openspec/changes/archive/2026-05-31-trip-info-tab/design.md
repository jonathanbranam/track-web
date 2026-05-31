## Context

The trips app has one page (OverviewPage) and one NavBar tab. The `Trip` type already includes `infoMarkdown: string | null`, the backend already stores and returns it, and `MarkdownContent` already handles `null` input gracefully. This change adds the Info tab as a thin read-only view over data that already flows through the existing `/api/trips/current` response.

## Goals / Non-Goals

**Goals:**
- Add an Info tab to the NavBar and a `/info` route.
- Render `trip.infoMarkdown` as a markdown page via the existing `MarkdownContent` component.
- Show an empty state ("No info added yet.") when the field is null or empty.
- Keep the existing OverviewPage unaffected.

**Non-Goals:**
- In-app editing of `infoMarkdown` — content is managed via API/CLI by the owner.
- Any new API routes — `infoMarkdown` is already in the trip response.
- New shared components or abstractions.

## Decisions

**Reuse the existing trip fetch, not a new API call.**
`infoMarkdown` is already returned by `GET /api/trips/current`. InfoPage fetches the current trip the same way OverviewPage does (direct fetch in a `useEffect`, or passed via a shared hook if one exists). No new route is warranted for a field that's already present on the trip record.

**Separate page component, not a tab-within-OverviewPage.**
The design calls for a dedicated `/info` route consistent with future tabs (Days, Packing). Each tab is its own page component with its own route — NavBar links navigate between pages. This is the established pattern in App.tsx.

**No shared trip-fetching hook in this change.**
OverviewPage fetches the trip locally. InfoPage will do the same — a shared hook would be the right refactor when more tabs exist, but introducing it now for two pages is premature. If a shared `useTripCurrent` hook already exists in the codebase, use it; otherwise, replicate the fetch pattern.

**NavBar icon: information circle.**
Consistent with the icon-per-tab pattern already used by Overview. An `ℹ` style circle SVG fits the "Info" label.

## Risks / Trade-offs

**Duplicate fetch on tab switch** → Both OverviewPage and InfoPage fetch `/api/trips/current` independently. On a slow connection, switching tabs causes a visible loading state. Acceptable for now; a shared trip context can address this when more tabs land.

**`infoMarkdown` can be large** → A very long markdown page renders fine in `MarkdownContent` but has no pagination or scroll anchoring. Acceptable — this is a reference page, not a live-updating feed.

## Open Questions

None — this change is fully specified. Decisions about a shared trip-fetch context are deferred to a future multi-tab refactor spec.
