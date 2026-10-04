# games-sinkhole-fair

**App**: games

## Purpose

Sinkhole Fair, a single-player "hole" game in the style of Hole.io (our own name, art and theme: a county fair). You drive a hole; objects smaller than the hole fall in and the hole grows. The rules live in the pure module `client-games/src/games/sinkhole-fair/rules.ts` (seeded RNG, no Phaser, no DOM); `SinkholeScene.ts` is the Phaser rendering shell and `SinkholeGame.tsx` the React shell (menu, HUD, end screen). All art is drawn in code. Numbers below are tuning knobs, constants in `rules.ts`.

## Requirements

### Requirement: Registered as a top-level game
Sinkhole Fair SHALL be a `single-player` entry in the game registry with slug `sinkhole-fair`.

### Requirement: Map and objects
The map SHALL be a 3000 x 3000 rectangle with one fixed layout (the fair), whose object positions are nudged by up to 30 units from the round's seed. Every object has a size tier 1..8 and is worth its tier in points; counts per tier fall as the tier rises (280, 160, 80, 40, 22, 12, 7, 4). No object starts near a hole's spawn point.

### Requirement: Swallowing
An object SHALL be swallowed when the hole's level is at least the object's tier and the object's centre is inside the hole's radius; the hole gains the object's points as mass. An object of a higher tier SHALL be solid: the hole cannot enter it and slides around it. A swallowed object shrinks and spins for 250 ms before it is removed.

### Requirement: Food lasts (classic)
In Classic, a swallowed object of tier 1 to 3 SHALL reappear 3 s after it is removed, at a random spot clear of holes and other objects (a blocked one waits), so bots cannot strip the town. Solo has no regrowth: clearing the city ends the round.

### Requirement: Growth
Level SHALL be a step function of mass: level 1 at 0, level 2 at 10, each next level at 1.8 times the previous threshold (so level 9 needs about 600), up to level 9 (which can swallow every object). Radius is 24 units at level 1 and grows 30% a level, eased over about 300 ms. Speed is proportional to radius, so it is constant in screen terms, with a bonus of +70% at level 1 that fades linearly to none at level 9 (small holes do not feel like moving through mud); the camera zoom follows the player's radius, so the hole stays about the same size on screen.

### Requirement: Controls
The hole SHALL be steered with a floating one-thumb joystick (touch down sets the origin, drag sets direction, speed scales with drag length up to 60 px) or by mouse drag, or with WASD or the arrow keys. There are no buttons in play.

### Requirement: Hole vs hole
A hole SHALL swallow another when its radius is at least 1.2 times the other's and its rim covers the other's centre. The eater gains a quarter of the victim's mass. The victim respawns after 3 s at a safe spot far from bigger holes, keeping 75% of its mass, and for 2 s it blinks and can neither eat nor be eaten by holes. (Objects may still be eaten during that time.)

### Requirement: No runaway leader
Mass gained from objects SHALL be doubled for a hole below 40% of the leader's mass (catch-up), and halved (at least 1) for a level-9 hole above 2.5 times the mean mass of the others (brake). Together with the slower level curve, hole-eating share and regrowth, this keeps a bots-only round from ending with one bot far ahead (the simulation test in `rules.test.ts` checks 12 seeds: the best bot ends under 10 times the worst bot's mass on average).

### Requirement: Modes and scoring
Classic SHALL run 120 s with 4 bots; its score is the player's mass at the buzzer, and the final ranking by mass is shown. Solo SHALL run 120 s (two minutes) on the same module with no bots; its score is tenths of a percent of the city's mass eaten, plus one point per second remaining if the whole city is eaten (which ends the round early). There is no last-hole-standing win: rounds end on the timer.

### Requirement: Bots
Each bot SHALL have a distinct name from a fixed list and a personality drawn at round start: Grazer (nearest edible object, flees holes that could eat it), Hunter (chases the nearest smaller hole in range, else grazes), Coward (flees any larger hole, prefers food near the map edge). Bots are labelled "[bot]". A bot reacts every 200 to 400 ms, moves at the player's speed for its size, sees only 6 of its own radii around it, and follows the same swallowing, growth and respawn rules. Difficulty (easy, normal, hard) changes only the reaction time and the Hunter chance; the UI plays normal.

### Requirement: Feedback and HUD
Eating SHALL show a floating "+points" number and play a pop pitched lower for bigger tiers; a level-up SHALL show a ring pulse and a short flourish. The HUD shows the clock, the player's rank and a mini leaderboard (Classic), and a "% eaten" bar. There are no ads and no pause.

### Requirement: Best score
The best score per mode SHALL be kept in `localStorage` only; it is not sent to the server.

### Requirement: Dev test hook
In dev builds only (`import.meta.env.DEV`), the scene SHALL expose `window.__game` with `name`, `getState()` (the world), `legalMoves()` (eight compass moves), `move({x, y, ms})` (hold the stick for `ms` of game time), `setInput(v | null)` and `restart()`.
