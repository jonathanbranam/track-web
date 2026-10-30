+++
id = "tw-9epu"
title = "Trial stage 1, client-home: first test suite"
kind = "chore"
state = "claimed"
created_at = "2026-10-30T01:13:21.321Z"
updated_at = "2026-10-30T01:25:44.317050Z"
created_by = "agent:manager"
watchers = [
    "agent:manager",
    "external:aide",
    "agent:home-tests",
]
size = "S"
parent = "tw-fh2y"
+++

Task C of tw-fh2y. The human, 2026-10-30 via aide (m-0494), verbatim: "go ahead with the other work to onboard more clients from track-web to bridle." Add the smallest useful vitest coverage of client-home's existing behaviour (for example the DirectoryPage APPS list and the user-1-only Admin/Proto cards). No feature changes. client-home has no tests yet, so add its test dir to the include list in vitest.config.mts. Stay inside client-home/ and that config; packages/ui and packages/auth stay out (stop and ask). Check: scripts/bridle-check.sh. Blocked by tw-jh8f (scope). Model: haiku.
