**App**: games

## REMOVED Requirements

### Requirement: Development-only tuning controls
**Reason**: The tuning controls now ship in every build, including production, so saved configs can be tuned on a real device against the production site.
**Migration**: Replaced by the "Tuning controls" requirement below. It has the same parameters and live-apply rules, but no production exclusion. Reset now restores the shipped defaults to the panel without touching any saved config.

## ADDED Requirements

### Requirement: Tuning controls
The game SHALL expose controls for its tuning parameters in every build, development and production alike. The controls SHALL be closed by default and opened from a settings button, and SHALL NOT cover the play area until opened. The parameters are:
- gravity strength, planet mass scale, thrust, maximum speed, gravity softening distance and ship radius
- influence zones on or off, the influence inner fraction, and gravity reach
- planet count, maximum fuel and the empty-tank grace period
- scoring base rate, proximity bonus, proximity range, star bonus and forecast distance
- starting shield charges, lethal impact speed, shield knock-away speed, along-surface kick and shield grace period
- orbit capture on or off, orbit ring height, orbit capture distance tolerance, angle tolerance and speed tolerance, and the locked-orbit scoring arc
- control mode, control deadzone and full-thrust drag distance
- edge mode

Adjustments SHALL take effect immediately on the running simulation, with two exceptions: planet count SHALL apply to the next generated layout, and starting shield charges SHALL apply from the next run. The controls SHALL offer a reset that puts every parameter back to its shipped default. A reset changes only the values in play and SHALL NOT modify any saved config.

#### Scenario: Tuning controls available in production
- **WHEN** the game runs in a production build
- **THEN** the settings button is shown, and opening it lets each parameter be adjusted

#### Scenario: Controls closed by default
- **WHEN** the game is opened
- **THEN** the tuning controls are closed and only the settings button is visible over the play area

#### Scenario: Adjustments apply live
- **WHEN** gravity strength is changed during an active run
- **THEN** the ship's motion reflects the new value without restarting the run

#### Scenario: Control and edge modes switch live
- **WHEN** the control mode, edge mode or influence-zone toggle is changed during an active run
- **THEN** the next press, or the next edge crossing, follows the newly selected mode without restarting the run

#### Scenario: Planet count applies to the next layout
- **WHEN** planet count is changed during an active run
- **THEN** the current layout is unchanged and the new count takes effect when a new layout is generated

#### Scenario: Reset restores shipped defaults without saving
- **WHEN** the reset control is used
- **THEN** every tuning parameter returns to its shipped default value, and no saved config changes

### Requirement: Saved tuning configs
The game SHALL store named tuning configs on the server, shared by all players. Every signed-in player SHALL be able to:
- **create** a new config with a name, holding the values currently in play
- **rename** any config except the Default
- **save** the values currently in play over any config
- **delete** any config except the Default, after confirming

Config names SHALL be non-empty after trimming, at most 40 characters, and unique regardless of case. A create or rename that breaks these rules SHALL be refused with a message, and nothing SHALL change. A stored config SHALL be applied over the shipped defaults, so a parameter the config does not hold, or holds with the wrong type, takes its shipped default value. The controls SHALL show when the values in play differ from the selected config's saved values, and SHALL offer to revert to the saved values.

#### Scenario: Create a config from current values
- **WHEN** a player adjusts thrust and creates a config named "Floaty"
- **THEN** "Floaty" appears in the config list holding the adjusted thrust, and it becomes the selected config

#### Scenario: Duplicate name refused
- **WHEN** a player creates or renames a config to "floaty" while a config named "Floaty" exists
- **THEN** the action is refused with a message that the name is taken, and no config changes

#### Scenario: Rename a config
- **WHEN** a player renames "Floaty" to "Low Gravity"
- **THEN** the config list shows "Low Gravity" with the same saved values

#### Scenario: Save over a non-default config
- **WHEN** a player has "Low Gravity" selected, changes gravity strength, and saves
- **THEN** "Low Gravity" holds the new gravity strength for every player who loads it afterwards, and no confirmation is asked

#### Scenario: Unsaved changes are indicated
- **WHEN** a player changes a parameter so it no longer matches the selected config's saved value
- **THEN** the controls show that there are unsaved changes

#### Scenario: Revert unsaved changes
- **WHEN** the player chooses to revert
- **THEN** every parameter returns to the selected config's saved value, and the unsaved-changes indicator clears

#### Scenario: Delete a config
- **WHEN** a player deletes "Low Gravity" and confirms
- **THEN** "Low Gravity" is removed from the config list for every player

#### Scenario: Parameter missing from a stored config
- **WHEN** a config saved before a parameter existed is loaded
- **THEN** that parameter takes its shipped default value and every other parameter takes its saved value

### Requirement: Protected Default config
A config marked as the Default SHALL always exist. On a fresh database it SHALL start out equal to the shipped default parameters. It is what a player with no selection gets. Saving over the Default SHALL first ask for confirmation with the message "This will replace the default config for all players", and SHALL NOT save unless the player confirms. The Default SHALL NOT be deleted or renamed. The controls SHALL NOT offer these actions for it, and the server SHALL refuse them.

