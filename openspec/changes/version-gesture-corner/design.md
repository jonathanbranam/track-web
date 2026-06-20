## Context

The version overlay's triple-click trigger was originally bound to `logoRef.current ?? document` in `useVersionGesture`. Since no app passes a `logoRef` and the `internalLogoRef` in `VersionOverlay` is never attached to a DOM element (the component returns `null` when hidden), the fallback is always `document`. This means any triple-click anywhere on the page triggers the overlay — including during gameplay, list scrolling, and normal navigation.

The fix needs a stable DOM element that is always present, always in the same position, and never accidentally clicked during normal use.

## Goals / Non-Goals

**Goals:**
- Confine the triple-click gesture to a single, persistent, invisible element in the top-left corner of the screen (within the iOS safe-area/notch zone)
- Require zero changes to per-app code (no NavBar edits, no `logoRef` passing)
- Eliminate accidental trigger during gameplay or normal navigation

**Non-Goals:**
- Changing the 3-finger touch gesture (stays on `document`)
- Changing the overlay UI or dismiss behavior
- Making the trigger zone visible or discoverable in normal use

## Decisions

### Always-rendered trigger div in `VersionOverlay`

`VersionOverlay` currently returns `null` when not visible. We change it to always render a small fixed div (the trigger zone) and conditionally render the overlay card on top of it.

`internalLogoRef` is attached to this trigger div. Since the div is always in the DOM, `logoRef.current` in `useVersionGesture` is always non-null — no `document.querySelector` fallback needed.

**Alternative considered:** Query `[data-version-trigger]` in the DOM via `document.querySelector`. Rejected because the target element might not be present at effect-run time (e.g., before login, during route transitions).

### Event delegation for click detection

`useVersionGesture` listens on `document` for click events and checks whether the event originated within `logoRef.current` via `trigger.contains(e.target)`. This is the approach already implemented.

**Alternative considered:** Bind click directly to the trigger element. Rejected because the trigger element is a `<div>` with no natural click affordance — event delegation is equivalent but slightly more resilient.

### Top-left corner, safe-area height

Position: `fixed`, `top: 0`, `left: 0`, `width: 44px`, `height: var(--sat, 44px)`.

- `var(--sat)` is the CSS safe-area inset-top variable set by the app shell on iOS. On iPhones with a notch/Dynamic Island this is ~47px; on older iPhones or desktop it falls back to `44px`.
- The top-left corner is always behind the iOS status bar content, so it is never reachable by a normal tap.
- 44px width keeps the zone narrow enough to be deliberate — users must consciously aim for the top-left corner.

**Alternative considered:** Full-width bar across the top. Rejected because any tap near the top of the screen during gameplay or page load would count.

## Risks / Trade-offs

- **Safe-area height varies** → Using `var(--sat, 44px)` covers all known iPhone models. On desktop the 44px fallback is a reasonable invisible zone at the top-left.
- **Top-left may overlap game HUD elements** → Acceptable: the zone is 44×44px max, and most game overlays avoid the extreme top-left corner. Triple-click (3 distinct clicks within 600ms) in that corner is essentially impossible to do accidentally.
- **`pointer-events: auto` on the trigger div** → Required for click detection. The div sits above the game canvas in z-order, but its 44×44px footprint and deliberate-triple-click requirement make accidental activation extremely unlikely.
