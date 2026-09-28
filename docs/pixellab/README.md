# PixelLab

[PixelLab](https://pixellab.ai) generates the pixel art for the games in this
repo (Mimlings, and the otter game while it lives elsewhere). This folder
holds the game-independent knowledge; prompts and art direction for one game
live with that game's docs.

## Files

- `api.md` — REST + MCP reference: auth, async jobs, image format, every
  endpoint with cost, spritesheet export format, web-UI download layouts
- `choosing-tools.md` — which tool per asset type, cost, consistency strategy,
  web-UI ↔ API names, gotchas

Per-game prompts:

- `../games/mimlings/mochi-bunny-pixellab-prompts.md` — the mochi-bunny and
  supporting Mimlings art
- `../talks/ai-eng-rpg/prompt-log.md` — the ADM talk's Dragon Warrior assets
  (talk-specific tool picks are in that folder's `assets.md`)

## Where things live

| What | Where | In git? |
|---|---|---|
| Tooling (scripts, pipeline) | this repo | yes |
| API token | `PIXELLAB_SECRET` in this repo's `.env`; also the `Authorization` header in `.mcp.json` for the MCP server | no (both gitignored) |
| Assets — raw, work-in-progress, sources, reviews | the **asset workspace**, `GAME_ASSETS_DIR` in `.env` (Mac: `/Volumes/Data/Dropbox/games`; the Linux box has its own Dropbox path) | no — Dropbox is the backup and the sync |
| Final packed sheets a game loads | `client-<app>/public/<game>/` | yes (small, final only) |
| Characters/objects/tilesets made on PixelLab | the PixelLab library, tagged by game | n/a |

The asset pipeline is `assets`, documented below and, in more depth, in the
per-command sections that follow.

## `pl` — the PixelLab REST shim

A small Python CLI (`scripts/pixellab/`, run via `uv`) so generating, polling,
saving and exporting pixel art is one short command instead of hand-written
HTTP, JSON and base64. Run it as `npm run pl -- <command> …` from the repo
root, or `pl …` directly once `scripts/pixellab/.venv` is on `PATH` (it isn't,
by default — always use `npm run pl --`).

It reads `PIXELLAB_SECRET` and `GAME_ASSETS_DIR` from the environment,
falling back to the repo's `.env` (shell wins over `.env`); see
`.env.example`. It never prints the secret.

### Commands

| Command | What it does |
|---|---|
| `pl balance [--json]` | Remaining generations, plan, credits |
| `pl get <path> [--json]` | Authenticated `GET https://api.pixellab.ai/v2/<path>` |
| `pl post <endpoint> [args…] [--body file.json] [--wait] [--out dir] [--prefix name] [--dry-run] [--json]` | Authenticated `POST`; see argument grammar below |
| `pl wait <job-id> [--out dir] [--prefix name] [--json]` | Poll `background-jobs/<id>` to completion (or failure) and save any result images |
| `pl export character\|object <id> [--game <name> \| --out dir] [--zip] [--json]` | Download the spritesheet (default) or per-frame ZIP export, unzipped |

Endpoint names are given without the leading `/` (e.g. `characters/animations`,
`create-character-v3`). Every data-returning command supports `--json`,
which prints the API's response body unchanged; without it, commands print a
short human summary.

### Argument grammar (httpie-style)

For `pl post`, arguments after the endpoint build the JSON body:

- `key=value` → a string
- `key:=<json>` → a parsed JSON value (numbers, booleans, objects, arrays)
- `key=@<path>` → `{"type": "base64", "base64": …, "format": "png"}`, read
  from *path*. A relative path resolves against the current directory first,
  then `GAME_ASSETS_DIR`.
- Dotted keys (`image_size.width:=32`) nest into objects.
- `--body <file.json>` supplies a base body that the arguments override.
- `--dry-run` prints the body (image data elided) and sends nothing.

```bash
# Explore without spending a generation:
npm run pl -- post create-character-v3 \
  reference_image=@mimlings/work/mochi-bunny/mochi-bunny-s-32-ur.png \
  description="mochi bunny" name=mochi-bunny --dry-run

# For real, waiting for the job and saving the result into the inbox:
npm run pl -- post animate-with-text-v3 \
  first_frame=@mimlings/work/mochi-bunny/mochi-bunny-s-32-ur.png \
  action="happy little hop" frame_count:=4 \
  --wait --out mimlings/inbox/verify --prefix hop

# Free checks:
npm run pl -- balance
npm run pl -- get characters --json
npm run pl -- export character 3ab632d0-8e92-4366-a7df-110c92d816b0 --game otter_game
```

(Paths above use the post-`adopt` layout — `mimlings/work/mochi-bunny/mochi-bunny-s-32-ur.png` is
the renamed anchor, `_mochi-bunny-ur.png` before D9's `assets adopt` ran.)

### Job waiting and result saving

When a `POST` returns a `background_job_id`, `pl post` prints it; with
`--wait` it polls `background-jobs/<id>` every few seconds until `completed`
or `failed`. `pl wait <job-id>` does the same for a job already submitted.
With `--out <dir>` (resolved against `GAME_ASSETS_DIR` when relative), every
image found in the result — a single image, an image list, or a
direction-keyed map — is saved as `<prefix>-<index-or-direction>.png` (or just
`<prefix>.png` for a lone image). A failed job exits non-zero and prints the
API's failure detail.

### Generation log

Every non-`GET` call appends a line to `GAME_ASSETS_DIR/pixellab-log.jsonl`:
timestamp, endpoint, the request body with any `@file` image replaced by
`{"@": "<source path>"}`, and — once known — a second line with the job/
character/object ids, the billed usage, and the saved output file paths. The
log never contains the secret or image bytes.

## `assets` — the per-game asset pipeline

`scripts/pixellab/` also provides `assets` (same `uv` project as `pl`), run
as `npm run assets -- <command> …`. It turns generated/downloaded files into
a named, tracked, reviewed and packed set of sprite sheets, entirely inside
`GAME_ASSETS_DIR/<game>/` — nothing it touches lives in this repo except the
final output of `ship`.

### Workspace layout

Each game folder (created by `assets init <game>`; every other command refuses a
game folder that doesn't exist and suggests the closest name, so a typo can't
start a new game — an existing folder with no manifest yet just gets the
missing pieces filled in):

```
<game>/
  manifest.yaml     one entry per registered asset (see below)
  inbox/             raw, unregistered files — drop downloads/exports here
  work/<subject>/    registered, convention-named files, grouped by subject
  reference/         material that is never shipped (mood boards, licence-unclear art)
  review/            generated contact sheet (assets review)
  dist/              packed sheet + Aseprite JSON (assets pack)
  _migration/        adopt plans and their undo records (assets adopt)
```

### The manifest

`manifest.yaml` has a `config` block (default cell size, view, ship
destination) and an `assets` list. Each entry:

| Field | Meaning |
|---|---|
| `id` | unique; the filename stem |
| `subject` | e.g. `mochi-bunny` |
| `kind` | `sprite`, `rotations`, `animation`, `variations`, `sheet`, `tileset`, `background`, `ui`, `source`, `reference` |
| `file` | path relative to the game folder |
| `status` | see the lifecycle below |
| `layout` | cell size, grid cols/rows, frame count, order, and (for rotations) `dirs` |
| `anim`, `dir` | for animations / directional stills |
| `tags` | e.g. `[anchor]` |
| `source` | `tool`, `original` filename, `created`, `prompt`, `pixellab: {character_id, job_id}` |
| `review` | `verdict`, `note`, `at` |
| `history` | one line per status change |

It's loaded and saved with `ruamel.yaml` in round-trip mode, so hand-added
comments and fields survive every rewrite.

### Naming convention

Lowercase kebab-case:

| Form | Pattern | Example |
|---|---|---|
| Still, one direction | `<subject>-<dir>-<cell>[-<label>].png` | `mochi-bunny-s-32-ur.png` |
| Rotation set | `<subject>-rot<4\|8>-<cell>[-<label>].png` | `mochi-bunny-rot8-32.png` |
| Animation | `<subject>-<anim>-<dir>-<cell>-<n>f[-<label>].png` | `mochi-bunny-idle-s-32-5f.png` |
| Variation/candidate grid | `<subject>-variations-<cols>x<rows>-<cell>[-<label>].png` | `mochi-bunny-variations-8x8-32-colorways.png` |
| Other (source, reference, …) | `<subject>-<kind>[-<desc>][-<label>].<ext>` | `esther-source.aseprite` |

`<dir>` is one of `s se e ne n nw w sw` (PixelLab's rotation order: south,
south-east, east, north-east, north, north-west, west, south-west). A name
collision gets `-v2`, `-v3`, … appended rather than overwriting.

### Status lifecycle

```
unreviewed → candidate → in-review → approved → packed → shipped
                                    ↑___________________|  (back to in-review)
(unreviewed, candidate, in-review) → rejected
(unreviewed, candidate, in-review) → reference → in-review
```

`unreviewed → approved` directly is allowed (skip review for an obvious
keeper). `reference` marks material that's kept but never reviewed, packed or
shipped (mood boards, screenshots of other games, colour references); it
doesn't count as waiting for review, and `pack`/`ship` ignore it. New
`kind: reference` entries are registered as `reference` from the start.
Files sitting in `inbox/` are unregistered (`raw`) and don't appear in the
manifest at all.

Manifests written before this lifecycle was renamed from `named` used `named`
as the first status; opening one with any `assets` command migrates it
automatically (in place, once) to `unreviewed`, or to `reference` for a
`kind: reference` entry, rewriting `history` lines to match.

### Commands

| Command | What it does |
|---|---|
| `assets init <game> [--force] [--json]` | Create a new game folder with the layout above. Re-running it for an existing game is a no-op; a name that matches an existing game apart from case or `-`/`_` (e.g. `otter-game` vs `otter_game`) is refused unless `--force` |
| `assets status [<game>] [--json]` | Per-status counts (`reference` is counted but never listed as waiting) and what's waiting for review, grouped by subject; omit `<game>` to summarise every game folder |
| `assets mark <game> <id…> <status> [--note "…"] [--force]` | Change status (refuses a transition not in the table above unless `--force`) and append to `history` |
| `assets ingest <game> [--subject --anim --dir --cell --label] [--dry-run]` | Register `inbox/` files: PixelLab spritesheet exports (PNG+JSON pair, one row per rotation/animation), already convention-named files, and web-download grids (rotation 3×3, 8×8 variations, contiguous animation) detected via `layout.py`. Anything it can't resolve stays in `inbox/`, listed with why. |
| `assets adopt <game> <plan.yaml> [--dry-run] [--undo <record>]` | One-time move/rename of pre-existing files per a plan; undoable |
| `assets review <game> [--serve [--port 8765]]` | Generate `review/index.html`, a contact sheet with a click-to-open full-size viewer (integer zoom, actual size, fit, sheet toggle) and each card's pixel size; `--serve` adds approve/reject/reference/back-to-review buttons and a note field |
| `assets pack <game> <subject>` | Combine `approved`/`packed` assets into `dist/<subject>.png` + `.json` (Aseprite hash format, Phaser-ready) |
| `assets ship <game> [<subject>…] [--dry-run]` | Copy `dist/` sheets to the manifest's configured destination |

Example:

```bash
npm run assets -- status mimlings --json
npm run assets -- ingest otter_game --subject otter
npm run assets -- mark mimlings mochi-bunny-idle-s-32-5f in-review --note "ears look flat"
```

### Review: the contact sheet

`review/index.html` on disk is always the read-only page (`served: false`) —
opening it via `file://`, from Dropbox, or from another machine never shows
review controls, even if a server was previously run against that folder.
`--serve` renders the page fresh on every `GET /review/` or
`/review/index.html`, straight from the current manifest, so it always has
the approve/reject/reference/back-to-review buttons and the note field
regardless of what's on disk; regenerating the static file with a plain
`assets review <game>` while `--serve` is running does not remove them. Each
click re-reads `manifest.yaml` before applying the change, so it can't
overwrite a change another command made while the server was up.

Clicking a card's preview (in both modes) opens it in a full-size viewer:
integer zoom with nearest-neighbour scaling, **Actual size** (one image pixel
per CSS pixel — how the game draws it at scale 1) and **Fit**, a sheet toggle
for animations/rotations, and a directory tileset assembled into its tile
grid. Keys: `+`/`-` zoom, `0` actual size, `f` fit, `Esc` close, `←`/`→` step
to the previous/next visible card.

The note field is a free-text record kept alongside the status change (in
`review.note` and the matching `history` line) — it has no other effect; nothing
reads it besides a human.

### Pack: sheet + Aseprite JSON

`assets pack <game> <subject>` collects every `approved` (or already
`packed`) asset of that subject — rotations first, then animations sorted by
id — cuts each into its cell-sized frames (PNG grids by their recorded
`layout`; `.aseprite` sources via the Aseprite CLI, see below), and writes:

- `dist/<subject>.png` — one sheet, ≤16 columns, no padding, pixels copied
  exactly (never rescaled).
- `dist/<subject>.json` — Aseprite's **hash** format: `frames` is an object
  keyed `"0"`…`"N-1"` (not an array — this is what Phaser's
  `AnimationManager.createFromAseprite` actually indexes by; verified
  2026-09-27 against `node_modules/phaser/src/animations/AnimationManager.js`
  in `client-games`, which does `frames[i.toString()]` for each tag's frame
  range). `meta.frameTags` names each rotation-direction `rot-<dir>` and
  each animation-direction `<anim>-<dir>` (a lone `sprite`-kind still is
  tagged by its bare direction).

It fails, writing nothing, if the subject has no approved/packed assets or
the collected frames don't all share one cell size.

**Aseprite sources.** A `.aseprite` file is exported once per `pack` run with:

```bash
$ASEPRITE_BIN -b <file> --data <tmp>/<id>.json --format json-array \
  --list-tags --save-as "<tmp>/<id>-{frame}.png"
```

(Default `$ASEPRITE_BIN`: the macOS app path if it exists, else `aseprite` on
`PATH`.) The PixelLab Aseprite extension prints a harmless
`handle-pose.lua:58` error on every batch run — exit code is still 0 and the
frames and `--data` JSON are written; verified 2026-09-27 against an adopted
otter source (6 frames, 64×64). Frame tag ranges come from the `--data`
JSON's `meta.frameTags`, not from Aseprite's own `{tag}-{tagframe}` filename
form (untested here — none of the currently adopted `.aseprite` sources have
any tags defined, so their frames pack with no frame tag until someone adds
tags in Aseprite).

**Loading the result in Phaser:**

```js
this.load.aseprite('mochi-bunny', 'mochi-bunny.png', 'mochi-bunny.json');
// later, once loaded:
this.anims.createFromAseprite('mochi-bunny'); // creates one Animation per frameTag
this.add.sprite(x, y, 'mochi-bunny').play('idle-s');
```

### Ship: copy packed sheets to a destination

`assets ship <game> [<subject>…] [--dry-run]` copies `dist/<subject>.png` +
`.json` for every currently `packed` subject (or just the ones named) to the
manifest's `config.ship.dest`, marks those assets `shipped`, and records the
destination and a `sha256` of the PNG on each entry. It refuses (writing
nothing) if any target subject still has `approved`-but-unpacked changes
(run `assets pack` again first) or has no packed sheet in `dist/` yet.

`dest` may be an absolute path, a path relative to the repo root (e.g.
`client-games/public/mimlings`), or contain `${VAR}` references expanded
against the environment. No destination is ever assumed — with none
configured, `ship` fails naming the manifest file to edit:

```bash
$ npm run assets -- ship otter_game --dry-run
No ship destination configured for 'otter_game'. Set config.ship.dest in
/Volumes/Data/Dropbox/games/otter_game/manifest.yaml
```

**mimlings** has `config.ship.dest: client-games/public/mimlings` set (task
5.4), but nothing has been shipped by this change — nothing is `approved`
or `packed` yet, since review is still pending user judgement:

```bash
$ npm run assets -- ship mimlings mochi-bunny --dry-run
'mochi-bunny' has no packed sheet in dist/ (run `assets pack` first)
```

**otter_game** intentionally has no `config.ship.dest` — its eventual home
(a client app, or a separate repo) isn't decided yet.

## Quick checks

- Balance: MCP `get_balance`, or `GET https://api.pixellab.ai/v2/balance`.
- Library: MCP `list_characters` / `list_objects` / `list_topdown_tilesets`.
- Live spec: `https://api.pixellab.ai/v2/openapi.json`, LLM summary at
  `https://api.pixellab.ai/v2/llms.txt`. Re-pull these rather than trusting
  remembered parameter names.
