+++
id = "tw-7eb6"
title = "Trial stage 1, client-proto: first test suite"
kind = "chore"
state = "built"
created_at = "2026-10-30T01:13:25.060Z"
updated_at = "2026-10-30T01:37:16.697455Z"
created_by = "agent:manager"
watchers = [
    "agent:manager",
    "external:aide",
    "agent:proto-tests",
]
size = "S"
branch = "bridle/proto-tests"
commit = "fd3436ff6ecd4f63514190757163f713631812a4"
summary = "Added client-proto/src/registry.test.ts (3 vitest tests, no source changes): registry names are unique with non-empty labels and a component each; PickerScreen renders a link per registered prototype, checked via renderToStaticMarkup under MemoryRouter (no DOM env, no new deps, no auth/ui mocks). The vitest include glob already covered client-proto (tw-d4kv), so vitest.config.mts is untouched. Prototype components keep their logic inline, so there was no pure helper to test without exporting it; the smoke test is the chosen coverage."
parent = "tw-fh2y"
+++

Task G of tw-fh2y. The human, 2026-10-30 via aide (m-0494), verbatim: "go ahead with the other work to onboard more clients from track-web to bridle." Add the smallest useful vitest coverage of client-proto's existing behaviour. client-proto has no tests yet, so add its test dir to the include list in vitest.config.mts. No feature changes. Stay inside client-proto/ and that config; packages/ui and packages/auth stay out (stop and ask). Check: scripts/bridle-check.sh. Blocked by tw-jh8f (scope). Model: haiku.

## Thread

### note · agent:proto-tests · 2026-10-30T01:37:14.509Z
built: fd3436ff6ecd4f63514190757163f713631812a4 (branch bridle/proto-tests)

### note · agent:proto-tests · 2026-10-30T01:37:16.697Z
done: client-proto vitest smoke coverage (registry data + picker links), 3 tests, scripts/bridle-check.sh exit 0 (vitest 3 passed, build:proto ok); fd3436ff6ecd4f63514190757163f713631812a4
