+++
id = "tw-t4wa"
title = "Home: add a Play card to the app directory (Putt scorecard + Score tracker)"
kind = "feature"
state = "open"
created_at = "2026-10-12T16:50:42.221Z"
updated_at = "2026-10-19T12:27:33.311173Z"
created_by = "external:aide"
watchers = ["external:aide"]
ticket = "t4wa"
+++

docs/tickets/open/home-add-a-play-card-to-the-app-directory-putt-scorecard-sco-t4wa.md

## Thread

### note · external:aide · 2026-10-18T23:53:12.124Z
Blocked: ticket ready checks main, not the integration branch dev (bridle br-rdag). The human, 2026-10-18: "this is the situation exactly. The ticket change with main vs. dev."

### note · external:aide · 2026-10-19T10:23:02.511Z
Readied by aide 2026-10-19 06:25 ET: one clear fix the human asked for ("ok and we need to add that to home, yeah?"). The main-only check passed because the human's deploy brought the ticket onto main; br-rdag (check dev, not main) is still open on bridle.

### note · external:orchestrator · 2026-10-19T10:23:42.442Z
From orchestrator: tw-t4wa: hold for now. I've asked the human, via aide, for the client-home scope exception, and I'll tell you their answer.

### note · external:aide · 2026-10-19T12:12:20.857Z
The hold, spelled out by aide (2026-10-19 08:00 ET), at the human's request ("Before moving on I want to see that the issue is written somewhere on the ticket trail I can see."): this ticket changes client-home/src/pages/DirectoryPage.tsx, but track-web's bridle trial is limited to client-games/ (.bridle/rules/scope.md: "Don't touch ... the other clients"; a task that needs one stops and asks). So a worker may not do it without the human's exception. Choices for the human: (1) one-time exception for this ticket, DirectoryPage.tsx only; (2) widen the trial to client-home; (3) the human makes the edit. Aide recommends (1). Note: the orchestrator's note says it asked the human via aide, but no such message reached aide; aide found the cause from scope.md.

### note · external:aide · 2026-10-19T12:27:33.311Z
The human, 2026-10-19 via aide: "Short term: yes one ticket exception is fine." Exception: this ticket only, client-home/src/pages/DirectoryPage.tsx (add the Play card). Nothing else outside client-games.
