# engineering-with-ai Talk — Pixel Art Assets

All visual assets are generated with [pixellab.ai](https://pixellab.ai) and committed as static files. The build has no dependency on the generation tool.

---

## Art direction

**Style:** Dragon Warrior (NES) aesthetic for overworld, town, and dungeon exploration — top-down, limited palette, chunky pixel characters — without reproducing copyrighted art. Original designs only. **Battles are FF-style side view** (party on the right, enemies on the left, command menu) per `idea-board.md` §1/§9 — a deliberate swap from DW's classic first-person battle screen, needed to show multi-familiar-vs-multi-enemy encounters (Stage 3 party, the Dragonlord + minions).

**Palette:** 4-color per sprite (NES-era constraint feel), muted earth tones for the world, bright accent colors for status effects (red for HP drain, gold for the Gold meter, a distinct glow for the Hellspawn's fire-heal state).

**Tile grid:** 32×32 px tiles. More legible than 16×16 on a laptop retina screen; still reads as retro. The Phaser world is displayed at 1× (no upscale) to keep it crisp on HiDPI displays.

**Canvas size:** 960×540 px (16:9). Scales to fill the viewport via CSS `object-fit: contain` on the container; Phaser renders at native 960×540.

**Zoom legibility:** the real display target is the Zoom-compressed stream, not source resolution — bold shapes, high contrast, large text; avoid fine detail and constant animation that the codec smears (`idea-board.md` §11).

---

## Asset inventory

This list is generated from `adm-talk-story-board-01.md`'s **Asset checklist** section — treat that storyboard as the source of truth and update this inventory when it changes.

### Sprites

| Asset | Notes |
|-------|-------|
| `hero.png` | Overworld walk cycle + a battle "command pose" (issuing orders, not swinging — the hero directs in Stage 3, per `idea-board.md` §6) |
| `familiar-generic.png` | Stage 1 — a single, deliberately plain/nondescript ally; its genericness is the point |
| `familiar-role-*.png` (×4) | Stage 3 — four familiars with distinct roles/looks (fighter/mage/thief/healer-ish mapping is still `[LEANING]` in `idea-board.md` §6, not locked) |
| `enemy-bug-slime.png` | Recurring low-level enemy — the whack-a-mole revive beat (Beat 8) |
| `enemy-hellspawn.png` | Recurring enemy across Stage 2 → 3; needs a distinct **fire-heal glow** state (brightens/heals instead of taking damage — Beat 16 vs. Beat 19) |
| `enemy-dragonlord.png` + 1–2 minion sprites | Final boss + minions (climax, Beat 21–22) |
| `npc-veteran.png` | Battle-hardened veteran NPC (Yegge-pastiche), ghostly banner of many familiars behind him (Beat 12) |
| `npc-townsfolk.png` (×3) | Generic town-square NPCs for the closing pleas (Beat 24) |
| `npc-king.png` | Throne room; revives the hero for half gold (Beat 11) |

### Tilesets

| Asset | Notes |
|-------|-------|
| `tileset-overworld.png` | Grass, path, trees, encounter zones |
| `tileset-town.png` | Town square, buildings |
| `tileset-dungeon.png` | Dungeon interior — floor, wall, door |

### Battle backdrops

| Asset | Used in |
|-------|---------|
| `backdrop-dungeon.png` | Stage 1–2 battles |
| `backdrop-throne-room.png` | Death/revive scene |
| `backdrop-final-arena.png` | Dragonlord climax |

### UI

| Asset | Notes |
|-------|-------|
| `ui-command-menu.png` | FF-style Attack/Magic/Item… menu |
| `ui-status-screen.png` | Save/status screen — Lv 99, deed-log (Beat 3) |
| `ui-battle-spec-scroll.png` | Training-ground spec scroll (Beat 13, 17) |
| `ui-role-card.png` (×4) | Stage 3 party role cards |
| `ui-standing-order-card.png` | e.g. "HOLD FIRE vs. Hellspawn" (Beat 18–19) |
| `ui-prophecy-scroll.png` | Cold-open prophecy (Beat 5) |
| `ui-headline-card.png` (×3) | Cold-open news cycle (Beat 2) |
| `ui-achievement-toast.png` | DCC-flavored, archaic-voice achievement pop-up |
| `ui-mp-gold-meters.png` | Native DW stats — MP = context, Gold = cost (`idea-board.md` §5) |
| `ui-thou-art-dead.png` | Death card (Beat 11) |
| `ui-enhanced-edition-prompt.png` | "AI-Enhanced Edition available" prompt (Beat 4) |
| `ui-title-card.png` | Title + "To Be Continued" cards (Beat 1, 25) |

### Cut — do not build

- ~~`enemy-cursed-dataframe.png`~~ — the "cursed DataFrame" item idea was folded into the cardboard-sword/pandas-migration beat, which is itself optional/likely-cut (`idea-board.md` §9, storyboard Beat 15 notes). No standalone asset.
- ~~Trench-coat "Coding Is Dead" slime~~ — cut final-boss concept, replaced by the Dragonlord (`idea-board.md` §1).

---

## Generation workflow (pixellab.ai)

1. **Sketch prompts:** write a 1–2 sentence description per asset specifying style, palette limit, size, and angle (top-down for characters, front-facing for battle enemies)
2. **Generate & select:** generate 4 variants per asset, pick the cleanest
3. **Spritesheet assembly:** arrange frames in a grid (matching the frame size and row layout above) in Figma/Aseprite, export as PNG
4. **Commit:** place final PNGs in `client-talks/public/rpg/assets/`
5. **Reference in scene:** `scene.load.spritesheet('character', '/rpg/assets/character.png', { frameWidth: 32, frameHeight: 32 })`

**Order of generation:** hero first (appears most often, sets the style-reference), then Stage 1 needs (generic familiar, bug-slime), then the Hellspawn (both HP-damage and fire-heal-glow states), then the four Stage 3 role familiars, then the Dragonlord + minions, then remaining NPCs (veteran, King, townsfolk), then tilesets and battle backdrops, then UI.

---

## Directory layout

```
client-talks/public/rpg/
  assets/
    hero.png
    familiar-generic.png
    familiar-role-fighter.png
    familiar-role-mage.png
    familiar-role-thief.png
    familiar-role-healer.png
    enemy-bug-slime.png
    enemy-hellspawn.png
    enemy-dragonlord.png
    enemy-dragonlord-minion.png
    npc-veteran.png
    npc-townsfolk.png
    npc-king.png
    tileset-overworld.png
    tileset-town.png
    tileset-dungeon.png
    backdrop-dungeon.png
    backdrop-throne-room.png
    backdrop-final-arena.png
    ui-command-menu.png
    ui-status-screen.png
    ui-battle-spec-scroll.png
    ui-role-card.png
    ui-standing-order-card.png
    ui-prophecy-scroll.png
    ui-headline-card.png
    ui-achievement-toast.png
    ui-mp-gold-meters.png
    ui-thou-art-dead.png
    ui-enhanced-edition-prompt.png
    ui-title-card.png
  maps/
    world-overworld.json
    world-town.json
    world-dungeon.json
  fallback.mp4            ← recorded safety-net video (Phase 4)
```

Role-familiar filenames above (`fighter`/`mage`/`thief`/`healer`) are a placeholder mapping — `idea-board.md` §6 still has the role-to-look assignment as `[LEANING]`, not locked; rename if it resolves differently.

---

## Scaffold phase (no art yet)

During Phase 1 (scaffold), no pixellab.ai assets are needed. All visual elements are rendered with Phaser primitives:

- **Hero / familiars:** filled rectangles (distinct colors per familiar) with a small white square for "face direction"
- **Tiles:** solid-colored rectangles (dark grey for walls, lighter for floor, green for grass)
- **NPCs / enemies:** differently-colored rectangles with a Phaser.GameObjects.Text label
- **UI (command menu, cards, meters):** Phaser `Graphics` rounded rectangles + `Text`
- **Battle backdrops:** solid dark rectangle filling the canvas

Primitives are driven by the same `Action[]` script and Director as real art (see `requirements.md` / `action-vocabulary.md`) — swapping in the spritesheet later requires only asset-loading changes in the render layer, not to the Director or the script.
