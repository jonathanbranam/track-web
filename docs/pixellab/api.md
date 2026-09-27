# PixelLab API Reference

How to call PixelLab from this repo — REST and MCP. Refreshed 2026-09-27 from
the live spec (`https://api.pixellab.ai/v2/openapi.json`, ~100 endpoints).
When this doc and the spec disagree, **the spec wins**; re-pull it rather than
guessing parameter names (the July 2026 version of this guide had several
wrong enum spellings).

Which tool to use for which asset is in [`choosing-tools.md`](choosing-tools.md).

---

## Two ways in

| | MCP (`https://api.pixellab.ai/mcp`) | REST (`https://api.pixellab.ai/v2`) |
|---|---|---|
| Who uses it | Claude Code, interactively | Scripts (the planned Python shim), batch runs |
| Auth | `Authorization: Bearer …` header in `.mcp.json` (gitignored) | Same token, as `PIXELLAB_SECRET` in `.env` (gitignored) |
| Good for | Exploring, one-offs, `pixelart_workbench` (free pixel edits) | Reproducible generation from a manifest; downloads; spritesheet export |
| Images in | Prefer **URLs** — MCP clients truncate large inline base64 | Base64 in JSON (no transport limit) |

Both use the same token and draw on the same account and generation pool.
Characters, objects, tilesets, and UI assets created either way persist in the
PixelLab library and show up in both.

### Account (2026-09-27)

- Plan: **Tier 1 "Pixel Apprentice"** — 2,000 generations / cycle; resets on
  the 25th. `$0` USD credits, so when generations run out, jobs fail (no
  overflow billing).
- Tier 1 unlocks the beta endpoints (`animate-pixminimax`,
  `animate-with-skeleton-v3`, `skeleton-v3` animation mode).
- Check first: `GET /v2/balance` (REST) or `get_balance` (MCP). Free.

---

## Request conventions

