## 1. useVersionGesture Hook

- [x] 1.1 Verify `useVersionGesture.ts` already uses event delegation (`document.addEventListener('click', handleClick)` filtering via `trigger.contains(e.target)`) — this was done in the previous session; confirm no further changes needed

## 2. VersionOverlay Component

- [x] 2.1 Change `VersionOverlay` to always render the corner trigger div (currently returns `null` when `!visible`): restructure to return a fragment with the always-present trigger div and the conditionally rendered overlay card
- [x] 2.2 Attach `internalLogoRef` to the corner trigger div (`ref={internalLogoRef}`)
- [x] 2.3 Style the trigger div: `fixed top-0 left-0 w-11 z-[9998]` with `style={{ height: 'var(--sat, 44px)' }}` and `aria-hidden="true"`

## 3. Verification

- [x] 3.1 Build `packages/ui` and confirm zero TypeScript errors
- [x] 3.2 Build any one client app (e.g., `npm run build:games`) and confirm zero TypeScript errors
- [x] 3.3 In the dev server, confirm triple-click in the top-left corner reveals the overlay
- [x] 3.4 Confirm triple-click elsewhere on the page does NOT trigger the overlay
