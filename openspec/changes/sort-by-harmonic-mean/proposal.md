## Why

When searching by actor or director, results are currently sorted by billing order — how prominently the person appeared in each film. For prolific performers this surfaces many minor or obscure credits above their best-known, highest-quality work. Sorting by a composite of TMDB's `vote_average` and `popularity` signals would put the most notable titles first.

## What Changes

- Person filmography results (`?person=true`) are re-sorted by a harmonic mean score computed from normalized `vote_average` and normalized `popularity`, descending, instead of ascending billing order.
- `vote_average` (0–10 scale) is normalized to [0, 1] by dividing by 10.
- `popularity` is normalized to [0, 1] relative to the maximum `popularity` value in the result set (divide each by the set maximum).
- Harmonic mean is computed as `2 / (1/norm_vote + 1/norm_pop)`, with zero-value guards to avoid division by zero (treat 0 as a near-zero floor).
- The `ExternalResult` type gains optional `voteAverage` and `popularity` fields so clients can display or further sort if needed.
- Title search results (`?person=false`) continue to use TMDB's native relevance ordering; this change is scoped to person filmography only.

## Capabilities

### New Capabilities

_(none — this change only modifies existing search behavior)_

### Modified Capabilities

- `tmdb-catalog-search`: The sort order requirement for person filmography results changes from ascending billing order to descending harmonic-mean score of normalized `vote_average` and `popularity`. The `ExternalResult` shape gains two optional numeric fields.

## Impact

- `src/routes/watch/external.ts` — replace billing-order sort with harmonic-mean sort in the person filmography branch
- `src/utils/tmdb.ts` — add normalization and harmonic mean helpers; expose `voteAverage` and `popularity` on `ExternalResult`
- `data/cache/external/titles/` — existing title cache entries lack `voteAverage`/`popularity`; cache misses will populate them, hits will serve stale entries without the new fields until the query cache expires (7 days); this is acceptable since the fields are optional
- No database schema changes; no frontend changes required (fields are additive)
