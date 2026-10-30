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

## Recommendation

Written by py-advice on 2026-10-29 from training knowledge only (WebSearch/WebFetch were not available to this worker; see the thread). Version-sensitive facts are marked **[unverified]** and listed in the checklist at the end. Revised after the human's answer: the RAFT SDK is private and work-only, and they lean toward a Python backend.

### Pick

**A small Python runner on the presenter's laptop (127.0.0.1), with the talk page in `client-talks` as its front end, built and rehearsed here against a stub of the RAFT API; the real SDK is dropped in on the work machine.** Add recorded output per snippet as a fallback. Do not run code-executing Python on talks.branam.us.

Pyodide with the real SDK is out (private package, cannot ship in a public bundle, and probably not pure Python). Pyodide stays useful for one thing only: a no-install fallback that runs the stub in any browser. Not needed for Monday.

### Why a laptop runner, not a server on talks.branam.us

- The public site has no auth, so any `/run` endpoint is remote code execution. Safe hosting needs containers, timeouts and no outbound network: too much for Monday, and outside this trial's scope (deploy files, server `src/`).
- The prod host is a t4g.micro (1 GB RAM) that already struggles with builds (CLAUDE.md).
- The private SDK and any credentials must not be on a public host.
- A laptop runner needs no deploy, and the real SDK and credentials stay on the machine that is allowed to have them.

### Design

**Runner.** One small Python file (FastAPI or Flask, or just `http.server`; pick whichever the work laptop already has, since installs there may be restricted). Bound to 127.0.0.1 only, never 0.0.0.0. Endpoints:
- `POST /run` with `{ cellId, code }` returns `{ stdout, stderr, result, error, ms }`. Execution is `exec` in a persistent namespace per session, so cells build on each other like a notebook (the `jupyter_client` / kernel route is the heavier alternative; use it only if you want plots or rich display).
- `POST /reset` clears the namespace.
- `GET /health` for the page's status light.
- Require a random token (printed at startup, pasted into the page or passed in the URL fragment) and an `Origin` check, so no other web page in your browser can call `/run`. CORS allows only the talk page's origin.
- Timeout per run (kill and report), output size cap.

**Which code runs.** Prefer **presenter-authored cells shipped with the talk** over a free editor: the page offers a list of prepared snippets (editable in a textarea if you want to tweak live), stepped with the arrow keys, Run on an explicit key. The runner executes whatever it gets, so it must stay bound to localhost with the token; that is the sandbox. No container is needed for a presenter-only demo on your own machine.

**Talk page.** All in `client-talks/` plus the `talks.ts` entry, inside trial scope:
- `new-talk` becomes a plain `content` page, or an `apparatus` stage if you want that framing, containing a `LiveCodeStage`: snippet list, textarea, Run, output panel, health light, and a "recorded" badge when showing fallback output.
- A `useRunner()` hook posts to `http://127.0.0.1:<port>`. Pages served over https (talks.branam.us) calling plain-http localhost is a known trouble spot **[unverified]** (mixed content / Chrome private-network-access; Chrome and Firefox treat `127.0.0.1` as potentially trustworthy, Safari is the one to check). Avoid it: present from the page served from localhost too (`npm run dev -w client-talks` or the built `dist` via any static server on the laptop), which is plain http to plain http. On the work laptop that means cloning or copying the built `dist` over.
- Slot in the apparatus talk: add one `StageKind` (`'liveCode'`) entered through the existing `sceneSwap` action, rendered next to `ColdOpenStage`/`CloseStage`. The beat engine (`actions.ts`, `directorEngine.ts`) and its tests are untouched. Editor focus must stop key events reaching the Director (arrow keys, space and P are its controls). Since the demo is a pause inside Google Slides, the least-work option for Monday is a standalone live-code page in a second tab, with apparatus framing added later.

**Fallbacks.** Each snippet stores its recorded stdout. If the runner is down or times out, show the recorded output with a visible badge. Also keep a screen recording as the last resort.

