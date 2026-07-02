**App**: talks

## Purpose

The talk RPG experience defines the Phaser 3-based interactive presentation layer for talks that opt into the `kind: 'rpg'` layout. It provides the game host, director state machine, input handling, overlay system, and scene scaffolding needed to run a beat-driven RPG-style talk presentation inside the `client-talks` workspace.

## Requirements

### Requirement: Phaser game host mounted in client-talks
The system SHALL mount a Phaser 3 game instance inside `client-talks` via a `PhaserGame` React component (copied from `client-games/src/games/PhaserGame.tsx`) that creates `new Phaser.Game(config)` on mount and destroys it on unmount. The game SHALL use `type: Phaser.AUTO` (WebGL with Canvas fallback) and `pixelArt: true`. The component SHALL accept a `buildConfig` function and an `onGameReady` callback for wiring event-emitter bridges.

#### Scenario: Game mounts on route load
- **WHEN** a browser navigates to `/talks/engineering-with-ai`
- **THEN** a Phaser game instance is created and renders into a full-bleed canvas covering the experience container

#### Scenario: Game destroys on unmount
- **WHEN** the user navigates away from `/talks/engineering-with-ai`
- **THEN** `game.destroy(true)` is called and no Phaser resources leak

#### Scenario: Canvas fallback when WebGL unavailable
- **WHEN** the browser does not support WebGL
- **THEN** Phaser falls back to Canvas renderer and the experience continues to function

### Requirement: Director state machine
The system SHALL provide a `Director` (React context + reducer) that owns `currentBeat: number` and `status: 'waiting' | 'playing'`. It SHALL expose an `advance()` function that is a no-op when `status === 'playing'`. When `advance()` is called with `status === 'waiting'`, it SHALL set `status` to `'playing'` and emit a `'beat'` event to the Phaser game via the event emitter. When the Phaser scene emits `'segment-complete'`, the Director SHALL set `status` back to `'waiting'`. No beat-advance logic SHALL be duplicated between the Director and the Phaser scene.

#### Scenario: Advance while waiting
- **WHEN** the Director status is `waiting` and `advance()` is called
- **THEN** status transitions to `playing` and the Phaser scene receives a `'beat'` event with the current beat index

#### Scenario: Advance while playing is a no-op
- **WHEN** the Director status is `playing` and `advance()` is called
- **THEN** nothing happens — the current segment continues uninterrupted

#### Scenario: Segment complete transitions to waiting
- **WHEN** the Phaser scene emits `'segment-complete'`
- **THEN** the Director sets status to `waiting` and the overlay freezes on the current beat's caption

### Requirement: Manual advance via keypress and mouse click
The experience SHALL advance to the next beat when the presenter presses `ArrowRight`, presses `Space`, or clicks anywhere on the experience container. All three input methods SHALL call the same `Director.advance()` function. The experience SHALL NOT auto-advance on a timer. An optional on-screen advance button in the overlay toolbar SHALL also call `advance()` as a secondary click target.

#### Scenario: ArrowRight advances beat
- **WHEN** the experience is in `waiting` state and the presenter presses `ArrowRight`
- **THEN** the Director advances to the next beat

#### Scenario: Space advances beat
- **WHEN** the experience is in `waiting` state and the presenter presses `Space`
- **THEN** the Director advances to the next beat

#### Scenario: Mouse click advances beat
- **WHEN** the experience is in `waiting` state and the presenter clicks anywhere on the experience
- **THEN** the Director advances to the next beat

#### Scenario: Click on overlay toolbar does not double-advance
- **WHEN** the presenter clicks a toolbar button (e.g. Full Screen toggle)
- **THEN** only the toolbar action fires; the click does not also call `advance()`

### Requirement: React DOM overlay for all readable text
The experience SHALL render all readable text (act cards, encounter labels, punchline captions, dialogue) as DOM elements in a React overlay layer positioned above the Phaser canvas (`z-index` higher than the canvas). Text SHALL be styled with Tailwind CSS. No readable presentation text SHALL be rendered inside the Phaser canvas via Phaser's text objects or bitmap fonts.

#### Scenario: Caption renders for current beat
- **WHEN** the Director is in `waiting` state on a beat that has a `caption`
- **THEN** the overlay renders the caption text in the appropriate style for its type (`act-card`, `encounter`, `punchline`, or `dialogue`)

#### Scenario: No caption clears the overlay
- **WHEN** the current beat has no `caption` field
- **THEN** the overlay renders no caption text

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

### Requirement: Title screen rendered with Phaser primitives
For the scaffold phase, the title screen (beat 0) SHALL be rendered entirely using Phaser primitive objects — `Graphics`, `Rectangle`, and `Phaser.GameObjects.Text`. No external sprite assets SHALL be required. The scene SHALL display a dark background, a placeholder logo rectangle, a title label, and a pulsing `▶ BEGIN QUEST` prompt. When the Director emits `'beat'` with index 0, the scene SHALL play the title screen and then emit `'segment-complete'`.

#### Scenario: Title screen renders without assets
- **WHEN** the experience loads and the Director emits beat 0
- **THEN** the Phaser scene renders the title screen using only primitives, with no network requests for sprite assets

#### Scenario: Title screen emits segment-complete
- **WHEN** the title screen animation completes (logo fade-in and prompt pulse established)
- **THEN** the Phaser scene emits `'segment-complete'` and the Director enters `waiting` state

### Requirement: Script stub with Beat interface
The system SHALL define a `Beat` interface in `client-talks/src/talk-rpg/script.ts` with fields `id: number`, `phaserSegment: string`, `caption?: { type: 'act-card' | 'encounter' | 'punchline' | 'dialogue'; text: string }`, and `autoClearMs?: number`. The scaffold SHALL define beats 0 (title screen) and 1 (name entry stub) only. The full beat map is documented in `docs/talks/ai-eng/script.md` and implemented in a later phase.

#### Scenario: Beat interface is the single definition
- **WHEN** the Phaser scene, the Director, and the overlay each reference a beat's data
- **THEN** all three reference the same `Beat` type from `script.ts` with no duplicate type definitions
