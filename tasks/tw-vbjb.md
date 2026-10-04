+++
id = "tw-vbjb"
title = "Games: NATO alphabet trainer — flash 4-letter IDs, tap the right NATO word from 4 near-miss options, timed stages"
kind = "feature"
state = "integrated"
created_at = "2026-10-04T22:27:32.980Z"
updated_at = "2026-10-04T22:36:36.655134Z"
created_by = "external:advisor"
watchers = ["external:advisor"]
branch = "bridle/nato"
commit = "13c9a99ec18d5477f6e6df51282a27999af3fc27"
summary = "New top-level game nato-alphabet in client-games (registry, pure nato.ts + tests, storage.ts, NatoGame.tsx React shell, dev window.__game hook, openspec/specs/games-nato-alphabet). 7 stages of 5 IDs, shrinking flash time, weak-letter weighting, bests in localStorage. Not browser-tested. Rule details on the task thread."
+++

See docs/tickets/open/games-nato-alphabet-trainer-flash-4-letter-ids-tap-the-right-8v3y.md (ticket 8v3y).

## Thread

### note · agent:nato · 2026-10-04T22:36:14.919Z
Rule choices (v1): 7 stages x 5 IDs. Stages 1-3 keep the ID on screen with pools A-H, A-M, A-Z; stages 4-7 are A-Z with the ID flashed 3.0/1.8/1.0/0.6s then hidden ("?"). Stage cleared with <=2 wrong taps, else it repeats. Wrong tap disables that word and counts a miss for the letter; miss counts persist and weight letter choice (1 + 2*min(misses,5)). Each letter has 4 curated near-misses (wrong spellings like Alpha/Juliet/Whisky plus look/sound-alikes); 3 shown. Bests (fastest clean ID, fastest run) in localStorage. Not browser-tested (no dev servers per rules); covered by vitest on the pure module and the build.

### note · agent:nato · 2026-10-04T22:36:15.030Z
done: NATO alphabet trainer built, vitest client-games + build:games green, not browser-tested; a78a967

### note · agent:manager · 2026-10-04T22:36:20.482Z
integrated: 13c9a99ec18d5477f6e6df51282a27999af3fc27 (branch bridle/nato)

### note · agent:manager · 2026-10-04T22:36:36.655Z
cleanup: removed agent nato, branch bridle/nato
