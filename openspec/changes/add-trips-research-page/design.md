## Context

The trips app (`client-trips`) is a React 19 / React Router v7 PWA backed by a Hono + SQLite API. Trip content already flows through one path: pages call `api.trips.current()` → `GET /api/trips/current`, which returns a `Trip` whose markdown fields (e.g. `info_markdown`) are plain TEXT columns. Markdown is rendered by a single shared component, `client-trips/src/components/MarkdownContent.tsx`, using `react-markdown` + `remark-gfm`.

Current constraints that shape this design:

- `MarkdownContent` has a **fixed `components` map** styling only `p/strong/em/ul/ol/li/a/code`. There are **no overrides for headings or GFM tables**, so although `remark-gfm` parses tables, they render as unstyled default HTML on the dark `bg-gray-900` theme. Headings render as browser defaults with no `id`.
- There is **no Tailwind typography (`prose`) plugin**; all markdown styling is manual per element.
- The bottom `NavBar` is **hardcoded `<NavLink>`s** (Overview / Days / Info / Packing), not a data-driven array.
- There is **no research field** today; content must be added to the data model.

The research content is a single long GFM document (H2 sections, H3 subsections, tables, links, nested lists) intended to be read on a phone. Without in-page navigation it is unusable at that length.

## Goals / Non-Goals

**Goals:**
- Render a trip's research Markdown on a new `/research` page using the existing GFM renderer.
- Generate a table of contents **dynamically from the H2/H3 headings** of the content, with H3 nested under its parent H2, where tapping an entry scrolls to the section.
- Give every H2/H3 a stable `id` anchor and a small **"return to top"** control that scrolls back to the top/TOC.
- Make GFM **tables and headings render legibly** on the dark theme (benefits the Info page too).
- Persist and serve research markdown through the existing trips API, mirroring `info_markdown`.
- Cover the new behavior with tests (slug/TOC builder unit test + backend persistence test).

**Non-Goals:**
- No in-app authoring/editing UI for research content (set via the existing create/update API, like `info_markdown`).
- No full-text search, scroll-spy active-section highlighting, or collapsible TOC (possible future work).
- No new markdown features beyond what `remark-gfm` already provides.
- No new client app / subdomain — Caddy and deploy scripts are untouched.

## Decisions

### 1. Content source: new `research_markdown` TEXT column on `trips`
Mirror the established `info_markdown` pattern: add a `research_markdown` TEXT column via an inline `ALTER TABLE` migration in `src/db.ts` (following the `0020_trip_dates_and_info` precedent), surface it as `researchMarkdown` on the `Trip` type, include it in the repository read/write mapping and the `GET /api/trips/current` + create/update routes (`z.string().nullish()`).

- **Why over a static bundled `.md` file:** content is per-trip and already lives in the DB for every other field; bundling would diverge from the model and require a rebuild to change content.
- **Why over a separate `research` table:** it is one TEXT blob per trip with no sub-structure to query — a column is the simplest faithful representation and matches `info_markdown`.
- No new DB **table** is created, so `TABLE_NAMES` in `db.ts` is unchanged.

### 2. TOC + anchors derived from a single source-of-truth slug pass
Build the TOC and the heading `id`s from the **same deterministic pass over the markdown source string**, so a TOC link's `href` always matches the rendered heading's `id`.

- A pure helper `buildToc(markdown)` scans for `^##` / `^###` lines (ignoring fenced code blocks) and returns an ordered list of `{ level: 2 | 3, text, id }`. `id`s are slugified (lowercase, non-alphanumerics → `-`, trimmed) with a **dedup counter** (`-1`, `-2`, …) for repeated text.
- The same ordered list assigns ids to rendered headings: heading component overrides consume the precomputed list **by document-order index** (a counter incremented per H2/H3 as they render), rather than re-slugifying at render time. This avoids drift and handles duplicate heading text deterministically.
- **Why a source scan over rehype-slug/github-slugger:** keeps the slug algorithm under our control, adds **no new dependency**, and lets the TOC and the renderer share one code path. `rehype-slug` + `github-slugger` is the noted alternative (more "standard" slugs) but introduces two deps and a second slug algorithm to keep in sync. Revisit if we later want GitHub-compatible anchors.

