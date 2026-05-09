## 1. Implementation

- [ ] 1.1 In `client-watch/src/pages/EventDetailPage.tsx`, build a Set of already-nominated IDs from `detail.candidates` (separate sets for `movieId` and `seriesId`)
- [ ] 1.2 After the `Promise.all` in the search `useEffect`, filter `searchResults` to exclude any result whose `kind`/`id` matches a nominated candidate

## 2. Verification

- [ ] 2.1 Run `npm run build:watch` and confirm zero TypeScript errors
- [ ] 2.2 Manually verify: add a movie to the event, search for it by name — it should not appear in the dropdown
- [ ] 2.3 Manually verify: un-nominated titles still appear in search results
