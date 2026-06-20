## 1. Animate the aim line dashes

- [ ] 1.1 Add a `private aimPhase = 0` field (or use `this.time.now` inline) to `BallMergeScene` to track the animation phase
- [ ] 1.2 Update `updateAimLine()` to accept a `phase` parameter and offset the starting `y` by `-(phase % step)` so dashes appear to scroll downward
- [ ] 1.3 Move the `updateAimLine()` call into `update()` (run every frame), passing the current time-based phase; remove the call from `movePreview()` (or keep it there too — it's harmless but redundant)
- [ ] 1.4 Confirm aim line stops animating (and is cleared) after `endGame()` by verifying the existing `this.aimLine.clear()` in the game-over path still runs and `update()` returns early on `gameOver`

## 2. Queue and expose the next ball

- [ ] 2.1 Add `private nextSize = 0` field to `BallMergeScene`
- [ ] 2.2 Refactor `readyNextBall()`: on the first call initialize both `heldSize` and `nextSize` with `pickSpawnSize()`; on subsequent calls rotate (`heldSize = nextSize`, `nextSize = pickSpawnSize()`)
- [ ] 2.3 Add a `private nextPreview!: Phaser.GameObjects.Image` and `private nextLabel!: Phaser.GameObjects.Text` to the scene for the "NEXT" HUD element
- [ ] 2.4 Create the `nextPreview` image and `nextLabel` text in `create()`, positioned in the top-right of the canvas (e.g., x ≈ `GAME_W - 30`, y ≈ `dropY`) at roughly half scale; hide them initially
- [ ] 2.5 Update `readyNextBall()` to refresh `nextPreview.setTexture(...)` and show/update `nextLabel` after setting `nextSize`
- [ ] 2.6 Hide `nextPreview` and `nextLabel` in the game-over path (alongside the existing `preview.setVisible(false)`)
- [ ] 2.7 Re-show and re-initialize `nextPreview`/`nextLabel` in `doRestart()` alongside the existing restart logic

## 3. Show the active level name in the HUD

- [ ] 3.1 Import `findLevel` from `./levels` in `BallMergeGame.tsx`
- [ ] 3.2 Derive `levelName` from `selectedLevelId` using `findLevel(selectedLevelId).name` and render it in the center of the top HUD bar using the same `bg-gray-800/80 rounded-lg` pill style as the score chip
- [ ] 3.3 Confirm the name updates when a new level is picked and a game starts

## 4. Verify and build

- [ ] 4.1 Run the games app locally and visually confirm the aim line dashes flow downward during gameplay
- [ ] 4.2 Visually confirm "NEXT" label and ball icon appear and update on every drop
- [ ] 4.3 Confirm both elements disappear on game over and reappear correctly after restart
- [ ] 4.4 Confirm the level name appears in the HUD and reflects the selected level; confirm it is visible on the game-over screen
- [ ] 4.5 Build the games client and confirm zero TypeScript errors: `npm run build:watch`
