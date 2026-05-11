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

### Requirement: Personal rating seeds invitee vote at candidate-add time
When a candidate is added to a watch event the system SHALL read each invitee's personal rating for that item and upsert a vote for any invitee who has a non-null rating. This seeding is a one-time copy — later changes to an invitee's personal rating SHALL NOT propagate to their existing event vote.

#### Scenario: Invitee with personal rating receives seeded vote
- **WHEN** a candidate is added to a watch event and an invitee has a non-null personal rating for that item
- **THEN** a `watch_event_votes` row is created or updated for that invitee with the personal rating value as the vote

#### Scenario: Invitee with no personal rating receives no seeded vote
- **WHEN** a candidate is added to a watch event and an invitee has a NULL personal rating for that item
- **THEN** no `watch_event_votes` row is created for that invitee from the seeding step

#### Scenario: Subsequent personal rating change does not update event vote
- **WHEN** an invitee updates their personal rating for an item after it was added to an event
- **THEN** the existing `watch_event_votes` row for that candidate is unchanged

### Requirement: Event completion backfills personal ratings for unrated items
When an event is marked complete the system SHALL copy each invitee's event vote to their personal rating for the selected item, but only for invitees whose personal rating for that item is currently NULL.

#### Scenario: Completion writes vote to personal rating when rating is null
- **WHEN** an event is marked complete and an invitee has a non-null vote for the selected candidate and a NULL personal rating for that item
- **THEN** the invitee's personal rating is set to their vote value

#### Scenario: Completion does not overwrite existing personal rating
- **WHEN** an event is marked complete and an invitee already has a non-null personal rating for the selected item
- **THEN** the invitee's personal rating is unchanged

#### Scenario: Invitee with no vote gets no backfill
- **WHEN** an event is marked complete and an invitee has not voted on the selected candidate
- **THEN** no personal rating change is made for that invitee

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
