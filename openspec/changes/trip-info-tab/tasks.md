## 1. Frontend — InfoPage

- [x] 1.1 Create `client-trips/src/pages/InfoPage.tsx` — fetch `/api/trips/current`, render `infoMarkdown` via `<MarkdownContent>`, show "No info added yet." empty state when null or empty
- [x] 1.2 Add loading state and 404 empty state (no active trip) consistent with OverviewPage

## 2. Frontend — Routing and NavBar

- [x] 2.1 Add `/info` route to `client-trips/src/App.tsx` wrapped in `<AuthGuard>`, importing `InfoPage`
- [x] 2.2 Add "Info" tab to `client-trips/src/components/NavBar.tsx` after Overview, using an information-circle SVG icon and the existing `NavLink` active-state style

## 3. Build Verification

- [x] 3.1 Run `npm run build:trips` (or equivalent) and confirm zero TypeScript errors
