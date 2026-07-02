# pixellab.ai — Prompt Log

Tracks prompt attempts for each asset. Add a new entry for each attempt; note what worked and what to try next.

Format per entry:
- **Asset:** which sprite/tileset (matches `assets.md` names)
- **Attempt:** number (restart per asset)
- **Endpoint:** which API endpoint or web UI tool
- **Prompt:** exact text submitted
- **Result:** what came back (brief description or "see variant N")
- **Verdict:** keep / iterate / abandon
- **Next:** what to change for the next attempt

---

## character.png — Jon (hero)

### Attempt 1

- **Asset:** `character.png` (south-facing seed)
- **Attempt:** 1
- **Endpoint:** Pixen (`/v2/create-image-pixen`) or web UI → "Generate image"
- **Prompt:**
  ```
  NES pixel art, Dragon Warrior style, top-down RPG hero, south-facing, 32×32 pixels,
  small humanoid adventurer, blue-grey tunic, sword at left side, no helmet, brown hair,
  4-color palette (black outline, dark blue, light blue-grey, tan skin), no background,
  transparent PNG, simple clean silhouette, chunky pixel style
  ```
- **Result:** Head takes up too much room, otherwise not bad; trying again
- **Verdict:** *(keep / iterate)*
- **Next:** *(notes)*

Tried the prompt enhance button it came up with this:

> A small adventurer standing in a wide, south-facing stance, wearing a simple
  blue-grey tunic with a sword sheathed at the left hip, brown hair, tan skin,
  crisp black outline, on a solid color background.

Result: The character is angled to the side, not the right style at all.


Trying with a helmet:

NES pixel art, Dragon Warrior style, top-down RPG hero, south-facing, 32×32 pixels,  small humanoid adventurer, blue-grey tunic, sword at left side, helmet with two horns covers head  4-color palette (black outline, dark blue, light blue-grey, tan skin), no background,  transparent PNG, simple clean s ilhouette, chunky pixel style

Result: this looks a lot like Dragon Warrior main character

---

## enemy-flaky-test.png

### Attempt 1

- **Asset:** `enemy-flaky-test.png`
- **Attempt:** 1
- **Endpoint:** Pixen or web UI → "Generate image"
- **Prompt:**
  ```
  NES pixel art, Dragon Warrior style, front-facing battle enemy sprite, 32×32 pixels,
  green slime blob creature, unstable flickering appearance, two small glowing eyes,
  semi-transparent dripping edges suggesting instability, 4-color palette (black, dark green,
  bright green, pale green highlight), no background, transparent PNG, chunky pixel art
  ```
- **Result:** *(fill in after generation)*
- **Verdict:** *(keep / iterate)*
- **Next:** *(notes)*

---

## enemy-dragonlord.png

### Attempt 1

- **Asset:** `enemy-dragonlord.png`
- **Attempt:** 1
- **Endpoint:** Pixen or web UI → "Generate image"
- **Prompt:**
  ```
  NES pixel art, Dragon Warrior style, front-facing final boss battle sprite, 48×48 pixels,
  dark imposing silhouette of a robed figure with a crown, "Coding Is Dead" boss energy,
  dramatic scale larger than normal enemies, glowing red eyes, dark purple-black robe,
  gold crown details, 4-color palette (black, dark purple, red-orange glow, gold),
  no background, transparent PNG, intimidating but reads as parody at second glance
  ```
- **Result:** *(fill in after generation)*
- **Verdict:** *(keep / iterate)*
- **Next:** *(notes)*

---

## tileset.png

### Attempt 1

- **Asset:** `tileset.png`
- **Attempt:** 1
- **Endpoint:** Top-down tileset (`/v2/create-tileset`) or web UI → "Create map"
- **Prompt:**
  ```
  NES pixel art tileset, Dragon Warrior style, 32×32 tiles, top-down RPG,
  castle interior set: stone floor, dark stone wall, wooden door, throne with red cushion;
  overworld set: grass tile, dirt path tile, single tree (2×2 tiles), brick entrance arch.
  Muted earth tones, stone greys, deep greens. Seamlessly tileable. 4-color-ish palette
  per tile type. No background on wall/object tiles where possible.
  ```
- **Result:** *(fill in after generation)*
- **Verdict:** *(keep / iterate)*
- **Next:** *(notes)*

---

## npc-king.png

### Attempt 1

- **Asset:** `npc-king.png`
- **Attempt:** 1
- **Endpoint:** 4-direction character (`/v2/create-character-with-4-directions`) — south only needed
- **Prompt:**
  ```
  NES pixel art, Dragon Warrior style, top-down NPC, south-facing, 32×32 pixels,
  seated king on throne, red robe, golden crown, white beard, hands on armrests,
  regal posture, static sprite (1 frame), 4-color palette (black, deep red, gold, white-grey),
  no background, transparent PNG
  ```
- **Result:** *(fill in after generation)*
- **Verdict:** *(keep / iterate)*
- **Next:** *(notes)*

---

## ui-speechbubble.png

### Attempt 1

- **Asset:** `ui-speechbubble.png`
- **Attempt:** 1
- **Endpoint:** UI elements (Pro `/v2/generate-ui-v2`) or Pixen
- **Prompt:**
  ```
  NES pixel art, Dragon Warrior style game UI, speech bubble / dialogue box frame,
  rectangular with rounded pixel corners, 9-slice compatible (tileable center, fixed corners
  and edges), dark background fill with light border, pixel-style border 2px wide,
  no interior text or content, 96×32 pixels outer size, transparent outside the border,
  chunky retro game UI look
  ```
- **Result:** *(fill in after generation)*
- **Verdict:** *(keep / iterate)*
- **Next:** *(notes)*

---

## Tips accumulated from attempts

*(Add notes here as you discover what works)*

- *(e.g., "Adding 'black 1px outline' to every prompt sharpens edges dramatically")*
- *(e.g., "Pixen handles 'NES Dragon Warrior' better than Pixflux for characters")*
- *(e.g., "Forced palette of #000000, #3c5a8a, #8cb8d8, #d4b896 gives consistent look")*
