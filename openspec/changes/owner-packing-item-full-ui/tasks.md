## 1. API Client

- [ ] 1.1 Update `createPackingItem` in `client-trips/src/api.ts` to accept `section?: string` (default `''`) and include it in the POST body

## 2. PackingPage — Shared Sections (Owner)

- [ ] 2.1 Add `addInputs` state (`Record<string, string>`) to `PackingPage`, keyed by composite key (`shared:<sectionName>` or `personal:<userId>`)
- [ ] 2.2 Add `addingSection` state (`string | null`) to guard against concurrent submit
- [ ] 2.3 Create a `makeAddHandler(key, section, userId?)` factory (or inline per-section handler) that reads `addInputs[key]`, calls `api.trips.createPackingItem` with the correct `section` and `userId`, appends the returned item to `items`, and clears the input on success
- [ ] 2.4 Pass `onDelete={() => handleDelete(item.id)}` to each shared `ItemRow` when `userId === 1` (owner only)
- [ ] 2.5 Render an `AddItemInput` at the bottom of each shared section when `userId === 1`, bound to `addInputs['shared:<sectionName>']`

## 3. PackingPage — Other Members' FYP Groups (Owner)

- [ ] 3.1 Pass `onDelete={() => handleDelete(item.id)}` to `ItemRow` for every item in every member's FYP group (not just the owner's own) when `userId === 1`
- [ ] 3.2 Render an `AddItemInput` at the bottom of every member's FYP group (including other members') when `userId === 1`, bound to `addInputs['personal:<memberUid>']` and using that member's `uid` as the `userId` arg to `createPackingItem`
- [ ] 3.3 Remove the conditional that previously restricted add/delete controls to `uid === userId` in the owner's FYP group render block

## 4. Verify

- [ ] 4.1 Build the trips client (`npm run build:watch`) and confirm zero TypeScript errors
- [ ] 4.2 Manually verify: owner sees trash icon on shared items and add input per shared section; delete a shared item and confirm optimistic removal and restore on error
- [ ] 4.3 Manually verify: owner sees add input and trash icons on other members' FYP groups; add an item to another member's FYP and confirm it appears with the correct `userId`; delete it and confirm removal
- [ ] 4.4 Manually verify: non-owner member sees no trash icons on shared items and no add input on shared sections; member's own FYP still has add input and trash icons
