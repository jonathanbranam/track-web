**App**: trips

## Requirements

### Requirement: Research page exists and is reachable

The trips app SHALL provide a Research page at the route `/research`, gated by authentication like the app's other pages, and reachable from the bottom navigation bar.

#### Scenario: Navigate to Research from the nav bar

- **WHEN** an authenticated user taps the "Research" item in the bottom navigation bar
- **THEN** the app navigates to `/research` and displays the Research page

#### Scenario: Research nav item reflects active state

- **WHEN** the user is on `/research`
- **THEN** the "Research" navigation item is rendered in its active style and the other nav items are in their inactive style

#### Scenario: Unauthenticated access is blocked

- **WHEN** an unauthenticated user attempts to load `/research`
- **THEN** the app redirects to the login flow rather than rendering research content

### Requirement: Render research content as GFM Markdown

The Research page SHALL render the current trip's research Markdown using the existing GFM-capable renderer, including GitHub-flavored tables, links, lists, and inline emphasis. Tables and headings SHALL be styled to be legible on the dark theme, and wide tables SHALL be horizontally scrollable rather than overflowing the layout.

#### Scenario: Markdown is rendered as formatted content

- **WHEN** the current trip has research Markdown containing headings, paragraphs, lists, and links
- **THEN** the page renders them as formatted HTML, and links open in a new tab

#### Scenario: GFM tables render legibly

- **WHEN** the research Markdown contains a GFM table
- **THEN** the table renders as a styled table readable on the dark background

#### Scenario: Wide tables scroll horizontally

- **WHEN** a rendered table is wider than the page content column
- **THEN** the table scrolls horizontally within its container without breaking the page layout

### Requirement: Dynamic table of contents from H2/H3 headings

The Research page SHALL display, above the content, a table of contents generated dynamically from the H2 (`##`) and H3 (`###`) headings of the rendered research Markdown, in document order. H3 entries SHALL be visually nested under their parent H2. The table of contents SHALL reflect whatever headings exist in the content, with no hardcoded section list.

#### Scenario: TOC lists the content's H2 and H3 headings

- **WHEN** the research Markdown contains H2 and H3 headings
- **THEN** the table of contents lists an entry for each H2 and H3 heading, in the same order they appear, with H3 entries nested under their parent H2

#### Scenario: TOC ignores deeper and shallower headings

- **WHEN** the research Markdown contains an H1 (`#`) title and H4+ (`####`) headings in addition to H2/H3
- **THEN** the table of contents includes only the H2 and H3 headings

#### Scenario: Tapping a TOC entry scrolls to its section

- **WHEN** the user taps a table-of-contents entry
- **THEN** the page scrolls to the corresponding heading

### Requirement: Stable heading anchors

Each rendered H2 and H3 heading SHALL have a stable, unique `id` anchor derived from its text, and each table-of-contents entry's link SHALL target the matching heading `id`. Headings with identical text SHALL still receive distinct ids so that every TOC entry resolves to exactly one heading.

#### Scenario: TOC link resolves to its heading

- **WHEN** a table-of-contents entry links to a heading id
- **THEN** an element with that id exists in the rendered content at the corresponding heading

#### Scenario: Duplicate heading text yields distinct anchors

- **WHEN** two headings have identical text
- **THEN** each heading receives a distinct id and each corresponding TOC entry links to a different one

### Requirement: Per-section return-to-top control

Each rendered H2 and H3 heading SHALL include a small "return to top" control. Activating it SHALL scroll the page back to the top of the page / table of contents.

#### Scenario: Return to top from a section

- **WHEN** the user has scrolled down to a section and activates that section's "return to top" control
- **THEN** the page scrolls back to the top where the table of contents is shown

### Requirement: Empty research content state

When the current trip has no research Markdown, the Research page SHALL display a friendly empty state rather than an empty table of contents or a blank page.

#### Scenario: Trip has no research content

- **WHEN** the current trip's research Markdown is missing or empty
- **THEN** the Research page shows an empty-state message and does not render a table of contents

### Requirement: Persist and serve trip research Markdown

The system SHALL store research Markdown per trip and expose it through the trips API. The current-trip response SHALL include the research Markdown as `researchMarkdown`, and the trip create and update endpoints SHALL accept and persist `researchMarkdown`. Trips without research content SHALL return a null/empty value without error.

#### Scenario: Current trip response includes research content

- **WHEN** a client requests the current trip and that trip has research Markdown stored
- **THEN** the response includes the stored content as `researchMarkdown`

#### Scenario: Update persists research content

- **WHEN** a client updates a trip with a `researchMarkdown` value
- **THEN** the value is persisted and returned on the next current-trip request

#### Scenario: Trip without research content

- **WHEN** a client requests a trip that has no research Markdown stored
- **THEN** the response returns a null/empty `researchMarkdown` without error
