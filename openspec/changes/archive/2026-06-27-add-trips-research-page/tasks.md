## 1. Backend: data model & API

- [x] 1.1 Add an inline, idempotent migration in `src/db.ts` that runs `ALTER TABLE trips ADD COLUMN research_markdown TEXT` (guarded like the existing `0020_trip_dates_and_info` info_markdown column-add)
- [x] 1.2 Add `researchMarkdown` to the `Trip` type/interface used by the repository layer (`repositories/interfaces.ts` and the SQLite trips repo)
- [x] 1.3 Map `research_markdown` ⇄ `researchMarkdown` in the SQLite trips repository read and write methods (create/update/get/current)
- [x] 1.4 In `src/routes/trips.ts`, add `researchMarkdown: z.string().nullish()` to the `createTripSchema` and `updateTripSchema`, and include `researchMarkdown` in the `GET /current`, `GET /`, and `GET /:id`-style responses
- [x] 1.5 Add a backend test covering persistence: creating/updating a trip with `researchMarkdown` returns it on the current-trip request, and a trip without it returns null/empty without error

## 2. Frontend: rendering & TOC utilities

- [x] 2.1 Add `researchMarkdown` to the `Trip` type in `client-trips/src/types.ts`
- [x] 2.2 Create a pure `buildToc(markdown)` helper (e.g. `client-trips/src/lib/toc.ts`) that scans `##`/`###` lines (skipping fenced code blocks), returns ordered `{ level: 2|3, text, id }` entries with slugified, dedup-counted ids
- [x] 2.3 Add a unit test for `buildToc` covering: H2/H3 extraction in order, ignoring H1 and H4+, and distinct ids for duplicate heading text
- [x] 2.4 Extend `client-trips/src/components/MarkdownContent.tsx` to accept an optional `components` prop merged over its defaults, and add default styling for GFM `table/thead/tbody/tr/th/td` (with an `overflow-x-auto` wrapper for wide tables) and for headings, legible on the dark theme

## 3. Frontend: Research page

- [x] 3.1 Create `client-trips/src/pages/ResearchPage.tsx` that loads the current trip via `api.trips.current()` and reads `researchMarkdown`
- [x] 3.2 Render a `#research-top` anchor + the table of contents from `buildToc`, with H3 entries nested under their parent H2 and each entry linking to its heading `id`
- [x] 3.3 Pass H2/H3 component overrides to `MarkdownContent` that render `<h2 id>`/`<h3 id>` (ids assigned in document order to match `buildToc`) each with a small "return to top" link targeting `#research-top`
- [x] 3.4 Add smooth-scroll behavior (CSS `scroll-behavior: smooth`) and `scroll-margin-top` on headings so anchored sections aren't flush to the viewport top
- [x] 3.5 Render a friendly empty state (no TOC) when `researchMarkdown` is missing/empty
- [x] 3.6 Use the standard page layout (`px-4 py-6 max-w-lg mx-auto`, `text-2xl font-bold text-white` header)

## 4. Frontend: routing & navigation

- [x] 4.1 Register the `/research` route in `client-trips/src/App.tsx`, wrapped in `AuthGuard` like the other pages, with a redirect fallthrough still intact
- [x] 4.2 Add a fifth `Research` `<NavLink>` (with an icon and active-state styling) to `client-trips/src/components/NavBar.tsx`; verify spacing on a narrow viewport

## 5. Docs & verification

- [x] 5.1 Update `openapi.yaml` so the trip schema includes `researchMarkdown` on responses and create/update request bodies
- [x] 5.2 Update `llm-context.md` if it documents trip content fields (note the new `researchMarkdown` field)
- [x] 5.3 Run `npm run build:server` and the trips client build and confirm zero TypeScript errors
- [x] 5.4 Run the test suite and confirm existing and new tests pass
- [x] 5.5 Manually verify in the browser: TOC lists H2/H3 in order with H3 nested, TOC links scroll to sections, return-to-top works from a section, tables render and scroll horizontally, and the empty state shows when no research content exists
