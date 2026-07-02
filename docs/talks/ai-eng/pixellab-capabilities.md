# pixellab.ai — Capabilities Reference

For generating Dragon Warrior-style pixel art assets for the engineering-with-ai talk.

---

## UI tool → API mapping

The web UI "Select Tool" dialog maps to endpoints like this:

| UI Tool (Create tab) | API endpoint | Notes |
|----------------------|--------------|-------|
| **Create S-XL image (new)** ★ | new Pixflux model | Newest; outline + detail controls. Try this first for enemies/NPCs |
| **Create image (Pro)** | `/v2/generate-image-v2` | High quality; use for hero seed or anything where quality matters most |
| **Create M-XL image** | `/v2/create-image-pixflux` | Flux model; best for 64px and larger; good for tileset tiles |
| **Create S-M image** | `/v2/create-image-pixen` | Pixen model; best for 16–64px; our 32×32 sweet spot |
| **Image to pixel art** | `/v2/image-to-pixelart` | Convert a sketch/photo reference to pixel art |
| **Image to pixel art (Pro)** | Pro version of above | Higher quality conversion |
| **Create from style reference** (Pro) | `/v2/create-image-bitforge` | Locks in your art style from a reference image; use after hero is done |
| **Create 8-directional sprite** (Pro) | `/v2/create-character-with-8-directions` | **Main tool for Jon (hero)** — all rotations in one shot |
| **Create tiles** (Pro) | `/v2/create-tiles-pro` | Tile variations from outlines; use for tileset.png |
| **UI Template (Pro)** (experimental) | `/v2/generate-ui-v2` variant | Template + matching pieces; good for speech bubble frame |
| **Create UI elements** (Pro) | `/v2/generate-ui-v2` | Game UI components; speech bubble, battle menu |
| **Portrait ↔ Character** (Pro, experimental) | new endpoint | Convert portrait art to/from character sprite — useful if you sketch a face |

**Transform and Animate tabs** (not shown) cover:
- Rotate / Generate 8 rotations → for adding directions to an existing sprite
- Animate with text → walk cycles, enemy idle flicker, FX strips
- Animate with skeleton → precise walk animation control
- Inpaint → fix specific areas of a generated sprite

---

## Recommended tools per asset

### character.png — Jon (hero)

1. **Create S-M image** → generate a south-facing seed (32×32, Pixen model is ideal)
2. **Create 8-directional sprite** (Pro) → feed the seed in; get all 8 rotations
3. **Animate** tab → "Animate character" or "Animate with text" → add walk frames per direction

### enemy-flaky-test.png, enemy-dragonlord.png

- **Create S-XL image (new)** or **Create S-M image** → front-facing battle sprite, single frame
- **Animate** tab → "Animate with text" → 4-frame idle flicker

### tileset.png

- **Create tiles** (Pro) → tile variations; or **Create M-XL image** (Pixflux, good for larger tiles)

### npc-king.png, npc-castle-folk.png

- **Create S-M image** (Pixen) for a quick static NPC south-facing sprite
- Or **Create 8-directional sprite** (Pro) if you want walking NPCs

### ui-speechbubble.png

- **UI Template (Pro)** → shape a template and generate matching border pieces
- Or **Create UI elements** (Pro) → describe the dialogue box frame

### fx-join.png, fx-death.png

- **Animate** tab → "Animate with text" → describe the effect, 4 frames

---

## Style consistency strategy

Once Jon's sprite looks right, use **Create from style reference** (Pro / Bitforge) for all subsequent assets. Feed it Jon's sprite as the style reference so enemies, NPCs, and tiles share the same palette and pixel weight.

---

## Create S-XL image (new) — UI parameter guide

These controls appear when using the newest generation tool:

| Parameter | Dragon Warrior choice | Why |
|-----------|----------------------|-----|
| **Direction** | South (facing camera) | Correct for the hero seed; other directions come from "Create 8-directional sprite" |
| **View** | **Low top-down** | The DW camera — slightly elevated 3/4 angle, face visible + hint of top-of-head. "High top-down" is flatter (Zelda-style); "Side" is wrong for us |
| **Detail** | **Low or Medium** | "Highly detailed" overworks sprites with too many colors; NES chunky look needs restraint |
| **Outline** | Default → try stronger if blurry | Black outline is essential for NES character readability at 32×32 |

---

## Prompt tips for Dragon Warrior NES style

- Lead with the style anchor: `"NES pixel art, Dragon Warrior / Dragon Quest style, top-down RPG"`
- State color constraint: `"4-color palette, muted earth tones"` or provide an explicit forced palette
- Specify facing: `"south-facing"`, `"front-facing battle sprite"`, `"top-down overhead"`
- State tile size: `"32×32 pixels"`, `"fits a 32px tile grid"`
- Describe silhouette first, then details: `"small humanoid hero, blue tunic, sword at side, no helmet"`
- For enemies: `"blob enemy, slime-like, glowing eyes"`, `"dark lord silhouette, imposing, crown"`
- Always add `"no background, transparent"` for sprites
- Avoid photo realism words (`"photorealistic"`, `"detailed rendering"`) — they fight pixel style

---

## Models at a glance

| UI name | API model | Best for | Max size |
|---------|-----------|----------|----------|
| Create S-M image | **Pixen** | General pixel art, fine text prompts, 16–64px | 512×512 |
| Create M-XL image | **Pixflux** | 64px+, init-image-guided, variety | 400×400 |
| Create from style reference | **Bitforge** | Style-locked generation from a reference | 200×200 |
| Create S-XL image (new) | **new model** | Outline + detail controls; newest option | unknown |

---

## Workflow for this project

1. **Write prompt** → add entry to `prompt-log.md` with asset name and attempt number
2. **Generate** using the tool from the table above
3. **Log result** — variant chosen, what worked, what to change
4. **Iterate** if needed → new entry in prompt log
5. **Assemble spritesheet** in Aseprite — frames in grid matching `assets.md` layout
6. **Commit** PNG to `client-talks/public/rpg/assets/`
