**App**: games

## Purpose

Defines requirements for the Prototypes tilt tester page, which provides a browser environment readout, event-type testing buttons, an on-screen event log, motion permission request, live sensor readout, and a reload button — primarily for debugging iOS tilt/motion sensor behavior.

## Requirements

### Requirement: Environment readout
The Prototypes page SHALL display a static readout of the current browser environment at the top of the page, showing: `window.isSecureContext` (boolean), `'DeviceMotionEvent' in window` (boolean), and `typeof DeviceMotionEvent.requestPermission` (string or "undefined").

#### Scenario: Secure context shown
- **WHEN** the Prototypes page loads over HTTPS
- **THEN** `isSecureContext` is displayed as `true`

#### Scenario: Non-secure context shown
- **WHEN** the Prototypes page loads over HTTP (e.g. LAN IP)
- **THEN** `isSecureContext` is displayed as `false`

#### Scenario: requestPermission availability shown
- **WHEN** the page loads on a device where `DeviceMotionEvent.requestPermission` is a function
- **THEN** `typeof DeviceMotionEvent.requestPermission` is displayed as `"function"`

### Requirement: Event-type button grid
The Prototypes page SHALL render a grid of labeled buttons, each wired to a different React event handler type. The grid SHALL include: `onClick`, `onPointerDown`, `onPointerUp`, `onTouchStart`, `onTouchEnd`, `onClick` inside a `pointer-events: none` parent (with `pointer-events: auto` on the button), and `onPointerDown` inside a `pointer-events: none` parent (with `pointer-events: auto` on the button).

#### Scenario: Button tap appends to log
- **WHEN** the user taps any button in the grid
- **THEN** a timestamped line reading `[event-type] fired` is appended to the on-screen event log

#### Scenario: pointer-events-none parent buttons are tappable
- **WHEN** the user taps a button whose parent has `pointer-events: none`
- **THEN** the button still appends its event to the log (confirming or refuting iOS inheritance behavior)

### Requirement: On-screen event log
The Prototypes page SHALL display a scrollable event log that shows all events fired during the session. The log SHALL be visible at all times (not hidden behind other content) and SHALL auto-scroll to the most recent entry after each append.

#### Scenario: Log starts empty
- **WHEN** the Prototypes page first loads
- **THEN** the event log is empty

#### Scenario: Log accumulates entries
- **WHEN** multiple buttons are tapped in sequence
- **THEN** each tap appends a new timestamped line and the log scrolls to show the latest

### Requirement: Request Permission button
The Prototypes page SHALL include a "Request Permission" button that calls `DeviceMotionEvent.requestPermission()` and logs the result (`'granted'`, `'denied'`, or the error message) to the on-screen event log.

#### Scenario: Permission granted
- **WHEN** the user taps "Request Permission" and iOS shows the dialog and the user allows
- **THEN** `permission: granted` is appended to the log

#### Scenario: Permission denied
- **WHEN** the user taps "Request Permission" and the user denies or it was previously denied
- **THEN** `permission: denied` is appended to the log

#### Scenario: requestPermission unavailable
- **WHEN** the user taps "Request Permission" on a non-iOS device where the function does not exist
- **THEN** `permission: not available` is appended to the log

### Requirement: Live sensor readout
After motion permission is granted, the Prototypes page SHALL display a live readout of `DeviceMotionEvent.accelerationIncludingGravity` (x, y, z values) that updates with each sensor event.

#### Scenario: Sensor data appears after grant
- **WHEN** permission is granted and the device is moved
- **THEN** the x, y, z values update in real time on screen

#### Scenario: Sensor readout absent before grant
- **WHEN** the page loads before permission has been requested
- **THEN** no sensor data is shown

### Requirement: Reload button
The Prototypes page SHALL include a "Reload" button that clears the event log and resets the live sensor readout.

#### Scenario: Log cleared on reload
- **WHEN** the user taps "Reload"
- **THEN** the event log is empty and the sensor readout (if visible) is reset
