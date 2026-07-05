## Context

`client-talks`' `engineering-with-ai` talk (`kind: 'rpg'`) is driven entirely by one hardcoded action list: `client-talks/src/talk-rpg/script.ts` exports both the shared engine types/constants (`Action`, `GameMap`, `MAP`, `MAPS`, `TILE_TYPES`, `loadMap`, the `TOWN_MAP`/`OVERWORLD_MAP`/`CAVE_MAP`/`BATTLE_MAP` map data) **and** the single authored `SCRIPT: Action[]`. `Director.tsx`'s `DirectorProvider` imports `SCRIPT`/`MAP`/`MAPS` directly and is the only place that constructs the precompute pass — there is currently no way to run a different action list without editing `script.ts` itself.

`TalkPage.tsx` renders `<RpgExperience />` unconditionally for `kind: 'rpg'` talks; `RpgExperience` takes no props today.

As the talk grows, developing any one beat means working inside (or scrubbing through) the entire growing script. This change lets multiple, independently-authored named scripts exist side by side, with a select screen to pick one during development.

## Goals / Non-Goals

**Goals:**
- Support any number of named scripts, each a plain `Action[]`, stored under `client-talks/src/talk-rpg` — either inline in one file or split one-per-file under a subfolder — and authored in TypeScript or plain JSON.
- Every TS-authored script imports its shared types/constants (`Action`, `GameMap`, `MAPS`, map ids, etc.) from the existing `script.ts` rather than redefining them; `script.ts` keeps that role but no longer also owns "the" script.
- Show an interstitial select screen when `/talks/engineering-with-ai` loads with no script chosen yet, listing every registered script by name.
- Selecting a script loads it into the existing `RpgExperience`/`Director` playback, and the URL changes to reflect the selection (via the router, not a hard `window.location.href` assignment — see Decisions) so the browser Back button, and an in-experience control, both return to the select screen.

**Non-Goals:**
- No change to the `Action` vocabulary, precompute pass, or presenter controls (`talk-director`, `talk-rpg-experience` capabilities) — this only changes *which* `Action[]` gets run.
- No runtime schema validation of JSON-authored scripts beyond what already exists (`applyAction`'s per-action no-ops on bad references) — see Risks.
- No decision here on which/how many scripts get authored initially, beyond the one resolved in Open Questions below.

## Decisions

**1. `script.ts` keeps the shared contract; scripts move to a new `scripts/` library.**
`script.ts` continues to export `Action` and its member interfaces, `GameMap`, `loadMap`, `TILE_TYPES`/`tileColor`, `BATTLE_SCENE_ID`/`BATTLE_MAP`, and the map registry (`MAPS`, `TOWN_MAP`, etc.) — everything that's genuinely shared engine data. Its `SCRIPT` export is removed; the current content becomes the first registered script (unchanged, renamed `"Test Script"` per Open Questions below — the script used for evaluating engine capabilities, not the talk's real content) under the new library, satisfying "each script imports from `script.ts`" by construction rather than convention.

*Alternative considered:* keep `script.ts` as one of several files that each also redefine or re-export types. Rejected — the proposal explicitly calls for one shared source of types/constants; duplicating them per script is exactly what this change is meant to avoid.

**2. A single registry file, `scripts/index.ts`, exports `SCRIPTS: NamedScript[]`; individual scripts may live inline there or in sibling files under `scripts/`.**
```ts
export interface NamedScript {
  id: string             // kebab-case; used as the URL segment (e.g. 'test-script')
  name: string           // display label in the select screen (e.g. 'Test Script')
  actions: Action[]
  initialSceneId: string
}
```
`id` and `name` are split because a display name like `"Test Script"` isn't a clean URL segment — the existing talk-slug convention (`engineering-with-ai`) is kebab-case, and this keeps script URLs consistent with it.

This directly matches "all scripts can be in the same file or a subfolder": an author can add a new script by writing a `const` array inline in `index.ts`, or by creating `scripts/some-beat.ts` (or `.json`) and importing it — both are valid, and the registry is the one place that lists what's available (order = display order in the picker).

*Alternative considered:* auto-discover scripts via `import.meta.glob('./scripts/*.{ts,json}', { eager: true })` and derive names from filenames. Rejected for now — it forces one-file-per-script (contradicting "same file" flexibility), and filename-derived names are a worse authoring surface than an explicit `name` field. Can revisit if the manual registry becomes tedious.

