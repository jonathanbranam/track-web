## 1. Resting-state schema migration

- [x] 1.1 Replace `World`/`RestingState`'s `dialogue: { open: boolean; text: string }` field with `ui: ActiveUI` (`{ kind: 'none' } | { kind: 'dialogue'; speaker?: string; text: string; variant: 'say' | 'thought' } | { kind: 'menu'; menuKind: 'command' | 'status'; options: string[]; selectedIndex: number }`) in `precompute.ts`
- [x] 1.2 Add an `overlay: { kind: 'act-card' | 'headline' | 'title'; text: string } | null` field to `World`/`RestingState`, independent of `ui`
- [x] 1.3 Update every existing reader/writer of `.dialogue` in `precompute.ts` (`createInitialWorld`, `cloneWorld`, `restingStateToWorld`, `snapshotRestingState`, `applyAction`'s `startDialogue`/`say`/`endDialogue` cases) to the new `ui`/`overlay` fields
- [x] 1.4 Update `executors.ts`'s `InstantExecutor` (and its `startDialogue`/`say`/`endDialogue` handling) for the new `ui` shape

## 2. Action vocabulary additions

- [x] 2.1 Add `thought` to the `Action` union (`{ type: 'thought'; entity: string; text: string }`) and to `applyAction`, setting `ui: { kind: 'dialogue'; variant: 'thought'; ... }`
- [x] 2.2 Add `speaker` support to `startDialogue`/`say` (optional `speaker` field) and set `variant: 'say'` on the `ui` slot
- [x] 2.3 Add `showMenu`/`selectMenuOption`/`hideMenu` to the `Action` union and to `applyAction`, setting/updating/clearing the `ui: { kind: 'menu'; ... }` slot
- [x] 2.4 Add `showOverlay`/`hideOverlay` to the `Action` union and to `applyAction`, setting/clearing the `overlay` slot independently of `ui`
- [x] 2.5 Wire all new action types into `createExecutor` (`executors.ts`) — dialogue/menu/overlay actions complete instantly (`InstantExecutor`-style), matching Phase 2's pattern for non-animated state changes
- [x] 2.6 Promote `showOverlay`, `hideOverlay`, `showMenu`, `selectMenuOption`, `hideMenu` from Proposed to Established in `action-vocabulary.md`, with their final shapes

## 3. DOM overlay components

- [x] 3.1 Build `DialogueBox.tsx`: reads `useDirector().resting.ui`, renders a styled dialogue box for `variant: 'say'` and a visually distinct thought-bubble style for `variant: 'thought'`, showing `speaker` (if set) and `text`
- [x] 3.2 Build `MenuShell.tsx`: reads `useDirector().resting.ui` for `kind: 'menu'`, renders a command window (`menuKind: 'command'`) or status/inspection screen (`menuKind: 'status'`) with `options` and a highlight at `selectedIndex`; status screen stat rows render as literal placeholder text (e.g. "HP: --") for now
- [x] 3.3 Implement the menu-highlight transition as a single fixed 150ms step (CSS transition), not a continuous slide scaling with distance
- [x] 3.4 Build `TextCard.tsx`: reads `useDirector().resting.overlay`, renders a full-screen or overlaid card for `act-card`/`headline`/`title` kinds
- [x] 3.5 Mount `DialogueBox`, `MenuShell`, and `TextCard` as sibling components alongside the existing `Overlay.tsx` control bar in `RpgExperience.tsx`'s `Experience`, using the same `absolute inset-0 pointer-events-none z-10` layering convention (interactive parts opt back into `pointer-events-auto`)
- [x] 3.6 Style the command window per the "authentic, blue-bordered" direction locked in `idea-board.md` §9; treat dialogue box and status screen styling as implementation detail (Tailwind classes)

## 4. World-anchored positioning

- [x] 4.1 Add a `getScreenPosition(entityId): { x: number; y: number } | null` function to the game registry in `RpgExperience.tsx`'s `PhaserStage` (alongside the existing `getSnapshot` entry), backed by `TalkRpgScene`'s `cameras.main` transform and each entity's `EntityView.container` position
- [x] 4.2 Implement `useWorldAnchor(entityId)`: polls `getScreenPosition` via `requestAnimationFrame` and writes the result as an imperative `style.transform` mutation on a ref (no `setState` per frame)
- [x] 4.3 Size/position the DOM overlay's anchored-element container to match the Phaser canvas's actual rendered `getBoundingClientRect()`, not the whole page, given no Phaser `Scale` mode is configured yet
- [x] 4.4 Wire `thought` (and any future world-anchored label) through `useWorldAnchor` so its bubble tracks its entity continuously, including during camera follow-smoothing between resting-state updates

## 5. Tests

- [x] 5.1 Unit tests for `RestingState.ui`/`overlay` reducer transitions: `startDialogue`→`say`→`endDialogue` clears to `{ kind: 'none' }`; `showMenu`→`selectMenuOption`→`hideMenu` likewise; `showOverlay`/`hideOverlay` independent of `ui`; a `showMenu` while `ui` is `dialogue` replaces it (never both set)
- [x] 5.2 Headless precompute tests: a script exercising every new action asserts the cached resting state at each `stop` has the expected `ui`/`overlay` shape
- [x] 5.3 Update any existing test relying on the old `dialogue` field shape (`precompute.test.ts`, `directorEngine.test.ts`) to the new `ui` field

## 6. Verification

- [x] 6.1 Run `npm run test` and confirm all tests pass, including the extended `client-talks` suite
- [x] 6.2 Run `npm run build:talks` and confirm zero TypeScript errors
- [x] 6.3 Manually verify in the browser (Playwright screenshot, saved to `/tmp/track-verify/`): a dialogue box and thought bubble render correctly, a command menu opens with a moving selection highlight, a status screen shows placeholder stat text, a text card displays full-screen, a world-anchored bubble stays glued to its entity through a camera pan, and `back()`/`skipTo()` land the `ui`/`overlay` slots correctly with no stale content
- [ ] 6.4 Run the legibility pass: record or second-viewer-check a Zoom share of the dialogue box, command menu, status screen, and a text card; confirm text stays crisp and the menu-highlight transition doesn't smear; adjust styling/timing if it does
