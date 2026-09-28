# Spec Delta

**App**: all (repo tooling: `scripts/pixellab`, the `assets` CLI)

## MODIFIED Requirements

### Requirement: Asset workspace outside the repository
The pipeline SHALL operate on `GAME_ASSETS_DIR/<game>/`, where `<game>` is a
folder name (e.g. `mimlings`, `otter_game`), resolved from the environment or
the repo `.env` exactly as `pl` does. Each game folder SHALL use this layout:
`manifest.yaml`, `inbox/` (raw, unregistered files),
`work/<subject>/` (named assets and sources), `reference/` (material that is
never shipped), `review/` (generated), `dist/` (packed output). The pipeline
SHALL never write asset files inside the repository except through `ship`.

A game folder SHALL be created only by `assets init <game>`. Every other
command given a `<game>` whose folder does not exist SHALL fail without
writing anything, and its error SHALL name the closest existing game (if any),
list the existing games, and show the `assets init` command. For a game folder
that exists but lacks some of the layout (for example, no manifest yet), any
command SHALL create the missing subfolders and an empty manifest. `assets
init` SHALL be idempotent for an existing game, SHALL refuse a new name that
matches an existing game after ignoring case and treating `-`, `_` and spaces
as equal unless `--force` is given, and SHALL support `--json`.

#### Scenario: Different machine, different path
- **WHEN** `GAME_ASSETS_DIR` points at `~/Dropbox/games` on the Linux box
- **THEN** every command works there unchanged, with no absolute Mac paths stored in any manifest

#### Scenario: First use creates the layout
- **WHEN** `assets init newgame` runs and no `newgame/` folder exists
- **THEN** the standard subfolders and an empty manifest are created

#### Scenario: Mistyped game name
- **WHEN** games `mimlings` and `otter_game` exist and the user runs `assets review otter-game --serve`
- **THEN** the command fails with a message suggesting `otter_game`, listing both games and showing `assets init otter-game`; no `otter-game/` folder is created and no server starts

#### Scenario: Near-duplicate init refused
- **WHEN** `otter_game` exists and the user runs `assets init otter-game`
- **THEN** the command fails, naming `otter_game`, and creates nothing; with `--force` it creates `otter-game/`

#### Scenario: Existing folder without a manifest
- **WHEN** `oldgame/` exists with loose files but no `manifest.yaml`, and the user runs `assets status oldgame`
- **THEN** the missing subfolders and an empty manifest are created and the status is printed
