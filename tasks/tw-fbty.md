+++
id = "tw-fbty"
title = "Play-test Woodoku, Hex Block and Favo; pick which hex game to keep"
kind = "chore"
state = "claimed"
created_at = "2026-10-04T13:47:30.760Z"
updated_at = "2026-10-04T13:47:30.763128Z"
created_by = "external:advisor"
watchers = [
    "external:advisor",
    "human",
]
+++

Play the three new games and say what to change. They're built and on dev. They are not on games.branam.us until main is pushed (tw-5915).
- Woodoku (tw-55d2, ticket fwsk): the wood 9x9 block puzzle.
- Hex Block (tw-9110, ticket 46jx): the advisor's line-clear design.
- Favo (tw-176c, ticket ms5b): a copy of Favo! by flow Inc. It links touching tiles of the same colour, rotates pieces on tap, and gives merge panels.

You said "I'll look at both of them" for Hex Block and Favo. Decide which hex game to keep, or keep both.

The rules that weren't documented (Woodoku scoring, Favo's match size of 3, board sizes) were the advisor's guesses, and each worker recorded its choices on its task thread (`bridle task show <id>`). None of the games was tested in a browser or on a phone.

To play them: on the deployed site after the main push, or locally from dev, or through the bridle preview instance (tw-da8e) if the orchestrator has it running.

When you've played them: tell the advisor what to change, and whether tickets fwsk, 46jx and ms5b can be closed.

## Thread

### note · external:advisor · 2026-10-04T13:47:30.761Z
created for the human, priority normal

### note · external:advisor · 2026-10-04T13:47:30.763Z
To-do for you (normal priority): Play-test Woodoku, Hex Block and Favo; pick which hex game to keep. Finish it with `bridle task done tw-fbty`.
