---
id: tw-9bf3
title: "Talks: advise on running Python live for the 'Introduction to EFP's RAFT SDK' demo (Monday 2026-11-02)"
kind: research
created: 2026-10-30
created_by: external:aide
repos: [track-web]
changes: []
specs: []
blocked_by: []
related: [tw-vhjj]
---

## The ask

The human, 2026-10-29 via aide (verbatim):
"title: Introduction to EFP's RAFT SDK
topic? RAFT SDK
format: more like apparatus; I'd like to show running python code in the browser. I have some assets and things already in google slides, this would be just a part of that deck where i would pause and give a live demo. TBD on exact format and structure. Also not exactly sure how to handle Python in the browser; if necessary a solution with a Python backend could be a better; I'm not sure yet; would appreciate advice on that first."

Deadline: the presentation is **Monday 2026-11-02**. Follows tw-vhjj, which added the `new-talk` placeholder in `client-talks`.

The human wants **advice first**, before anything is built: how to run Python live in a `client-talks` talk page, in-browser versus a Python backend. Bring back a recommendation with its trade-offs for the human to decide.

Options to weigh, at least:
- **In-browser (Pyodide / CPython on WASM, maybe via PyScript):** no server and no security exposure, so it works on the public talks site. Works only if the RAFT SDK and its dependencies are pure Python or built for Pyodide, and it can't open raw sockets (only browser fetch, subject to CORS). First load is about 10 MB.
- **Python backend:** runs the real SDK unchanged. But running code on a public, no-auth site is arbitrary code execution, and the production host is a t4g.micro (CLAUDE.md). A local runner on the presenter's laptop (localhost) avoids both, if the demo is given from that laptop.
- **Hybrid:** in the browser where possible, with recorded output as a fallback if something fails live.

Facts needed from the human (ask on this thread): is the RAFT SDK pip-installable, and is it public or private? Is it pure Python or does it have native dependencies? Does the demo need network access or credentials (calls to EFP services)? Will the demo run from the human's own laptop, or must it work at talks.branam.us?

Out of scope until the human decides: building the demo. The apparatus-style structure is TBD with the human. The talk sits inside a Google Slides deck as a live-demo segment.
