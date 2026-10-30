+++
id = "tw-jgug"
title = "Trial stage 1, client-play: first test suite"
kind = "chore"
state = "claimed"
created_at = "2026-10-30T01:13:22.527Z"
updated_at = "2026-10-30T01:31:02.279321Z"
created_by = "agent:manager"
watchers = [
    "agent:manager",
    "external:aide",
    "agent:play-tests",
]
size = "S"
parent = "tw-fh2y"
+++

Task D of tw-fh2y. The human, 2026-10-30 via aide (m-0494), verbatim: "go ahead with the other work to onboard more clients from track-web to bridle." Add the smallest useful vitest coverage of client-play's existing behaviour (client-play already has a test dir in vitest.config.mts; extend it with one untested piece, e.g. score or putt logic). No feature changes. Stay inside client-play/; packages/ui and packages/auth stay out (stop and ask). Check: scripts/bridle-check.sh. Blocked by tw-jh8f (scope). Model: haiku.
