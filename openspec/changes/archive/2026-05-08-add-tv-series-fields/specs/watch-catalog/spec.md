**App**: client-watch

## MODIFIED Requirements

### Requirement: Add a TV series to the catalog
The system SHALL allow any authenticated user to add a TV series to the global catalog. A TV series SHALL have a title and MAY include a streaming platform, a typical episode runtime in minutes, a description, a season count, and one or more genre tag IDs.

#### Scenario: Add a TV series with full metadata
- **WHEN** an authenticated user calls `POST /api/watch/tv` with a title, streaming, episode runtime, description, season count, and `tagIds`
- **THEN** a `tv_series` row is created, `tv_series_tags` rows are inserted, and the new series is returned

#### Scenario: Add a TV series with title only
- **WHEN** an authenticated user calls `POST /api/watch/tv` with only a `title`
- **THEN** a `tv_series` row is created with all optional fields null

### Requirement: Get and update a TV series
The system SHALL allow any authenticated user to retrieve a TV series' full details and update its metadata or tags.

#### Scenario: Get a TV series
- **WHEN** an authenticated user calls `GET /api/watch/tv/:id`
- **THEN** the response includes the series' title, streaming, episode runtime, description, season count, and tags

#### Scenario: Get non-existent TV series returns 404
- **WHEN** an authenticated user calls `GET /api/watch/tv/:id` for an ID that does not exist
- **THEN** the server returns 404

#### Scenario: Update TV series metadata
- **WHEN** an authenticated user calls `PUT /api/watch/tv/:id` with updated fields
- **THEN** the `tv_series` row is updated and the updated series is returned

#### Scenario: Update TV series tags replaces tag set
- **WHEN** an authenticated user calls `PUT /api/watch/tv/:id` with a `tagIds` array
- **THEN** existing `tv_series_tags` rows are deleted and new rows are inserted for the provided tag IDs

## ADDED Requirements

### Requirement: Add a TV series with full metadata from the UI
The system SHALL provide an inline "Add Series" form in the TV catalog UI that collects all supported fields: title (required), streaming platform, episode runtime in minutes, season count, description, and one or more genre tags. The form SHALL load available genre tags from the API and display them as selectable toggles. The episode runtime and season count fields SHALL accept numeric input only and be converted to integers before submission.

#### Scenario: Add form exposes all fields
- **WHEN** the user opens the Add Series form on the TV catalog page
- **THEN** the form displays fields for title, streaming platform, episode runtime (minutes), season count, description, and a set of genre tag toggles

#### Scenario: Submit with all fields populated
- **WHEN** the user fills in title, streaming, episode runtime, season count, description, and selects one or more genre tags and submits
- **THEN** `POST /api/watch/tv` is called with title, streaming, episodeRuntimeMinutes (as integer), seasonCount (as integer), description, and tagIds
- **AND** the new series appears in the catalog list with its tags

#### Scenario: Submit with title only
- **WHEN** the user fills in only the title and submits
- **THEN** `POST /api/watch/tv` is called with only the title
- **AND** the new series appears in the catalog list without tags or metadata

#### Scenario: Numeric fields are rejected if non-numeric
- **WHEN** the user enters a non-numeric value in the episode runtime or season count field and submits
- **THEN** the form does not submit and the affected field is treated as empty (null)

### Requirement: Edit an existing TV series from the UI
The system SHALL allow the user to edit any TV series in the catalog from the TV catalog page. Each series card SHALL display an "Edit" affordance. Activating it SHALL replace the card in-place with an edit form pre-populated with the series' current title, streaming platform, episode runtime, season count, description, and selected genre tags. Saving SHALL call `PUT /api/watch/tv/:id` and restore the card view with updated data. Cancelling SHALL restore the original card without making changes.

#### Scenario: Edit affordance is visible on each series card
- **WHEN** the TV catalog page is loaded
- **THEN** each series card displays an Edit button

#### Scenario: Edit form is pre-populated
- **WHEN** the user activates Edit on a series card
- **THEN** the card is replaced by an edit form with title, streaming, episode runtime, season count, description, and genre tag toggles all pre-populated from the series' current data

#### Scenario: Save submits updated fields
- **WHEN** the user modifies one or more fields and submits the edit form
- **THEN** `PUT /api/watch/tv/:id` is called with all form values (including unchanged fields)
- **AND** the card is restored showing the updated series data

#### Scenario: Cancel discards changes
- **WHEN** the user activates Cancel on the edit form
- **THEN** the edit form is dismissed and the original series card is restored with no API call made

#### Scenario: Only one series is in edit mode at a time
- **WHEN** the user activates Edit on a second series while another is already in edit mode
- **THEN** the first edit form is dismissed and the second series' edit form opens
