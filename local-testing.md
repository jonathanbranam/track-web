# Local Testing on iPhone

Tests the apps on-device over your local network using DuckDNS subdomains routed through a local Caddy instance.

## One-time setup

### 1. DuckDNS subdomains

Set the following DuckDNS subdomains to your Mac's local IP (e.g. `10.0.0.113`):

- `time-branam-us.duckdns.org` → `10.0.0.113`
- `movies-branam-us.duckdns.org` → `10.0.0.113`

Find your Mac's local IP: `ipconfig getifaddr en0`

### 2. Local Caddyfile

Create `Caddyfile.local` in the project root:

```caddyfile
tracker-local.duckdns.org:80 {
    reverse_proxy localhost:5173
}

movies-local.duckdns.org:80 {
    reverse_proxy localhost:5174
}
```

Caddy routes each subdomain to the right Vite dev server. Vite's built-in proxy handles `/api/*` → `localhost:3000`.

> **Note:** HTTP only — sufficient for testing UI and API flows. PWA home-screen installation requires HTTPS and won't work in this setup.

## Running locally

Run everything at once with the tmux script:

```bash
./dev-local.sh
```

This opens a single tmux session with three panes — backend+tracker, movies, and Caddy — all started automatically. Re-running it attaches to the existing session if one is already open.

Or start each piece manually in four terminals:

**Terminal 1 — backend + tracker frontend**
```bash
npm run dev
```
Starts the Hono backend on `:3000` and the tracker Vite dev server on `:5173`.

**Terminal 2 — movies frontend**
```bash
npm run dev -w client-movies
```
Starts the movies Vite dev server on `:5174`.

**Terminal 3 — local Caddy**
```bash
caddy run --config Caddyfile.local
```

**iPhone:** open `http://time-branam-us.duckdns.org` or `http://movies-branam-us.duckdns.org` — both devices must be on the same WiFi network.
