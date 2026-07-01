**App**: talks

## ADDED Requirements

### Requirement: Talks landing page
The talks app SHALL render a landing page at the root route (`/`) that displays a list of cards, one per talk. Each card SHALL show the talk's title, a short description, and SHALL link to that talk's page. Cards SHALL open in the same tab.

#### Scenario: Landing page lists talk cards
- **WHEN** a visitor navigates to `talks.branam.us/`
- **THEN** the page renders one card per talk, each showing the talk title and a short description

#### Scenario: Card links to talk page
- **WHEN** a visitor clicks a talk card
- **THEN** the browser navigates to that talk's page within the app

### Requirement: Per-talk page
The talks app SHALL provide a per-talk route (e.g. `/talks/:slug`) that renders the content for a single talk, including its title. Each talk on the landing page SHALL have a corresponding talk page.

#### Scenario: Talk page renders content
- **WHEN** a visitor navigates to a talk's route
- **THEN** the app renders that talk's page with its title and content

#### Scenario: Unknown talk slug
- **WHEN** a visitor navigates to a talk route whose slug does not match any talk
- **THEN** the app renders a not-found state rather than a blank page

### Requirement: Seed first talk
The talks directory SHALL include an initial talk titled **"Developing with AI and My Story of Learning to Be an Engineer and Using AI Coding Agents"** with a short description on its card and a corresponding talk page.

#### Scenario: First talk appears on landing page
- **WHEN** a visitor views the landing page
- **THEN** a card for "Developing with AI and My Story of Learning to Be an Engineer and Using AI Coding Agents" is displayed with a short description and a link to its page

#### Scenario: First talk has a page
- **WHEN** a visitor opens the first talk's card link
- **THEN** the app renders the talk page for "Developing with AI and My Story of Learning to Be an Engineer and Using AI Coding Agents"
