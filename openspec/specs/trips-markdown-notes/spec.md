**App**: client-trips

## Purpose

Defines rendering behavior for freeform markdown text in trip note fields (`departureNotes`, `returnNotes`) on the trips Overview page.

## Requirements

### Requirement: Markdown rendered in trip notes
The trips Overview page SHALL render `departureNotes` and `returnNotes` as markdown rather than plain text. Supported syntax SHALL include bold, italic, bullet lists, numbered lists, inline code, and hyperlinks (GFM-compatible subset).

#### Scenario: Bold and italic text renders
- **WHEN** a note contains `**bold**` or `_italic_` markdown syntax
- **THEN** the rendered output displays bold or italic styled text (not the raw syntax characters)

#### Scenario: Bullet list renders
- **WHEN** a note contains lines beginning with `-` or `*`
- **THEN** the rendered output displays a styled unordered list

#### Scenario: Plain text notes are unaffected
- **WHEN** a note contains no markdown syntax
- **THEN** the rendered output displays the text as-is with no visible change from prior behavior

#### Scenario: Null notes render nothing
- **WHEN** `departureNotes` or `returnNotes` is null
- **THEN** the fallback placeholder message is shown (no component error)

### Requirement: Links open in a new tab
External hyperlinks in trip notes SHALL open in a new browser tab with `rel="noopener noreferrer"` for security.

#### Scenario: Link in note opens new tab
- **WHEN** a note contains a markdown link `[text](https://example.com)`
- **THEN** clicking the rendered link opens the URL in a new tab

### Requirement: Note markdown styling matches app theme
Rendered markdown elements SHALL use the app's dark theme color palette (gray-900 background, gray-200/white text, indigo accent for links).

#### Scenario: Rendered elements are visually consistent
- **WHEN** the Overview page displays a note with mixed markdown elements
- **THEN** all rendered elements (headings, lists, links, bold) use the dark theme and are visually distinct from surrounding UI chrome
