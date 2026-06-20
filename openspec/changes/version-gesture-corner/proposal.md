## Why

The triple-click trigger for the version overlay is bound to `document`, causing it to fire whenever any element on the page is triple-clicked. This is disruptive during normal app use (tapping nav links, game elements, list items). The gesture should be confined to a dedicated, out-of-the-way element that users will not hit accidentally.

## What Changes

- `VersionOverlay` renders a small, always-present invisible div anchored to the top-left corner of the screen, within the iOS safe-area inset (behind the status bar/notch). This element serves as the exclusive triple-click target.
- `useVersionGesture` changes from binding the click listener directly to a provided element to using event delegation on `document`, filtering clicks to only those that originate within the trigger element. This eliminates timing issues (the trigger div is always in the DOM).
- The triple-click target is no longer "the app name/logo in the navigation bar" — it is this fixed invisible corner zone. No per-app wiring or `logoRef` prop passing is needed.
- The 3-finger touch gesture (`touchstart` with `touches.length >= 3`) is unchanged.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `build-version-info`: The "Version gesture triggers" requirement changes — the triple-click target is now a fixed invisible element in the top-left safe-area corner rendered by `VersionOverlay`, not the nav bar logo/title element.

## Impact

- `packages/ui/src/components/useVersionGesture.ts` — event delegation click handling (already updated)
- `packages/ui/src/components/VersionOverlay.tsx` — always renders a small fixed div; `internalLogoRef` attached to it
- No changes to any client app, NavBar, or page component
- No API or backend changes
