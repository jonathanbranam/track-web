## Context

- The scene holds one live `Tuning` object (`scene.tuning`), and it reads that object on every sub-step. `TuningPanel` mutates the object in place, which is why edits apply live. The object starts out as `cloneTuning(DEFAULT_TUNING)` in the scene.
- The panel is loaded through `import.meta.env.DEV ? lazy(...) : null`, so production builds drop it.
- The host (`OrbitalDodgerGame.tsx`) polls for the scene after boot and then hands `scene.tuning` to the panel.
- The layout is generated when a run starts, from `tuning.planetCount`. After that the run sits in `awaitingLaunch` until the first press.
- Dungeon Tactics already has a close parallel: server-side named scenarios with an `is_default` flag, plus a per-browser active-scenario id in localStorage (`defStoreLoader.ts`). This design follows the same shape.
- All `/api/games/*` routes are behind `authMiddleware`, and every games user is an invited, signed-in account.

## Goals / Non-Goals

**Goals:**
- One shared config store, where the Default is a row like any other that is protected from deletion.
- Stored configs survive the addition of new tuning keys without a migration.
- Game start never blocks on the network, and never breaks if the configs are unreachable.

**Non-Goals:**
- Per-user private configs, or config ownership and permissions. Everyone has equal rights, following the project rule.
- Tagging scores with the config they were played on, or splitting the leaderboard by config.
- Conflict detection for concurrent edits. The last save wins.
- Server-side validation of individual tuning keys. The client owns the `Tuning` schema.

## Decisions

### D1. Configs are shared server rows, and the selection is per browser
Table `game_od_configs`:

| column | notes |
|---|---|
| `id` INTEGER PK AUTOINCREMENT | stable handle for the selection, not affected by renames |
| `name` TEXT NOT NULL | unique index on `name COLLATE NOCASE` |
| `tuning_json` TEXT NOT NULL | a JSON object of values that are layered over the shipped values |
| `is_default` INTEGER NOT NULL DEFAULT 0 | partial unique index `WHERE is_default = 1` |
| `updated_by` INTEGER NULL | user id, informational only |
| `created_at`, `updated_at` TEXT | ISO UTC |

Migration `0039_orbital_dodger_configs` creates the table and seeds `('Default', '{}', is_default=1)`. The table name also goes into `TABLE_NAMES`.

The selected config id is kept in localStorage under `orbital-dodger:config-id`. Every read and write is wrapped in try/catch, as in `defStoreLoader.ts`.

*Alternatives:* Configs kept only in localStorage were ruled out, because the Default has to be "for all players". Per-user server configs were ruled out because they add ownership for no stated need.

### D2. The Default is seeded as `{}` and every config is layered over `DEFAULT_TUNING`
`resolveTuning(stored)` starts from `cloneTuning(DEFAULT_TUNING)`. For each key in `DEFAULT_TUNING`, it takes the stored value only if `typeof` matches the shipped value's type. For `controlMode` and `edgeMode`, the stored value must also be one of the allowed options. Unknown keys are dropped. Seeding `{}` means the server never has to know the shipped values. It also means the Default "equals the shipped defaults" until someone saves over it, and a key added later appears in every config with its shipped value. A save always writes the **full** resolved tuning, so a config is a snapshot and does not move when the shipped values change later.

`resolveTuning` and the "differs from saved" comparison are pure functions. They go in a small `configs.ts` module beside `physics.ts`, with unit tests.

### D3. API: `/api/games/orbital-dodger/configs`
- `GET /configs` → `{ configs: [{ id, name, isDefault, tuning, updatedAt }] }`, with the Default first and the rest in `created_at` order. There are only a few configs, so the list includes their tuning and the dropdown never needs a second fetch.
- `POST /configs` `{ name, tuning }` → 201 with the config. A duplicate name returns 409.
- `PATCH /configs/:id` `{ name?, tuning? }` → 200. A missing id returns 404, and a duplicate name returns 409. A `name` change on the Default returns 403.
- `DELETE /configs/:id` → 204. A missing id returns 404, and the Default returns 403.

