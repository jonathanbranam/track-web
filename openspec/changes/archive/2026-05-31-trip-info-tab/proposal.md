## Why

The trips app stores `info_markdown` on the trip record — lodging details, access codes, emergency contacts, and similar mid-trip reference material — but has no UI to show it. Family members currently have no way to view this information in the app.

## What Changes

- New `InfoPage` route (`/info`) renders the trip's `info_markdown` as a read-only markdown page.
- `info_markdown` is confirmed included in all trip API responses (already in the data model; this change adds explicit spec coverage for its presence in GET responses).
- NavBar gains an "Info" tab entry pointing to `/info`.
- Empty state when `infoMarkdown` is null: "No info added yet."

## Capabilities

### New Capabilities
- `trip-info-page`: InfoPage component — route, rendering, empty state, and NavBar integration for the Info tab.

### Modified Capabilities
- `trip-plan`: NavBar and routing gain an Info tab; this is a spec-level behavioral change to the app shell.

## Impact

- `client-trips/src/pages/InfoPage.tsx` — new file
- `client-trips/src/App.tsx` — new `/info` route
- `client-trips/src/components/NavBar.tsx` — new Info tab entry
- No schema or API changes required (backend already supports `info_markdown`)
