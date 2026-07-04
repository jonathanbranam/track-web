**App**: talks

## REMOVED Requirements

### Requirement: Placeholder resting-state renderer
**Reason**: This DOM `<div>`-rectangle renderer existed specifically to visually prove the Director contract (`next`/`back`/`pause`/`skipTo`) in Phase 1 (`director-precompute-pass`), which deliberately had no rendering engine at all. Phase 2 (this change) replaces it with a real Phaser-based renderer, specified under the new `world-rendering` capability's "Entity rendering via a shared EntityView" and "Camera follow and instant snap" requirements.
**Migration**: `RpgExperience.tsx` stops mounting the DOM `PlaceholderStage` component and instead mounts `PhaserGame`/`TalkRpgScene`, wired to the same `talk-director` resting-state contract (`useDirector()`'s `resting` field) as before — only the rendering target changes, not how the Director's state is read.

The system SHALL render the current resting state using plain placeholder rectangles (no Phaser, no tilemap, no sprites) positioned according to each entity's coordinates in the resting-state snapshot, sufficient to visually verify that playback, snapTo, back, pause/resume, and skip all produce the correct on-screen state.

#### Scenario: Placeholder entities reflect the current resting state
- **WHEN** the system is resting at a checkpoint whose snapshot places entity `pc` at a given position
- **THEN** the placeholder renderer displays a rectangle for `pc` at that position, with no Phaser game instance involved