Validation uses zod, following `games.ts`. `name` is trimmed, 1–40 characters. `tuning` is `z.record(z.union([z.number(), z.boolean(), z.string()]))`, and its serialized size is capped at 8 KB. Name uniqueness is enforced by the database index and mapped to 409. The routes live in a new `createOrbitalConfigsRouter(repo)`, mounted at `/api/games/orbital-dodger`. Keeping them out of `createGamesRouter` avoids growing its argument list with a fourth repository that is unrelated to it.

*Alternative:* `PUT` for the full config was rejected. Rename and save are separate actions in the UI, and `PATCH` fits both.

### D4. The server does not know about the confirmation prompt
The "replace the default for all players" prompt is a client `window.confirm`-style dialog shown before `PATCH` on the Default. The server accepts the save either way. Enforcing it on the server would take a `confirm` flag that any client could simply send, so it would guard nothing.

The prompt is an in-panel modal, like the existing export modal, and not `window.confirm`. That keeps it styled, and keeps it working in the iOS standalone PWA, where native dialogs behave badly. The same modal component handles the delete confirmation and the discard-unsaved-changes confirmation.

### D5. The game waits for the configs before it starts
On mount, the host calls `listConfigs()` and shows a "Loading…" state in place of the canvas. It does not mount `PhaserGame` until that request settles. Once the list arrives, the host resolves the selection with `pickConfig`: the stored id if that id is in the list, otherwise the Default (and the stored id is cleared). The resolved tuning then goes to the scene before the scene builds its first layout. The host sets it on `game.registry` from `buildConfig`'s `callbacks.preBoot`, and the scene's `create()` copies it into `this.tuning` before generating planets. So the first layout, the starting fuel and the starting shields all come from the selected config, and no layout is ever built from the shipped defaults and then replaced.

If the request fails, or doesn't settle within **8 seconds**, the host treats it as a failure. It then mounts the game with the shipped defaults, and the panel shows the config controls disabled with a "Configs unavailable" note, while the sliders still work. Without that limit, a request that never returns would leave the game on "Loading…" forever.

Switching configs later from the dropdown still goes through `scene.applyTuning(t)`. That method does `Object.assign(this.tuning, t)`, and calls `newLayout()` if `awaitingLaunch` is set, so the chosen planet count takes effect before the first press. Once the run has launched, the normal live-apply rules hold.

*Alternative:* Booting at once with the shipped defaults and applying the config once it arrives was rejected. The first run could start on the wrong settings if the player presses before the fetch returns, and the layout would visibly redraw when the config landed.

### D6. Panel state
The panel keeps `configs`, `selectedId` and `savedSnapshot` (the resolved tuning of the selected config). "Unsaved" is `!tuningEquals(tuning, savedSnapshot)`, recomputed on each render (the panel already re-renders on every edit through `bump`). The config section sits at the top of the panel, above Modes: a dropdown, then **Save**, **Save as new…**, **Rename…**, **Delete**, and **Revert**, with Rename and Delete hidden for the Default and Revert shown only when there are unsaved changes. Name entry uses an inline text field in the modal.

Refetches: after every mutation, the panel refetches the list and keeps the id it acted on. It also refetches when the panel opens. A config deleted by someone else then disappears from the dropdown. If that config was selected, the panel switches to the Default. When there are no unsaved edits, it applies the Default's values. When there are edits, it keeps the values in play, so they now show as unsaved changes against the Default, and it shows a notice saying so. A modal was considered for this and rejected: nothing is lost either way, and the player can save as new or revert.

### D7. Production gating
Replace the conditional lazy import with an unconditional `lazy(() => import('./TuningPanel'))`. The panel stays a separate chunk, so the game's first paint does not grow. The `__orbitalScene` window handle stays behind `import.meta.env.DEV`. Remove the "Development-only" wording from the module comment. The export modal stays, since it is still how a tuned config gets promoted into the shipped `DEFAULT_TUNING`.

