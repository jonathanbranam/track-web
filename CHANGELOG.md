# Changelog

## Unreleased

### Added

- Internal check script `scripts/bridle-check.sh` (tests and builds only the changed clients; games when none) and vitest globs for client-time, home, proto, me and admin (ticket tw-d4kv).
- Talks: a placeholder "New talk" entry in `client-talks` (`/talks/new-talk`, edit it in `client-talks/src/talks.ts`), and `client-talks` added to the trial scope (ticket tw-vhjj).
- Home directory: a Play card (`play.branam.us`, putt scorecard and card-game score tracker), visible to everyone, after Trips (ticket tw-t4wa).

### Internal

- Bridle trial stage 1: scope and specs rules and config now cover client-games, home, play, time, trips, proto and talks; `commands.check` is `scripts/bridle-check.sh` (ticket tw-jh8f).
