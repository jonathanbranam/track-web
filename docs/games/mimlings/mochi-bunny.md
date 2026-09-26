# Mimlings — The Mochi-Bunny

The chosen Mimling design (2026-09-25): a small, round, squishy dumpling-bunny.
This file covers how it's built, how it moves, how it shows emotion, and every
animation the game needs. Prompts for generating the art are in
`mochi-bunny-pixellab-prompts.md`.

## Anatomy

```
        ▌ ▐          ears — long, soft, the main mood signal
       ▐▌ ▐▌
      ▄█████▄        body — one squishy dumpling, no neck; head and body are the same shape
     █ ●   ● █       face — two big shiny eyes, tiny mouth, blush dots
     █  ◡ ◡  █
      ▀█▄▄▄█▀        paws — two tiny nubs at the front
        ▀ ▀          feet — barely visible; hidden when squashed
      ░░░░░░░        shadow — a separate sprite, always stays on the ground
```

- **Canvas** 32×32. The bunny fills about 20×20 standing, so stretch and ears
  have room.
- **Anchor** at the bottom-centre (where the feet touch the ground). Squash and
  stretch scale from this point, so the bunny never sinks into the ground or
  floats above it.
- **Colour** cream-white body, pale pink inner ears and blush, black eyes with
  a white highlight. The body is tinted in-game to show culture; black eyes
  stay black under a multiply tint, so faces survive tinting.
- **Directions** 4: south (face fully visible), east (face in profile), north
  (back of head, no face), west (east mirrored). Expressions only matter for
  south and east.

## The rig: what's drawn vs. what's code

The biggest decision. A mochi is mostly **squash, stretch, and bounce** — which
Phaser can do by scaling one sprite. So most movement is **code**, and the
generated art only has to supply poses and faces.

```
  layer (top → bottom)        source                    moves how
  ──────────────────────────  ────────────────────────  ─────────────────────────────
  glyph bubble (♥ ? ! ♪ zzz)  small sprite sheet        floats above, fades
  accessory (culture hat)     small sprites             rides on the head
  face overlay                expression sheet          rides on the body
  body + ears                 generated frames          squash/stretch/arc in code
  shadow                      one oval sprite           stays on ground, scales with height
```

| Done in code (Phaser tweens / springs) | Done with art (frames) |
|---|---|
| squash and stretch on every hop and landing | ear poses (up, flat, droopy, one flopped) |
| hop arc (height) and shadow shrinking | paw poses (holding a berry, reaching out) |
| jiggle (a spring that settles after landing) | curled-up sleep ball |
| tumbling when flung (rotation) | the split (mitosis) sequence |
| trembling (fast tiny x-offset) | faces (the expression sheet) |
| glow and sparkle when learning | |
| culture tint | |

This keeps the atlas small (hundreds of Mimlings share it) and makes every
face work with every pose.

**Fallback:** if the separate face layer looks wrong on generated frames, use
fully-drawn frames for the most important expressions (happy, scared, sleepy)
and skip the overlay.

## Moving: the hop

Mimlings never walk. They **hop**, and every hop is a small squash-and-stretch
story.

```
  1 ANTICIPATE    2 LAUNCH       3 AIRBORNE      4 LAND (FLOP)    5 JIGGLE
  (squash)        (stretch)      (arc)           (squash hard)    (spring settles)

                                    ▌▐
                     ▌ ▐           ▄██▄   ← ears trail
                    ▐█▌            ▀██▀     behind
   ▌ ▐              ███                                              ▌ ▐
  ▄████▄            ███                                             ▄███▄
  ▀████▀            ▀█▀                          ▄▄▄▄▄▄▄           ▀███▀
  ░░░░░░           ░░░░░            ░░           ▀▀▀▀▀▀▀           ░░░░░
                                  (shadow        ▔▔▔▔▔▔▔▔ ears
  wide & short     tall & thin     small)         flop forward      wobble → rest
```

| Phase | Time | Scale X × Y | Notes |
|---|---|---|---|
| 1 anticipate | 80 ms | 1.20 × 0.80 | ears pull back slightly |
| 2 launch | 60 ms | 0.85 × 1.20 | leaves the ground, ears stretch up |
| 3 airborne | 200–300 ms | 0.95 × 1.05 | parabolic arc; ears trail behind the direction of travel |
| 4 land | 60 ms | 1.30 × 0.70 | the "flop": ears bounce forward |
| 5 jiggle | 200 ms | spring to 1.0 × 1.0 | damped oscillation, 2–3 wobbles |

Direction, distance and speed are chosen **at takeoff**. A Mimling can't
steer in the air — which suits the sim: steering, avoiding neighbours and
choosing the next habit all happen between hops.

### Gaits

Same hop, different numbers. Each gait tells you the Mimling's mood from
across the meadow.

| Gait | Height | Length | Rhythm | Extra | Used when |
|---|---|---|---|---|---|
| **pootle** | low | short | lazy pauses between hops | little look-around between hops | wandering, content |
| **bound** | high | long | quick, no pause | extra stretch, ears straight up | excited, going to food, following the hand |
| **scamper** | very low | short | very fast, many small hops | ears flat back | fleeing, scared |
| **flop-crawl** | none | tiny | slow | belly slides forward on the landing | tired, hungry |
| **wobble** | low | random | irregular, direction wanders | rotation wobble | dizzy (after a fling) |
| **follow-hop** | matches the leader | matches the leader | hops *in sync* with the one in front | | the "lead/follow" habit (duckling lines) |

In-sync hopping is a free emergent treat: a line of followers bouncing in
unison reads instantly as "they're copying".

### Being handled by the god hand

