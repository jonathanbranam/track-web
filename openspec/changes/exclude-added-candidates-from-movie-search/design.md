## Context

`EventDetailPage` in `client-watch` runs a debounced parallel search against `api.movies.list()` and `api.tv.list()` as the user types. Search results are shown in a dropdown for the user to pick a candidate to nominate. The full event detail — including the current `candidates` array — is already loaded in the component when search is active. No filtering is applied today, so movies and TV series already nominated appear in results; selecting one triggers a 409 from the server.

## Goals / Non-Goals

**Goals:**
- Exclude already-nominated titles from the candidate search dropdown using data already in component state.

**Non-Goals:**
- Server-side filtering (client-side is sufficient; server already enforces uniqueness via 409)
- Changing the search API or adding new query parameters

## Decisions

**Client-side filter over API query param**: The `candidates` array is available in `detail.candidates` at search time. Filtering in the `useEffect` after `Promise.all` resolves costs nothing and requires no API changes. A server-side param would add API surface for no benefit.

## Risks / Trade-offs

- **Stale candidates list**: If another participant adds a candidate between page load and search, the local filter won't reflect it — the server 409 still guards correctness. Acceptable; a full real-time sync would be disproportionate for this use case.
