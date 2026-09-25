# Me (social) — admin CLI

Social-graph commands backing `client-me` (`me.branam.us`): connections, invite codes, and groups.
Run from the repo root as `npm run admin -- <subcommand>`. Global commands (users, tokens, invites) are in the [README](../../README.md#admin-cli).

## Connections

```bash
npm run admin -- connections:create <userIdA> <userIdB>
npm run admin -- connections:delete <userIdA> <userIdB>
npm run admin -- connections:list <userId>
```

## Invite codes (social)

```bash
npm run admin -- codes:create <userId>   # creates a 7-day invite code
```

## Groups

```bash
npm run admin -- groups:create --name "<name>" [--description "<desc>"] [--members 1,2,3] [--creator <userId>]
npm run admin -- groups:list
npm run admin -- groups:list-members <groupId>
npm run admin -- groups:add-member <groupId> <userId>
npm run admin -- groups:remove-member <groupId> <userId>
npm run admin -- groups:delete <groupId>
```
