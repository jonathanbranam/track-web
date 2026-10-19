+++
id = "tw-t4wa"
title = "Home: add a Play card to the app directory (Putt scorecard + Score tracker)"
kind = "feature"
state = "integrated"
created_at = "2026-10-12T16:50:42.221Z"
updated_at = "2026-10-19T12:33:34.422596Z"
created_by = "external:aide"
watchers = ["external:aide"]
branch = "bridle/play-card"
commit = "556fb125836bc7c90223960d72c37ce7ac91bba2"
summary = "Added the Play card (play.branam.us, slug 'play', description 'In-person game companion - putt scorecard and a card-game score tracker') to APPS in client-home/src/pages/DirectoryPage.tsx, after Trips and before Games, visible to everyone. Commit e67a140 on bridle/play-card. No doc edit needed: README.md Apps table and llm-context.md already list Play; llm-context's home entry describes the grid generically. This repo has no CHANGELOG.md, so no changelog line. Checks: npx vitest run client-games (377 passed, 30 files) and npm run build:games exit 0; npm run build:home exit 0. Not browser-verified: no dev server per the manager's instruction, and the dev-servers rule. Blocker: bridle ticket claim tw-t4wa returns 'not ready to claim' (ticket state open), so ticket built was refused with 'not claimed by you'. Needs the ticket readied (or the claim rule relaxed) before it can be marked built."
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

### note · external:orchestrator · 2026-10-19T12:28:11.434Z
From orchestrator: tw-t4wa: go. The human approved a one-ticket scope exception (quoted on the thread): client-home/src/pages/DirectoryPage.tsx for the Play card, plus the docs the CLAUDE.md sync list names. Nothing else outside client-games.

### note · agent:play-card · 2026-10-19T12:32:41.786Z
done: Play card added to APPS in DirectoryPage.tsx (after Trips); client-games check 377 passed, build:games and build:home exit 0; commit e67a140. BLOCKED: 'bridle ticket claim tw-t4wa' says 'not ready to claim' (ticket state open), so I could not mark it built. Needs the ticket readied, then I'll claim and mark built.

### note · agent:manager · 2026-10-19T12:32:56.701Z
Land refused: the branch needs a line under '## Unreleased' in CHANGELOG.md (### Added). Merge dev into your branch first (CHANGELOG.md may exist there now), add one line for the Play card, commit, and message me. Ticket claim is a known bridle issue (br-rdag); skip it, I'll report it.

### note · agent:play-card · 2026-10-19T12:33:09.095Z
done: CHANGELOG.md created on the branch with '## Unreleased' / '### Added' and one Play card line; commit 3a9fe92. Code check ran on e67a140 (vitest 377 passed, build:games and build:home exit 0); 3a9fe92 changes only CHANGELOG.md. Local dev had no CHANGELOG.md, so the file is new. Claim skipped as you said.

### note · agent:manager · 2026-10-19T12:33:16.060Z
integrated: 556fb125836bc7c90223960d72c37ce7ac91bba2 (branch bridle/play-card)

### note · agent:manager · 2026-10-19T12:33:34.422Z
cleanup: removed agent play-card, branch bridle/play-card
