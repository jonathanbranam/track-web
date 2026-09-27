# Design

## Context

- See `proposal.md` for why. Requirements are in `specs/pixellab-cli/` and
  `specs/game-asset-pipeline/`; this document covers how.
- The repo is TypeScript/npm. The user asked for a **Python** shim, `python3`
  is 3.11, and `uv` is installed (`~/.local/bin/uv`). No Python exists in the
  repo today.
- PixelLab reference: `docs/pixellab/api.md` (endpoints, job polling, image
  objects, spritesheet export format) and `choosing-tools.md`. The live spec is
  `https://api.pixellab.ai/v2/openapi.json`.
- `.env` already has `PIXELLAB_SECRET` and `GAME_ASSETS_DIR=/Volumes/Data/Dropbox/games`;
  `.env.example` documents both. `.env` is also loaded by the server via
  `dotenv/config`, and the extra variables are harmless there.
- Aseprite is at `/Applications/Aseprite.app/Contents/MacOS/aseprite`. The
  user's PixelLab Aseprite extension prints a Lua error in batch (`-b`) mode.
  `--list-tags --data` works despite it, but a `--scale … --save-as` attempt
  wrote nothing, so the export path needs checking (see Risks).
- Facts about existing files, verified by pixel comparison on 2026-09-27:
  - A web-UI **8-rotation download** is a 3×3 grid, **row-major in PixelLab's
    direction order** `s, se, e, ne, n, nw, w, sw`, with the **last** cell
    empty (not a compass layout).
  - Web-UI animation downloads are row-major grids with trailing cells empty.
  - `_mochi-bunny-ur.png` is pixel-identical to cell r1-c0 of
    `pixellab---Mochi-bunny---a-tiny-round-m-1790386476081.png` and to the south
    cell of the mochi rotation grid. The 64 `mochi-bunny-variations/*` files are
    slices of that same sheet.
  - `mb-south/east/west.png` equal their rotation-grid cells exactly;
    `mb-north.png` differs by 106 px (hand-edited).

## Goals / Non-Goals

**Goals:**
- One `uv` Python project in the repo, two commands (`pl`, `assets`),
  reachable as `npm run pl -- …` and `npm run assets -- …`.
- Pure, unit-tested core (naming, layout detection, manifest transitions,
  packing), with thin I/O and network edges.
- Works identically on the Mac and the Linux box, driven only by env/.env.

**Non-Goals:**
- No game code: nothing in `client-games` loads these sheets yet, and no ship
  destination is exercised against a real client in this change.
- No automatic generation from the manifest (batch "regenerate from prompts")
  — later work.
- No PixelLab library sync or tag management beyond `pl get` / `pl post`.
- No texture atlases spanning several subjects; one sheet per subject.

## Decisions

### D1. A `uv` project at `scripts/pixellab/`

```
scripts/pixellab/
  pyproject.toml        name "pixellab-tools", requires-python >=3.11
                        deps: pillow, ruamel.yaml, python-dotenv; dev: pytest
                        [project.scripts] pl = pixellab_tools.pl:main
                                          assets = pixellab_tools.assets_cli:main
  uv.lock               committed
  src/pixellab_tools/
    config.py     repo-root discovery, .env loading, GAME_ASSETS_DIR, ASEPRITE_BIN
    api.py        HTTP (urllib), auth header, job polling, image extraction/saving, log
    pl.py         the pl CLI (argparse)
    naming.py     build/parse convention names; direction codes; collision labels
    layout.py     grid detection from a PNG (cell size, filled cells, kinds)
    manifest.py   load/save (ruamel round-trip), entries, transitions, history
    ingest.py     inbox → work/, including PixelLab export (png + json)
    adopt.py      plan apply / dry-run / undo
    review.py     static HTML generation + optional local server
    review_template.html
    pack.py       frame extraction (PNG grids, Aseprite CLI) → sheet + Aseprite JSON
    ship.py       destination resolution, copy, hash
    assets_cli.py the assets CLI (argparse subcommands)
  tests/          pytest; synthetic PNGs built in fixtures; no network
```

`package.json` scripts:
`"pl": "uv run --project scripts/pixellab pl"`,
`"assets": "uv run --project scripts/pixellab assets"`,
`"test:pixellab": "uv run --project scripts/pixellab pytest scripts/pixellab/tests"`.
Add `scripts/pixellab/.venv/` (and `__pycache__/`) to `.gitignore`.

