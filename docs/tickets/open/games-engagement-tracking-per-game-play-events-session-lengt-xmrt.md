---
id: xmrt
title: "Games: engagement tracking — per-game play events (session length, idle, interactions, levels) sent async to the server"
kind: feature
opened: 2026-10-02
repos: [track-web]
changes: []
specs: []
needs: []
see: [d6a6]
tasks: [tw-1b13]
---


## The ask

From the human, 2026-10-02, via advisor (verbatim):

> I have some ideas for work to be done on this project. This is something I want to be designed up for my review before it's implemented. We need we need user tracking. So currently, everybody that uses the game, this is for client games on TrackWeb. Everybody that uses this today is considered a trusted user and a playtester. And even if they're not, what I want is the ability to, for the system to track, you know, engagement metrics, how long they play, basic statistics for each game about what they're doing. So the game should send off some, you know, async messages about what the user is doing that's relevant to the game, you know, how long they stay idle, which some of the interactions that they're performing. So the idea is we want to see if people are enjoying the game, engaged with it, or if they're abandoning it, which like levels they spend time on. Yeah, we can get more into the design later, but that's the idea. It would, the, what we track would be specific per game, but overall that's what we're looking for.

## Design first, then the human's review

**Deliverable:** an OpenSpec change proposal (proposal, design, delta specs, tasks) under `openspec/changes/`. **No implementation** until the human has reviewed and approved it. The design should answer:

- **Event model:** what is shared across all games (session start and end, active versus idle time, abandonment, game over), and how each game declares its own events (levels started, finished or abandoned; key interactions; scores).
- **Client:** a small shared tracker in `client-games`. Events are batched and sent async so they never block play, with `sendBeacon` or a flush on page hide. Idle detection. Behaviour when offline.
- **Server:** an ingest endpoint, plus storage in the SQLite file (a migration in `src/db.ts`). Settle volume and retention, given the t4g.micro host.
- **Viewing:** how the human sees the results (an admin page or CLI, simple aggregates per game and level). Keep it minimal.
- **Privacy:** the users are logged-in, trusted playtesters today. Say what is stored per user, and whether players are told.
- **Per-game instrumentation:** a first pass for the current games (Ball Merge, Orbital Dodger, Space Golf, Woodoku, Hex Block, Favo), excluding Dungeon Tactics.

**Scope note:** implementing this touches the server (`src/`), `openapi.yaml` and possibly `client-admin`. All of those are **outside the bridle trial scope** (`.bridle/rules/scope.md`: client-games only). The design can be written now, but implementing it needs the human to widen the scope or do that part outside bridle.

Sibling: [[games-in-game-feedback-and-new-game-ideas-free-text-submissi-d6a6]] (feedback and ideas). It probably shares the ingest and admin-view plumbing, so design the two together.
