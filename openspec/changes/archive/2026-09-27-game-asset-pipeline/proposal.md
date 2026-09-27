# Proposal

## Why

Pixel art for Mimlings (and, later, the otter game) is being generated with
PixelLab — through its web editor, the MCP tools and the REST API — but there
is no pipeline around it. Downloads land with prompt-fragment or wrong names
(`pixellab-cute-wizard-….png` is really an 8-direction rotation set), nothing
records which files are chosen, which need review, or where they came from,
and there is no path from a generated grid to a game-ready sheet. Every REST
call is also hand-written `curl` plus base64 plumbing, which is slow and
wastes agent tokens. We want this in place before real art production for
Mimlings starts, and without putting non-final art into this git repo.

## What Changes

- **Asset workspace outside git.** Assets live under `GAME_ASSETS_DIR`
  (configured in `.env`; Dropbox on both the Mac and the Linux box, at
  different paths). Tooling lives in this repo. Only final packed sheets are
  ever copied into a repo.
- **`pl` — a PixelLab REST shim** (Python, run via `uv`): reads
  `PIXELLAB_SECRET` from `.env`; `balance`, `get`, `post`, `wait`, `export`;
  short `key=value` / `key:=json` / `key=@image.png` arguments instead of JSON
  and base64 by hand; polls background jobs and saves result images; logs
  every generation call for provenance. Every data-returning command supports
  `--json`.
- **`assets` — the pipeline CLI** over a per-game workspace:
  - a single **`manifest.yaml` per game** recording every asset: name, kind,
    frame layout, status, provenance (tool, prompt, PixelLab ids, original
    filename), review verdict and history;
  - a **status lifecycle**: `named → candidate → in-review → approved →
    packed → shipped`, plus `rejected`; files still sitting in `inbox/` are
    `raw` and unregistered;
  - **`ingest`**: register and rename files from `inbox/`, detect web-UI
    grid layouts (rotation 3×3, animation grids, 8×8 variation grids), and
    read PixelLab spritesheet exports with their layout JSON;
  - **`adopt`**: a one-time, plan-file-driven, undoable move/rename of
    already-existing files into the workspace layout;
  - **`review`**: a generated HTML contact sheet with animated previews,
    optionally served locally with approve/reject buttons that write the
    verdict back to the manifest;
  - **`pack`**: turn approved assets of one subject into one sheet PNG + an
    Aseprite-format JSON (frame tags per animation-direction) that Phaser's
    `load.aseprite` reads directly; `.aseprite` sources are exported through
    the Aseprite CLI;
  - **`ship`**: copy packed sheets to a per-game destination configured in the
    manifest (absolute, repo-relative, or `${ENV}`-expanded — never hardcoded
    to `client-games`);
  - **`status`**: counts per status and what is waiting for review.
- **First real run:** a best-effort rename of the existing `mimlings/` and
  `otter_game/` files in the Dropbox workspace via `adopt`, with every asset
  registered as `named` (the chosen reference, `_mochi-bunny-ur.png`, as the
  subject's anchor) for the user to review later.
- **Docs:** `docs/pixellab/` gains the pipeline guide; `README.md` documents
  the new env vars and commands.

No application code, API route, database table, or client app changes.

## Capabilities

### New Capabilities
- `pixellab-cli`: the command-line shim for the PixelLab REST API —
  configuration, argument conventions, job waiting, result saving, exports,
  and the generation log.
- `game-asset-pipeline`: the per-game asset workspace, manifest, naming
  convention, status lifecycle, and the ingest / adopt / review / pack / ship /
  status commands.

### Modified Capabilities
<!-- none -->

## Impact

- **New code:** `scripts/pixellab/` (a small `uv` Python project with
  tests); `npm run pl` and `npm run assets` wrappers in `package.json`.
- **Config:** `PIXELLAB_SECRET` and `GAME_ASSETS_DIR` in `.env` (already
  added, documented in `.env.example`); requires `uv` on any machine that runs
  the tooling. Not used by the server, the build, or deploy — the t4g.micro
  never runs any of it.
- **Data outside the repo:** files under `GAME_ASSETS_DIR/mimlings` and
  `GAME_ASSETS_DIR/otter_game` are moved/renamed (reversibly) and gain a
  `manifest.yaml`.
- **Docs:** `docs/pixellab/`, `docs/games/mimlings/mochi-bunny-pixellab-prompts.md`
  (reference filename), `README.md`, `CLAUDE.md` commands list.
- **Tests:** a pytest suite for the Python tooling, run with `uv run pytest`
  (separate from `npm test`, which is unaffected).
