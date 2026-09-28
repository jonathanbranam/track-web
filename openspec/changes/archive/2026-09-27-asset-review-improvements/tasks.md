# Tasks

## 1. Statuses: rename `named` → `unreviewed`, add `reference`

- [x] 1.1 In `manifest.py`, rename `named` to `unreviewed` in `TRANSITIONS`, `ALL_STATUSES` and `REVIEW_WAITING_STATUSES`; add `reference` with the D3 transitions (in from `unreviewed`/`candidate`/`in-review`, out only to `in-review`); add `initial_status(kind)`. Verify with new `test_manifest.py` cases: `unreviewed → reference` is legal, `reference → approved` is refused without `--force`, and `reference → in-review` is legal
- [x] 1.2 Add load-time migration to `Manifest._load` (D1): `named` becomes `unreviewed` (or `reference` for `kind: reference`, with a `migrated from named` history line), history `to: named` becomes `unreviewed`, and the file is saved only if something changed. Verify with tests: a fixture manifest with `named` entries, a reference entry, a custom `notes:` field and a comment comes back migrated and keeps the field and the comment; a second load does not rewrite the file (mtime/content unchanged)
- [x] 1.3 Make `Manifest.add` fill in a missing status from `initial_status` and normalise `named` (D2); switch `ingest._base_entry` to `initial_status`. Verify with tests: ingest of an ordinary file gives `unreviewed`, a `kind: reference` adopt entry with no status gives `reference`, and an adopt plan entry that says `named` is stored as `unreviewed`
- [x] 1.4 Update `status` output so `reference` is counted but not listed as waiting. Verify with a `test_assets_cli.py` case covering the "Reference is not waiting" scenario, human and `--json`
- [x] 1.5 Replace every remaining `named` status in `scripts/pixellab/tests/` (ingest, adopt, pack, review, assets_cli, manifest). Verify that `grep -rnw '"named"\|: named\|to: named' scripts/pixellab` returns nothing and `npm run test:pixellab` passes
- [x] 1.6 Update `docs/pixellab/README.md`: the lifecycle diagram and prose (D3), the `reference` status, the `status` command description, and a short note that old manifests migrate on first open. Verify that `grep -nw named docs/pixellab/README.md` shows only English uses ("convention-named", "the ones named")

## 2. Pixel-size data and card labels

- [x] 2.1 In `review._entry_to_json`, add the `size` object from D4 (single image; sheet with cell and frames; tileset with tile size and count, including the manifest-mismatch warning; directory image count). Verify with pytest cases for each row of the D4 table, including a 16-tile directory tileset → `{cell:[32,32], tiles:16}`
- [x] 2.2 In `review_template.html`, render the size label on each card (`32×32 px`, `40×40 px · 5 frames`, `tile 32×32 px · 16 tiles`, `12 images`). Verify with a pytest check that the rendered HTML embeds the `size` data, and by eye in §4

## 3. Full-size viewer and reference button

- [x] 3.1 Refactor `startCanvas` / `startGrid` so they draw into a given canvas and return a stop function, with the cards unchanged. Verify by opening the generated page and confirming the card previews still animate and the tileset grid still draws
- [x] 3.2 Add the viewer overlay (D5): open by clicking a preview; zoom −/+ (integer 1–16), Actual size, Fit, a zoom and pixel-size readout, a Sheet toggle for multi-frame entries, a scrollable stage with the checkerboard, close button and `Esc`, `←`/`→` through visible cards, and the keys `+ - 0 f`. Stop the animation timer on close or step. Verify each spec scenario under "Full-size asset viewer" in §4
- [x] 3.3 Add the `reference` button to served cards (D6). Verify with a `test_review.py` served-mode test that POSTs `reference` for an `unreviewed` entry and gets it back in the manifest

- [x] 3.4 Render the served page per GET from a fresh manifest, keep the on-disk `index.html` static (D7). Verify with a served-mode test: start the server, call `write_review(served=False)`, GET `/review/index.html`, and assert `"served": true` in the response
- [x] 3.5 Re-load the manifest in `handle_mark_request` (D7). Verify with a served-mode test: start the server, mark asset A from a separate `Manifest` instance and save, POST a mark for asset B, and assert that both changes are in the file
- [x] 3.6 In `docs/pixellab/README.md`, say what the note is for (a free-text record kept in `review.note` and `history`, with no other effect) and that `review/index.html` on disk is always the read-only page; the buttons come from `--serve`. Verify by reading the section back

- [x] 3.7 Replace the note `<input>` with an auto-growing `<textarea>` (D8), and add the mode line under the title. Verify with a pytest check that served HTML has a textarea and the right mode text in each mode, and with the §4 browser pass on a card whose note is long

## 4. Verify in a browser

- [x] 4.1 Generate the page for a temp copy of `mimlings` (`GAME_ASSETS_DIR` pointed at a scratch copy) and drive it with `playwright-cli`, saving screenshots to `/tmp/track-verify/`: card size labels; the 32×32 sprite at Actual size (canvas CSS box 32×32) and after two zoom-ins (96×96); the meadow tileset at Actual size (128×128, tiles edge to edge); the animation Sheet toggle; `Esc` and the arrow keys; the page opened via `file://`
- [x] 4.2 Serve the scratch copy with `--serve` and click reference on a card. Verify that the scratch manifest shows `reference` with a history line

## 5. Migrate the real manifests

- [x] 5.1 Copy both `GAME_ASSETS_DIR/*/manifest.yaml` files to the scratchpad, run `npm run assets -- status`, and diff each against its copy. Verify that only `status`/`history` lines changed, and that the counts are `mimlings` 29 unreviewed / 6 reference / 4 rejected and `otter_game` 15 unreviewed / 2 reference
- [x] 5.2 Run `npm run test:pixellab` and `npm test` once more (the second only to confirm nothing outside `scripts/pixellab` was touched). Both must pass
