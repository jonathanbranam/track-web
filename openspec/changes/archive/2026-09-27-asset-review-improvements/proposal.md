# Proposal

## Why

The asset reviewer is hard to act on. Every new asset shows the status `named`,
which describes something the pipeline did (it renamed the file), not where the
asset is in review. Previews are squeezed into 200×120 thumbnails, so you can't
judge a sprite at its real pixel size or see a tileset at the size the game will
draw it. The cards also don't show pixel dimensions. And reference material,
such as the Thronglets screenshots, sits in the "waiting for review" list even
though it will never be reviewed or shipped.

## What Changes

- **BREAKING** (manifest data): the first status is renamed from `named` to
  `unreviewed` in the manifest, the CLI, the review page, the docs and the
  tests. Existing `manifest.yaml` files are migrated automatically the first
  time they are opened. Their `history` lines are rewritten too.
- New `reference` status for material that is kept but never reviewed, packed
  or shipped. New `kind: reference` entries are registered as `reference`.
  Existing `kind: reference` entries still in `named` move to `reference` in the
  same migration. That covers the five Thronglets screenshots, the Gemini faces
  image, and the otter game's animals/fish sets. `reference` does not count as
  waiting for review.
- Full-size view in the review page: click a card to open that asset in a
  viewer with integer zoom (nearest-neighbour), an **Actual size** button
  (1 image pixel = 1 CSS pixel, which is how the game draws it at scale 1) and a
  **Fit** button. Animations play in the viewer and can be switched to show the
  whole sheet. Directory tilesets are assembled into their tile grid. The viewer
  works in the static page as well as with `--serve`.
- Pixel size on every card and in the viewer: the image size for single
  images; the cell size and frame count for sheets (animations, rotations,
  variations); the tile size and tile count for tilesets; the image count for
  directory sets.
- The served page gets a **reference** button next to approve / reject / back
  to review.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `game-asset-pipeline`: the status lifecycle (renaming `named` to
  `unreviewed`, adding `reference`, and migrating existing manifests); the
  status report's list of what is waiting for review; the status that ingest and
  adopt assign; and the review contact sheet (full-size viewer, pixel sizes,
  reference action).

## Impact

- `scripts/pixellab/src/pixellab_tools/`: `manifest.py` (statuses,
  transitions, load-time migration), `ingest.py` / `adopt.py` (initial status),
  `review.py` (dimension data), `review_template.html` (viewer, sizes,
  reference button).
- `scripts/pixellab/tests/`: every test that uses `named`, plus new tests for
  the migration, the reference status and the dimension data.
- `docs/pixellab/README.md`: the lifecycle diagram and the command
  descriptions.
- Data outside the repo: `GAME_ASSETS_DIR/*/manifest.yaml` (`mimlings`,
  `otter_game`) are rewritten on first open after the change.
- No server, client-app, API or database changes.
