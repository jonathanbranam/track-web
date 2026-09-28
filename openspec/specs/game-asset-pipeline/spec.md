# game-asset-pipeline Specification

## Purpose
A per-game workspace, manifest and command set that turns generated or
hand-drawn pixel art into named, tracked, reviewed and packed sprite sheets.
Assets live outside git, and only final sheets are copied into a repo.

## Requirements

### Requirement: Asset workspace outside the repository
The pipeline SHALL operate on `GAME_ASSETS_DIR/<game>/`, where `<game>` is a
folder name (e.g. `mimlings`, `otter_game`), resolved from the environment or
the repo `.env` exactly as `pl` does. Each game folder SHALL use this layout:
`manifest.yaml`, `inbox/` (raw, unregistered files),
`work/<subject>/` (named assets and sources), `reference/` (material that is
never shipped), `review/` (generated), `dist/` (packed output). The pipeline
SHALL never write asset files inside the repository except through `ship`.

A game folder SHALL be created only by `assets init <game>`. Every other
command given a `<game>` whose folder does not exist SHALL fail without
writing anything, and its error SHALL name the closest existing game (if any),
list the existing games, and show the `assets init` command. For a game folder
that exists but lacks some of the layout (for example, no manifest yet), any
command SHALL create the missing subfolders and an empty manifest. `assets
init` SHALL be idempotent for an existing game, SHALL refuse a new name that
matches an existing game after ignoring case and treating `-`, `_` and spaces
as equal unless `--force` is given, and SHALL support `--json`.

#### Scenario: Different machine, different path
- **WHEN** `GAME_ASSETS_DIR` points at `~/Dropbox/games` on the Linux box
- **THEN** every command works there unchanged, with no absolute Mac paths stored in any manifest

#### Scenario: First use creates the layout
- **WHEN** `assets init newgame` runs and no `newgame/` folder exists
- **THEN** the standard subfolders and an empty manifest are created

#### Scenario: Mistyped game name
- **WHEN** games `mimlings` and `otter_game` exist and the user runs `assets review otter-game --serve`
- **THEN** the command fails with a message suggesting `otter_game`, listing both games and showing `assets init otter-game`; no `otter-game/` folder is created and no server starts

#### Scenario: Near-duplicate init refused
- **WHEN** `otter_game` exists and the user runs `assets init otter-game`
- **THEN** the command fails, naming `otter_game`, and creates nothing; with `--force` it creates `otter-game/`

#### Scenario: Existing folder without a manifest
- **WHEN** `oldgame/` exists with loose files but no `manifest.yaml`, and the user runs `assets status oldgame`
- **THEN** the missing subfolders and an empty manifest are created and the status is printed

### Requirement: Single manifest per game
Each game SHALL have one `manifest.yaml` holding a game-level config block
(default cell size, view, ship destination) and one entry per asset. An entry
SHALL record: a unique `id`; `subject`; `kind` (`sprite`, `rotations`,
`animation`, `variations`, `sheet`, `tileset`, `background`, `ui`, `source`,
`reference`); `file` (path relative to the game folder; a directory is allowed
for `reference` and `variations` sets and for tilesets saved as separate tile
images); `status`; optional `layout` (cell size,
grid columns and rows, frame count, frame order, direction per frame or row);
optional `anim` and `dir`; `tags` (e.g. `anchor`); `source` provenance (tool,
prompt, created time, PixelLab ids, original filename); `review` (verdict,
note, time); and a `history` of status changes. Paths in the manifest SHALL be
relative. Writes SHALL preserve entries and fields the tool does not know about.

#### Scenario: Round-trip preserves unknown fields
- **WHEN** a user adds a custom `notes:` field to an entry and a command later rewrites the manifest
- **THEN** the field is still there

#### Scenario: Duplicate id rejected
- **WHEN** a command would register a second entry with an existing `id`
- **THEN** it fails without writing and names the conflicting entry

### Requirement: Naming convention
Registered asset files SHALL be named in lowercase kebab-case as:
- still, one direction: `<subject>-<dir>-<cell>[-<label>].png`
- rotation set: `<subject>-rot<4|8>-<cell>[-<label>].png`
- animation: `<subject>-<anim>-<dir>-<cell>-<n>f[-<label>].png`
- candidate/variation grid: `<subject>-variations-<cols>x<rows>-<cell>[-<label>].png`
- other kinds: `<subject>-<kind>[-<desc>][-<label>].<ext>`

