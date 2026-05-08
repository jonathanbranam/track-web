**App**: all

## ADDED Requirements

### Requirement: Genre tags are pre-seeded on server startup
The system SHALL insert a standard set of genre tags into the `tags` table when the server starts. The seed operation SHALL use `INSERT OR IGNORE` so it is safe to run on an existing database that already contains some or all of the tags. The following 20 tags SHALL be seeded with `category = 'genre'`: Action, Adventure, Animation, Anime, Biography, Comedy, Crime, Documentary, Drama, Fantasy, Historical, Horror, Musical, Mystery, Romance, Sci-Fi, Sport, Superhero, Thriller, Western.

#### Scenario: Fresh database is seeded on first startup
- **WHEN** the server starts against a database with an empty `tags` table
- **THEN** all 20 genre tags are present in the `tags` table with `category = 'genre'`

#### Scenario: Seed is idempotent on restart
- **WHEN** the server starts against a database that already contains all seeded tags
- **THEN** no duplicate rows are inserted and the existing tags are unchanged

#### Scenario: Seed does not overwrite user-added tags
- **WHEN** the server starts against a database that contains the seeded tags plus additional user-created genre tags
- **THEN** only the standard 20 tags are affected by the seed and the user-created tags remain