### The RAFT stub (what the human must provide)

To build and rehearse here without the private SDK, the stub needs the API surface only, not the implementation. The human decides what is shareable (and whether the shape may live in this repo, which is public-ish, so strip names and anything confidential). Minimum:
1. The 5-10 calls the demo uses: module/class/function names, signatures, return shapes (a few example return values, redacted).
2. The demo flow: the snippets you would run, in order, and what you expect to see.
3. Error cases you want to show, if any.
4. Whether the real calls need network or credentials at work (this stays on the work laptop; the stub fakes responses).
5. Where you present from: the work laptop (then the real SDK runs there, and the runner and page must be copied over) or your own (then the stub or a sanitized fake is all you can show).

Swapping stub for real: the snippets `import raft_sdk` (or the real name); on the work machine the real package is on the path, here a stub package of the same name is. No snippet changes. Keep the stub outside the page bundle, for example under the runner's directory.

If the work laptop cannot run an ad hoc local server, or only allows installing from an internal mirror, say so early: the runner then needs to be stdlib-only Python (`http.server` + `json` + `exec`), which is a small change.

### Where "bridle could help" fits

Bridle can do the building, not the running:
- A worker builds the runner, the stub, `LiveCodeStage`, and tests (vitest for the hook and the stage; pytest or a stdlib test for the runner) once the human picks, from the RAFT API sheet above.
- A worker drafts snippets and recorded outputs from the sheet, and the human edits them.
- A worker writes the rehearsal checklist (start order, token, ports, fallback key).
- Caveat: the runner as a script outside `client-talks/` is outside the trial scope (`scope` rule), so the orchestrator needs to approve a location (for example `client-talks/runner/`, if the scope covers it). Needs a decision; do not build before then.

Bridle itself is not a runtime for the demo: it supervises agents, it is not a code-execution service for a public page.

### Options considered

| Option | Verdict |
|---|---|
| Laptop runner + localhost page (this pick) | Works with private SDK, no deploy, safe by locality |
| Backend on talks.branam.us | Rejected: public RCE, t4g.micro, private SDK and credentials on a public host |
| Pyodide with the real SDK | Rejected: private and likely non-pure-Python |
| Pyodide with a stub, PyScript | Not needed; only a no-install demo fallback. PyScript adds a runtime fighting React for no gain |
| Hybrid recorded fallback | Included in the pick |
| Backend on a work server | Possible if work has an approved internal host the audience-facing laptop can reach; ask the human. Not assumed. |

### Plan for Monday, after the human picks

1. Human sends the RAFT API sheet and says which laptop presents.
2. Build the runner and stub (about 1 task), then `LiveCodeStage` and snippets (about 1 task); can run in parallel once the sheet exists.
3. Rehearse on the real laptop and projector; test the page-to-runner path in the actual browser; record fallbacks.
4. On the work laptop: copy runner and `dist`, install the real SDK, run each snippet once, fix names.

### Questions still open

- Which laptop presents (work or personal)? Can the work laptop run a local Python server and a static page?
- Is it OK to put the (redacted) API shape in this repo?
- Where may the runner live, given the trial scope (orchestrator)?

### Verification checklist (unverified; confirm, or approve web tools for a pass)

- [ ] Browser rules for a https page fetching `http://127.0.0.1` (mixed content, private network access) in Chrome, Safari and Firefox. Avoided by serving the page from localhost.
- [ ] Whether the work laptop's browser or security policy blocks localhost fetches or local servers.
- [ ] Whether the RAFT SDK has native deps (this decides only the Pyodide fallback, which is optional).
- [ ] Current Pyodide version, size (I believe about 10 MB) and micropip/CORS behaviour, only if the optional stub-in-browser fallback is wanted.
- [ ] FastAPI/Flask versus stdlib `http.server`: pick by what the work laptop allows.
- [ ] c2 wiki was not searched (no web tools).
