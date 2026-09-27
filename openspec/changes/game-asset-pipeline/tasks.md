# Tasks

## 1. Scaffold and configuration

- [x] 1.1 Create the `uv` project at `scripts/pixellab/` per design D1 (`pyproject.toml` with pillow, ruamel.yaml, python-dotenv, dev pytest; `src/pixellab_tools/` package; `tests/`; console scripts `pl` and `assets`), commit `uv.lock`, add `scripts/pixellab/.venv/` and `__pycache__/` to `.gitignore`; verify `uv run --project scripts/pixellab python -c "import pixellab_tools"` succeeds and `git status` shows no `.venv`
- [x] 1.2 Add `pl`, `assets` and `test:pixellab` scripts to the root `package.json` (D1); verify `npm run test:pixellab` runs pytest (0 tests is fine at this point)
- [x] 1.3 Implement `config.py` (D2: repo-root discovery, `.env` loading without overriding the shell, `GAME_ASSETS_DIR` with `~` expansion, `ASEPRITE_BIN` default, `PIXELLAB_API_BASE` override) with tests for shell-over-.env precedence, the missing-secret error message, and `~` expansion; verify `npm run test:pixellab` passes

## 2. `pl` — PixelLab REST shim

- [x] 2.1 Implement `api.py`: authenticated GET/POST via urllib, HTTP errors that print status and body but never the auth header, background-job polling, result-image discovery (`image`, `images[]`, direction-keyed dicts) and PNG saving (strip any `data:` prefix), ZIP download/unzip; verify with unit tests against a local stub HTTP server (`PIXELLAB_API_BASE`), including a `failed` job
- [x] 2.2 Implement the argument grammar (`key=value`, `key:=json`, `key=@file` resolved against the cwd then `GAME_ASSETS_DIR`, dotted nesting, `--body` merge, `--dry-run` with elided image data); verify with unit tests covering every scenario in `specs/pixellab-cli/spec.md` "Compact request arguments"
- [x] 2.3 Implement the `pl` CLI: `balance`, `get`, `post [--wait --out --prefix]`, `wait`, `export character|object <id> [--game|--out] [--zip]`, `--json` on every data-returning command; plus the generation log (`GAME_ASSETS_DIR/pixellab-log.jsonl`, images replaced by source paths, completion line with usage and files); verify with tests for log redaction (no secret, no base64) and `--json` raw output
- [x] 2.4 Live free checks: `npm run pl -- balance`, `npm run pl -- balance --json`, `npm run pl -- get characters --json`; verify each prints real data and the secret appears in no output
- [x] 2.5 Document `pl` in `docs/pixellab/README.md` (commands, argument grammar, examples) and replace the "Calling it from a script" section of `docs/pixellab/api.md` with a pointer to it; add `npm run pl` and `npm run test:pixellab` to the README.md CLI section and the CLAUDE.md Commands block; verify the documented example commands run as written (with `--dry-run` for POSTs)

## 3. Manifest, naming and layout detection

