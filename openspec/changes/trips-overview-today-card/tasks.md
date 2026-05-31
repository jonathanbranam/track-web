## 1. OverviewPage: Conditional Days Fetch

- [x] 1.1 Add `todayDay: TripDay | null` state to `OverviewPage` (import `TripDay` type from `../types`)
- [x] 1.2 Add a second `useEffect` that depends on `trip`: when `trip` is set, check if it is active (today's UTC date between `startDate` and `endDate` inclusive); if so, call `api.trips.days(trip.id)`, find the record matching today's date, and set `todayDay`; on error, leave `todayDay` as null
- [x] 1.3 Verify no secondary fetch fires when `startDate` or `endDate` is null, or today is outside the range

## 2. Today Card Component

- [x] 2.1 Render the Today card above the Departure section when `todayDay` is non-null: `bg-gray-800 rounded-lg` card with an indigo "Today" eyebrow label, a title (fall back to formatted date when `day.title` is empty), and the `body` rendered via `<MarkdownContent>` (omit body element when body is empty)
- [x] 2.2 Add a chevron icon at the right edge of the card to indicate it is tappable
- [x] 2.3 Wire `onClick` / `onKeyDown` to call `navigate('/days')` via `useNavigate`; wrap the card in a `<button>` or add `role="button"` with `tabIndex={0}` for keyboard accessibility

## 3. Build & Verify

- [x] 3.1 Run `npm run build:trips` (or equivalent) and confirm zero TypeScript errors
- [x] 3.2 Manually verify: with an active trip that has a day record for today, the Today card appears on Overview and tapping it navigates to the Days tab
- [x] 3.3 Manually verify: with an inactive trip (or no dates set), no Today card appears and no extra network request is made
