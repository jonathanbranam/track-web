## Why

`client-talks`' `talk-rpg` engine (the `engineering-with-ai` talk) currently hardcodes a single `SCRIPT: Action[]` in `script.ts`, imported directly by `Director.tsx`. Building out the full talk as one ever-growing script makes it slow to iterate on any one part — every reload replays (or requires scrubbing through) the entire thing. A named, selectable set of smaller scripts lets development focus on one part of the script at a time without disturbing the others.

## What Changes

- Support multiple named `Action[]` scripts stored alongside the existing code in `client-talks/src/talk-rpg` — either co-located in one file or split one-per-file under a subfolder. Each script imports its shared types (`Action`, `GameMap`, etc.) and constants (`MAP`, `MAPS`, `TILE_TYPES`, the map registry, etc.) from `script.ts` rather than redefining them.
- Add an interstitial select screen shown when the `engineering-with-ai` talk first loads, listing every registered script by name instead of immediately starting playback.
- Selecting a script loads it into the RPG experience (replacing the current hardcoded `SCRIPT` import) and updates the URL to reflect the selected script, so the browser's back navigation (and a link/button in the experience) returns to the select screen.
- **BREAKING**: `Director.tsx` (and anything else that imports `SCRIPT`/`MAP` directly from `script.ts`) no longer has a single implicit script — callers must supply which script to run.

## Capabilities

### New Capabilities
- `script-library`: the convention and lookup mechanism for defining multiple named scripts under `client-talks/src/talk-rpg`, each built from the shared types/constants in `script.ts`, and registered so they can be found by name.
- `script-select-screen`: the interstitial UI shown on first load of the `engineering-with-ai` talk — lists available scripts by name, loads the chosen one, and reflects the selection in the URL so the user can navigate back to the list.

### Modified Capabilities
<!-- none: talk-director's Action[] contract and talk-rpg-experience's presentation requirements are already agnostic to where the script comes from; only their implementations change from a hardcoded import to an injected/selected script, which is an implementation detail, not a requirement change. -->

## Impact

- `client-talks/src/talk-rpg/script.ts` — split so its exported types/constants (`Action`, `GameMap`, `MAP`, `MAPS`, `TILE_TYPES`, `loadMap`, etc.) remain the shared import surface, while the single `SCRIPT` array is replaced by the new script-library structure.
- `client-talks/src/talk-rpg/Director.tsx` — stops importing `SCRIPT`/`MAP`/`MAPS` directly; takes the selected script as input instead.
- `client-talks/src/talk-rpg/RpgExperience.tsx` and `client-talks/src/pages/TalkPage.tsx` — gain the interstitial select screen ahead of the existing experience for `kind: 'rpg'` talks.
- Routing (`App.tsx`/React Router) — the selected script name needs a place to live in the URL (e.g. a route param or query string) so it round-trips through `window.location.href`.
- No backend/API impact; this is entirely within the `client-talks` workspace.