### 3. Heading rendering & "return to top" via `components` override on `MarkdownContent`
Extend `MarkdownContent` to accept an **optional `components` prop merged over its defaults**, and add **table + heading base styling to the defaults**. The Research page passes H2/H3 overrides that render `<h2 id=…>`/`<h3 id=…>` plus a small "return to top" link/icon; the Info page automatically gains the improved table/heading styling without the return-to-top control.

- **Why extend the shared component instead of a separate renderer:** table/heading styling is generally useful (Info page benefits), and merging a `components` prop keeps a single renderer while letting Research add page-specific anchors. Defaults stay backward-compatible.

### 4. Navigation: native in-page anchors + CSS smooth scroll
TOC entries and return-to-top controls are plain `<a href="#id">` / `<a href="#research-top">` links. Smooth scrolling uses CSS `scroll-behavior: smooth`; headings get `scroll-margin-top` so they aren't flush against the viewport top. A `#research-top` anchor sits above the TOC as the return target.

- **Why anchors over JS `scrollIntoView` handlers:** less code, works without JS state, and is naturally accessible. Use `history.replaceState` (not push) on click if hash-history pollution proves annoying — minor, deferred.

### 5. Route & nav wiring
Add a `/research` route in `App.tsx` (wrapped in `AuthGuard` like the others) and a fifth `<NavLink>` in `NavBar.tsx` with an icon. Page layout reuses the standard container (`px-4 py-6 max-w-lg mx-auto`) and header style (`text-2xl font-bold text-white`). Empty/missing `researchMarkdown` shows a friendly empty state, consistent with how pages handle absent content.

## Risks / Trade-offs

- **TOC ids and rendered heading ids drift apart** → both are produced by the one `buildToc` pass consumed in document order; a unit test asserts that every TOC `id` is unique and matches the id the renderer would assign for the same source (including duplicate-heading cases).
- **Duplicate heading text in long content** (the sample has many repeated subsection patterns) → dedup counter guarantees unique ids; covered by the slug unit test.
- **Five items in a fixed bottom nav on small screens** could crowd horizontally → verify spacing on a narrow viewport; icons + short label already used for the existing four. If too tight, shorten labels (acceptable, low risk).
- **Large single-render markdown on mobile** (long document) → one render pass, no virtualization; acceptable for a static reference. Revisit only if profiling shows jank.
- **GFM table width on a `max-w-lg` mobile column** → wrap tables in an `overflow-x-auto` container so wide tables scroll horizontally instead of breaking layout.
- **Migration on existing DBs** → additive `ALTER TABLE ... ADD COLUMN research_markdown TEXT` is nullable and backward compatible; existing rows read as `null`/empty → empty state. Rollback is dropping the unused column (or leaving it; it is harmless).

## Migration Plan

1. Add the inline `research_markdown` migration in `src/db.ts` (idempotent column-add guard like existing migrations); update the SQLite trips repository read/write mapping and the `Trip` type.
2. Extend `routes/trips.ts` schemas/responses; update `openapi.yaml` (and `llm-context.md` if it documents trip fields).
3. Add `MarkdownContent` `components`-merge + table/heading default styling; add `buildToc` helper + unit test.
4. Add `ResearchPage`, route, and nav item.
5. Deploy is the normal push to `main` (server pulls, runs the additive migration on startup, rebuilds). No data backfill required; content is populated per-trip via the update API. Rollback: revert the commit; the leftover nullable column is inert.

## Open Questions

- Should the TOC be **sticky/collapsible** rather than a static block at the top? Deferred to a follow-up; static is sufficient for v1.
- Do we want **scroll-spy** highlighting of the active section in the TOC? Out of scope for v1, easy to add later given stable ids.
- Should the same H2/H3 anchor + return-to-top treatment also apply to the **Info page**? For now only table/heading *styling* is shared; anchors stay Research-only unless requested.
