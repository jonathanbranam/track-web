# Design

## Context

See proposal.md for the motivation. The current state:

- `manifest.py` holds `TRANSITIONS`, `ALL_STATUSES` and
  `REVIEW_WAITING_STATUSES`. `named` is the first status. `ingest._base_entry`
  hard-codes `"status": "named"` and a `to: named` history line. `adopt`
  copies each plan entry into the manifest as written, so its status comes from
  the plan file.
- Two real manifests exist, outside the repo, in `GAME_ASSETS_DIR`
  (`/Volumes/Data/Dropbox/games`): `mimlings` (35 `named`, 4 `rejected`,
  6 `kind: reference`) and `otter_game` (17 `named`, 2 `kind: reference`). They
  sync through Dropbox to the Linux box.
- `review.py` renders `review_template.html`, a single self-contained page with
  the data embedded as JSON. It must keep working when opened from disk. The
  working tree already has an uncommitted change that adds a `srcs` list and a
  grid preview for directory entries (the "Directory entry previews as a grid"
  scenario). This change builds on it.
- Tileset entries already record `layout.cell` and `layout.total_tiles`.
  Pillow is already a dependency.

## Goals / Non-Goals

**Goals:**
- No `named` left anywhere in code, tests, docs or the live manifests once
  each has been opened.
- A viewer that shows sprites and tilesets at the size the game draws them.

**Non-Goals:**
- Approve or reject buttons inside the full-size viewer. Those stay on the card
  for now.
- Tile-grid overlay lines, a background colour picker, onion skinning or frame
  scrubbing. These go in `docs/games/planning.md` if they are wanted later.
- Accepting `named` as an alias in `assets mark`. It is rejected like any other
  unknown status. The error message lists the valid ones.

## Decisions

### D1. Migrate on load, write back once

`Manifest._load` normalises every entry after reading:
- `status: named` becomes `unreviewed`, or `reference` if `kind: reference`;
- each `history[*].to: named` becomes `unreviewed`.

If anything changed, the loader saves the file immediately and appends one
history line (`to: <new>`, note `migrated from named`) to each entry whose
status moved to `reference`. That way the history shows why it changed. A
plain rename to `unreviewed` gets no extra line, because it is the same state
under a new name.

This follows the `db.ts` pattern, where the first open migrates, so no one has
to remember a migration command. It also covers a manifest synced from the
other machine later.

*Alternative:* a one-time `assets migrate` command. It was rejected because an
un-migrated manifest would then break `mark`, since `named` would not be in
`TRANSITIONS`, until someone remembered to run it.

*Alternative:* leave history lines as `named`. It was rejected because the
user asked for "everywhere", and a grep for `named` should come back clean.

Writing inside `_load` means read-only commands (`status`, `review` without
`--serve`) can modify the file once. That is acceptable: it is a single,
idempotent rewrite, and ruamel round-trip keeps comments and unknown fields.

### D2. The initial status is chosen in one place

`manifest.initial_status(kind)` returns `reference` for `kind: reference` and
`unreviewed` otherwise. `ingest._base_entry` uses it. `Manifest.add` fills in
`status` (and the first history line) when the entry has none. It applies the
same `named` normalisation as D1 when a plan still says `named`. Old adopt
plans in Dropbox therefore still work.

### D3. Transitions

```
unreviewed → candidate → in-review → approved → packed → shipped
(unreviewed, candidate, in-review) → rejected
(unreviewed, candidate, in-review) → reference
approved, packed, shipped, reference → in-review
```

`reference` is added to `ALL_STATUSES` but not to `REVIEW_WAITING_STATUSES`.
`pack` and `ship` need no change, because they select on `approved`, `packed`
and `shipped` only.

### D4. Pixel-size data is computed in Python

`review._entry_to_json` adds a `size` object, measured with Pillow when the
page is generated:

| Entry | `size` | Card label |
|---|---|---|
| single image, no layout | `{w, h}` | `32×32 px` |
| sheet with `layout.cell` | `{w, h, cell:[cw,ch], frames}` | `40×40 px · 5 frames` (rotations: `· 8 dirs`; variations: `· 64 cells`) |
| tileset (dir or sheet) | `{cell:[cw,ch], tiles}` | `tile 32×32 px · 16 tiles` |
| other directory | `{images}` | `12 images` |

For a directory tileset, the tile size comes from `layout.cell` when present,
and otherwise from the largest image. The tile count is the number of images
found, not `layout.total_tiles`, so the label shows what is actually on disk.
If the two disagree, the label adds a warning, e.g. `16 tiles (manifest says
15)`.

Doing this in Python makes it testable in pytest, and the numbers are in the
JSON before any image loads. The JS only formats the label.

*Alternative:* read `naturalWidth` in the browser. It was rejected because it
is untestable without a browser, and a directory's count and tile size would
have to wait for every image to load.

### D5. The viewer is a fixed overlay inside the same page

