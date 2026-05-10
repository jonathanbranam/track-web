## 1. Shared Component

- [x] 1.1 Create `client-watch/src/components/CastPreview.tsx` — stateless component accepting `director: string | null`, `cast: { name: string; billingOrder: number }[]`, `showFullCast: boolean`, and `onToggleFullCast: () => void`; renders director label, top-3 actors preview, and the "Full cast" toggle with secondary list

## 2. MovieCard

- [x] 2.1 Remove the chevron `<span>` (▾/▴) from the title row in `MovieCard.tsx`
- [x] 2.2 Replace the inline director/cast rendering in `MovieCard.tsx` with the new `CastPreview` component, passing `showFullCast` and `onToggleFullCast` from the existing local state

## 3. TvSeriesCard

- [x] 3.1 Remove the chevron `<span>` (▾/▴) from the title row in `TvSeriesCard.tsx`
- [x] 3.2 Replace the inline director/cast rendering in `TvSeriesCard.tsx` with the `CastPreview` component, passing `showFullCast` and `onToggleFullCast` from the existing local state

## 4. EventDetailPage

- [x] 4.1 Remove the chevron `<span>` (▾/▴) from the candidate card title row in `EventDetailPage.tsx`
- [x] 4.2 Add `showFullCastId` state (string | null) to `EventDetailPage` to track which candidate has the full cast list open; reset to null when the expanded candidate changes
- [x] 4.3 Render `CastPreview` inside the expanded candidate panel, passing `director` and `cast` from the already-fetched candidate detail, plus the full-cast toggle state and handler

## 5. Verify

- [x] 5.1 Build `client-watch` (`npm run build:watch`) and confirm zero TypeScript errors
