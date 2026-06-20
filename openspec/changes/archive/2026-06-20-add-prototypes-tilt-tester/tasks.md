## 1. Game Registration

- [x] 1.1 Add `prototypes` entry to `client-games/src/games/registry.ts` with name "Prototypes", description "prototypes and tests", category `single-player`, and a lazy import of `./prototypes/PrototypesGame`

## 2. Prototypes Page Shell

- [x] 2.1 Create `client-games/src/games/prototypes/PrototypesGame.tsx` — top-level component that renders the tilt tester (no Phaser, no canvas)

## 3. Tilt Tester Component

- [x] 3.1 Create `client-games/src/games/prototypes/TiltTester.tsx` with environment readout section showing `window.isSecureContext`, `'DeviceMotionEvent' in window`, and `typeof DeviceMotionEvent.requestPermission`
- [x] 3.2 Add event-type button grid: `onClick`, `onPointerDown`, `onPointerUp`, `onTouchStart`, `onTouchEnd`, plus two buttons inside a `pointer-events: none` parent div (one `onClick`, one `onPointerDown`) with `pointer-events: auto` on the buttons themselves
- [x] 3.3 Add scrollable event log that appends `[HH:MM:SS] [event-type] fired` on each button interaction and auto-scrolls to the latest entry
- [x] 3.4 Add "Request Permission" button that calls `DeviceMotionEvent.requestPermission()` (when available) and logs `permission: granted`, `permission: denied`, or `permission: not available` to the event log
- [x] 3.5 Add live `accelerationIncludingGravity` readout (x, y, z) that appears and updates after permission is granted
- [x] 3.6 Add "Reload" button that clears the event log and resets the sensor readout state

## 4. Verification

- [x] 4.1 Build `client-games` (`npm run build:games` or equivalent) and confirm zero TypeScript errors
- [x] 4.2 Open `/game/prototypes` in desktop browser and confirm: "Prototypes" appears in lobby, page loads, all buttons append to the log
- [x] 4.3 Test on iOS device at `https://games.branam.us/game/prototypes` — confirm environment readout values, tap each button type, confirm which events fire, tap "Request Permission" and observe dialog and log result