*Why:* `uv` gives a reproducible environment with no manual venv. It is not an
npm workspace, so the production `npm install` never touches it.
*Alternatives:* PEP 723 single-file scripts (don't scale past one file, and are
awkward to test); TypeScript with `tsx` like `scripts/admin.ts` (the user asked
for Python, and Pillow is the right tool for pixel work).

### D2. Configuration resolution

The repo root is found by walking up from the package to the directory with
`package.json` + `openspec/`. Then `.env` is loaded without overriding existing
environment variables (shell wins). Values used:

- `PIXELLAB_SECRET`
- `GAME_ASSETS_DIR` (with `~` expanded)
- `ASEPRITE_BIN`: default is the macOS app path if it exists, else `aseprite`
  on `PATH`

`PIXELLAB_API_BASE` is an optional override, for tests.

### D3. `pl` argument grammar (httpie-style)

- `key=value` → string
- `key:=json` → parsed JSON
- `key=@path` → `{"type":"base64","base64":…,"format":"png"}`
- Dotted keys nest.

`@path` resolves against the cwd, then `GAME_ASSETS_DIR`. Endpoint names are
given without the leading slash.

Result-image discovery walks the final `last_response` (or the sync body) for
image objects: `image`, `images[]`, and direction-keyed dicts. Direction keys
become the filename suffix (`<prefix>-south.png`); list items become
`<prefix>-0.png`.

`pl export` fetches `/characters/{id}/spritesheet` or `/objects/{id}/spritesheet`
(ZIP) and unzips it; `--zip` uses `/characters/{id}/zip`.

Every POST appends a line to `GAME_ASSETS_DIR/pixellab-log.jsonl`. Image values
are replaced with `{"@": "<source path>"}`, and a second line records the
completion: usage and saved files. HTTP errors print status and body (never
the auth header).

### D4. The manifest

`GAME_ASSETS_DIR/<game>/manifest.yaml`, loaded and saved with `ruamel.yaml`
round-trip, so comments, key order and unknown fields survive hand edits.

```yaml
version: 1
game: mimlings
config:
  cell: 32
  view: low top-down
  ship:
    dest: client-games/public/mimlings   # repo-relative | absolute | ${VAR}/…
assets:
  - id: mochi-bunny-idle-s-32-5f          # = filename stem; unique
    subject: mochi-bunny
    kind: animation
    file: work/mochi-bunny/mochi-bunny-idle-s-32-5f.png
    anim: idle
    dir: s
    layout: {cell: [32, 32], cols: 3, rows: 2, frames: 5, order: row-major}
    status: named
    tags: []
    source:
      tool: pixellab-web                  # pixellab-web|pixellab-api|pixellab-export|aseprite|gemini|third-party|screenshot|derived
      original: mb-animations/pixellab-gentle-breathing--body-softly--1790388421662.png
      created: 2026-09-26T…Z              # from the ms timestamp when present
      prompt: gentle breathing, body softly rising and falling …   # when known
      pixellab: {character_id: …, job_id: …}
    review: {verdict: null, note: null, at: null}
    history:
      - {at: 2026-09-27T…Z, to: named, note: adopted}
```

A `rotations` layout adds `dirs: [s, se, e, ne, n, nw, w, sw]`, one per filled
cell in order. `variations` and `reference` entries may point `file` at a
directory.

Allowed transitions, from the spec:

| From | Allowed next states |
|---|---|
| `named` | `candidate`, `in-review`, `approved`, `rejected` |
| `candidate` | `in-review`, `approved`, `rejected` |
| `in-review` | `approved`, `rejected` |
| `approved` | `packed`, `in-review` |
| `packed` | `shipped`, `in-review` |
| `shipped` | `in-review` |

Skipping from `named` straight to `approved` is allowed so the user can approve
directly. `--force` overrides the table.

### D5. Layout detection (`layout.py`)

Given a PNG and a cell size (from `--cell`, the manifest `config.cell`, or the
name), the image is split into a grid of cells, and each cell is marked empty
if all its pixels have alpha 0. The first matching rule wins:

1. 3×3 grid, cells 0–7 filled, cell 8 empty → `rotations`, dirs in PixelLab order.
2. 8×8 grid, 64 cells (all filled) → `variations`.
3. Otherwise, filled cells contiguous from index 0 → `animation`, with
   `frames` = the filled count.
