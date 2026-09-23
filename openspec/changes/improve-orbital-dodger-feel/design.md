## Context

See proposal.md for the four playtest problems. Current shape:

- `physics.ts` is pure and unit-tested. It covers gravity, `stepShip`, `checkLoss` and `projectForecast`. `checkLoss` treats any overlap as a `crash`, and there is no collision response.
- `OrbitalDodgerScene.ts` runs fixed 1/120 s sub-steps, reads a live `Tuning` object every sub-step, and keeps a single `pointerTarget` as the thrust target.
- The field is a 400×720 logical area, `Scale.FIT`-ed into the viewport. The canvas is the visible area, so anything outside `[0,W]×[0,H]` is invisible.
- Input already follows `kb/phaser-mobile-input.md`: scene-level `this.input` handles the canvas (Fix 1), and `windowEvents: false` protects the React HUD (Fix 2). The existing `pointerupoutside` and `isDown` re-derivation guard against latched thrust. All of that stays.

## Goals / Non-Goals

**Goals:**
- Each of the four fixes can be tuned, and switched between competing variants, from the dev panel, so they can be tried on a phone without code edits.
- All new decision logic lives in `physics.ts` as pure functions with unit tests: impact classification, the shield bounce, capture eligibility, wrapped displacement and the thrust direction. The scene stays a thin driver.

**Non-Goals:**
- Hand-designed levels. That is future work; this change stays with procedural layouts.
- Persisting the dev panel's mode selections, or exposing the modes to players in production.
- A camera that follows the ship, or a larger world than the screen.
- Changing the leaderboard mode or level keys.

## Decisions

### D1. Impact classification uses normal speed, not total speed
On overlap, `n = unit(ship − planet)` and `vn = −(v · n)`, the inward normal speed. If `vn ≤ lethalImpactSpeed`, the hit is glancing. This matches what the user asked for: a fast ship skimming past is survivable, and a slow ship dropping straight in is not a "direct fast hit" either. Total speed would punish fast tangential grazes, which are exactly the near-misses that should be forgiven.

Response to a glancing hit (`resolveGlancingImpact` in `physics.ts`):
- Move the ship to `planet + n·(r + shipR + ε)`.
- Split velocity into normal and tangential parts, and drop the inward normal part.
- Set the new velocity to `n·bounceOut + t̂·max(|vt|, kickTangential)`, where `t̂` is the current tangential direction, or an arbitrary perpendicular when `|vt|≈0`.
- Clamp to `maxSpeed` as usual.

`kickTangential` defaults near circular-orbit speed for a mid-sized planet, and `bounceOut` is modest. That combination moves the ship off the surface along it, rather than straight back out into space, which is the "tangential escape" the user described.

Grace period: `shieldGraceSec ≈ 0.6`. During it, contact still triggers the reposition (so the ship cannot sink into the planet) but does not consume a charge. The red flash is a ship tint for the length of the grace period.

- *Alternative considered:* a hit-points model with damage scaled by impact speed. Rejected. It is more precise than asked for ("nothing too precise needed"), and charges are easier to read on a HUD.
- Defaults: `shieldCharges: 3`, `lethalImpactSpeed ≈ 110`, to be calibrated so that falling in from rest near a big planet counts as direct.

### D2. Orbit capture is an on-rails kinematic lock
The capture ring sits at `R = r + orbitHeight`, with `orbitHeight ≈ 36`, inside the high-scoring band. The circular speed is `vc = sqrt(G·massScale·r² / R)`, capped at `maxSpeed · 0.95`.

Capture test, run each sub-step while not thrusting and not locked (`tryCapture`):
- `|d − R| ≤ captureBand`
- the angle between `v` and the tangent is `≤ captureAngle`
- `|v| / vc ∈ [1 − speedTol, 1 + speedTol]`

Generous defaults: band about 14px, angle about 30°, speed tolerance about 45%.

While locked, the scene stores `{planetIdx, angle, dir}` and advances `angle += dir·vc/R·dt`. Position comes from the angle, velocity is the tangent times `vc`, and gravity, fuel and collision are all skipped.

Release: on `pointerdown` while locked, clear the lock, keep the orbital velocity, and apply thrust normally. A `recaptureBlock` on that planet index is cleared once `|d − R| > captureBand`, so letting go right after a release does not snap the ship straight back.

