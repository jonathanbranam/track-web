## 1. Sort Infrastructure (`src/utils/tmdb.ts`)

- [x] 1.1 Add `PersonSortMode` type and `VALID_SORT_MODES` set covering all five modes
- [x] 1.2 Add `getPersonSortMode()` reading `TMDB_PERSON_SORT` env var at call time, defaulting to `decay`
- [x] 1.3 Add `PersonCreditEntry` interface (`{ item: Record<string, unknown>; billing: number }`)
- [x] 1.4 Add `hm2()` and `hm3()` private helpers with 0.001 floor guard
- [x] 1.5 Add `sortPersonCredits(entries)` dispatching across all five modes with relative-max popularity normalisation

## 2. Route Updates (`src/routes/watch/external.ts`)

- [x] 2.1 Add optional `voteAverage?: number` and `popularity?: number` fields to `ExternalResult`
- [x] 2.2 Update `normalizeMovieResult` to capture `vote_average` and `popularity` from raw TMDB item
- [x] 2.3 Update `normalizeTvResult` to capture `vote_average` and `popularity` from raw TMDB item
- [x] 2.4 Import `sortPersonCredits` and `getPersonSortMode` from `../../utils/tmdb`
- [x] 2.5 Replace inline billing sort in `searchByPerson` with `sortPersonCredits([...byId.values()])`
- [x] 2.6 Include active sort mode in person query cache key (`person:${getPersonSortMode()}`) so mode changes take effect without a cache clear

## 3. Admin CLI (`scripts/admin.ts`)

- [x] 3.1 Import `sortPersonCredits` and `getPersonSortMode` from `../src/utils/tmdb`
- [x] 3.2 Replace inline billing sort with `sortPersonCredits([...byId.values()])`
- [x] 3.3 Add `voteAverage` and `popularity` fields to the result mapping
- [x] 3.4 Include active sort mode in person query cache key to match route behaviour

## 4. Documentation

- [x] 4.1 Document `TMDB_PERSON_SORT` env var in `README.md` — list all five modes, note default is `decay`, note that changes take effect immediately (no restart or cache clear required)

## 5. Verification

- [x] 5.1 `npx tsc --noEmit` reports zero errors
- [x] 5.2 Run `npm run build:server` and confirm clean compile
