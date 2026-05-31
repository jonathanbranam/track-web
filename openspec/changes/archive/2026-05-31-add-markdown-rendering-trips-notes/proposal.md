## Why

The `departureNotes` and `returnNotes` fields in the trips app are rendered as plain text, giving trip authors no way to add structure (lists, bold labels, links) without resorting to ASCII workarounds. Adding markdown rendering surfaces formatting the data likely already contains — or could easily use — without requiring a rich text editor.

## What Changes

- Install `react-markdown` and `remark-gfm` as dependencies in `client-trips`
- Replace the plain `<p>` elements rendering `departureNotes` and `returnNotes` in `OverviewPage.tsx` with a shared `<MarkdownContent>` component
- `<MarkdownContent>` applies Tailwind-styled `components` overrides so rendered elements match the app's dark theme
- `whitespace-pre-wrap` removed from the notes rendering path (markdown handles whitespace)

## Capabilities

### New Capabilities

- `trips-markdown-notes`: Client-side markdown rendering for trip freeform note fields (`departureNotes`, `returnNotes`) using `react-markdown` with GFM support and Tailwind-styled output

### Modified Capabilities

_(none — no existing spec-level behavior changes)_

## Impact

- **Files changed**: `client-trips/src/pages/OverviewPage.tsx`, new `client-trips/src/components/MarkdownContent.tsx`
- **Dependencies added**: `react-markdown`, `remark-gfm` (client-trips only)
- **Backend/API**: No changes
- **Other apps**: No impact — `react-markdown` is scoped to `client-trips`
