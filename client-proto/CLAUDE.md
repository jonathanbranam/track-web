# client-proto

This app is a prototype viewer. It has strict authoring rules that must be followed at all times.

## Rules for prototype files

**Prototypes are write-once.** They must never be refactored to accommodate changes elsewhere in the codebase. If `@packages/ui`, `@packages/auth`, or any other shared package changes, prototype files must not be updated to match.

**Each prototype is self-contained.** A prototype file at `src/prototypes/<name>/index.tsx` may only import from:
- `react` and `react-dom`
- `react-router-dom`
- Browser-native APIs
- Tailwind CSS classes (via className)

**Never import from `@packages/*`** — not `@repo/auth`, `@repo/ui`, or anything else from the workspace packages.

**Never import across prototype boundaries.** A prototype must not import from another prototype's directory.

**Never import from `src/` paths outside the prototype's own folder.** The only shared files a prototype may use are `react-router-dom` for navigation (e.g., `useNavigate`) and Tailwind CSS classes.

## Adding a prototype

1. Create `src/prototypes/<name>/index.tsx` — a single default-exported React component.
2. Add an entry to `src/registry.ts`:
   ```ts
   { name: '<name>', label: '<Human Label>', Component: YourComponent }
   ```

## Archiving a prototype

1. Remove its entry from `src/registry.ts`.
2. Delete its directory: `src/prototypes/<name>/`.

No other files need to change.
