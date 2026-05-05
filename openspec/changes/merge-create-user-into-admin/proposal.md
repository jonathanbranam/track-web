## Why

The `create-user` script is a standalone entry point that duplicates the `users:` namespace already established in `admin.ts`. Consolidating it eliminates a redundant npm script and makes `admin` the single place for all user management operations.

## What Changes

- Add `users:create <email> <password> [--name "<display name>"]` subcommand to `admin.ts`
- Add `users:update-password <email> <password>` subcommand to `admin.ts`
- **BREAKING**: Remove `scripts/create-user.ts`
- **BREAKING**: Remove `create-user` npm script from `package.json`

## Capabilities

### New Capabilities

_(none — this is a refactor; no new spec-level capabilities are introduced)_

### Modified Capabilities

_(none — the admin CLI gains subcommands but no existing spec requirements change)_

## Impact

- `scripts/admin.ts` — gains two new subcommands; requires `bcrypt` import (async, so `main` becomes async)
- `scripts/create-user.ts` — deleted
- `package.json` — `create-user` script removed
