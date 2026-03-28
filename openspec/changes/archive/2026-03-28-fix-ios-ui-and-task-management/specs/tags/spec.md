## ADDED Requirements

### Requirement: Live tag chip preview for colon-prefix tokens while typing
The system SHALL preview tag chips in the Start Task input for both `#tag` and `:tag` token prefixes as the user types, matching the server-side normalization behavior. The chip label displays the bare tag word without its prefix.

#### Scenario: Colon-prefix token previews as chip
- **WHEN** the user types ":home" in the Start Task description field
- **THEN** a tag chip labelled "home" appears inline in the preview, identical to typing "#home"

#### Scenario: Mixed prefix tokens both preview
- **WHEN** the user types "#work :side-project" in the description field
- **THEN** chips for "work" and "side-project" both appear in the live preview
