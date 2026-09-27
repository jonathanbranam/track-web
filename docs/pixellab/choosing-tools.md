# Choosing a PixelLab Tool

Which tool to reach for, per kind of asset, and what it costs. Refreshed
2026-09-27. Parameter details and endpoint paths are in [`api.md`](api.md).

Budget reality: Tier 1 is **2,000 generations/cycle**. Anything labelled
*Pro* costs **20–40** — one Pro call is worth 20–40 cheap calls. Default to the
cheap tool, re-roll it a few times, and escalate only when it can't do the job.

---

## The core loop for a character

```
 reference sprite (south, straight-on)        ← e.g. mochi-bunny-s-32-ur.png
          │  create-character-v3 (reference)   ~1 gen at 32 px
          ▼
 stored character: 8 rotations
          │  characters/animations, mode v3    ~1 gen / direction at 32–64 px
          │    directions: [south, east, north]   (v3 defaults to south only)
          ▼
 animations on the character
          │  GET …/spritesheet                  free
          ▼
 sheet.png + layout.json  ──▶ asset workspace ──▶ game
```

Why a *stored character* rather than loose images: animations stay grouped by
direction, extra directions can be appended later (`animation_group_id`),
the library is tagged and searchable, and export is one free call. Loose
web-UI downloads have to be sliced and labelled by hand.

**Reference rule:** the reference must face **straight at the viewer**.
Whatever it faces becomes "south"; a ¾-turned reference mislabels all eight
directions and you pay for eight useless sprites.

---

## By asset type

| Need | First choice | Escalate to | Notes |
|---|---|---|---|
| **New character, no art yet** | `create_character` standard (1) — humanoid presets or quadruped templates (bear, cat, dog, horse, lion) | v3 from scratch (2–9) → pro (20–40) | The otter was made as a standard `cat`-template quadruped. |
| **Character from art you like** | `create_character` **v3 + reference** (~1 at 32 px) | pro with `style_character_id` | The route for the mochi-bunny and for hand-drawn Aseprite otters. |
| **Exploring a look** (many options) | Pixen (1) re-rolls | `generate-image-v2` / `generate-with-style-v2` at ≤42 px → **64 candidates for one 20–40 call** | The 64-grid is excellent value for *exploration*, poor for a single asset. |
| **Standard motion** (walk, run, idle) | animation **template** (1/dir) | `skeleton-v3` (2–4/dir, steadier identity) → v3 custom | Template list via `get_character`. Quadruped templates differ from humanoid. |
| **Custom motion** (eat, groom, split) | animation **v3** with `action_description` (~1/dir) | PixMiniMax (long clips, up to 40 frames) → pro (20–40/dir) | Describe **movement and pose only**, no scenery. For a known start and end pose, pass `end_frame` (v3) or use `interpolation-v2`. |
| **Mood variant** (ears down, holding a berry) | `edit-image-pixen` (1) on the rotation, or `pixelart_workbench` (free) | `create_character_state` (20–40) | States are the expensive path; fake them first. |
| **Faces / tiny details at 32 px** | `pixelart_workbench` — exact, free | Pixen sheet + cleanup | A face is a handful of pixels; drawing beats generating. |
| **Prop / item** (berry, bush, fish, tool) | `map-objects`, or Pixen with `no_background` | `create_object_pro_flash` → `create-1-direction-object` (20–40) | Objects give you states + animations + export; worth it for interactive props (a bush with/without berries). |
| **Animated effect** (sparkle, puff, splash) | PixMiniMax or `animate-with-text-v3` on a Pixen seed | `interpolation-v2` | |
| **Ground terrain** (grass↔dirt↔water) | `create_topdown_tileset` standard (**3–4**, not 1) | `mode: pro` or `create_tiles_pro` `tile_feature: "tileset"` | Chain with base-tile IDs so every pair shares tiles. Decide the tile size (16 vs 32) **before** generating anything. |
| **Paths / roads** | `create_path_tiles` / `create_tiles_pro` `roads` | | 18-config autotile. |
| **Buildings** (otter burrows, shops) | `create_building_kit` | | Floor + connectable walls + doors + stairs; square_topdown / oblique / isometric. |
| **Full backdrop / parallax layer** | `create-image-pixflux-background` (≤400², 1) | `generate-image-v2` with `no_background: false` (up to 688×384) → extend with inpaint | Tile-based games want tiles, not paintings; backdrops suit menus, title, sky layers. |
| **UI** (dialogue box, inventory, buttons) | `create-ui-asset` / `generate-ui-v2` (Pro) | | Pro-priced; do once per UI style. |
| **NPC dialogue portraits** | `portrait-character-pro` + `vocal-animation` (once per expression) | | `talking-gif` / `lip-sync` are then **free** per line. |
| **Pixel font** | `generate-font-pro` | | |
| **Converting non-pixel art** (Gemini images, sketches) | `image-to-pixelart` with `fixer: true` | `-pro` | Then `reduce-colors` / `correct-pixelart`. |
| **Cleanup** | `remove-background`, `reduce-colors`, `correct-pixelart`, `unzoom` | | Cheap/free; `unzoom` recovers true pixels from screenshots. |

