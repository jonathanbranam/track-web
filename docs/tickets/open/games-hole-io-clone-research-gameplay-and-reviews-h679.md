---
id: h679
title: "Games: Hole.io clone — research gameplay and reviews"
kind: research
opened: 2026-10-04
repos: [track-web]
changes: []
specs: []
needs: []
see: [5sbv, q5ff]
tasks: []
---

## The ask

From the human, 2026-10-04, via aide (verbatim):

> Do research on gameplay and reviews and build a hole.io clone.

## What to find out

Feeds the build ticket (see below). Keep it short and aimed at what we'd build.

- **Core loop:** how the hole moves and grows, what it can swallow at each size, round length, scoring.
- **Modes:** classic (timed battle against bots or players), solo, battle royale, and which one is worth copying first.
- **Opponents:** how the bots behave, and whether a hole can swallow a smaller one.
- **Feel:** physics of objects falling in, camera zoom as the hole grows, controls on touch (drag versus virtual joystick).
- **Reviews:** what players like and what they complain about (ads, repetition, unfair bots), and what we should do differently.
- **Fit for client-games:** the original is 3D. Recommend a Phaser 3 approach (top-down 2D, or faked 3D), sized for phones and with Phaser externalized as CLAUDE.md requires.

Output: findings written on this ticket, plus a proposed rule set for the build ticket. Ask the human about anything the research leaves open.

## Findings

Sources: Wikipedia's Hole.io article (modes, bots, Donut County history), the App Store
listing (4.6 stars, about 1.97M ratings, Voodoo, free) and about 100 App Store reviews (most
recent and most helpful feeds). Web search and the game wiki were not reachable, so exact
numbers (growth curve, level count, bot tuning) are not sourced: the rule set below proposes
them, and they are tuning knobs, not facts about the original.

### Core loop (sourced)

- You are a hole on a city map. You drive it; objects smaller than the hole fall in, and the
  hole grows. Trees, people, cars, then buildings as it grows.
- An object too big for the hole does not fall in and can sit there and block smaller things.
- Classic round: 2 minutes, biggest hole at the end wins. Solo: 2 minutes, eat as close to
  100% of the city as you can. Battle: last hole standing wins.
- A bigger hole can swallow a smaller hole. A swallowed hole dies and respawns after a few
  seconds in classic (in battle there is no respawn).
- Reviewers mention about 19 size levels, 3 maps, skins and ranks, so levels are discrete steps
  with bounded size.
- "Opponents" are bots. Reviewers notice the same names every game. The Wikipedia article
  records the "fake multiplayer" criticism.
- It started as a clone of Donut County's hook; the idea itself is not protected, the art and
  name are. We use our own name and art.

### Modes, and which to copy first

| Mode | Cost to build | Value |
|---|---|---|
| Solo (clear the city in 2 min) | lowest: no bots, no hole-vs-hole rules | teaches the loop and tests feel |
| Classic (2 min, bots, respawn) | medium: needs bots, scoring, hole-vs-hole | the core of the original |
| Battle (last hole standing) | medium plus: no respawn, elimination, stalemate handling | bot-dependent, and has a known bug (below) |

Recommendation: build Classic first, with Solo as a free by-product (Classic with zero bots
and a "% of city eaten" score). Skip Battle until Classic is fun.

### Feel (mostly proposal; the original is 3D)

- Objects tilt and drop when more than half of their footprint is over the hole, then shrink
  as they fall. Objects too big stay solid. This is what makes it satisfying, so fake it in 2D:
  scale down plus a small rotation over about 250 ms, plus a pop sound that gets lower as the
  hole gets bigger.
- The camera zooms out in steps as the hole grows, so the hole stays roughly the same size on
  screen. This is the main sense of growth.
- Touch control: a floating joystick (appears where the thumb lands, hole moves toward the
  drag direction, speed by drag distance up to a cap). Plain drag-to-follow hides the hole
  under the finger on a phone.

### What reviewers like

- "Satisfying", "relaxing", "mindless fun", "stress-releaser": the eating itself and watching a
  town disappear.