| State | Look |
|---|---|
| **picked up** | stretched tall from the top (pinched), feet dangle and kick, ears droop |
| **carried** | swings gently like a pendulum in the direction of drag |
| **flung** | spins (code rotation), squashed into a ball |
| **landing after a fling** | big splat (1.5 × 0.5), then wobble gait and dizzy face |
| **gently set down** | small squash, a happy jiggle |

## Emotions

Every emotion is a combination of **face + ears + body + glyph**, so it still
reads at 16 px even if the face is only a few pixels.

| Emotion | Face | Ears | Body | Glyph | Triggered by |
|---|---|---|---|---|---|
| neutral | round eyes, small mouth | relaxed up | normal | — | default |
| happy | ^ ^ eyes, open smile | up, small bounce | little hops on the spot | ♪ | fed, needs met |
| love | closed eyes, big blush | tips curl in | sways | ♥ | patted, groomed |
| curious | big round eyes, "o" mouth | one up, one tilted | leans forward | ? | sees something new, the hand hovering |
| surprised | wide eyes, big "O" | shoot straight up | quick stretch | ! | the hand lands nearby, a neighbour splits |
| scared | wide eyes, wobbly mouth, sweat drop | flat back | shrunk, trembling | ! | shoved, flung, the hand slams down |
| sad | droopy eyes, tear | droop down | flattened (0.9 × 0.9) | — | lonely, hungry for long |
| grumpy | slanted eyes, pout | back and tense | puffed wide | 💢 | shoved by a neighbour (fuel for the "shove" culture) |
| sleepy | half-closed eyes | droop to the sides | slow breathing | zzz | low energy |
| asleep | – – eyes | lie flat over the body | curled ball | zzz | sleeping |
| dizzy | spiral eyes, wavy mouth | flopping around | wobble | ✦ | after a fling |
| content | closed smile eyes | relaxed | slow jiggle | — | being groomed, eating |
| determined | focused eyes, tight mouth | forward | leans in | — | practising a new habit |
| adoring (worship) | shining eyes, looking up | back, lowered | bows | ✦ | the hand hovers close (worshipful side) |

Idle life, all in code: **blink** every 2–5 s (random), **ear twitch**, a
**glance** left and right, and **look up** when the hand's shadow passes over.

## Action animations

Grouped by what needs them.

### Locomotion and idle

| Animation | What it looks like | Frames | Loops | Art or code |
|---|---|---|---|---|
| idle | gentle breathing bob, ears sway | 4 | yes | art (ears) + code (bob) |
| hop | the 5-phase hop above | — | — | **code** on the idle pose; optional art for ear trail |
| look-up | head tilts up, ears perk, eyes on the sky | 4 | hold | art |
| look-around | glances left then right | 4 | no | art or face overlay |

### Needs

| Animation | What it looks like | Frames | Loops |
|---|---|---|---|
| eat | nibbles a berry held in both paws, cheeks puff | 6 | yes |
| sleep | curls into a round ball, slow breathing | 4 | yes |
| wake | uncurls, big stretch, ears pop up | 6 | no |
| yawn | mouth opens wide, ears droop | 4 | no |

### Habits (what they learn from the hand)

| Animation | What it looks like | Frames | Loops | Habit |
|---|---|---|---|---|
| give | holds a berry out in front with both paws | 4 | hold | give food |
| receive | reaches out, takes, happy bounce | 4 | no | (partner of give) |
| groom | leans sideways and nuzzles, ears wrap over | 6 | yes | groom |
| shove | quick lunge with both paws | 4 | no | shove |
| get shoved | knocked back, squash, ears fly | 4 | no | (partner of shove) |
| tend | pats the ground/bush with its paws | 4 | yes | tend plants |
| dance | side-to-side hops, spin, ears flap | 8 | yes | dance |
| lead | a proud little hop, looks back over shoulder | 4 | no | lead / follow |
| bow | squashes low, ears down forward | 4 | hold | worship the hand |
| build shrine | places a twig, pats it | 6 | no | worship (later) |

### Handled by the hand

| Animation | What it looks like | Frames | Loops |
|---|---|---|---|
| dangle | held from the top, feet kick, ears droop | 4 | yes |
| tumble | curled into a ball (rotation is code) | 1–2 | — |
| splat | pancaked flat, ears spread | 2 | no |
| get up | peels off the ground, shakes, dizzy | 6 | no |

### Life events

| Animation | What it looks like | Frames | Loops |
|---|---|---|---|
| **split** | wiggles, stretches wide, pinches in the middle, *pops* into two smaller bunnies (with a puff) | 8 | no |
| **born** | the new half bounces, blinks, looks around | 4 | no |
| **learn** | glows, sparkles circle it, a little "mim!" hop | code + sparkle sprite | no |
| **practise (clumsy)** | tries the new habit and wobbles/fails once | reuse habit anim + code wobble | no |
| **poof** (if a Mimling ever leaves) | shrinks into a puff of fluff and floats away — gentle, never gory | 6 | no |

## Voice

Each Mimling has one word: **"mim!"**. Pitch-shift it per Mimling (and per
culture) for variety. Moments that say it: learning a habit, splitting, being
patted, greeting the hand. Everything else is glyph bubbles.

## Priority

**v1 (sandbox) must-haves**

- base sprite, 4 directions
- idle, look-up, eat, sleep
- code: hop + gaits, squash/stretch, jiggle, blink, tint
- faces: neutral, happy, love, curious, scared, sleepy/asleep, dizzy
- habits: give, groom, shove, dance
- handled: dangle, splat
- split + born
- shadow, glyph bubbles, sparkle

**Later**

- tend, lead, bow, build shrine, wake, yawn, receive, get shoved, get up, poof
- faces: surprised, sad, grumpy, content, determined, adoring
- culture accessories (flower crown, leaf hat, acorn cap, bow)
