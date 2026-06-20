## 1. Update Ball Definitions in logic.ts

- [x] 1.1 Add `label: string`, `radiusX?: number`, `radiusY?: number` fields to the `BallSize` interface
- [x] 1.2 Replace the 7-entry `SIZES` array with 11 sports ball entries (Ping Pong through Yoga Ball) using the radii, colors, and point values from the design doc
- [x] 1.3 Set `SPAWN_MAX_SIZE = 4` (was 2)
- [x] 1.4 Update `logic.test.ts`: fix size count assertions, spawn range assertions, and point value checks to match the new 11-ball table

## 2. Update Physics in BallMergeScene.ts

- [x] 2.1 Add `ellipseVerts(rx, ry, n = 16)` helper that returns 16 `{x, y}` points forming a convex polygon approximating an ellipse centered at `(0, 0)`
- [x] 2.2 In `addBall()`, check `info.radiusX` and `info.radiusY`: if present, call `ball.setBody({ type: 'fromVertices', verts: ellipseVerts(info.radiusX, info.radiusY) }, physicsOptions)` instead of `ball.setCircle(info.radius)`; pass the same friction/bounce options either way
- [x] 2.3 Confirm in manual play that the football's physics body is positioned correctly (centroid aligned with sprite origin); fall back to `ball.setCircle(info.radiusY)` and document the decision if a position offset appears

## 3. Implement Per-Ball Texture Drawing

- [x] 3.1 Refactor `generateTextures()` to compute canvas size from `(s.radiusX ?? s.radius) * 2` × `(s.radiusY ?? s.radius) * 2` and dispatch to a per-ball draw function
- [x] 3.2 Draw **Ping Pong**: orange circle + standard shine highlight (no additional markings)
- [x] 3.3 Draw **Golf Ball**: white circle + ~18 small filled dots in two rings (inner ring ~6 dots, outer ring ~12 dots) to suggest dimples
- [x] 3.4 Draw **Tennis**: yellow-green circle + one white S-curve seam (bezier from top-left arc to bottom-right arc)
- [x] 3.5 Draw **Baseball**: cream circle + two red curved arc paths with short perpendicular tick marks (stitching lines, mirrored arcs on left and right halves)
- [x] 3.6 Draw **Softball**: bright yellow circle + same two-arc stitching pattern as baseball but in blue
- [x] 3.7 Draw **Volleyball**: sky-blue circle + three curved white seam lines (one horizontal band, two angled bands crossing it) suggesting panel construction
- [x] 3.8 Draw **Soccer**: charcoal circle + five white pentagon outlines (one centered, four rotated around it at ~72° intervals)
- [x] 3.9 Draw **Basketball**: deep-orange circle + three black curved seam paths (one vertical center seam, two lateral seams arcing across the ball)
- [x] 3.10 Draw **Football**: dark-brown ellipse on 168×100 canvas + white horizontal line across the center (seam) + four short white vertical bars evenly spaced along the center line (laces)
- [x] 3.11 Draw **Beach Ball**: coral base circle + six arc-wedge fills in alternating colors (red, white, blue, yellow, green, orange) radiating from center to edge
- [x] 3.12 Draw **Yoga Ball**: periwinkle circle + standard shine highlight only (smooth, no markings)

## 4. Update the Spec

- [x] 4.1 Apply the delta spec to `openspec/specs/games-ball-merge/spec.md`: update the "Drop a randomly-sized ball" requirement to specify sizes 0–4 as the droppable range; add the "Sports-themed ball identity and visual markings" requirement with all scenarios

## 5. Build and Verify

- [x] 5.1 Run `npm run build` (or `npm run build:watch` for client-games) and confirm zero TypeScript errors
- [x] 5.2 Run `logic.test.ts` tests and confirm all pass
- [x] 5.3 Load the game in a browser, drop all 5 spawn sizes and verify each renders with correct sport markings
- [x] 5.4 Merge two balls up through Volleyball to confirm earned-only sizes are not spawnable
- [x] 5.5 Spawn or trigger a Football (size 8) and confirm: ellipse visual, correct tumbling rotation, and collision behavior on the long axis differs from the narrow axis
- [x] 5.6 Confirm Beach Ball wedge colors and Soccer pentagon outlines render clearly at actual game size
- [x] 5.7 Play a full game across at least two different level shapes and confirm no regressions in overflow detection, merge, or leaderboard submission
