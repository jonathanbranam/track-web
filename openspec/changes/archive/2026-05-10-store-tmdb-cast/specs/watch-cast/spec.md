**App**: watch

## ADDED Requirements

### Requirement: People table stores cast and director identities
The system SHALL maintain a `people` table with columns `id` (integer PK), `name` (text, not null), and `tmdb_person_id` (integer, unique, not null). The `tmdb_person_id` column SHALL have a unique constraint so that the same TMDB person is never inserted twice.

#### Scenario: Person is inserted once on first import
- **WHEN** a TMDB person with `tmdb_person_id = 12345` is stored for the first time
- **THEN** a single row is inserted into `people` with the given name and TMDB person ID

#### Scenario: Person is not duplicated on reimport
- **WHEN** the same TMDB person (same `tmdb_person_id`) appears during a second import of the same or different title
- **THEN** no new `people` row is inserted; the existing row is reused

### Requirement: Title cast join tables link people to movies and TV series
The system SHALL maintain two join tables: `movie_cast` and `tv_cast`. Each table SHALL have columns `id` (integer PK), `person_id` (integer FK → `people.id`), `title_id` (integer FK → `movies.id` or `tv_series.id` respectively), `role` (text, not null — `"cast"` or `"director"`), and `billing_order` (integer, not null). Each table SHALL enforce a unique constraint on `(title_id, person_id)`.

#### Scenario: Cast rows are stored with billing order
- **WHEN** a movie is imported and the top 30 cast members are stored
- **THEN** `movie_cast` contains one row per cast member with the correct `billing_order` matching TMDB `cast.order` and `role = "cast"`

#### Scenario: Director row is stored with billing order zero
- **WHEN** a movie is imported and a director is found in the TMDB credits crew
- **THEN** `movie_cast` contains a row for the director with `role = "director"` and `billing_order = 0`

#### Scenario: TV series cast stored in tv_cast
- **WHEN** a TV series is imported with cast data
- **THEN** rows are inserted into `tv_cast` (not `movie_cast`) with correct `person_id`, `title_id`, `role`, and `billing_order`

### Requirement: Cast rows are replaced on reimport
The system SHALL delete all existing cast rows for a title before inserting the new set, within a single transaction. This ensures reimporting a title reflects the current TMDB credits data.

#### Scenario: Reimport replaces cast list
- **WHEN** a movie is imported a second time (same `movies.id`)
- **THEN** all previous `movie_cast` rows for that `movies.id` are deleted and replaced with the new set from TMDB

### Requirement: Admin CLI command to view title cast
The system SHALL provide an admin CLI subcommand `watch cast` accepting `--id <title-id>` (required) and `--type movie|tv` (required), with an optional `--json` flag. Default output SHALL be a formatted list of cast members showing name, role, and billing order.

#### Scenario: Admin table output for a movie
- **WHEN** `npm run admin watch cast --id 1 --type movie` is run
- **THEN** results are printed as a formatted list with name, role, and billing order columns

#### Scenario: Admin JSON output
- **WHEN** `npm run admin watch cast --id 1 --type movie --json` is run
- **THEN** results are printed as a JSON array of cast objects with `name`, `role`, `billingOrder`, and `tmdbPersonId`

#### Scenario: Title with no cast returns empty list
- **WHEN** `npm run admin watch cast --id 99 --type movie` is run for a title with no stored cast
- **THEN** the command prints an empty list (not an error)
