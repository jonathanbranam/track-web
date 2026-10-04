---
id: 8v3y
title: "Games: NATO alphabet trainer — flash 4-letter IDs, tap the right NATO word from 4 near-miss options, timed stages"
kind: feature
opened: 2026-10-04
repos: [track-web]
changes: []
specs: []
needs: []
see: []
tasks: [tw-vbjb]
---

## The ask

From the human, 2026-10-04, via advisor (verbatim):

> Create another game, and the purpose of the game is to help me learn the NATO international spoken alphabet. I need to learn this to use it when narrating and transcribing ticket keys and things like that. So yeah, come up with an idea, maybe like I'm narrating four-letter IDs that are taken from an alphabet of numbers and letters. These are the, the ticket and task IDs for these projects. They do skip a few letters, like L and O, but you know, go ahead and include all of those letters in there. Might as well learn them all at once. And I'm not going to be able to do it over voice, I don't think, for a video game. So, you know, come up with an idea, but maybe like flash, flash up four letters or numbers, and then show, you know, a list of things to select. I guess, I don't know, I don't really need the, the numbers if I'm not speaking. So just flash up a series of four letters and then show maybe a grid of four options, four words, and four words, one of which is the correct one and the other three are is very similar words that are not the correct answer. And, and I'll see how fast I can tap them. I think that's good for now. I don't feel like... typing. I don't want to type those words out. The point is to speak them, and I don't know how to do anything like that over a mobile web app. So yeah, if you have a better idea, I'm all ears, but let's get started with that. I think four just is kind of like I can just practice the sequence of four, and then we should keep track of time, like how fast I type them out, and then or how fast I tap the right one and then also like a stage that could be like a stage type of thing I don't know come up with a fun idea and throw it up there and I'll check it out

## What to build (advisor's reading)

A **new top-level game in `client-games`** (its own registry entry and route, beside the others; not a prototype). It is within the trial scope (`.bridle/rules/scope.md`). Add an OpenSpec spec (`openspec/specs/games-<slug>/`, `**App**: games`). A plain React UI is probably enough, with no Phaser. If it does use Phaser, Phaser stays externalised (CLAUDE.md).

- **Round:** flash a 4-character ID, A–Z only, with all 26 letters, L and O included. Then for each character in turn show a 2x2 grid of 4 NATO words. One is correct; the three distractors are plausible near-misses: other NATO words that look or sound alike, or common wrong spellings ("Alfa" not "Alpha", "Juliett" not "Juliet"). Use the ICAO spellings as canon. The human taps through the sequence.
- **Timing:** time each ID and each tap. Show the result and the personal best.
- **Stages:** a fun progression is the builder's call. Some options: start with a subset of letters, then widen; shorten how long the ID shows; time pressure; track the letters missed most and serve them more often.
- **Mobile first:** big tap targets, playable one-handed on an iPhone.
- Bests and stats can be stored in localStorage. No server work is needed, and `src/` is out of scope anyway.

Keep v1 small, ship it, and let the human try it. They said "throw it up there and I'll check it out".

**Possible follow-up, not v1 (advisor):** the human assumed voice won't work. iOS Safari does have `webkitSpeechRecognition`. It needs a secure context, so it would work at https://games.branam.us but not on LAN HTTP. A "say it" mode could come later; it is not part of this ticket.
