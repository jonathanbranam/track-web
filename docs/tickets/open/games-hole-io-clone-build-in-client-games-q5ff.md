---
id: q5ff
title: "Games: Hole.io clone — build in client-games"
kind: feature
opened: 2026-10-04
repos: [track-web]
changes: []
specs: []
needs: [h679]
see: [5sbv]
tasks: []
---

## The ask

From the human, 2026-10-04, via aide (verbatim):

> Do research on gameplay and reviews and build a hole.io clone.

## What to build

A Hole.io-style game in `client-games`: the player steers a hole around a city, swallows objects smaller than it, grows, and competes for the biggest size before the timer runs out.

The rules come from the research ticket [[games-hole-io-clone-research-gameplay-and-reviews-h679]]. Don't start until its findings and proposed rule set are on that ticket. Built in Phaser 3, which is externalized (CLAUDE.md). It's inside the bridle trial scope (client-games, not Dungeon Tactics).

Open for the human once the research is in: the mode to build first, and the art (simple shapes now, PixelLab assets later?).

## First play-test (the human, 2026-10-04)

Played the first build, "Sinkhole Fair" (tw-nnu6, 76abc16), on the preview. Verbatim:

> I played it for a bit. Um, in solo, it's very easy to consume everything in two minutes. Uh, it might be better at one minute. Um, also, there's not, not that much to eat at the lower levels. So I feel like there could be more things that you can eat at the first level. With the bots, um, I, I don't know if this is normal. I haven't played the real game yet, but it's uh, really hard to find things to eat if you just happen to go anywhere near one of the other bots. Everything's gone, and you're just toast. And every time it's happened, I think the first bot that gets to the next level, to the next size... Uh, basically just wins and eats everybody else and gets like 400 points and everybody else is at like 10. So anyway, uh, it needs some tuning, but you know, overall it works. The movement at the first level is really slow, but I, maybe that's normal. I don't know. It feels like moving through mud. So I would probably uh, speed up the movement at the earlier levels. Uh, I'll have to try out the real game and do some comparisons, but for a first prototype, it's pretty good.

Tuning asks, from that:
1. **Solo round:** 2 minutes is too easy to clear everything. Try 1 minute.
2. **More to eat at level 1:** more small objects at the start.
3. **Bots strip the area:** near a bot there's nothing left to eat.
4. **Runaway leader:** the first bot to reach the next size eats everyone (about 400 points against about 10). Needs catch-up or a limit on snowballing.
5. **Early movement is too slow** ("like moving through mud"). Speed up the small sizes.

The human will also play the real Hole.io to compare. Overall verdict: "for a first prototype, it's pretty good."
