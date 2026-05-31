## 1. Install Dependencies

- [ ] 1.1 Add `react-markdown` and `remark-gfm` to `client-trips/package.json` and run `npm install`

## 2. Create MarkdownContent Component

- [ ] 2.1 Create `client-trips/src/components/MarkdownContent.tsx` with a `ReactMarkdown` wrapper and Tailwind-styled `components` overrides for `p`, `strong`, `em`, `ul`, `ol`, `li`, `a`, and `code`
- [ ] 2.2 Override `a` component to add `target="_blank" rel="noopener noreferrer"` on all links
- [ ] 2.3 Ensure the component accepts a nullable `string | null` and renders nothing (or a fallback) when null

## 3. Update OverviewPage

- [ ] 3.1 Replace the `<p className="... whitespace-pre-wrap ...">` element for `departureNotes` with `<MarkdownContent>` in `OverviewPage.tsx`
- [ ] 3.2 Replace the equivalent element for `returnNotes` with `<MarkdownContent>`
- [ ] 3.3 Verify the null/empty fallback placeholder messages still display correctly

## 4. Verify

- [ ] 4.1 Build `client-trips` (`npm run build:watch` or equivalent) and confirm zero TypeScript errors
- [ ] 4.2 Manually test in the browser: plain text notes render unchanged, markdown syntax (bold, list, link) renders correctly, links open in a new tab
