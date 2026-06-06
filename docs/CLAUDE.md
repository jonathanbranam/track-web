# docs/ Folder Structure

## Subfolders

### `app/`
Cross-app and shared infrastructure planning. Use for items that span multiple client apps or the backend/monorepo as a whole.

### `food/`
Planning and design docs for the food/dining tracking app.

### `life-mgmt/`
Design documents for the broader life and productivity management platform — the vision of a markdown-native, multi-interface system for weekly/daily planning, task management, habits, and long-term goal tracking. These docs describe a future direction that extends well beyond the current time-tracking app.

Key files:
- `product-brief.md` — founding vision and goals
- `product-specification.md` — full feature spec (MVP + future)
- `mvp-scope.md` — what's in/out of scope for MVP
- `system-architecture.md` — interaction methods and data store architecture
- `changelog-db-spec.md` — ChangelogDB infrastructure spec (Git-friendly SQLite with audit log)
- `open-questions.md` — high-level strategy open questions
- `open-questions-mvp.md` — MVP-specific open questions
- `README.md` — index of platform docs

### `openspec/`
Meta-specification templates and instructions for writing specs in the OpenSpec format used by this project.

### `trips/`
Design docs for the trips app — family trip planning with Days, Info, and Packing tabs.

Key files:
- `design.md` — full app design: data model, tab structure, implementation order, per-spec authoring guide

### `time/`
Planning and research docs for the time-tracking app (the primary current app).

Key files:
- `planning.md` — future work backlog
- `calendar-integration.md` — research on CalDAV/Google Calendar integration

### `watch/`
Planning docs for the watch app (movies/TV tracking).

### `play/`
Design and planning docs for the board game companion app (`play.branam.us`).

Key files:
- `design.md` — full app design: concept, player model, data model, feature areas, built-in game templates
- `planning.md` — future work backlog

### `games/`
Design and planning docs for the casual multiplayer digital games platform (`games.branam.us`).

Key files:
- `design.md` — full platform design: tech approach (React default + Phaser.js optional), game registration pattern, REST polling model, data model, candidate games
- `planning.md` — future work backlog
