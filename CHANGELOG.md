# Changelog

## Unreleased

### Added

- Internal check script `scripts/bridle-check.sh` (tests and builds only the changed clients; games when none) and vitest globs for client-time, home, proto, me and admin (ticket tw-d4kv).
- Talks: `client-talks` added to the trial scope (ticket tw-vhjj). The placeholder "New talk" entry it first added was removed again (ticket tw-wpam).
- Home directory: a Play card (`play.branam.us`, putt scorecard and card-game score tracker), visible to everyone, after Trips (ticket tw-t4wa).

### Changed

- Talks: removed the placeholder "New talk" entry (`/talks/new-talk`) from `client-talks/src/talks.ts`; the RAFT SDK talk is on hold (ticket tw-wpam).

### Internal

- Play: vitest coverage for the putt scorecard's score map and per-nine totals (`holesTotal`, exported from `PuttPage.tsx`) (ticket tw-jgug).
- Home: vitest coverage for the directory's app list and the user-1-only Admin and Proto cards (ticket tw-9epu).
- Bridle trial stage 1: scope and specs rules and config now cover client-games, home, play, time, trips, proto and talks; `commands.check` is `scripts/bridle-check.sh` (ticket tw-jh8f).