The viewer is a `position: fixed` overlay containing a toolbar and a scrollable
stage. The stage holds one `<canvas>` whose **backing size is the asset's
native size** (a frame, the sheet or the assembled tileset). The canvas CSS
`width` and `height` are set to `native × zoom` in CSS pixels, with
`image-rendering: pixelated`. The browser does the nearest-neighbour scaling,
so zooming is a style change with no redraw, and animation redraws only the
native-size canvas.

- **Actual size** sets zoom to 1: one image pixel per CSS pixel. That matches a
  Phaser game at scale 1 on the same display. On a Retina Mac each image pixel
  becomes 2×2 device pixels, just as it does in the game. This is stated in the
  toolbar tooltip.
- **Fit** sets `max(1, floor(min(stageW / w, stageH / h)))`.
- Zoom steps are integers from 1 to 16. The keys are `+`/`=`, `-`, `0` (actual
  size), `f` (fit), `Esc`, `←`/`→` (previous or next among the cards visible
  under the current filters).
- The canvas background is the same checkerboard used on the cards. It is
  applied to the stage rather than scaled with the canvas, so transparency
  reads the same at every zoom.
- The viewer reuses the card drawing code: `startCanvas` and `startGrid` are
  refactored to draw into any canvas and return a stop function, so the
  viewer's animation timer is cleared when it closes or steps to another asset.
- A **Sheet** toggle appears for entries with `frames > 1`. It draws the whole
  source image instead of animating one cell.
- The viewer opens on Fit for large assets and at the largest zoom ≤ 8× that
  fits for small ones, so a 32 px sprite opens big. Actual size is one key
  away.

There are no new files and nothing external to load, so the page still works
from `file://` and over Dropbox.

### D6. Reference button on served cards

The served page adds a `reference` button that posts
`{status: "reference"}` to `/api/mark`. The server needs no change, because
it already calls `Manifest.mark` and so gets the new transitions.

### D7. The served page is rendered per request; each mark re-reads the manifest

Today `--serve` writes `review/index.html` with `served: true`, and plain
`assets review` writes the same file with `served: false`. Whichever ran last
wins, and the running server sends the file from disk. That is how the note
field and the buttons disappeared on 2026-09-27: another agent regenerated the
static page while the user's server was running.

The fix is for the handler to answer `GET /review/` and `/review/index.html`
by rendering `render_html(..., served=True)` from a freshly loaded manifest.
Images and everything else are still served from disk. `review/index.html` on
disk is then only ever the static page. `--serve` still writes it on startup,
with `served=False`, so opening it from Dropbox keeps working.

`handle_mark_request` loads a new `Manifest(game_dir)` for each request
instead of reusing the one captured at startup. Otherwise a mark from the page
saves a stale copy over CLI marks, over ingests, and over the D1 migration.
A click that happens during a concurrent CLI write is still last-writer-wins at
file level, which is acceptable for one person working by hand.

*Alternative:* write the served page to a separate file (`review/served.html`).
It was rejected because it still goes stale, since other commands don't
regenerate it, and it leaves two files to explain.

### D8. Note is a textarea; the page states its mode

The note `<input>` becomes a `<textarea>` at full card width. It starts at
3 rows, or tall enough for the saved note, and grows as you type: on `input`,
set `height = scrollHeight`. The font goes from 11 px to the page's 13 px.
The note in the card meta already wraps. Cards stay 200 px wide rather than
widening the whole grid for the sake of one field.

`⌘/Ctrl+Enter` in the textarea does nothing special, so there is no hidden
submit. You still click a button. That avoids saving a status you didn't
pick.

A line under the title reads either "Read-only — run `npm run assets -- review
<game> --serve` to approve/reject" or "Review mode — changes save to
manifest.yaml".

## Risks / Trade-offs

- [The migration rewrites Dropbox files while the other machine might be
  editing them] → The rewrite is idempotent. A Dropbox conflict copy would be
  obvious and could be re-opened to migrate. Tasks run the migration once
  deliberately (§5) so it happens while it is being watched.
- [ruamel may reformat parts of the file when it saves] → The existing writes
  already go through the same round-trip. The migration task diffs the file
  before and after to confirm that only status and history lines changed.
- [Very large sheets (8×8 variations at 32 px = 256×256) at high zoom make big
  canvases] → Only CSS size grows. The backing store stays native, so memory
  does not grow with zoom.
- [`named` still appears in the archived change and the archived design doc] →
  Those are history and are left as they are. "Everywhere" covers live code,
  tests, docs, specs (through this delta) and data.

## Migration Plan

1. Land the code and tests.
2. Run `npm run assets -- status` (no game). Opening every manifest migrates
   each one. Diff each `manifest.yaml` against a copy taken beforehand, and
   check the counts: `mimlings` should show 29 `unreviewed` (35 minus 6),
   6 `reference` and 4 `rejected`; `otter_game` should show 15 `unreviewed`
   and 2 `reference`.
3. Rollback: restore the pre-migration copies of the two manifests and revert
   the commit.