- Simple one-thumb controls, short rounds, free to start.
- Skins and ranks as goals (a few reviewers say they were the reason to keep playing).
- Variety of maps and modes when it was there.

### What reviewers complain about (in order of frequency)

1. **Ads**: by far the most common. Ads mid-round (the "halftime" ad), 3 per round, an ad
   every minute, tiny close buttons that open the store. Many deleted the app over it.
2. **Paid ad removal that does not remove ads**: after paying about $10, reviewers still
   watch ads to continue, and timers get tighter on later levels so you run out of time and
   must watch an ad. Called a scam.
3. **Content runs out**: only three maps, same names, random map you cannot choose, nothing
   after maxing out ranks. "Gets boring after a week."
4. **Fake multiplayer**: the same bot names every round, bots that do not move like players.
   Others find the bots too easy and ask for a difficulty setting.
5. **Stalemate bug**: in battle, when two holes both reach the max level, neither can
   swallow the other and the round never ends. Two reviewers report it.
6. **Progress reset and paywalled skins**: an update took earned skins away and moved them to
   a battle pass.
7. **Tuning**: too little time to clear the city, objectives that cannot be met on a map (eat 10
   vehicles in the office map where there are none), lag and crashes, 240 MB size.

### What we do differently

- No ads, no timers that exist to sell time, no purchases. This is a personal platform.
- Always-available game: no stalemates (rule 12), no unreachable objectives.
- Pick the map, or a daily seed.
- Honest bots: show them as bots, give them distinct names and personalities.
- Progress (best score, skins) lives in the existing games score tables and is never reset.

### Fit for client-games

Recommend **top-down 2D in Phaser 3**, with faked depth. Reasons: Phaser is already the
pattern (see `client-games/src/games/` and its registry), 3D would need Three.js or Phaser
WebGL tricks and a big asset pipeline, and the t4g.micro build box cannot take a heavy
bundle. Phaser stays externalized via the CDN import map as CLAUDE.md requires; no new
runtime dependency is needed.

How the faked depth works:

- A "hole" is a dark ellipse (slightly squashed, for a 3/4 look) drawn above the ground and
  below the objects. Objects are sprites or drawn shapes with a drop shadow.
- Collision is a circle test, not physics: no Matter or Arcade physics needed. Objects
  are static; blocked objects are just not eaten.
- Falling is a tween on scale and rotation, then destroy. Cheap, deterministic, testable.
- Objects are drawn as Phaser Graphics shapes or small procedural textures at load, so there
  are no downloads and the first version needs no art pipeline (see open choice 2).
- Spatial grid for objects, so the swallow check is O(nearby), not O(all). A map with
  about 1500 objects is fine for phones.
- Keep the rules (growth, swallow test, scoring, bot decisions) in a plain TypeScript module
  with no Phaser import, so vitest can run it, like the engine split in `dungeon-engine`.

## Proposed rule set (for the build ticket, q5ff)

Numbers are starting values to tune by play, not facts from the original.

**Map and objects**

1. The map is a fixed rectangle of about 3000 x 3000 world units, scrolled by a camera. One
   map in the first version (a small town), with a seed that moves object positions a little
   each round so rounds differ.
2. Every object has a **size tier** 1..N (N = 8 to start) and a point value that grows with
   the tier: pebbles/cones/bins (1), people/signs/bushes (2), benches/trash trucks (3),
   cars (4), trees/kiosks (5), buses/houses (6), shops (7), towers (8). Many small, few
   large, as in the original.
3. An object is swallowed when the hole's **level >= the object's tier** and the object's
   centre is within the hole's radius. Otherwise it is solid: it is not eaten and the hole
   cannot pass through it (it slides around it).

**The hole**

4. The hole has a **mass** (sum of eaten object points). Level is a step function of mass:
   level 1 at 0, and each next level needs about 1.5 times the previous total. Radius is
   per level, 24 units at level 1, growing about 30% a level, and eased up over about 300 ms
   so growth is seen, not jumped.
5. Max level is N+1 = 9 (can eat every object). Holes at max level still follow rule 9 and
   rule 12.
