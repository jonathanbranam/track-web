## Why

When adding candidates to a watch event, the movie/TV search results include titles that are already nominated — allowing the user to attempt a duplicate add that the server will reject with a 409. Filtering these out client-side gives immediate feedback and reduces confusion.

## What Changes

- The candidate search dropdown in `EventDetailPage` filters out any movie or TV result whose `id` already matches an existing candidate on the event.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `watch-events`: The candidate search UI SHALL exclude items already added as candidates for the event from search results.

## Impact

- `client-watch/src/pages/EventDetailPage.tsx` — filter `searchResults` against `candidates` array already available in component state; no backend or API changes needed.
