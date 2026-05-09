## 1. Dependency

- [ ] 1.1 Add `commander` to `devDependencies` in `package.json` and run `npm install`

## 2. Rewrite admin.ts

- [ ] 2.1 Replace the `usage()` function and manual `argv.slice(2)` setup with a `new Command()` program declaration and `program.option('--json', 'Output as JSON')`
- [ ] 2.2 Rewrite `users:list`, `users:create`, `users:delete`, `users:update-password`, `users:set-name` as `.command()` registrations with `.option()` / `.argument()` / `.action()`
- [ ] 2.3 Rewrite `connections:create`, `connections:delete`, `connections:list` as `.command()` registrations
- [ ] 2.4 Rewrite `codes:create` as a `.command()` registration
- [ ] 2.5 Rewrite `groups:create`, `groups:list`, `groups:list-members`, `groups:add-member`, `groups:remove-member`, `groups:delete` as `.command()` registrations
- [ ] 2.6 Rewrite `movies:create`, `movies:list` as `.command()` registrations
- [ ] 2.7 Rewrite `tv:create`, `tv:list` as `.command()` registrations
- [ ] 2.8 Replace all manual `parseInt(rest[idx + 1], 10)` coercions with Commander's `parseArg` / third-argument coercion on `.option()`
- [ ] 2.9 Call `program.parse()` at the end of the file

## 3. Verify

- [ ] 3.1 Run `npm run admin -- --help` and confirm all subcommands are listed
- [ ] 3.2 Run `npm run admin -- users:list` and `npm run admin -- users:list --json` against the local DB and confirm output matches pre-refactor behavior
- [ ] 3.3 Run `npm run build:server` and confirm zero TypeScript errors