- *Alternative considered:* soft "orbit assist" steering, which damps radial velocity and nudges speed toward `vc`. It is more physical, but it still needs precise flying, and it is harder to read. The user explicitly pointed to the "enter the drawn orbit within a threshold" pattern.
- *Why ignore the other planets while locked:* with them included the orbit is no longer stable, which defeats the point.
- **Ring culling:** a ring is dropped if `R + shipR + margin` would reach any other planet (`dist(pi, pj) − rj < R + shipR + 8`). This is computed once per layout (`orbitRings(planets, tuning)`) and recomputed when `orbitHeight` changes.
- **Scoring cutoff:** while locked, the whole score rate (base and bonus) is multiplied by `max(0, 1 − arcTravelled / orbitScoreArcDeg)`, with a default arc of 180°. Past that arc a locked orbit earns nothing. Without this an orbit costs nothing and never ends, so it would be an infinite score farm. With it, an orbit is a free rest that pays briefly, and chasing stars stays the way to score. The cutoff is measured in arc rather than time, so it is the same for every ring size. *(Revised after playtest: the first version, a half-life decay on the bonus only, kept paying too long.)*

### D7. An empty tank starts a countdown, not a loss
*(Added after playtest.)* When fuel reaches zero, the scene accumulates `emptySec`, and `checkLoss` reports `out-of-fuel` only once `emptySec ≥ fuelGraceSec` (default 5 s). The ship keeps flying under gravity, and every other rule still applies. The countdown also runs while locked in orbit (the locked path calls `checkLoss` for its non-contact reasons), so a capture cannot keep a dry ship alive forever. The HUD shows the remaining seconds via a `fuel-grace` event.

### D8. Influence zones make released orbits real
*(Added after playtest: orbits "didn't feel stable".)* A simulation showed the ring maths was already right for a planet on its own: a released ship held its radius to ±1 px. In generated layouts, though, every released orbit crashed or escaped within 1–8 s (0 of 160 held for 30 s). The cause is neighbouring planets, which pull at 20–230% of the home planet's pull. A tuning change cannot fix that: even an 8% steady sideways pull moves a low orbit into the surface in under one lap.

- **Zones.** `influenceRadii` gives each planet the distance, toward its most competitive neighbour, at which the two pull equally: `d·rᵢ/(rᵢ+rⱼ)`, since pull goes as r²/d². Two zones can touch but never overlap. Inside `influenceInner` (default 0.75) of that radius, `gravityAccelAt` ignores neighbours. Between that and the edge, their weight eases back in with a smoothstep, so the field has no discontinuity. Outside every zone the gravity is plain superposition, so slingshots in open space are unchanged. The toggle is `influenceZones`, on by default.
- **Rings.** Height is `orbitHeight · r / PLANET_MAX_R`, with a floor of `MIN_RING_HEIGHT` (20). Speed is the true circular speed `√(R·a_own(R))`. When that is above `0.95·maxSpeed`, the ring is raised until it is not, instead of capping the speed (a capped speed is not an orbit). With zones on, a ring outside `influenceInner·S` is dropped. Result: 143 of 143 released orbits held within ±3 px for 30 s across 40 layouts, with 17 of 160 rings dropped.
- **Gravity reach** (`gravityReach`, 0 = off). Pull fades out between 60% and 100% of this distance from a surface. It is an experiment for the "distant pulls degrade play" concern, and is independent of zones.
- *Alternatives considered:* keeping n-body gravity and spreading planets further apart (fewer planets per screen, and orbits still wobble); ignoring neighbours only after a release from a lock (free flight then behaves differently from a released orbit in the same spot).
- *Open:* the lock still ignores all gravity. With zones on, a release now matches the rail exactly, so the lock could later become an assist (a snap onto the rail) rather than a separate mode.

### D3. Relative drag becomes the default control; direct gets a deadzone
The thrust direction is computed by a pure function, `thrustDirection(mode, ship, pressOrigin, pointer, lastDir, deadzone)`:
- **Relative:** `dir = unit(pointer − pressOrigin) · throttle`. If the drag distance `d < deadzone` (18 logical px by default), return null, meaning no thrust and no fuel drain. A press can then be used just to break an orbit without burning fuel. Past the deadzone, `throttle = clamp((d − deadzone)/(fullDrag − deadzone), 0, 1)²`, with `fullDrag` at 100 px by default. *(Added after playtest: on/off thrust at the deadzone felt too sensitive, because the ship went to full burn on a tiny drag. The quadratic curve keeps small drags as fine nudges.)* Fuel drains at `dt · throttle`.
- **Direct:** `dir = unit(pointer − ship)` at full throttle. If that distance is under the deadzone, return `lastDir`.

`stepShip` changes to take a thrust direction vector (or null) instead of a target point. Fuel drains only when the direction is non-null. The scene records `pressOrigin` on `pointerdown`. The guide line in relative mode is drawn from origin to pointer, like a small joystick, and a short heading tick on the ship shows the actual thrust direction.

Why relative drag fixes the edge problem: the finger no longer has to be anywhere relative to the ship, so an edge never blocks a thrust direction and the finger never covers the ship.

