import * as Phaser from 'phaser'

/**
 * Unused in Phase 1 (director-precompute-pass) — the placeholder DOM renderer
 * in `RpgExperience.tsx` proves the Director contract instead. Phase 2
 * ("World rendering + Director integration") rewires this scene against the
 * `talk-director` resting-state contract.
 */
export default class TalkRpgScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TalkRpgScene' })
  }
}