**3. JSON-authored scripts are imported as plain data and cast to `Action[]`; no new runtime validator.**
Vite/TS already support `import data from './scripts/foo.json'` out of the box. A JSON script is just `actions: fooJson as Action[]` in the registry. This gets JSON scripts working with zero new infrastructure, at the cost of losing compile-time checking against the `Action` union (TS-authored scripts get that for free via the shared import; JSON ones don't) — an accepted trade-off, see Risks.

**4. Script selection lives in the URL as an optional route segment (`/talks/:slug/:script?`), driven by React Router, not a manual `window.location.href` assignment.**
`App.tsx` adds the optional `:script` segment; `TalkPage.tsx` resolves it against `SCRIPTS` by `id`. Selecting a script in the new `ScriptSelectPage` calls `navigate(...)` (a `Link`/`useNavigate` push), and the in-experience "back to scripts" control does the same in reverse. This satisfies the proposal's intent — the selection is reflected in `window.location.href` and the browser Back button returns to the picker — without the full page reload (and Phaser game teardown/rebuild) a literal `window.location.href = ...` assignment would cause.

*Alternative considered:* a query string (`?script=name`) instead of a path segment. Rejected — a path segment reads better as "this is a distinct screen" and matches the existing `/talks/:slug` convention already used for talk selection.

**5. `DirectorProvider` and `RpgExperience` take the script as props instead of importing `SCRIPT`/`MAP` directly.**
```ts
DirectorProvider({ script, initialSceneId, children })
RpgExperience({ namedScript })  // passes script.actions / script.initialSceneId through
```
This is the **BREAKING** change flagged in the proposal — today `DirectorProvider` has no props. It's the only way to make the precompute pass run against a *chosen* script rather than a hardcoded one. `Director.tsx` is otherwise unchanged (still constructs `DirectorEngine` via `useMemo` and `runPrecompute`, still imports the shared `MAPS` registry from `script.ts` — only the actions/initial-scene-id source changes from a fixed import to props).

**6. The in-experience "back to scripts" control follows the existing DOM-over-canvas input pattern — no new Phaser input work.**
Per `kb/phaser-mobile-input.md`, `PhaserStage`'s Phaser game config already sets `input: { windowEvents: false }` (Fix 2), which is what makes the existing `Overlay.tsx` DOM buttons (Restart/Back/Pause/Next/Skip/Expand/Full Screen) work correctly on iOS. The new control is one more plain DOM button/link in that same overlay layer — it needs no `stopPropagation` or scene-level input handling, since it sits over the canvas and the browser dispatches the tap to it, not to the canvas's own `pointerdown` listener (Fix 1, unaffected). The select screen itself (`ScriptSelectPage`) renders no Phaser canvas at all, so ordinary `onClick`/`Link` behavior works there without any special-casing.

**7. Testing:** add `scripts/index.test.ts` (vitest, matching the existing `directorEngine.test.ts`/`precompute.test.ts` convention) asserting every registered script has a unique `id`, a non-empty `actions` list, and an `initialSceneId` present in `MAPS`; and that `runPrecompute` completes without throwing for every registered script (a cheap regression net against a broken beat blocking the whole picker).

## Risks / Trade-offs

- **[Risk]** JSON-authored scripts have no compile-time check against the `Action` union — a typo'd `type` or missing field only surfaces as a silent no-op (per existing `applyAction` semantics) or a runtime crash, not a TS error. → **Mitigation:** recommend TS for anything beyond a simple/experimental beat; the new `scripts/index.test.ts` precompute smoke test catches scripts that throw, though not ones that silently no-op.
- **[Risk]** Breaking `DirectorProvider`'s prop contract has no other call sites today, so the blast radius is limited to this one workspace — but any future code that assumes `DirectorProvider` needs no props would break. → **Mitigation:** none needed now; flagged for awareness.
- **[Risk]** An unknown `:script` URL segment (typo, stale bookmark, or a script removed from the registry) needs a defined fallback. → **Mitigation:** treat an unresolved `:script` the same as "no script selected" and render the select screen (optionally with a small inline notice) rather than `NotFoundPage`, since this is an internal dev tool and a hard 404 is unhelpful mid-iteration.
- **[Trade-off]** Splitting `script.ts` and moving the current `SCRIPT` into the registry as its first entry touches every import site of `SCRIPT`/`MAP` (currently just `Director.tsx`) — a one-time mechanical change, not ongoing risk.

## Open Questions

Both resolved:

- **Dev vs. production reachability** — the select screen is reachable in production for now (no `import.meta.env.DEV` gating in this change); a later change will hide it once the talk is ready to present without it.
- **Splitting the existing script** — the current `SCRIPT` stays exactly as-is and becomes the registry's `"Test Script"` entry (name literally `Test Script`), framed as the script used for evaluating engine capabilities rather than the talk's real content. No split as part of this change.
