## 1. Update scores:clear command

- [x] 1.1 Change `--mode` from `requiredOption` to `option` in `scripts/admin.ts`
- [x] 1.2 Change `--level` from `requiredOption` to `option` in `scripts/admin.ts`
- [x] 1.3 Add `--all-modes` boolean option to `scores:clear`
- [x] 1.4 Add `--all-levels` boolean option to `scores:clear`
- [x] 1.5 Add validation: exactly one of `--mode`/`--all-modes` must be provided; print error and exit non-zero if neither or both are given
- [x] 1.6 Add validation: exactly one of `--level`/`--all-levels` must be provided; print error and exit non-zero if neither or both are given
- [x] 1.7 Update the DELETE query to conditionally include `AND mode = ?` and `AND level = ?` only when specific values are given
- [x] 1.8 Update the dry-run warning message to say "all modes" / "all levels" when the corresponding `--all-*` flag is used

## 2. Verify and build

- [x] 2.1 Run `npx tsx scripts/admin.ts scores:clear --game balls-merge --all-modes --all-levels` (dry run) and confirm warning shows correct scope
- [x] 2.2 Run with `--confirm` and confirm rows are deleted and count is correct
- [x] 2.3 Confirm `--mode classic --level 1` still works as before
- [x] 2.4 Confirm missing mode/level flags print a clear error
- [x] 2.5 Confirm providing both `--mode` and `--all-modes` prints a mutual-exclusion error
- [x] 2.6 Run `npm run build:server` and confirm zero TypeScript errors
