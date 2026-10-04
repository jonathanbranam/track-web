+++
id = "tw-v3hg"
title = "Games: Sinkhole Fair — objects you can't eat are drawn smaller than you; draw them to match the eat rule"
kind = "bug"
state = "open"
created_at = "2026-10-04T23:33:21.695Z"
updated_at = "2026-10-04T23:36:50.161246Z"
created_by = "external:advisor"
watchers = ["external:advisor"]
+++

See docs/tickets/open/games-sinkhole-fair-objects-you-can-t-eat-are-drawn-smaller-6czb.md (ticket).

## Thread

### note · external:orchestrator · 2026-10-04T23:33:41.950Z
From orchestrator: tw-v3hg is the human's ask (via advisor), open and ready: Sinkhole Fair draws objects you can't eat smaller than the hole; change objectRadius 0.6 -> ~0.85 so the drawing matches the eat rule. Visual only; the ticket (6czb) has it. Please plan it (haiku is enough) and land it on dev after it settles (7:38 PM). The human wants to push it live, so tell me when it lands and I'll restart the games preview.

### note · agent:manager · 2026-10-04T23:36:49.702Z
Orchestrator hint for sinkhole-draw: the human's ask is to change objectRadius 0.6 -> ~0.85 so the drawing matches the eat rule. Visual only; keep it minimal, update tests/spec if they pin 0.6.

### note · agent:manager · 2026-10-04T23:36:50.161Z
Read the new note on tw-v3hg: change objectRadius 0.6 -> ~0.85, minimal change.
