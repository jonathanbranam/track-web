# engineering-with-ai Talk — Pixel Art Assets

All visual assets are generated with [pixellab.ai](https://pixellab.ai) and committed as static files. The build has no dependency on the generation tool.

---

## Art direction

**Style:** Dragon Warrior (NES) aesthetic — top-down, limited palette, chunky pixel characters — without reproducing copyrighted art. Original designs only.

**Palette:** 4-color per sprite (NES-era constraint feel), muted earth tones for the world, bright accent colors for status effects (poison green for the cursed DataFrame, red for HP drain, gold for party joins).

**Tile grid:** 32×32 px tiles. More legible than 16×16 on a laptop retina screen; still reads as retro. The Phaser world is displayed at 1× (no upscale) to keep it crisp on HiDPI displays.

**Canvas size:** 960×540 px (16:9). Scales to fill the viewport via CSS `object-fit: contain` on the container; Phaser renders at native 960×540.

---

## Asset inventory

### Character — Jon

| Asset | Format | Frames | Notes |
|-------|--------|--------|-------|
| `character.png` | Spritesheet | 12 frames | Walk down (3), walk up (3), walk left (3), walk right (3) |
| Frame size | 32×32 px | — | Standard tile unit |

**Appearance:** Generic fantasy hero silhouette — no specific DW character likeness. Sword at side. Neutral color scheme (blue/grey tunic).

### Tileset — world

| Asset | Format | Notes |
|-------|--------|-------|
| `tileset.png` | Spritesheet (32×32 tiles) | Castle interior floor, wall, door, throne; overworld grass, path, trees; battle background |
| `world-castle.json` | Tiled JSON | Castle interior map (throne room + corridors + exit) |
| `world-overworld.json` | Tiled JSON | Small overworld (castle, path south, encounter zones) |

Tiled JSON files are created manually in [Tiled Map Editor](https://www.mapeditor.org/) using the generated tileset PNG.

### NPCs

| Sprite | Frame count | Role in script |
|--------|-------------|---------------|
| `npc-king.png` | 1 (static) | Beat 2 — throne room, charges the quest |
| `npc-castle-folk.png` | 2 (idle anim) | Beat 3 — headline-whispering NPCs |

### Enemies

| Sprite | Design cue | Beat |
|--------|-----------|------|
| `enemy-flaky-test.png` | Slime-style blob; flickers (unstable, random); green | 5a–5c |
| `enemy-cursed-dataframe.png` | Glowing shackle / locked chest item | 6a–6b (item, not a battle enemy) |
| `enemy-dragonlord.png` | Dark silhouette, crown, imposing scale | 9a–9c |

### UI / FX

| Asset | Notes |
|-------|-------|
| `ui-speechbubble.png` | 9-slice speech bubble frame for NPC dialogue |
| `fx-join.png` | Particle/sparkle effect strip for party-member join (beat 7a) |
| `fx-death.png` | Flash strip for `THOU ART DEAD` (beat 5c) |

---

## Generation workflow (pixellab.ai)

1. **Sketch prompts:** write a 1–2 sentence description per asset specifying style, palette limit, size, and angle (top-down for characters, front-facing for battle enemies)
2. **Generate & select:** generate 4 variants per asset, pick the cleanest
3. **Spritesheet assembly:** arrange frames in a grid (matching the frame size and row layout above) in Figma/Aseprite, export as PNG
4. **Commit:** place final PNGs in `client-talks/public/rpg/assets/`
5. **Reference in scene:** `scene.load.spritesheet('character', '/rpg/assets/character.png', { frameWidth: 32, frameHeight: 32 })`

**Order of generation:** character first (appears most often), then enemies by scene order (flaky-test, dragonlord), then tileset, then NPCs and FX.

---

## Directory layout

```
client-talks/public/rpg/
  assets/
    character.png
    tileset.png
    npc-king.png
    npc-castle-folk.png
    enemy-flaky-test.png
    enemy-cursed-dataframe.png
    enemy-dragonlord.png
    ui-speechbubble.png
    fx-join.png
    fx-death.png
  maps/
    world-castle.json
    world-overworld.json
  fallback.mp4            ← recorded safety-net video (Phase 4)
```

---

## Scaffold phase (no art yet)

During Phase 1 (scaffold), no pixellab.ai assets are needed. All visual elements are rendered with Phaser primitives:

- **Character:** filled rectangle (blue, 28×28) with a small white square for "face direction"
- **Tiles:** solid-colored rectangles (dark grey for walls, lighter for floor, green for grass)
- **NPCs / enemies:** differently-colored rectangles with a Phaser.GameObjects.Text label
- **Speech bubbles:** Phaser `Graphics` rounded rectangle + `Text` for dialogue
- **Battle backgrounds:** solid dark rectangle filling the canvas

Primitives use the same `phaserSegment` interface as real art — swapping in the spritesheet later requires only changes inside `TalkRpgScene.ts`, not to the Director or script.
