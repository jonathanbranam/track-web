**App**: talks

## ADDED Requirements

### Requirement: Interstitial select screen on load
The system SHALL show an interstitial select screen, listing every script registered in the `script-library` capability by display name, when the `engineering-with-ai` talk is loaded with no script selected. The system SHALL NOT start playback of any script until one is selected. This screen SHALL be reachable in production, not gated to development builds.

#### Scenario: Loading the talk with no script selected shows the picker
- **WHEN** the presenter navigates to the `engineering-with-ai` talk with no script chosen
- **THEN** the select screen renders, listing every registered script's display name, and no `talk-rpg` playback begins

#### Scenario: The picker is reachable in production
- **WHEN** the app is running as a production build
- **THEN** the select screen still renders exactly as it does in development

### Requirement: Selecting a script loads it and updates the URL
The system SHALL, when the presenter selects a script from the list, load that script's `Action[]` and `initialSceneId` into the `talk-rpg` experience, and SHALL navigate to a URL that identifies the selected script by its id.

#### Scenario: Selecting a script starts playback
- **WHEN** the presenter selects a script named `"Test Script"` from the list
- **THEN** the `talk-rpg` experience mounts running that script's `Action[]`, starting from its `initialSceneId`

#### Scenario: The URL reflects the selected script
- **WHEN** the presenter selects a script with id `test-script`
- **THEN** the browser URL changes to include `test-script`, without a full page reload

### Requirement: Navigating back to the select screen
The system SHALL provide a way, both via the browser's Back navigation and via a control inside the running experience, to return to the select screen from a loaded script.

#### Scenario: Browser Back returns to the select screen
- **WHEN** the presenter has selected a script and then uses the browser's Back navigation
- **THEN** the select screen renders again, with no script running

#### Scenario: An in-experience control returns to the select screen
- **WHEN** the presenter activates the "back to scripts" control while a script is running
- **THEN** the select screen renders, with no script running, and the URL no longer identifies a selected script

### Requirement: Unresolvable script id falls back to the select screen
The system SHALL, when the URL identifies a script id that is not in the registry, render the select screen rather than a not-found page.

#### Scenario: An unknown script id in the URL shows the picker
- **WHEN** the presenter navigates directly to a URL naming a script id that does not exist in the registry
- **THEN** the select screen renders instead of a not-found page