4. A single cell → `sprite`.

Anything else is `unknown`, and the file stays in the inbox. The cell size can
also be guessed when it isn't given: try 32, then 16, 48 and 64, preferring the
size where rule 1 or 2 holds.

For a PixelLab export, the adjacent layout `.json` is authoritative:
- Row 0 becomes a `rotations` entry.
- Each animation row becomes an `animation` entry, with the name lowercased
  and kebab-cased and the direction mapped to a code.
- Each row is cropped into its own file (`crop` into `work/<subject>/`).
- The character name / state becomes the `<label>`, e.g.
  `otter-rot8-32-idle.png` and `otter-run-e-32-6f-idle.png`.

### D6. Packing to Aseprite JSON (`pack.py`)

1. Collect frames for every `approved`/`packed` asset of the subject:
   - PNG grids are cut into cells by their layout.
   - `.aseprite` sources are exported once to a temp dir with
     `aseprite -b <file> --data <tmp>/<id>.json --format json-array
     --list-tags --save-as "<tmp>/<id>-{frame}.png"` (one call; see Risks —
     the `{tag}-{tagframe}` filename form is untested since no adopted
     source has a tag). Frame files are always named by plain index; tag
     ranges (when the source has any) come from `meta.frameTags` in the
     `--data` JSON and are applied in Python. Only `source`-kind files the
     user approved are included.
2. Order the frames by asset: rotations first, then animations sorted by id.
3. Place them in a grid of at most 16 columns, with no padding, and write the
   PNG.
4. Write JSON in Aseprite's "hash" format:
   - Frame keys are `"0"…"N-1"`, in order.
   - Each frame has `frame{x,y,w,h}`, `rotated:false`, `trimmed:false`,
     `spriteSourceSize`, `sourceSize` and `duration` (from the entry's `fps`,
     or 100 ms).
   - `meta` has `image`, `size`, `format: RGBA8888`, `scale: "1"`, and
     `frameTags[{name, from, to, direction: "forward"}]` named `<anim>-<dir>`
     and `rot-<dir>`.
5. Before finalizing, check how Phaser's
   `AnimationManager.createFromAseprite` resolves frame names in the Phaser
   version `client-games` pins (under `node_modules/phaser/src/animations/`),
   and match it. It should read the tag ranges and frame keys as index
   strings, which is why the keys are `"0"…"N-1"`.

   **Verified 2026-09-27** against `client-games`'s installed Phaser (3.90.0;
   `package.json` pins `^3.88.2`), `node_modules/phaser/src/animations/AnimationManager.js`
   `createFromAseprite` (line ~400): for each `meta.frameTags` entry it loops
   `for (var i = from; i <= to; i++)`, does `var frameKey = i.toString();`,
   then `frames[frameKey]` — i.e. it looks up the frame by the **stringified
   integer index** directly in the JSON's top-level `frames` map. This
   confirms `pack.py` must emit `frames` as an object keyed `"0"`, `"1"`, …
   `"N-1"` (the "hash" form, not an array) and `frameTags[].from`/`.to` as
   those same integer indices — exactly what D6 already specified.

Pixel exactness is a test: every sheet cell must equal its source cell (Pillow
`ImageChops.difference(...).getbbox() is None`).

### D7. Review page

`review.py` renders `review_template.html` with the manifest embedded as JSON.

- Images are referenced by paths relative to `review/`, so the page works from
  `file://` on any Dropbox machine.
