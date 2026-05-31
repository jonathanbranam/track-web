## 1. Database Migration

- [x] 1.1 Add migration `0020_trip_dates_and_info` to `src/db.ts` — use `PRAGMA table_info(trips)` guards to `ALTER TABLE trips ADD COLUMN start_date TEXT`, `end_date TEXT`, and `info_markdown TEXT`

## 2. Backend Types & Repository

- [x] 2.1 Add `startDate`, `endDate`, and `infoMarkdown` (all `string | null`) to the `Trip` interface in `src/repositories/interfaces.ts`
- [x] 2.2 Add `startDate`, `endDate`, and `infoMarkdown` to `CreateTripInput` and `UpdateTripInput` interfaces in `src/repositories/interfaces.ts` (all optional, nullable)
- [x] 2.3 Update `rowToTrip` in `src/repositories/sqlite/trip.repository.ts` to map the three new columns
- [x] 2.4 Update `create` in `SqliteTripRepository` to include the new fields in the INSERT statement
- [x] 2.5 Update `update` in `SqliteTripRepository` to include the new fields in the UPDATE statement

## 3. API Routes & Validation

- [x] 3.1 Update `createTripSchema` in `src/routes/trips.ts` to accept optional `startDate`, `endDate` (YYYY-MM-DD regex or null), and `infoMarkdown` (string or null)
- [x] 3.2 Update `updateTripSchema` in `src/routes/trips.ts` to accept the same optional nullable fields
- [x] 3.3 Verify all trip response paths (`POST`, `PUT`, `GET`, `GET /current`) include the three new fields

## 4. Frontend Types & Overview Page

- [x] 4.1 Add `startDate: string | null`, `endDate: string | null`, and `infoMarkdown: string | null` to the `Trip` type in `client-trips/src/types.ts`
- [x] 4.2 Update `OverviewPage.tsx` to render a formatted date range row ("Wed, Jul 1 – Fri, Jul 10") when both `startDate` and `endDate` are present, using `date-fns` `format` + `parseISO`
- [x] 4.3 Verify the date row is omitted when either date is null

## 5. Admin CLI

- [x] 5.1 Add `--start-date`, `--end-date`, and `--info-markdown` flags to `trips:create` in `scripts/admin.ts`
- [x] 5.2 Add `--start-date`, `--end-date`, and `--info-markdown` flags to `trips:update` in `scripts/admin.ts`
- [x] 5.3 Verify `trips:list --json` output includes the three new fields

## 6. Documentation

- [x] 6.1 Update `openapi.yaml` — add `startDate`, `endDate`, `infoMarkdown` to the Trip schema object and to the create/update request bodies
- [x] 6.2 Update `llm-context.md` to note the new trip fields and their purpose

## 7. Build Verification

- [x] 7.1 Run `npm run build:server` and confirm zero TypeScript errors
- [x] 7.2 Run `npm run build:trips` (or equivalent) and confirm zero TypeScript errors in the trips client
