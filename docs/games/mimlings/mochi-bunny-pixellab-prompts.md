# Mimlings — PixelLab Prompts for the Mochi-Bunny

Copy-paste text for generating the Mimling art in PixelLab (the pixellab.ai
site or the PixelLab MCP tools). The design behind these prompts is in
`mochi-bunny.md`: most squash, stretch and hopping is done **in code**, so
the art only needs poses, ear positions, and faces.

## 1. Base character

### Settings

| Setting | Value |
|---|---|
| Size | 32 px |
| View | low top-down |
| Directions | 4 if available (standard mode); v3 always produces 8 — we use S, E, N and mirror E for W |
| Outline | single color black outline |
| Shading | flat shading |
| Detail | low detail |
| Body type | humanoid, chibi proportions (neither humanoid nor quadruped fits a blob, but chibi gets closest) |

**If you already have a design you like from pixellab.ai:** skip the text
prompt. Use **v3 mode with a reference image** to rotate it into all
directions. The reference must face **straight at the viewer** (south) — a
¾-turned reference shifts every direction and mislabels the whole set.

### Description

```
a tiny round mochi bunny, a soft squishy dumpling-shaped body with no neck
where the head and body are one round shape, two long soft floppy ears with
pale pink insides, big shiny black eyes with a white highlight, tiny pink
blush dots on the cheeks, a very small mouth, two tiny paw nubs at the front,
barely visible feet, cream-white body, cute chibi pixel art, clean black
outline, flat 2-tone shading, minimal detail, readable at very small size,
transparent background
```

Keep the body **cream-white and low-saturation**. The game tints it to show
culture, and a strong base colour fights the tint.

## 2. Animations

Use **v3 custom animations** (about 1 generation per direction at 32 px).
v3 animates only south unless told otherwise, so request
`directions: south, east, north` for anything seen while moving. Keep each
description about **movement and pose only** — no scenery.

### v1 set

| Name | Frames | Directions | Action description |
|---|---|---|---|
| `idle` | 4 | S, E, N | `gentle breathing, body softly rising and falling, ears swaying slightly` |
| `look-up` | 4 | S, E | `tilts head back to look straight up at the sky, ears perk up, eyes wide and curious` |
| `eat` | 6 | S, E | `holds a small berry in both front paws and nibbles it, cheeks puff out` |
| `sleep` | 4 | S | `curled up into a round ball with ears lying flat over the body, eyes closed, slow breathing` |
| `give` | 4 | S, E | `holds a small berry out in front with both paws, offering it forward` |
| `groom` | 6 | E | `leans sideways and nuzzles its cheek against something next to it, ears fold over, eyes closed happily` |
| `shove` | 4 | E | `quick forward lunge pushing with both front paws, ears swept back` |
| `dance` | 8 | S | `happy dance, bouncing side to side, a little spin, ears flapping` |
| `dangle` | 4 | S | `being lifted from the top of the head, body stretched tall, tiny feet kicking, ears drooping` |
| `splat` | 4 | S | `lands flat on its belly and squashes into a pancake, ears spread out flat` |
| `split` | 8 | S | `wiggles, stretches wide, pinches in the middle and splits into two smaller identical bunnies` |
| `born` | 4 | S | `a tiny bunny bounces once, blinks, and looks around curiously` |

#### look up

standing still; tilts head back to look straight up at the sky, ears perk up,
eyes grow larger, anime style, and curious, looking up at the camera in the sky

#### sleep

curled up into a round ball with ears lying flat over the body, eyes closed,
slow breathing

> tired; moving into a sleeping position; sleeps as a round curled up ball;
curls his years over his eyes, hiding like a round ball; ears lie flat over his
body; eyes closed, sleeping, slow breathing.

this one pretty good.

> tired; moving into a sleeping position; sleeps as a round curled up ball; ears
fold down to lay completely flat.curls his years over his eyes, hiding like a
round ball; outline is a ball; ears do not stick out. ears lie flat over
hisbody; eyes closed, sleeping, slow breathing.

not as good as previous

#### shove

> mochi bunny; motion is squash and stretch; squashes to gain momentum, then
presses forward, stretching out as it lunges forwards to the right (east),
pushing with both front paws, ears swept back, pushing something else away,
slightly angry

### Later set

| Name | Frames | Directions | Action description |
|---|---|---|---|
| `wake` | 6 | S | `uncurls from a ball, does a big stretch upward, ears pop up` |
| `yawn` | 4 | S | `big yawn with mouth wide open, ears droop, eyes squeeze shut` |
| `receive` | 4 | S, E | `reaches forward with both paws, takes something, does a happy little bounce` |
| `get-shoved` | 4 | E | `knocked backward, body squashes, ears fly forward` |
| `tend` | 4 | S | `pats the ground in front with both paws, gently and carefully` |
| `lead` | 4 | E | `proud little hop, then looks back over its shoulder` |
| `bow` | 4 | S | `bows low, body squashes down, ears lowered forward, eyes closed reverently` |
| `get-up` | 6 | S | `peels itself up from being flat, shakes its whole body, wobbles dizzily` |
| `poof` | 6 | S | `shrinks into a soft puff of white fluff that floats upward and fades` |

