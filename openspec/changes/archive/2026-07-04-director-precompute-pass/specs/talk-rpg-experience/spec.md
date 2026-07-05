**App**: talks

## REMOVED Requirements

### Requirement: Phaser game host mounted in client-talks
**Reason**: Phase 1 (`docs/talks/ai-eng-rpg/phased-implementation.md`) proves the Director's action-list/precompute-pass model against placeholder rectangles with no rendering engine at all, so this phase's experience does not mount Phaser. Reintroducing a Phaser-backed game host is deferred to Phase 2 ("World rendering + Director integration"), which will wire it against the `talk-director` capability's resting-state contract established here.
**Migration**: `PhaserGame.tsx` and its wiring in `RpgExperience.tsx` are left in the codebase unused rather than deleted, so Phase 2 can reintroduce them without recreating the `client-games`-derived component from scratch. Until Phase 2 lands, `/talks/engineering-with-ai` renders the placeholder DOM-based experience described by the `talk-director` capability instead of a Phaser canvas.

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
**Reason**: Replaced wholesale by the `talk-director` capability's action-list + deterministic precompute-pass model (`requirements.md` §3/§5), which adds `back`/`pause`/`resume`/`skipTo` that the forward-only `currentBeat`/`status` reducer cannot support.
**Migration**: Code that dispatched `advance()` against this reducer now calls the `talk-director` capability's `next()` instead; there is no beat index or Phaser `'beat'`/`'segment-complete'` event bridge to migrate — see the "Manual advance via keypress and mouse click" requirement below for the updated input bindings.

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

### Requirement: Title screen rendered with Phaser primitives
**Reason**: This requirement was specific to beat 0 of the old forward-only `Beat` model, rendered through the now-removed Phaser scene. The Phase 1 placeholder script has no equivalent single "title screen" beat — it authors a small `walk`/`say`/`pause`/`stop` sequence against a placeholder map instead.
**Migration**: A title-screen-equivalent presentation can be authored later as an ordinary `Action[]` sequence (e.g. `showOverlay`/entity placement) once Phase 3 (text/UI overlay) or Phase 8 (asset integration) makes that visually meaningful; no code migrates directly, since this requirement's Phaser-primitive implementation is being removed, not ported.

For the scaffold phase, the title screen (beat 0) SHALL be rendered entirely using Phaser primitive objects — `Graphics`, `Rectangle`, and `Phaser.GameObjects.Text`. No external sprite assets SHALL be required. The scene SHALL display a dark background, a placeholder logo rectangle, a title label, and a pulsing `▶ BEGIN QUEST` prompt. When the Director emits `'beat'` with index 0, the scene SHALL play the title screen and then emit `'segment-complete'`.

#### Scenario: Title screen renders without assets
- **WHEN** the experience loads and the Director emits beat 0
- **THEN** the Phaser scene renders the title screen using only primitives, with no network requests for sprite assets

#### Scenario: Title screen emits segment-complete
- **WHEN** the title screen animation completes (logo fade-in and prompt pulse established)
- **THEN** the Phaser scene emits `'segment-complete'` and the Director enters `waiting` state

### Requirement: Script stub with Beat interface
**Reason**: The `Beat` interface (`id`, `phaserSegment`, `caption`, `autoClearMs`) is the forward-only per-beat model `requirements.md` §5 explicitly rejects in favor of authored actions plus computed resting states. It is superseded by the `talk-director` capability's `Action[]` format.
**Migration**: `client-talks/src/talk-rpg/script.ts` now exports an `Action[]` (per the `talk-director` capability's Phase 1 vocabulary) and a small placeholder map definition, instead of `BEATS: Beat[]`. Any code referencing `Beat`/`BEATS` is updated to read the new `Action[]`/map exports.

The system SHALL define a `Beat` interface in `client-talks/src/talk-rpg/script.ts` with fields `id: number`, `phaserSegment: string`, `caption?: { type: 'act-card' | 'encounter' | 'punchline' | 'dialogue'; text: string }`, and `autoClearMs?: number`. The scaffold SHALL define beats 0 (title screen) and 1 (name entry stub) only. The full beat map is documented in `docs/talks/ai-eng-rpg/script.md` and implemented in a later phase.

#### Scenario: Beat interface is the single definition
- **WHEN** the Phaser scene, the Director, and the overlay each reference a beat's data
- **THEN** all three reference the same `Beat` type from `script.ts` with no duplicate type definitions

## MODIFIED Requirements

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
