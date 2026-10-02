---
id: d6a6
title: "Games: in-game feedback and new-game ideas — free-text submissions from every game"
kind: feature
opened: 2026-10-02
repos: [track-web]
changes: []
specs: []
needs: []
see: [xmrt]
tasks: [tw-6032]
---


## The ask

From the human, 2026-10-02, via advisor (verbatim):

> And then the other one is that I want to have the ability for users to give direct feedback on the game, on all games. So there should be a way in the UI for the user to, you know, click a button for writing feedback about the game and say what they like or don't like and any suggestions they have for improvements. And it should be largely just free text. The user can type whatever they want and then we can parse it out and figure out what it is later and kind of feed that into our system of building and improving games.

> Users should be able to submit new game ideas as well.

And on both this and engagement tracking (verbatim):

> This is something I want to be designed up for my review before it's implemented.

## Design first, then the human's review

**Deliverable:** an OpenSpec change proposal under `openspec/changes/`. **No implementation** until the human approves it. The design should cover:

- **UI:**
  - A feedback button available in every game. Say where it sits so it doesn't get in the way of play, e.g. in the game chrome or the pause/game-over screen.
  - A free-text form with no required categories.
  - A separate "suggest a new game" entry point, e.g. on the games home page.
- **Context captured automatically:** user, game slug, level or state, app version, device/UA, timestamp. This lets the free text be parsed later.
- **Server:** an endpoint and storage, as a migration.
- **Getting the feedback out for the build loop:** an admin view or CLI command, and/or an export. Say how it would feed the work, e.g. read by an agent and turned into tickets. Keep it simple.
- **Moderation and abuse:** the users are trusted playtesters, so keep this minimal. Use a length cap and rate limit.

**Scope note:** like [[games-engagement-tracking-per-game-play-events-session-lengt-xmrt]], implementing this needs the server (`src/`), `openapi.yaml` and maybe `client-admin`. Those are **outside the bridle trial scope**. Design the two together, since they share plumbing.