---

## Consistency across a game

1. **Pick the anchors first.** One reference character per game (mochi:
   `mochi-bunny-s-32-ur.png`, tagged `anchor` in `manifest.yaml`), one tile
   size, one view (`low top-down` for both current games), one outline
   style. Record them in the game's prompt doc.
2. **Characters from the anchor:** v3 + reference, or pro with
   `style_character_id`.
3. **Everything else from the anchor:** `style_images` (objects),
   `generate-with-style-v2`, `create_image_pro` `style_image`, Pixflux
   `color_image` (forced palette).
4. **Palette discipline:** keep a palette PNG per game; pass it as
   `color_image`/`force_colors`, or run `reduce-colors` afterwards.
5. **Tag everything** in the PixelLab library with the game name — tags are
   the only grouping PixelLab has (`update_character_tags`, 20 per item).

---

## Web UI ↔ API names

The pixellab.ai editor (and the Aseprite extension) use different names:

| Web UI | API / MCP |
|---|---|
| Create S-M image | `create-image-pixen` |
| Create M-XL image | `create-image-pixflux` |
| Create image (Pro) | `generate-image-v2` / `create_image_pro` |
| Create from style reference | `generate-with-style-v2` (was Bitforge) |
| Create 8-directional sprite / Character Creator | `create-character-v3`, `create-character-with-8-directions` |
| Create from Reference (Character Creator) | `create-character-v3` with `reference_image` |
| Animate with text | `animate-with-text-v3` / `characters/animations` v3 |
| Create tiles (Pro) | `create-tiles-pro` |
| UI elements / UI Template (Pro) | `generate-ui-v2` / `create-ui-asset` |
| Portrait ↔ Character | `portrait-character-pro` |

Anything made in the web editor as a **character** is in the API library;
anything made with the **image** tools is not — it exists only as the
downloaded file.

---

## Gotchas learned so far

- v3 animations are **south-only by default** — always pass `directions`.
- Mirroring E→W in code halves directional cost for symmetric characters.
- `detail` defaults to *highly detailed* on Pixen; 32 px cute art wants `low detail`.
- Standard top-down tilesets cost 3–4, not 1.
- In MCP, pass images by **URL**; inline base64 over ~32 px gets truncated.
- The PixelLab Aseprite extension throws a Lua error (`handle-pose.lua:58`)
  when Aseprite runs in batch (`-b`) mode — verified harmless: exit code is 0
  and the files (and `--data` JSON) are written anyway.
- `edit-image-pixen` is **async** despite being a Pixen-family endpoint —
  don't assume "Pixen" means synchronous; `create-image-pixen` is sync,
  `edit-image-pixen` is not (verified 2026-09-27).
- `characters/animations` with more than one `directions` entry returns
  `background_job_ids` (a **list**), not a single `background_job_id` — poll
  each one separately (verified 2026-09-27).
- v3 animation endpoints (`characters/animations` v3, `animate-with-text-v3`)
  return **one more frame than requested** — don't assume the frame count
  in the response equals your `frame_count`. Whether frame 0 is your input
  varies by endpoint: yes for `animate-pixminimax`, no for
  `animate-with-text-v3` and `characters/animations` v3 (verified 2026-09-27).
- `create-character-v3` and `create-tileset` don't return any inline images
  — only a `character_id`/`tileset_id`; fetch the actual pixels with a
  separate free `GET` (verified 2026-09-27).
- `map-objects`' `image` field is a bare base64 string, not the usual
  `{"type": "base64", ...}` wrapper (verified 2026-09-27) — the one endpoint
  checked that breaks the general image-object convention.