### D8. Input over the canvas
The panel and its modals are DOM elements layered over the Phaser canvas, and the game already sets `input: { windowEvents: false }`. New buttons and inputs follow `kb/phaser-mobile-input.md`. Text inputs in the name modal also need to keep the scene from treating taps as thrust. The modal covers the canvas with a full-screen backdrop, which is already how the export modal works.

### D9. Side-by-side layout on wide screens
Today the panel is an absolutely positioned column (`w-[min(300px,84vw)]`) inside the same full-size container as the canvas. `FIT` + `CENTER_BOTH` centers the game in the whole container, so the panel covers the right part of the game.

The host wraps the play area (the HUD, the `PhaserGame` container, and the leaderboard and end-of-run overlays) in one absolutely positioned `div`. Its `right` inset is normally `0`. It becomes `PANEL_W` (300px) when the panel is open and the layout is side-by-side. The panel and its ⚙ toggle stay outside that wrapper, pinned to the container's right edge. So the panel's open state moves up to the host: `TuningPanel` takes `open`/`onOpenChange` and stops keeping that state itself.

**The inset.** `inset = clamp(containerWidth − displayedGameWidth, 0, PANEL_W)` while the panel is open, and `0` while it is closed. Here `displayedGameWidth = min(containerWidth, containerHeight × GAME_W / GAME_H)`, the width `FIT` gives for the full container. The wrapper is never narrower than the displayed game, and the height is unchanged, so `FIT` gives the same scale and the game never shrinks. When the free space is at least `PANEL_W`, the game is centered to the left of the panel and not covered. When it is less, the game ends up flush against the left edge with the smallest possible overlap. On a phone the free space is 0, so nothing moves. That makes one continuous rule with no breakpoint. A `ResizeObserver` on the outer container recomputes the inset on resize. The rule depends on the aspect ratio as well as the width, which is why it is not based on a CSS breakpoint.

**Refitting Phaser.** The Scale Manager only checks the parent's size on a timer and on window resize, and `refresh()` reuses its cached parent size without re-measuring. During a window resize with the panel open, Phaser handled the resize while the old inset was still in place, so it fit the game to a stale, narrower parent. A later plain `refresh()` then reapplied that stale size. Verification caught this at 1440 → 650. The host therefore observes the play-area element with a `ResizeObserver`, and on every size change calls `scale.getParentBounds()` then `scale.refresh()`. That refits to the final size whatever the cause (inset, window or orientation), and keeps pointer mapping correct. The run is not touched: this is a CSS and scale-manager change only, and it does not go through the scene.

*Alternatives:* Shrinking the game to fit beside the panel was rejected, as the user decided. It changes how big the planets are drawn while tuning, which is exactly when their size matters. An all-or-nothing cutoff (side-by-side only when the panel fits completely) was rejected because it wastes the free space on medium widths. A fixed breakpoint such as `md` was rejected because a short, wide window and a tall, narrow one need different answers at the same width.

## Risks / Trade-offs

- **[Leaderboard integrity]** Any player can now play, or save over the Default, with gravity 0 or 20 seconds of fuel, and still submit to the single `classic` leaderboard. → Accepted for now, since this is an invite-only platform in active tuning. It is recorded in `docs/games/planning.md` as follow-up work: either submit only when the values in play match the Default, or key `level` by config.
- **[Anyone can change the Default for everyone]** → The confirmation prompt, plus equal rights by project rule. Export gives a manual backup, and the admin backup/restore covers the table.
- **[Concurrent saves]** Two players saving the same config overwrite each other. → Accepted, since the last write wins and usage is low.
- **[Stale selection mid-session]** Another player deletes the config you are on. → Detected on the next refetch (panel open or mutation), and the Default is applied using the startup fallback rules.
- **[Slower start]** Every game start now waits one round trip before the canvas appears. → The request is one small GET on the same origin. The 8-second limit caps the worst case, after which the game plays with the shipped defaults.
- **[Bundle]** The panel now ships to production. → It is a small lazy chunk, fetched only when the game mounts, with no new dependencies and nothing added to the t4g.micro build cost.

## Migration Plan

Migration `0039` runs automatically on server start and seeds the Default. Rollback: revert the commit. The leftover table does no harm, and the previous client ignores it.
