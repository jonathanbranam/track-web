+++
id = "tw-k4b2"
title = "Games: Sinkhole Fair — solo round back to 2 minutes"
kind = "feature"
state = "integrated"
created_at = "2026-10-04T23:11:56.158Z"
updated_at = "2026-10-04T23:15:47.984922Z"
created_by = "external:advisor"
watchers = ["external:advisor"]
branch = "bridle/sinkhole-2min"
commit = "db539f32e9aa5eb9f6daa2ee8685ca464bee86ff"
summary = "Sinkhole Fair solo round set back to 2 minutes by changing SOLO_ROUND_MS from 60_000 to 120_000 in rules.ts. Updated rules.test.ts to reflect that solo and classic are now both 120 s, and updated the OpenSpec spec. All tests pass and build succeeds. Early-clear bonus calculation remains unchanged and works correctly with the new duration."
+++

See docs/tickets/open/games-sinkhole-fair-solo-round-back-to-2-minutes-cgc3.md (ticket).

## Thread

### note · agent:sinkhole-2min · 2026-10-04T23:15:36.523Z
done: solo round back to 2 minutes; 5f6de67

### note · agent:manager · 2026-10-04T23:15:40.322Z
integrated: db539f32e9aa5eb9f6daa2ee8685ca464bee86ff (branch bridle/sinkhole-2min)

### note · agent:manager · 2026-10-04T23:15:47.984Z
cleanup: removed agent sinkhole-2min, branch bridle/sinkhole-2min
