**App**: all

## MODIFIED Requirements

### Requirement: Version gesture triggers
The version overlay SHALL be triggered by either of two gestures: a 3-finger touch (any 3 fingers touching the screen simultaneously, detected via `touchstart` with `touches.length >= 3`) anywhere on the page, OR triple-click (3 clicks within 600ms) on the invisible corner trigger zone rendered by `VersionOverlay` in the top-left of the screen. Both gestures SHALL call the same reveal callback.

The corner trigger zone SHALL be a fixed, transparent `<div>` always present in the DOM (rendered by `VersionOverlay` regardless of overlay visibility), positioned at the top-left of the screen with width 44px and height equal to `var(--sat, 44px)` (the iOS safe-area inset). It SHALL NOT be visible to the user under any circumstances.

#### Scenario: 3-finger touch reveals overlay (mobile)
- **WHEN** a user places 3 or more fingers on the screen simultaneously
- **THEN** the version overlay is revealed

#### Scenario: Triple-click on corner trigger zone reveals overlay
- **WHEN** a user clicks or taps the top-left corner trigger zone 3 times within 600ms
- **THEN** the version overlay is revealed

#### Scenario: Triple-click outside trigger zone does not reveal overlay
- **WHEN** a user triple-clicks anywhere on the page other than the top-left corner trigger zone
- **THEN** the version overlay is NOT triggered

#### Scenario: Single or double touch does not trigger
- **WHEN** a user touches the screen with 1 or 2 fingers
- **THEN** the version overlay is not triggered

#### Scenario: Trigger zone is always present
- **WHEN** any client app is loaded, regardless of login state, current route, or overlay visibility
- **THEN** the corner trigger zone div is present in the DOM