- *Alternative considered:* a fixed on-screen virtual joystick. Rejected because it takes up screen space on a 400×720 field and needs the thumb to find it. "Press anywhere" gives the same result with neither cost.
- *Risk:* players who learned direct mode need to adjust. The mode is a live dev toggle, so both can be compared on a phone before deciding.

### D4. Off-screen indicator is drawn in scene space, clamped inside the canvas
When the ship is outside `[0,W]×[0,H]`:
- Clamp the ship position to the field inset by 14px. That is the anchor.
- Draw a triangle at the anchor pointing at the ship.
- Draw a small ring behind the triangle whose radius shrinks with `overshoot = distance beyond the edge`.
- Blend the color from cyan to red as `overshoot / OUT_OF_BOUNDS_MARGIN` rises, with a pulse above 70%.

A plain Graphics draw, with no text, keeps it cheap and legible at small scale. The indicator is not drawn in wrap mode, since the ship is never off screen there.

- *Alternative considered:* shrinking the camera so the margin is visible. That would change the scale of the whole game, and it cannot show the ship anyway once it goes beyond the margin.

### D5. Wrap mode uses the minimum-image convention everywhere
- A helper, `wrapDelta(dx, W)`, maps a displacement into `(−W/2, W/2]`, and the same for y. `gravityAccelAt`, the collision and contact checks, capture and scoring distances all take an `edgeMode` (read from tuning) and use it. Position is wrapped with `((x % W) + W) % W` after each step.
- *Why minimum image:* if gravity did not wrap, the pull would jump at the seam, since a planet next to the right edge suddenly stops pulling a ship that has just crossed to the left edge. That discontinuity is the "gravity also wrapping" concern the user raised, and the minimum-image convention is what removes it. The trade-off is that a planet near one edge pulls on a ship near the opposite edge, which looks like action at a distance. To make that readable, planets within `r + scoreRange` of an edge are also drawn as faint ghost copies just past the opposite edge.
- **Forecast:** wrap each point. When two consecutive points are more than half the field apart, start a new polyline segment.
- **Trail:** broken the same way.
- *Field aspect:* on a 400×720 field, a vertical wrap sends the ship across a long distance. Wrap applies on both axes for consistency, and whether it is good is exactly what the playtest is for.

### D6. Tuning and HUD plumbing
- New `Tuning` fields: `shieldCharges`, `lethalImpactSpeed`, `bounceOut`, `kickTangential`, `shieldGraceSec`, `orbitHeight`, `captureBand`, `captureAngleDeg`, `captureSpeedTol`, `orbitScoreArcDeg`, `fuelGraceSec`, `controlMode: 'relative' | 'direct'`, `controlDeadzone`, `controlFullDrag`, `edgeMode: 'bounded' | 'wrap'`.
- The panel today only renders numeric sliders. It gets a small select row for the two enum fields.
- The scene emits `shields` (an integer) alongside `score` and `fuel`, and React renders pips next to the fuel bar.
- `checkLoss` becomes contact-aware: it returns `{ contact: planetIdx } | LossReason | null`, and the scene resolves the contact through D1. Keeping the classification pure means it can be tested without the scene.

## Risks / Trade-offs

- **Risk:** shields plus orbit lock make the game too easy. → The dev panel can turn shields down to 0, which restores the old instant death, and turn capture tolerances to 0. Default tuning is calibrated on a phone before this is presented as done.
- **Risk:** the lock and release feel abrupt, with a sudden velocity snap on capture. → Capture only happens within the speed and angle tolerances, so the snap is bounded by them. If it still reads as a jolt, blend position and velocity into the rail over about 0.15 s. That is a tuning follow-up, not a spec change.
- **Risk:** a knock-away pushes the ship into a neighboring planet. → The grace period covers the next contact, and layouts keep at least 14px of clearance between planets. Accepted.
- **Risk:** the capture ring conflicts with scoring, because riding the ring is already close to the maximum proximity bonus. → The bonus decay (D2) handles this.
- **Risk:** wrap mode is confusing. → It is dev-only, and bounded mode with the indicator ships as the default.
- **Trade-off:** changing `stepShip` from a target to a direction touches existing tests. → Rewrite those tests against the new signature. The behavior they assert (clamp, no thrust without fuel) is unchanged.
- **Trade-off:** the leaderboard mixes scores from before and after this change. → There are only a few test runs so far, so this is accepted.

## Open Questions

- The final default numbers (lethal impact speed, capture tolerances, locked scoring arc, empty-tank grace) are set during phone playtesting. They do not change the specs or the structure.
- Whether wrap or bounded ships as the long-term default is decided after playtest. Changing it later is a one-line default change plus a spec wording update.
