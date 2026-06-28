## Why

Trip planning produces a large body of free-form research (airports, transit, neighborhoods, activities, restaurants, day-by-day suggestions) that doesn't fit the structured Overview / Days / Info / Packing pages. Today there is nowhere in the trips app to hold a long reference document, and a long markdown page with no navigation is hard to use on a phone. A dedicated Research page that renders this markdown with a jump-to-section table of contents and per-section "return to top" affordances makes the reference usable on the go.

## What Changes

- Add a new **Research** page to the trips app (`client-trips`) at `/research`, with a corresponding nav item in the bottom `NavBar`.
- The page renders trip research content authored in **Markdown** (GFM — including tables and links), reusing the existing `react-markdown` + `remark-gfm` setup.
- A **table of contents** is generated dynamically from the rendered content's `##` (H2) and `###` (H3) headings, rendered at the top of the page. Tapping an entry scrolls to that section. H3 entries are visually nested under their parent H2.
- Every section heading gets a small **"return to top"** icon/link that scrolls back to the table of contents (or page top).
- Headings receive stable, slug-based `id` anchors so TOC links and return-to-top links work via in-page navigation.
- Markdown rendering is extended to **style GFM tables and headings** (currently unstyled) so research content with tables renders legibly on the dark theme.
- Persist research content in a new `research_markdown` TEXT column on the trip record, mirroring the existing `info_markdown` field, and expose it through the existing `GET /api/trips/current` response and the trip create/update routes.

## Capabilities

### New Capabilities
- `trips-research`: A Research page in the trips app that renders a trip's research Markdown with a dynamically-generated table of contents (from H2/H3 headings), in-page anchor navigation, and per-section "return to top" links. Includes persisting and serving the research markdown content.

### Modified Capabilities
<!-- No existing spec captures trips markdown rendering or trip content fields at the requirement level, so there are no spec-level modifications. New table styling/heading-anchor behavior is introduced as part of the new capability. -->

## Impact

- **Frontend (`client-trips`)**:
  - New `pages/ResearchPage.tsx`; route registration in `App.tsx`; new nav item in `components/NavBar.tsx`.
  - `components/MarkdownContent.tsx` extended (or a research-specific renderer added) to: assign heading `id` anchors, render H2/H3 with return-to-top links, and style GFM `table`/`thead`/`tbody`/`tr`/`th`/`td` and headings.
  - TOC builder that derives entries from the H2/H3 headings in the markdown source.
  - `types.ts` gains a `researchMarkdown` field on `Trip`.
- **Backend (`src/`)**:
  - New `research_markdown` TEXT column on the trips table via an inline migration in `db.ts`.
  - `routes/trips.ts`: include `research_markdown` in the `current`/`get` responses and accept it in the create/update Zod schemas; repository read/write updated accordingly.
- **Docs / sync**: update `openapi.yaml` (trip schema gains `researchMarkdown`) and `llm-context.md` if trip content fields are documented there. No new subdomain/app, so Caddy/deploy scripts are unaffected.
- **Dependencies**: none new — `react-markdown` and `remark-gfm` are already dependencies.
