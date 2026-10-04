---
id: 6czb
title: "Games: Sinkhole Fair — objects you can't eat are drawn smaller than you; draw them to match the eat rule"
kind: bug
opened: 2026-10-04
repos: [track-web]
changes: []
specs: []
needs: []
see: [q5ff, cgc3]
tasks: [tw-v3hg]
---

## The ask

From the human, 2026-10-04, via advisor (verbatim):

> There are some elements on the screen that clearly look smaller than I am, but I still can't swallow them. Is that normal, or is that just a mistake in the sizing? I can't really tell for sure, but there's something.

The human's screenshot shows a level-L hole next to a tier-4 food stand it can't swallow. The stand is visibly about three-quarters of the hole's width.

And, on the fix (verbatim):

> Yeah, I think let's just try the new simple implementation based on your recommendation with the sizing fix, and I'll upload it.

## Cause (advisor, from `rules.ts` on dev)

What a hole can eat depends on **tier versus level**, not on how big things look: it swallows an object when `o.tier <= h.level`, and anything of a higher tier is solid. Objects are drawn at `objectRadius(tier) = radiusForLevel(tier) * 0.6`, and `GROWTH` is 1.3, so:

- the next tier up, which you **can't** eat, is drawn at 0.6 × 1.3 = **0.78×** your radius, clearly smaller than you;
- two tiers up is drawn at 0.6 × 1.69 = 1.01×, about your own size.

So the game looks like it lets you eat things it won't let you eat.

## The change: drawing only, same gameplay

Change the factor in `objectRadius` from 0.6 to about **0.85**. Then:

- the highest tier you can eat (tier = your level) is drawn at 0.85× your radius, so it looks smaller and fits;
- the next tier up is drawn at 0.85 × 1.3 = **1.1×** your radius, so it looks bigger and is solid.

Anything in roughly 0.80–0.90 keeps that order; pick one by eye. Every object shape in `drawObject` stays within `o.r`, so the scene needs no change.

Knock-on effects to check, since `o.r` drives more than drawing:
- **Solid collision** (`d < o.r`): solid objects get bigger, which is consistent with how they now look.
- **Placement spacing** in `newWorld` and regrow (`o.r + r + 70`, `+ 40`) and the spawn check: the larger objects need room on the 3000-unit map. Check that all `TIER_COUNTS` still place, and that the "no object overlaps the spawn" test still passes.
- Leave the swallow rule, levels, points and timers alone. This is a visual fix.

Add a test that a hole looks bigger than every object it can eat and smaller than every object it can't: `objectRadius(t) < radiusForLevel(t)` and `objectRadius(t + 1) > radiusForLevel(t)` for every tier. Update the OpenSpec spec if it states object sizes.

**Not this ticket:** a Hole.io-style physical rule (eat anything that fits through the hole) would need gameplay rebalancing. The human may ask for it later.
