## Context

`OverviewPage.tsx` renders `trip.departureNotes` and `trip.returnNotes` as plain `<p>` elements with `whitespace-pre-wrap`. The notes are free-form strings stored in the backend and returned via the trips API. There is currently no formatting support.

## Goals / Non-Goals

**Goals:**
- Render markdown syntax in `departureNotes` and `returnNotes` on the Overview page
- Support common GFM elements: bold, italic, bullet lists, numbered lists, links, and line breaks
- Match the app's dark theme via Tailwind-styled component overrides
- Encapsulate rendering in a reusable `MarkdownContent` component

**Non-Goals:**
- Markdown editing UI (notes are edited via backend/API only)
- Sanitizing against XSS beyond what `react-markdown`'s default renderer provides
- Supporting all GFM extensions (tables, task lists, strikethrough are out of scope for now)

## Decisions

### Use `react-markdown` over `marked` or `snarkdown`

`react-markdown` renders to React elements rather than raw HTML, so no `dangerouslySetInnerHTML` is needed. It accepts a `components` prop for per-element Tailwind class overrides, which keeps styling consistent with the dark theme. `marked` would require sanitization and raw HTML injection. `snarkdown` is tiny but doesn't support lists, which are the most likely formatting pattern in trip notes.

**Alternatives considered:**
- `marked` + `DOMPurify`: more setup, raw HTML in the tree
- `snarkdown`: 1KB but no list support
- Custom regex parser: unnecessary complexity

### `remark-gfm` plugin included

GFM enables bullet lists (`-`/`*`) and bold (`**`), which are the two most common patterns users would add to trip notes. The plugin adds ~10KB and is pulled in alongside `react-markdown`.

### Single shared `MarkdownContent` component

Both `departureNotes` and `returnNotes` use the same rendering logic. A `MarkdownContent` component in `client-trips/src/components/` centralizes the Tailwind overrides and keeps `OverviewPage` clean.

## Risks / Trade-offs

- **Bundle size increase**: `react-markdown` + `remark-gfm` adds ~50KB to the client-trips bundle. The app is a small internal PWA; this is acceptable.
- **Existing note data**: Notes stored as plain text will still render correctly — markdown rendering is additive and gracefully handles plain text.
- **Link targets**: Rendered `<a>` tags will open in the same tab by default. Trip notes may include external links (flights, lodging). Override `a` component to add `target="_blank" rel="noopener noreferrer"`.
