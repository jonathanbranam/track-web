## Purpose

Defines how inline tag tokens (`#tag` and `:tag`) are parsed from entry descriptions at write time, normalized, stored, and displayed as visual chips in the UI.

## Requirements

### Requirement: Parse inline tags from description
The system SHALL parse tag tokens from a time entry's description at write time and store them as a normalized comma-separated string in the tags column. A tag token is a word prefixed with either `#` or `:` (e.g. `#home` or `:home`). Both prefixes are equivalent and accepted interchangeably. `:` is provided as a single-tap alternative to `#` on iOS. A tag may contain letters, digits, and hyphens (`-`) as word separators (e.g. `#yard-work`, `:side-project`). Tags SHALL be extracted without the leading prefix character and stored in lowercase. When storing the description, the system SHALL normalize tag tokens: `:` prefixes SHALL be converted to `#`, and tag text SHALL be lowercased in place (e.g. `:HOME` becomes `#home` in the stored description).

#### Scenario: Single tag with hash prefix
- **WHEN** the user submits description "Installing window screens #home"
- **THEN** the entry is stored with description "Installing window screens #home" and tags "home"

#### Scenario: Single tag with colon prefix
- **WHEN** the user submits description "Installing window screens :home"
- **THEN** the entry is stored with description "Installing window screens #home" and tags "home"

#### Scenario: Mixed prefixes treated as equivalent
- **WHEN** the user submits description "Clearing gutters #home :maintenance"
- **THEN** the entry is stored with description "Clearing gutters #home #maintenance" and tags "home,maintenance"

#### Scenario: Multiple tags in description
- **WHEN** the user submits description "Clearing gutters #home #maintenance"
- **THEN** the entry is stored with tags "home,maintenance"

#### Scenario: No tags in description
- **WHEN** the user submits description "Reading a book"
- **THEN** the entry is stored with tags as an empty string or null

#### Scenario: Tags are case-normalized in description and tags column
- **WHEN** the user submits "#Home" or ":HOME"
- **THEN** the stored description contains "#home", and the stored tag is "home"

#### Scenario: Hyphenated tag accepted and colon normalized
- **WHEN** the user submits description "Pulling weeds :yard-work"
- **THEN** the entry is stored with description "Pulling weeds #yard-work" and tags "yard-work"

#### Scenario: Duplicate tags are deduplicated
- **WHEN** the user submits "#home :home"
- **THEN** the stored tags contain "home" only once

### Requirement: Display tags on entries
The system SHALL display parsed tags visually distinct from the description text in all entry views (running task display and daily log).

#### Scenario: Tags shown as chips or colored tokens
- **WHEN** an entry with tags is displayed in the UI
- **THEN** each tag is shown as a visually distinct element (e.g., a pill/chip) separate from the plain description text

### Requirement: Live tag chip preview for colon-prefix tokens while typing
The system SHALL preview tag chips in the Start Task input for both `#tag` and `:tag` token prefixes as the user types, matching the server-side normalization behavior. The chip label displays the bare tag word without its prefix.

#### Scenario: Colon-prefix token previews as chip
- **WHEN** the user types ":home" in the Start Task description field
- **THEN** a tag chip labelled "home" appears inline in the preview, identical to typing "#home"

#### Scenario: Mixed prefix tokens both preview
- **WHEN** the user types "#work :side-project" in the description field
- **THEN** chips for "work" and "side-project" both appear in the live preview