#### Scenario: Default exists on a fresh install
- **WHEN** the game loads its configs against a new database
- **THEN** a config named "Default" is listed, and its values equal the shipped defaults

#### Scenario: Saving over the Default asks for confirmation
- **WHEN** a player with the Default selected saves
- **THEN** a confirmation reading "This will replace the default config for all players" is shown before anything is saved

#### Scenario: Confirmed save replaces the Default
- **WHEN** the player confirms that prompt
- **THEN** the Default holds the new values, and a new player afterwards starts with them

#### Scenario: Cancelled save leaves the Default unchanged
- **WHEN** the player cancels that prompt
- **THEN** the Default's saved values are unchanged, and the values in play stay as the player set them, marked as unsaved

#### Scenario: Default cannot be deleted or renamed
- **WHEN** the Default is the selected config
- **THEN** no delete or rename action is offered, and a delete or rename request for it sent directly to the server is refused

### Requirement: Per-browser config selection
The controls SHALL offer a dropdown listing every saved config, with the Default first. Choosing a config SHALL apply its values under the same live-apply rules as individual adjustments, except that a choice made while the run is waiting for its first press SHALL regenerate the layout so the chosen planet count takes effect at once. If there are unsaved changes, choosing another config SHALL first ask for confirmation to discard them. The choice SHALL be remembered in that browser and used for later games. When the game is opened, it SHALL finish loading the configs before starting, showing a loading state until then. It SHALL NOT generate a layout or accept a launch with any parameters other than the selected config's. It SHALL then start with the remembered config. If there is none, or the remembered config no longer exists, the game SHALL start with the Default and clear the remembered choice. If the configs cannot be loaded, whether the request fails or takes more than 8 seconds, the game SHALL start with the shipped default parameters and still be playable.

#### Scenario: Selection persists across games
- **WHEN** a player selects "Low Gravity", then reloads the game later
- **THEN** the game starts with "Low Gravity" applied and shown as selected

#### Scenario: New player gets the Default
- **WHEN** a player who has never selected a config opens the game
- **THEN** the Default config is applied and shown as selected

#### Scenario: Remembered config was deleted
- **WHEN** a player's remembered config has been deleted, by them or by another player, and they open the game
- **THEN** the Default config is applied and shown as selected

#### Scenario: Deleting the selected config falls back to Default
- **WHEN** a player deletes the config they have selected
- **THEN** the Default config is applied and becomes the selected config

#### Scenario: Selecting before the first press regenerates the layout
- **WHEN** a player selects a config with a different planet count while the run is waiting for the first press
- **THEN** the layout is regenerated with the selected config's planet count

#### Scenario: Switching with unsaved changes asks first
- **WHEN** a player with unsaved changes chooses another config from the dropdown
- **THEN** they are asked to confirm discarding the changes, and cancelling keeps the current config and values

#### Scenario: Game start waits for configs
- **WHEN** the game is opened and the configs have not finished loading
- **THEN** a loading state is shown, no layout is shown and no run can be launched, and once loading finishes the first layout is generated with the selected config's parameters, including its planet count

#### Scenario: Configs unavailable
- **WHEN** the configs cannot be loaded from the server, because the request fails or takes more than 8 seconds
- **THEN** the game starts with the shipped default parameters and is playable

### Requirement: Tuning controls beside the play area on wide screens
When the tuning controls open, the game (its view, HUD and in-game overlays, meaning the leaderboard and end of run) SHALL move left to use the free screen space beside it, without changing size. It SHALL move by the smaller of two amounts: the width of the controls, and the free horizontal space around the game. So when there is room for the game beside the controls, it SHALL be centered in the space left of them and not covered at all. When there is some room but not enough, it SHALL sit against the left edge so the controls cover as little of it as possible. When there is no free space, as on a phone, it SHALL NOT move, and the controls open over it. When the controls close, the game SHALL return to being centered on the whole screen. Resizing the window while the controls are open SHALL update the position. Moving the game SHALL NOT restart, pause or otherwise change the run.

#### Scenario: Wide window shows the controls beside the game
- **WHEN** the tuning controls are opened in a window with at least the controls' width of free space beside the game
- **THEN** the game, HUD and overlays are centered in the space left of the controls, at the same size as before, and no part of them is under the controls

#### Scenario: Medium window moves the game as far left as it can
- **WHEN** the tuning controls are opened in a window with some free space beside the game, but less than the controls' width
- **THEN** the game keeps its size and sits against the left edge, and the controls cover only the part that still does not fit

#### Scenario: Phone screen overlays as before
- **WHEN** the tuning controls are opened on a screen the game already fills from side to side
- **THEN** the game does not move, and the controls open over its right side

#### Scenario: Closing the controls recenters the game
- **WHEN** the tuning controls are closed
- **THEN** the game is centered on the whole window again

#### Scenario: Resizing with the controls open
- **WHEN** the window is resized while the tuning controls are open
- **THEN** the game's position updates to the same rule for the new size, without the game changing size relative to its fit for that window

#### Scenario: Moving the game does not affect the run
- **WHEN** the game moves because the controls open or close during an active run
- **THEN** the run continues uninterrupted, and a press on the moved game view steers toward the right place on the field
