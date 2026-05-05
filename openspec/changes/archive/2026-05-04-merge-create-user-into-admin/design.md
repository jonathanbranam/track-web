## Context

`admin.ts` is a synchronous, switch-based CLI with a `users:` subcommand namespace. `create-user.ts` is a standalone async script with its own arg-parsing logic. Both import `getDb()` and operate directly on SQLite. The goal is to absorb `create-user.ts`'s two operations into `admin.ts` as first-class subcommands.

## Goals / Non-Goals

**Goals:**
- Add `users:create` and `users:update-password` subcommands to `admin.ts`
- Delete `create-user.ts` and its npm script
- Consistent CLI style: subcommand follows the `users:<verb>` pattern already in use

**Non-Goals:**
- Changing behavior of existing subcommands
- Adding interactive prompts or validation beyond what `create-user.ts` already does

## Decisions

**Keep `main()` synchronous using `bcrypt.hashSync`**

`admin.ts` uses a synchronous `main()`. Rather than converting the entire switch statement to async/await, use `bcrypt.hashSync(password, 12)` — already available in the `bcrypt` package. The performance cost of synchronous hashing is acceptable for an admin CLI (single operation, not a server).

**Subcommand names**

- `users:create <email> <password> [--name "<display name>"]` — mirrors the positional + flag style of `create-user.ts`
- `users:update-password <email> <password>` — replaces `create-user.ts --update`; explicit name is clearer than a flag

**Arg parsing style**

Follow the existing `admin.ts` pattern: destructure `rest` positionally, parse named flags by index. Do not import a flag-parsing library.

## Risks / Trade-offs

- `bcrypt.hashSync` blocks the event loop → acceptable; admin CLI is single-operation, not a server
- Callers using `npm run create-user` will get a "missing script" error → breaking change, documented in proposal

## Migration Plan

1. Add the two new cases to `admin.ts`
2. Update the `usage()` string
3. Delete `scripts/create-user.ts`
4. Remove the `create-user` entry from `package.json` scripts
5. No data migration needed