where `<dir>` is one of `s se e ne n nw w sw`, `<cell>` is the frame width in
pixels (or `WxH` when not square), and `<label>` is an optional short
distinguisher (`ur`, `v2`, `alt`). Source files (`.aseprite`) SHALL follow the
same subject-first form. The tooling SHALL provide a checker that reports
non-conforming registered files.

#### Scenario: Name generated from metadata
- **WHEN** an animation of subject `mochi-bunny`, anim `idle`, direction `s`, 32 px cells, 5 frames is registered
- **THEN** its file is named `mochi-bunny-idle-s-32-5f.png`

#### Scenario: Collision gets a label
- **WHEN** a second file would get the same name
- **THEN** it is given a `-v2` (then `-v3`, …) label, not overwritten

### Requirement: Status lifecycle
Registered assets SHALL move through `unreviewed → candidate → in-review →
approved → packed → shipped`; `rejected` SHALL be reachable from `unreviewed`,
`candidate` and `in-review`; `approved` and later MAY return to `in-review`.
`reference` SHALL mark material that is kept but never reviewed, packed or
shipped: it SHALL be reachable from `unreviewed`, `candidate` and `in-review`,
and MAY return to `in-review`. Files in `inbox/` are `raw` and SHALL NOT appear
in the manifest. `assets mark <game> <id…> <status> [--note …]` SHALL change
status, refuse transitions not listed here unless `--force`, and append to the
entry's `history`. Rejected files SHALL NOT be deleted.

#### Scenario: Legal transition
- **WHEN** the user runs `assets mark mimlings mochi-bunny-idle-s in-review`
- **THEN** the entry's status is `in-review` and its history has a timestamped line for the change

#### Scenario: Illegal transition
- **WHEN** the user marks an `unreviewed` asset as `shipped`
- **THEN** the command fails and the manifest is unchanged

#### Scenario: Mark as reference
- **WHEN** the user marks an `unreviewed` screenshot as `reference`
- **THEN** its status is `reference`, and `pack` and `ship` ignore it

#### Scenario: Reference cannot be packed directly
- **WHEN** the user marks a `reference` asset as `approved` without `--force`
- **THEN** the command fails and the manifest is unchanged

### Requirement: Status report
`assets status <game>` SHALL print counts per status and list the assets
waiting for review (`unreviewed`, `candidate`, `in-review`), grouped by subject.
Assets in `reference` SHALL be counted but SHALL NOT be listed as waiting. It
SHALL support `--json`. With no game argument it SHALL summarise every game
folder under `GAME_ASSETS_DIR`.

#### Scenario: What needs review
- **WHEN** the user runs `assets status mimlings --json`
- **THEN** the output includes per-status counts and the ids of every asset still to be reviewed

#### Scenario: Reference is not waiting
- **WHEN** a game has five `reference` screenshots and one `unreviewed` sprite
- **THEN** the counts show `reference: 5` and `unreviewed: 1`, and only the sprite is listed as waiting for review

### Requirement: Ingest from the inbox
`assets ingest <game>` SHALL register each file in `inbox/`, move it to
`work/<subject>/` under a convention name, and record provenance (including the
original filename and, for PixelLab web downloads, the creation time decoded
from the millisecond timestamp in the name). It SHALL detect layouts: a 3×3
grid whose first 8 cells are filled and last cell empty as an 8-direction
rotation set, cells row-major in PixelLab's direction order (s, se, e, ne, n,
nw, w, sw); other grids of
uniform cells as row-major animations whose frame count is the number of
non-empty cells; 8×8 grids of 64 cells as variation grids; and a PixelLab
spritesheet export (PNG with its layout JSON) as rotations plus one animation
per row. Subject, anim, direction and cell size SHALL be taken from options,
from the PixelLab layout JSON, or from the filename when it already follows
the convention; anything it cannot infer SHALL be left for the user, with the
file kept in `inbox/` and listed. `--dry-run` SHALL print the plan without
changing anything. Newly ingested assets SHALL have status `unreviewed`, except
`kind: reference` assets, which SHALL have status `reference`.

