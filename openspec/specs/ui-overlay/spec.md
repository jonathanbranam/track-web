**App**: talks

## Purpose

The `ui-overlay` capability is the DOM overlay layer for the talk RPG experience: React components positioned above the Phaser canvas that render all readable content — dialogue boxes and talk bubbles, the on-rails command/status menu shell, and full-screen/overlaid text cards — driven directly by the `talk-director` capability's current resting state (`resting.ui`/`resting.overlay`), plus world-anchored positioning for elements that track a world-space entity as the camera moves. It also owns the Zoom-codec legibility bar this layer exists to satisfy. The status screen's real stat content is sourced from the `entity-stats` capability's `showStatus` action; this capability owns only the screen's shape and legibility.

## Requirements

### Requirement: DOM overlay layer driven by resting state
The system SHALL render dialogue boxes, the command/status menu shell, and full-screen/overlaid text cards as React DOM elements positioned above the Phaser canvas (`z-index` above the canvas, `pointer-events: none` except explicit interactive controls), with their content read directly from the Director's current resting state (`resting.ui`, `resting.overlay`) via `useDirector()`. The overlay content SHALL NOT hold independent state, poll, or write to the DOM outside React's render cycle.

#### Scenario: Overlay content matches the current resting state
- **WHEN** the Director's current resting state has a non-`none` `ui` or a non-null `overlay` value
- **THEN** the overlay renders the corresponding dialogue box, menu, or text card with that value's content, with no independent overlay-only state

#### Scenario: Overlay clears when resting state clears
- **WHEN** the Director's current resting state has `ui: { kind: 'none' }` and `overlay: null`
- **THEN** the overlay renders no dialogue box, menu, or text card

#### Scenario: back() and skipTo() land the overlay correctly with no stale content
- **WHEN** `back()` or `skipTo(i)` applies a resting-state checkpoint whose `ui`/`overlay` differ from what was previously displayed
- **THEN** the overlay immediately matches the new checkpoint's `ui`/`overlay` values, with nothing carried over from the previously displayed checkpoint

### Requirement: Active UI is a single resting-state slot
The system SHALL represent the dialogue box and the command/status menu as one `resting-state.ui` tagged union — `{ kind: 'none' }`, `{ kind: 'dialogue'; speaker; text; variant: 'say' | 'thought' }`, `{ kind: 'menu'; menuKind: 'command'; options; selectedIndex }`, or `{ kind: 'menu'; menuKind: 'status'; entity; stats; options; selectedIndex }` — never as independently-toggleable dialogue and menu fields. `startDialogue`/`say`/`endDialogue`/`thought` and `showMenu`/`selectMenuOption`/`hideMenu` SHALL each set or clear the dialogue/command variants; the `entity-stats` capability's `showStatus` action SHALL set the status variant.

#### Scenario: Dialogue and menu are never both active
- **WHEN** a `showMenu` action executes while `resting-state.ui` is `{ kind: 'dialogue'; ... }`
- **THEN** `resting-state.ui` becomes `{ kind: 'menu'; ... }` and the previously-open dialogue box is no longer shown

#### Scenario: endDialogue clears the active-UI slot
- **WHEN** an `endDialogue` action executes while `resting-state.ui` is `{ kind: 'dialogue'; ... }`
- **THEN** `resting-state.ui` becomes `{ kind: 'none' }`

### Requirement: Full-screen text cards are an independent overlay slot
The system SHALL represent full-screen/overlaid text cards as `resting-state.overlay: { kind: 'act-card' | 'headline' | 'title'; text } | null`, a slot independent of `resting-state.ui`. `showOverlay` SHALL set this slot and `hideOverlay` SHALL clear it, without affecting the `ui` slot's current value.

#### Scenario: showOverlay does not clear an open dialogue or menu
- **WHEN** a `showOverlay` action executes while `resting-state.ui` is `{ kind: 'dialogue'; ... }`
- **THEN** `resting-state.overlay` is set to the card's content and `resting-state.ui` remains unchanged

