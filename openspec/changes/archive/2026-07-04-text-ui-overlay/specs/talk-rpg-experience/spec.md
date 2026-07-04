**App**: talks

## MODIFIED Requirements

### Requirement: React DOM overlay for all readable text
The experience SHALL render all readable text (dialogue, menus, text cards, progress indicator, in-flight status) as DOM elements in React overlay layers positioned above the entity renderer (`z-index` higher than the entities). Text SHALL be styled with Tailwind CSS. No readable presentation text SHALL be rendered via a Phaser canvas, bitmap fonts, or Phaser text objects. Dialogue boxes, talk bubbles, the command/status menu shell, and full-screen/overlaid text cards SHALL follow the `ui-overlay` capability's concrete contract (reading `resting-state.ui`/`resting-state.overlay`, world-anchored positioning, and the Zoom-codec legibility bar) rather than the generic scaffold-era placeholder text this requirement previously described. The existing `Overlay.tsx` presenter control bar (checkpoint counter, in-flight indicator, and Back/Pause/Next/Skip/Expand/Full Screen controls) is unaffected by this change and continues to render as its own layer.

#### Scenario: Dialogue renders as a DOM dialogue box or thought bubble
- **WHEN** the current resting state's `ui` is `{ kind: 'dialogue'; ... }`
- **THEN** the overlay renders that dialogue as a styled DOM dialogue box (or thought-bubble variant), not inside any canvas

#### Scenario: No active UI clears the overlay
- **WHEN** the current resting state's `ui` is `{ kind: 'none' }` and `overlay` is `null`
- **THEN** the overlay renders no dialogue box, menu, or text card

#### Scenario: Command/status menu renders as a DOM menu shell
- **WHEN** the current resting state's `ui` is `{ kind: 'menu'; ... }`
- **THEN** the overlay renders the command window or status/inspection screen with its options and selection highlight, per the `ui-overlay` capability's contract

#### Scenario: Presenter control bar is unaffected
- **WHEN** a dialogue box, menu, or text card is shown or hidden
- **THEN** `Overlay.tsx`'s checkpoint counter and playback controls continue to render and function exactly as before, in their own layer
