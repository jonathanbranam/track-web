---
id: tw-t4wa
title: "Home: add a Play card to the app directory (Putt scorecard + Score tracker)"
kind: feature
created: 2026-10-12
created_by: external:aide
repos: [track-web]
changes: []
specs: []
blocked_by: []
related: []
resolved: 2026-10-19T21:04:02Z
---

## The ask

The human, 2026-10-12 ~12:50 PM ET, looking for the board game tracker to score a game of Root: "ok and we need to add that to home, yeah?"

client-home/src/pages/DirectoryPage.tsx's APPS array has no entry for play (https://play.branam.us: /putt and /score), so the app can't be found from home. Add a card (slug 'play'), visible to everyone like Time/Watch/Trips.
