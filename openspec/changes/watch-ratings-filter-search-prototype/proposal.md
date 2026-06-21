## Why

The existing "Add Search" prototypes (A–F) require a separate "+ Add" gesture to open a search panel. This prototype explores collapsing filter and search into a single always-on search bar so users can filter their ratings list and discover new titles in one uninterrupted flow.

## What Changes

- Adds a new prototype `add-search-g` to `client-proto` with the label "Add Search G: Filter + Search"
- Replaces the separate filter-chip row and "+ Add" toggle with a single persistent search bar beneath the page header
- When the search bar has text:
  - The ratings list is filtered in-place to titles matching the query (no re-sort; existing rating sort order preserved)
  - A section divider and header appear below the filtered ratings listing unrated catalog items that match
  - Clicking a rating button on an unrated catalog item adds it to the rated list immediately
  - A second section divider and header appear below the catalog section with TMDB search results (same card/row UI)
- When the search bar is empty the ratings list shows unfiltered (full list, existing sort)
- Uses the same debounce + simulated TMDB delay pattern as prototype F
- Adds registry entry to `src/registry.ts`

## Capabilities

### New Capabilities
- `ratings-inline-search`: Single always-on search bar that simultaneously filters the rated list and surfaces unrated catalog and TMDB results in stacked sections below

### Modified Capabilities
<!-- None — existing prototypes are write-once and untouched -->

## Impact

- New file: `client-proto/src/prototypes/add-search-g/index.tsx`
- `client-proto/src/registry.ts` — one new entry
- No backend changes; all data is hard-coded in the prototype
- No shared packages touched (prototype is self-contained per authoring rules)