#### Scenario: Web-UI rotation grid
- **WHEN** `inbox/` holds a 96×96 web download with 8 filled cells and an empty last cell and the user runs `assets ingest mimlings --subject mochi-bunny --cell 32`
- **THEN** it becomes `work/mochi-bunny/mochi-bunny-rot8-32.png` with a `rotations` layout mapping each cell to its direction, status `unreviewed`

#### Scenario: PixelLab export
- **WHEN** `inbox/` holds a PixelLab spritesheet export with an 8-rotation row and one `Run`/`east` row of 6 frames
- **THEN** a `rotations` entry and a `run`/`e` animation entry with 6 frames are registered, each carrying the character id

#### Scenario: Not enough information
- **WHEN** a file's subject cannot be inferred and no `--subject` was given
- **THEN** it stays in `inbox/` and the command lists it as needing a subject

### Requirement: Adopt existing files from a plan
`assets adopt <game> <plan.yaml>` SHALL move and rename existing files within
the game folder according to a plan (a list of `from` → `to` paths with the
manifest fields to register), register each as `unreviewed` (or `reference`
for `kind: reference`), and write an undo record. `--dry-run` SHALL print the
plan's effect. `assets adopt <game> --undo <record>` SHALL restore every
original path and remove the entries it added. Adopt SHALL refuse to overwrite
an existing file and SHALL stop before any change if any `from` path is
missing.

#### Scenario: Adopt and undo
- **WHEN** a plan moves `mb-animations/mb-south.png` to `work/mochi-bunny/mochi-bunny-s-32.png` and is applied, then undone
- **THEN** after apply the new path exists with an `unreviewed` manifest entry recording the original name, and after undo the original path is back and the entry is gone

#### Scenario: Adopted reference material
- **WHEN** a plan moves a screenshot to `reference/thronglets-01.png` with `kind: reference`
- **THEN** its entry is registered with status `reference`

### Requirement: Review contact sheet
`assets review <game>` SHALL generate `review/index.html` that works opened
directly from disk: every registered asset shown at an integer zoom with
nearest-neighbour scaling, animations playing using their layout, grouped by
subject and filterable by status, showing id, status, pixel size, provenance
and review note. An entry whose `file` is a directory SHALL preview as a grid of the images
it contains, in natural filename order. With `--serve`, it SHALL serve the page on localhost with approve,
reject, reference and back-to-review buttons plus a note field that update the
manifest exactly as `assets mark` would. The served page SHALL be generated
fresh from the manifest on each request, so regenerating the static file (or
any other command writing `review/index.html`) SHALL NOT remove the served
controls. Each mark from the page SHALL re-read the manifest before changing it,
so changes made by other commands while the server runs SHALL NOT be lost. The
note is a free-text record stored with the status change; it SHALL NOT trigger
any other action. The note field SHALL be multi-line, show a saved note in full
without scrolling sideways, and grow as the user types. The page SHALL say at
the top whether it is the read-only page or the served page with review
controls, and how to get the other.

Each card SHALL show the asset's pixel size:
- a single image without a layout: its width × height;
- a sheet with a layout (animation, rotations, variations): the cell size and
  the frame or cell count;
- a tileset: the tile size and the number of tiles;
- a directory that is not a tileset: the number of images.

#### Scenario: Static review
- **WHEN** the user opens `review/index.html` from Dropbox on another machine
- **THEN** images and animated previews render without a server

#### Scenario: Directory entry previews as a grid
- **WHEN** a tileset entry's `file` is a directory of `…wang_0.png` … `…wang_15.png`
- **THEN** its card shows all 16 tiles in one grid, ordered 0, 1, 2 … 15 (not 0, 1, 10, 11 …)

#### Scenario: Approve from the page
- **WHEN** the page is served with `--serve` and the user clicks approve on an asset with a note
- **THEN** the manifest shows `approved` with that note, and the page reflects it after reload

#### Scenario: Static regeneration while serving
- **WHEN** the page is being served and someone runs `assets review mimlings` without `--serve`
- **THEN** reloading the served page still shows the note field and the buttons

#### Scenario: Concurrent CLI mark is kept
- **WHEN** the page is being served, the user runs `assets mark mimlings berry-s-32 rejected` from the CLI, then approves a different asset in the page
- **THEN** the manifest has both changes

#### Scenario: Long note is readable
- **WHEN** an asset has a saved three-sentence note and the page is served
- **THEN** the note field shows the whole note wrapped over several lines, and the card's meta text shows it wrapped too

