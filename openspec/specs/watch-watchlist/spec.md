## Purpose

Covers per-user tracking of movies and TV series: states, ratings, TV episode progress, and automatic updates driven by event votes and event completion.

## Requirements

### Requirement: Movie watchlist management
The system SHALL maintain per-user watchlist entries for movies. An entry SHALL have a state (`unseen`, `watched`, or `would_watch_again`) and an optional integer rating from −2 to 2.

#### Scenario: Add a movie to the watchlist
- **WHEN** an authenticated user calls `PUT /api/watch/movies/watchlist/:movieId` with a `state`
- **THEN** a `user_movies` row is created or updated with the provided state and optional rating

#### Scenario: Update movie watchlist state
- **WHEN** an authenticated user calls `PUT /api/watch/movies/watchlist/:movieId` with a new `state`
- **THEN** `user_movies.state` is updated

#### Scenario: Remove a movie from the watchlist
- **WHEN** an authenticated user calls `DELETE /api/watch/movies/watchlist/:movieId`
- **THEN** the `user_movies` row for the calling user is deleted

#### Scenario: List movie watchlist
- **WHEN** an authenticated user calls `GET /api/watch/movies/watchlist`
- **THEN** the response contains all the user's `user_movies` rows with movie metadata, state, and rating

### Requirement: TV series watchlist management
The system SHALL maintain per-user watchlist entries for TV series. An entry SHALL have a state (`unseen`, `watching`, `watched`, or `would_watch_again`), an optional rating from −2 to 2, and optional `currentSeason`/`currentEpisode` fields that track the latest episode the user has reached.

#### Scenario: Add a TV series to the watchlist
- **WHEN** an authenticated user calls `PUT /api/watch/tv/watchlist/:seriesId` with a `state`
- **THEN** a `user_tv_series` row is created or updated with the provided state, optional rating, and optional episode progress

#### Scenario: Update TV episode progress
- **WHEN** an authenticated user calls `PUT /api/watch/tv/watchlist/:seriesId` with `currentSeason` and `currentEpisode`
- **THEN** `user_tv_series.current_season` and `current_episode` are updated to the provided values

#### Scenario: Remove a TV series from the watchlist
- **WHEN** an authenticated user calls `DELETE /api/watch/tv/watchlist/:seriesId`
- **THEN** the `user_tv_series` row for the calling user is deleted

#### Scenario: List TV watchlist
- **WHEN** an authenticated user calls `GET /api/watch/tv/watchlist`
- **THEN** the response contains all the user's `user_tv_series` rows with series metadata, state, rating, and current season/episode

### Requirement: Event vote seeds watchlist rating
When a user votes on a watch event candidate, the system SHALL automatically create or update a watchlist entry for the voted item using the vote value as a rating seed, without overwriting an explicitly set rating.

#### Scenario: Vote creates watchlist entry when none exists
- **WHEN** a user casts a vote on a watch event candidate for a movie they have no `user_movies` row for
- **THEN** a `user_movies` row is created with `state = 'unseen'` and `rating` set to the vote value

#### Scenario: Vote creates TV watchlist entry when none exists
- **WHEN** a user casts a vote on a watch event candidate for a TV series they have no `user_tv_series` row for
- **THEN** a `user_tv_series` row is created with `state = 'unseen'` and `rating` set to the vote value

#### Scenario: Vote seeds rating when row exists with no rating
- **WHEN** a user casts a vote for an item they already track but with `rating IS NULL`
- **THEN** `rating` is set to the vote value

#### Scenario: Vote does not overwrite existing rating
- **WHEN** a user casts a vote for an item they already have a non-null `rating` for
- **THEN** `rating` is left unchanged

### Requirement: Event completion updates watchlist state
When the host marks a watch event as complete, the system SHALL upsert watchlist entries for all invitees who RSVP'd `yes`, targeting the confirmed selection, according to defined state transition rules.

#### Scenario: Movie event completion creates watched entry for new row
- **WHEN** a movie event is marked complete and a yes-RSVP invitee has no `user_movies` row for the selected movie
- **THEN** a row is created with `state = 'watched'`

#### Scenario: Movie event completion advances unseen to watched
- **WHEN** a movie event is marked complete and a yes-RSVP invitee has `state = 'unseen'` for the selected movie
- **THEN** `state` is updated to `'watched'`

#### Scenario: Movie event completion does not downgrade state
- **WHEN** a movie event is marked complete and a yes-RSVP invitee has `state = 'watched'` or `'would_watch_again'`
- **THEN** the state is unchanged

#### Scenario: TV event completion creates watching entry for new row
- **WHEN** a TV event is marked complete and a yes-RSVP invitee has no `user_tv_series` row for the selected series
- **THEN** a row is created with `state = 'watching'`

#### Scenario: TV event completion advances unseen to watching
- **WHEN** a TV event is marked complete and a yes-RSVP invitee has `state = 'unseen'` for the selected series
- **THEN** `state` is updated to `'watching'`

#### Scenario: TV event completion does not change already-active state
- **WHEN** a TV event is marked complete and a yes-RSVP invitee has `state = 'watching'`, `'watched'`, or `'would_watch_again'`
- **THEN** the state is unchanged

#### Scenario: TV specific-mode event advances episode progress
- **WHEN** a TV event with `episode_mode = 'specific'` is marked complete and a yes-RSVP invitee's current progress is behind `season_to`/`episode_to`
- **THEN** `current_season` and `current_episode` are updated to `season_to` and `episode_to`

#### Scenario: TV specific-mode event does not regress progress
- **WHEN** a TV event with `episode_mode = 'specific'` is marked complete and a yes-RSVP invitee's current progress is at or ahead of `season_to`/`episode_to`
- **THEN** `current_season` and `current_episode` are unchanged
