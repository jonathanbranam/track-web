# game-asset-pipeline Specification

## Purpose
A per-game workspace, manifest and command set that turns generated or
hand-drawn pixel art into named, tracked, reviewed and packed sprite sheets.
Assets live outside git, and only final sheets are copied into a repo.

## Requirements

### Requirement: Asset workspace outside the repository
The pipeline SHALL operate on `GAME_ASSETS_DIR/<game>/`, where `<game>` is a
folder name (e.g. `mimlings`, `otter_game`), resolved from the environment or
the repo `.env` exactly as `pl` does. Each game folder SHALL use this layout,
created on first use: `manifest.yaml`, `inbox/` (raw, unregistered files),
`work/<subject>/` (named assets and sources), `reference/` (material that is
never shipped), `review/` (generated), `dist/` (packed output). The pipeline
SHALL never write asset files inside the repository except through `ship`.

#### Scenario: Different machine, different path
- **WHEN** `GAME_ASSETS_DIR` points at `~/Dropbox/games` on the Linux box
- **THEN** every command works there unchanged, with no absolute Mac paths stored in any manifest

#### Scenario: First use creates the layout
- **WHEN** `assets status newgame` runs for a folder with no manifest
- **THEN** the standard subfolders and an empty manifest are created

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
Registered assets SHALL move through `named → candidate → in-review →
approved → packed → shipped`; `rejected` SHALL be reachable from `named`,
`candidate` and `in-review`; `approved` and later MAY return to `in-review`.
Files in `inbox/` are `raw` and SHALL NOT appear in the manifest. `assets mark
<game> <id…> <status> [--note …]` SHALL change status, refuse transitions not
listed here unless `--force`, and append to the entry's `history`. Rejected
files SHALL NOT be deleted.

#### Scenario: Legal transition
- **WHEN** the user runs `assets mark mimlings mochi-bunny-idle-s in-review`
- **THEN** the entry's status is `in-review` and its history has a timestamped line for the change

#### Scenario: Illegal transition
- **WHEN** the user marks a `named` asset as `shipped`
- **THEN** the command fails and the manifest is unchanged

### Requirement: Status report
`assets status <game>` SHALL print counts per status and list the assets
waiting for review (`named`, `candidate`, `in-review`), grouped by subject.
It SHALL support `--json`. With no game argument it SHALL summarise every game
folder under `GAME_ASSETS_DIR`.

#### Scenario: What needs review
- **WHEN** the user runs `assets status mimlings --json`
- **THEN** the output includes per-status counts and the ids of every asset still to be reviewed

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
changing anything. Newly ingested assets SHALL have status `named`.

#### Scenario: Web-UI rotation grid
- **WHEN** `inbox/` holds a 96×96 web download with 8 filled cells and an empty last cell and the user runs `assets ingest mimlings --subject mochi-bunny --cell 32`
- **THEN** it becomes `work/mochi-bunny/mochi-bunny-rot8-32.png` with a `rotations` layout mapping each cell to its direction

#### Scenario: PixelLab export
- **WHEN** `inbox/` holds a PixelLab spritesheet export with an 8-rotation row and one `Run`/`east` row of 6 frames
- **THEN** a `rotations` entry and a `run`/`e` animation entry with 6 frames are registered, each carrying the character id

#### Scenario: Not enough information
- **WHEN** a file's subject cannot be inferred and no `--subject` was given
- **THEN** it stays in `inbox/` and the command lists it as needing a subject

### Requirement: Adopt existing files from a plan
`assets adopt <game> <plan.yaml>` SHALL move and rename existing files within
the game folder according to a plan (a list of `from` → `to` paths with the
manifest fields to register), register each as `named`, and write an undo
record. `--dry-run` SHALL print the plan's effect. `assets adopt <game> --undo
<record>` SHALL restore every original path and remove the entries it added.
Adopt SHALL refuse to overwrite an existing file and SHALL stop before any
change if any `from` path is missing.

#### Scenario: Adopt and undo
- **WHEN** a plan moves `mb-animations/mb-south.png` to `work/mochi-bunny/mochi-bunny-s-32.png` and is applied, then undone
- **THEN** after apply the new path exists with a manifest entry recording the original name, and after undo the original path is back and the entry is gone

### Requirement: Review contact sheet
`assets review <game>` SHALL generate `review/index.html` that works opened
directly from disk: every registered asset shown at an integer zoom with
nearest-neighbour scaling, animations playing using their layout, grouped by
subject and filterable by status, showing id, status, provenance and review
note. An entry whose `file` is a directory SHALL preview as a grid of the images
it contains, in natural filename order. With `--serve`, it SHALL serve the page on localhost with approve,
reject and back-to-review buttons plus a note field that update the manifest
exactly as `assets mark` would.

#### Scenario: Static review
- **WHEN** the user opens `review/index.html` from Dropbox on another machine
- **THEN** images and animated previews render without a server

#### Scenario: Directory entry previews as a grid
- **WHEN** a tileset entry's `file` is a directory of `…wang_0.png` … `…wang_15.png`
- **THEN** its card shows all 16 tiles in one grid, ordered 0, 1, 2 … 15 (not 0, 1, 10, 11 …)

#### Scenario: Approve from the page
- **WHEN** the page is served with `--serve` and the user clicks approve on an asset with a note
- **THEN** the manifest shows `approved` with that note, and the page reflects it after reload

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
