**App**: talks

## Purpose

The talk RPG experience defines the interactive presentation layer for talks that opt into the `kind: 'rpg'` layout inside the `client-talks` workspace: input handling (keyboard, click, and on-screen controls) that drives the `talk-director` capability's presenter controls, the React DOM overlay for all readable text and the control bar, and full-screen/expand display modes. Phase 1 renders a placeholder DOM-based experience (no Phaser) while proving the `talk-director` action-list/precompute-pass contract established in that capability; Phase 2 reintroduces Phaser-backed rendering wired against that same contract.

## Requirements

### Requirement: Manual advance via keypress and mouse click
The experience SHALL advance to the next segment when the presenter presses `ArrowRight`, presses `Space`, or clicks anywhere on the experience container — all three SHALL call the `talk-director` capability's `next()`. The experience SHALL additionally bind `ArrowLeft` to `back()` and `P` (or `Escape` while playing) to toggle `pause()`/`resume()`. The experience SHALL NOT auto-advance on a timer. An on-screen control bar (Next / Back / Pause) in the overlay toolbar SHALL also call the corresponding function as a secondary click target, and SHALL remain visible as a fallback and for setup/rehearsal.

#### Scenario: ArrowRight advances to the next segment
- **WHEN** the experience is at rest and the presenter presses `ArrowRight`
- **THEN** `next()` is called and the next segment plays

#### Scenario: Space advances to the next segment
- **WHEN** the experience is at rest and the presenter presses `Space`
- **THEN** `next()` is called and the next segment plays

#### Scenario: Mouse click advances to the next segment
- **WHEN** the experience is at rest and the presenter clicks anywhere on the experience
- **THEN** `next()` is called and the next segment plays

#### Scenario: ArrowLeft goes back
- **WHEN** the presenter presses `ArrowLeft`
- **THEN** `back()` is called and the display instantly shows the previous checkpoint

#### Scenario: P toggles pause and resume
- **WHEN** the presenter presses `P` while a segment is playing
- **THEN** `pause()` is called; pressing `P` again calls `resume()`

#### Scenario: Click on overlay toolbar does not double-advance
- **WHEN** the presenter clicks a toolbar button (e.g. the Back or Pause control)
- **THEN** only that control's action fires; the click does not also call `next()`

### Requirement: React DOM overlay for all readable text
The experience SHALL render all readable text (dialogue, menus, text cards, progress indicator, in-flight status) as DOM elements in React overlay layers positioned above the entity renderer (`z-index` higher than the entities). Text SHALL be styled with Tailwind CSS. No readable presentation text SHALL be rendered via a Phaser canvas, bitmap fonts, or Phaser text objects. Dialogue boxes, talk bubbles, the command/status menu shell, and full-screen/overlaid text cards SHALL follow the `ui-overlay` capability's concrete contract (reading `resting-state.ui`/`resting-state.overlay`, world-anchored positioning, and the Zoom-codec legibility bar) rather than the generic scaffold-era placeholder text this requirement previously described. The existing `Overlay.tsx` presenter control bar (checkpoint counter, in-flight indicator, and Back/Pause/Next/Skip/Expand/Full Screen controls) is unaffected by this change and continues to render as its own layer.

#### Scenario: Dialogue renders as a DOM dialogue box or thought bubble
- **WHEN** the current resting state's `ui` is `{ kind: 'dialogue'; ... }`
- **THEN** the overlay renders that dialogue as a styled DOM dialogue box (or thought-bubble variant), not inside any canvas

#### Scenario: No active UI clears the overlay
- **WHEN** the current resting state's `ui` is `{ kind: 'none' }` and `overlay` is `null`
- **THEN** the overlay renders no dialogue box, menu, or text card

#### Scenario: Command/status menu renders as a DOM menu shell
- **WHEN** the current resting state's `ui` is `{ kind: 'menu'; ... }`
- **THEN** the overlay renders the command window or status/inspection screen with its options and selection highlight, per the `ui-overlay` capability's contract

#### Scenario: Presenter control bar is unaffected
- **WHEN** a dialogue box, menu, or text card is shown or hidden
- **THEN** `Overlay.tsx`'s checkpoint counter and playback controls continue to render and function exactly as before, in their own layer

### Requirement: Expand full-screen mode
The experience SHALL provide an Expand mode that sets `position: fixed; inset: 0` on the experience root element, causing it to fill the entire viewport while keeping the browser chrome (tab bar, address bar) visible. A toolbar button SHALL toggle Expand mode on and off.

#### Scenario: Expand fills the viewport
- **WHEN** the presenter clicks the Expand button
- **THEN** the experience fills the full browser viewport and hides the standard page shell

#### Scenario: Expand can be exited
- **WHEN** the presenter clicks the Expand button while in Expand mode
- **THEN** the experience returns to its normal in-page layout

### Requirement: Fullscreen API mode
The experience SHALL provide a Full Screen mode that calls `document.documentElement.requestFullscreen()` to take over the entire display with no browser chrome. A toolbar button SHALL trigger this mode. If `requestFullscreen()` is denied or unavailable, the button SHALL fall back to Expand mode silently.

#### Scenario: Full screen removes browser chrome
- **WHEN** the presenter clicks the Full Screen button and the browser grants the request
- **THEN** the experience fills the entire display with no visible browser chrome

#### Scenario: Fullscreen gracefully falls back
- **WHEN** `requestFullscreen()` is denied or throws
- **THEN** the experience enters Expand mode instead, with no error shown to the presenter
