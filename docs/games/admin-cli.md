# Games — admin CLI

Commands backing `client-games` (`games.branam.us`): leaderboard scores and Dungeon Tactics content.
Run from the repo root as `npm run admin -- <subcommand>`. Global commands (users, tokens, invites) are in the [README](../../README.md#admin-cli).

## Game scores

```bash
npm run admin -- scores:list [--game <slug>] [--mode <mode>] [--level <level>] [--json]
npm run admin -- scores:clear --game <slug> --mode <mode> --level <level> --confirm
```

## Dungeon Tactics content

Serialized board content (Region → Map → Encounter). Reads are `--json`-friendly;
`content:seed` inserts the bundled default content only when the store is empty.
Map writes validate the body against the shared map schema (and the region's
terrain enum) before persisting; deleting the last map in a region is rejected.

```bash
npm run admin -- content:list-regions [--json]
npm run admin -- content:show-map <mapId> [--json]
npm run admin -- content:show-encounter <mapId> <encounterId> [--json]
npm run admin -- content:seed
npm run admin -- content:create-map <regionId> --file <path> [--json]
npm run admin -- content:update-map <mapId> --file <path> [--json]
npm run admin -- content:delete-map <mapId>
```
