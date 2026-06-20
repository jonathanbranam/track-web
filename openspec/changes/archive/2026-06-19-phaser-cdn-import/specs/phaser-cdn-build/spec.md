**App**: client-games

## ADDED Requirements

### Requirement: Phaser loads from CDN at runtime
The games app SHALL load Phaser from an external CDN `<script>` tag rather than including it in the bundled JavaScript. The CDN URL SHALL pin an exact Phaser version matching the version used for TypeScript types in `package.json`.

#### Scenario: Phaser global available before React boots
- **WHEN** the browser loads `index.html`
- **THEN** the Phaser CDN `<script>` tag MUST execute before the React module script so `globalThis.Phaser` is defined when game components initialize

#### Scenario: Phaser not included in bundle output
- **WHEN** `npm run build` completes for `client-games`
- **THEN** the output in `dist/` SHALL NOT contain Phaser source code (no `phaser` chunk in the bundle)