#### Scenario: Mode is stated
- **WHEN** `review/index.html` is opened from disk
- **THEN** the top of the page says it is read-only and names `assets review <game> --serve` as the way to review

#### Scenario: Pixel size of a sprite and an animation
- **WHEN** the sheet shows a 32×32 still and a 5-frame animation with 40×40 cells
- **THEN** the still's card reads `32×32 px` and the animation's card reads `40×40 px · 5 frames`

#### Scenario: Pixel size of a tileset
- **WHEN** the sheet shows a tileset directory of sixteen 32×32 tiles
- **THEN** its card reads `tile 32×32 px · 16 tiles`

### Requirement: Pack approved assets into a sheet
`assets pack <game> <subject>` SHALL combine every `approved` (or already
`packed`) asset of the subject into `dist/<subject>.png` plus
`dist/<subject>.json` in Aseprite's JSON hash format, with one frame tag per
animation-direction (`<anim>-<dir>`, and `rot-<dir>` for rotation stills), so
the pair loads with Phaser's `load.aseprite` and `anims.createFromAseprite`.
Frames SHALL keep their pixels exactly (no scaling or resampling) and share one
cell size. `.aseprite` sources SHALL be exported through the Aseprite CLI,
whose path is configurable. Packed assets SHALL be marked `packed`. The command
SHALL fail, writing nothing, if the subject has no approved assets or the cell
sizes differ.

#### Scenario: Phaser-ready output
- **WHEN** a subject with approved `rot8` and `idle-s` (5 frames) assets is packed
- **THEN** the JSON lists 13 frames and frame tags `rot-s` … `rot-sw` and `idle-s` with the right frame ranges, and each frame in the PNG is pixel-identical to its source cell

### Requirement: Ship to a configured destination
`assets ship <game> [<subject>…]` SHALL copy `dist/` sheets for `packed`
subjects to the game's configured destination: an absolute path, a path
relative to the repository root, or one containing `${VAR}` environment
references. No destination SHALL be assumed. It SHALL mark the shipped assets
`shipped` and record the destination and content hash, and support
`--dry-run`. It SHALL refuse to ship subjects that have unpacked approved
changes.

#### Scenario: No destination configured
- **WHEN** the manifest has no ship destination
- **THEN** `assets ship` fails with a message showing where to set one

#### Scenario: Ship into a repo
- **WHEN** the destination is `client-games/public/mimlings` and the user ships `mochi-bunny`
- **THEN** `mochi-bunny.png` and `mochi-bunny.json` are copied there, and the manifest records the hash and marks the assets `shipped`

### Requirement: Full-size asset viewer
The review page SHALL open a full-size viewer when a card's preview is clicked,
both when opened from disk and when served. The viewer SHALL:
- draw the asset with nearest-neighbour scaling at an integer zoom, changeable
  with zoom-in and zoom-out controls;
- provide **Actual size**, which draws one image pixel per CSS pixel (the size
  the game draws it at scale 1), and **Fit**, which picks the largest integer
  zoom that fits the window (never below 1×);
- show the current zoom and the asset's pixel size;
- play animations and rotations at the selected zoom, with a toggle to show the
  whole sheet instead;
- show a directory tileset as its tile grid, tiles touching, so it reads as it
  would in the game;
- scroll when the zoomed image is larger than the window;
- close with a close control or the Escape key, and step to the previous or
  next visible asset with the arrow keys.

#### Scenario: Sprite at actual size
- **WHEN** the user opens a 32×32 sprite in the viewer and chooses Actual size
- **THEN** it is drawn 32×32 CSS pixels with no smoothing, and the viewer reads `1×`

#### Scenario: Zoom in on a sprite
- **WHEN** the user zooms in twice from Actual size
- **THEN** the sprite is drawn at 3× (96×96 CSS pixels) with hard pixel edges

#### Scenario: Tileset at game size
- **WHEN** the user opens the 16-tile meadow tileset and chooses Actual size
- **THEN** the tiles are drawn edge to edge at 32×32 CSS pixels each, in natural filename order

#### Scenario: Animation sheet toggle
- **WHEN** the user opens a 5-frame animation and turns on the sheet toggle
- **THEN** the whole strip is shown instead of the playing frame, at the same zoom

#### Scenario: Viewer from disk
- **WHEN** `review/index.html` is opened from disk with no server
- **THEN** the viewer opens and zooms the same way
