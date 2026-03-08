## ADDED Requirements

### Requirement: Parse inline hashtags from description
The system SHALL parse #hashtag tokens from a time entry's description at write time and store them as a normalized comma-separated string in the tags column. Tags SHALL be extracted without the leading `#` character and stored in lowercase.

#### Scenario: Single tag in description
- **WHEN** the user submits description "Installing window screens #home"
- **THEN** the entry is stored with description "Installing window screens #home" and tags "home"

#### Scenario: Multiple tags in description
- **WHEN** the user submits description "Clearing gutters #home #maintenance"
- **THEN** the entry is stored with tags "home,maintenance"

#### Scenario: No tags in description
- **WHEN** the user submits description "Reading a book"
- **THEN** the entry is stored with tags as an empty string or null

#### Scenario: Tags are case-normalized
- **WHEN** the user submits "#Home" or "#HOME"
- **THEN** the stored tag is "home"

#### Scenario: Duplicate tags are deduplicated
- **WHEN** the user submits "#home #home"
- **THEN** the stored tags contain "home" only once

### Requirement: Display tags on entries
The system SHALL display parsed tags visually distinct from the description text in all entry views (running task display and daily log).

#### Scenario: Tags shown as chips or colored tokens
- **WHEN** an entry with tags is displayed in the UI
- **THEN** each tag is shown as a visually distinct element (e.g., a pill/chip) separate from the plain description text
