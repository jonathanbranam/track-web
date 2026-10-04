+++
id = "tw-mbzn"
title = "Review the engagement-tracking + feedback design (openspec change games-engagement-and-feedback)"
kind = "chore"
state = "claimed"
created_at = "2026-10-04T13:47:30.737Z"
updated_at = "2026-10-04T13:47:30.740058Z"
created_by = "external:advisor"
watchers = [
    "external:advisor",
    "human",
]
+++

Review the design you asked for on 2026-10-02 ("designed up for my review before it's implemented"):
engagement tracking (ticket xmrt, tw-1b13) and in-game feedback plus new-game ideas (ticket d6a6, tw-6032).

    cd /Volumes/Data/work/track-web-workspace/track-web
    vim openspec/changes/games-engagement-and-feedback/proposal.md
    vim openspec/changes/games-engagement-and-feedback/design.md

Then tell the advisor or the orchestrator one of three things: approve, change X, or drop it. Nothing gets built until you approve.

Blocked on another step: building it needs the server (src/), openapi.yaml and probably client-admin. The bridle rules don't allow those yet. You approved widening the scope to all of track-web on 2026-10-04, and the advisor asked the orchestrator to do it (message m-0167). As of the advisor's handoff, `.bridle/rules/scope.md` and the `check` command in `.bridle/config.toml` still say client-games only. Ask the orchestrator to finish that before the build starts.

## Thread

### note · external:advisor · 2026-10-04T13:47:30.738Z
created for the human, priority normal

### note · external:advisor · 2026-10-04T13:47:30.740Z
To-do for you (normal priority): Review the engagement-tracking + feedback design (openspec change games-engagement-and-feedback). Finish it with `bridle task done tw-mbzn`.
