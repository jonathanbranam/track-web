## Why

The talk `engineering-with-ai` ("Software Engineering Skills Are More Important Than Ever") will be delivered as a self-playing, fully scripted top-down RPG in the style of Dragon Warrior (NES). The full end-to-end design is documented in `docs/talks/ai-eng/` (architecture, script, assets). This change delivers **Phase 1: the scaffold** — the working framework that all subsequent phases build on.

The talks app currently renders each talk as a static content page (`TalkPage.tsx`). It has no model for a full-screen, Phaser-driven experience. This change adds that foundation with a single working screen using Phaser primitives, so the architecture is proven and the integration points are established before art or content work begins.

## What Changes

- **Modify `talks-app-shell`**: add a per-talk `kind: 'rpg'` field in `talks.ts`; when a talk has `kind: 'rpg'`, `TalkPage` renders `RpgExperience` instead of the standard content shell.
- **New `talk-rpg-experience` scaffold**: mount Phaser inside `client-talks` using the `PhaserGame.tsx` pattern from `client-games`; wire the Director state machine; implement the two full-screen modes (Expand + Fullscreen API); render the title screen using Phaser primitives (no pixel-art assets yet).
- **Add Phaser dependency** to `client-talks/package.json`.
- The single working screen: **title screen** — dark background, placeholder logo rectangle, `▶ BEGIN QUEST` text, speaker presses → to advance (demonstrating the full Director → Phaser → overlay pipeline end-to-end).

Out of scope for this change: pixel-art assets (Phase 3), the full 10-beat script (Phase 2), recorded-video fallback (Phase 4), any backend changes.

## Capabilities

### New Capabilities
- `talk-rpg-experience`: The full-screen RPG talk shell — hybrid Phaser + React-overlay render stack, Director/breakpoint state machine, manual-advance control, two full-screen modes. **This change scopes to the scaffold**: Phaser mounted, Director wired, title screen with Phaser primitives, full-screen modes working.

### Modified Capabilities
- `talks-app-shell`: Adds a per-talk `kind: 'rpg'` opt-in so a talk route renders `RpgExperience` instead of the standard `TalkPage` content shell.

## Impact

- **Apps:** `client-talks` — new `src/talk-rpg/` directory (Director, PhaserGame, TalkRpgScene, RpgExperience, Overlay, script stub); `talks.ts` gains `kind` field; `TalkPage` gains the `kind === 'rpg'` branch.
- **Dependencies:** add `phaser` to `client-talks/package.json`.
- **Build/deploy:** no new subdomain; `build:talks` already runs in `scripts/build-deploy.sh`; bundle size increases ~1 MB gzipped (Phaser).
- **Full architecture reference:** `docs/talks/ai-eng/architecture.md`, `docs/talks/ai-eng/script.md`, `docs/talks/ai-eng/assets.md`.
