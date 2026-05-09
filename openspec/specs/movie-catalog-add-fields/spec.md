## Purpose

Covers the UI for creating movies with full metadata from the movie catalog page in the watch app.

## Requirements

### Requirement: Add a movie with full metadata from the UI
The system SHALL provide an inline "Add Movie" form in the movie catalog UI that collects all supported movie fields: title (required), streaming platform, runtime in minutes, description, and one or more genre tags. The form SHALL load available genre tags from the API and display them as selectable toggles. The runtime field SHALL accept numeric input only and be converted to an integer before submission.

#### Scenario: Add form exposes all fields
- **WHEN** the user opens the Add Movie form on the movie catalog page
- **THEN** the form displays fields for title, streaming platform, runtime (minutes), description, and a set of genre tag toggles

#### Scenario: Submit with all fields populated
- **WHEN** the user fills in title, streaming, runtime, description, and selects one or more genre tags and submits
- **THEN** `POST /api/watch/movies` is called with title, streaming, runtimeMinutes (as integer), description, and tagIds
- **AND** the new movie appears in the catalog list with its tags

#### Scenario: Submit with title only
- **WHEN** the user fills in only the title and submits
- **THEN** `POST /api/watch/movies` is called with only the title
- **AND** the new movie appears in the catalog list without tags or metadata

#### Scenario: Runtime is rejected if non-numeric
- **WHEN** the user enters a non-numeric value in the runtime field and submits
- **THEN** the form does not submit and the runtime field is treated as empty (null)
