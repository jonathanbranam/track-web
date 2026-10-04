# games-sinkhole-fair

**App**: games

## Purpose

Sinkhole Fair, a single-player "hole" game in the style of Hole.io (our own name, art and theme: a county fair). You drive a hole; objects smaller than the hole fall in and the hole grows. The rules live in the pure module `client-games/src/games/sinkhole-fair/rules.ts` (seeded RNG, no Phaser, no DOM); `SinkholeScene.ts` is the Phaser rendering shell and `SinkholeGame.tsx` the React shell (menu, HUD, end screen). All art is drawn in code. Numbers below are tuning knobs, constants in `rules.ts`.

## Requirements

### Requirement: Registered as a top-level game
Sinkhole Fair SHALL be a `single-player` entry in the game registry with slug `sinkhole-fair`.

### Requirement: Map and objects
The map SHALL be a 3000 x 3000 rectangle with one fixed layout (the fair), whose object positions are nudged by up to 30 units from the round's seed. Every object has a size tier 1..8 and is worth its tier in points; counts per tier fall as the tier rises (160, 100, 60, 36, 22, 12, 7, 4). No object starts near a hole's spawn point.

### Requirement: Swallowing
An object SHALL be swallowed when the hole's level is at least the object's tier and the object's centre is inside the hole's radius; the hole gains the object's points as mass. An object of a higher tier SHALL be solid: the hole cannot enter it and slides around it. A swallowed object shrinks and spins for 250 ms before it is removed.

### Requirement: Growth
Level SHALL be a step function of mass: level 1 at 0, level 2 at 10, each next level at about 1.5 times the previous threshold, up to level 9 (which can swallow every object). Radius is 24 units at level 1 and grows 30% a level, eased over about 300 ms. Speed is proportional to radius, so it is constant in screen terms; the camera zoom follows the player's radius, so the hole stays about the same size on screen.

### Requirement: Controls
The hole SHALL be steered with a floating one-thumb joystick (touch down sets the origin, drag sets direction, speed scales with drag length up to 60 px) or by mouse drag, or with WASD or the arrow keys. There are no buttons in play.

### Requirement: Hole vs hole
A hole SHALL swallow another when its radius is at least 1.2 times the other's and its rim covers the other's centre. The eater gains half the victim's mass. The victim respawns after 3 s at a safe spot far from bigger holes, at half its mass, and for 2 s it blinks and can neither eat nor be eaten by holes. (Objects may still be eaten during that time.)

### Requirement: Modes and scoring
Classic SHALL run 120 s with 4 bots; its score is the player's mass at the buzzer, and the final ranking by mass is shown. Solo SHALL run the same module with no bots; its score is tenths of a percent of the city's mass eaten, plus one point per second remaining if the whole city is eaten (which ends the round early). There is no last-hole-standing win: rounds end on the timer.

### Requirement: Bots
Each bot SHALL have a distinct name from a fixed list and a personality drawn at round start: Grazer (nearest edible object, flees holes that could eat it), Hunter (chases the nearest smaller hole in range, else grazes), Coward (flees any larger hole, prefers food near the map edge). Bots are labelled "[bot]". A bot reacts every 200 to 400 ms, moves at the player's speed for its size, sees only 6 of its own radii around it, and follows the same swallowing, growth and respawn rules. Difficulty (easy, normal, hard) changes only the reaction time and the Hunter chance; the UI plays normal.

### Requirement: Feedback and HUD
Eating SHALL show a floating "+points" number and play a pop pitched lower for bigger tiers; a level-up SHALL show a ring pulse and a short flourish. The HUD shows the clock, the player's rank and a mini leaderboard (Classic), and a "% eaten" bar. There are no ads and no pause.

### Requirement: Best score
The best score per mode SHALL be kept in `localStorage` only; it is not sent to the server.

### Requirement: Dev test hook
In dev builds only (`import.meta.env.DEV`), the scene SHALL expose `window.__game` with `name`, `getState()` (the world), `legalMoves()` (eight compass moves), `move({x, y, ms})` (hold the stick for `ms` of game time), `setInput(v | null)` and `restart()`.