### Optional: a drawn hop

The hop is planned as code (squash/stretch tweens). If it looks too stiff,
generate this one as art instead and use it for the airborne ear trail:

| Name | Frames | Directions | Action description |
|---|---|---|---|
| `hop` | 6 | S, E, N | `hops forward: squashes down, springs up tall with ears stretched, flies in an arc with ears trailing behind, lands with a big squash, jiggles` |

## 3. Ear poses (states)

Ears are the main mood signal at small sizes. These are **character states** —
the same bunny with one change. **They are expensive (20–40 generations
each)**, so try faking them first by editing the base sprite with the pixel
workbench, and only generate states that don't come out well.

| State name | Edit description |
|---|---|
| `ears-flat` | `ears pressed flat back against the body, scared` |
| `ears-droop` | `both ears drooping down the sides of the body, sad and sleepy` |
| `ears-flop` | `one ear standing up and the other flopped over, silly and curious` |
| `ears-perk` | `both ears standing straight up and alert` |

## 4. Faces (expression sheet)

Faces are drawn on a **separate transparent layer** laid over the body, so any
face works with any pose. At 32 px a face is only a few pixels — easiest to
draw exactly with the pixel workbench, or generate as an image and clean up.

Layout: one row per direction (south, east), one column per expression, each
cell 32×32 with the face in the same place as the base sprite. Only eyes,
mouth, blush and small extras (tear, sweat drop) — no body.

### Prompt (image generation)

```
pixel art sprite sheet of tiny cute chibi bunny faces only, no head or body
shape, just big shiny black eyes with a white highlight, a tiny mouth, and
pink blush dots, on a transparent background, 32x32 cells in a row, each cell
a different expression: neutral, happy with ^ ^ eyes, love with closed eyes
and big blush, curious with round eyes, surprised with a big O mouth, scared
with a sweat drop, sad with a tear, grumpy with slanted eyes, sleepy with
half-closed eyes, asleep with – – eyes, dizzy with spiral eyes, content with
closed smiling eyes
```

### Expression reference

| Expression | Eyes | Mouth | Extra |
|---|---|---|---|
| neutral | round | small line | blush |
| happy | ^ ^ | open smile | blush |
| love | closed curves | small smile | big blush |
| curious | big round | small "o" | — |
| surprised | wide | big "O" | — |
| scared | wide, small pupils | wobbly | sweat drop |
| sad | droopy | small frown | tear |
| grumpy | slanted | pout | — |
| sleepy | half-closed | tiny | — |
| asleep | – – | none | — |
| dizzy | spirals | wavy | — |
| content | closed smile curves | tiny smile | blush |
| determined | focused, slightly narrowed | tight line | — |
| adoring | big with extra sparkle, looking up | small open | blush |

## 5. Supporting art

**Ground shadow** (one sprite)
```
soft dark oval shadow seen from above, semi-transparent, blurry pixel edges,
transparent background, 24x8 pixels
```

**Glyph bubbles** (UI sheet, 12×12 each)
```
tiny pixel art speech bubbles each holding one symbol: a pink heart, a question
mark, an exclamation mark, a music note, zzz, a sparkle star, an anger mark;
white bubble with dark outline, transparent background
```

**Learning sparkle** (object, 4-frame animation)
```
small ring of golden sparkles twinkling and circling, pixel art, transparent
background
```

**Split puff** (object, 4-frame animation)
```
small cute puff of white fluff and tiny stars bursting outward, pixel art,
transparent background
```

**Culture accessories** (small objects, 16×16, sized to sit on a 32 px bunny's head)
```
tiny flower crown of pink and white daisies
tiny green leaf hat
tiny acorn cap
tiny red ribbon bow
tiny twig halo
```

**God hand** (object, 64×64, poses: open palm, pointing finger, pinch, flat)
```
a large soft cartoon hand seen from above, pale glowing skin, simple rounded
fingers, gentle and benevolent, slight magical glow at the edges, clean
outline, pixel art, transparent background
```

**Meadow props**
```
top-down pixel art berry bush with small red berries
a single small red berry
small pastel meadow flowers
a tiny shrine made of stacked twigs and a pebble
```

**Ground tileset** (top-down)
```
soft green meadow grass fading into sandy dirt and a shallow pond edge,
pastel colours, low contrast
```

## Rough cost (v1)

| Item | Generations |
|---|---|
| base character (standard) | ~1 (v3 with reference: a few) |
| 12 v1 animations × 1–3 directions at 32 px | ~20 |
| ear states (only if the workbench fails) | 20–40 each |
| faces | free if drawn with the workbench |
| supporting art | ~10–15 |

Check the balance before starting, and generate the base + `idle` + `split`
first to confirm the look before spending on the rest.