- Previews are `<canvas>` elements with `imageSmoothingEnabled = false` at an
  integer zoom. Animations cycle through their layout's cells with
  `drawImage` (no `getImageData`, so there are no file:// taint problems).
  Rotation sets cycle through their directions.
- Filters: status and subject. Each card shows id, status, source tool,
  original name, created time and review note.

`--serve [--port 8765]` runs `http.server` on `127.0.0.1` only. The page then
shows approve / reject / back-to-review buttons and a note field. Each click
POSTs `/api/mark {id, status, note}`, which calls the same manifest function as
`assets mark` and then regenerates the page.

### D8. Adopt plans and the undo record

A plan is YAML stored at `<game>/_migration/<date>-<name>.yaml`:

```yaml
moves:
  - from: <old path>
    to: <new path>
    entry: {<manifest fields>}
  - …
```

The apply steps are:

1. Validate the whole plan: every `from` exists, no `to` exists, and no
   duplicate ids.
2. Move the files, creating directories as needed.
3. Register the entries.
4. Write `<plan>.undo.yaml` listing the reverse moves and the ids added.
5. Remove directories left empty by the moves, and record them in the undo
   record so undo recreates them.

`.DS_Store` files are ignored and never block a directory removal.

### D9. First run: the best-effort rename

The implementer writes this as the adopt plan, checks it with `--dry-run`,
then applies it. Frame counts come from layout detection, not from this table.
All entries start as `named`.

**mimlings/**

| From | To | Kind / notes |
|---|---|---|
| `_mochi-bunny-ur.png` | `work/mochi-bunny/mochi-bunny-s-32-ur.png` | sprite, dir s, **tags [anchor]**; source `derived` from the colorways sheet r1-c0 |
| `pixellab---Mochi-bunny---a-tiny-round-m-1790386476081.png` | `work/mochi-bunny/mochi-bunny-variations-8x8-32-colorways.png` | variations; pixellab-web |
| `pixellab-a-tiny-round-mochi-bunny--a-so-1790388004065.png` | `work/mochi-bunny/mochi-bunny-variations-8x8-32-props.png` | variations; pixellab-web |
| `mochi-bunny-variations/` (dir) | `work/mochi-bunny/variations-colorways/` | variations set (dir); derived: slices of the colorways sheet |
| `mb-animations/pixellab-cute-wizard-1790390374425.png` | `work/mochi-bunny/mochi-bunny-rot8-32.png` | rotations |
| `mb-animations/mb-south.png` / `mb-east.png` / `mb-west.png` | `work/mochi-bunny/mochi-bunny-{s,e,w}-32.png` | sprite; derived from the rot8 cells (identical) |
| `mb-animations/mb-north.png` | `work/mochi-bunny/mochi-bunny-n-32-edit.png` | sprite; hand-edited from the rot8 north cell (106 px differ) |
| `mb-animations/mb-face.png` | `work/mochi-bunny/mochi-bunny-s-16-face.png` | sprite, 16 px face overlay |
| `mb-animations/pixellab-gentle-breathing--body-softly--1790388421662.png` | `…/mochi-bunny-idle-s-32-<n>f.png` | animation |
| `mb-animations/pixellab-tilts-head-back-to-look-straig-1790388529922.png` | `…/mochi-bunny-look-up-s-32-<n>f.png` | animation |
| `mb-animations/pixellab-holds-a-small-berry-in-both-fr-1790388993130.png` | `…/mochi-bunny-eat-s-32-<n>f.png` | animation |
| `mb-animations/pixellab-tired--moving-into-a-sleeping--1790389257404.png` | `…/mochi-bunny-sleep-s-32-<n>f.png` | animation |
| `mb-animations/pixellab-mochi-bunny--motion-is-squash--1790391168414.png` | `…/mochi-bunny-shove-e-32-<n>f.png` | animation (east, per its prompt) |
| `mb-expressions/pixellab-pixel-art-sprite-sheet-of-tiny-1790391817000.png` | `work/mochi-bunny/mochi-bunny-variations-8x8-16-faces-a.png` | variations (16 px cells) |
| `mb-expressions/…-1790392054712.png`, `…-1790392287517.png` | `…/mochi-bunny-variations-8x8-32-faces-b.png`, `…-faces-c.png` | variations |
| `mb-expressions/Gemini_Generated_Image_x3awcmx3awcmx3aw.jpeg` | `reference/mochi-bunny-faces-gemini.jpeg` | reference; gemini |
| `Screenshot 2026-09-25 at 9.07.{06,10,17,24,28} PM.png` | `reference/thronglets-01.png` … `-05.png` | reference; screenshot (Black Mirror *Thronglets*) |
| empty `mochi-bunny/` dir | removed | |

The prompts in `docs/games/mimlings/mochi-bunny-pixellab-prompts.md` should be
copied into `source.prompt` where they clearly match: idle, look-up, eat,
sleep and shove.

**otter_game/**

| From | To | Kind / notes |
|---|---|---|
| `otter/pixellab-cute-wizard-1790393612268.png` | `work/otter/otter-rot8-32.png` | rotations |
| `otter/otter-01-east.png` | `work/otter/otter-e-32.png` | sprite |
| `otter/otter-01-east-walk.png` | `work/otter/otter-walk-e-32-<n>f.png` | animation |
| `otter_character/Otter_first.aseprite`, `otter_2`, `otter_3`, `Otter_fours` | `work/otter/otter-source-v1…v4.aseprite` (in that order) | source; aseprite (64×64; `otter_3` has a PixelLab inpainting layer) |
| `otter_character/fish_1.aseprite`, `fish_2` | `work/fish/fish-source-v1.aseprite`, `-v2` | source |
| `otter_character/humans_1.aseprite` | `work/human/human-source-v1.aseprite` | source |
| `esther.aseprite` | `work/esther/esther-source.aseprite` | source; note "subject unknown — confirm" |
| `backgrounds/background_1.aseprite` | `work/background/background-source-v1.aseprite` | source (200×200, 4 frames) |
| `reference art/animals/`, `reference art/fish/` | `reference/animals/`, `reference/fish/` | reference sets (dirs, filenames kept); note "origin/licence unknown — never ship" |

After adopting, the implementer runs `pl export character
b376946f-5fa9-4f33-8f7a-01c1c302245e --game otter_game` and `pl export character
3ab632d0-8e92-4366-a7df-110c92d816b0 --game otter_game`, then runs `assets
ingest otter_game --subject otter`. This is a live test of export and ingest
(free calls). It produces `otter-rot8-32-idle`, `otter-run-e-32-6f-idle` and
`otter-rot8-32-walking`.

Ship config: `mimlings` gets `dest: client-games/public/mimlings`, which is set
but not run. `otter_game` gets none, because its home is undecided.

Afterwards, update the anchor path in
`docs/games/mimlings/mochi-bunny-pixellab-prompts.md` (it currently says
`_mochi-bunny-ur.png`).

### D10. Tests

pytest covers:
- naming build/parse round-trips and collisions
- layout detection on synthetic grids: rotation 3×3 with the last cell empty,
  5-frame 3×2, 8×8, single sprite, unknown
- manifest round-trip keeps comments and unknown fields; transitions; duplicate ids
- `pl` argument parsing; image object building; result-image discovery over
  the three response shapes; log redaction (with a fake HTTP layer and
  `PIXELLAB_API_BASE` pointed at a local stub server)
- ingest from a synthetic inbox, including a fake PixelLab export ZIP layout
- adopt apply/undo in a tmp dir
- pack pixel exactness and JSON tags
- ship to a tmp destination, with `${VAR}` expansion and the no-destination error
- review HTML generation containing every entry, and the serve endpoint
  updating the manifest

Free live checks: `pl balance`, `pl get characters`, and the two exports in D9.

### D11. Live generation verification (user-requested)

The website and the API can behave differently, so every **primary** tool is
run for real at least once **through `pl`**. This also tests image upload end
to end. For each call, record:
- the exact `pl` command,
- the request shape as sent (from `--dry-run` and the log),
- the response shape (which keys hold the images; sizes; frame counts;
  whether frame 0 is the input),
- the billed usage.

Compare everything against `docs/pixellab/api.md` and fix the doc where
reality differs.

**Budget:**
- Stop at a **30-generation** hard cap: check `pl balance` before the first call
  and after the last, and stop if the running total would exceed the cap.
- **Pro-tier tools (20–40 each) are excluded.**
- Every output goes to `GAME_ASSETS_DIR/mimlings/inbox/verify/` and is ingested
  so it appears in the manifest and review page as `named`.

**The anchor:** `_mochi-bunny-ur.png` (after D9, `work/mochi-bunny/mochi-bunny-s-32-ur.png`)
is the reference or first frame for every character and animation call.

| # | Tool | Call | Verify |
|---|---|---|---|
| 1 | `create-character-v3` | `reference_image=@…-ur.png`, description of the mochi bunny, `name` "mochi-bunny" | Image upload works; it becomes a stored character with 8 rotations at ~32 px; south still resembles the UR; cost ≈1–2. **This is the mochi-bunny character from now on:** tag it `mimlings`. |
| 2 | `characters/animations` v3 | that character, `action_description` idle breathing (from the prompts doc), `directions:=["south","east","north"]`, `frame_count:=4` | Three direction jobs; frames per direction (does `keep_first_frame` add one?); per-direction cost |
| 3 | `GET /characters/{id}/spritesheet` via `pl export` | the new character | **Record the exact layout JSON**: row order for rotations plus the three idle rows, cell size (does it grow past 32?), sheet size. Then `assets ingest` it. |
| 4 | `animate-with-text-v3` | `first_frame=@…-ur.png`, action "happy little hop", `frame_count:=4` | Loose-frame animation: output count, size, and whether the input is included |
| 5 | `animate-pixminimax` | `first_frame=@…-ur.png`, description "falls asleep, curling into a ball", `frame_count:=8` | Does it return `frame_count + 1` frames with index 0 = input, as documented? Cost |
| 6 | `edit-image-pixen` | `image=@…-ur.png`, "both ears drooping down the sides of the body, sad" | The ear-state substitute: same size, pose and pixel grid preserved |
| 7 | `create-image-pixen` | "a single small red berry", 32×32, `no_background:=true`, `detail=low detail` | Sync response shape; transparency |
| 8 | `create-tileset` (top-down) | lower "soft green meadow grass", upper "sandy dirt path", `tile_size` 32 | Tile count and response format; actual cost (docs say 3–4) |
| 9 | `map-objects` | "berry bush with small red berries", 64×64, `view=low top-down` | Response shape; the cost that the spec doesn't state |

Skip a row only if it would break the cap, and say which row was skipped.
Results go into a **"Verified 2026-09-27" section of `docs/pixellab/api.md`**
(request/response shapes and actual costs per tool), and any documented claim
that turned out wrong gets corrected in place. A short run log with every
command and its usage goes to `<game>/_migration/verify-2026-09-27.md` in the
asset workspace.

Web vs API differences to watch for and note:
- rotation cell size and canvas growth
- whether animation frame 0 is the reference
- frame counts
- file layout compared with the web downloads described in `api.md`

## Risks / Trade-offs

- **The Aseprite batch export may not write files** (the extension error
  seen). → **Resolved 2026-09-27** by the spike: the PixelLab Aseprite
  extension's `handle-pose.lua:58` error is printed on every batch (`-b`)
  invocation but is harmless — exit code is 0 and files are written. Verified
  with `otter-source-v1.aseprite` (adopted from `Otter_first.aseprite`):
  `aseprite -b <file> --data data.json --format json-array --list-tags
  --save-as "frame{frame}.png"` in one call wrote all 6 frames (64×64 each,
  `frame0.png`…`frame5.png`) *and* the tag data. None of the currently
  adopted `.aseprite` sources (otter ×4, fish ×2, human, esther, background)
  have any frame tags defined (`meta.frameTags` is `[]`), so `pack.py` always
  exports with the plain `{frame}` pattern and reads `meta.frameTags` from
  the `--data` JSON to build tag ranges in Python, rather than relying on
  Aseprite's own `{tag}-{tagframe}` filename templating (untested here, since
  no source file has a tag to exercise it) — decoupling "how frames are named
  on disk" from "where tag ranges come from" turned out simpler and remains
  correct if/when a source file does gain tags. Frames from an untagged file
  are packed with no frame tag (no animation name), which is unavoidable
  until the source is tagged in Aseprite.
- **The move is outside git** (Dropbox, and Dropbox history is the only
  backup). → Adopt is validate-first and undoable, and every original name is
  recorded in the manifest. The user reviews afterwards.
- **Some adopt-table guesses may be wrong** (subjects, `esther`, shove
  direction). → Everything lands as `named` with notes, and the user reviews
  it in the review page.
- **Python in a TS repo** means a second toolchain. → It's isolated in one
  directory with its own test command, and never part of build or deploy.
- **ruamel.yaml** is heavier than PyYAML, but it's the only simple way to
  keep hand-written comments in the manifest.
- **Live generations spend real budget** (1,804 left this cycle). → D11 has a
  30-generation hard cap, excludes Pro tools, and checks the balance before
  and after.
- **Phaser's Aseprite frame-name resolution** is assumed, not yet verified. →
  D6 step 5 checks the installed source before finalizing.

## Migration Plan

This is additive; nothing in the running apps changes. The only rollback
concern is the Dropbox move, which rolls back with `assets adopt <game> --undo
<record>`.
