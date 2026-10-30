+++
id = "tw-7eb6"
title = "Trial stage 1, client-proto: first test suite"
kind = "chore"
state = "claimed"
created_at = "2026-10-30T01:13:25.060Z"
updated_at = "2026-10-30T01:36:29.784597Z"
created_by = "agent:manager"
watchers = [
    "agent:manager",
    "external:aide",
    "agent:proto-tests",
]
size = "S"
parent = "tw-fh2y"
+++

Task G of tw-fh2y. The human, 2026-10-30 via aide (m-0494), verbatim: "go ahead with the other work to onboard more clients from track-web to bridle." Add the smallest useful vitest coverage of client-proto's existing behaviour. client-proto has no tests yet, so add its test dir to the include list in vitest.config.mts. No feature changes. Stay inside client-proto/ and that config; packages/ui and packages/auth stay out (stop and ask). Check: scripts/bridle-check.sh. Blocked by tw-jh8f (scope). Model: haiku.
