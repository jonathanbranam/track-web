## Context

Person filmography search (`?person=true`) currently sorts results by effective billing order — the cast position the person held in each film. This works for distinguishing lead roles from bit parts, but for prolific performers it surfaces minor or obscure credits above their best-known work. TMDB includes `vote_average` (0–10) and `popularity` (unbounded float) on every title in the credits response; these signals are currently ignored.

The sort change is entirely server-side, inside `searchByPerson` in `src/routes/watch/external.ts`. No database changes, no new endpoints, no frontend changes are required.

## Goals / Non-Goals

**Goals:**
- Replace billing-order sort with descending harmonic-mean score of normalized `vote_average` and `popularity`
- Expose `voteAverage` and `popularity` on `ExternalResult` so callers can inspect or further sort
- Handle zero/missing values safely (no division by zero, no NaN in output)

**Non-Goals:**
- Re-sorting title search results (`?person=false`) — TMDB's relevance ordering is adequate there
- Storing popularity/vote data in the local database
- Invalidating existing title cache entries — stale entries will serve without the new fields until the 7-day query cache expires; callers treat them as optional so this is safe

## Decisions

### Normalization strategy for `popularity`

`vote_average` has a fixed 0–10 scale, so dividing by 10 gives a clean [0,1] value.

`popularity` is unbounded — typical values range from < 1 to > 1000. Two options:

| Strategy | Pro | Con |
|---|---|---|
| **Relative to result-set max** | Always uses full [0,1] range; no tuning needed | Scores are incomparable across different queries |
| Fixed global cap (e.g. divide by 500) | Scores are stable across queries | Cap is arbitrary and will clip extreme outliers |

**Decision: relative normalization** (divide each item's popularity by the max popularity in the result set). For a person filmography the set is well-defined and fixed, so within-set comparison is exactly what we want.

### Harmonic mean formula and zero-value guard

Harmonic mean of two values in (0,1]: `2 / (1/a + 1/b)`

If either input is 0 the formula is undefined. Some TMDB entries have `vote_average: 0` (no votes yet) or `popularity: 0` (very obscure titles).

**Decision:** clamp each normalized value to a floor of `0.001` before applying the formula. This pushes zero-signal items to the bottom without producing NaN or Infinity. Titles with genuine scores above 0.001 are unaffected.

### Where to implement the helpers

Add pure functions `normalizePopularity(items)` and `harmonicMean(a, b)` in `src/utils/tmdb.ts` alongside the existing genre and normalization helpers. `searchByPerson` in `external.ts` calls them after deduplication.

### Cache compatibility

Existing title cache files (written before this change) lack `voteAverage` and `popularity`. The `ExternalResult` type will declare them as optional (`voteAverage?: number; popularity?: number`). When a cache hit returns results without these fields, `searchByPerson` will still attempt the harmonic mean sort — treating missing values as 0 (floored to 0.001). This degrades gracefully: old cached entries cluster at the bottom until the query cache expires and a fresh fetch populates the fields.

## Risks / Trade-offs

- **Relative normalization is query-scoped** → Two different searches for the same person return the same sort order, but absolute scores differ between them. Acceptable since results are always presented as a ranked list, not with visible scores.
- **`vote_average: 0` for very new releases** → These will be treated similarly to obscure titles with no votes. Workaround: the popularity signal usually compensates for fresh blockbusters.
- **Stale cache entries sort to bottom** → A 7-day window where previously-cached person filmography results may have some entries sort oddly. Acceptable; can be manually busted by clearing `data/cache/external/`.

## Migration Plan

No data migrations. No deploy coordination needed. Changes are purely in application logic:
1. Extend `ExternalResult` type with optional fields
2. Add helpers to `src/utils/tmdb.ts`
3. Update `normalizeMovieResult` / `normalizeTvResult` to capture `vote_average` and `popularity` from raw TMDB items
4. Replace the billing-order sort in `searchByPerson` with harmonic-mean sort

Rollback: revert the three changed files; no persistent state is affected.

## Open Questions

_(none)_