- [x] 3.1 Implement `naming.py` (build/parse for every form in the spec's naming convention, direction codes, `-v2…` collision labels, a checker for non-conforming names); verify with round-trip and collision unit tests
- [x] 3.2 Implement `layout.py` (D5 rules: rotation 3×3 with 8 filled cells then an empty last cell in PixelLab direction order, 8×8 variations, contiguous-frame animation, single sprite, unknown, cell-size guessing); verify with synthetic-PNG unit tests for each rule, plus one test against a real web download when `GAME_ASSETS_DIR` exists (skip otherwise)
- [x] 3.3 Implement `manifest.py` (ruamel round-trip load/save, entry model per D4, first-use layout creation, duplicate-id rejection, the D4 transition table with `--force`, history lines); verify with tests that comments and unknown fields survive a rewrite and that illegal transitions leave the file unchanged

## 4. `assets` CLI: status, mark, ingest

- [x] 4.1 Implement `assets status [<game>] [--json]` and `assets mark <game> <id…> <status> [--note] [--force]`; verify with tests for per-status counts, the review-waiting list, the all-games summary, and history on mark
- [x] 4.2 Implement `assets ingest <game> [--subject --anim --dir --cell --label --dry-run]`: web downloads (decode the ms timestamp to `source.created`), convention-named files, and PixelLab spritesheet exports (per-row crops, state name as the label, character id in provenance); files it can't resolve stay in `inbox/` and are listed; verify with tests over a synthetic inbox, including a fake export PNG + JSON matching the layout documented in `docs/pixellab/api.md`
- [x] 4.3 Add the pipeline guide to `docs/pixellab/README.md` (workspace layout, manifest fields, naming convention, status lifecycle, ingest usage) and `npm run assets` to the README.md CLI section and CLAUDE.md; verify the documented commands match `assets --help`

## 5. Adopt — the first real run on existing files

- [x] 5.1 Implement `assets adopt <game> <plan> [--dry-run]` and `--undo <record>` per D8 (validate first, no overwrite, empty-dir cleanup, `.DS_Store` ignored, undo record); verify with a tmp-dir test that applies then undoes a plan and ends byte-identical to the start
- [x] 5.2 Write the mimlings adopt plan from design D9 into `GAME_ASSETS_DIR/mimlings/_migration/2026-09-27-adopt.yaml` (frame counts from layout detection; `_mochi-bunny-ur` tagged `anchor`; matching prompts copied into `source.prompt`); run with `--dry-run`, then apply; verify `assets status mimlings` lists every file as `named`, `find` shows no files left outside `manifest.yaml`/`inbox`/`work`/`reference`/`review`/`dist`/`_migration`, and `naming` check reports no violations
- [x] 5.3 Write and apply the otter_game adopt plan from D9 the same way; then `npm run pl -- export character b376946f-5fa9-4f33-8f7a-01c1c302245e --game otter_game` and `… 3ab632d0-8e92-4366-a7df-110c92d816b0 --game otter_game`, and `npm run assets -- ingest otter_game --subject otter`; verify that the `otter-rot8-32-idle`, `otter-run-e-32-6f-idle` and `otter-rot8-32-walking` entries exist and `assets status otter_game` lists everything as `named`
- [x] 5.4 Set the ship config (mimlings `dest: client-games/public/mimlings`; otter_game none); update the anchor path in `docs/games/mimlings/mochi-bunny-pixellab-prompts.md` to the new filename; verify with `grep` that `_mochi-bunny-ur` no longer appears as a current path in `docs/` (history mentions are fine)

## 6. Review page

- [x] 6.1 Implement `assets review <game> [--serve --port]` per D7 (static `review/index.html` using relative paths, canvas previews with nearest-neighbour scaling, animations and rotation cycling from the layout, status/subject filters; served mode on 127.0.0.1 with approve/reject/back-to-review + note, which calls the same function as `mark`); verify with tests that the generated HTML embeds every entry and that a POST to the served endpoint updates the manifest
- [x] 6.2 Generate the review pages for mimlings and otter_game and check them in a browser using the playwright-cli skill (static via `file://`, and served), screenshots saved to `/tmp/track-verify/`; verify that the animations play, the rotation grids cycle, and approve-with-note round-trips to the manifest (then mark the test asset back to `named`)

## 7. Pack

- [x] 7.1 Aseprite spike (design Risks): export one adopted `.aseprite` source to per-frame PNGs with `ASEPRITE_BIN -b … --save-as {frame}.png`; if it fails, try the fallbacks listed in the design; record the working invocation (or the failure) in the design's Risks section; verify the frame PNGs exist with the expected count
- [x] 7.2 Read `createFromAseprite` in the Phaser version `client-games` pins (`node_modules/phaser/src/animations/AnimationManager.js`) and record in design D6 how it resolves tag frames to frame names; verify that the chosen JSON key scheme matches it
- [x] 7.3 Implement `assets pack <game> <subject>` per D6 (approved/packed only; one cell size or fail; PNG-grid and Aseprite sources; ≤16 columns; Aseprite hash JSON with `<anim>-<dir>` / `rot-<dir>` tags; mark `packed`); verify with tests for pixel exactness per cell, tag ranges (the spec's 13-frame example), and failure with nothing written on mixed cell sizes or no approved assets
- [x] 7.4 Document pack (and how to load the output in Phaser: `load.aseprite` + `anims.createFromAseprite`) in `docs/pixellab/README.md`; verify the snippet matches what 7.2 found

## 8. Ship

- [x] 8.1 Implement `assets ship <game> [<subject>…] [--dry-run]` (repo-relative, absolute and `${VAR}` destinations; missing-destination error that says where to set it; refusal on unpacked approved changes; copy PNG+JSON; record destination and sha256; mark `shipped`); verify with tests shipping to a tmp destination, including the `${VAR}` and error cases
- [x] 8.2 Document ship in `docs/pixellab/README.md`, including that the otter game's destination is intentionally unset; verify the doc's example with `--dry-run`. Do NOT ship anything into `client-games/` in this change

## 9. Live generation verification (design D11)

- [x] 9.1 Record the starting balance; run rows 1–9 of design D11 **through `pl`** with outputs in `GAME_ASSETS_DIR/mimlings/inbox/verify/`, the UR bunny as the reference/first frame for rows 1–6, a hard cap of 30 generations, and no Pro tools; tag the new character `mimlings`; verify each call completed (or note why it was skipped) and record the ending balance
- [x] 9.2 Export the new mochi-bunny character's spritesheet (row 3) and record its exact layout JSON; ingest all verification outputs into the manifest as `named` (subject `mochi-bunny`, or `berry`/`meadow` for rows 7–9); verify that `assets status mimlings` shows them and the review page renders them
- [x] 9.3 Add a "Verified 2026-09-27" section to `docs/pixellab/api.md` (per tool: request shape, response shape, frame counts, whether frame 0 is the input, sizes, billed usage, web-vs-API differences) and correct any earlier claim in `api.md` / `choosing-tools.md` that reality contradicted; write the run log to `mimlings/_migration/verify-2026-09-27.md`; add the new character id to `docs/games/mimlings/mochi-bunny-pixellab-prompts.md`; verify the section exists and that every D11 row is accounted for

## 10. Integration checks

- [x] 10.1 Run `npm run test:pixellab` (all pass) and `npm test` (unchanged, still passing); confirm with `git diff --stat` that no client app or server code changed, so no client build is required
- [x] 10.2 Run `openspec validate game-asset-pipeline --strict` and fix any issues; verify it passes
- [x] 10.3 Final state report: `npm run assets -- status --json` for both games, balance before/after, and a list of every file renamed (from the undo records), for the user's review
