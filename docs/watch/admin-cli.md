# Watch — admin CLI

Commands backing `client-watch` (`watch.branam.us`): the movie/TV catalog, TMDB search and cast, watch events, and ratings.
Run from the repo root as `npm run admin -- <subcommand>`. Global commands (users, tokens, invites) are in the [README](../../README.md#admin-cli).

## Watch catalog

```bash
npm run admin -- movies:create --title "<title>" [--runtime <minutes>] [--streaming "<platform>"] [--tags tag1,tag2] [--creator <userId>]
npm run admin -- movies:list
npm run admin -- movies:get <movieId> [--json]
npm run admin -- movies:update <movieId> [--title "<title>"] [--runtime <minutes>] [--release-year <year>] [--streaming "<platform>"] [--description "<desc>"] [--tags tag1,tag2] [--json]
npm run admin -- movies:delete-all

npm run admin -- tv:create --title "<title>" [--episode-runtime <minutes>] [--seasons <count>] [--streaming "<platform>"] [--tags tag1,tag2] [--creator <userId>]
npm run admin -- tv:list
npm run admin -- tv:get <seriesId> [--json]
npm run admin -- tv:update <seriesId> [--title "<title>"] [--episode-runtime <minutes>] [--seasons <count>] [--release-year <year>] [--streaming "<platform>"] [--description "<desc>"] [--json]
npm run admin -- tv:delete-all
```

Tags must match existing genre names (e.g. `Drama,Sci-Fi,Thriller`). `--creator` defaults to user id `1`.

On `movies:update` / `tv:update`, `--release-year 0` clears the year and `--streaming ""` / `--description ""` clear those fields. `movies:update --tags` replaces the existing tag set.

`movies:delete-all` and `tv:delete-all` cascade — removes tags, cast, user states, series memberships, and any watch event candidates (with their votes and selections) referencing the deleted titles.

## TMDB external search and cast

```bash
npm run admin -- watch:external:search --q "<query>" --type movie|tv [--person] [--json]
npm run admin -- watch:cast --id <titleId> --type movie|tv [--json]
npm run admin -- watch:cast:fetch --id <titleId> --type movie|tv
```

`watch:external:search` queries TMDB (requires `TMDB_API_KEY`). `--person` switches to filmography mode. Default output is a table; `--json` prints raw JSON.

`watch:cast` shows the stored director and cast (up to 30 members) for a local catalog title. Cast is populated automatically when a title is imported via `POST /api/watch/external/import`. `--json` outputs an array of `{ name, role, billingOrder, tmdbPersonId }`.

`watch:cast:fetch` fetches cast from TMDB and stores it for a title already in the catalog (requires `TMDB_API_KEY`) — use it for titles added before cast import existed.

### `TMDB_PERSON_SORT` options

`TMDB_PERSON_SORT` (env var) selects the sort algorithm for person filmography search results. It is read from `process.env` on every search, but `.env` is loaded only at startup — so after changing it, restart the server (`pm2 restart track-web`). No cache clear is required.

| Value | Description |
|-------|-------------|
| `decay` *(default)* | Harmonic mean of normalised `vote_average` × `popularity`, multiplied by a billing decay factor `1 / (1 + 0.05 × billing)`. Highly-rated popular titles rank first; high billing numbers apply a soft penalty. |
| `harmonic` | Two-way harmonic mean of normalised `vote_average` and `popularity`. No billing adjustment. |
| `three-way` | Three-way harmonic mean of normalised `vote_average`, `popularity`, and `1 / (1 + billing)`. Billing is weighted equally with the other signals. |
| `geometric` | Weighted geometric mean: `vote^0.5 × pop^0.3 × billing_factor^0.2`. Most tunable — each signal has an independent exponent. |
| `billing` | Ascending by effective billing order (directors = 0, cast by TMDB cast order). Original behaviour. |

## Watch events

```bash
npm run admin -- events:list
npm run admin -- events:create --title "<title>" --date <YYYY-MM-DD> [--creator <userId>] [--invites 1,2,3]
npm run admin -- events:delete <eventId>

npm run admin -- events:show <eventId>        # event header + creator + invite/candidate counts
npm run admin -- events:attendees <eventId>   # attendee list with attendance status (yes/no/maybe)
npm run admin -- events:candidates <eventId>  # candidate list with vote count and average rating
```

`events:delete` cascades — removes votes, candidates, invites, and the event itself.

## Ratings

```bash
npm run admin -- watch:ratings [--userId <id>] [--json]
```

`watch:ratings` lists all personal ratings (movies and TV) for a user, sorted by rating descending.
