## Why

Ball Merge currently offers no physical interaction beyond aiming and dropping — tilt and shake mechanics add a risk/reward skill layer that lets players actively guide falling balls and break up stuck piles, especially valuable on narrow container shapes like the planned vase level.

## What Changes

- **Tilt toggle button** in the top HUD (mobile only — hidden on desktop where `DeviceMotionEvent` is unavailable); starts disabled; first tap both requests iOS permission and enables motion controls (tilt + physical shake detection)
- **Tilt mechanic**: while motion controls are enabled, phone tilt shifts the Matter.js world gravity slightly on the x-axis, causing balls to drift sideways in the direction of tilt — tunable, subtle, not game-breaking
- **Shake button** overlaid at the bottom of the game canvas (always visible on mobile); applies a random lateral impulse to all active balls simultaneously; 1.5 s cooldown enforced by button disabled state
- **Physical shake detection**: while motion controls are enabled, rapid acceleration spikes on the `devicemotion` event also trigger the jostle — same effect and same cooldown as the shake button; button and physical shake share the cooldown timer so they can't stack
- **Shake mechanic**: risk/reward — can redirect a dropping ball or break up a stuck pile, but can also destabilize a carefully built stack; shake button provides fallback on desktop or when motion controls are off
- No new backend changes; no score or session impact

## Capabilities

### New Capabilities
- `ball-merge-tilt-shake`: Tilt toggle (gravity bias via DeviceMotion), physical shake detection (acceleration spike threshold), and shake button (per-ball impulse); includes iOS permission flow, mobile detection, shared cooldown enforcement, and tuning constants

### Modified Capabilities
- `games-ball-merge`: Three new player interactions added (tilt, physical shake, shake button); the Matter.js world gravity is no longer a fixed constant during play

## Impact

- `client-games/src/games/ball-merge/BallMergeScene.ts` — subscribe/unsubscribe to `devicemotion`, apply EMA-smoothed gravity shift, handle `jostle` and `tilt-enabled`/`tilt-disabled` game events
- `client-games/src/games/ball-merge/BallMergeGame.tsx` — tilt toggle button (mobile-only), shake button with cooldown state, iOS permission request, emit game events to Phaser
- No new files required; no backend, API, or leaderboard changes
