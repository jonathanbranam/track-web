## ADDED Requirements

### Requirement: iOS safe area inset for page content
The system SHALL apply `env(safe-area-inset-top)` top padding to authenticated page content containers so that headings and content are never obscured by the iOS status bar or Dynamic Island.

#### Scenario: Content clears iOS status bar
- **WHEN** the app is viewed on an iPhone with a notch or Dynamic Island
- **THEN** page headings and content begin below the system status bar area

#### Scenario: Safe area applied via shared container
- **WHEN** any authenticated route is rendered
- **THEN** the shared scrollable content wrapper carries the safe-area top padding, requiring no per-page changes
