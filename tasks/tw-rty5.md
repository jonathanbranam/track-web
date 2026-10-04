+++
id = "tw-rty5"
title = "Sinkhole Fair: first tuning pass from the human's play-test (q5ff)"
kind = "feature"
state = "integrated"
created_at = "2026-10-04T21:14:47.321Z"
updated_at = "2026-10-04T21:26:51.251999Z"
created_by = "external:orchestrator"
watchers = ["external:orchestrator"]
branch = "bridle/sinkhole-tune"
commit = "219c0116565337076507d6be1414df71a52088a3"
summary = "Tuned Sinkhole Fair in rules.ts (spec and tests updated). (1) Solo round 60 s (classic stays 120 s; roundMs(mode)). (2) Tier counts 280,160,80,40,22,12,7,4 (was 160,100,60,...). (3) Classic: swallowed tier 1-3 objects regrow after 3 s at a free spot. (4) Runaway: level step 1.5 -> 1.8 (level 9 needs ~600 not ~170), eater gains 25% of a swallowed hole (was 50%), victim keeps 75% on respawn (was 50%), 2x object points for a hole under 40% of the leader, half for a level-9 hole over 2.5x the others' mean. (5) Speed bonus +70% at level 1 fading to 0 at level 9. Bots-only sim (5 bots, 12 seeds, 120 s, in rules.test.ts): before, leaders hit ~2000 at L9 while the worst sat at 0-10 (every bot but the top 3 stuck at L1); after, ~60% of small objects remain at midgame (70% of tier 1-3), leaders 1700-2650 vs worst 27-1113, average ratio under 10 (seed 5 worst: 1835/27, so still lopsided at times). Level thresholds are the main lever; tweak LEVEL_STEP, CATCHUP_*, LEADER_BRAKE_* if the next play-test still shows a snowball. No CHANGELOG exists in the repo."
+++

The human, 2026-10-04, via aide (m-0226), after play-testing Sinkhole Fair: "it needs some tuning, but you know, overall it works ... for a first prototype, it's pretty good." They asked for these as tuning; full words in ticket q5ff, section 'First play-test' (dev e9213c6). Five asks: (1) Solo round 1 minute instead of 2 ("very easy to consume everything in two minutes"); (2) more to eat at level 1; (3) bots strip the area: near one "Everything's gone, and you're just toast"; (4) runaway leader: "the first bot that gets to the next level ... basically just wins and eats everybody else and gets like 400 points and everybody else is at like 10"; (5) early movement too slow: "It feels like moving through mud ... speed up the movement at the earlier levels". Keep the rules in the pure rules module and their tests in step; update the spec. Report what you changed and the new numbers on the thread.

## Thread

### note · agent:sinkhole-tune · 2026-10-04T21:26:27.706Z
Tuned Sinkhole Fair in rules.ts (spec and tests updated). (1) Solo round 60 s (classic stays 120 s; roundMs(mode)). (2) Tier counts 280,160,80,40,22,12,7,4 (was 160,100,60,...). (3) Classic: swallowed tier 1-3 objects regrow after 3 s at a free spot. (4) Runaway: level step 1.5 -> 1.8 (level 9 needs ~600 not ~170), eater gains 25% of a swallowed hole (was 50%), victim keeps 75% on respawn (was 50%), 2x object points for a hole under 40% of the leader, half for a level-9 hole over 2.5x the others' mean. (5) Speed bonus +70% at level 1 fading to 0 at level 9. Bots-only sim (5 bots, 12 seeds, 120 s, in rules.test.ts): before, leaders hit ~2000 at L9 while the worst sat at 0-10 (every bot but the top 3 stuck at L1); after, ~60% of small objects remain at midgame (70% of tier 1-3), leaders 1700-2650 vs worst 27-1113, average ratio under 10 (seed 5 worst: 1835/27, so still lopsided at times). Level thresholds are the main lever; tweak LEVEL_STEP, CATCHUP_*, LEADER_BRAKE_* if the next play-test still shows a snowball. No CHANGELOG exists in the repo.

### note · agent:sinkhole-tune · 2026-10-04T21:26:29.882Z
done: Sinkhole Fair tuned (solo 60s, more food, classic regrowth, catch-up/brake, early speed); numbers on thread; e841b9b

### note · agent:manager · 2026-10-04T21:26:35.651Z
integrated: 219c0116565337076507d6be1414df71a52088a3 (branch bridle/sinkhole-tune)

### note · agent:manager · 2026-10-04T21:26:51.251Z
cleanup: removed agent sinkhole-tune, branch bridle/sinkhole-tune
