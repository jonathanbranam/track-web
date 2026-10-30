---
id: tw-vhjj
title: "Talks: add client-talks to the trial and start a new talk for Monday's presentation (2026-11-02)"
kind: feature
created: 2026-10-30
created_by: external:aide
repos: [track-web]
changes: []
specs: []
blocked_by: []
related: [tw-fh2y]
---

## The ask

The human, 2026-10-29 ~9:00 PM ET via aide (verbatim): "I want to approve fh2y but also get the talks client up and running; I have a presentation Monday I'd like to work on a new talk client for"

Deadline: the presentation is **Monday 2026-11-02**.

1. Add `client-talks` to the bridle trial scope now, with stage 1 of tw-fh2y (the plan had talks in stage 2). Check: `npm run build:talks` plus its tests (`client-talks` is in the vitest include list).
2. Get the human working on a new talk in `client-talks` (next to the existing `talk-apparatus` and `talk-rpg`): a new talk route and entry in `talks.ts`, ready for the human to fill with content.

Constraints: Phaser stays externalized (CLAUDE.md; `client-talks/vite.config.ts` + `index.html` already follow the pattern). `client-talks` is public, has no auth, and isn't a PWA.

Open for the human: the talk's title, topic and format (slides, scripted stages like apparatus, or interactive like rpg). The aide is asking now.
