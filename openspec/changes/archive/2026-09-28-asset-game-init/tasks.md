# Tasks

## 1. Open vs create

- [x] 1.1 Add `open_workspace` and the suggestion helper to `manifest.py` (D1, D2). Verify with `test_manifest.py` cases: a missing folder raises with the suggestion; a `-`/`_` near-miss is suggested; an unrelated name gets no "Did you mean"; an existing folder with no manifest gets its layout
- [x] 1.2 Switch every game-taking command in `assets_cli.py` except `init` to `open_workspace`. Replace `test_status_creates_workspace_on_first_use` with a test that `status`, `review --serve` (without starting a server) and `mark` on an unknown name exit 1, print the suggestion, and leave no folder
- [x] 1.3 Add `assets init <game> [--force] [--json]` (D3). Verify with tests for create, idempotent re-run, the near-duplicate refused, `--force`, and the `--json` shape

## 2. Docs and check

- [x] 2.1 Update `docs/pixellab/README.md`: the workspace-layout line ("created by `assets init <game>`"), a new `init` row in the commands table, and a note that other commands refuse unknown games. Verify by reading it back
- [x] 2.2 Run `npm run test:pixellab` and confirm all tests pass. Then run `npm run assets -- status otter-gam` against the real `GAME_ASSETS_DIR` and confirm it fails, suggests `otter_game` and creates nothing (compare `ls` of `GAME_ASSETS_DIR` before and after)
