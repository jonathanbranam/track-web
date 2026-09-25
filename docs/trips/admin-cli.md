# Trips — admin CLI

Commands backing `client-trips` (`trips.branam.us`): trips, membership, days, and packing lists.
Run from the repo root as `npm run admin -- <subcommand>`. Global commands (users, tokens, invites) are in the [README](../../README.md#admin-cli).

```bash
npm run admin -- trips:list [--user-id <id>] [--json]
npm run admin -- trips:create "<name>" --user-id <id> [--destination "<dest>"] [--departure-notes "<notes>"] [--return-notes "<notes>"] [--nights <n>] [--full-days <n>] [--json]
npm run admin -- trips:set-current <tripId>
npm run admin -- trips:update <tripId> [--name "<name>"] [--destination "<dest>"] [--departure-notes "<notes>"] [--return-notes "<notes>"] [--nights <n>] [--full-days <n>] [--json]
npm run admin -- trips:delete <tripId>

# Membership management
npm run admin -- trips:members:list <tripId> [--json]
npm run admin -- trips:members:add <tripId> <userId>
npm run admin -- trips:members:remove <tripId> <userId>

# Day records
npm run admin -- trips:days:list <tripId> [--json]
npm run admin -- trips:days:update <tripId> <YYYY-MM-DD> [--title "<title>"] [--body "<markdown>"] [--weather "<weather>"] [--json]

# Packing list management
npm run admin -- trips:packing:list <tripId> [--json]
npm run admin -- trips:packing:add <tripId> --text "<text>" [--section "<section>"] [--position <n>] [--json]
npm run admin -- trips:packing:update <itemId> [--text "<text>"] [--section "<section>"] [--position <n>] [--user <userId>] [--json]
npm run admin -- trips:packing:bulk <tripId> --file <path> [--json]
npm run admin -- trips:packing:delete <itemId>

# Packing state (per-user checked state)
npm run admin -- trips:packing:state:get <tripId> <userId> [--json]
npm run admin -- trips:packing:state:set <tripId> <userId> <itemId> <true|false>
npm run admin -- trips:packing:summary <tripId> [--json]
```

`trips:set-current` marks the given trip as the current trip (clears any other current trip for that user). The trips app always fetches the current trip on load.

`trips:members:list` shows all members and their roles. Use `trips:members:add` to grant a user access to a trip; `trips:members:remove` to revoke it. The trip creator is automatically added as `owner` and cannot be removed via the CLI (use `trips:delete` to clean up instead).

`trips:days:update` sets the title, markdown body, or weather for one day of the trip.

`trips:packing:update` edits a single item in place. `--user <userId>` makes it a personal item for that user; `--user 0` makes it shared.

`trips:packing:bulk` replaces the entire packing list atomically from a JSON file. The file must contain a JSON array of `{ section, text, position }` objects. All previous items are deleted and new IDs are assigned.

`trips:packing:state:get` prints the item IDs the specified user has checked on that trip. `trips:packing:state:set` directly upserts a checked state row (useful for scripting or resetting state). `trips:packing:summary` shows per-member checked/total completion counts for the trip.
