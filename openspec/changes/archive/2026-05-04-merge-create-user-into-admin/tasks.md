## 1. Update admin.ts

- [x] 1.1 Add `import bcrypt from 'bcrypt'` to `scripts/admin.ts`
- [x] 1.2 Add `users:create` case: parse `<email> <password> [--name "<display name>"]`, reject duplicate email, insert with `bcrypt.hashSync`
- [x] 1.3 Add `users:update-password` case: parse `<email> <password>`, reject unknown email, update hash with `bcrypt.hashSync`
- [x] 1.4 Update `usage()` string to document both new subcommands

## 2. Remove create-user script

- [x] 2.1 Delete `scripts/create-user.ts`
- [x] 2.2 Remove the `"create-user"` entry from `package.json` scripts

## 3. Update specs

- [x] 3.1 Update `openspec/specs/user-auth/spec.md` to replace `create-user` CLI references with `admin` subcommand references (apply delta from `specs/user-auth/spec.md`)
