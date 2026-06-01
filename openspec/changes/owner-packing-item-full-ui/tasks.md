## 1. API Client

- [x] 1.1 Update `createPackingItem` in `client-trips/src/api.ts` to accept `section?: string` (default `''`) and include it in the POST body

## 2. PackingPage — Shared Sections (Owner)

- [x] 2.1 Add `addInputs` state (`Record<string, string>`) to `PackingPage`, keyed by composite key (`shared:<sectionName>` or `personal:<userId>`)
- [x] 2.2 Add `addingSection` state (`string | null`) to guard against concurrent submit
- [x] 2.3 Create a `makeAddHandler(key, section, userId?)` factory (or inline per-section handler) that reads `addInputs[key]`, calls `api.trips.createPackingItem` with the correct `section` and `userId`, appends the returned item to `items`, and clears the input on success
- [x] 2.4 Pass `onDelete={() => handleDelete(item.id)}` to each shared `ItemRow` when `userId === 1` (owner only)
- [x] 2.5 Render an `AddItemInput` at the bottom of each shared section when `userId === 1`, bound to `addInputs['shared:<sectionName>']`

## 3. PackingPage — Other Members' FYP Groups (Owner)

- [x] 3.1 Pass `onDelete={() => handleDelete(item.id)}` to `ItemRow` for every item in every member's FYP group (not just the owner's own) when `userId === 1`
- [x] 3.2 Render an `AddItemInput` at the bottom of every member's FYP group (including other members') when `userId === 1`, bound to `addInputs['personal:<memberUid>']` and using that member's `uid` as the `userId` arg to `createPackingItem`
- [x] 3.3 Remove the conditional that previously restricted add/delete controls to `uid === userId` in the owner's FYP group render block

## 4. Verify

- [x] 4.1 Build the trips client (`npm run build:watch`) and confirm zero TypeScript errors
- [ ] 4.2 Manually verify: owner sees trash icon on shared items and add input per shared section; delete a shared item and confirm optimistic removal and restore on error
- [ ] 4.3 Manually verify: owner sees add input and trash icons on other members' FYP groups; add an item to another member's FYP and confirm it appears with the correct `userId`; delete it and confirm removal
- [ ] 4.4 Manually verify: non-owner member sees no trash icons on shared items and no add input on shared sections; member's own FYP still has add input and trash icons
