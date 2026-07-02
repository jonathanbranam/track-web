## 1. Dependencies

- [x] 1.1 Add `phaser` to `client-talks/package.json` dependencies and run `npm install`
- [x] 1.2 Verify `phaser` types are available (`@types/phaser` or bundled types) and TypeScript resolves without errors

## 2. talks.ts — kind field

- [x] 2.1 Add optional `kind?: 'content' | 'rpg'` field to the `Talk` interface in `client-talks/src/talks.ts`
- [x] 2.2 Set `kind: 'rpg'` on the `engineering-with-ai` entry in `TALKS`

## 3. TalkPage — RPG opt-in branch

- [x] 3.1 Import `RpgExperience` in `client-talks/src/pages/TalkPage.tsx` (stub import — component created in task 5)
- [x] 3.2 Add branch: if `talk.kind === 'rpg'`, render `<RpgExperience />` and return early; otherwise render existing content shell

## 4. Script stub

- [x] 4.1 Create `client-talks/src/talk-rpg/script.ts` with the `Beat` interface (`id`, `phaserSegment`, `caption?`, `autoClearMs?`)
- [x] 4.2 Define `BEATS: Beat[]` with beat 0 (`phaserSegment: 'title-screen'`, no caption) and beat 1 (`phaserSegment: 'name-entry-stub'`, no caption)
- [x] 4.3 Export `BEATS` and the `Beat` type

## 5. Director

- [x] 5.1 Create `client-talks/src/talk-rpg/Director.tsx` with a React context and reducer owning `currentBeat: number` and `status: 'waiting' | 'playing'`
- [x] 5.2 Implement `advance()`: no-op when `status === 'playing'`; transitions to `'playing'` and emits `'beat'` via stored game ref when `status === 'waiting'`
- [x] 5.3 Expose `onSegmentComplete()` for the Phaser scene to call (transitions status back to `'waiting'`)
- [x] 5.4 Export `DirectorProvider` and `useDirector` hook

## 6. PhaserGame host

- [x] 6.1 Copy `client-games/src/games/PhaserGame.tsx` to `client-talks/src/talk-rpg/PhaserGame.tsx` verbatim
- [x] 6.2 Verify the copied component compiles cleanly in the `client-talks` TypeScript context

## 7. TalkRpgScene — title screen with primitives

- [x] 7.1 Create `client-talks/src/talk-rpg/TalkRpgScene.ts` as a `Phaser.Scene` subclass
- [x] 7.2 In `create()`, register a listener on `this.game.events` for `'beat'`
- [x] 7.3 Implement `playSegment(beat: Beat)`: switch on `beat.phaserSegment`; for `'title-screen'` draw dark background, gold placeholder rectangle, `ENGINEERING WITH AI` label, and a pulsing `▶ BEGIN QUEST` text tween; emit `'segment-complete'` once the tween is established
- [x] 7.4 Implement `'name-entry-stub'` segment: render a dark background with `JON` centered in white text; immediately emit `'segment-complete'`
- [x] 7.5 Default case (unknown segment): emit `'segment-complete'` immediately so an unimplemented beat never blocks the Director

## 8. Overlay

- [x] 8.1 Create `client-talks/src/talk-rpg/Overlay.tsx` — reads `useDirector()` for `currentBeat`; renders caption from `BEATS[currentBeat].caption` if present, styled by `caption.type` (act-card, encounter, punchline, dialogue); renders toolbar with Expand, Full Screen, and optional Advance buttons
- [x] 8.2 Style act-card captions: large uppercase centered text, high contrast
- [x] 8.3 Advance button in toolbar calls `director.advance()` and stops click propagation (prevents double-advance from the container click listener)

## 9. RpgExperience root

- [x] 9.1 Create `client-talks/src/talk-rpg/RpgExperience.tsx` — renders `DirectorProvider` wrapping a full-bleed container with `PhaserGame` and `Overlay` stacked
- [x] 9.2 Wire `onGameReady`: store game ref in Director; wire `game.events.on('segment-complete', director.onSegmentComplete)`
- [x] 9.3 Attach keydown listener (`ArrowRight`, `Space` → `director.advance()`) to `window` on mount; remove on unmount
- [x] 9.4 Attach click listener on the experience container (`director.advance()`); ensure toolbar button clicks stop propagation so they don't trigger a simultaneous advance
- [x] 9.5 Implement Expand mode: toggle `position: fixed; inset: 0` class on the experience root
- [x] 9.6 Implement Full Screen mode: call `document.documentElement.requestFullscreen()`; on error or denial, fall back to Expand mode silently

## 10. Verify and build

- [x] 10.1 Run `npm run build:talks` and confirm zero TypeScript errors
- [x] 10.2 Open `http://localhost:6055/talks/engineering-with-ai` in a browser; verify Phaser canvas renders the title screen with primitives
- [x] 10.3 Press `ArrowRight` — verify beat advances to name-entry stub and overlay updates (no caption for beat 1)
- [x] 10.4 Click anywhere on the canvas — verify advance fires
- [x] 10.5 Test Expand mode button — verify experience fills the viewport
- [x] 10.6 Test Full Screen button — verify `requestFullscreen` is called; if denied, verify Expand mode activates
- [x] 10.7 Run `npm run build` and confirm all clients and server build cleanly
