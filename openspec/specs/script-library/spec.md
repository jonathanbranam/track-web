**App**: talks

## Purpose

The script library is the convention and lookup mechanism for defining multiple named scripts under `client-talks/src/talk-rpg`, each built from the shared types/constants in `script.ts`, and registered so they can be found by name.

## Requirements

### Requirement: Multiple named scripts
The system SHALL support registering more than one named script for the `talk-rpg` engine, where each script is a plain `Action[]` (as defined by the `talk-director` capability) paired with a display name, a URL-safe id, and an initial scene id. The system SHALL ship with at least one registered script, named `"Test Script"` (id `test-script`), which is the existing action list used for evaluating engine capabilities rather than the talk's real content.

#### Scenario: Multiple scripts are registered
- **WHEN** the script registry is loaded
- **THEN** it exposes two or more entries, each with a unique id, a display name, an `Action[]`, and an initial scene id

#### Scenario: The existing script is preserved as "Test Script"
- **WHEN** the script registry is loaded
- **THEN** one entry has id `test-script` and name `"Test Script"`, and its `Action[]` is unchanged from the engine-capability proving script that previously shipped as the sole script

### Requirement: Flexible script file organization
The system SHALL allow a script's `Action[]` to be defined either inline in the registry file or in a separate file, so authors can add a small script without creating a new file or split a larger one into its own module.

#### Scenario: A script is defined inline
- **WHEN** a script's `Action[]` is written directly as a constant in the registry file
- **THEN** the registry includes it as a valid, playable script

#### Scenario: A script is defined in a separate file
- **WHEN** a script's `Action[]` is authored in its own file under a subfolder and imported into the registry
- **THEN** the registry includes it as a valid, playable script, identical in behavior to an inline-defined script

### Requirement: TypeScript or JSON authoring
The system SHALL allow a script's `Action[]` to be authored either as TypeScript (importing shared types/constants from the engine's shared module) or as a plain JSON file.

#### Scenario: A script is authored in TypeScript
- **WHEN** a script file is a `.ts` module that imports `Action` (and any other needed types/constants) from the shared engine module and exports an `Action[]`
- **THEN** the registry accepts it without redefining any shared type

#### Scenario: A script is authored in JSON
- **WHEN** a script file is a `.json` file containing a plain array of action objects
- **THEN** the registry accepts it as that script's `Action[]`

### Requirement: Shared types and constants stay in one module
The system SHALL keep the `Action` type (and its member action types), `GameMap`, map-loading helpers, and the map registry in the engine's existing shared module (`script.ts`), and SHALL NOT duplicate these definitions in any individual script file.

#### Scenario: A TypeScript-authored script imports shared types
- **WHEN** a new TypeScript script file is added
- **THEN** it imports `Action` (and any other types/constants it needs) from the shared module rather than declaring its own copies

#### Scenario: The shared module no longer owns a single script
- **WHEN** the shared module (`script.ts`) is inspected
- **THEN** it exports the shared types/constants/maps but does not itself export "the" script — scripts live in the registry described above