- **Base URL** `https://api.pixellab.ai/v2`, header `Authorization: Bearer $PIXELLAB_SECRET`.
- **Images** are usually JSON objects: `{"type": "base64", "base64": "<data>", "format": "png"}`.
  Responses may include a `data:image/png;base64,` prefix — strip it before decoding.
  **Not always** — `POST /map-objects` returns its `image` field as a **bare
  base64 string**, no wrapper object (verified 2026-09-27; see "Verified
  2026-09-27" below). `pl` detects both forms.
- **Sizes** are `{"width": W, "height": H}` objects (`image_size`), except the
  newer endpoints that take `width`/`height` or `size` directly — check the spec.
- **Enum values are human strings with spaces**:
  - `view`: `"low top-down"`, `"high top-down"`, `"side"`
  - `direction`: `"south"`, `"south-east"`, … (hyphen, not underscore)
  - `outline`: `"single color black outline"`, `"single color outline"`, `"selective outline"`, `"lineless"`
  - `shading`: `"flat shading"` … `"highly detailed shading"`
  - `detail`: `"low detail"`, `"medium detail"`, `"highly detailed"` (image endpoints) / `"high detail"` (some character/object endpoints)
- **Pixel sizes** must usually be **multiples of 4** (Pixen, edit-pixen). Pad
  with transparency; never rescale pixel art to fit.
- **`enhance_prompt: true`** on Pixen, character-v3, animate-v3 and PixMiniMax
  expands a short prompt server-side (same as calling the `enhance-*-prompt`
  endpoint first).

### Sync vs async

A few older endpoints answer synchronously (`200` with `image` in the body):
`create-image-pixen` (verified sync 2026-09-27), Pixflux, Bitforge,
`image-to-pixelart`, the cleanup utilities. **`edit-image-pixen` is NOT sync**
despite being a Pixen-family endpoint — verified 2026-09-27, it returns
`{"background_job_id": …}` like the async endpoints below. Don't assume
"Pixen" implies sync; check per-endpoint. **Everything else newer is async**:

1. `POST` returns `{"background_job_id": "…", …}` (plus `character_id` /
   `object_id` / `ui_asset_id` where relevant) — **or**
   `{"background_job_ids": ["…", "…"], "directions": [...]}` when the call
   fans out per-direction (verified 2026-09-27 on `characters/animations`
   with multiple `directions`: one job per direction, each billed and
   waited on separately). `pl` handles both shapes.
2. Poll `GET /v2/background-jobs/{id}` every 2–10 s. Body:
   `{id, status: processing|completed|failed, last_response, usage}`.
3. On `completed`, results are in `last_response` — usually
   `last_response.images[]` (animations, rotations) or `last_response.image`.
   `usage` reports what was actually billed. Some endpoints (`create-tileset`,
   `create-character-v3`) don't return images at all here — they create a
   persistent resource (`tileset_id`, `character_id`) and the images are
   fetched with a separate free `GET`.

Character/object jobs can also be followed by polling
`GET /characters/{id}` / `GET /objects/{id}` until `status == "completed"`.

### Errors

| Code | Meaning |
|---|---|
| 401 | Bad/missing token |
| 402 | Out of generations/credits |
| 422 | Bad params — the body names the field; often a size not a multiple of 4, or an out-of-range area |
| 429 | Rate/concurrency limit — back off and retry; keep only a few jobs in flight |
| 423 | Job not ready (legacy polling) |

Failed jobs are not charged.

---

## Endpoint catalog

Grouped as the interactive docs group them. **Bold** = default choice in its
group. Cost is in subscription *generations* ("gen").

### Images

| Endpoint | Cost | Notes |
|---|---|---|
| **`POST /create-image-pixen`** (sync, verified) | 1 (verified) | Clean small sprites. Min side 16, max area 512², sides ÷4, square below 32. `outline`, `detail`, `view`, `direction`, `no_background`, `enhance_prompt`. Default `detail` is *highly detailed* — set `low detail` for chunky art. Uses `image_size: {width, height}`, not bare `width`/`height`. |
| `POST /create-image-pro-flash` | ~5, quote via `GET /pro-flash/cost` | Cheap single image. Native sizes 16², 24², 32², 32×48, 64², 96×64, 96² (custom beta). Returns a durable `source_image_id` usable for later Pro Flash character/object rotation. `GET /pro-flash/capabilities` is free. |
| `POST /generate-image-v2` (Pro) | 20–40 | Several candidates per call: **64 at ≤42 px**, 16 at ≤85, 4 at ≤170, 1 above. Up to 4 labelled reference images. Max 512² / 688×384. |
| `POST /generate-with-style-v2` (Pro) | 20–40 | 1–4 style images → new art in that style. Output size = largest style image; 16–42 px returns an **8×8 grid of 64**. This is what produced the 256² mochi-bunny sheets. |
| `POST /create-image-pixflux` (sync) / `-background` (async) | 1 | Area 32²–400². `init_image` (img2img), `color_image` (forced palette), `isometric`. The `-background` variant is the same model as a background job — use it for larger scenes. |
| `POST /create-image-bitforge` (sync) | 1 | Legacy style-reference model; max area 200². Prefer `generate-with-style-v2`. |
| `POST /image-to-pixelart` (sync) / `-pro` | 1 / Pro | Photo/illustration → pixel art. Output ≈ ¼ input size. `fixer: true` + high `init_image_strength` for faithful conversion (e.g. the Gemini face sheet). |

### Characters

| Endpoint | Cost | Notes |
|---|---|---|
| **`POST /create-character-v3`** | ref: `ceil(w·h·8/65536)` (32 px ≈ 1); scratch: +1 | Highest quality, always 8 directions. **With `reference_image`** it rotates *your* sprite — the reference **must face straight at the viewer** (south); a ¾ turn offsets every label. `template_id` (mannequin/bear/cat/dog/horse/lion) is for skeleton fitting; default `mannequin`. **Verified 2026-09-27**: cost was exactly 1 for a 32px reference; the response has no inline images at all (`last_response.storage_urls: {<direction>: <url>}` only) — fetch the actual pixels with `GET /characters/{id}/spritesheet` (free) instead. |
| `POST /create-character-with-8-directions` / `-4-directions` | standard 1; `mode: pro` 20–40 | Template-skeleton characters; humanoid proportions presets or quadruped templates. Standard is the only 4-direction option. |
| `POST /create-character-pro` | 20–40 | Pro reference-based; can match an existing character's style (`style_character_id`). |
| `POST /create-character-pro-flash` | quote | Cheap sibling; 8 directions. |
| `POST /create-character-state` | 20–40 | Same identity, one change (ear pose, outfit). Expensive — try `edit-image-pixen` or the workbench first. |
| **`POST /characters/animations`** | see modes | Animate a stored character. Modes: `template` (1/dir, fixed frames, `template_animation_id`), `skeleton-v3` (beta, 2–4/dir, steadier identity), **`v3`** (custom `action_description`, `frame_count` 4–16 even, ≈`ceil(canvas²·frames/65536)`/dir — 32–64 px ≈ 1/dir), `pro` (20–40/dir, confirm cost first). **v3 animates south only unless `directions` is given.** `custom_start_frame` / `end_frame` (v3, single direction) for keyframed motion. `animation_group_id` appends directions to an existing animation. **Verified 2026-09-27** with 3 directions: the response is `{"background_job_ids": [...], "directions": [...], "animation_group_id": ...}` — a **list** of job ids, one per direction, each billed 1 gen (32px, `frame_count: 4`); each direction's completed job returned **5 images, not 4** (v3 always adds one extra frame beyond the requested `frame_count`); frame canvas grew to **40×40** even though the character is 32×32 — the art is not rescaled: frame 0 is the character's stored 32 px rotation padded 4 px on every side, so cropping at offset (4,4) is lossless (see "Verified 2026-09-27"). |
| `POST /animate-character` | — | Older equivalent of the above; prefer `/characters/animations`. |
| `GET /characters`, `GET /characters/{id}`, `DELETE …`, `PATCH …/tags` | free | Up to 20 tags/character — tag with the game name (`mimlings`, `otter`). |
| **`GET /characters/{id}/spritesheet`** | free | ZIP: one sheet PNG + layout JSON — see [Spritesheet export](#spritesheet-export). |
| `GET /characters/{id}/zip` | free | Individual frame PNGs, and every state in the character's group. |

### Objects (props, items, the god hand)

| Endpoint | Cost | Notes |
|---|---|---|
| `POST /create-1-direction-object` / `-8-direction-object` | 20–40 | Pro tools. Small `size` can yield several candidates → object enters `review`; keep with `POST /objects/{id}/select-frames` or drop with `…/dismiss-review`. `style_images` for consistency. `view`: `top-down` / `sidescroller`. |
| `POST /create-object-pro-flash` | quote | Cheap; one-direction finalization is free after the preview. |
| `POST /objects/{id}/animations` | v3 default (cheap); pro 20–40/dir | Prefer v3. |
| `POST /objects/{id}/states` | Pro | Variants (berry bush full/empty). |
| `GET /objects/{id}/spritesheet` | free | Same format as characters. |
| `POST /map-objects` | **1 (verified 2026-09-27)** | Single prop on transparency, 15–30 s. `background_image` + `inpainting` to match an existing map's style. **Verified**: async (`background_job_id`); `last_response.image` is a **bare base64 string** (not the usual `{"type":"base64",...}` wrapper) — the one endpoint checked that breaks the general image-object convention; also returns a persistent `object_id` and `storage_url`. |

### Animation (frame-level, no stored character needed)

| Endpoint | Cost | Notes |
|---|---|---|
| **`POST /animate-with-text-v3`** | ≈ frames·area/65536 | `first_frame` (+ optional `last_frame`), `action`, `frame_count` 4–16 even. Max 256², pixel budget w·h·frames ≤ 524,288. `drift_threshold` de-flickers colours. **Verified 2026-09-27**: cost 1 at 32px/4 frames; returned **5 images** (again one more than requested); canvas stayed 32×32 (no growth, unlike `characters/animations`); **frame 0 is NOT the input** — pixel-compared against the reference and it differs substantially (mean per-channel diff ~84/255), so don't assume the source frame survives untouched. |
| `POST /animate-pixminimax` (beta, Tier 1) | by time: 64² @ 4/8/16/40 frames = 1/1/2/6 | `frame_count` multiple of 4, **4–40**. Optional `last_frame`. Returns `frame_count + 1` frames (index 0 = your input). Good for long loops and effects. **Verified 2026-09-27** at 32px/8 frames: cost 1 gen, 9 images returned, and frame 0 **is** pixel-identical to the input reference (`ImageChops.difference(...).getbbox() is None`) — this endpoint's "index 0 = input" claim holds, unlike `animate-with-text-v3` above. |
| `POST /interpolation-v2` (Pro) | Pro | Frames between `start_image` and `end_image` with an `action` — e.g. the mochi `split`. 16²–128². |
| `POST /animate-with-skeleton-v3` (beta) | 3 frames = 2, 8 = 3, 15 = 4 | Pose-driven: 18-joint skeleton per frame; `POST /estimate-skeleton` derives one. Longer clips are nearly free. Humanoid/quadruped templates only. |
| `POST /edit-animation-v2`, `POST /transfer-outfit-v2` (Pro) | Pro | Change an existing animation / move an outfit across frames. |
| `animate-with-text-v2`, `animate-with-text`, `animate-with-skeleton` | — | Legacy. |

### Rotation

| Endpoint | Notes |
|---|---|
| **`POST /generate-8-rotations-v3`** | Loose images (not stored as a character). Max 256². Returns `last_response.images[8]`. |
| `POST /generate-8-rotations-v2` (Pro), `POST /rotate` | Pro / legacy single rotation. |

### Editing

| Endpoint | Cost | Notes |
|---|---|---|
| **`POST /edit-image-pixen`** | 1 | Text edit that preserves pose and pixel grid ("ears drooping", "hold a berry"). Source ≤256/side; sides ÷4. **Cheapest way to fake character states.** **Verified 2026-09-27**: this endpoint is **async** (`background_job_id`), not sync — needs `pl post … --wait` or a follow-up `pl wait`. Cost was 1. The completed response has **two** images: `image` (the edit) and `quantized_image` (a palette-reduced version, with `original_image_n_colors`/`quantized_image_n_colors`). |
| `POST /edit-images-v2` (Pro), `POST /edit-image-pro-flash`, `POST /edit-image` | Pro / quote / — | Heavier edits; `edit-image` is legacy. |
| **`POST /inpaint-v3`** (Pro), `POST /inpaint-image-pro-flash`, `POST /inpaint` | | Mask: white = regenerate, black = keep. Legacy `inpaint` max 200². |

### Maps & tiles

| Endpoint | Cost | Notes |
|---|---|---|
| **`POST /create-tileset`** (top-down Wang) | standard **usually 3–4** (not 1); pro 20–40 | `lower_description` / `upper_description` / `transition_*`, `tile_size` 16 or 32 (64 = pro), passed as `tile_size: {width, height}`. 16 tiles (4×4), or 25 at `transition_size` 1.0. Chain tilesets with `lower_base_tile_id` / `upper_base_tile_id` so water→sand→grass share base tiles. **Verified 2026-09-27** (`mode: standard`, 32px tiles): cost exactly **3**; the completed job has **no inline tile images** — only a `tileset_id`. Fetch the 16 actual tile PNGs with a separate free `GET /tilesets/{tileset_id}` (each tile has its own `image` object plus `corners`/`pattern_4x4`/`original_position` metadata). |
| `POST /create-tiles-pro` | Pro | Tile variations, or `tile_feature`: `roads` (18-config autotile), `tileset` (Wang transition), `building` (floor/walls/doors/stairs kit). `tile_type`: square_topdown, isometric, oblique, hex… 16–128 px. |
| `POST /create-tileset-sidescroller` | | Platformer tiles. |
| `POST /create-isometric-tile` | | Single iso tile, area ≤ 64². |

MCP-only helpers built on these: `create_map` / `edit_map` / `view_map`
(paint a map from connected tilesets), `create_building_kit`,
`create_path_tiles`.

### Interface, portraits, fonts

| Endpoint | Notes |
|---|---|
| `POST /create-ui-asset`, `POST /generate-ui-v2` (Pro) | Panels, buttons, frames (dialogue box, inventory). |
| `POST /portrait-character-pro` | Portrait ↔ sprite; `result_size` 16–160. |
| `POST /vocal-animation` → `POST /talking-gif`, `POST /lip-sync` | Pay once per expression for mouth shapes; every dialogue line after is **free**. Otter-game NPC dialogue. |
| `POST /generate-font-pro` | Pixel font (a–z, 0–9, punctuation). |

### Utilities (cheap/free cleanup)

| Endpoint | Notes |
|---|---|
| `POST /remove-background` | ≤ 400² area; `remove_complex_background` for busy edges; optional `text` hint. |
| `POST /reduce-colors` | Palette reduction, optional ordered dithering. |
| `POST /correct-pixelart` | Fix off-grid / mixed-resolution pixels (≤ 1024²). |
| `POST /unzoom` | Recover true pixel size from an upscaled image (≤ 2048²) — e.g. screenshots. |
| `POST /resize` | Pixel-art-aware resize, 16²–200². |
| `POST /image-to-text` | ~0.09 gen. Describe an image — handy for recovering a prompt. |
| `POST /enhance-pixen-prompt`, `/enhance-character-v3-prompt`, `/enhance-animation-v3-prompt` | Prompt expansion. |

---

## Spritesheet export

`GET /characters/{id}/spritesheet` and `GET /objects/{id}/spritesheet` return a
ZIP with `<name>.png` and `<name>.json`. Verified 2026-09-27 against the otter
character:

```json
{
  "character": { "id": "…", "name": "Idle", "size": {"width": 32, "height": 32}, "directions": 8, "view": "low top-down" },
  "spritesheet": {
    "path": "A_cute_otter._Pixel_art-Idle.png",
    "cell_size": {"width": 32, "height": 32},
    "sheet_size": {"width": 256, "height": 64},
    "columns": 8,
    "pivot": "cell-center",
    "rows": [
      {"row": 0, "type": "rotations", "frame_count": 8,
       "directions": ["south","south-east","east","north-east","north","north-west","west","south-west"]},
      {"row": 1, "type": "animation", "frame_count": 6, "animation": "Run",
       "animation_group_id": "…", "direction": "east"}
    ]
  },
  "export_version": "1.0"
}
```

- Uniform grid; cell = the largest frame; frames centred, never rescaled, so
  the pivot is always the cell centre (a **ground-anchored** origin must be
  applied in the game, e.g. `setOrigin(0.5, 1)` after trimming, or a per-sheet
  foot offset).
- Row 0 = rotations in the order above; then one row per animation-direction;
  columns = frames in playback order; unused cells transparent.
- Covers **one character state**; each state in a group exports separately.

## Web-UI downloads (what the files in the asset inbox look like)

Files downloaded from pixellab.ai's editor are named
`pixellab-<first ~20 chars of prompt, dashes>-<ms timestamp>.png`. The
timestamp is the creation time (e.g. `1790388421662` → 2026-09-26) — keep it
as provenance. The web UI names rotation sets after its default prompt, so a
file called `pixellab-cute-wizard-….png` is usually **not a wizard**.

| Download | Layout |
|---|---|
| 8 rotations | 3×3 grid, row-major in direction order S, SE, E, NE, N, NW, W, SW; last cell empty (verified by pixel comparison 2026-09-27) |
| Animation (n frames) | ~square grid, row-major, trailing cells empty (observed: 5 frames → 3×2, 7 → 3×3) |
| Pro / style-v2 at ≤42 px | 8×8 grid of 64 candidates |

---

## Verified 2026-09-27 (live generation run, design D11)

Every primary generation tool was run for real, once, through `pl`, against
the mochi-bunny reference (`work/mochi-bunny/mochi-bunny-s-32-ur.png`, tagged
`anchor`). Balance before: **1804.0 / 2000.0** generations. Balance after:
**1792.0 / 2000.0** — **12 generations spent**, well under the 30-generation
cap; no Pro-tier tool was called. Full command-by-command log:
`GAME_ASSETS_DIR/mimlings/_migration/verify-2026-09-27.md`. New character:
**mochi-bunny**, id `b6944d2d-f844-4ec1-8bd3-619e1ed326a8`, tagged `mimlings`.

| # | Tool | Cost | Frames | Frame 0 = input? | Size | Key finding |
|---|---|---|---|---|---|---|
| 1 | `create-character-v3` | 1 | — (8 rotations, fetched separately) | n/a | 32×32 requested | No inline images — only `storage_urls` per direction. Character created with `template_id: mannequin` (default). |
| 2 | `characters/animations` v3 (×3 directions) | 3 (1/direction) | 5 requested 4 | **Yes, padded** — frame 0 is the stored 32×32 rotation, pixel-identical at offset (4,4) inside the 40×40 canvas | 40×40 (grew from 32×32; cropped back losslessly, below) | Response is `background_job_ids` (**list**), not a single id — `pl` didn't originally handle this (fixed; see below). |
| 3 | `GET …/spritesheet` (export) | free | — | n/a | sheet 320×160, cells 40×40 | Layout JSON matches the documented shape exactly. The animation rows' `"animation"` field is the **full `action_description` sentence**, not a short slug — pass `--anim` explicitly on ingest rather than relying on the export's own name. |
| 4 | `animate-with-text-v3` | 1 | 5 requested 4 | **No** — pixel-compared, substantially different | 32×32 (unchanged) | Frame 0 is a fresh render, not the reference. |
| 5 | `animate-pixminimax` | 1 | 9 = frame_count(8) + 1 | **Yes** — pixel-identical to the reference | 32×32 (unchanged) | Confirms the documented "index 0 = input" behaviour. |
| 6 | `edit-image-pixen` | 1 | 2 images (`image`, `quantized_image`) | n/a | 32×32 | **Async**, not sync as the general "Pixen" doc note implied — needs `--wait`. |
| 7 | `create-image-pixen` | 1 | 1 | n/a | 32×32, transparent | Synchronous as documented; uses `image_size: {width,height}`. |
| 8 | `create-tileset` (standard) | 3 | 16 tiles (4×4 Wang set) | n/a | 32×32 cells | Matches "usually 3–4" and "16 tiles" exactly. No inline images — fetch with a follow-up free `GET /tilesets/{id}`. |
| 9 | `map-objects` | 1 (previously undocumented) | 1 | n/a | 64×64 | `image` is a **bare base64 string**, not the usual wrapper object — broke `pl`'s image discovery until fixed (below). |

**v3 canvas growth is padding, not rescaling** (checked afterwards, no
generations spent). The three idle directions and the export's rotation row
came back in 40×40 cells for a 32 px character. Pillow comparison against
the character's stored rotations (`GET characters/{id}` → `rotation_urls`,
32×32, free):

- Frame 0 of each direction equals the stored 32 px rotation pixel-for-pixel
  at offset (4,4); the best integer shift for all three is (4,4) with 0
  differing pixels. Every export rotation cell, centre-cropped, is identical
  to its stored rotation, and the 4 px border is fully transparent.
- Alpha is strictly 0/255 in every frame and frames 1–4 add at most 7
  colours to the rotation's palette (south 16 → ≤20) — no soft edges or
  blended colours, so nothing was resampled.
- The "extra" height is motion: no single frame is taller than 28 px (the
  anchor is 27); the breathing bob moves the body up to 2 px, so the union
  bbox over all frames spans x 7–24, y 1–29 in 32 px coordinates — inside
  32×32, with frame 0's feet on the anchor's baseline (row 29, x 7–24).

So cropping every cell at (4,4) is lossless (nothing opaque outside the
window, asserted) and keeps stills and animations aligned. The cropped
files are `mochi-bunny-idle-{s,e,n}-32-5f-char` and
`mochi-bunny-rot8-32-char`; the 40 px originals are `rejected` in the
manifest but kept on disk. The `-char` label is because
`mochi-bunny-idle-s-32-5f` is the earlier web-UI idle, and
`mochi-bunny-rot8-32` is the web-UI rotation set — which differs from this
character's rotations in every direction except south.

**Fixes made to `pl` because of this run** (both covered by new unit tests):

- `api.find_images` now also recognises a raw base64 string (PNG/JPEG magic
  bytes) as an image, not only `{"type": "base64", "base64": ...}` objects —
  needed for `map-objects`.
- `pl post` now handles a `background_job_ids` **list** response (one job per
  direction), waiting on and saving all of them, not just
  `background_job_id` (singular) — needed for `characters/animations` with
  more than one direction.
- `naming.py`'s no-hint ("blind") filename parser had its `subject` group
  tightened from `.+` to `[a-z0-9]+(?:-[a-z0-9]+)*`: the old pattern let regex
  backtracking split *mid-word* (and matched uppercase), so almost any
  filename ending in `-<dir>-<cell>-<n>f.<ext>` would spuriously "conform"
  regardless of what came before it. Found when a staging filename
  (`STAGEDhop-s-32-5f.png`) blind-matched. Genuinely ambiguous lowercase
  names (e.g. `verify-hop-s-32-5f.png`, which is a *structurally valid*
  convention name with an unintended subject boundary) are still ambiguous —
  that's inherent to the naming scheme, not a bug.

## Calling it from a script

Use `pl`, the shim at `scripts/pixellab/` (`npm run pl -- …`) — it loads
`PIXELLAB_SECRET` from `.env`, builds request bodies from short
`key=value`/`key:=json`/`key=@file` arguments instead of hand-written JSON
and base64, polls background jobs, saves result images, and logs every call.
See [`README.md`](README.md#pl--the-pixellab-rest-shim) for commands and the
argument grammar.

The official SDKs exist (`pip install pixellab`,
`github.com/pixellab-code/pixellab-js`) but have not been checked against the
newer endpoints here; `pl`'s raw HTTP surface is small enough to stay current
without depending on them.
