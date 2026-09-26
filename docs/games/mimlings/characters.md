# Mimlings — Characters

Choosing the animal (species) and the personality.

**Decided (2026-09-25): the mochi-bunny**, after trying it in PixelLab. Its
design, movement and animations are in `mochi-bunny.md`. Personality is still
open. The last section has prompts for generating the art with an
agentic pixel-art tool (e.g. PixelLab).

## What the animal has to do

With 200+ on a phone screen, each Mimling is about **16–24 px**. That's tiny,
so the choice is less "what's cutest" and more "what reads at a glance":

```
 must read at 16px              nice to have
 ─────────────────              ──────────────────────────────
 • round silhouette             • a body part that SHOWS a habit
 • mood from shape, not face      (cheeks full, ears drooped)
 • looks fine tinted            • real-world behaviour that
 • obvious facing direction       echoes "imitation"
 • piles/crowds look good       • a voice / "word" ("mim!")
```

Tinting matters because culture is shown by colour (see `ideas.md`): the base
art should be light and fairly neutral so a tint reads clearly.

## Candidates

```
  DUCKLING        HAMSTER         MOCHI-BUNNY     PENGUIN         CAPYBARA
    ▄▄             ▄  ▄           ▌ ▐               ▄▄             ▄▄▄▄▄
   ●  ▶          ▄████▄          ▄███▄            ▐█●●█          ▄██●███▄
  ▐███▌          █(●●)█          █ ● ●█           ▐█▀▀█▌         ████████
   ▀ ▀            ▀▀▀▀            ▀▀▀              ▀  ▀           ▀    ▀
```

### Duckling — the strongest fit for the theme

- Real ducklings *imprint*: they follow and copy the first big thing they see.
  That's the whole game, and it's real biology.
- They walk in lines behind a leader, so "follow" can be a habit.
- The beak makes facing direction clear, and the waddle is cute.
- **Weak spot:** mood is hard to show with no ears.

### Hamster — the strongest fit for the mechanics

- Cheek pouches visibly fill with berries, so you can *see* "hoard" versus
  "give" as habits.
- Hamsters pile up to sleep, and the pure round blob tints perfectly.
- **Weak spot:** they're solitary animals, so "social learner" is a bit of a
  stretch.

### Mochi-bunny (made-up creature) — the most expressive

- Ears are the best emotion signal at tiny sizes: up = curious, flat = scared,
  one flopped = silly.
- Squash and stretch is the rest of its body language.
- Because it's invented, we can give it any traits we like.
- **Weak spot:** no built-in story, so its personality has to come from us.

### Penguin — the best crowd

- Huddles are a real emergent behaviour (they rotate warm and cold positions).
- They waddle, slide on their bellies and toboggan.
- **Weak spot:** the black-and-white look fights tinting, and a meadow setting
  makes less sense.

### Capybara — the best "vibe"

- Famously chill, and other animals sit on them.
- **Weak spot:** long and low, so it's worse at tiny sizes and less "cute blob".

### Comparison

| | Theme fit | Mood at 16px | Tints well | Crowds / piles | Shows habits on body |
|---|---|---|---|---|---|
| Duckling | ★★★ imprinting | ★ | ★★★ | ★★ lines | ★ |
| Hamster | ★ | ★★ | ★★★ | ★★★ piles | ★★★ cheeks |
| Mochi-bunny | ★★ (ours to invent) | ★★★ ears | ★★★ | ★★ | ★★ |
| Penguin | ★★ huddles | ★ | ★ | ★★★ huddles | ★ |
| Capybara | ★ | ★ | ★★ | ★★ stacking | ★ |

## Personality (a separate choice from the species)

This matters as much as the animal.

- **Earnest little students.** They *want* to learn, stare at the hand, and
  practise clumsily. It's cozy, and the Thronglets mirror lands softer.
- **Mischievous copycats.** They exaggerate whatever you do. Pat one, and they
  hug so hard someone falls over. Funnier, but it undercuts the mirror.
- **Worshipful.** The hand is a god; they build little shrines where it touched
  down. The most Populous-flavoured, and the one that ties most directly to the
  verdict.

Every personality works better with a **voice**. A single sound ("mim!",
"peep", "wuh?") plus the ♥ ? ! ♪ zzz glyph bubbles is personality without any
text.

## Suggestion

A **hybrid: a round duckling-ish chick with bunny-like ear tufts**. You get the
imprinting story, the beak for facing direction, and ears for mood, all in an
original creature that's clearly a "Mimling" and not just a duck. For
personality, **earnest students with a touch of worship**. Their word is
"mim!", which gives the name a reason to exist.

