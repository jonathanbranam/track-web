# games-nato-alphabet

**App**: games

## Purpose

NATO Alphabet, a single-player trainer for the ICAO spoken alphabet, for narrating ticket and task IDs. A 4-letter ID is shown, then for each letter in turn the player taps the right NATO word from four. Plain React UI, no Phaser. The rules are pure modules under `client-games/src/games/nato-alphabet/` (`nato.ts`, `storage.ts`). This is a first version; voice input ("say it") is a possible later mode, not part of it.

## Requirements

### Requirement: Registered as a top-level game
NATO Alphabet SHALL be a `single-player` entry in the game registry with slug `nato-alphabet`, mounted at `/game/nato-alphabet`.

#### Scenario: Game appears in the catalog
- **WHEN** the games catalog renders
- **THEN** NATO Alphabet is listed as a single-player game

### Requirement: IDs and options
An ID SHALL be 4 letters drawn from the stage's pool, A to Z with every letter included (L and O too). For each letter the game SHALL show four words in a 2x2 grid: the ICAO word ("Alfa", "Juliett", "X-ray" are canon) and three distinct near-miss distractors, chosen from four curated per letter: common wrong spellings ("Alpha", "Juliet", "Whisky") and NATO words that look or sound alike.

#### Scenario: One correct option
- **WHEN** options are made for any letter
- **THEN** the grid holds the letter's ICAO word exactly once and three different distractors

### Requirement: Round flow and timing
The player SHALL tap one word per letter, in order. A wrong tap SHALL disable that word, count a mistake and count a miss for the letter; the player keeps going until the right word is tapped. The game SHALL time each tap and each ID (from when the options appear, or from when the ID is first shown on a stage where it stays on screen).

### Requirement: Stages
A run SHALL have 7 stages of 5 IDs each: letters A to H, A to M, then A to Z, all with the ID kept on screen; then A to Z with the ID shown for 3.0, 1.8, 1.0 and 0.6 seconds and then hidden (shown as `?`) while answering. A stage SHALL be cleared with at most 2 wrong taps; otherwise it SHALL repeat. Each stage ends with a summary (average tap and ID time, wrong taps). Clearing the last stage ends the run.

### Requirement: Weak letters come up more
Letters tapped wrong SHALL be drawn more often: weight `1 + 2 * min(misses, 5)`. Miss counts persist across runs.

### Requirement: Bests
The game SHALL show the fastest ID answered with no wrong tap and the fastest completed run (sum of the ID times of the cleared stages). Both and the miss counts are kept in `localStorage` and not sent to the server.

### Requirement: Dev test hook
In development builds only, `window.__game` SHALL expose `getState`, `legalMoves`, `move` and `restart` like the other games.
