**App**: talks

## ADDED Requirements

### Requirement: Save-file screen via showSaveFile
The system SHALL provide a `showSaveFile` action carrying a `summary` string, which sets the resting state's full-screen overlay to a distinct `'save-file'` kind reusing the existing overlay mechanism (per `battle`'s `defeatSequence` precedent: a distinct overlay kind, not a new component or resting-state field). The existing `hideOverlay` action SHALL clear it; no separate `hideSaveFile` action SHALL exist.

#### Scenario: showSaveFile displays a distinct full-screen card
- **WHEN** a `showSaveFile` action executes with an authored `summary`
- **THEN** a full-screen save-file card displays that summary, visually distinct from the `act-card`/`headline`/`title`/`defeat` overlay kinds

#### Scenario: hideOverlay clears the save-file card
- **WHEN** a `hideOverlay` action executes while the resting state's overlay is the `'save-file'` kind
- **THEN** the overlay becomes `null`

### Requirement: Achievement toasts via showAchievement/hideAchievement
The system SHALL provide a `showAchievement` action carrying `text`, which sets an independent `RestingState.achievement` field to `{ text }`, and a `hideAchievement` action that unconditionally clears it to `null`. Because `achievement` is independent of the `ui` and `overlay` slots, an achievement toast SHALL be able to display concurrently with any active dialogue, menu, or overlay content without displacing it.

#### Scenario: showAchievement pops a toast alongside existing dialogue/overlay content
- **WHEN** a `showAchievement` action executes while the resting state's `ui` is an active dialogue and/or `overlay` is a headline card
- **THEN** the achievement toast displays with its authored text, and the existing dialogue/overlay content remains unchanged

#### Scenario: hideAchievement clears the toast
- **WHEN** a `hideAchievement` action executes
- **THEN** the resting state's `achievement` field becomes `null`

### Requirement: Meta-shell state reconstructs deterministically
The system SHALL include the save-file overlay content and the `achievement` field in the resting-state snapshot such that `snapTo`/`back`/`skipTo` reconstruct exactly what the deterministic precompute pass computed, with no dependency on replaying intervening `showSaveFile`/`showAchievement`/`hideAchievement` actions.

#### Scenario: Skipping directly to a checkpoint mid-achievement reproduces the toast
- **WHEN** `skipTo(i)` jumps directly to a checkpoint where `achievement` is non-null, without passing through the `showAchievement` action live
- **THEN** the achievement toast displays the exact text the precompute pass recorded for checkpoint `i`, identical to reaching it via live playback

#### Scenario: back() across a save-file checkpoint lands the correct overlay with no stale content
- **WHEN** `back()` applies a resting-state checkpoint whose overlay differs from the currently displayed `'save-file'` card
- **THEN** the overlay immediately matches the new checkpoint's value, with nothing carried over from the previously displayed card

### Requirement: Title/start screen composed from Established vocabulary
The system SHALL demonstrate a title/start screen using only already-Established `showOverlay` (`kind: 'title'`) and `showMenu` (`menuKind: 'command'`) actions composed together, requiring no new action type — the title card and the command menu SHALL be able to display simultaneously, since `overlay` and `ui` are independent resting-state slots.

#### Scenario: Title screen composes existing primitives with no new action type
- **WHEN** a script runs `showOverlay` with `kind: 'title'` followed by `showMenu` with `menuKind: 'command'` and a single selectable option
- **THEN** the resting state shows the title card and the command menu at the same time, using only actions already Established before this capability existed