The runner-up is the **hamster**, if seeing habits on the body (cheek pouches)
matters more than the imprinting story.

---

## Art generation prompts

For an agentic pixel-art tool such as PixelLab (`create_character`, then
`animate_character`). Generated assets are kept out of the repo until chosen.

### Shared settings (all candidates)

| Setting | Value | Why |
|---|---|---|
| Canvas size | 32×32 (sprite fills ~20×20) | Renders at 16–24 px on a phone with room for ears and squash |
| View | low top-down (¾ view) | Meadow is seen from above; faces still visible |
| Directions | 4 (S, E, N, W; W can mirror E) | Enough for wandering; keeps the frame count low for 300 sprites |
| Outline | single-colour dark outline | Readable against grass at tiny sizes |
| Shading | flat / basic, 2 tones | Tints must stay clean |
| Palette | light, low-saturation base (cream / pale white) | Culture tints are applied in Phaser; the base must not fight them |
| Background | transparent | |

Shared style line to append to every description:

> cute chibi pixel art, very round body, oversized head, tiny stubby feet,
> big shiny black eyes, soft cream-white body with minimal detail, clean dark
> outline, flat 2-tone shading, readable at very small size, transparent
> background

### Per-candidate descriptions

**Suggested hybrid — "Mimling"**
> a tiny round baby chick creature, a nearly spherical fluffy body, a small
> orange triangle beak, two long soft bunny-like ear tufts on top of the head,
> tiny orange feet, stubby wing nubs, big curious eyes, earnest and innocent
> expression

**Duckling**
> a tiny round baby duckling, a fluffy spherical body, a small flat orange bill,
> tiny orange webbed feet, stubby wing nubs, one small fluff tuft on the head,
> big curious eyes

**Hamster**
> a tiny round hamster, a spherical fluffy body, big puffy cheek pouches, small
> round ears, tiny pink paws held in front of the chest, a short nub tail, big
> shiny eyes

**Mochi-bunny**
> a tiny round mochi-like bunny blob, a soft squishy dumpling body with no
> neck, two long expressive ears, tiny paws, blushing cheeks, big shiny eyes

**Penguin**
> a tiny round baby penguin chick, a fluffy grey-cream down body, a small
> black beak, tiny flipper nubs, small orange feet, big shiny eyes
> *(note: use grey/cream down instead of adult black-and-white so tints work)*

**Capybara**
> a tiny chubby baby capybara drawn as a round loaf, a blunt square snout,
> small rounded ears, tiny legs, a calm sleepy half-lidded expression

### Animations (for the chosen candidate)

Keep each animation short (4–6 frames) because hundreds share the atlas.

| Animation | Description for the tool | Used for |
|---|---|---|
| idle | gentle breathing bob, occasional blink | standing |
| walk | bouncy waddle, body squashes on each step | wander / follow |
| hop | small happy hop with squash and stretch | joy, dance |
| look-up | tilts head up, ears perk up, staring above | noticing the hand |
| eat | pecks / nibbles at the ground | eating berries |
| give | holds out a berry toward the front | the "give food" habit |
| groom | leans in and nuzzles to the side | the "groom" habit |
| shove | quick lunge forward with a push | the "shove" habit |
| scared | ears flat, body shrinks and trembles | fear |
| dizzy | wobbles in a circle, spiral eyes | after being flung |
| sleep | curled up in a ball, slow breathing | sleep piles |
| split | body stretches, pinches in the middle and pops into two | mitosis |

### Supporting art

**God hand**
> a large soft cartoon hand seen from above, pale glowing skin, simple rounded
> fingers, gentle and benevolent, a slight magical glow at the edges, clean
> outline, transparent background

Poses: open palm (hover), pointing finger (tap/feed), pinch (carry), flat
slam (fling release). Plus a separate soft oval **shadow** sprite drawn on the
ground under the hand.

**Glyph bubbles** — a small UI sheet, 12×12 each:
> tiny speech bubbles with single symbols: a pink heart, a question mark, an
> exclamation mark, a music note, "zzz"; white bubble, dark outline

**Meadow props**
> top-down pixel art berry bush with small red berries; a single red berry;
> small flowers; a pebble; a tiny wooden shrine made of twigs *(worshipful
> personality)*

**Ground** — a top-down tileset: soft green meadow grass fading into sandy dirt
and a shallow pond edge, pastel colours, low contrast so the Mimlings pop.
