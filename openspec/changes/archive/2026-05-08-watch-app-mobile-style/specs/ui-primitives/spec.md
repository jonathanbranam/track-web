**App**: all

## ADDED Requirements

### Requirement: SegmentedControl component in packages/ui
The system SHALL provide a `SegmentedControl` component exported from `packages/ui`. It SHALL render a horizontal strip of selectable tab options and reflect the currently selected option visually. It SHALL accept no app-specific styling assumptions; accent color SHALL be supplied by the consuming app via props or CSS.

#### Scenario: Selected option is visually distinguished
- **WHEN** a `SegmentedControl` is rendered with a selected value
- **THEN** the selected option is visually distinguished from unselected options

#### Scenario: Selecting an option calls the change handler
- **WHEN** the user taps an unselected option in a `SegmentedControl`
- **THEN** the change handler is called with the new value

#### Scenario: Component is consumable from both client apps
- **WHEN** `SegmentedControl` is imported from `packages/ui` in either `client-time` or `client-watch`
- **THEN** it renders correctly and functions as expected in both apps

### Requirement: LoadingSpinner component in packages/ui
The system SHALL provide a `LoadingSpinner` component exported from `packages/ui`. It SHALL render a centered, animated spinner suitable for indicating an in-progress async operation. It SHALL accept no app-specific color assumptions.

#### Scenario: Spinner renders and animates
- **WHEN** `LoadingSpinner` is rendered
- **THEN** an animated spinner is visible on screen

#### Scenario: Component is consumable from both client apps
- **WHEN** `LoadingSpinner` is imported from `packages/ui` in either `client-time` or `client-watch`
- **THEN** it renders correctly in both apps

### Requirement: Badge component in packages/ui
The system SHALL provide a `Badge` component exported from `packages/ui`. It SHALL render a pill-shaped label suitable for tags, genres, or other categorical metadata. It SHALL accept a color variant so consuming apps can apply their own accent color. It SHALL serve as the implementation backing `client-time`'s `TagChip` and `client-watch`'s genre/type chips.

#### Scenario: Badge renders as a pill with provided color variant
- **WHEN** a `Badge` is rendered with a given color variant
- **THEN** it displays as a rounded pill using the colors appropriate for that variant

#### Scenario: TagChip behavior is preserved in client-time
- **WHEN** `client-time` renders a tag using the `Badge` component (directly or via a `TagChip` wrapper)
- **THEN** the visual output is identical to the previous `TagChip` rendering

#### Scenario: Component is consumable from both client apps
- **WHEN** `Badge` is imported from `packages/ui` in either `client-time` or `client-watch`
- **THEN** it renders correctly in both apps

### Requirement: Button component in packages/ui
The system SHALL provide a `Button` component exported from `packages/ui`. It SHALL support primary, secondary, and danger variants, and SHALL render correctly in loading and disabled states. It SHALL replace the repeated inline button class patterns across both apps.

#### Scenario: Primary variant is visually prominent
- **WHEN** a `Button` is rendered with the primary variant
- **THEN** it is rendered with filled background styling that signals it is the main action

#### Scenario: Secondary variant is visually subdued
- **WHEN** a `Button` is rendered with the secondary variant
- **THEN** it is rendered with a less prominent style than the primary variant

#### Scenario: Danger variant signals a destructive action
- **WHEN** a `Button` is rendered with the danger variant
- **THEN** it is rendered in a color that signals a destructive or irreversible action

#### Scenario: Loading state prevents interaction
- **WHEN** a `Button` is rendered in the loading state
- **THEN** the button is non-interactive and displays a loading indicator in place of or alongside the label

#### Scenario: Disabled state prevents interaction
- **WHEN** a `Button` is rendered in the disabled state
- **THEN** the button is non-interactive and visually communicates that it is unavailable

#### Scenario: Component is consumable from both client apps
- **WHEN** `Button` is imported from `packages/ui` in either `client-time` or `client-watch`
- **THEN** it renders correctly in both apps

### Requirement: TextInput component in packages/ui
The system SHALL provide a `TextInput` component exported from `packages/ui`. It SHALL render a labeled text input with support for an error message and SHALL forward all standard HTML input attributes to the underlying element. It SHALL replace the repeated input styling patterns across both apps.

#### Scenario: Label is rendered above the input
- **WHEN** a `TextInput` is rendered with a label
- **THEN** the label is displayed above the input field

#### Scenario: Error message is rendered below the input
- **WHEN** a `TextInput` is rendered with an error message
- **THEN** the error message is displayed below the input field in an error style

#### Scenario: Native input attributes are forwarded
- **WHEN** a `TextInput` is rendered with standard HTML input attributes (e.g., `type`, `placeholder`, `value`, `onChange`)
- **THEN** those attributes are applied to the underlying `<input>` element

#### Scenario: Component is consumable from both client apps
- **WHEN** `TextInput` is imported from `packages/ui` in either `client-time` or `client-watch`
- **THEN** it renders correctly in both apps