6. Speed is constant per level (a little slower when bigger would feel sluggish at zoom;
   keep it in screen terms: the same pixels per second at every zoom).
7. The camera zoom steps out when the level rises, so the hole is about the same on-screen
   size; zoom is eased.

**Controls**

8. Floating joystick, one thumb: touch down sets the origin, drag sets direction, speed scales
   with drag length up to a cap at about 60 px. Mouse and keyboard (WASD or arrows) also work
   on desktop. No buttons.

**Hole vs hole (Classic)**

9. A hole can swallow another when its **radius is at least 1.2 times** the other's and the
   bigger hole's rim covers the smaller hole's centre. The swallowed hole's mass is not
   transferred in full: the eater gets 50% of the
   victim's mass (rewarding the hunt, not snowballing it).
10. A swallowed hole (player or bot) **respawns after 3 s** at a safe spot far from bigger
    holes, at **half its mass**, with 2 s of invulnerability (it blinks and cannot eat or be
    eaten).

**Round and scoring**

11. Classic round is **120 s**. Score is mass at the end, so a respawn costs you half. Rank
    is by mass. At the buzzer: the final ranking, your best, and "play again".
12. **No stalemate**: when two holes are within 1.2x of each other at max level, the
    round still ends on the timer; there is no last-hole-standing win condition in Classic.
    If Battle is built later, add a shrinking arena so the end always comes.
13. Solo is Classic with no bots; its score is **% of city mass eaten** in 120 s, with a
    bonus for finishing early (the whole map eaten ends the round).

**Bots**

14. 3 to 5 bots per round, each with a distinct name and a **personality** drawn at round
    start: *Grazer* (nearest edible object, avoids bigger holes), *Hunter* (chases the
    nearest smaller hole if one is within range, else grazes), *Coward* (flees any larger hole,
    prefers the map edges). The bot names come from a fixed list of 20+ names and are
    shuffled so repeats are rare.
15. Bots are shown as bots (a small tag next to the name). No pretending to be players.
16. Bot reaction time is 200 to 400 ms, speed is the same as the player's at the same level,
    and bots do not see the whole map (they use a radius of about 6 times their own radius).
    Difficulty (easy/normal/hard) changes only the reaction time and the Hunter chance.
17. Bots never cheat on growth: they use the same rules 3, 4, 9 and 10.

**Feedback**

18. Eating gives a small pop (scale), a floating +points number, and a sound that is
    pitched lower for bigger tiers. Level-up gets a ring pulse and a short flourish.
19. The HUD shows: the clock, your rank and a mini leaderboard of the holes by mass, and a
    "% eaten" bar. No ads, no pause-for-ad "halftime".

**Scope of the first build (Classic, one map)**: rules 1 to 11, 13, 14 to 19; the pure
rules module with vitest tests (swallow test, level steps, hole-vs-hole, respawn, scoring);
the Phaser scene; the registry entry; the spec in `openspec/specs/`. Deferred: Battle mode,
more maps, skins, online play. Each is a "not yet" until Classic is fun.

**How to verify the build**: `npx vitest run client-games && npm run build:games` passes; tests
cover the rules module; no new dependency; Phaser stays external.

## Open choices for the human

1. **Which mode first?** Recommended: Classic (2 min, bots), with Solo free as "no bots".
   Alternative: Solo only, as the fastest thing to try.
2. **Art.** (a) Procedural shapes drawn in code, flat colour and shadows: zero assets, ready
   fastest, a clean look; recommended for the first build. (b) PixelLab pixel-art sprites
   (docs/pixellab/README.md): consistent with other games, but about 40 objects
   of art to make and approve first. (c) Isometric or faked-3D sprites: best look, most work.
3. **Name and theme.** Not "Hole.io". A town of our own, or a theme (a fair, a campsite, the
   family's trip)? Does the human want personal touches (family names as bot names)?
4. **Hole-vs-hole in v1?** Rules 9 and 10 can be left out (everyone only eats objects and
   bots just race you). Simpler, but then bots are not a threat. Recommended: include them.
5. **Skins and rank**: reviewers liked them as goals; do we want a simple local best-score
   list only, or skins too (deferred in this plan)?
