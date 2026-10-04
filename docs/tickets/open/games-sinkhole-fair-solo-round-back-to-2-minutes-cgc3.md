---
id: cgc3
title: "Games: Sinkhole Fair — solo round back to 2 minutes"
kind: feature
opened: 2026-10-04
repos: [track-web]
changes: []
specs: []
needs: []
see: [q5ff]
tasks: [tw-k4b2]
---

## The ask

From the human, 2026-10-04, via advisor (verbatim):

> Why don't you just change the solo level timer back to 2 minutes for me? That'll give me more time to go through it and take some screenshots, or make an easy mode for solo that's 2 minutes. I'll try that one out and get some more screenshots for you.

## The change

Sinkhole Fair (`client-games/src/games/sinkhole-fair/`). Solo goes back to 2 minutes:

- `rules.ts`: set `SOLO_ROUND_MS` to `120_000`, or fold solo into `ROUND_MS`. Also update the comment "solo is shorter (see roundMs)".
- `rules.test.ts`: the "solo is one minute, classic two" test, and the early-clear bonus expectation that uses `SOLO_ROUND_MS`.
- The menu blurb in `SinkholeGame.tsx` already says "2 minutes", so it's right again once this lands.
- Update the game's OpenSpec spec if it states the solo length.

Take the simple route the human offered first ("just change … back to 2 minutes"), not a new easy mode. The early-clear bonus scales with the round length, so solo bests saved under the 1-minute round aren't comparable. That's acceptable; mention it in the hand-off.
