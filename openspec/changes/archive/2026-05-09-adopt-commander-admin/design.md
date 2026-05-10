## Context

`scripts/admin.ts` is a ~350-line monolithic `main()` function with a bare `switch` on `process.argv`. Every flag-accepting subcommand manually calls `rest.indexOf('--flag')` and reads `rest[idx + 1]`, a pattern repeated 15+ times. Usage strings are maintained by hand and can silently diverge from the actual flags. There is no automatic `--help`. The script is invoked via `npm run admin -- <subcommand> [args]` and is never shipped as a deployed artifact.

## Goals / Non-Goals

**Goals:**
- Replace manual argv parsing with Commander.js declarations
- Generate `--help` output automatically for each subcommand
- Eliminate repeated `indexOf` boilerplate
- Preserve all existing subcommand names, flags, and output behavior exactly

**Non-Goals:**
- Splitting `admin.ts` into multiple files (stay single file for now)
- Adding new subcommands or flags
- Changing any database logic inside the command handlers
- Adding tests (behavior is unchanged; verified by reading output)

## Decisions

### Commander.js over alternatives

Commander is chosen over Yargs, Clipanion, and Cleye for three reasons: it is the most widely adopted Node CLI library (familiar to any future contributor), its TypeScript types are first-class, and its fluent `.command().option().action()` API maps directly onto the existing `namespace:action` subcommand naming pattern without any structural reorganization.

Yargs is equally viable but its builder pattern is more verbose for this use case. Clipanion and Cleye are smaller ecosystems with less community familiarity.

### Keep single file

The script stays in `scripts/admin.ts`. Splitting by domain (users, groups, movies, etc.) would add indirection and import complexity with no immediate benefit. The single-file constraint can be revisited if the script grows significantly beyond current scope.

### `namespace:action` as flat Commander commands

Commander supports subcommand nesting, but the existing colon-separated names (`users:list`, `groups:create`, etc.) work cleanly as flat `.command('users:list')` registrations. This preserves the existing invocation interface and avoids any behavioral change to the `npm run admin -- users:list` call signature.

### Global `--json` as program-level option

The existing `--json` stripping (done before the switch) maps naturally to `program.option('--json', ...)` inherited by all subcommands via `program.opts().json`. No per-command changes needed.

### Numeric coercion via Commander's `parseArg`

Commander's `.option('--runtime <minutes>', '', parseInt)` replaces manual `parseInt(rest[idx + 1], 10)`. This is the idiomatic Commander approach and produces the same result.

## Risks / Trade-offs

- **Commander version API differences** → Pin to Commander 12.x (current major); the `.command()` / `.option()` / `.action()` API is stable across 11–12.
- **`--json` placement change** → Previously `--json` could appear anywhere in argv; as a program-level option it must appear before or after the subcommand but not after a subcommand's positional arguments. This is standard Commander behavior and acceptable given the internal-tool nature of this script.
- **Exit code behavior** → Commander calls `process.exit(1)` on unknown commands or missing required options. The existing script also calls `process.exit(1)` in these cases. Behavior is preserved.

## Migration Plan

1. Install `commander` as a dev dependency
2. Rewrite `scripts/admin.ts` in place — same file, same subcommands, no behavior changes
3. Smoke-test `npm run admin -- --help` and two or three representative subcommands against the existing database
4. No rollback strategy needed — the script is not a deployed artifact; git revert covers any regression
