# pixellab-cli Specification

## Purpose
A command-line shim for the PixelLab REST API, so generating, polling, saving
and exporting pixel art takes one short command instead of hand-written HTTP,
JSON and base64.

## Requirements

### Requirement: Configuration from the repo .env
The `pl` command SHALL read `PIXELLAB_SECRET` and `GAME_ASSETS_DIR` from the
environment, falling back to the repository's `.env` file, and SHALL work from
any working directory inside the repository. It SHALL NOT print the secret in
any output, error, or log.

#### Scenario: Secret loaded from .env
- **WHEN** `PIXELLAB_SECRET` is set only in the repo `.env` and the user runs `pl balance` from a subdirectory
- **THEN** the request is authenticated and the balance is printed

#### Scenario: Missing secret
- **WHEN** `PIXELLAB_SECRET` is set nowhere
- **THEN** `pl` exits non-zero with a message naming the variable and the `.env` file, without making a request

#### Scenario: Environment overrides .env
- **WHEN** `GAME_ASSETS_DIR` is set in the shell and differs from `.env`
- **THEN** the shell value is used

### Requirement: Read commands
`pl balance` SHALL show remaining generations, plan and credits. `pl get <path>`
SHALL issue an authenticated GET to `https://api.pixellab.ai/v2/<path>` and print
the response. Both SHALL support `--json` to print the raw response body only.

#### Scenario: Balance, human and JSON
- **WHEN** the user runs `pl balance` and then `pl balance --json`
- **THEN** the first prints a short human summary and the second prints the API's JSON unchanged

#### Scenario: Listing characters
- **WHEN** the user runs `pl get characters --json`
- **THEN** the API's character list JSON is printed

### Requirement: Compact request arguments
`pl post <endpoint>` SHALL build the JSON body from arguments: `key=value` sets
a string, `key:=<json>` sets a raw JSON value (numbers, booleans, objects,
arrays), and `key=@<file>` sets a base64 image object
(`{"type":"base64","base64":…,"format":"png"}`) read from the file. A relative
`@` path SHALL resolve against the current directory first and
`GAME_ASSETS_DIR` second. Dotted keys (`image_size.width:=32`) SHALL build
nested objects. `--body <file.json>` SHALL supply a base body that arguments
override. `--dry-run` SHALL print the body with image data elided and send
nothing.

#### Scenario: Image argument from the asset workspace
- **WHEN** the user runs `pl post create-character-v3 reference_image=@mimlings/work/mochi-bunny/mochi-bunny-s-32-ur.png description="mochi bunny" --dry-run`
- **THEN** the printed body has `reference_image` as a base64 image object with its data elided, and no request is sent

#### Scenario: Nested and typed values
- **WHEN** the arguments include `image_size.width:=32 image_size.height:=32 no_background:=true`
- **THEN** the body contains `{"image_size":{"width":32,"height":32},"no_background":true}`

#### Scenario: Unreadable image
- **WHEN** an `@` path does not exist in either location
- **THEN** `pl` exits non-zero naming both paths it tried, before any request

### Requirement: Job waiting and result saving
When a POST returns a background job id, `pl post` SHALL print the job id and,
with `--wait`, poll `background-jobs/<id>` until it completes or fails.
`pl wait <job-id>` SHALL do the same for an existing job. With `--out <dir>`
(relative paths resolved against `GAME_ASSETS_DIR`), every image in the final
response (a single image, an image list, or a direction-keyed map) SHALL be
saved as PNG with a deterministic name (`<prefix>-<index or key>.png`).
Synchronous responses that contain images SHALL be saved the same way. A failed
job SHALL exit non-zero and print the API's failure detail.

#### Scenario: Wait and save an animation
- **WHEN** the user runs `pl post animate-with-text-v3 first_frame=@f.png action="idle" frame_count:=4 --wait --out mimlings/inbox --prefix idle`
- **THEN** after the job completes, `mimlings/inbox/idle-0.png` … `idle-N.png` exist in the asset workspace

#### Scenario: Failed job
- **WHEN** a polled job reaches status `failed`
- **THEN** `pl` exits non-zero and prints the failure detail and job id

### Requirement: Library export
`pl export character <id>` and `pl export object <id>` SHALL download the
PixelLab spritesheet export (sheet PNG + layout JSON) into `--out <dir>`
(default: the current game's `inbox/` when `--game` is given), unzipped.
`--zip` SHALL instead fetch the per-frame ZIP export.

#### Scenario: Export a character sheet
- **WHEN** the user runs `pl export character 3ab632d0-… --game otter_game`
- **THEN** the sheet PNG and its layout JSON appear in `GAME_ASSETS_DIR/otter_game/inbox/`

### Requirement: Generation log
Every non-GET call SHALL append one line to `GAME_ASSETS_DIR/pixellab-log.jsonl`:
timestamp, endpoint, the request body with image data replaced by the source
file path, the returned job/character/object ids, and — once known — the
billed usage and the saved output files. The log SHALL never contain the secret
or image bytes.

#### Scenario: Provenance recorded
- **WHEN** a `pl post … --wait --out …` call completes
- **THEN** the log's last line names the endpoint, the `@` source files, the job id, the usage, and the saved file paths
