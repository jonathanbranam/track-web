## Context

`scripts/admin.ts` exposes a `scores:clear` command that currently requires `--game`, `--mode`, and `--level` as `requiredOption` flags, plus a `--confirm` guard. Clearing scores across all modes or all levels requires running the command multiple times — once per mode/level combination. This is inconvenient for a full game reset.

## Goals / Non-Goals

**Goals:**
- Add `--all-modes` flag: when present, removes the mode filter from the DELETE query
- Add `--all-levels` flag: when present, removes the level filter from the DELETE query
- Improve the confirmation warning message to reflect the actual scope of deletion

**Non-Goals:**
- Adding `--all-games` (too destructive, not needed)
- Changing `scores:list` filtering behavior
- Any database schema or API changes

## Decisions

**Make `--mode`/`--all-modes` and `--level`/`--all-levels` mutually exclusive pairs**

Replace `requiredOption` for `--mode` and `--level` with `.option()`, then validate in the action handler that exactly one of each pair is provided. Commander.js doesn't have built-in XOR option support, so manual validation with a clear error message is the right approach.

**Keep `--game` as `requiredOption`**

Game slug is always required — deleting scores across all games would be too broad and isn't a needed use case.

**Update the warning message dynamically**

The dry-run warning currently interpolates `mode` and `level` literally. With the new flags, it should say `"all modes"` / `"all levels"` as appropriate so the user knows the true scope before confirming.

## Risks / Trade-offs

- [Broader deletes] `--all-modes --all-levels` deletes everything for a game — intentionally destructive. Mitigated by the existing `--confirm` guard.
- [No undo] SQLite has no soft delete; deletes are permanent. Mitigated by dry-run default behavior.
