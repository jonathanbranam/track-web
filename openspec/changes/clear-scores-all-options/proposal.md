## Why

The `scores:clear` admin CLI command requires `--mode` and `--level` to be specified individually, making it tedious to wipe all scores for a game when you want a full reset. Adding `--all-modes` and `--all-levels` flags lets an admin clear a full game's scores (or all levels within a mode) in a single command.

## What Changes

- Add `--all-modes` flag to `scores:clear`: when set, omits the `mode` filter so all modes are matched (mutually exclusive with `--mode`)
- Add `--all-levels` flag to `scores:clear`: when set, omits the `level` filter so all levels are matched (mutually exclusive with `--level`)
- `--game` remains required
- At least one of `--mode`/`--all-modes` and one of `--level`/`--all-levels` must be provided
- The `--confirm` flag continues to be required to execute the delete

## Capabilities

### New Capabilities

None — this is a pure enhancement to an existing CLI command with no new spec-level capability.

### Modified Capabilities

- `social-admin-cli`: The `scores:clear` command gains two new optional flags (`--all-modes`, `--all-levels`) that change its filtering behavior.

## Impact

- `scripts/admin.ts` — `scores:clear` command definition and action handler
- No API, database schema, or frontend changes
