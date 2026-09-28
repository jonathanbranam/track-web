# Proposal

## Why

Every `assets` command quietly creates a game folder, its subfolders and an
empty manifest when the name doesn't exist. On 2026-09-27 a mistyped
`assets review otter-game --serve` made an empty `otter-game/` next to the real
`otter_game/` in Dropbox. It served an empty page instead of saying the game
wasn't there. A typo should fail loudly, not make a new game.

## What Changes

- **BREAKING** (CLI): `status <game>`, `mark`, `ingest`, `adopt`, `review`,
  `pack` and `ship` fail when `GAME_ASSETS_DIR/<game>/` does not exist. The
  error names the closest existing game and lists all of them. It also says how
  to create the game on purpose. Nothing is written.
- New `assets init <game> [--json]` is the only command that creates a game. It
  refuses a name that differs from an existing game only by case, `-` versus
  `_`, or spaces (e.g. `otter-game` when `otter_game` exists) unless `--force`
  is given. It is idempotent for a game that already exists.
- An existing game folder with no manifest yet (a pre-pipeline folder about to
  be adopted) still counts as a game: commands fill in the missing subfolders
  and the empty manifest as before. Only a missing folder is an error.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `game-asset-pipeline`: "Asset workspace outside the repository". The layout
  is created by `assets init` or for an existing folder, never for an unknown
  name.

## Impact

- `scripts/pixellab/src/pixellab_tools/manifest.py` (`open_workspace`, name
  suggestions), `assets_cli.py` (every command, new `init`).
- `scripts/pixellab/tests/test_assets_cli.py`, `test_manifest.py`.
- `docs/pixellab/README.md`: the workspace layout text and the commands
  table.
- The stray `GAME_ASSETS_DIR/otter-game/` is left for the user to delete.
