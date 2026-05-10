**App**: client-watch

## MODIFIED Requirements

### Requirement: Edit an existing movie's definition
The system SHALL allow the user to edit any movie in the catalog from the movie catalog page. Each movie card SHALL display an "Edit" affordance. Activating it SHALL replace the card in-place with an edit form pre-populated with the movie's current title, streaming platform, runtime, release year, description, and selected genre tags. Saving SHALL call `PUT /api/watch/movies/:id` and restore the card view with updated data. Cancelling SHALL restore the original card without making changes.

#### Scenario: Edit affordance is visible on each movie card
- **WHEN** the movie catalog page is loaded
- **THEN** each movie card displays an Edit button or link

#### Scenario: Edit form is pre-populated
- **WHEN** the user activates Edit on a movie card
- **THEN** the card is replaced by an edit form with title, streaming, runtime, release year, description, and genre tag toggles all pre-populated from the movie's current data

#### Scenario: Save submits updated fields
- **WHEN** the user modifies one or more fields and submits the edit form
- **THEN** `PUT /api/watch/movies/:id` is called with all form values (including unchanged fields)
- **AND** the card is restored showing the updated movie data

#### Scenario: Cancel discards changes
- **WHEN** the user activates Cancel on the edit form
- **THEN** the edit form is dismissed and the original movie card is restored with no API call made

#### Scenario: Only one movie is in edit mode at a time
- **WHEN** the user activates Edit on a second movie while another is already in edit mode
- **THEN** the first edit form is dismissed and the second movie's edit form opens
