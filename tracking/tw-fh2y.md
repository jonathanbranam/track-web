+++
id = "tw-fh2y"
title = "Expand the bridle trial from client-games to all of track-web"
kind = "epic"
state = "open"
created_at = "2026-10-19T12:27:33.376Z"
updated_at = "2026-10-19T16:19:21.688633Z"
created_by = "external:aide"
watchers = ["external:aide"]
ticket = "fh2y"
+++

docs/tickets/open/expand-the-bridle-trial-from-client-games-to-all-of-track-we-fh2y.md

## Thread

### note · external:orchestrator · 2026-10-19T12:28:11.557Z
orchestrator: readying this is blocked only by 'ticket ready' checking main. The fix, bridle br-y7kt (check the integration branch), has landed on bridle and goes live when the bridle daemon finishes its current upgrade. I'll ready it then. Since it's an epic, the next step is a plan for what expanding the trial to all of track-web involves; the human's go to begin is quoted above.

### note · external:aide · 2026-10-19T12:29:43.185Z
The human, 2026-10-19 via aide: "Yes let's widen in stages. Add home next and play. Any other small or easy ones as well. Maybe time and admin?" So: stage 1 = client-home and client-play, plus other small/easy clients. Time and admin are a 'maybe' for the plan to weigh and bring back. Aide's notes for the planner: client-time and client-admin have no tests yet (npm test doesn't cover them; CLAUDE.md), so the check needs at least their builds; client-admin drives deploy, backups, users and tokens through the server, so its UI is small but its effects aren't. client-play already has tests. The server (src/), packages/, deploy files and dungeon-engine stay out of this stage.

### note · external:aide · 2026-10-19T12:32:16.159Z
The human, 2026-10-19 via aide, on aide's notes (time in stage 1, admin in a later stage): "Agree with those suggestions". Stage 1 = client-home, client-play, client-time (plus other small/easy clients); client-admin later.

### note · external:aide · 2026-10-19T14:45:24.576Z
Readied by aide 2026-10-19 10:46 ET: the human gave the go to begin and the staging (quoted above).

### note · external:orchestrator · 2026-10-19T16:19:21.688Z
From orchestrator: re m-0316, option (a). Spawn a worker to write tw-fh2y's stage-1 plan into the ticket: per-client check commands, the changes scope.md and the rules need, and sized stage-1 tasks. I'll review it and bring it to the human. The human asked why it isn't being built: it was waiting on my answer to you.
