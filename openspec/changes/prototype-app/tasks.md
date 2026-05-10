## 1. Scaffold client-proto app

- [x] 1.1 Create `client-proto/` directory with `package.json` (name, scripts, dependencies matching the other client apps)
- [x] 1.2 Create `client-proto/vite.config.ts` with the same port/plugin setup as `client-time`
- [x] 1.3 Create `client-proto/index.html` entry point
- [x] 1.4 Create `client-proto/src/main.tsx` React 19 entry point with `ReactDOM.createRoot`
- [x] 1.5 Create `client-proto/src/App.tsx` with React Router setup (picker at `/`, prototype routes at `/proto/:name/*`)
- [x] 1.6 Create `client-proto/tsconfig.json` and `client-proto/tsconfig.node.json`
- [x] 1.7 Install dependencies (`npm install` in `client-proto/`)

## 2. Prototype registry and picker

- [x] 2.1 Create `client-proto/src/registry.ts` with typed `PrototypeEntry` array (name, label, component)
- [x] 2.2 Create `client-proto/src/pages/PickerScreen.tsx` — full-viewport list of registered prototypes as tappable rows with mobile-safe padding
- [x] 2.3 Add empty-state message to picker when registry has no entries
- [x] 2.4 Wire picker route at `/` in `App.tsx`; add redirect to `/` for unrecognised paths

## 3. Prototype routing

- [x] 3.1 Create `client-proto/src/pages/ProtoShell.tsx` that looks up the registry by `name` param and renders the prototype component
- [x] 3.2 Wire `/proto/:name/*` route in `App.tsx` to `ProtoShell`
- [x] 3.3 Verify browser back from a prototype returns to the picker (history push, not replace)

## 4. First example prototype

- [x] 4.1 Create `client-proto/src/prototypes/example/index.tsx` — a minimal placeholder screen that demonstrates the self-contained pattern (no `@packages/` imports)
- [x] 4.2 Register the example prototype in `src/registry.ts`

## 5. CLAUDE.md authoring rules

- [x] 5.1 Create `client-proto/CLAUDE.md` documenting: no `@packages/*` imports in prototype files; no imports outside the prototype's own directory; no shared components between prototypes; prototypes are write-once and must not be refactored for external changes; archiving = remove registry entry + delete `src/prototypes/<name>/` folder

## 6. Deploy configuration

- [x] 6.1 Add `client-proto` build step to `server-deploy.sh`
- [x] 6.2 Add `client-proto` static file root and SPA fallback to `Caddyfile` (production, `proto.` subdomain)
- [x] 6.3 Add `client-proto` dev server proxy to `Caddyfile.local`
- [x] 6.4 Add `client-proto` dev server pane to `dev-local.sh`
- [x] 6.5 Add `build:proto` script to root `package.json` consistent with `build:time`, `build:watch`, etc.

## 7. Verify

- [x] 7.1 Run `npm run build:proto` (or equivalent) and confirm zero TypeScript errors
- [ ] 7.2 Start the dev server and confirm the picker screen loads on the proto subdomain/port
- [ ] 7.3 Tap the example prototype and confirm it renders at `/proto/example/`
- [ ] 7.4 Confirm browser back returns to the picker
- [ ] 7.5 Confirm the proto URL loads without a session cookie (no auth redirect)