#### Scenario: hideOverlay clears only the overlay slot
- **WHEN** a `hideOverlay` action executes
- **THEN** `resting-state.overlay` becomes `null` and `resting-state.ui` is unaffected

### Requirement: Dialogue boxes and talk bubbles
The system SHALL render a styled dialogue box for `resting-state.ui`'s `kind: 'dialogue'` variant `'say'`, and a visually distinct thought-bubble style for the `'thought'` variant, each showing the active `speaker` (when set) and `text`. The system SHALL provide `startDialogue`, `say`, `endDialogue`, and `thought` actions that set/update/clear this slot.

#### Scenario: say renders as a dialogue box
- **WHEN** a `say` action executes with text `"Hello, traveler."`
- **THEN** the overlay renders a dialogue box showing that text

#### Scenario: thought renders as a thought bubble
- **WHEN** a `thought` action executes for an entity
- **THEN** the overlay renders a visually distinct thought-bubble variant of the dialogue box, anchored to that entity, showing its text

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

### Requirement: Full-screen and overlaid text cards
The system SHALL render `resting-state.overlay`'s `act-card`, `headline`, and `title` kinds as full-screen or overlaid DOM text cards showing the slot's `text`. The system SHALL provide `showOverlay` and `hideOverlay` actions to set and clear this slot.

#### Scenario: showOverlay displays a headline card
- **WHEN** a `showOverlay` action executes with `kind: 'headline'` and text
- **THEN** the overlay renders a full-screen or overlaid headline card showing that text

### Requirement: World-anchored overlay positioning
The system SHALL provide a mechanism (`useWorldAnchor(entityId)`) for an overlay element to track a world-space entity's on-screen position as the Phaser camera moves, scrolls, or pans, updating at animation-frame rate rather than only on discrete resting-state changes. The mechanism SHALL write only an imperative CSS transform (never a per-frame React re-render) and SHALL derive the screen position from Phaser's own camera/entity transform (via a registry-exposed query), not by reimplementing tile-to-pixel conversion against `resting-state.camera`'s tile-space values in React.

#### Scenario: Anchored bubble tracks the camera during a walk
- **WHEN** an entity with an anchored dialogue/thought bubble is mid-`walk` and the camera is following it
- **THEN** the bubble's on-screen position updates continuously in step with the camera, with no visible lag or discrete jump between resting-state updates

#### Scenario: Anchored bubble snaps correctly on back/skipTo
- **WHEN** `back()` or `skipTo(i)` applies a resting-state checkpoint
- **THEN** the anchored bubble's position immediately matches its entity's position at that checkpoint, with no stale position from before the jump

### Requirement: Action vocabulary promotion
The system SHALL promote `showOverlay`, `hideOverlay`, `showMenu`, `selectMenuOption`, and `hideMenu` from Proposed to Established in `action-vocabulary.md`, with the shapes defined in this capability's design.

#### Scenario: Promoted actions match their established shapes
- **WHEN** `action-vocabulary.md` is checked after this change
- **THEN** `showOverlay`, `hideOverlay`, `showMenu`, `selectMenuOption`, and `hideMenu` are listed under Established actions with the shapes this capability implements

### Requirement: Zoom-codec legibility validation
The system's dialogue boxes, command/status menus, and text cards SHALL be validated against an actual Zoom re-encode of the shared browser window (a recording or a second viewer), not only the local canvas — confirming large type, high contrast, and that overlay entrance/exit motion and the menu-highlight transition do not smear under compression.

#### Scenario: Legibility pass covers all new overlay content
- **WHEN** the legibility pass is run
- **THEN** a dialogue box, a command menu, a status screen, and a text card are each checked against a Zoom re-encode for text crispness and motion clarity, and any smearing found is corrected before this change is considered done
