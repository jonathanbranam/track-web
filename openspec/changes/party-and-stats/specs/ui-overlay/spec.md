**App**: talks

## MODIFIED Requirements

### Requirement: On-rails command/status menu shell
The system SHALL render a command window for `resting-state.ui`'s `kind: 'menu'; menuKind: 'command'` variant, and a status/inspection screen for `kind: 'menu'; menuKind: 'status'` variant, each showing its `options` and a selection highlight at `selectedIndex`. The system SHALL provide `showMenu`, `selectMenuOption`, and `hideMenu` actions for the command variant; `selectMenuOption` SHALL move the highlight to an authored index with no real input handling. The status variant SHALL be opened only via the `entity-stats` capability's `showStatus` action (not `showMenu`), which supplies its real, authored stat content — `showMenu`'s `menuKind` is limited to `'command'`.

#### Scenario: showMenu opens a command window
- **WHEN** a `showMenu` action executes with `menuKind: 'command'` and a list of options
- **THEN** the overlay renders a command window listing those options with the initial selection highlighted

#### Scenario: selectMenuOption moves the highlight as a discrete step
- **WHEN** a `selectMenuOption` action executes targeting a different option index
- **THEN** the selection highlight moves to that option using a single, fixed 150ms transition — not a continuous slide whose duration scales with distance moved

#### Scenario: hideMenu closes the menu
- **WHEN** a `hideMenu` action executes, whether the open menu is the command window or the status screen
- **THEN** `resting-state.ui` becomes `{ kind: 'none' }` and the menu is no longer shown

#### Scenario: Status screen shows real stat content, not placeholder text
- **WHEN** a `showStatus` action executes with an entity id and authored stats
- **THEN** the overlay renders the status screen showing that entity's real level/role/HP values, not placeholder text
