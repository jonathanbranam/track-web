## Why

`scripts/admin.ts` has grown to ~350 lines of hand-rolled argument parsing: every flag-accepting command repeats the same `indexOf` + `rest[idx + 1]` pattern, usage strings are maintained manually and can drift, and there is no automatic help generation. Adopting Commander.js eliminates this boilerplate and makes adding future subcommands significantly less error-prone.

## What Changes

- Add `commander` as a dev dependency
- Rewrite `scripts/admin.ts` to register each subcommand via Commander's `.command()` / `.requiredOption()` / `.option()` / `.action()` API
- Remove the manual `usage()` function and per-case `console.error('Usage: ...')` calls — help text is generated automatically
- Remove manual `argv.indexOf` flag parsing — replaced by Commander option declarations with built-in coercion (`parseInt` for numeric flags)
- The global `--json` flag becomes a program-level option rather than a stripped prefix

## Capabilities

### New Capabilities

_(none — this is a pure internal refactor with no new end-user behavior)_

### Modified Capabilities

_(none — no requirement-level behavior changes; existing subcommand names, flags, and output formats are preserved exactly)_

## Impact

- `scripts/admin.ts` — full rewrite (same subcommands, same flags, same output behavior)
- `package.json` — add `commander` to `devDependencies`
- No changes to `src/`, `client-*`, or any deployed artifact
