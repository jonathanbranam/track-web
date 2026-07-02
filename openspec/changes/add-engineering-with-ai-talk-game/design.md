## Context

This change delivers **Phase 1 (scaffold)** of the `engineering-with-ai` RPG talk. The full architecture, beat-by-beat script, and asset pipeline are documented in `docs/talks/ai-eng/`. This design doc focuses on the decisions specific to getting the framework running with a single working screen.

**Current state:** `client-talks` is a lightweight React SPA (`App.tsx`, `TalkPage.tsx`, `talks.ts`). No Phaser dependency. No full-screen capability.

**Repo Phaser pattern (from `client-games`):** `PhaserGame.tsx` is a generic React host — creates `new Phaser.Game(config)` in a `useEffect`, destroys on unmount, exposes `onGameReady(game)` for event-emitter wiring. This pattern is proven and reused here verbatim (copied, not extracted into a shared package).

---

## Goals / Non-Goals

**Goals (this change — scaffold only):**
- Phaser mounted and rendering inside `client-talks` at `/talks/engineering-with-ai`
- Director state machine wired: advance on keypress, Phaser scene responds, overlay updates
- Title screen rendered with Phaser primitives (no pixel-art assets)
- Two full-screen modes working (Expand + Fullscreen API)
- `talks-app-shell` modified to support `kind: 'rpg'` per-talk opt-in
- `talks.ts` `engineering-with-ai` entry marked `kind: 'rpg'`

**Non-Goals (future phases):**
- Full 10-beat script (Phase 2)
- Pixel-art assets from pixellab.ai (Phase 3)
- Recorded-video fallback (Phase 4)
- Autonomous AI playing live; backend changes; other talks

---

## Decisions

### 1. Hybrid render: Phaser canvas + React DOM overlay

**Decision:** Phaser owns the pixel world (tiles, sprites, movement, battle animation); a React component layer on top owns all text (act cards, encounter labels, captions). Text is never rendered into the Phaser canvas.

**Why:** Dragon Warrior's original bitmap font is both an IP concern and a legibility risk on laptop screens. DOM text via Tailwind is crisp at any size, trivially responsive, and free from the shimmer and pixel-blur of a WebGL bitmap font. The overlay is already the idiom of the rest of the app. Phaser's strength is animation, not text layout.

**Alternatives considered:**
- Bitmap font inside Phaser: authentic, but squinting-on-a-laptop risk; also reproduces copyrighted DW asset feel too closely.
- Full React (no Phaser): can't achieve fluid sprite animation, tile-based movement, or battle sequences without significant bespoke effort — Phaser provides this for free.

### 2. Director state machine (single source of truth)

**Decision:** A TypeScript `Director` module (plain class or React context) owns `currentBeat: number` and `advance()`. The Phaser scene subscribes to beat changes via the Phaser event emitter (bridged through `onGameReady`). The React overlay reads beat state from React context. No beat logic is duplicated between layers.

```
  Speaker presses key
         │
         ▼
  Director.advance()
         │
    ┌────┴────────────────────────────────┐
    │                                     │
    ▼                                     ▼
  game.events.emit('beat', n)     React re-render
  (Phaser scene plays segment n)  (overlay shows beat n caption)
```

**Why:** The two-renderer architecture risks split state — the overlay showing beat 4 while Phaser is mid-animation for beat 3. Owning state in one place (Director) prevents this. The Phaser emitter bridge (already used in `PhaserGame.tsx`) is the existing repo pattern.

**Alternatives considered:**
- Phaser scene owns state, emits to React via emitter: works but makes React a passive consumer with no way to read state for SSR/debugging.
- React context only, polled by Phaser: polling is fragile; event-driven is cleaner.

### 3. PhaserGame.tsx — copy into client-talks

**Decision:** Copy `client-games/src/games/PhaserGame.tsx` into `client-talks/src/talk-rpg/PhaserGame.tsx`. Do not import across client packages.

**Why:** `client-*` packages have no `exports` field and are not built as libraries — cross-client imports don't work in this workspace setup. A shared package (`packages/phaser`) is the correct long-term home if a third consumer appears, but adds workspace plumbing for a 35-line file. Copy for now.

**Alternatives considered:**
- `packages/phaser` shared package: correct once there are ≥3 consumers; premature for two.

### 4. Full-screen: two modes from a single toolbar

**Decision:** A persistent overlay UI element (top-right corner, unobtrusive) offers two controls:
- **"Expand"** — `position: fixed; inset: 0` on the experience root, hiding the standard page chrome, staying within the browser window (no Fullscreen API). Speaker can still see tab bar, dock, etc.
- **"Full Screen"** — calls `document.documentElement.requestFullscreen()`. True no-chrome takeover. Speaker manages OS-level restore via Esc/F11.

**Why:** Running from a personal work laptop in a controlled setting. Expand keeps browser chrome accessible; Fullscreen gives a clean display for a conference-room TV. Both are cheap and cover the two realistic presentation contexts.

### 5. Scaffold-phase rendering: Phaser primitives only

**Decision:** The title screen (the single screen delivered in this change) is rendered entirely with Phaser primitives — `Graphics`, `Rectangle`, and `Phaser.GameObjects.Text`. No spritesheets, no tilemaps, no external assets are loaded.

**Why:** Decouples the framework from the art pipeline. The Director → Phaser → overlay wiring can be proven correct before a single pixellab.ai asset exists. Swapping primitives for real sprites in Phase 3 requires changes only inside `TalkRpgScene.ts`.

**Title screen spec (primitives):**
- Background: filled rectangle, `#0a0a1a` (near-black)
- Logo area: gold rectangle placeholder, centered, `ENGINEERING WITH AI` in Phaser Text above it
- Prompt: `▶ BEGIN QUEST` in white Phaser Text, bottom-center, pulsing alpha tween
- On advance: scene emits `segment-complete`, Director moves to beat 1 (name entry stub)

### 6. Script stub

**Decision:** `script.ts` in this change defines only beats 0 (title screen) and 1 (name entry stub — a static "JON" text screen, no typing animation yet). The full 10-beat map is documented in `docs/talks/ai-eng/script.md` and implemented in Phase 2.

**Why:** The beat data shape (`Beat` interface, `phaserSegment` strings, `caption` types) must be established now so Phase 2 can fill in beats without touching the Director or scene interface. Stubbing two beats proves the contract.

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Phaser bundle size (~1 MB gzipped) inflates client-talks | Acceptable — talks is a dedicated subdomain with its own Vite build. Not the time-tracking app. |
| `document.requestFullscreen()` denied (browser permission) | Expand mode (`position: fixed`) is always available and needs no permission. |
| Phaser WebGL not available | Set `type: Phaser.AUTO` — Phaser falls back to Canvas renderer automatically. Primitive rendering works in both. |

---

## Migration Plan

No database changes, no API changes, no new subdomain.

1. Add `phaser` to `client-talks/package.json`.
2. Build and deploy (`npm run build:talks` already runs in `scripts/build-deploy.sh`).
3. Existing landing page and other talk routes are unaffected.

**Rollback:** revert `client-talks` source changes, redeploy.

---

## Open Questions

- **Director as class vs React context:** plain TS class is simpler; React context + reducer is more idiomatic and testable. Decision deferred to implementation — either works, pick during coding.
- **Advance input:** bind `ArrowRight`, `Space`, and mouse click (any button). Optional: an on-screen clickable advance button as a secondary control. No presentation remote — no need for `PageDown`.
