# Design

## Context

`manifest.ensure_workspace(root, game)` makes the folder, the subfolders and
the manifest. All seven game-taking commands in `assets_cli.py` call it first.
`status` with no game uses `list_games`, which lists every non-hidden
directory. Tests use `ensure_workspace` directly as a fixture helper.

## Goals / Non-Goals

**Goals:** a typo never writes anything, and the error gets you to the right
name in one step.

**Non-Goals:** deleting or merging stray game folders; validating game-name
characters beyond the near-duplicate check.

## Decisions

### D1. Split "open" from "create"

`ensure_workspace` stays as the create primitive. `assets init` calls it, and
test fixtures keep using it. A new `open_workspace(root, game)` raises
`ManifestError` if `root/game` is not a directory. Otherwise it delegates to
`ensure_workspace`, which fills in a missing layout or manifest for a folder
that already exists. Every command other than `init` switches to
`open_workspace`. The CLI already turns `ManifestError` into exit code 1 with
the message on stderr.

The test for "is this a game" is whether the folder exists, not whether the
manifest exists. A pre-pipeline folder about to be adopted has no manifest,
and `adopt` must still work on it.

### D2. Suggestions

`_norm(name)` lowercases the name and maps `-`, `_` and spaces to `_`. If a
normalised match exists, that is the suggestion. Otherwise the suggestion is
`difflib.get_close_matches(game, games, n=1, cutoff=0.6)`. Message:

```
No game "otter-game" in /Volumes/Data/Dropbox/games. Did you mean "otter_game"?
Games: mimlings, otter_game
To start a new game: npm run assets -- init otter-game
```

The "Did you mean" line is omitted when there is no match, and `Games: (none)`
is shown when the root is empty.

### D3. `init`

- The folder exists: run `ensure_workspace`, print `<game>: already exists at
  <path>`, exit 0.
- A normalised match exists and there is no `--force`: fail with `A game named
  "otter_game" already exists; pass --force to create "otter-game" anyway`.
- Otherwise: create it and print `created <path>`.
- `--json` prints `{"game", "path", "created": bool}`.

## Risks / Trade-offs

- [A script relied on auto-create] → Only the docs' example (`assets status
  <newgame>`) did. The README is updated to say `assets init`.
