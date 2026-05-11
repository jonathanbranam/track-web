**App**: client-watch

## ADDED Requirements

### Requirement: Browse link to Movie Catalog
The Ratings page SHALL display a "Browse →" link in the top-right corner of the page header that navigates to `/movies/catalog`.

#### Scenario: Browse link is visible on Ratings page
- **WHEN** the user navigates to `/ratings`
- **THEN** a "Browse →" link is visible in the top-right of the page header

#### Scenario: Browse link navigates to Movie Catalog
- **WHEN** the user taps the "Browse →" link
- **THEN** the app navigates to `/movies/catalog`
