## Purpose

Covers the PWA infrastructure that enables the app to be installed on iOS home screens and served securely: manifest, service worker, icons, and HTTPS.

## Requirements

### Requirement: PWA manifest for iOS installability
The system SHALL include a Web App Manifest that enables iOS Safari "Add to Home Screen" installation. The manifest SHALL define app name, short name, icons, display mode, theme color, and background color.

#### Scenario: App installs to iOS home screen
- **WHEN** the user visits the app in iOS Safari and taps "Add to Home Screen"
- **THEN** the app appears on the home screen with the correct icon and name

#### Scenario: Standalone display mode
- **WHEN** the installed PWA is launched from the iOS home screen
- **THEN** it opens without Safari's browser chrome (standalone mode)

#### Scenario: Apple touch icon provided
- **WHEN** the manifest is served
- **THEN** a 192×192 and 512×512 PNG icon are available, and an apple-touch-icon meta tag is present in the HTML

### Requirement: Service worker registration
The system SHALL register a service worker via vite-plugin-pwa to satisfy PWA installability requirements. For MVP, the service worker provides basic precaching of the app shell only; full offline data access is not required.

#### Scenario: Service worker registers on first load
- **WHEN** the app loads in a supporting browser over HTTPS
- **THEN** a service worker is registered without errors

#### Scenario: App shell cached for fast reload
- **WHEN** the service worker is active
- **THEN** the HTML, CSS, and JS assets are served from cache on subsequent loads (cache-first for static assets)

### Requirement: HTTPS required for PWA features
The system SHALL only be served over HTTPS in production. Service workers and PWA installation require a secure context.

#### Scenario: App served over HTTPS
- **WHEN** the app is accessed via its DuckDNS domain
- **THEN** all traffic is served over HTTPS with a valid TLS certificate

#### Scenario: HTTP redirects to HTTPS
- **WHEN** the app is accessed via HTTP on port 80
- **THEN** Caddy automatically redirects to HTTPS
