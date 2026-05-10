**App**: client-proto

## Purpose

Defines how prototypes are registered, listed, routed, and removed in `client-proto`. Covers the central registry, picker screen, subfolder URL routing, browser-back navigation, prototype self-containment rules, and the archiving workflow.

## Requirements

### Requirement: Central prototype registry
The app SHALL maintain a typed registry at `src/registry.ts` that exports an array of prototype descriptors. Each descriptor SHALL include a machine-readable name (kebab-case), a human-readable label, and the prototype's React component. Adding a prototype requires adding an entry; removing (archiving) a prototype requires deleting the entry and its folder.

#### Scenario: Registry drives the picker
- **WHEN** the registry contains one or more entries
- **THEN** the picker screen displays exactly those entries, in registration order

#### Scenario: Empty registry
- **WHEN** the registry contains no entries
- **THEN** the picker screen displays an empty state message

### Requirement: Picker screen at root route
The app SHALL render a picker screen at `/` that lists all registered prototypes as full-width tappable rows. Each row SHALL display the prototype's label. The picker SHALL fill the viewport with mobile-safe padding applied at top and bottom.

#### Scenario: Tapping a prototype navigates to it
- **WHEN** the user taps a prototype row on the picker screen
- **THEN** the browser navigates to `/proto/<name>/`

#### Scenario: Picker is the entry point
- **WHEN** the user opens the root URL of the proto app
- **THEN** the picker screen is shown without any intermediate redirect or splash

### Requirement: Prototype routing via subfolder URLs
Each prototype SHALL be served at the URL path `/proto/<name>/`. React Router SHALL match this pattern and render the corresponding component from the registry. Any unrecognised path SHALL redirect to the picker.

#### Scenario: Direct URL loads prototype
- **WHEN** the user navigates directly to `/proto/<name>/`
- **THEN** the prototype component for `<name>` is rendered

#### Scenario: Unknown path falls back to picker
- **WHEN** the user navigates to a path that does not match any registered prototype
- **THEN** the app redirects to `/`

### Requirement: Browser back returns to picker
Navigation from the picker to a prototype SHALL use standard browser history push so that the browser back gesture or button returns the user to the picker screen.

#### Scenario: Back from prototype
- **WHEN** the user is viewing a prototype at `/proto/<name>/` and triggers browser back
- **THEN** the picker screen is shown and the prototype is no longer rendered

### Requirement: Self-contained prototype files
Each prototype SHALL be a single React component located at `src/prototypes/<name>/index.tsx`. The file SHALL only import from `react`, `react-dom`, browser-native APIs, and Tailwind CSS utility classes. It SHALL NOT import from `@packages/*`, from `src/` paths outside its own directory, or from other prototype directories.

#### Scenario: Prototype renders in isolation
- **WHEN** a prototype component is mounted
- **THEN** it renders correctly using only its own internal state and props, with no dependency on shared context or global stores

#### Scenario: No cross-prototype imports
- **WHEN** a prototype file is inspected
- **THEN** there are no import paths that reference another prototype's directory

### Requirement: Prototype archiving
A prototype SHALL be fully removable by: (1) deleting its entry from `src/registry.ts`, and (2) deleting its `src/prototypes/<name>/` directory. After these two steps, no other files SHALL require modification and the app SHALL build and run correctly.

#### Scenario: App builds after archive
- **WHEN** a prototype's registry entry and folder are deleted
- **THEN** the app builds without errors and the picker no longer lists the archived prototype
