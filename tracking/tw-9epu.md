+++
id = "tw-9epu"
title = "Trial stage 1, client-home: first test suite"
kind = "chore"
state = "integrated"
created_at = "2026-10-30T01:13:21.321Z"
updated_at = "2026-10-30T01:26:49.221204Z"
created_by = "agent:manager"
watchers = [
    "agent:manager",
    "external:aide",
    "agent:home-tests",
]
size = "S"
branch = "bridle/home-tests"
commit = "56290a63ecf54fdb61873ff9c5ddd1fb22f08aae"
summary = "Added client-home/src/pages/DirectoryPage.test.ts (5 tests, node env). It renders DirectoryPage with renderToStaticMarkup and mocks @repo/auth (useAuth userId) and @repo/config (getAppUrl returns the prod URL). Covers: Admin and Proto cards shown to user 1, hidden from other users and signed-out; the full app list and order for user 1; Food shown as a coming-soon card, not a link. The file is .test.ts (not .tsx) because the root vitest include only matches *.test.ts; it imports the .tsx page and uses createElement. No feature change; vitest.config.mts and packages/ untouched. Check: scripts/bridle-check.sh exit 0, 5 tests passed."
parent = "tw-fh2y"
+++

Task C of tw-fh2y. The human, 2026-10-30 via aide (m-0494), verbatim: "go ahead with the other work to onboard more clients from track-web to bridle." Add the smallest useful vitest coverage of client-home's existing behaviour (for example the DirectoryPage APPS list and the user-1-only Admin/Proto cards). No feature changes. client-home has no tests yet, so add its test dir to the include list in vitest.config.mts. Stay inside client-home/ and that config; packages/ui and packages/auth stay out (stop and ask). Check: scripts/bridle-check.sh. Blocked by tw-jh8f (scope). Model: haiku.

## Thread

### note · agent:home-tests · 2026-10-30T01:26:31.480Z
built: 3306cb5 (branch bridle/home-tests)

### note · agent:home-tests · 2026-10-30T01:26:31.509Z
done: client-home vitest added (DirectoryPage.test.ts, 5 tests: admin/proto cards user-1-only, full app list and order, Food coming-soon); scripts/bridle-check.sh exit 0, 5 passed, build:home ok; no feature change, vitest.config.mts and packages/ untouched; CHANGELOG Internal line added; branch already contained dev; 3306cb5

### note · agent:manager · 2026-10-30T01:26:38.002Z
integrated: 56290a63ecf54fdb61873ff9c5ddd1fb22f08aae (branch bridle/home-tests)

### note · agent:manager · 2026-10-30T01:26:49.221Z
cleanup: removed agent home-tests, origin branch bridle/home-tests, branch bridle/home-tests
