## 1. Backend allowlist

- [ ] 1.1 Add `backup: 'export-push.log'` to the `LOGS` allowlist in `src/routes/admin/logs.ts`

## 2. Front-end log viewer

- [ ] 2.1 Add `backup` to the `LOG_KEYS` array in `client-admin/src/pages/LogsPage.tsx` so it renders as a selectable tab

## 3. Tests

- [ ] 3.1 Extend `src/routes/admin/admin.test.ts`: assert `GET /api/admin/logs` lists the `backup` key, that `GET /api/admin/logs/backup` tails `logs/export-push.log`, and that a missing file returns empty content

## 4. Spec sync & verification

- [ ] 4.1 Run `npm test` and `npm run build` — confirm green
- [ ] 4.2 Sync the `admin-logs` delta into `openspec/specs/admin-logs/spec.md`
