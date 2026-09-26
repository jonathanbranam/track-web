# Mimlings

> *They watch everything you do. Then they do it to each other.*

A god game for `client-games`. You tend a meadow full of small, round, cute
animals — the **Mimlings** — through a floating **god hand**. You never control
a Mimling directly. You feed, pat, carry, and fling them, and they *learn*: each
gesture you make becomes a habit, habits spread Mimling-to-Mimling by
observation, and over generations the herd grows its own culture. That culture
is the game.

Status: **idea stage** — nothing built, no OpenSpec change yet.

## Files

- `README.md` — this pitch
- `ideas.md` — mechanics brainstorm: the habit (meme) system, gestures, needs, cultures, the verdict
- `characters.md` — candidate animals, personalities, the suggested pick, and prompts for generating the art
- `mochi-bunny.md` — the chosen design: anatomy, the hop and gaits, emotions, every animation the game needs
- `mochi-bunny-pixellab-prompts.md` — copy-paste PixelLab prompts for the mochi-bunny and supporting art
- `tech.md` — how it would fit `client-games` (sim/render split, performance on iPhone, art)
- `open-questions.md` — decisions not made yet

## Inspirations

| Source | What we take |
|---|---|
| **Black Mirror: Thronglets** (Netflix, 2025; the in-universe 1994 Tuckersoft game from the episode *Plaything*) | Creatures that learn how to treat each other from how *you* treat them; mitosis-style population growth; a closing character assessment of the player |
| **Populous** (Bullfrog, 1989) | Indirect god control — you shape the world and the followers act on their own; god "verbs" rather than unit orders |
| **Tamagotchi** | Needs, care, attachment to small creatures |
| **Lemmings / Pikmin** | A crowd of tiny creatures that is readable at a glance |
| **Boids** (Reynolds, 1987) | Flocking steering — separation, alignment, cohesion |

## Direction chosen (2026-09-25)

- **Primary: "Teacher" (cultural evolution).** Behaviours spread through the
  herd as habits that are observed, reinforced, inherited, and mutated.
- **Included: "God hand".** The player's only interface is a hand of touch
  gestures — the easiest fit for a phone, and the loudest example the Mimlings
  ever see. The hand is the *teacher*; the herd is the *classroom*.
- Rejected for now: a player avatar walking among the herd ("Big One" / Pikmin
  style).
